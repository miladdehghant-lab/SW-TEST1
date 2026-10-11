import * as XLSX from 'xlsx';
import { SaleRecord, User, Store } from '../types';
import { digits, norm } from './formatters';

const ALIASES: Record<string, string[]> = {
  date: ['تاریخ فاکتور', 'تاریخ سند', 'تاریخ صدور', 'تاریخ', 'invoice date', 'date'],
  invoice: ['شماره فاکتور', 'شماره سند', 'برگه فروش', 'کد فاکتور', 'شماره عطف', 'invoice number', 'invoice'],
  customerCode: ['کد مشتری', 'کد مشتریان', 'کد حساب', 'کد تفصیل', 'customer code', 'customer id'],
  customerName: ['نام مشتری', 'نام خریدار', 'نام فروشگاه', 'عنوان مشتری', 'عنوان خریدار', 'customer name', 'store name'],
  brand: ['برند', 'نام برند', 'گروه کالا', 'مارک', 'brand'],
  seller: ['نام ویزیتور', 'ویزیتور', 'نام بازاریاب', 'بازاریاب', 'نام فروشنده', 'فروشنده', 'salesperson', 'seller'],
  sku: ['کد کالا', 'کد محصول', 'کد قلم', 'sku code', 'product code', 'کد کالا/خدمت'],
  product: ['شرح کالا', 'نام کالا', 'عنوان کالا', 'شرح قلم', 'نام محصول', 'product name', 'description'],
  qty: ['مقدار فروش', 'تعداد کل', 'تعداد فروش', 'مقدار جزء', 'تعداد کارتن', 'تعداد', 'quantity', 'qty', 'مقدار'],
  value: ['مبلغ خالص', 'مبلغ ناخالص', 'مبلغ فاکتور', 'مبلغ ریالی', 'مبلغ فروش', 'sales value', 'amount', 'جمع کل'],
};

export function parseQuantity(raw: any): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  let str = String(raw ?? '').trim();
  if (!str) return 0;

  // Handle accounting parentheses negative: (15) -> -15
  let isNegative = false;
  if (/^\(.*\)$/.test(str)) {
    isNegative = true;
    str = str.replace(/[()]/g, '');
  }

  // Normalize Persian / Arabic digits
  str = digits(str);

  if (str.startsWith('-') || str.startsWith('−') || str.startsWith('–')) {
    isNegative = true;
    str = str.replace(/^[-−–]/, '');
  } else if (str.endsWith('-') || str.endsWith('−') || str.endsWith('–')) {
    isNegative = true;
    str = str.replace(/[-−–]$/, '');
  }

  // Remove commas, thousand separators, spaces
  str = str.replace(/[٬,\s]/g, '');
  const numVal = Number(str);
  if (!Number.isFinite(numVal)) return 0;
  return isNegative ? -Math.abs(numVal) : numVal;
}

export function guessBrandFromText(text: string): string {
  const t = norm(text);
  if (!t) return 'مولفیکس';
  if (t.includes('مولفیکس') || t.includes('molfix') || t.includes('ماکسی') || t.includes('میدی') || t.includes('جونیور') || t.includes('پوشک کامل')) {
    return 'مولفیکس';
  }
  if (t.includes('ببم') || t.includes('bebem') || t.includes('ب‌بم')) {
    return 'ببم';
  }
  if (t.includes('مولپد') || t.includes('molped') || t.includes('نوار بهداشتی') || t.includes('بالدار') || t.includes('پد روزانه')) {
    return 'مولپد';
  }
  if (t.includes('تنو') || t.includes('teno') || t.includes('tenno') || t.includes('جعبه تنو')) {
    return 'تنو';
  }
  if (t.includes('پاپیا') || t.includes('papia') || t.includes('دستمال توالت') || t.includes('حوله ای') || t.includes('رول پاپیا')) {
    return 'پاپیا';
  }
  if (t.includes('تست') || t.includes('test') || t.includes('مایع لباسشویی') || t.includes('ظرفشویی') || t.includes('پودر لباسشویی') || t.includes('شوینده')) {
    return 'تست';
  }
  if (t.includes('دستمال')) {
    return 'تنو';
  }
  if (t.includes('پوشک')) {
    return 'مولفیکس';
  }
  return 'مولفیکس';
}

