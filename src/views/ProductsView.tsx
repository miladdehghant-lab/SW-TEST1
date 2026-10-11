import React, { useState, useMemo } from 'react';
import { AppState, User, ProductCatalogItem, Planogram, PlanogramSlot } from '../types';
import { num, uid, SIMPLE_BRANDS, fmtDate } from '../utils/formatters';
import {
  guessSubCategory,
  guessPackVariant,
  extractAndSyncProductsFromSales,
  getProductPlaceholderImage,
  evaluatePlanogramCompliance,
} from '../utils/productPlanogramEngine';
import { guessBrandFromText } from '../utils/excelParser';
import {
  Package,
  Layers,
  Sparkles,
  Search,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Upload,
  RefreshCw,
  Eye,
  Sliders,
  Award,
  CheckCircle2,
  Grid,
  Info,
  HelpCircle,
} from 'lucide-react';

interface ProductsViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onUpdateState,
  onShowToast,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'catalog' | 'planogram' | 'audit_simulation'>('catalog');

  // Products state
  const products = state.products || [];
  const planograms = state.planograms || [];

  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedPackVariantFilter, setSelectedPackVariantFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Editing / Creating product
  const [editingProduct, setEditingProduct] = useState<ProductCatalogItem | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodBrand, setProdBrand] = useState('تست');
  const [prodSubCategory, setProdSubCategory] = useState('مایع لباسشویی');
  const [prodPackVariant, setProdPackVariant] = useState('');
  const [prodPackaging, setProdPackaging] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodPoints, setProdPoints] = useState('20');

  // Planogram state
  const [selectedPlanogramId, setSelectedPlanogramId] = useState<string>(
    planograms.length > 0 ? planograms[0].id : ''
  );
  const [isEditingPlanogram, setIsEditingPlanogram] = useState(false);
  const [selectedShelfSlot, setSelectedShelfSlot] = useState<{ shelfIndex: number; colIndex: number } | null>(null);
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);

  // New Planogram creation modal
  const [showNewPlgModal, setShowNewPlgModal] = useState(false);
  const [plgTitle, setPlgTitle] = useState('');
  const [plgBrand, setPlgBrand] = useState('تست');
  const [plgShelves, setPlgShelves] = useState('3');
  const [plgCols, setPlgCols] = useState('4');
  const [plgBonus, setPlgBonus] = useState('60');
  const [plgMinScore, setPlgMinScore] = useState('75');

  // Simulation state for planogram visual inspection & scoring
  const [simSelectedActivityId, setSimSelectedActivityId] = useState<string>('');
  const [simCustomPhoto, setSimCustomPhoto] = useState<string | null>(null);
  const [simCustomAfterPhoto, setSimCustomAfterPhoto] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<ReturnType<typeof evaluatePlanogramCompliance> | null>(null);

  // Strictly only Main Admin can create, edit, or delete products and planograms
  const canManage = Boolean(isAdmin);

  // Subcategories derived dynamically
  const availableSubCategories = useMemo(() => {
    const list = new Set<string>();
    products.forEach(p => {
      if (selectedBrand === 'all' || p.brand === selectedBrand) {
        if (p.subCategory) list.add(p.subCategory);
      }
    });
    return Array.from(list);
  }, [products, selectedBrand]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;
      if (selectedSubCategory !== 'all' && p.subCategory !== selectedSubCategory) return false;
      if (selectedPackVariantFilter !== 'all') {
        const v = (p.packVariant || '') + ' ' + p.name;
        if (selectedPackVariantFilter === 'twin' && !v.includes('توئین') && !v.includes('دوقلو')) return false;
        if (selectedPackVariantFilter === 'normal' && !v.includes('نرمال') && !v.includes('معمولی') && !v.includes('تک')) return false;
        if (selectedPackVariantFilter === 'mega' && !v.includes('مگا') && !v.includes('جامبو')) return false;
        if (selectedPackVariantFilter === 'economy' && !v.includes('اکونومی') && !v.includes('اقتصادی')) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchBrand = p.brand.toLowerCase().includes(q);
        const matchSub = p.subCategory?.toLowerCase().includes(q);
        const matchVar = p.packVariant?.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBrand && !matchSub && !matchVar) return false;
      }
      return true;
    });
  }, [products, selectedBrand, selectedSubCategory, selectedPackVariantFilter, search]);

  // Auto-sync products from sales records!
  const handleAutoDetectFromSales = () => {
    const allSales = [...state.sales];
    state.uploads.forEach(u => {
      if (u.rows) allSales.push(...u.rows);
    });

    const { updatedProducts, newlyDetectedCount } = extractAndSyncProductsFromSales(allSales, products);

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'products.auto_detected_from_sales',
        details: { count: newlyDetectedCount, total: updatedProducts.length },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      products: updatedProducts,
      audit: newAudit,
    });

    if (newlyDetectedCount > 0) {
      onShowToast(`تعداد ${num(newlyDetectedCount)} قلم کالای جدید از دیتای فروش شناسایی و به شناسنامه کالاها افزوده شد! ✨`);
    } else {
      onShowToast('تمامی کدهای کالا و اقلام موجود در دیتای فروش قبلاً در سیستم شناسایی شده‌اند.');
    }
  };

  // Open modal for editing or new product
  const handleOpenEditProduct = (p?: ProductCatalogItem) => {
    if (p) {
      setEditingProduct(p);
      setIsNewProduct(false);
      setProdName(p.name);
      setProdSku(p.sku);
      setProdBrand(p.brand);
      setProdSubCategory(p.subCategory || 'عمومی');
      setProdPackVariant(p.packVariant || guessPackVariant(p.name, p.brand));
      setProdPackaging(p.packaging || '');
      setProdBarcode(p.barcode || '');
      setProdImageUrl(p.imageUrl || '');
      setProdPoints(String(p.pointsForPlacement || 20));
    } else {
      setEditingProduct({
        id: uid('prod'),
        sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        brand: 'مولفیکس',
        subCategory: 'پوشک کامل کودک',
        packVariant: 'توئین پک (Twin Pack)',
        source: 'manual',
        createdAt: new Date().toISOString(),
      });
      setIsNewProduct(true);
      setProdName('');
      setProdSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setProdBrand('مولفیکس');
      setProdSubCategory('پوشک کامل کودک');
      setProdPackVariant('توئین پک (Twin Pack)');
      setProdPackaging('کارتن فروش');
      setProdBarcode('');
      setProdImageUrl('');
      setProdPoints('25');
    }
  };

  // Save product changes
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const brand = prodBrand.trim() || 'تست';
    const subCat = prodSubCategory.trim() || guessSubCategory(prodName, brand);
    const pVariant = prodPackVariant.trim() || guessPackVariant(prodName, brand);
    const imgUrl = prodImageUrl.trim() || getProductPlaceholderImage(brand, subCat, prodName);

    const updatedItem: ProductCatalogItem = {
      ...editingProduct,
      name: prodName.trim(),
      sku: prodSku.trim(),
      brand: brand,
      subCategory: subCat,
      packVariant: pVariant,
      packaging: prodPackaging.trim() || undefined,
      barcode: prodBarcode.trim() || undefined,
      imageUrl: imgUrl,
      pointsForPlacement: Number(prodPoints) || 20,
      updatedAt: new Date().toISOString(),
    };

    let updatedList: ProductCatalogItem[];
    if (isNewProduct) {
      updatedList = [updatedItem, ...products];
    } else {
      updatedList = products.map(p => (p.id === updatedItem.id ? updatedItem : p));
    }

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: isNewProduct ? 'product.created' : 'product.updated',
        details: { id: updatedItem.id, sku: updatedItem.sku, name: updatedItem.name },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      products: updatedList,
      audit: newAudit,
    });

    onShowToast(`مشخصات کالای «${updatedItem.name}» با موفقیت ذخیره شد.`);
    setEditingProduct(null);
  };

  // Delete product
  const handleDeleteProduct = (productId: string) => {
    const item = products.find(p => p.id === productId);
    if (!window.confirm(`آیا از حذف کالای «${item?.name || productId}» از شناسنامه کالاها اطمینان دارید؟`)) {
      return;
    }

    const updatedList = products.filter(p => p.id !== productId);
    onUpdateState({
      ...state,
      products: updatedList,
      audit: [
        {
          id: uid('log'),
          at: new Date().toISOString(),
          by: currentUser?.id || 'usr_admin',
          action: 'product.deleted',
          details: { id: productId, name: item?.name },
        },
        ...state.audit,
      ],
    });
    onShowToast('کالای مورد نظر از کاتالوگ حذف گردید.');
  };

  // Handle image upload from file
  const handleUploadImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProdImageUrl(reader.result);
        onShowToast('عکس بسته محصول با موفقیت انتخاب شد.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Selected active planogram
  const activePlanogram = planograms.find(p => p.id === selectedPlanogramId) || planograms[0];

  // Assign product to planogram slot
  const handleAssignProductToSlot = (productId?: string) => {
    if (!activePlanogram || !selectedShelfSlot) return;

    const { shelfIndex, colIndex } = selectedShelfSlot;
    const existingSlotIndex = activePlanogram.slots.findIndex(
      s => s.shelfIndex === shelfIndex && s.colIndex === colIndex
    );

    let updatedSlots: PlanogramSlot[];
    if (existingSlotIndex >= 0) {
      if (!productId) {
        // Remove from slot
        updatedSlots = activePlanogram.slots.filter(
          s => !(s.shelfIndex === shelfIndex && s.colIndex === colIndex)
        );
      } else {
        updatedSlots = activePlanogram.slots.map((s, idx) =>
          idx === existingSlotIndex ? { ...s, productId, facingCount: 2 } : s
        );
      }
    } else {
      if (productId) {
        updatedSlots = [
          ...activePlanogram.slots,
          {
            id: uid('slot'),
            shelfIndex,
            colIndex,
            productId,
            facingCount: 2,
          },
        ];
      } else {
        updatedSlots = activePlanogram.slots;
      }
    }

    const updatedPlg: Planogram = {
      ...activePlanogram,
      slots: updatedSlots,
      updatedAt: new Date().toISOString(),
    };

    const updatedPlanograms = planograms.map(p => (p.id === updatedPlg.id ? updatedPlg : p));

    onUpdateState({
      ...state,
      planograms: updatedPlanograms,
    });

    setSelectedShelfSlot(null);
    onShowToast('چیدمان قفسه در پلنوگرام به‌روزرسانی شد.');
  };

  // Direct slot assignment for Drag & Drop
  const handleAssignProductToSlotDirect = (shelfIndex: number, colIndex: number, productId?: string) => {
    if (!activePlanogram) return;

    const existingSlotIndex = activePlanogram.slots.findIndex(
      s => s.shelfIndex === shelfIndex && s.colIndex === colIndex
    );

    let updatedSlots: PlanogramSlot[];
    if (existingSlotIndex >= 0) {
      if (!productId) {
        updatedSlots = activePlanogram.slots.filter(
          s => !(s.shelfIndex === shelfIndex && s.colIndex === colIndex)
        );
      } else {
        updatedSlots = activePlanogram.slots.map((s, idx) =>
          idx === existingSlotIndex ? { ...s, productId, facingCount: 2 } : s
        );
      }
    } else {
      if (productId) {
        updatedSlots = [
          ...activePlanogram.slots,
          {
            id: uid('slot'),
            shelfIndex,
            colIndex,
            productId,
            facingCount: 2,
          },
        ];
      } else {
        updatedSlots = activePlanogram.slots;
      }
    }

    const updatedPlg: Planogram = {
      ...activePlanogram,
      slots: updatedSlots,
      updatedAt: new Date().toISOString(),
    };

    onUpdateState({
      ...state,
      planograms: planograms.map(p => (p.id === updatedPlg.id ? updatedPlg : p)),
    });

    const prd = products.find(p => p.id === productId);
    onShowToast(`کالای «${prd?.name || 'انتخاب‌شده'}» در طبقه ${shelfIndex + 1}، خانه ${colIndex + 1} قرار گرفت. 🎯`);
  };

  // Create new Planogram
  const handleCreatePlanogram = (e: React.FormEvent) => {
    e.preventDefault();
    const newPlg: Planogram = {
      id: uid('plg'),
      title: plgTitle.trim() || `پلنوگرام جدید برند ${plgBrand}`,
      brand: plgBrand,
      shelvesCount: Math.max(1, Math.min(6, Number(plgShelves) || 3)),
      colsPerShelf: Math.max(1, Math.min(8, Number(plgCols) || 4)),
      bonusPoints: Number(plgBonus) || 60,
      minComplianceScore: Number(plgMinScore) || 75,
      slots: [],
      createdAt: new Date().toISOString(),
    };

    const updatedPlanograms = [newPlg, ...planograms];
    onUpdateState({
      ...state,
      planograms: updatedPlanograms,
    });

    setSelectedPlanogramId(newPlg.id);
    setShowNewPlgModal(false);
    onShowToast(`پلنوگرام جدید «${newPlg.title}» ایجاد شد. اکنون می‌توانید قفسه‌ها را با کالاها بچینید!`);
  };

  // Run Planogram Comparison & Scoring Simulation
  const handleRunEvaluation = () => {
    if (!activePlanogram) return;

    let photoUrl = simCustomPhoto;
    let photoAfterUrl = simCustomAfterPhoto;

    if (simSelectedActivityId) {
      const act = state.activities.find(a => a.id === simSelectedActivityId);
      if (act) {
        photoUrl = act.photo || null;
        photoAfterUrl = act.photoAfter || null;
      }
    }

    const res = evaluatePlanogramCompliance(activePlanogram, products, {
      photoUrl: photoUrl || undefined,
      photoAfterUrl: photoAfterUrl || undefined,
    });

    setEvaluationResult(res);
    onShowToast(`ارزیابی چیدمان با موفقیت انجام شد: ${res.grade} (${res.compliancePercentage}٪ تطابق)`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Overview Header */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#132338] to-slate-900 border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400">سیستم مدیریت ماتریس کالاها و استانداردهای چیدمان</span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300">پارس حیات (تست، مولفیکس، تنو، پاپیا، مولپد، ببم)</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <span>شناسنامه کالاها، تفکیک برند و پلنوگرام اصولی قفسه‌ها</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
            شناسایی خودکار کدها و اقلام کالا از فایل‌های روزانه کارآمد سیستم، تفکیک هوشمند بر اساس برند و زیرگروه (مایع لباس، نرم‌کننده، پوشک، دستمال و...)، تعریف قفسه مرجع (پلنوگرام اصولی) توسط مدیر و تطبیق هوشمند شواهد تصویری ویزیتورها جهت امتیازدهی چیدمان.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canManage ? (
            <>
              <button
                onClick={handleAutoDetectFromSales}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all"
                title="همگام‌سازی و خواندن خودکار کالاها از دیتای فروش روزانه"
              >
                <RefreshCw className="w-4 h-4" />
                <span>شناسایی خودکار از دیتای فروش</span>
              </button>

              <button
                onClick={() => handleOpenEditProduct()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن دستی کالا</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#142337] border border-[#233852] text-xs text-slate-300">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>حالت مشاهده شناسنامه و پلنوگرام (ویرایش فقط توسط مدیر اصلی)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-[#283a53] gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveMainTab('catalog')}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeMainTab === 'catalog'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>شناسنامه و کاتالوگ کالاها ({num(products.length)})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('planogram')}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeMainTab === 'planogram'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>طراحی و قفسه‌بندی پلنوگرام اصولی ({num(planograms.length)})</span>
        </button>

        <button
          onClick={() => setActiveMainTab('audit_simulation')}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeMainTab === 'audit_simulation'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>ارزیابی تطابق چیدمان با پلنوگرام و امتیازدهی هوشمند</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCT CATALOG & BRAND SUB-CATEGORIES                             */}
      {/* ========================================================================= */}
      {activeMainTab === 'catalog' && (
        <div className="space-y-4">
          {/* Brand & Subcategory Filter Bar */}
          <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-4 flex flex-col gap-3">
            {/* Brands row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 ml-1 font-medium">تفکیک برند:</span>
                <button
                  onClick={() => {
                    setSelectedBrand('all');
                    setSelectedSubCategory('all');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-colors ${
                    selectedBrand === 'all'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#18263a] text-slate-300 hover:text-white'
                  }`}
                >
                  همه برندها ({num(products.length)})
                </button>

                {SIMPLE_BRANDS.map(b => {
                  const count = products.filter(p => p.brand === b).length;
                  return (
                    <button
                      key={b}
                      onClick={() => {
                        setSelectedBrand(b);
                        setSelectedSubCategory('all');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 ${
                        selectedBrand === b
                          ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25'
                          : 'bg-[#18263a] text-slate-300 hover:text-white'
                      }`}
                    >
                      <span>{b}</span>
                      <span className="text-[10px] opacity-75 tabular-nums">({num(count)})</span>
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="جستجوی نام کالا، کد SKU، زیرگروه..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 text-xs bg-[#0c1727] border border-[#283a53] rounded-xl text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sub-categories pill row */}
            {availableSubCategories.length > 0 && (
              <div className="pt-2 border-t border-[#1c2e47] flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-slate-400 ml-1 font-medium text-[11px]">زیرگروه‌ها:</span>
                <button
                  onClick={() => setSelectedSubCategory('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                    selectedSubCategory === 'all'
                      ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  همه زیرگروه‌ها
                </button>

                {availableSubCategories.map(sub => {
                  const subCount = products.filter(
                    p => (selectedBrand === 'all' || p.brand === selectedBrand) && p.subCategory === sub
                  ).length;
                  return (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubCategory(sub)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1 ${
                        selectedSubCategory === sub
                          ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 font-bold'
                          : 'bg-[#142337] text-slate-300 hover:text-white border border-[#233852]'
                      }`}
                    >
                      <span>{sub}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">({num(subCount)})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pack Variant / Model filter row */}
            <div className="pt-2 border-t border-[#1c2e47] flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-slate-400 ml-1 font-medium text-[11px]">تفکیک مدل و بسته (مانند توئین / نرمال):</span>
              <button
                onClick={() => setSelectedPackVariantFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                  selectedPackVariantFilter === 'all'
                    ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/50 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                همه مدل‌ها
              </button>
              <button
                onClick={() => setSelectedPackVariantFilter('twin')}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1 ${
                  selectedPackVariantFilter === 'twin'
                    ? 'bg-purple-600 text-white font-bold shadow-sm'
                    : 'bg-[#142337] text-slate-300 hover:text-white border border-[#233852]'
                }`}
              >
                <span>توئین پک (Twin Pack / دوقلو)</span>
              </button>
              <button
                onClick={() => setSelectedPackVariantFilter('normal')}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1 ${
                  selectedPackVariantFilter === 'normal'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-[#142337] text-slate-300 hover:text-white border border-[#233852]'
                }`}
              >
                <span>نرمال پک (Normal Pack / تکی)</span>
              </button>
              <button
                onClick={() => setSelectedPackVariantFilter('mega')}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1 ${
                  selectedPackVariantFilter === 'mega'
                    ? 'bg-amber-600 text-white font-bold shadow-sm'
                    : 'bg-[#142337] text-slate-300 hover:text-white border border-[#233852]'
                }`}
              >
                <span>مگا / جامبو پک</span>
              </button>
              <button
                onClick={() => setSelectedPackVariantFilter('economy')}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1 ${
                  selectedPackVariantFilter === 'economy'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'bg-[#142337] text-slate-300 hover:text-white border border-[#233852]'
                }`}
              >
                <span>اکونومی (اقتصادی)</span>
              </button>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                className="bg-[#121e30] border border-[#283a53] rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/50 transition-all shadow-md group relative overflow-hidden"
              >
                {/* Brand color badge & Pack variant badge */}
                <div className="flex items-center justify-between mb-3 gap-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {p.brand}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                      {p.subCategory || 'عمومی'}
                    </span>
                    {p.packVariant && (
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        {p.packVariant}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono bg-[#0c1727] px-1.5 py-0.5 rounded border border-[#1e2f47] shrink-0">
                    {p.sku}
                  </span>
                </div>

                {/* Product Image / Pack representation */}
                <div className="relative aspect-square max-h-40 rounded-xl bg-[#09121f] border border-[#1e3049] flex items-center justify-center overflow-hidden mb-3 p-2 group-hover:scale-102 transition-transform">
                  <img
                    src={p.imageUrl || getProductPlaceholderImage(p.brand, p.subCategory, p.name)}
                    alt={p.name}
                    className="max-h-full max-w-full object-contain drop-shadow-md rounded-lg"
                  />
                  {p.source === 'auto_detected' && (
                    <span className="absolute bottom-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      از اکسل
                    </span>
                  )}
                </div>

                {/* Product Title & Info */}
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-xs font-bold text-white leading-snug line-clamp-2" title={p.name}>
                    {p.name}
                  </h4>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>بسته‌بندی:</span>
                    <span className="text-slate-300">{p.packaging || 'کارتن کارآمد'}</span>
                  </div>

                  {p.barcode && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>بارکد:</span>
                      <span className="font-mono text-slate-400">{p.barcode}</span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-[#1a2b42]">
                    <span>امتیاز چیدمان:</span>
                    <span className="font-bold text-amber-300 tabular-nums">+{num(p.pointsForPlacement || 20)} امتیاز</span>
                  </div>
                </div>

                {/* Card Actions */}
                {canManage && (
                  <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-[#1c2e47]">
                    <button
                      onClick={() => handleOpenEditProduct(p)}
                      className="flex-1 py-1.5 rounded-lg bg-[#1f324d] hover:bg-[#284266] text-slate-200 text-xs font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>ویرایش</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 rounded-lg bg-[#1f324d] hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 transition-colors"
                      title="حذف کالا"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-12 text-center text-slate-400 bg-[#121e30] border border-[#283a53] rounded-2xl">
              <Package className="w-10 h-10 text-slate-500 mx-auto mb-2 opacity-60" />
              <div className="text-sm font-bold text-white mb-1">هیچ کالایی با فیلترهای انتخابی یافت نشد</div>
              <p className="text-xs text-slate-400 mb-4">
                می‌توانید با زدن دکمه «شناسایی خودکار از دیتای فروش»، کالاها را مستقیماً از اکسل بارگذاری شده اضافه کنید.
              </p>
              <button
                onClick={handleAutoDetectFromSales}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>شناسایی خودکار از فروش‌ها</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PLANOGRAM DESIGNER & GOLDEN SHELVES                                */}
      {/* ========================================================================= */}
      {activeMainTab === 'planogram' && (
        <div className="space-y-4">
          {/* Planogram Selector & Toolbar */}
          <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">انتخاب پلنوگرام اصولی:</span>
              <select
                value={activePlanogram?.id}
                onChange={e => setSelectedPlanogramId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white text-xs outline-none focus:border-cyan-500 font-bold"
              >
                {planograms.map(plg => (
                  <option key={plg.id} value={plg.id}>
                    {plg.title} ({plg.brand} - {plg.shelvesCount} طبقه)
                  </option>
                ))}
              </select>

              <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                پاداش چیدمان: +{num(activePlanogram?.bonusPoints || 60)} امتیاز
              </span>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewPlgModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>تعریف پلنوگرام جدید</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Planogram Visual Shelf Representation */}
          {activePlanogram && (
            <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#283a53] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Grid className="w-4 h-4 text-cyan-400" />
                    <span>{activePlanogram.title}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activePlanogram.description || 'الگوی چیدمان قفسه بر اساس اولویت دید مشتری (Eye-Level) و رخ کالاهای استراتژیک'}
                  </p>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span>ابعاد قفسه: <strong className="text-white">{activePlanogram.shelvesCount} طبقه × {activePlanogram.colsPerShelf} ردیف</strong></span>
                  <span>حداقل درصد قبولی: <strong className="text-emerald-400">{activePlanogram.minComplianceScore || 75}٪</strong></span>
                </div>
              </div>

              {/* Physical Shelf Frame (قفسه فیزیکی فروشگاه) */}
              <div className="p-4 bg-[#0a111e] border-2 border-[#20344d] rounded-2xl shadow-inner space-y-3">
                {Array.from({ length: activePlanogram.shelvesCount }).map((_, shelfIdx) => {
                  const isEyeLevel = shelfIdx === 1; // Middle shelf is typically eye-level golden shelf
                  return (
                    <div key={shelfIdx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                        <span className="font-semibold flex items-center gap-1.5">
                          <span>طبقه {shelfIdx + 1} {shelfIdx === 0 ? '(بالا)' : shelfIdx === activePlanogram.shelvesCount - 1 ? '(پایین)' : '(میانی)'}</span>
                          {isEyeLevel && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                              شلف طلایی (دید مستقیم مشتری)
                            </span>
                          )}
                        </span>
                        <span className="text-slate-500 text-[10px]">{activePlanogram.colsPerShelf} جایگاه محصول</span>
                      </div>

                      {/* Shelf Slots */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2.5 p-2.5 rounded-xl bg-[#0f1b2b] border border-[#1d2f47]">
                        {Array.from({ length: activePlanogram.colsPerShelf }).map((_, colIdx) => {
                          const slot = activePlanogram.slots.find(
                            s => s.shelfIndex === shelfIdx && s.colIndex === colIdx
                          );
                          const product = slot?.productId ? products.find(p => p.id === slot.productId) : null;
                          const isSelected = selectedShelfSlot?.shelfIndex === shelfIdx && selectedShelfSlot?.colIndex === colIdx;

                          return (
                            <div
                              key={colIdx}
                              onClick={() => {
                                if (canManage) {
                                  setSelectedShelfSlot({ shelfIndex: shelfIdx, colIndex: colIdx });
                                }
                              }}
                              onDragOver={e => {
                                if (canManage) {
                                  e.preventDefault();
                                }
                              }}
                              onDrop={e => {
                                if (canManage) {
                                  e.preventDefault();
                                  const pid = e.dataTransfer.getData('text/plain') || draggedProductId;
                                  if (pid) {
                                    handleAssignProductToSlotDirect(shelfIdx, colIdx, pid);
                                  }
                                }
                              }}
                              className={`aspect-[4/5] rounded-xl border-2 transition-all p-2 flex flex-col items-center justify-between cursor-pointer relative ${
                                isSelected
                                  ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/20'
                                  : product
                                  ? 'border-blue-500/40 bg-[#142337] hover:border-blue-400'
                                  : 'border-dashed border-[#233852] bg-[#0c1624] hover:border-cyan-500/60'
                              }`}
                              title={canManage ? 'کلیک برای انتخاب کالا یا کالا را مستقیماً از پالت بکشید و اینجا رها کنید (Drag & Drop)' : undefined}
                            >
                              {product ? (
                                <>
                                  <div className="w-full flex items-center justify-between text-[10px]">
                                    <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">
                                      {product.brand}
                                    </span>
                                    <span className="text-slate-400 font-mono text-[9px]">{slot?.facingCount || 2} رخ</span>
                                  </div>

                                  <div className="flex-1 w-full flex items-center justify-center p-1">
                                    <img
                                      src={product.imageUrl || getProductPlaceholderImage(product.brand, product.subCategory, product.name)}
                                      alt={product.name}
                                      className="max-h-24 max-w-full object-contain drop-shadow"
                                    />
                                  </div>

                                  <div className="w-full text-center">
                                    <div className="text-[10px] font-bold text-white line-clamp-1" title={product.name}>
                                      {product.name}
                                    </div>
                                    <div className="text-[9px] text-cyan-300 line-clamp-1">
                                      {product.subCategory}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center gap-1">
                                  <Plus className="w-4 h-4 opacity-50" />
                                  <span className="text-[10px]">جایگاه خالی</span>
                                  {canManage && <span className="text-[8px] text-cyan-400">کلیک برای انتخاب کالا</span>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Physical Shelf Wood/Metal Plank */}
                      <div className="h-2 rounded-full bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700 shadow-md"></div>
                    </div>
                  );
                })}
              </div>

              {/* Drag and Drop Product Palette for Manager */}
              {canManage && (
                <div className="p-4 rounded-2xl bg-[#0c1626] border border-[#20344d] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white">پالت کالاها جهت چیدمان (کشیدن و رها کردن - Drag & Drop یا کلیک):</h4>
                    </div>
                    <span className="text-[11px] text-slate-400">کالا را با ماوس کشیده و روی خانه قفسه رها کنید</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 p-1 max-h-52 overflow-y-auto">
                    {products
                      .filter(p => !activePlanogram.brand || p.brand === activePlanogram.brand || activePlanogram.brand === 'عمومی')
                      .map(p => (
                        <div
                          key={p.id}
                          draggable={canManage}
                          onDragStart={e => {
                            e.dataTransfer.setData('text/plain', p.id);
                            setDraggedProductId(p.id);
                          }}
                          onClick={() => {
                            if (selectedShelfSlot) {
                              handleAssignProductToSlotDirect(selectedShelfSlot.shelfIndex, selectedShelfSlot.colIndex, p.id);
                              setSelectedShelfSlot(null);
                            }
                          }}
                          className="p-2 rounded-xl bg-[#142337] border border-[#233852] hover:border-cyan-400 cursor-grab active:cursor-grabbing flex flex-col items-center justify-between text-center gap-1 transition-all hover:scale-102 select-none group"
                          title="برای چیدمان، بکشید و رها کنید (Drag & Drop) یا ابتدا روی یک خانه قفسه کلیک کرده سپس روی این کالا بزنید"
                        >
                          <div className="text-[9px] text-cyan-300 font-bold line-clamp-1">{p.brand}</div>
                          <img
                            src={p.imageUrl || getProductPlaceholderImage(p.brand, p.subCategory, p.name)}
                            alt={p.name}
                            className="h-12 w-12 object-contain drop-shadow"
                          />
                          <div className="text-[9px] font-bold text-white line-clamp-1" title={p.name}>{p.name}</div>
                          {p.packVariant && (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold line-clamp-1">
                              {p.packVariant}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Slot Assignment Drawer/Picker */}
              {selectedShelfSlot && (
                <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/50 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-cyan-800/40 pb-2">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-cyan-400" />
                      <span>انتخاب کالای جایگاه: طبقه {selectedShelfSlot.shelfIndex + 1}، خانه {selectedShelfSlot.colIndex + 1}</span>
                    </div>
                    <button
                      onClick={() => setSelectedShelfSlot(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    برای قرار دادن کالا در این قفسه از بین کالاهای شناسایی‌شده زیر یکی را انتخاب کنید:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
                    <button
                      onClick={() => handleAssignProductToSlot(undefined)}
                      className="p-2 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold hover:bg-rose-900/60 transition-colors"
                    >
                      خالی کردن این جایگاه
                    </button>

                    {products
                      .filter(p => !activePlanogram.brand || p.brand === activePlanogram.brand || activePlanogram.brand === 'عمومی')
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleAssignProductToSlot(p.id)}
                          className="p-2 rounded-lg bg-[#142337] border border-[#233852] hover:border-cyan-400 cursor-pointer flex flex-col items-center justify-between gap-1 text-center"
                        >
                          <img
                            src={p.imageUrl || getProductPlaceholderImage(p.brand, p.subCategory, p.name)}
                            alt={p.name}
                            className="h-12 object-contain"
                          />
                          <div className="text-[10px] font-bold text-white line-clamp-1">{p.name}</div>
                          <div className="text-[9px] text-cyan-300">{p.subCategory}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PLANOGRAM SIMULATION & COMPARISON ENGINE                           */}
      {/* ========================================================================= */}
      {activeMainTab === 'audit_simulation' && (
        <div className="space-y-4">
          <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>موتور مقایسه هوشمند چیدمان میدانی با پلنوگرام اصولی مدیر و اعطای امتیاز</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                سیستم با مقایسه عکس‌های ارسالی ویزیتورها (قبل و بعد از چیدمان) با پلنوگرام مرجع تعریف‌شده، درصد تشابه، حضور اقلام استراتژیک و رعایت شلف طلایی را سنجیده و امتیاز مربوطه را به صورت خودکار یا پس از بازبینی سرپرست منظور می‌کند.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Step 1: Reference Planogram */}
              <div className="p-4 rounded-xl bg-[#0c1626] border border-[#20344d] space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-300 flex items-center justify-center text-[10px]">۱</span>
                  <span>پلنوگرام مرجع مبنای سنجش:</span>
                </h4>

                <select
                  value={activePlanogram?.id}
                  onChange={e => setSelectedPlanogramId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#142337] border border-[#283a53] text-white text-xs outline-none focus:border-cyan-500 font-bold"
                >
                  {planograms.map(plg => (
                    <option key={plg.id} value={plg.id}>
                      {plg.title} ({plg.brand} - {plg.shelvesCount} طبقه)
                    </option>
                  ))}
                </select>

                <div className="text-[11px] text-slate-300 space-y-1">
                  <div>برند هدف: <strong className="text-white">{activePlanogram?.brand}</strong></div>
                  <div>تعداد جایگاه‌های تعریف‌شده: <strong className="text-white">{activePlanogram?.slots.length} کالا</strong></div>
                  <div>پاداش تکمیل موفق: <strong className="text-amber-300">+{activePlanogram?.bonusPoints} امتیاز</strong></div>
                </div>
              </div>

              {/* Step 2: Evidence to Compare */}
              <div className="p-4 rounded-xl bg-[#0c1626] border border-[#20344d] space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-[10px]">۲</span>
                  <span>انتخاب اقدام میدانی یا آپلود عکس چیدمان:</span>
                </h4>

                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">انتخاب از فعالیت‌های ثبت‌شده ویزیتورها:</label>
                  <select
                    value={simSelectedActivityId}
                    onChange={e => setSimSelectedActivityId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#142337] border border-[#283a53] text-white text-xs outline-none focus:border-purple-500"
                  >
                    <option value="">(انتخاب اقدام میدانی...)</option>
                    {state.activities
                      .filter(a => a.type === 'merch' || a.photo || a.photoAfter)
                      .map(a => {
                        const store = state.stores.find(s => s.id === a.storeId);
                        const user = state.users.find(u => u.id === a.ownerId);
                        return (
                          <option key={a.id} value={a.id}>
                            {store?.name || 'فروشگاه'} · {user?.firstName} {user?.lastName} ({fmtDate(a.createdAt)})
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="text-[11px] text-slate-400">
                  یا بارگذاری مستقیم عکس قبل/بعد جهت تست مقایسه:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="p-2 rounded-lg bg-[#142337] border border-[#233852] text-center text-[11px] text-slate-300 hover:text-white cursor-pointer block">
                    <Upload className="w-3.5 h-3.5 mx-auto mb-1 text-slate-400" />
                    <span>{simCustomPhoto ? 'عکس قبل انتخاب شد' : 'عکس قبل (ورود)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = () => setSimCustomPhoto(r.result as string);
                          r.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>

                  <label className="p-2 rounded-lg bg-[#142337] border border-[#233852] text-center text-[11px] text-slate-300 hover:text-white cursor-pointer block">
                    <Upload className="w-3.5 h-3.5 mx-auto mb-1 text-slate-400" />
                    <span>{simCustomAfterPhoto ? 'عکس بعد انتخاب شد' : 'عکس بعد (چیدمان)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = () => setSimCustomAfterPhoto(r.result as string);
                          r.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleRunEvaluation}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-purple-600/30 flex items-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>اجرای تطبیق هوشمند و محاسبه درصد تشابه با پلنوگرام اصولی</span>
              </button>
            </div>

            {/* Evaluation Result Panel */}
            {evaluationResult && (
              <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#131f33] to-[#0c1626] border border-purple-500/40 space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-800/30 pb-3">
                  <div>
                    <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">نتیجه اعتبارسنجی چیدمان:</span>
                    <h4 className="text-base font-extrabold text-white flex items-center gap-2 mt-0.5">
                      <span>رتبه چیدمان: {evaluationResult.grade}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/20 text-purple-200 border border-purple-400/40">
                        {evaluationResult.compliancePercentage}٪ تشابه
                      </span>
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">امتیاز استحقاقی:</div>
                      <div className="text-lg font-black text-amber-300 tabular-nums">
                        +{num(evaluationResult.scoreAwarded)} امتیاز
                      </div>
                    </div>

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      evaluationResult.passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}>
                      {evaluationResult.passed ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                    </div>
                  </div>
                </div>

                {/* Feedback points */}
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="font-semibold text-white">بازخورد تطابق هوشمند:</div>
                  {evaluationResult.feedback.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-300">
                      <span className="text-purple-400">•</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {/* Matched product list */}
                {evaluationResult.matchedProducts.length > 0 && (
                  <div className="pt-2 border-t border-purple-900/30">
                    <div className="text-xs font-semibold text-slate-300 mb-2">وضعیت حضور کالاهای تعریف‌شده در پلنوگرام:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {evaluationResult.matchedProducts.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                            item.status === 'present'
                              ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                              : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                          }`}
                        >
                          <span className="line-clamp-1">{item.name}</span>
                          <span className="text-[10px] font-bold shrink-0">
                            {item.status === 'present' ? 'حضور دارد' : 'غایب'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / CREATE PRODUCT                                              */}
      {/* ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121e30] border border-blue-500/40 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#283a53] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <span>{isNewProduct ? 'افزودن کالای جدید به شناسنامه' : 'ویرایش مشخصات کالا'}</span>
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">نام کامل محصول *</label>
                <input
                  required
                  value={prodName}
                  onChange={e => setProdName(e.target.value)}
                  placeholder="مثال: مایع لباسشویی جنرال تست ۳ لیتری"
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">کد کالا / SKU *</label>
                  <input
                    required
                    value={prodSku}
                    onChange={e => setProdSku(e.target.value)}
                    placeholder="مثال: TST-LIQ-3L"
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">برند *</label>
                  <select
                    value={prodBrand}
                    onChange={e => {
                      setProdBrand(e.target.value);
                      setProdSubCategory(guessSubCategory(prodName, e.target.value));
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-bold"
                  >
                    {SIMPLE_BRANDS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="سایر">سایر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">زیرگروه تخصصی کالا</label>
                  <input
                    value={prodSubCategory}
                    onChange={e => setProdSubCategory(e.target.value)}
                    placeholder="مثال: مایع لباسشویی، نرم‌کننده..."
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">نوع بسته‌بندی کارتن</label>
                  <input
                    value={prodPackaging}
                    onChange={e => setProdPackaging(e.target.value)}
                    placeholder="مثال: کارتن ۴ عددی (۳ لیتری)"
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Model / Pack Variant Selector (Molfix Twin vs Normal, etc.) */}
              <div className="p-2.5 rounded-xl bg-[#0c1727] border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-indigo-300 font-semibold text-[11px]">
                    مدل و نوع بسته (تفکیک توئین پک، نرمال پک، اکونومی و...) *
                  </label>
                  <span className="text-[10px] text-slate-400">تشخیص هوشمند / امکان ویرایش مدیر</span>
                </div>
                <input
                  value={prodPackVariant}
                  onChange={e => setProdPackVariant(e.target.value)}
                  placeholder="مثال: توئین پک (Twin Pack)، نرمال پک (Normal Pack)..."
                  className="w-full p-2 rounded-lg bg-[#142337] border border-[#283a53] text-white outline-none focus:border-indigo-500 font-medium"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">پیش‌فرض‌ها:</span>
                  {[
                    'توئین پک (Twin Pack)',
                    'نرمال پک (Normal Pack)',
                    'اکونومی پک (Economy)',
                    'مگا / جامبو پک (Mega)',
                    '۳ لیتری (گالن)',
                    'بسته ۴ قلو (۴ رول)',
                    'جعبه‌ای ۲۰۰ برگ',
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setProdPackVariant(preset)}
                      className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                        prodPackVariant === preset
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-[#1b2b40] text-slate-300 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">بارکد مصرف‌کننده (اختیاری)</label>
                  <input
                    value={prodBarcode}
                    onChange={e => setProdBarcode(e.target.value)}
                    placeholder="مثال: 6260123459001"
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">امتیاز چیدمان در شلف</label>
                  <input
                    type="number"
                    value={prodPoints}
                    onChange={e => setProdPoints(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="block text-slate-300 mb-1">عکس کالا / بسته محصول</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-[#0c1727] border border-[#283a53] flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={prodImageUrl || getProductPlaceholderImage(prodBrand, prodSubCategory, prodName || 'محصول')}
                      alt="پیش‌نمایش"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1e2f47] hover:bg-[#253d5e] text-slate-200 text-xs font-medium cursor-pointer border border-[#2e4769] transition-colors">
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                      <span>بارگذاری عکس از سیستم</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadImageFile}
                      />
                    </label>
                    <input
                      value={prodImageUrl}
                      onChange={e => setProdImageUrl(e.target.value)}
                      placeholder="یا وارد کردن آدرس اینترنتی عکس (URL)..."
                      className="w-full p-2 rounded-lg bg-[#0c1727] border border-[#283a53] text-slate-300 text-[11px] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1e2f47]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30"
                >
                  ذخیره اطلاعات کالا
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW PLANOGRAM                                               */}
      {/* ========================================================================= */}
      {showNewPlgModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121e30] border border-cyan-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#283a53] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Grid className="w-4 h-4 text-cyan-400" />
                <span>تعریف پلنوگرام اصولی قفسه</span>
              </h3>
              <button onClick={() => setShowNewPlgModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlanogram} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">عنوان پلنوگرام *</label>
                <input
                  required
                  value={plgTitle}
                  onChange={e => setPlgTitle(e.target.value)}
                  placeholder="مثال: پلنوگرام استاندارد قفسه شوینده تست (۳ طبقه)"
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">برند محوری *</label>
                <select
                  value={plgBrand}
                  onChange={e => setPlgBrand(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500 font-bold"
                >
                  {SIMPLE_BRANDS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="ترکیبی">ترکیبی (چند برندی)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">تعداد طبقات قفسه (عمودی)</label>
                  <select
                    value={plgShelves}
                    onChange={e => setPlgShelves(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500"
                  >
                    <option value="2">۲ طبقه</option>
                    <option value="3">۳ طبقه (استاندارد)</option>
                    <option value="4">۴ طبقه</option>
                    <option value="5">۵ طبقه</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">تعداد جایگاه در هر طبقه</label>
                  <select
                    value={plgCols}
                    onChange={e => setPlgCols(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500"
                  >
                    <option value="3">۳ کالا</option>
                    <option value="4">۴ کالا (پیش‌فرض)</option>
                    <option value="5">۵ کالا</option>
                    <option value="6">۶ کالا</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">پاداش امتیاز استاندارد</label>
                  <input
                    type="number"
                    value={plgBonus}
                    onChange={e => setPlgBonus(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">حداقل درصد تطابق (قبولی)</label>
                  <input
                    type="number"
                    value={plgMinScore}
                    onChange={e => setPlgMinScore(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1e2f47]">
                <button
                  type="button"
                  onClick={() => setShowNewPlgModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/30"
                >
                  ایجاد قفسه پلنوگرام
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
