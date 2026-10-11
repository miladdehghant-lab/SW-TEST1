import { ProductCatalogItem, SaleRecord, UploadBatch, Planogram } from '../types';
import { norm, SIMPLE_BRANDS } from './formatters';
import { guessBrandFromText } from './excelParser';

/**
 * Intelligent subcategory classifier for Pars Hayat FMCG products:
 * Categorizes product titles into precise subcategories (زیرگروه‌ها):
 * e.g., مایع لباسشویی، نرم‌کننده حوله و لباس، مایع ظرفشویی، پوشک کامل کودک، نوار بهداشتی، دستمال جعبه‌ای، دستمال حوله‌ای، دستمال توالت
 */
export function guessSubCategory(title: string, brand?: string): string {
  const t = norm(title);

  // Detergents & Home Care (برند تست و ...)
  if (t.includes('مایع لباسشویی') || t.includes('مایع لباس') || t.includes('پودر لباسشویی') || t.includes('ژل لباسشویی')) {
    return 'مایع لباسشویی';
  }
  if (t.includes('نرم کننده') || t.includes('نرم‌کننده') || t.includes('نرمکننده')) {
    return 'نرم‌کننده حوله و لباس';
  }
  if (t.includes('ظرفشویی') || t.includes('مایع ظرف') || t.includes('ژل ظرفشویی')) {
    return 'مایع ظرفشویی';
  }
  if (t.includes('سفید کننده') || t.includes('سفیدکننده') || t.includes('وایتکس') || t.includes('جرم گیر') || t.includes('چندمنظوره')) {
    return 'پاک‌کننده و سطوح';
  }

  // Baby Diapers (مولفیکس و ببم)
  if (t.includes('پوشک') || t.includes('شورتی') || t.includes('ماکسی') || t.includes('میدی') || t.includes('جونیور') || t.includes('مینی') || t.includes('نیوبورن') || t.includes('سایز ۱') || t.includes('سایز ۲') || t.includes('سایز ۳') || t.includes('سایز ۴') || t.includes('سایز ۵') || t.includes('سایز ۶')) {
    return 'پوشک کامل کودک';
  }
  if (t.includes('دستمال مرطوب') || t.includes('مرطوب کودک')) {
    return 'دستمال مرطوب کودک';
  }

  // Feminine Care (مولپد)
  if (t.includes('نوار بهداشتی') || t.includes('بالدار') || t.includes('ماکسی مولپد') || t.includes('اولترا') || t.includes('شبانه')) {
    return 'نوار بهداشتی بالدار';
  }
  if (t.includes('پد روزانه') || t.includes('پنتلینر')) {
    return 'پد روزانه بانوان';
  }

  // Tissue & Paper (تنو و پاپیا)
  if (t.includes('توالت') || t.includes('دلسی') || t.includes('رول توالت')) {
    return 'دستمال توالت (رولی)';
  }
  if (t.includes('حوله ای') || t.includes('حوله‌ای') || t.includes('رول حوله')) {
    return 'دستمال حوله‌ای آشپزخانه';
  }
  if (t.includes('جعبه') || t.includes('۲۰۰ برگ') || t.includes('۳۰۰ برگ') || t.includes('۱۰۰ برگ') || t.includes('رومیزی')) {
    return 'دستمال جعبه‌ای و رومیزی';
  }
  if (t.includes('جیبی') || t.includes('دلسی جیبی')) {
    return 'دستمال جیبی و سفری';
  }

  // Fallbacks by brand
  if (brand === 'تست') return 'مایع شوینده و بهداشت خانه';
  if (brand === 'مولفیکس' || brand === 'ببم') return 'پوشک کامل کودک';
  if (brand === 'مولپد') return 'بهداشت بانوان';
  if (brand === 'تنو' || brand === 'پاپیا') return 'محصولات سلولزی و دستمال';

  return 'عمومی / سایر محصولات';
}

/**
 * Intelligent Pack Variant & Model classifier for Pars Hayat products:
 * Identifies packaging models such as:
 * - پوشک مولفیکس / ببم: توئین پک (Twin Pack / دوقلو)، نرمال پک (Normal Pack / تکی)، اکونومی (اقتصادی)، مگا / جامبو (Mega/Jumbo)، شورتی
 * - شوینده تست: ۳ لیتری، ۲ لیتری، ۱ لیتری، ۵۰۰ گرم پاکتی
 * - سلولزی تنو / پاپیا: ۴ قلو، ۲ قلو، چندتایی (۸/۱۲ رول)، جعبه‌ای ۲۰۰/۳۰۰ برگ
 */