export function findMatchingUser(
  sellerRaw: string,
  users: User[],
  aliases: Record<string, string> = {}
): User | null {
  const approvedSellers = users.filter(
    u => u.status === 'approved' && (u.role === 'seller' || u.role === 'rep' || u.role === 'supervisor')
  );
  const rawClean = norm(sellerRaw);
  if (!rawClean) return null;

  // Check alias map first
  if (aliases[sellerRaw]) {
    const aliasUser = users.find(u => u.id === aliases[sellerRaw]);
    if (aliasUser) return aliasUser;
  }
  if (aliases[rawClean]) {
    const aliasUser = users.find(u => u.id === aliases[rawClean]);
    if (aliasUser) return aliasUser;
  }

  // Exact full name match
  for (const u of approvedSellers) {
    const fullName = norm(`${u.firstName} ${u.lastName}`);
    if (fullName === rawClean) return u;
  }

  // Phone match
  const digitsRaw = digits(sellerRaw);
  if (digitsRaw && digitsRaw.length >= 10) {
    for (const u of approvedSellers) {
      if (digits(u.phone) === digitsRaw) return u;
    }
  }

  // Fuzzy match on first & last name parts
  const parts = rawClean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const [first, ...rest] = parts;
    const last = rest.join(' ');
    for (const u of approvedSellers) {
      const uFirst = norm(u.firstName);
      const uLast = norm(u.lastName);
      if (uLast === last && (uFirst === first || uFirst.includes(first) || first.includes(uFirst))) {
        return u;
      }
    }
  }

  return null;
}

function findCol(headers: string[], aliases: string[]): number {
  const hs = headers.map(norm);
  for (const a of aliases) {
    const idx = hs.indexOf(norm(a));
    if (idx >= 0) return idx;
  }
  for (const a of aliases) {
    const target = norm(a);
    const idx = hs.findIndex(h => h && (h.includes(target) || target.includes(h)));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quote = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && text[i + 1] === '"' && quote) {
      cell += '"';
      i++;
    } else if (c === '"') {
      quote = !quote;
    } else if (c === ',' && !quote) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quote) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      lines.push(row);
      row = [];
      cell = '';
    } else {
      cell += c;
    }
  }
  row.push(cell);
  if (row.some(x => x.trim())) lines.push(row);
  return lines;
}

export interface ColumnMappingConfig {
  date: number;
  invoice: number;
  customerCode: number;
  customerName: number;
  seller: number;
  brand: number;
  defaultBrand?: string;
  sku: number;
  product: number;
  qty: number;
  value: number;
}

export async function extractSpreadsheetMatrix(file: File): Promise<{
  matrix: any[][];
  headers: string[];
  sampleRows: any[][];
  detectedMap: ColumnMappingConfig;
}> {
  let matrix: any[][];

  if (file.name.toLowerCase().endsWith('.csv')) {
    const text = await file.text();
    matrix = parseCSV(text);
  } else {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: false });
  }

  if (!matrix || matrix.length < 2) {
    throw new Error('فایل باید حداقل دارای یک سطر عنوان و یک سطر داده باشد.');
  }

  const rawHeaders = matrix[0].map(h => String(h ?? '').trim());
  const sampleRows = matrix.slice(1, 4).filter(r => r && r.some((c: any) => String(c ?? '').trim()));

  const detectedMap: ColumnMappingConfig = {
    date: findCol(rawHeaders, ALIASES.date),
    invoice: findCol(rawHeaders, ALIASES.invoice),
    customerCode: findCol(rawHeaders, ALIASES.customerCode),
    customerName: findCol(rawHeaders, ALIASES.customerName),
    seller: findCol(rawHeaders, ALIASES.seller),
    brand: findCol(rawHeaders, ALIASES.brand),
    defaultBrand: 'مولفیکس',
    sku: findCol(rawHeaders, ALIASES.sku),
    product: findCol(rawHeaders, ALIASES.product),
    qty: findCol(rawHeaders, ALIASES.qty),
    value: findCol(rawHeaders, ALIASES.value),
  };

  return { matrix, headers: rawHeaders, sampleRows, detectedMap };
}

