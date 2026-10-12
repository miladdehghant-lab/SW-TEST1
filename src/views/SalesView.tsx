import React, { useState, useMemo } from 'react';
import { UploadBatch, AppState, User, SaleRecord, Store } from '../types';
import { monthDefault, monthLabel, fmtDate, num, uid, SIMPLE_BRANDS, norm } from '../utils/formatters';
import {
  downloadTemplateCSV,
  downloadKaramadTemplateCSV,
  exportToCSV,
  extractSpreadsheetMatrix,
  processMatrixWithMapping,
  revalidateBatchRows,
  extractBatchDiscrepancies,
  extractNewStoresFromBatch,
  guessBrandFromText,
  SAMPLE_KARAMAD_MATRIX,
  ColumnMappingConfig,
} from '../utils/excelParser';
import { extractAndSyncProductsFromSales } from '../utils/productPlanogramEngine';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Check,
  X,
  AlertCircle,
  FileCheck,
  Sparkles,
  SlidersHorizontal,
  Table,
  UserPlus,
  Store as StoreIcon,
  Tag,
  Wand2,
  CheckCircle2,
  ArrowRight,
  Eye,
  RefreshCw,
  Lightbulb,
  CornerDownLeft,
  ArrowDownCircle,
} from 'lucide-react';