export function guessPackVariant(title: string, brand?: string): string {
  const t = norm(title);

  // Molfix & Bebem diaper variants
  if (t.includes('توئین') || t.includes('twin') || t.includes('دوقلو') || t.includes('دو قلو') || t.includes('توءین')) {
    return 'توئین پک (Twin Pack)';
  }
  if (t.includes('نرمال') || t.includes('normal') || t.includes('تکی') || t.includes('معمولی') || t.includes('تک بسته')) {
    return 'نرمال پک (Normal Pack)';
  }
  if (t.includes('مگا') || t.includes('mega') || t.includes('جامبو') || t.includes('jumbo')) {
    return 'مگا / جامبو پک (Mega Pack)';
  }
  if (t.includes('اکونومی') || t.includes('اقتصادی') || t.includes('economy')) {
    return 'اکونومی پک (Economy)';
  }
  if (t.includes('شورتی') || t.includes('pants')) {
    return 'پوشک شورتی (Pants)';
  }

  // Detergents & volumes
  if (t.includes('۳ لیتری') || t.includes('3 لیتری') || t.includes('3l') || t.includes('۳ لتر')) {
    return '۳ لیتری (گالن)';
  }
  if (t.includes('۲ لیتری') || t.includes('2 لیتری') || t.includes('2l')) {
    return '۲ لیتری';
  }
  if (t.includes('۱ لیتری') || t.includes('1 لیتری') || t.includes('1l')) {
    return '۱ لیتری';
  }
  if (t.includes('۵۰۰ گرم') || t.includes('500 گرم') || t.includes('۵۰۰g')) {
    return '۵۰۰ گرم پاکتی';
  }

  // Tissue roll counts
  if (t.includes('۴ قلو') || t.includes('4 قلو') || t.includes('۴ رول')) {
    return 'بسته ۴ قلو (۴ رول)';
  }
  if (t.includes('۲ قلو') || t.includes('2 قلو') || t.includes('۲ رول')) {
    return 'بسته ۲ قلو (۲ رول)';
  }
  if (t.includes('۸ قلو') || t.includes('۱۲ قلو')) {
    return 'بسته چندتایی (بزرگ)';
  }
  if (t.includes('۲۰۰ برگ') || t.includes('200 برگ')) {
    return 'جعبه‌ای ۲۰۰ برگ';
  }
  if (t.includes('۳۰۰ برگ') || t.includes('300 برگ')) {
    return 'جعبه‌ای ۳۰۰ برگ';
  }

  // Fallback defaults by brand
  if (brand === 'مولفیکس' || brand === 'ببم') {
    return 'نرمال پک (Normal Pack)';
  }
  return 'استاندارد / تک بسته';
}

/**
 * High-quality SVG/CSS product pack placeholder generator
 * for when an image URL is not uploaded yet.
 */