export function processMatrixWithMapping(
  matrix: any[][],
  colMap: ColumnMappingConfig,
  month: string,
  agency: string,
  coveredThrough: string,
  users: User[],
  stores: Store[] = [],
  sellerAliases: Record<string, string> = {}
): { rows: SaleRecord[]; unmapped: string[] } {
  const rawHeaders = matrix[0].map(String);
  const mappedIndices = new Set([
    colMap.date,
    colMap.invoice,
    colMap.customerCode,
    colMap.customerName,
    colMap.seller,
    colMap.brand,
    colMap.sku,
    colMap.product,
    colMap.qty,
    colMap.value,
  ].filter(idx => idx >= 0));

  const unmapped = rawHeaders
    .filter((_, idx) => !mappedIndices.has(idx))
    .map(h => String(h).trim())
    .filter(Boolean);

  const rows: SaleRecord[] = matrix
    .slice(1)
    .filter(r => r && r.some((cell: any) => String(cell ?? '').trim()))
    .map((r, i) => {
      const sellerRaw = colMap.seller >= 0 ? String(r[colMap.seller] ?? '').trim() : '';
      const user = findMatchingUser(sellerRaw, users, sellerAliases);

      // Robust negative carton / quantity extraction
      const quantity = colMap.qty >= 0 ? parseQuantity(r[colMap.qty]) : 0;
      const isReturn = Number.isFinite(quantity) && quantity < 0;

      const invoice = colMap.invoice >= 0 ? String(r[colMap.invoice] ?? '').trim() : '';
      const customerCode = colMap.customerCode >= 0 ? String(r[colMap.customerCode] ?? '').trim() : '';
      const customerName = colMap.customerName >= 0 ? String(r[colMap.customerName] ?? '').trim() : '';

      const sku = colMap.sku >= 0 ? String(r[colMap.sku] ?? '').trim() : '';
      const product = colMap.product >= 0 ? String(r[colMap.product] ?? '').trim() : '';
      const value = colMap.value >= 0 ? String(r[colMap.value] ?? '').trim() : '';
      const invoiceDate = colMap.date >= 0 ? String(r[colMap.date] ?? '').trim() : '';

      let brand = colMap.brand >= 0 ? String(r[colMap.brand] ?? '').trim() : '';
      if (!brand && colMap.defaultBrand) {
        brand = colMap.defaultBrand;
      }
      if (!brand || brand === 'عمومی') {
        brand = guessBrandFromText(`${product} ${sku}`);
      }

      // Check store existence (not an error! will be auto-collected as incomplete profile)
      const existingStore = stores.find(
        s => (customerCode && norm(s.code) === norm(customerCode)) ||
             (customerName && norm(s.name) === norm(customerName))
      );

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!user) {
        errors.push(`فروشنده «${sellerRaw || 'خالی'}» با لیست کاربران تاییدشده تطبیق نیافت (پیشنهاد: افزودن ویزیتور یا اتصال به کاربر موجود)`);
      }

      // Negative quantity is valid (Sales Return - برگشت از فروش)!
      // Only zero or non-numeric is an error.
      if (!Number.isFinite(quantity) || quantity === 0) {
        errors.push('تعداد یا کارتن فروش خالی یا صفر است');
      }

      if (!invoice) {
        errors.push('شماره فاکتور / برگه فروش خالی است');
      }

      if (isReturn) {
        warnings.push(`برگشت از فروش (${Math.abs(quantity)} کارتن برگشتی)`);
      }

      if (customerCode && !existingStore) {
        warnings.push(`فروشگاه جدید (به عنوان فروشگاه فعال این ویزیتور در سامانه ثبت می‌شود)`);
      }

      return {
        id: `sale_${Date.now()}_${i}`,
        sourceRow: i + 2,
        month,
        agency,
        coveredThrough,
        sellerName: sellerRaw,
        ownerId: user?.id || null,
        invoice,
        invoiceDate,
        customerCode,
        customerName,
        brand,
        sku,
        product,
        quantity,
        value,
        isReturn,
        valid: errors.length === 0,
        errors,
        warnings,
        status: errors.length === 0 ? 'pending' : 'rejected',
      };
    });

  if (!rows.length) {
    throw new Error('هیچ ردیف داده معتبری در فایل یافت نشد.');
  }

  return { rows, unmapped };
}