interface SalesViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onUpdateState,
  onShowToast,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(monthDefault());
  const [agency, setAgency] = useState(currentUser?.agency || 'منطقه ۱');
  const [coveredThrough, setCoveredThrough] = useState('2026-10-15');
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  // Seller Aliases in this session (raw name -> userId)
  const [sellerAliases, setSellerAliases] = useState<Record<string, string>>({});

  // Column Mapping Wizard States
  const [extractedData, setExtractedData] = useState<{
    matrix: any[][];
    headers: string[];
    sampleRows: any[][];
    detectedMap: ColumnMappingConfig;
  } | null>(null);

  const [colMap, setColMap] = useState<ColumnMappingConfig>({
    date: 0,
    invoice: 1,
    customerCode: 2,
    customerName: 3,
    seller: 4,
    brand: 7,
    defaultBrand: 'مولفیکس',
    sku: 5,
    product: 6,
    qty: 8,
    value: 9,
  });

  const [previewBatch, setPreviewBatch] = useState<UploadBatch | null>(null);
  const [selectedTabFilter, setSelectedTabFilter] = useState<'all' | 'sales' | 'returns' | 'newStores' | 'invalid'>('all');

  const canUpload = isAdmin || currentUser?.role === 'support' || currentUser?.role === 'rep';

  const getColLetter = (idx: number): string => {
    if (idx < 0) return '—';
    return String.fromCharCode(65 + idx); // 0 -> A, 1 -> B, ...
  };

  // Discrepancy analysis for current preview batch
  const discrepancies = useMemo(() => {
    if (!previewBatch) return null;
    return extractBatchDiscrepancies(previewBatch.rows, state.users, state.stores, sellerAliases);
  }, [previewBatch, state.users, state.stores, sellerAliases]);

  // Detected new stores from preview batch
  const newStoresFromBatch = useMemo(() => {
    if (!previewBatch) return [];
    return extractNewStoresFromBatch(
      previewBatch.rows,
      state.stores,
      previewBatch.agency,
      currentUser?.id || 'usr_admin'
    );
  }, [previewBatch, state.stores, currentUser?.id]);

  // Statistics for preview batch
  const batchStats = useMemo(() => {
    if (!previewBatch) return null;
    const regularRows = previewBatch.rows.filter(r => !r.isReturn);
    const returnRows = previewBatch.rows.filter(r => r.isReturn);

    const grossCartons = regularRows.reduce((sum, r) => sum + r.quantity, 0);
    const returnCartons = Math.abs(returnRows.reduce((sum, r) => sum + r.quantity, 0));
    const netCartons = grossCartons - returnCartons;

    return {
      regularCount: regularRows.length,
      returnCount: returnRows.length,
      grossCartons,
      returnCartons,
      netCartons,
      newStoresCount: newStoresFromBatch.length,
      invalidCount: previewBatch.invalidCount,
      validCount: previewBatch.rowCount - previewBatch.invalidCount,
    };
  }, [previewBatch, newStoresFromBatch]);

  // Load Sample Karaamad Data
  const handleLoadSampleKaramad = () => {
    const rawHeaders = SAMPLE_KARAMAD_MATRIX[0].map(String);
    const sampleRows = SAMPLE_KARAMAD_MATRIX.slice(1, 4);
    const sampleColMap: ColumnMappingConfig = {
      date: 0,
      invoice: 1,
      customerCode: 2,
      customerName: 3,
      seller: 4,
      sku: 5,
      product: 6,
      brand: 7,
      defaultBrand: 'مولفیکس',
      qty: 8,
      value: 9,
    };

    setExtractedData({
      matrix: SAMPLE_KARAMAD_MATRIX,
      headers: rawHeaders,
      sampleRows,
      detectedMap: sampleColMap,
    });
    setColMap(sampleColMap);
    setPreviewBatch(null);
    onShowToast('نمونه فاکتور کارآمد سیستم (شامل برگشت از فروش و فروشگاه‌های جدید) بارگذاری شد.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setProcessing(true);
    setPreviewBatch(null);

    try {
      const extracted = await extractSpreadsheetMatrix(selected);
      setExtractedData(extracted);
      setColMap(extracted.detectedMap);
      onShowToast(`فایل "${selected.name}" بارگذاری شد. لطفاً ستون‌ها را بررسی و در صورت نیاز جابه‌جا کنید.`);
    } catch (err: any) {
      onShowToast(err.message || 'خطا در خواندن فایل اکسل.');
      setExtractedData(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyColumnMapping = () => {
    if (!extractedData) return;

    if (colMap.seller < 0) {
      onShowToast('لطفاً ستون نام ویزیتور / بازاریاب را مشخص کنید.');
      return;
    }
    if (colMap.qty < 0) {
      onShowToast('لطفاً ستون تعداد یا کارتن فروش را مشخص کنید.');
      return;
    }

    try {
      const { rows, unmapped } = processMatrixWithMapping(
        extractedData.matrix,
        colMap,
        selectedMonth,
        agency,
        coveredThrough,
        state.users,
        state.stores,
        sellerAliases
      );

      const invalidCount = rows.filter(r => !r.valid).length;
      const returnCount = rows.filter(r => r.isReturn).length;

      const newBatch: UploadBatch = {
        id: uid('upl'),
        fileName: file ? file.name : 'Karamad_System_Sample.xlsx',
        month: selectedMonth,
        agency,
        coveredThrough,
        createdAt: new Date().toISOString(),
        rowCount: rows.length,
        invalidCount,
        returnCount,
        status: 'pending',
        rows,
        unmapped,
      };

      setPreviewBatch(newBatch);
      if (returnCount > 0) {
        onShowToast(`تطبیق انجام شد: ${num(rows.length)} ردیف استخراج گردید (شامل ${num(returnCount)} ردیف برگشت از فروش).`);
      } else {
        onShowToast(`تطبیق انجام شد: ${num(rows.length)} ردیف فاکتور آماده تایید است.`);
      }
    } catch (err: any) {
      onShowToast(err.message || 'خطا در تطبیق ستون‌ها.');
    }
  };

  // Re-evaluates previewBatch against updated users/stores/aliases
  const refreshPreviewBatch = (
    currentRows: SaleRecord[],
    currentUsers: User[],
    currentStores: Store[],
    aliases: Record<string, string>
  ) => {
    if (!previewBatch) return;
    const revalidated = revalidateBatchRows(currentRows, currentUsers, currentStores, aliases);
    const invalidCount = revalidated.filter(r => !r.valid).length;
    const returnCount = revalidated.filter(r => r.isReturn).length;
    setPreviewBatch({
      ...previewBatch,
      rows: revalidated,
      invalidCount,
      returnCount,
    });
  };

  // Suggestion Action 1: Quick Add a single missing seller
  const handleQuickAddSeller = (
    sellerName: string,
    firstName?: string,
    lastName?: string
  ) => {
    if (!previewBatch) return;
    const parts = sellerName.trim().split(/\s+/);
    const fName = firstName || parts[0] || 'ویزیتور';
    const lName = lastName || parts.slice(1).join(' ') || 'جدید';

    const sampleIndex = state.users.filter(u => u.isSamplePhone).length + 1;
    const samplePhone = `0900000${String(sampleIndex).padStart(4, '0')}`;

    const newUser: User = {
      id: uid('usr_sel'),
      phone: samplePhone,
      firstName: fName,
      lastName: lName,
      city: agency.includes('تهران') ? 'تهران' : 'تهران',
      agency: previewBatch.agency,
      role: 'seller',
      status: 'approved',
      isSamplePhone: true,
      isConvertedUser: false,
      password: 'Password123',
      operationalStatus: 'league',
      targetStatus: 'has_target',
      createdAt: new Date().toISOString(),
    };

    const newUsers = [newUser, ...state.users];
    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'user.quick_added_from_excel',
        details: { sellerName, userId: newUser.id, agency: newUser.agency, samplePhone },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      users: newUsers,
      audit: newAudit,
    });

    refreshPreviewBatch(previewBatch.rows, newUsers, state.stores, sellerAliases);
    onShowToast(`ویزیتور «${fName} ${lName}» با شماره موقت (${samplePhone}) ثبت شد. می‌توانید در مدیریت کاربران اطلاعات او را تکمیل کنید.`);
  };

  // Suggestion Action 2: Map unmatched seller to an existing user (alias)
  const handleMapSellerToExisting = (rawSellerName: string, targetUserId: string) => {
    if (!previewBatch || !targetUserId) return;
    const targetUser = state.users.find(u => u.id === targetUserId);
    if (!targetUser) return;

    const newAliases = {
      ...sellerAliases,
      [rawSellerName]: targetUserId,
    };
    setSellerAliases(newAliases);

    refreshPreviewBatch(previewBatch.rows, state.users, state.stores, newAliases);
    onShowToast(`نام «${rawSellerName}» به ویزیتور «${targetUser.firstName} ${targetUser.lastName}» متصل شد!`);
  };

  // Suggestion Action 3: Batch Add All Missing Sellers
  const handleBatchAddAllMissingSellers = () => {
    if (!previewBatch || !discrepancies || !discrepancies.unmatchedSellers.length) return;

    let baseIdx = state.users.filter(u => u.isSamplePhone).length + 1;
    const addedUsers: User[] = discrepancies.unmatchedSellers.map(s => {
      const samplePhone = `0900000${String(baseIdx++).padStart(4, '0')}`;
      return {
        id: uid('usr_sel'),
        phone: samplePhone,
        firstName: s.suggestedFirstName,
        lastName: s.suggestedLastName,
        city: 'تهران',
        agency: previewBatch.agency,
        role: 'seller' as const,
        status: 'approved' as const,
        isSamplePhone: true,
        isConvertedUser: false,
        password: 'Password123',
        operationalStatus: 'league' as const,
        targetStatus: 'has_target' as const,
        createdAt: new Date().toISOString(),
      };
    });

    const newUsers = [...addedUsers, ...state.users];
    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'users.batch_quick_added_from_excel',
        details: { count: addedUsers.length },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      users: newUsers,
      audit: newAudit,
    });

    refreshPreviewBatch(previewBatch.rows, newUsers, state.stores, sellerAliases);
    onShowToast(`تعداد ${num(addedUsers.length)} ویزیتور جدید با موفقیت به سیستم اضافه شدند! 🎉`);
  };

  // Suggestion Action 4: Quick Add a single missing Store
  const handleQuickAddStore = (code: string, name: string, sellerName?: string) => {
    if (!previewBatch) return;
    const matchingUser = state.users.find(
      u => u.status === 'approved' && `${u.firstName} ${u.lastName}`.trim() === sellerName?.trim()
    );

    const newStore: Store = {
      id: uid('str'),
      name: name.trim() || `فروشگاه ${code}`,
      code: code.trim(),
      city: 'تهران',
      agency: previewBatch.agency,
      potential: 'medium',
      ownerId: matchingUser?.id || currentUser?.id || 'usr_admin',
      status: 'incomplete',
      needsCompletion: true,
      source: 'excel_ingestion',
      createdAt: new Date().toISOString(),
    };

    const newStores = [newStore, ...state.stores];
    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'store.quick_registered_from_excel',
        details: { code: newStore.code, name: newStore.name },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      stores: newStores,
      audit: newAudit,
    });

    refreshPreviewBatch(previewBatch.rows, state.users, newStores, sellerAliases);
    onShowToast(`فروشگاه «${newStore.name}» (کد ${newStore.code}) در بانک مشتریان ثبت شد! ✅`);
  };

  // Suggestion Action 5: Batch Register All Missing Stores
  const handleBatchAddAllMissingStores = () => {
    if (!previewBatch || !discrepancies || !discrepancies.unmatchedStores.length) return;

    const newStoresList: Store[] = discrepancies.unmatchedStores.map(s => ({
      id: uid('str'),
      name: s.name,
      code: s.code,
      city: 'تهران',
      agency: previewBatch.agency,
      potential: 'medium',
      ownerId: s.sellerId || currentUser?.id || 'usr_admin',
      status: 'incomplete',
      needsCompletion: true,
      source: 'excel_ingestion',
      createdAt: new Date().toISOString(),
    }));

    const newStores = [...newStoresList, ...state.stores];
    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'stores.batch_registered_from_excel',
        details: { count: newStoresList.length },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      stores: newStores,
      audit: newAudit,
    });

    refreshPreviewBatch(previewBatch.rows, state.users, newStores, sellerAliases);
    onShowToast(`تعداد ${num(newStoresList.length)} فروشگاه جدید در بانک داده ثبت گردید (جهت تکمیل اطلاعات میدانی)! 🏪`);
  };

  // Suggestion Action 6: Auto-Match Brand across all rows based on text
  const handleAutoInferAllBrands = () => {
    if (!previewBatch) return;

    const updatedRows = previewBatch.rows.map(r => {
      const guessed = guessBrandFromText(`${r.product || ''} ${r.sku || ''}`);
      return {
        ...r,
        brand: guessed,
      };
    });

    refreshPreviewBatch(updatedRows, state.users, state.stores, sellerAliases);
    onShowToast('برند تمام اقلام بر اساس شرح کالا با موفقیت تطبیق یافت.');
  };

  // Suggestion Master Action: Solve EVERYTHING in 1-Click
  const handleAutoResolveEverything = () => {
    if (!previewBatch || !discrepancies) return;

    // 1. Add all missing sellers
    const addedUsers: User[] = discrepancies.unmatchedSellers.map(s => ({
      id: uid('usr_sel'),
      phone: `0913${Math.floor(1000000 + Math.random() * 9000000)}`,
      firstName: s.suggestedFirstName,
      lastName: s.suggestedLastName,
      city: 'تهران',
      agency: previewBatch.agency,
      role: 'seller',
      status: 'approved',
      createdAt: new Date().toISOString(),
    }));

    const finalUsers = [...addedUsers, ...state.users];

    // 2. Add all missing stores
    const addedStores: Store[] = discrepancies.unmatchedStores.map(s => ({
      id: uid('str'),
      name: s.name,
      code: s.code,
      city: 'تهران',
      agency: previewBatch.agency,
      potential: 'medium',
      ownerId: s.sellerId || currentUser?.id || 'usr_admin',
      status: 'incomplete',
      needsCompletion: true,
      source: 'excel_ingestion',
      createdAt: new Date().toISOString(),
    }));

    const finalStores = [...addedStores, ...state.stores];

    // 3. Auto assign brands
    const updatedRows = previewBatch.rows.map(r => ({
      ...r,
      brand: r.brand && r.brand !== 'عمومی' ? r.brand : guessBrandFromText(`${r.product || ''} ${r.sku || ''}`),
    }));

    onUpdateState({
      ...state,
      users: finalUsers,
      stores: finalStores,
    });

    refreshPreviewBatch(updatedRows, finalUsers, finalStores, sellerAliases);
    onShowToast('✨ تمام ویزیتورها اضافه، فروشگاه‌ها در بانک داده ثبت و برندها تطبیق یافتند!');
  };

  const handleCommitBatch = () => {
    if (!previewBatch) return;

    if (previewBatch.invalidCount > 0 && !isAdmin) {
      onShowToast('این فایل هنوز سطرهای خطادار دارد. لطفاً از پیشنهادات بالا برای رفع آن استفاده کنید.');
      return;
    }

    // Auto-ingest new stores from invoices that don't yet exist in state.stores
    // as incomplete profiles (نیازمند تکمیل اطلاعات)
    const newStoresToCollect = extractNewStoresFromBatch(
      previewBatch.rows,
      state.stores,
      previewBatch.agency,
      currentUser?.id || 'usr_admin'
    );

    const finalStores = [...newStoresToCollect, ...state.stores];
    const returnCount = previewBatch.rows.filter(r => r.isReturn).length;

    const finalBatch: UploadBatch = {
      ...previewBatch,
      newStoresCount: newStoresToCollect.length,
      returnCount,
    };
    const updatedUploads = [finalBatch, ...state.uploads];

    // Auto-approve valid rows
    const validRows = previewBatch.rows.filter(r => r.valid);
    const updatedSales = [
      ...validRows.map(r => ({ ...r, status: 'approved' as const, uploadId: previewBatch.id })),
      ...state.sales,
    ];

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'sales.uploaded_and_committed',
        details: {
          batchId: previewBatch.id,
          fileName: previewBatch.fileName,
          totalRows: previewBatch.rowCount,
          validRows: validRows.length,
          returnCount,
          newStoresCollected: newStoresToCollect.length,
        },
      },
      ...state.audit,
    ];

    // Auto-detect & register new products in product catalog based on sales batch
    const { updatedProducts, newlyDetectedCount } = extractAndSyncProductsFromSales(
      previewBatch.rows,
      state.products || []
    );

    onUpdateState({
      ...state,
      stores: finalStores,
      products: updatedProducts,
      uploads: updatedUploads,
      sales: updatedSales,
      audit: newAudit,
    });

    onShowToast(
      `فایل ثبت شد: ${num(validRows.length)} فاکتور تایید گردید (شامل ${num(returnCount)} برگشت از فروش) و ${num(newStoresToCollect.length)} فروشگاه جدید جهت تکمیل اطلاعات میدانی به سیستم افزوده شد.`
    );
    setPreviewBatch(null);
    setExtractedData(null);
    setFile(null);
  };

  const handleInspectBatchFromHistory = (batch: UploadBatch) => {
    setPreviewBatch({ ...batch });
    window.scrollTo({ top: 300, behavior: 'smooth' });
    onShowToast(`دسته بارگذاری "${batch.fileName}" برای بررسی و رفع مغایرت فراخوانی شد.`);
  };

  const handleApproveBatch = (batchId: string) => {
    const targetBatch = state.uploads.find(u => u.id === batchId);
    if (!targetBatch) return;

    // Auto-ingest new stores if needed
    const newStoresToCollect = extractNewStoresFromBatch(
      targetBatch.rows,
      state.stores,
      targetBatch.agency,
      currentUser?.id || 'usr_admin'
    );
    const finalStores = [...newStoresToCollect, ...state.stores];

    const updatedUploads = state.uploads.map(u => (u.id === batchId ? { ...u, status: 'approved' as const } : u));
    const validRows = targetBatch.rows.filter(r => r.valid);
    const updatedSales = [
      ...validRows.map(r => ({ ...r, status: 'approved' as const, uploadId: batchId })),
      ...state.sales,
    ];

    onUpdateState({
      ...state,
      stores: finalStores,
      uploads: updatedUploads,
      sales: updatedSales,
    });

    onShowToast(`دسته بارگذاری "${targetBatch.fileName}" تایید شد.`);
  };

  const handleExportApprovedSales = () => {
    const rows = state.sales.map(s => ({
      'دوره فروش': monthLabel(s.month),
      'نمایندگی': s.agency,
      'فروشنده': s.sellerName,
      'شماره فاکتور': s.invoice,
      'کد مشتری': s.customerCode,
      'نام فروشگاه': s.customerName || '',
      'برند': s.brand,
      'کد کالا': s.sku,
      'شرح کالا': s.product || '',
      'نوع سند': s.isReturn ? 'برگشت از فروش' : 'فروش عادی',
      'تعداد فروش': s.quantity,
      'مبلغ ریالی': s.value || '',
    }));
    exportToCSV('STORE_WAR_Approved_Sales.csv', rows);
    onShowToast('گزارش فاکتورهای فروش تایید شده دانلود شد.');
  };

  const filteredPreviewRows = useMemo(() => {
    if (!previewBatch) return [];
    if (selectedTabFilter === 'sales') return previewBatch.rows.filter(r => !r.isReturn && r.valid);
    if (selectedTabFilter === 'returns') return previewBatch.rows.filter(r => r.isReturn);
    if (selectedTabFilter === 'newStores') {
      const existingCodes = new Set(state.stores.map(s => s.code));
      return previewBatch.rows.filter(r => r.customerCode && !existingCodes.has(r.customerCode));
    }
    if (selectedTabFilter === 'invalid') return previewBatch.rows.filter(r => !r.valid);
    return previewBatch.rows;
  }, [previewBatch, selectedTabFilter, state.stores]);

  const approvedUsersList = state.users.filter(
    u => u.status === 'approved' && (u.role === 'seller' || u.role === 'rep' || u.role === 'supervisor')
  );

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>بارگذاری و تطبیق هوشمند فایل اکسل فروش و فاکتورها</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            محاسبه دقیق برگشت از فروش (کارتن منفی)، گردآوری خودکار فروشگاه‌های جدید و تطبیق هوشمند اقلام
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadSampleKaramad}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-700/80 text-purple-200 text-xs font-semibold transition-colors shadow-sm"
            title="بارگذاری داده نمونه فایل فروش شامل برگشت از فروش، ویزیتور جدید و فروشگاه جدید"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>بارگذاری فایل نمونه تستی</span>
          </button>
          <button
            onClick={downloadKaramadTemplateCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-200 text-xs font-medium transition-colors"
            title="دانلود قالب اکسل استاندارد ستون‌های سیستم فروش"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>قالب اکسل استاندارد</span>
          </button>
          <button
            onClick={downloadTemplateCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#17263b] hover:bg-[#1f334f] border border-[#283a53] text-xs text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>قالب عمومی CSV</span>
          </button>
          <button
            onClick={handleExportApprovedSales}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#17263b] hover:bg-[#1f334f] border border-[#283a53] text-xs text-slate-200 transition-colors"
          >
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>خروجی فاکتورهای تاییدشده</span>
          </button>
        </div>
      </div>

      {/* Step 1: File Selection & Configuration */}
      {canUpload && (
        <div className="bg-[#121e30] border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-[#283a53] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              مرحله ۱: انتخاب فایل اکسل خروجی (کارآمد سیستم یا نمایندگی)
            </h3>
            <span className="text-[11px] text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded-lg border border-cyan-800">
              پوشش کامل برگشت از فروش و ورود خودکار فروشگاه‌های جدید
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
            <div>
              <label className="block text-slate-400 mb-1">دوره فروش (ماه)</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
              >
                <option value="1405-07">مهر ۱۴۰۵</option>
                <option value="1405-08">آبان ۱۴۰۵</option>
                <option value="1405-09">آذر ۱۴۰۵</option>
                <option value="1405-10">دی ۱۴۰۵</option>
                <option value="1405-11">بهمن ۱۴۰۵</option>
                <option value="1405-12">اسفند ۱۴۰۵</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">نمایندگی</label>
              <input
                value={agency}
                disabled={!isAdmin}
                onChange={e => setAgency(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none disabled:opacity-70"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">پوشش داده تا تاریخ</label>
              <input
                type="date"
                required
                value={coveredThrough}
                onChange={e => setCoveredThrough(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">انتخاب فایل (.xlsx / .csv)</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="block w-full text-slate-400 file:mr-0 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Interactive Column Mapping Wizard */}
      {extractedData && (
        <div className="bg-[#121e30] border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#283a53] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                مرحله ۲: تطبیق و جایگذاری دستی سرستون‌های فایل اکسل با سامانه
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تعداد {extractedData.headers.length} ستون در فایل شناسایی شد. می‌توانید برای هر بخش مشخص کنید کدام ستون اکسل (ستون A, B, C...) مدنظر است:
              </p>
            </div>
            <button
              onClick={() => setExtractedData(null)}
              className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>انصراف</span>
            </button>
          </div>

          {/* Interactive Column Pickers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-[#0c1727] p-4 rounded-xl border border-[#24374f]">
            {/* 1. Date */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ۱. ستون تاریخ فاکتور / صدور:
              </label>
              <select
                value={colMap.date}
                onChange={e => setColMap({ ...colMap, date: Number(e.target.value) })}
                className="w-full p-2 rounded-lg bg-[#14233a] border border-[#283a53] text-white"
              >
                <option value={-1}>انتخاب نشده</option>
                {extractedData.headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    ستون {getColLetter(idx)}: {h || `(ستون ${idx + 1})`}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Invoice */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ۲. ستون شماره فاکتور / برگه فروش:
              </label>
              <select
                value={colMap.invoice}
                onChange={e => setColMap({ ...colMap, invoice: Number(e.target.value) })}
                className="w-full p-2 rounded-lg bg-[#14233a] border border-[#283a53] text-white"
              >
                <option value={-1}>انتخاب نشده</option>
                {extractedData.headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    ستون {getColLetter(idx)}: {h || `(ستون ${idx + 1})`}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Customer Code */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ۳. ستون کد مشتری / تفصیل:
              </label>
              <select
                value={colMap.customerCode}
                onChange={e => setColMap({ ...colMap, customerCode: Number(e.target.value) })}
                className="w-full p-2 rounded-lg bg-[#14233a] border border-[#283a53] text-white"
              >
                <option value={-1}>انتخاب نشده</option>
                {extractedData.headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    ستون {getColLetter(idx)}: {h || `(ستون ${idx + 1})`}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Customer Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ۴. ستون نام مشتری / فروشگاه:
              </label>
              <select
                value={colMap.customerName}
                onChange={e => setColMap({ ...colMap, customerName: Number(e.target.value) })}
                className="w-full p-2 rounded-lg bg-[#14233a] border border-[#283a53] text-white"
              >
                <option value={-1}>انتخاب نشده</option>
                {extractedData.headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    ستون {getColLetter(idx)}: {h || `(ستون ${idx + 1})`}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Salesperson */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ۵. ستون نام ویزیتور / بازاریاب * :
              </label>
              <select
                required
                value={colMap.seller}
                onChange={e => setColMap({ ...colMap, seller: Number(e.target.value) })}
                className="w-full p-2 rounded-lg bg-[#14233a] border border-blue-500 text-white font-bold"
              >
                <option value={-1}>انتخاب نشده</option>
                {extractedData.headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    ستون {getColLetter(idx)}: {h || `(ستون ${idx + 1})`}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Brand */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ۶. ستون برند / مارک کالا:
              </label>
              <div className="flex gap-2">
                <select
                  value={colMap.brand}
                  onChange={e => setColMap({ ...colMap, brand: Number(e.target.value) })}
                  className="flex-1 p-2 rounded-lg bg-[#14233a] border border-[#283a53] text-white"
                >
                  <option value={-1}>برند ثابت (زیر)</option>
                  {extractedData.headers.map((h, idx) => (
                    <option key={idx} value={idx}>
                      ستون {getColLetter(idx)}: {h}
                    </option>
                  ))}
                </select>
                {colMap.brand < 0 && (
                  <select
                    value={colMap.defaultBrand}
                    onChange={e => setColMap({ ...colMap, defaultBrand: e.target.value })}
                    className="w-28 p-2 rounded-lg bg-[#14233a] border border-cyan-700 text-cyan-300 font-medium shrink-0"
                  >
                    {SIMPLE_BRANDS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 7. Product / SKU */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ۷. ستون شرح کالا / کد قلم:
              </label>
              <select
                value={colMap.product}
                onChange={e => setColMap({ ...colMap, product: Number(e.target.value) })}
                className="w-full p-2 rounded-lg bg-[#14233a] border border-[#283a53] text-white"
              >
                <option value={-1}>انتخاب نشده</option>
                {extractedData.headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    ستون {getColLetter(idx)}: {h || `(ستون ${idx + 1})`}
                  </option>
                ))}
              </select>
            </div>

            {/* 8. Quantity (Cartons - handles negatives!) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ۸. ستون مقدار / تعداد کارتن (شامل مقادیر منفی برگشت از فروش) * :
              </label>
              <select
                required
                value={colMap.qty}
                onChange={e => setColMap({ ...colMap, qty: Number(e.target.value) })}
                className="w-full p-2 rounded-lg bg-[#14233a] border border-blue-500 text-white font-bold"
              >
                <option value={-1}>انتخاب نشده</option>
                {extractedData.headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    ستون {getColLetter(idx)}: {h || `(ستون ${idx + 1})`}
                  </option>
                ))}
              </select>
            </div>

            {/* 9. Value */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ۹. ستون مبلغ خالص / ریالی:
              </label>
              <select
                value={colMap.value}
                onChange={e => setColMap({ ...colMap, value: Number(e.target.value) })}
                className="w-full p-2 rounded-lg bg-[#14233a] border border-[#283a53] text-white"
              >
                <option value={-1}>انتخاب نشده</option>
                {extractedData.headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    ستون {getColLetter(idx)}: {h || `(ستون ${idx + 1})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sample Raw File Preview */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
              <Table className="w-3.5 h-3.5 text-cyan-400" />
              <span>پیش‌نمایش سطرهای اول فایل اکسل آپلود شده:</span>
            </div>
            <div className="overflow-x-auto border border-[#283a53] rounded-xl max-h-36">
              <table className="w-full text-right text-[11px]">
                <thead className="bg-[#14233a] text-slate-300 sticky top-0">
                  <tr>
                    {extractedData.headers.map((h, i) => (
                      <th key={i} className="py-1.5 px-3 whitespace-nowrap border-l border-[#283a53] last:border-0">
                        <span className="text-cyan-400 font-bold ml-1">[{getColLetter(i)}]</span>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f47]">
                  {extractedData.sampleRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#14233a]/40">
                      {extractedData.headers.map((_, cIdx) => (
                        <td key={cIdx} className="py-1.5 px-3 text-slate-300 whitespace-nowrap border-l border-[#1e2f47] last:border-0">
                          {String(row[cIdx] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action to validate */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              onClick={handleApplyColumnMapping}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>تطبیق و استخراج هوشمند فاکتورها</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Validated Batch Inspector & Smart Suggestion Center */}
      {previewBatch && batchStats && (
        <div className="bg-[#121e30] border border-blue-500/40 rounded-2xl p-5 shadow-2xl space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#283a53] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                نتیجه نهایی استخراج فاکتورها: {previewBatch.fileName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                دوره: {monthLabel(previewBatch.month)} · نمایندگی: {previewBatch.agency}
              </p>
            </div>
            <button
              onClick={() => setPreviewBatch(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* KPI Summary Cards including Sales Returns and Auto-Store Intake */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
              <div className="text-slate-400">تعداد کل فاکتورها</div>
              <div className="text-lg font-bold text-white mt-1 tabular-nums">{num(previewBatch.rowCount)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{num(batchStats.validCount)} ردیف تاییدشده</div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800">
              <div className="text-emerald-300">فروش عادی (ناخالص)</div>
              <div className="text-lg font-bold text-emerald-400 mt-1 tabular-nums">
                {num(batchStats.grossCartons)} <span className="text-xs font-normal">کارتن</span>
              </div>
              <div className="text-[10px] text-emerald-300/70 mt-0.5">{num(batchStats.regularCount)} فاکتور فروش</div>
            </div>

            <div className="p-3 rounded-xl bg-orange-950/40 border border-orange-800">
              <div className="text-orange-300 flex items-center gap-1">
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>برگشت از فروش (منفی)</span>
              </div>
              <div className="text-lg font-bold text-orange-400 mt-1 tabular-nums">
                −{num(batchStats.returnCartons)} <span className="text-xs font-normal">کارتن</span>
              </div>
              <div className="text-[10px] text-orange-300/70 mt-0.5">{num(batchStats.returnCount)} فاکتور برگشتی</div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800">
              <div className="text-cyan-300">فروش خالص کل</div>
              <div className="text-lg font-bold text-cyan-400 mt-1 tabular-nums">
                {num(batchStats.netCartons)} <span className="text-xs font-normal">کارتن</span>
              </div>
              <div className="text-[10px] text-cyan-300/70 mt-0.5">پس از کسر برگشتی‌ها</div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800">
              <div className="text-purple-300">فروشگاه‌های جدید</div>
              <div className="text-lg font-bold text-purple-400 mt-1 tabular-nums">
                {num(batchStats.newStoresCount)}
              </div>
              <div className="text-[10px] text-purple-300/70 mt-0.5">ورود خودکار به سیستم</div>
            </div>
          </div>

          {/* Informational Callout for Store Intake & Returns */}
          <div className="p-3 rounded-xl bg-[#0c1727] border border-[#233852] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-200">
                سطرهای دارای تعداد کارتن منفی به عنوان <strong>برگشت از فروش</strong> معتبر شناخته شده و از سرجمع کسر می‌گردند.
                همچنین <strong>{num(batchStats.newStoresCount)} فروشگاه جدید</strong> پس از تایید فایل به صورت خودکار با برچسب «نیازمند تکمیل اطلاعات» در پایگاه فروشگاه‌ها ذخیره می‌شوند.
              </span>
            </div>
          </div>

          {/* SMART SUGGESTIONS WORKSPACE (For unknown sellers or missing brands) */}
          {discrepancies &&
            (discrepancies.unmatchedSellers.length > 0 || discrepancies.unmatchedBrands.length > 0) && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-[#102035] border border-cyan-500/50 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-900/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                      <Lightbulb className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-cyan-200">
                        مرکز هوشمند پیشنهادات سیستم برای رفع سریع مغایرت‌ها
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        پیشنهادهای سیستم برای ویزیتورها و برندهای نامشخص:
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleAutoResolveEverything}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-900/50 transition-all shrink-0"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>رفع هوشمند تمام مغایرت‌ها (۱ کلیک)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Category 1: Unmatched Sellers Suggestions */}
                  {discrepancies.unmatchedSellers.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#0c1727]/90 border border-amber-500/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                          <span>ویزیتورهای ناشناخته ({num(discrepancies.unmatchedSellers.length)} نفر)</span>
                        </span>
                        <button
                          onClick={handleBatchAddAllMissingSellers}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold underline"
                        >
                          + افزودن همه
                        </button>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {discrepancies.unmatchedSellers.map((s, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-[#14233a] border border-[#24374f] text-[11px] space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-slate-200">
                              <span className="font-semibold text-white">«{s.name}»</span>
                              <span className="text-[10px] text-amber-400">
                                {num(s.count)} فاکتور
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              پیشنهاد: افزودن به عنوان ویزیتور جدید یا اتصال به کاربر قبلی:
                            </p>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <button
                                onClick={() => handleQuickAddSeller(s.name, s.suggestedFirstName, s.suggestedLastName)}
                                className="flex-1 py-1 px-2 rounded-md bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium text-[10px] flex items-center justify-center gap-1 transition-colors"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>+ افزودن فوری</span>
                              </button>

                              <select
                                defaultValue=""
                                onChange={e => {
                                  if (e.target.value) handleMapSellerToExisting(s.name, e.target.value);
                                }}
                                className="py-1 px-1.5 rounded-md bg-[#0e1a2b] border border-[#2b4467] text-slate-300 text-[10px] outline-none"
                              >
                                <option value="" disabled>
                                  اتصال به ویزیتور موجود...
                                </option>
                                {approvedUsersList.map(u => (
                                  <option key={u.id} value={u.id}>
                                    {u.firstName} {u.lastName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 2: Brand & Product Suggestions */}
                  {discrepancies.unmatchedBrands.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#0c1727]/90 border border-purple-500/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-purple-400" />
                          <span>تطبیق برند کالاها ({num(discrepancies.unmatchedBrands.length)} قلم)</span>
                        </span>
                        <button
                          onClick={handleAutoInferAllBrands}
                          className="text-[10px] text-purple-300 hover:text-white font-semibold underline"
                        >
                          ⚡ تطبیق خودکار همه
                        </button>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {discrepancies.unmatchedBrands.map((b, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-[#14233a] border border-[#24374f] text-[11px] space-y-1"
                          >
                            <div className="text-white font-semibold truncate">{b.product || b.sku}</div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">
                                پیشنهاد: <strong className="text-purple-300">{b.suggestedBrand}</strong>
                              </span>
                              <button
                                onClick={handleAutoInferAllBrands}
                                className="py-0.5 px-2 rounded bg-purple-700 hover:bg-purple-600 text-white"
                              >
                                تایید برند
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Tab Filter & Search for Preview Rows */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#283a53] pb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedTabFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedTabFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#152338] text-slate-400 hover:text-white'
                }`}
              >
                همه ({num(previewBatch.rowCount)})
              </button>
              <button
                onClick={() => setSelectedTabFilter('sales')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedTabFilter === 'sales'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#152338] text-slate-400 hover:text-white'
                }`}
              >
                فروش عادی ({num(batchStats.regularCount)})
              </button>
              <button
                onClick={() => setSelectedTabFilter('returns')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  selectedTabFilter === 'returns'
                    ? 'bg-orange-600 text-white'
                    : 'bg-[#152338] text-orange-400 hover:text-orange-300'
                }`}
              >
                <CornerDownLeft className="w-3 h-3" />
                <span>برگشت از فروش ({num(batchStats.returnCount)})</span>
              </button>
              <button
                onClick={() => setSelectedTabFilter('newStores')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  selectedTabFilter === 'newStores'
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#152338] text-purple-400 hover:text-purple-300'
                }`}
              >
                <StoreIcon className="w-3 h-3" />
                <span>فروشگاه‌های جدید ({num(batchStats.newStoresCount)})</span>
              </button>
              {previewBatch.invalidCount > 0 && (
                <button
                  onClick={() => setSelectedTabFilter('invalid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedTabFilter === 'invalid'
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#152338] text-rose-400 hover:text-rose-300'
                  }`}
                >
                  ردیف‌های خطادار ({num(previewBatch.invalidCount)})
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              نمایش {num(filteredPreviewRows.length)} سطر
            </span>
          </div>

          {/* Table Preview */}
          <div className="max-h-72 overflow-y-auto border border-[#283a53] rounded-xl overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#16253c] text-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">ردیف</th>
                  <th className="py-2.5 px-3">ویزیتور</th>
                  <th className="py-2.5 px-3">شماره فاکتور</th>
                  <th className="py-2.5 px-3">کد و نام مشتری</th>
                  <th className="py-2.5 px-3">برند / کالا</th>
                  <th className="py-2.5 px-3">تعداد / کارتن</th>
                  <th className="py-2.5 px-3">نوع سند</th>
                  <th className="py-2.5 px-3 min-w-[240px]">وضعیت و جزییات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2f47]">
                {filteredPreviewRows.slice(0, 100).map(r => {
                  const existingStore = state.stores.find(
                    s => (r.customerCode && norm(s.code) === norm(r.customerCode)) ||
                         (r.customerName && norm(s.name) === norm(r.customerName))
                  );
                  const isNewStore = r.customerCode && !existingStore;

                  return (
                    <tr
                      key={r.id}
                      className={
                        !r.valid
                          ? 'bg-rose-950/20'
                          : r.isReturn
                          ? 'bg-orange-950/15 hover:bg-orange-950/25'
                          : 'hover:bg-[#16253c]/30'
                      }
                    >
                      <td className="py-2 px-3 text-slate-400 font-mono">{r.sourceRow}</td>
                      <td className="py-2 px-3 font-semibold text-white">
                        <span>{r.sellerName || '—'}</span>
                        {r.ownerId && (
                          <span className="mr-1.5 text-[10px] text-emerald-400 font-normal">
                            (شناسایی شد)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-300">{r.invoice || '—'}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-200">{r.customerName || '—'}</span>
                          {isNewStore && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                              فروشگاه جدید
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.customerCode || '—'}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold ml-1">
                          {r.brand}
                        </span>
                        <span className="text-slate-300">{r.product || r.sku}</span>
                      </td>
                      <td className="py-2 px-3 font-bold tabular-nums">
                        {r.isReturn ? (
                          <span className="text-orange-400 flex items-center gap-0.5">
                            <span>−</span>
                            <span>{num(Math.abs(r.quantity))}</span>
                          </span>
                        ) : (
                          <span className="text-white">{num(r.quantity)}</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {r.isReturn ? (
                          <span className="inline-flex items-center gap-1 text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded-md border border-orange-800/80 font-bold text-[10px]">
                            <CornerDownLeft className="w-3 h-3" />
                            <span>برگشت از فروش</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                            <span>فروش عادی</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[11px]">
                        {r.valid ? (
                          <div className="space-y-0.5">
                            <div className="text-emerald-400/90 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>{r.isReturn ? 'تایید سند برگشتی (کسر از تارگت)' : 'تایید فروش و محاسبه امتیاز'}</span>
                            </div>
                            {isNewStore && (
                              <div className="text-[10px] text-cyan-300/80">
                                ↳ ثبت خودکار فروشگاه در سامانه جهت تکمیل اطلاعات
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-rose-300">
                              {(r.errors || []).join('، ')}
                            </div>
                            {!r.ownerId && r.sellerName && (
                              <button
                                onClick={() => handleQuickAddSeller(r.sellerName)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1"
                              >
                                <UserPlus className="w-2.5 h-2.5" />
                                <span>+ افزودن «{r.sellerName}»</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action to commit */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-[#283a53]">
            <div className="text-xs text-slate-400">
              {previewBatch.invalidCount === 0 ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تمام سطرهای فاکتور معتبر هستند. با تایید، فروشگاه‌های جدید نیز به طور خودکار درج خواهند شد.</span>
                </span>
              ) : (
                <span className="text-amber-400">
                  ⚠️ تعداد {num(previewBatch.invalidCount)} سطر نیازمند تطبیق است (از پیشنهادات بالای جدول استفاده فرمایید).
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setPreviewBatch(null)}
                className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white text-xs"
              >
                انصراف
              </button>
              <button
                onClick={handleCommitBatch}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${
                  previewBatch.invalidCount === 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-emerald-700/70 hover:bg-emerald-600'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>تایید نهایی و اعمال فاکتورها به سیستم</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploads History */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#283a53] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">تاریخچه بارگذاری‌های فروش</h3>
            <p className="text-xs text-slate-400 mt-0.5">فایل‌های پیشین ارسال‌شده از حسابداری (کارآمد سیستم و سایر)</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#16253c] text-slate-300 border-b border-[#283a53]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">نام فایل</th>
                <th className="py-2.5 px-4 font-semibold">دوره</th>
                <th className="py-2.5 px-4 font-semibold">نمایندگی</th>
                <th className="py-2.5 px-4 font-semibold">تعداد سطر</th>
                <th className="py-2.5 px-4 font-semibold">برگشت از فروش</th>
                <th className="py-2.5 px-4 font-semibold">فروشگاه‌های افزوده</th>
                <th className="py-2.5 px-4 font-semibold">تاریخ بارگذاری</th>
                <th className="py-2.5 px-4 font-semibold">وضعیت</th>
                <th className="py-2.5 px-4 font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f47]">
              {state.uploads.map(u => (
                <tr key={u.id} className="hover:bg-[#16253c]/50">
                  <td className="py-3 px-4 font-semibold text-white">{u.fileName}</td>
                  <td className="py-3 px-4 text-slate-300">{monthLabel(u.month)}</td>
                  <td className="py-3 px-4 text-slate-400">{u.agency}</td>
                  <td className="py-3 px-4 tabular-nums text-slate-200">{num(u.rowCount)}</td>
                  <td className="py-3 px-4 tabular-nums text-orange-400 font-medium">
                    {u.returnCount ? num(u.returnCount) : '—'}
                  </td>
                  <td className="py-3 px-4 tabular-nums text-cyan-300 font-medium">
                    {u.newStoresCount ? num(u.newStoresCount) : '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{fmtDate(u.createdAt)}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleInspectBatchFromHistory(u)}
                        className="px-2.5 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 border border-blue-700/60 text-blue-200 font-medium text-xs flex items-center gap-1 transition-colors"
                        title="بررسی سطرهای این دسته و اعمال پیشنهادات سیستم"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>بررسی فاکتورها</span>
                      </button>

                      {isAdmin && u.status === 'pending' && (
                        <button
                          onClick={() => handleApproveBatch(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
                        >
                          تایید دسته
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