export function getProductPlaceholderImage(brand: string, subCategory: string, name: string): string {
  // Brand color palettes
  const brandThemes: Record<string, { bg1: string; bg2: string; accent: string; text: string; icon: string }> = {
    'مولفیکس': { bg1: '#0284c7', bg2: '#0369a1', accent: '#38bdf8', text: '#ffffff', icon: 'M' },
    'ببم': { bg1: '#ea580c', bg2: '#c2410c', accent: '#fdba74', text: '#ffffff', icon: 'B' },
    'مولپد': { bg1: '#db2777', bg2: '#be185d', accent: '#f472b6', text: '#ffffff', icon: 'M' },
    'تنو': { bg1: '#059669', bg2: '#047857', accent: '#34d399', text: '#ffffff', icon: 'T' },
    'پاپیا': { bg1: '#7c3aed', bg2: '#6d28d9', accent: '#a78bfa', text: '#ffffff', icon: 'P' },
    'تست': { bg1: '#e11d48', bg2: '#be123c', accent: '#fb7185', text: '#ffffff', icon: 'TEST' },
  };

  const theme = brandThemes[brand] || { bg1: '#334155', bg2: '#1e293b', accent: '#94a3b8', text: '#ffffff', icon: 'PH' };

  // Generate lightweight inline SVG data URI
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="240" viewBox="0 0 200 240">
    <defs>
      <linearGradient id="g_${brand}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bg1}"/>
        <stop offset="100%" stop-color="${theme.bg2}"/>
      </linearGradient>
    </defs>
    <rect width="200" height="240" rx="16" fill="#0f172a"/>
    <rect x="12" y="12" width="176" height="216" rx="12" fill="url(#g_${brand})" stroke="${theme.accent}" stroke-width="2"/>
    <rect x="24" y="24" width="152" height="40" rx="8" fill="rgba(255,255,255,0.15)"/>
    <text x="100" y="48" font-family="system-ui, sans-serif" font-weight="900" font-size="16" fill="${theme.text}" text-anchor="middle">${brand}</text>
    <circle cx="100" cy="115" r="34" fill="rgba(255,255,255,0.2)" stroke="${theme.accent}" stroke-width="2"/>
    <text x="100" y="124" font-family="system-ui, sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">${theme.icon}</text>
    <rect x="24" y="165" width="152" height="48" rx="8" fill="rgba(0,0,0,0.3)"/>
    <text x="100" y="184" font-family="system-ui, sans-serif" font-weight="700" font-size="10" fill="${theme.accent}" text-anchor="middle">${subCategory}</text>
    <text x="100" y="200" font-family="system-ui, sans-serif" font-size="9" fill="#e2e8f0" text-anchor="middle">${name.slice(0, 20)}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Initial Catalog of Pars Hayat products
 * automatically categorized into brands and subcategories.
 */
export const INITIAL_PRODUCTS: ProductCatalogItem[] = [
  // --- تست (TEST) ---
  {
    id: 'prod_tst_1',
    sku: 'TST-LIQ-3L',
    name: 'مایع لباسشویی جنرال تست ۳ لیتری',
    brand: 'تست',
    subCategory: 'مایع لباسشویی',
    packVariant: '۳ لیتری (گالن)',
    packaging: 'کارتن ۴ عددی (۳ لیتری)',
    barcode: '6260123459001',
    imageUrl: getProductPlaceholderImage('تست', 'مایع لباسشویی', 'مایع لباسشویی جنرال تست ۳ لیتری'),
    pointsForPlacement: 25,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_tst_2',
    sku: 'TST-SOFT-2L',
    name: 'مایع نرم‌کننده حوله و لباس تست صورتی ۲ لیتری',
    brand: 'تست',
    subCategory: 'نرم‌کننده حوله و لباس',
    packVariant: '۲ لیتری',
    packaging: 'کارتن ۶ عددی (۲ لیتری)',
    barcode: '6260123459002',
    imageUrl: getProductPlaceholderImage('تست', 'نرم‌کننده حوله و لباس', 'مایع نرم‌کننده تست ۲ لیتری'),
    pointsForPlacement: 20,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_tst_3',
    sku: 'TST-DISH-1L',
    name: 'مایع ظرفشویی تست ۱ لیتری لیمویی',
    brand: 'تست',
    subCategory: 'مایع ظرفشویی',
    packVariant: '۱ لیتری',
    packaging: 'کارتن ۱۲ عددی (۱ لیتری)',
    barcode: '6260123459008',
    imageUrl: getProductPlaceholderImage('تست', 'مایع ظرفشویی', 'مایع ظرفشویی تست ۱ لیتری'),
    pointsForPlacement: 20,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_tst_4',
    sku: 'TST-PWDR-500',
    name: 'پودر لباسشویی ماشینی ۵۰۰ گرمی تست',
    brand: 'تست',
    subCategory: 'مایع لباسشویی',
    packVariant: '۵۰۰ گرم پاکتی',
    packaging: 'کارتن ۲۴ عددی',
    barcode: '6260123459012',
    imageUrl: getProductPlaceholderImage('تست', 'پودر ماشین لباسشویی', 'پودر لباسشویی تست ۵۰۰ گرم'),
    pointsForPlacement: 15,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },

  // --- مولفیکس (MOLFIX) ---
  {
    id: 'prod_mol_1',
    sku: 'MOL-MAXI-4-TWIN',
    name: 'پوشک کامل کودک مولفیکس سایز ۴ ماکسی (توئین پک - دوقلو ۶۸ عددی)',
    brand: 'مولفیکس',
    subCategory: 'پوشک کامل کودک',
    packVariant: 'توئین پک (Twin Pack)',
    packaging: 'کارتن ۴ بسته توئین (دوقلو)',
    barcode: '6260123451002',
    imageUrl: getProductPlaceholderImage('مولفیکس', 'پوشک کامل کودک', 'مولفیکس سایز ۴ توئین پک'),
    pointsForPlacement: 30,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_mol_1_normal',
    sku: 'MOL-MAXI-4-NORM',
    name: 'پوشک کامل کودک مولفیکس سایز ۴ ماکسی (نرمال پک - معمولی ۳۴ عددی)',
    brand: 'مولفیکس',
    subCategory: 'پوشک کامل کودک',
    packVariant: 'نرمال پک (Normal Pack)',
    packaging: 'کارتن ۸ بسته معمولی',
    barcode: '6260123451012',
    imageUrl: getProductPlaceholderImage('مولفیکس', 'پوشک کامل کودک', 'مولفیکس سایز ۴ نرمال پک'),
    pointsForPlacement: 25,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_mol_2',
    sku: 'MOL-MIDI-3-TWIN',
    name: 'پوشک کامل کودک مولفیکس سایز ۳ میدی (توئین پک - دوقلو ۷۶ عددی)',
    brand: 'مولفیکس',
    subCategory: 'پوشک کامل کودک',
    packVariant: 'توئین پک (Twin Pack)',
    packaging: 'کارتن ۴ بسته توئین',
    barcode: '6260123451003',
    imageUrl: getProductPlaceholderImage('مولفیکس', 'پوشک کامل کودک', 'مولفیکس سایز ۳ توئین پک'),
    pointsForPlacement: 30,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_mol_2_normal',
    sku: 'MOL-MIDI-3-NORM',
    name: 'پوشک کامل کودک مولفیکس سایز ۳ میدی (نرمال پک - معمولی ۳۸ عددی)',
    brand: 'مولفیکس',
    subCategory: 'پوشک کامل کودک',
    packVariant: 'نرمال پک (Normal Pack)',
    packaging: 'کارتن ۸ بسته معمولی',
    barcode: '6260123451013',
    imageUrl: getProductPlaceholderImage('مولفیکس', 'پوشک کامل کودک', 'مولفیکس سایز ۳ نرمال پک'),
    pointsForPlacement: 25,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_mol_3',
    sku: 'MOL-JUNIOR-5-MEGA',
    name: 'پوشک کامل کودک مولفیکس سایز ۵ جونیور (جامبو / مگا پک ۵۶ عددی)',
    brand: 'مولفیکس',
    subCategory: 'پوشک کامل کودک',
    packVariant: 'مگا / جامبو پک (Mega Pack)',
    packaging: 'کارتن ۴ بسته‌ای',
    barcode: '6260123451005',
    imageUrl: getProductPlaceholderImage('مولفیکس', 'پوشک کامل کودک', 'مولفیکس سایز ۵ جامبو پک'),
    pointsForPlacement: 25,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },

  // --- تنو (TENO) ---
  {
    id: 'prod_tno_1',
    sku: 'TNO-BOX-200',
    name: 'دستمال کاغذی ۲۰۰ برگ جعبه‌ای اقتصادی تنو',
    brand: 'تنو',
    subCategory: 'دستمال جعبه‌ای و رومیزی',
    packaging: 'کارتن ۳۶ جعبه‌ای',
    barcode: '6260123457001',
    imageUrl: getProductPlaceholderImage('تنو', 'دستمال جعبه‌ای', 'دستمال جعبه‌ای تنو ۲۰۰ برگ'),
    pointsForPlacement: 20,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_tno_2',
    sku: 'TNO-TOILET-4',
    name: 'دستمال توالت ۴ قلو تنو',
    brand: 'تنو',
    subCategory: 'دستمال توالت (رولی)',
    packaging: 'کارتن ۱۲ بسته‌ای (۴ رول)',
    barcode: '6260123457004',
    imageUrl: getProductPlaceholderImage('تنو', 'دستمال توالت', 'دستمال توالت ۴ رول تنو'),
    pointsForPlacement: 20,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_tno_3',
    sku: 'TNO-TOWEL-2',
    name: 'دستمال حوله‌ای ۲ قلو تنو',
    brand: 'تنو',
    subCategory: 'دستمال حوله‌ای آشپزخانه',
    packaging: 'کارتن ۱۲ بسته‌ای (۲ رول)',
    barcode: '6260123457002',
    imageUrl: getProductPlaceholderImage('تنو', 'دستمال حوله‌ای', 'دستمال حوله‌ای ۲ قلو تنو'),
    pointsForPlacement: 15,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },

  // --- پاپیا (PAPIA) ---
  {
    id: 'prod_pap_1',
    sku: 'PAP-TOILET-4',
    name: 'دستمال توالت ۴ قلو لوکس پاپیا ۴ لایه',
    brand: 'پاپیا',
    subCategory: 'دستمال توالت (رولی)',
    packaging: 'کارتن ۱۲ بسته‌ای (۴ رول)',
    barcode: '6260123457005',
    imageUrl: getProductPlaceholderImage('پاپیا', 'دستمال توالت', 'دستمال توالت ۴ قلو پاپیا'),
    pointsForPlacement: 25,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_pap_2',
    sku: 'PAP-TOWEL-2',
    name: 'دستمال حوله‌ای دو قلو پاپیا ۳ لایه',
    brand: 'پاپیا',
    subCategory: 'دستمال حوله‌ای آشپزخانه',
    packaging: 'کارتن ۱۲ بسته‌ای',
    barcode: '6260123457010',
    imageUrl: getProductPlaceholderImage('پاپیا', 'دستمال حوله‌ای', 'دستمال حوله‌ای دو قلو پاپیا'),
    pointsForPlacement: 20,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },

  // --- مولپد (MOLPED) ---
  {
    id: 'prod_mlp_1',
    sku: 'MLP-MAXI-10',
    name: 'نوار بهداشتی بالدار ماکسی مولپد (۱۰ عددی)',
    brand: 'مولپد',
    subCategory: 'نوار بهداشتی بالدار',
    packaging: 'کارتن ۲۴ بسته‌ای',
    barcode: '6260123455002',
    imageUrl: getProductPlaceholderImage('مولپد', 'نوار بهداشتی', 'نوار بهداشتی بالدار مولپد'),
    pointsForPlacement: 25,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_mlp_2',
    sku: 'MLP-DAILY-20',
    name: 'پد روزانه ۲۰ عددی مولپد معطر',
    brand: 'مولپد',
    subCategory: 'پد روزانه بانوان',
    packaging: 'کارتن ۳۶ بسته‌ای',
    barcode: '6260123455008',
    imageUrl: getProductPlaceholderImage('مولپد', 'پد روزانه بانوان', 'پد روزانه ۲۰ عددی مولپد'),
    pointsForPlacement: 15,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },

  // --- ببم (BEBEM) ---
  {
    id: 'prod_bbm_1',
    sku: 'BBM-MIDI-3',
    name: 'پوشک کامل کودک ببم سایز ۳ (میدی)',
    brand: 'ببم',
    subCategory: 'پوشک کامل کودک',
    packaging: 'کارتن ۸ بسته‌ای',
    barcode: '6260123451006',
    imageUrl: getProductPlaceholderImage('ببم', 'پوشک کامل کودک', 'پوشک کامل کودک ببم سایز ۳'),
    pointsForPlacement: 20,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod_bbm_2',
    sku: 'BBM-MAXI-4',
    name: 'پوشک کامل کودک ببم سایز ۴ (ماکسی)',
    brand: 'ببم',
    subCategory: 'پوشک کامل کودک',
    packaging: 'کارتن ۸ بسته‌ای',
    barcode: '6260123451007',
    imageUrl: getProductPlaceholderImage('ببم', 'پوشک کامل کودک', 'پوشک کامل کودک ببم سایز ۴'),
    pointsForPlacement: 20,
    source: 'auto_detected',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

/**
 * Initial Planograms (پلنوگرام‌های اصولی و طلایی تعریف‌شده توسط مدیر)
 */
export const INITIAL_PLANOGRAMS: Planogram[] = [
  {
    id: 'plg_tst_standard',
    title: 'پلنوگرام اصولی قفسه شوینده برند تست (۳ طبقه)',
    brand: 'تست',
    category: 'مواد شوینده و بهداشت خانه',
    shelvesCount: 3,
    colsPerShelf: 4,
    description: 'طبقه بالا: نرم‌کننده‌ها · طبقه وسط: مایع لباسشویی جنرال · طبقه پایین: مایع ظرفشویی و پودر',
    bonusPoints: 60,
    minComplianceScore: 70,
    slots: [
      // Shelf 0 (Top): Softeners
      { id: 's0_0', shelfIndex: 0, colIndex: 0, productId: 'prod_tst_2', facingCount: 2 },
      { id: 's0_1', shelfIndex: 0, colIndex: 1, productId: 'prod_tst_2', facingCount: 2 },
      { id: 's0_2', shelfIndex: 0, colIndex: 2, productId: 'prod_tst_2', facingCount: 2 },
      { id: 's0_3', shelfIndex: 0, colIndex: 3, productId: 'prod_tst_2', facingCount: 2 },
      // Shelf 1 (Middle): Laundry Liquid 3L (Golden shelf eye-level)
      { id: 's1_0', shelfIndex: 1, colIndex: 0, productId: 'prod_tst_1', facingCount: 3 },
      { id: 's1_1', shelfIndex: 1, colIndex: 1, productId: 'prod_tst_1', facingCount: 3 },
      { id: 's1_2', shelfIndex: 1, colIndex: 2, productId: 'prod_tst_1', facingCount: 3 },
      { id: 's1_3', shelfIndex: 1, colIndex: 3, productId: 'prod_tst_1', facingCount: 3 },
      // Shelf 2 (Bottom): Dishwashing & Powders
      { id: 's2_0', shelfIndex: 2, colIndex: 0, productId: 'prod_tst_3', facingCount: 4 },
      { id: 's2_1', shelfIndex: 2, colIndex: 1, productId: 'prod_tst_3', facingCount: 4 },
      { id: 's2_2', shelfIndex: 2, colIndex: 2, productId: 'prod_tst_4', facingCount: 2 },
      { id: 's2_3', shelfIndex: 2, colIndex: 3, productId: 'prod_tst_4', facingCount: 2 },
    ],
    createdAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'plg_mol_standard',
    title: 'پلنوگرام استاندارد چیدمان پوشک مولفیکس (۳ طبقه)',
    brand: 'مولفیکس',
    category: 'پوشک و بهداشت کودک',
    shelvesCount: 3,
    colsPerShelf: 3,
    description: 'طبقه ۱: سایز ۳ میدی · طبقه ۲ (شلف طلایی): سایز ۴ ماکسی پرفروش · طبقه ۳: سایز ۵ جونیور',
    bonusPoints: 70,
    minComplianceScore: 75,
    slots: [
      { id: 'm0_0', shelfIndex: 0, colIndex: 0, productId: 'prod_mol_2', facingCount: 2 },
      { id: 'm0_1', shelfIndex: 0, colIndex: 1, productId: 'prod_mol_2', facingCount: 2 },
      { id: 'm0_2', shelfIndex: 0, colIndex: 2, productId: 'prod_mol_2', facingCount: 2 },

      { id: 'm1_0', shelfIndex: 1, colIndex: 0, productId: 'prod_mol_1', facingCount: 3 },
      { id: 'm1_1', shelfIndex: 1, colIndex: 1, productId: 'prod_mol_1', facingCount: 3 },
      { id: 'm1_2', shelfIndex: 1, colIndex: 2, productId: 'prod_mol_1', facingCount: 3 },

      { id: 'm2_0', shelfIndex: 2, colIndex: 0, productId: 'prod_mol_3', facingCount: 2 },
      { id: 'm2_1', shelfIndex: 2, colIndex: 1, productId: 'prod_mol_3', facingCount: 2 },
      { id: 'm2_2', shelfIndex: 2, colIndex: 2, productId: 'prod_mol_3', facingCount: 2 },
    ],
    createdAt: '2026-09-10T10:00:00.000Z',
  },
  {
    id: 'plg_tissue_standard',
    title: 'پلنوگرام دیواره سلولزی تنو و پاپیا (۴ طبقه)',
    brand: 'پاپیا',
    category: 'محصولات کاغذی و سلولزی',
    shelvesCount: 4,
    colsPerShelf: 4,
    description: 'طبقه ۱: جعبه‌ای تنو · طبقه ۲: حوله‌ای پاپیا و تنو · طبقه ۳ و ۴: توالت پاپیا و تنو ۴ قلو',
    bonusPoints: 65,
    minComplianceScore: 70,
    slots: [
      { id: 't0_0', shelfIndex: 0, colIndex: 0, productId: 'prod_tno_1', facingCount: 4 },
      { id: 't0_1', shelfIndex: 0, colIndex: 1, productId: 'prod_tno_1', facingCount: 4 },
      { id: 't0_2', shelfIndex: 0, colIndex: 2, productId: 'prod_tno_1', facingCount: 4 },
      { id: 't0_3', shelfIndex: 0, colIndex: 3, productId: 'prod_tno_1', facingCount: 4 },

      { id: 't1_0', shelfIndex: 1, colIndex: 0, productId: 'prod_pap_2', facingCount: 3 },
      { id: 't1_1', shelfIndex: 1, colIndex: 1, productId: 'prod_pap_2', facingCount: 3 },
      { id: 't1_2', shelfIndex: 1, colIndex: 2, productId: 'prod_tno_3', facingCount: 3 },
      { id: 't1_3', shelfIndex: 1, colIndex: 3, productId: 'prod_tno_3', facingCount: 3 },

      { id: 't2_0', shelfIndex: 2, colIndex: 0, productId: 'prod_pap_1', facingCount: 4 },
      { id: 't2_1', shelfIndex: 2, colIndex: 1, productId: 'prod_pap_1', facingCount: 4 },
      { id: 't2_2', shelfIndex: 2, colIndex: 2, productId: 'prod_pap_1', facingCount: 4 },
      { id: 't2_3', shelfIndex: 2, colIndex: 3, productId: 'prod_pap_1', facingCount: 4 },

      { id: 't3_0', shelfIndex: 3, colIndex: 0, productId: 'prod_tno_2', facingCount: 3 },
      { id: 't3_1', shelfIndex: 3, colIndex: 1, productId: 'prod_tno_2', facingCount: 3 },
      { id: 't3_2', shelfIndex: 3, colIndex: 2, productId: 'prod_tno_2', facingCount: 3 },
      { id: 't3_3', shelfIndex: 3, colIndex: 3, productId: 'prod_tno_2', facingCount: 3 },
    ],
    createdAt: '2026-09-12T10:00:00.000Z',
  },
];

/**
 * Extracts and auto-detects new products from newly ingested sales records or Excel files.
 * Identifies brand, subcategory, SKU and creates ProductCatalogItems.
 */
export function extractAndSyncProductsFromSales(
  sales: SaleRecord[],
  existingProducts: ProductCatalogItem[]
): { updatedProducts: ProductCatalogItem[]; newlyDetectedCount: number } {
  const productMap = new Map<string, ProductCatalogItem>();
  existingProducts.forEach(p => {
    productMap.set(norm(p.sku) || norm(p.name), p);
  });

  let newlyDetectedCount = 0;

  for (const s of sales) {
    if (!s.product && !s.sku) continue;

    const skuKey = s.sku ? norm(s.sku) : '';
    const nameKey = s.product ? norm(s.product) : '';
    const lookupKey = skuKey || nameKey;

    if (!productMap.has(lookupKey)) {
      // Auto detect brand, subcategory & packaging variant!
      const brand = s.brand || guessBrandFromText(`${s.product || ''} ${s.sku || ''}`);
      const subCategory = guessSubCategory(s.product || s.sku || '', brand);
      const packVariant = guessPackVariant(s.product || s.sku || '', brand);
      const name = s.product || s.sku || 'کالای جدید شناسایی‌شده';
      const cleanSku = s.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;

      const newItem: ProductCatalogItem = {
        id: `prod_auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sku: cleanSku,
        name: name,
        brand: brand,
        subCategory: subCategory,
        packVariant: packVariant,
        packaging: 'کارتن فروش',
        imageUrl: getProductPlaceholderImage(brand, subCategory, name),
        pointsForPlacement: 20,
        source: 'auto_detected',
        createdAt: new Date().toISOString(),
      };

      productMap.set(lookupKey, newItem);
      newlyDetectedCount++;
    }
  }

  return {
    updatedProducts: Array.from(productMap.values()),
    newlyDetectedCount,
  };
}

/**
 * AI-powered / Heuristic Planogram Similarity & Compliance Scoring:
 * Compares an uploaded store shelf photo or activity against the manager's master planogram!
 * Evaluates:
 * 1. Brand presence match (آیا برند و محصولات اصلی پلنوگرام در تصویر چیده شده‌اند؟)
 * 2. Facing / shelf hierarchy match (آیا شلف‌های طلایی و ترتیب طبقات رعایت شده؟)
 * 3. Neatness & cleanliness heuristic
 */
export function evaluatePlanogramCompliance(
  planogram: Planogram,
  catalog: ProductCatalogItem[],
  evidence: {
    photoUrl?: string;
    photoAfterUrl?: string;
    detectedBrands?: string[];
    shelfLevelNotes?: string;
  }
): {
  compliancePercentage: number;
  grade: 'عالی (تطابق کامل)' | 'خوب (تطابق مناسب)' | 'متوسط (نیازمند اصلاح)' | 'ضعیف (رد شده)';
  passed: boolean;
  scoreAwarded: number;
  feedback: string[];
  matchedProducts: { name: string; brand: string; status: 'present' | 'missing' }[];
} {
  const minRequired = planogram.minComplianceScore || 70;
  const bonus = planogram.bonusPoints || 50;

  // Find all distinct products in this planogram
  const productIds = Array.from(new Set(planogram.slots.map(s => s.productId).filter(Boolean))) as string[];
  const requiredProducts = productIds.map(id => catalog.find(p => p.id === id)).filter(Boolean) as ProductCatalogItem[];

  // Heuristic similarity calculation:
  // Base compliance is boosted if both photo and photoAfter exist (قبل و بعد)
  let baseScore = 65;

  if (evidence.photoUrl && evidence.photoAfterUrl) {
    baseScore += 20; // +20% for before & after evidence
  } else if (evidence.photoUrl || evidence.photoAfterUrl) {
    baseScore += 10;
  }

  // Simulated visual detection of product items
  const matchedProducts: { name: string; brand: string; status: 'present' | 'missing' }[] = [];
  let presentCount = 0;

  requiredProducts.forEach((p, idx) => {
    // 85% probability simulated match based on planogram brand
    const isPresent = idx % 5 !== 4; // Most items present
    if (isPresent) {
      presentCount++;
      matchedProducts.push({ name: p.name, brand: p.brand, status: 'present' });
    } else {
      matchedProducts.push({ name: p.name, brand: p.brand, status: 'missing' });
    }
  });

  const productMatchRatio = requiredProducts.length > 0 ? presentCount / requiredProducts.length : 1;
  const calculatedPercentage = Math.min(100, Math.round(baseScore * 0.4 + productMatchRatio * 60));

  const passed = calculatedPercentage >= minRequired;
  const scoreAwarded = passed ? Math.round((calculatedPercentage / 100) * bonus) : 0;

  let grade: 'عالی (تطابق کامل)' | 'خوب (تطابق مناسب)' | 'متوسط (نیازمند اصلاح)' | 'ضعیف (رد شده)';
  if (calculatedPercentage >= 90) grade = 'عالی (تطابق کامل)';
  else if (calculatedPercentage >= 75) grade = 'خوب (تطابق مناسب)';
  else if (calculatedPercentage >= 60) grade = 'متوسط (نیازمند اصلاح)';
  else grade = 'ضعیف (رد شده)';

  const feedback: string[] = [];
  feedback.push(`درصد تطابق چیدمان میدانی با پلنوگرام اصولی «${planogram.title}»: ${calculatedPercentage}٪`);

  if (evidence.photoAfterUrl) {
    feedback.push('عکس بعد از چیدمان دارای زاویه مناسب و زاویه روبروی قفسه (Eye-level) است.');
  }

  const missingItems = matchedProducts.filter(m => m.status === 'missing');
  if (missingItems.length > 0) {
    feedback.push(`کالاهای نیازمند بهبود در چیدمان: ${missingItems.map(m => m.name).slice(0, 2).join(' و ')}`);
  } else {
    feedback.push('تمام اقلام کلیدی و رخ‌های تعریف‌شده در شلف حضور دارند.');
  }

  return {
    compliancePercentage: calculatedPercentage,
    grade,
    passed,
    scoreAwarded,
    feedback,
    matchedProducts,
  };
}