export function revalidateBatchRows(
  rows: SaleRecord[],
  users: User[],
  stores: Store[] = [],
  sellerAliases: Record<string, string> = {}
): SaleRecord[] {
  return rows.map(r => {
    const user = findMatchingUser(r.sellerName, users, sellerAliases);
    const existingStore = stores.find(
      s => (r.customerCode && norm(s.code) === norm(r.customerCode)) ||
           (r.customerName && norm(s.name) === norm(r.customerName))
    );

    const isReturn = Number.isFinite(r.quantity) && r.quantity < 0;

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!user) {
      errors.push(`فروشنده «${r.sellerName || 'خالی'}» با لیست کاربران تاییدشده تطبیق نیافت (پیشنهاد: افزودن ویزیتور یا اتصال به کاربر موجود)`);
    }

    if (!Number.isFinite(r.quantity) || r.quantity === 0) {
      errors.push('تعداد یا کارتن فروش خالی یا صفر است');
    }

    if (!r.invoice) {
      errors.push('شماره فاکتور / برگه فروش خالی است');
    }

    if (isReturn) {
      warnings.push(`برگشت از فروش (${Math.abs(r.quantity)} کارتن برگشتی)`);
    }

    if (r.customerCode && !existingStore) {
      warnings.push(`فروشگاه جدید (به عنوان فروشگاه فعال این ویزیتور در سامانه ثبت می‌شود)`);
    }

    let brand = r.brand;
    if (!brand || brand === 'عمومی') {
      brand = guessBrandFromText(`${r.product || ''} ${r.sku || ''}`);
    }

    const valid = errors.length === 0;

    return {
      ...r,
      ownerId: user?.id || null,
      brand,
      isReturn,
      valid,
      errors,
      warnings,
      status: valid ? (r.status === 'rejected' ? 'pending' : r.status) : 'rejected',
    };
  });
}

/**
 * Extracts all unique customer codes from batch rows that don't exist in existingStores,
 * creating new Store entities with status='incomplete' (نیازمند تکمیل اطلاعات).
 */
