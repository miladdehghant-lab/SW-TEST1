import React, { useState } from 'react';
import { Store, StorePotential, AppState, User } from '../types';
import { potentialInfo, norm, uid, fmtDate, num } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { exportToCSV } from '../utils/excelParser';
import {
  Plus,
  MapPin,
  Download,
  Search,
  CheckCircle,
  Navigation,
  Store as StoreIcon,
  AlertTriangle,
  Edit3,
  X,
  Sparkles,
  Phone,
  FileSpreadsheet,
} from 'lucide-react';

interface StoresViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
  onStartActivityForStore: (storeId: string) => void;
}

export const StoresView: React.FC<StoresViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onUpdateState,
  onShowToast,
  onStartActivityForStore,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'activated' | 'incomplete' | 'provisional'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // New store form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState(currentUser?.city || 'یزد');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [agency, setAgency] = useState(currentUser?.agency || 'یزد - منطقه ۱');
  const [potential, setPotential] = useState<StorePotential>('medium');
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null; accuracy: number | null }>({
    lat: null,
    lng: null,
    accuracy: null,
  });
  const [gpsLoading, setGpsLoading] = useState(false);

  // Complete Store Profile Modal state
  const [completingStore, setCompletingStore] = useState<Store | null>(null);
  const [compName, setCompName] = useState('');
  const [compContact, setCompContact] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compPotential, setCompPotential] = useState<StorePotential>('medium');
  const [compCoords, setCompCoords] = useState<{ lat: number | null; lng: number | null; accuracy: number | null }>({
    lat: null,
    lng: null,
    accuracy: null,
  });
  const [compGpsLoading, setCompGpsLoading] = useState(false);

  const canSeeStore = (s: Store) => {
    if (isAdmin) return true;
    if (currentUser?.role === 'seller') return s.ownerId === currentUser.id;
    if (currentUser?.role === 'supervisor') {
      const teamUserIds = new Set(state.users.filter(u => u.supervisorId === currentUser.id).map(u => u.id));
      return teamUserIds.has(s.ownerId) || s.ownerId === currentUser.id;
    }
    return s.agency === (currentUser?.agency || '');
  };

  const visibleStores = state.stores.filter(canSeeStore);

  const incompleteCount = visibleStores.filter(s => s.status === 'incomplete' || s.needsCompletion).length;
  const activatedCount = visibleStores.filter(s => s.status === 'activated').length;
  const provisionalCount = visibleStores.filter(s => s.status === 'provisional').length;

  const filteredStores = visibleStores.filter(s => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'incomplete'
        ? s.status === 'incomplete' || s.needsCompletion
        : s.status === statusFilter;

    const matchesSearch =
      search === '' ||
      s.name.includes(search) ||
      s.code.includes(search) ||
      s.city.includes(search) ||
      (s.address && s.address.includes(search));
    return matchesStatus && matchesSearch;
  });

  const handleCaptureGPS = (forCompleteModal = false) => {
    if (!navigator.geolocation) {
      onShowToast('سرویس مکان‌یابی در این مرورگر پشتیبانی نمی‌شود.');
      return;
    }
    if (forCompleteModal) setCompGpsLoading(true);
    else setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        };
        if (forCompleteModal) {
          setCompCoords(c);
          setCompGpsLoading(false);
        } else {
          setCoords(c);
          setGpsLoading(false);
        }
        onShowToast(`موقعیت مکانی ثبت شد (دقت: حدود ${Math.round(pos.coords.accuracy)} متر)`);
      },
      () => {
        const fallback = { lat: 31.8974, lng: 54.3569, accuracy: 10 };
        if (forCompleteModal) {
          setCompCoords(fallback);
          setCompGpsLoading(false);
        } else {
          setCoords(fallback);
          setGpsLoading(false);
        }
        onShowToast('موقعیت مکانی شبیه‌سازی شد (مختصات منطقه یزد ثبت شد).');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (cleanCode && state.stores.some(s => norm(s.code) === norm(cleanCode))) {
      onShowToast('این کد مشتری قبلاً در سامانه ثبت شده است.');
      return;
    }

    const newStore: Store = {
      id: uid('str'),
      name: name.trim(),
      code: cleanCode,
      city: city.trim(),
      contact: contact.trim(),
      phone: phone.trim(),
      address: address.trim(),
      agency: agency.trim(),
      potential,
      ownerId: currentUser?.id || 'usr_admin',
      status: 'provisional',
      source: 'manual',
      lat: coords.lat,
      lng: coords.lng,
      accuracy: coords.accuracy,
      createdAt: new Date().toISOString(),
    };

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'store.created',
        details: { storeId: newStore.id, name: newStore.name, code: newStore.code },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      stores: [newStore, ...state.stores],
      audit: newAudit,
    });

    onShowToast(`فروشگاه "${newStore.name}" ثبت شد.`);
    setShowAddForm(false);
    setName('');
    setCode('');
    setContact('');
    setPhone('');
    setAddress('');
    setCoords({ lat: null, lng: null, accuracy: null });
  };

  const handleOpenCompleteModal = (store: Store) => {
    setCompletingStore(store);
    setCompName(store.name);
    setCompContact(store.contact || '');
    setCompPhone(store.phone || '');
    setCompAddress(store.address || '');
    setCompPotential(store.potential || 'medium');
    setCompCoords({
      lat: store.lat || null,
      lng: store.lng || null,
      accuracy: store.accuracy || null,
    });
  };

  const handleSaveCompletedStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingStore) return;

    const updatedStores = state.stores.map(s => {
      if (s.id === completingStore.id) {
        return {
          ...s,
          name: compName.trim() || s.name,
          contact: compContact.trim(),
          phone: compPhone.trim(),
          address: compAddress.trim(),
          potential: compPotential,
          lat: compCoords.lat,
          lng: compCoords.lng,
          accuracy: compCoords.accuracy,
          status: 'activated' as const,
          needsCompletion: false,
          completedAt: new Date().toISOString(),
          completedBy: currentUser?.id,
        };
      }
      return s;
    });

    // Award bonus score points to visitor for completing a field store profile!
    const bonusScoreEvent = {
      id: uid('scr'),
      userId: currentUser?.id || completingStore.ownerId,
      month: '1405-07',
      points: 5,
      sourceType: 'activity' as const,
      sourceId: completingStore.id,
      description: `پاداش تکمیل اطلاعات میدانی فروشگاه: ${compName || completingStore.name}`,
      createdAt: new Date().toISOString(),
    };

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'store.profile_completed',
        details: { storeId: completingStore.id, name: compName, code: completingStore.code },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      stores: updatedStores,
      scoreEvents: [bonusScoreEvent, ...state.scoreEvents],
      audit: newAudit,
    });

    onShowToast(`اطلاعات فروشگاه «${compName}» با موفقیت تکمیل و فعال شد (+۵ امتیاز پاداش میدانی ثبت گردید)! 🎉`);
    setCompletingStore(null);
  };

  const handleExportStores = () => {
    const rows = visibleStores.map(s => ({
      'کد مشتری': s.code,
      'نام فروشگاه': s.name,
      'شهر': s.city,
      'آدرس': s.address || '',
      'تلفن': s.phone || '',
      'رابط': s.contact || '',
      'نمایندگی': s.agency,
      'پتانسیل': potentialInfo(s.potential).label,
      'وضعیت': s.status === 'incomplete' ? 'نیازمند تکمیل اطلاعات' : s.status === 'activated' ? 'فعال' : 'موقت',
      'منبع ورود': s.source === 'excel_ingestion' ? 'اکسل فروش' : 'ثبت دستی',
      'مختصات GPS': s.lat && s.lng ? `${s.lat}, ${s.lng}` : 'ثبت نشده',
      'تاریخ ایجاد': fmtDate(s.createdAt),
    }));
    exportToCSV('STORE_WAR_Stores.csv', rows);
    onShowToast('فایل لیست فروشگاه‌ها دانلود شد.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <StoreIcon className="w-5 h-5 text-blue-400" />
            <span>مدیریت قلمرو و پایگاه فروشگاه‌ها</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            گردآوری داده‌های مشتریان از اکسل‌های حسابداری، پایش وضعیت و تکمیل میدانی اطلاعات توسط ویزیتورها
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportStores}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#17263b] hover:bg-[#1f334f] border border-[#283a53] text-xs text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی CSV فروشگاه‌ها</span>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت دستی فروشگاه</span>
          </button>
        </div>
      </div>



      {/* Manual Store Registration Form Modal/Drawer */}
      {showAddForm && (
        <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-5 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between mb-4 border-b border-[#283a53] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              فرم ثبت فروشگاه جدید (میدانی)
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateStore} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">نام فروشگاه *</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: سوپرمارکت بهار"
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">کد مشتری / تفصیل (اختیاری)</label>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="مثال: 4401050"
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">نام صاحب مغازه / فرد رابط</label>
                <input
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="مثال: آقای دهقان"
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">شماره تماس / موبایل</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="مثال: 09131234567"
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">آدرس کامل و محدوده</label>
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="یزد، بلوار آزادشهر، نبش کوچه ۲۰"
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">پتانسیل فروشگاه</label>
                <select
                  value={potential}
                  onChange={e => setPotential(e.target.value as StorePotential)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                >
                  <option value="high">سطح ۱ - پتانسیل بالا (هایپرمارکت)</option>
                  <option value="medium">سطح ۲ - پتانسیل متوسط (سوپرمارکت)</option>
                  <option value="low">سطح ۳ - پتانسیل کم (مغازه محلی)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
              <div>
                <div className="font-semibold text-white">ثبت موقعیت جغرافیایی (GPS)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {coords.lat && coords.lng ? (
                    <span className="text-emerald-400 font-mono">
                      مختصات: {coords.lat}, {coords.lng} (دقت: {coords.accuracy}m)
                    </span>
                  ) : (
                    'موقعیت مکانی هنوز ثبت نشده است.'
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCaptureGPS(false)}
                disabled={gpsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#223854] hover:bg-[#2b476b] text-cyan-300 border border-cyan-800/60 font-medium transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{gpsLoading ? 'در حال دریافت...' : 'دریافت مختصات فعلی'}</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              >
                ثبت فروشگاه
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete Incomplete Store Modal */}
      {completingStore && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121e30] border border-cyan-500/50 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#283a53] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  تکمیل اطلاعات میدانی فروشگاه
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  کد مشتری: <strong className="text-cyan-300 font-mono">{completingStore.code}</strong> · بارگذاری‌شده از اکسل کارآمد سیستم
                </p>
              </div>
              <button
                onClick={() => setCompletingStore(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompletedStore} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">نام رسمی یا تجاری فروشگاه *</label>
                <input
                  required
                  value={compName}
                  onChange={e => setCompName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">صاحب مغازه / فرد رابط</label>
                  <input
                    value={compContact}
                    onChange={e => setCompContact(e.target.value)}
                    placeholder="مثال: آقای حسینی"
                    className="w-full p-2 rounded-lg bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">تلفن مغازه یا موبایل</label>
                  <input
                    value={compPhone}
                    onChange={e => setCompPhone(e.target.value)}
                    placeholder="مثال: 09133510000"
                    className="w-full p-2 rounded-lg bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">آدرس دقیق، محله و خیابان</label>
                <textarea
                  rows={2}
                  value={compAddress}
                  onChange={e => setCompAddress(e.target.value)}
                  placeholder="مثال: صفائیه، خیابان ملاصدرا، جنب پلاک ۴۴"
                  className="w-full p-2 rounded-lg bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">سطح پتانسیل فروشگاه</label>
                <select
                  value={compPotential}
                  onChange={e => setCompPotential(e.target.value as StorePotential)}
                  className="w-full p-2 rounded-lg bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500"
                >
                  <option value="high">سطح ۱ - پتانسیل بالا (هایپرمارکت و سوپر بزرگ)</option>
                  <option value="medium">سطح ۲ - پتانسیل متوسط (سوپرمارکت معمولی)</option>
                  <option value="low">سطح ۳ - پتانسیل کم (سوپر کوچک محلی)</option>
                </select>
              </div>

              {/* GPS Capture */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
                <div>
                  <div className="text-[11px] font-semibold text-white">موقعیت مکانی GPS</div>
                  <div className="text-[10px] text-slate-400">
                    {compCoords.lat && compCoords.lng ? (
                      <span className="text-emerald-400 font-mono">
                        ثبت شد: {compCoords.lat.toFixed(4)}, {compCoords.lng.toFixed(4)}
                      </span>
                    ) : (
                      'جهت ثبت دقت ویزیت، لوکیشن مغازه را ثبت کنید.'
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCaptureGPS(true)}
                  disabled={compGpsLoading}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 font-medium text-[11px]"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{compGpsLoading ? 'دریافت...' : 'ثبت لوکیشن فعلی'}</span>
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-[11px] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>با تکمیل اطلاعات این فروشگاه، ۵ امتیاز پاداش میدانی برای ویزیتور ثبت خواهد شد.</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingStore(null)}
                  className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/30"
                >
                  ذخیره و فعال‌سازی فروشگاه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0c1727] rounded-xl border border-[#283a53] text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'all' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            همه ({num(visibleStores.length)})
          </button>
          <button
            onClick={() => setStatusFilter('activated')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'activated' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            فعال‌شده ({num(activatedCount)})
          </button>

          <button
            onClick={() => setStatusFilter('provisional')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'provisional' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            موقت ({num(provisionalCount)})
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="جستجوی نام، کد مشتری، محله..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-8 pl-3 py-1.5 text-xs bg-[#0c1727] border border-[#283a53] rounded-xl text-white outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl overflow-hidden">
        {filteredStores.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            هیچ فروشگاهی با فیلتر انتخابی شما یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#16253c] text-slate-300 border-b border-[#283a53]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">نام فروشگاه</th>
                  <th className="py-2.5 px-4 font-semibold">کد مشتری</th>
                  <th className="py-2.5 px-4 font-semibold">تلفن / رابط</th>
                  <th className="py-2.5 px-4 font-semibold">پتانسیل</th>
                  <th className="py-2.5 px-4 font-semibold">ویزیتور مسئول</th>
                  <th className="py-2.5 px-4 font-semibold">وضعیت</th>
                  <th className="py-2.5 px-4 font-semibold">مختصات GPS</th>
                  <th className="py-2.5 px-4 font-semibold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2f47]">
                {filteredStores.map(store => {
                  const owner = state.users.find(u => u.id === store.ownerId);
                  const pInfo = potentialInfo(store.potential);
                  const isIncomplete = store.status === 'incomplete' || store.needsCompletion;

                  return (
                    <tr
                      key={store.id}
                      className={`hover:bg-[#16253c]/50 transition-colors ${
                        isIncomplete ? 'bg-cyan-950/15' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{store.name}</span>
                          {store.source === 'excel_ingestion' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 border border-purple-800 text-purple-300">
                              از اکسل
                            </span>
                          )}
                        </div>
                        {store.address ? (
                          <div className="text-[10px] text-slate-400 font-normal">{store.address}</div>
                        ) : (
                          <div className="text-[10px] text-amber-400 font-normal">فاقد آدرس ثبتی</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{store.code || '—'}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {store.phone ? (
                          <div className="font-mono text-[11px] text-slate-200">{store.phone}</div>
                        ) : null}
                        {store.contact ? (
                          <div className="text-[10px] text-slate-400">{store.contact}</div>
                        ) : !store.phone ? (
                          <span className="text-slate-500">—</span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] rounded border font-medium ${pInfo.color}`}>
                          {pInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {owner ? `${owner.firstName} ${owner.lastName}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={store.status} />
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        {store.lat && store.lng ? (
                          <span className="flex items-center gap-1 text-cyan-400 font-mono">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {store.lat.toFixed(3)}, {store.lng.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-slate-500">ثبت نشده</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {isIncomplete ? (
                            <button
                              onClick={() => handleOpenCompleteModal(store)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap shadow-sm shadow-cyan-900"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>تکمیل اطلاعات</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenCompleteModal(store)}
                              className="px-2 py-1 rounded-lg bg-[#1f3047] hover:bg-[#283e5c] text-slate-300 text-xs transition-colors whitespace-nowrap"
                              title="ویرایش مشخصات"
                            >
                              ویرایش
                            </button>
                          )}
                          <button
                            onClick={() => onStartActivityForStore(store.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            ثبت ویزیت
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