export function extractNewStoresFromBatch(
  rows: SaleRecord[],
  existingStores: Store[],
  agency: string,
  defaultOwnerId: string = 'usr_admin'
): Store[] {
  const storeMap = new Map<string, Store>();

  for (const r of rows) {
    if (!r.customerCode) continue;
    const code = r.customerCode.trim();
    const alreadyExists = existingStores.some(
      s => norm(s.code) === norm(code) || (r.customerName && norm(s.name) === norm(r.customerName))
    );

    if (!alreadyExists && !storeMap.has(code)) {
      storeMap.set(code, {
        id: `str_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: r.customerName?.trim() || `فروشگاه ${code}`,
        code: code,
        city: 'یزد',
        agency: agency,
        potential: 'medium',
        ownerId: r.ownerId || defaultOwnerId,
        status: 'activated',
        needsCompletion: false,
        source: 'excel_ingestion',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return Array.from(storeMap.values());
}

export interface DiscrepancyReport {
  unmatchedSellers: {
    name: string;
    count: number;
    sampleRow: SaleRecord;
    suggestedFirstName: string;
    suggestedLastName: string;
  }[];
  unmatchedStores: {
    code: string;
    name: string;
    count: number;
    sellerName: string;
    sellerId: string | null;
  }[];
  unmatchedBrands: {
    product: string;
    sku: string;
    count: number;
    currentBrand: string;
    suggestedBrand: string;
  }[];
}

export function extractBatchDiscrepancies(
  rows: SaleRecord[],
  users: User[],
  stores: Store[],
  sellerAliases: Record<string, string> = {}
): DiscrepancyReport {
  // 1. Unmatched sellers
  const sellerMap = new Map<string, { count: number; sampleRow: SaleRecord }>();
  for (const r of rows) {
    const user = findMatchingUser(r.sellerName, users, sellerAliases);
    if (!user && r.sellerName) {
      const cur = sellerMap.get(r.sellerName) || { count: 0, sampleRow: r };
      cur.count += 1;
      sellerMap.set(r.sellerName, cur);
    }
  }

  const unmatchedSellers = Array.from(sellerMap.entries()).map(([name, data]) => {
    const parts = name.trim().split(/\s+/);
    const suggestedFirstName = parts[0] || 'ویزیتور';
    const suggestedLastName = parts.slice(1).join(' ') || 'جدید';
    return {
      name,
      count: data.count,
      sampleRow: data.sampleRow,
      suggestedFirstName,
      suggestedLastName,
    };
  });

  // 2. Unmatched stores (stores not yet in database)
  const storeMap = new Map<string, { name: string; count: number; sellerName: string; sellerId: string | null }>();
  for (const r of rows) {
    if (r.customerCode) {
      const match = stores.find(
        s => norm(s.code) === norm(r.customerCode) || (r.customerName && norm(s.name) === norm(r.customerName))
      );
      if (!match) {
        const cur = storeMap.get(r.customerCode) || {
          name: r.customerName || `فروشگاه ${r.customerCode}`,
          count: 0,
          sellerName: r.sellerName,
          sellerId: r.ownerId,
        };
        cur.count += 1;
        storeMap.set(r.customerCode, cur);
      }
    }
  }

  const unmatchedStores = Array.from(storeMap.entries()).map(([code, data]) => ({
    code,
    name: data.name,
    count: data.count,
    sellerName: data.sellerName,
    sellerId: data.sellerId,
  }));

  // 3. Unmatched brands / products
  const brandMap = new Map<string, { sku: string; count: number; currentBrand: string; suggestedBrand: string }>();
  for (const r of rows) {
    const isGeneric = !r.brand || r.brand === 'عمومی' || r.brand === 'سایر';
    if (isGeneric && (r.product || r.sku)) {
      const key = `${r.sku}_${r.product}`;
      const cur = brandMap.get(key) || {
        sku: r.sku,
        count: 0,
        currentBrand: r.brand || 'عمومی',
        suggestedBrand: guessBrandFromText(`${r.product} ${r.sku}`),
      };
      cur.count += 1;
      brandMap.set(key, cur);
    }
  }

  const unmatchedBrands = Array.from(brandMap.entries()).map(([_, data]) => ({
    product: data.sku,
    sku: data.sku,
    count: data.count,
    currentBrand: data.currentBrand,
    suggestedBrand: data.suggestedBrand,
  }));

  return { unmatchedSellers, unmatchedStores, unmatchedBrands };
}

export const SAMPLE_KARAMAD_MATRIX: any[][] = [
  ['تاریخ صدور', 'برگه فروش', 'کد تفصیل', 'عنوان مشتری', 'نام بازاریاب', 'کد قلم', 'شرح کالا', 'مارک', 'تعداد کارتن', 'مبلغ خالص'],
  ['1405/07/04', '749021', '4401044', 'هایپرمارکت آریا', 'علی صادقی', '1002', 'پوشک مولفیکس سایز ۴ ماکسی', 'مولفیکس', '150', '180000000'],
  ['1405/07/05', '749022', '4401082', 'سوپرمارکت کویر', 'علی صادقی', '7001', 'دستمال کاغذی جعبه‌ای تنو ۲۰۰ برگ', 'تنو', '120', '48000000'],
  ['1405/07/06', '749023', '4402015', 'فروشگاه ماهان', 'محمد حسینی', '7005', 'دستمال توالت ۴ قلو پاپیا', 'پاپیا', '85', '68000000'],
  ['1405/07/07', '749024', '4403001', 'سوپر پرسپولیس میبد', 'فاطمه زارع', '5002', 'نوار بهداشتی بالدار مولپد', 'مولپد', '70', '42000000'],
  ['1405/07/08', '749025', '4403042', 'فروشگاه برکت اردکان', 'مهدی فلاح', '9001', 'مایع لباسشویی جنرال تست ۳ لیتری', 'تست', '65', '52000000'],
  ['1405/07/09', '749026', '4405011', 'سوپرمارکت باران یزد', 'علیرضا فلاح', '1005', 'پوشک کامل کودک ببم سایز ۳', 'ببم', '45', '40500000'],
  ['1405/07/10', '749027', '4405022', 'فروشگاه یاس تفت', 'علیرضا فلاح', '7010', 'دستمال حوله‌ای دو قلو پاپیا', 'پاپیا', '50', '35000000'],
  ['1405/07/11', '749028', '4406088', 'هایپر ستاره صفائیه', 'حسین زارع', '9008', 'مایع ظرفشویی تست ۱ لیتری', 'تست', '90', '45000000'],
  // Sample Sales Return (برگشت از فروش) with negative quantity!
  ['1405/07/12', '749029', '4401044', 'هایپرمارکت آریا', 'علی صادقی', '1002', 'برگشت پوشک مولفیکس سایز ۴', 'مولفیکس', '-10', '-12000000'],
  // Sample New Store needing data completion!
  ['1405/07/13', '749030', '4409055', 'سوپرمارکت ترنج صفائیه', 'علی صادقی', '7001', 'دستمال جعبه‌ای تنو ۲۰۰ برگ', 'تنو', '40', '16000000'],
];

export function downloadTemplateCSV(): void {
  const content = '\uFEFFتاریخ فاکتور,شماره فاکتور,کد مشتری,نام مشتری,نام فروشگاه,برند,نام فروشنده,کد کالا,نام کالا,مقدار فروش,مبلغ ریالی\n1405/07/04,INV-90214,CUST-1044,هایپرمارکت آریا,هایپرمارکت آریا,مولفیکس,علی صادقی,MOL-MAXI-4,پوشک کامل کودک مولفیکس سایز ۴ (۳۴ عددی),150,180000000\n1405/07/05,INV-90215,CUST-1082,سوپرمارکت کویر,سوپرمارکت کویر,تنو,علی صادقی,TNO-BOX-200,دستمال کاغذی ۲۰۰ برگ اقتصادی تنو,120,48000000\n1405/07/06,INV-90216,CUST-1044,هایپرمارکت آریا,هایپرمارکت آریا,مولفیکس,علی صادقی,MOL-MAXI-4,برگشت از فروش پوشک مولفیکس,-10,-12000000\n';
  downloadFile('STORE_WAR_Hayat_Sales_Template.csv', content, 'text/csv;charset=utf-8');
}

export function downloadKaramadTemplateCSV(): void {
  const content = '\uFEFFتاریخ صدور,برگه فروش,کد تفصیل,عنوان مشتری,نام بازاریاب,کد قلم,شرح کالا,مارک,تعداد کارتن,مبلغ خالص\n1405/07/04,749021,4401044,هایپرمارکت آریا,علی صادقی,1002,پوشک مولفیکس سایز ۴ ماکسی,مولفیکس,150,180000000\n1405/07/05,749022,4401082,سوپرمارکت کویر,علی صادقی,7001,دستمال کاغذی جعبه‌ای تنو ۲۰۰ برگ,تنو,120,48000000\n1405/07/06,749023,4402015,فروشگاه ماهان,محمد حسینی,7005,دستمال توالت ۴ قلو پاپیا,پاپیا,85,68000000\n1405/07/07,749024,4403001,سوپر پرسپولیس میبد,فاطمه زارع,5002,نوار بهداشتی بالدار مولپد,مولپد,70,42000000\n1405/07/08,749025,4403042,فروشگاه برکت اردکان,مهدی فلاح,9001,مایع لباسشویی جنرال تست ۳ لیتری,تست,65,52000000\n1405/07/09,749026,4405011,سوپرمارکت باران یزد,علیرضا فلاح,1005,پوشک کامل کودک ببم سایز ۳,ببم,45,40500000\n1405/07/10,749027,4405022,فروشگاه یاس تفت,علیرضا فلاح,7010,دستمال حوله‌ای دو قلو پاپیا,پاپیا,50,35000000\n1405/07/11,749028,4406088,هایپر ستاره صفائیه,حسین زارع,9008,مایع ظرفشویی تست ۱ لیتری,تست,90,45000000\n1405/07/12,749029,4401044,هایپرمارکت آریا,علی صادقی,1002,برگشت پوشک مولفیکس سایز ۴,مولفیکس,-10,-12000000\n';
  downloadFile('Karamad_System_Hayat_Sales_Export.csv', content, 'text/csv;charset=utf-8');
}

export function exportToCSV(filename: string, rows: Record<string, any>[]): void {
  if (!rows || !rows.length) return;
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const csvLines = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          const val = row[h] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    )
  ];
  const fullContent = '\uFEFF' + csvLines.join('\r\n');
  downloadFile(filename, fullContent, 'text/csv;charset=utf-8');
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
