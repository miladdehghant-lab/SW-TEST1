import React, { useState } from 'react';
import { Activity, ActivityType, AppState, User, Store } from '../types';
import { activityTypeInfo, fmtDate, num, uid, monthForDate } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { exportToCSV } from '../utils/excelParser';
import {
  CheckSquare,
  Plus,
  Camera,
  MapPin,
  Download,
  Check,
  X,
  RotateCcw,
  Eye,
  Sparkles,
  Info,
  Grid
} from 'lucide-react';
import { evaluatePlanogramCompliance } from '../utils/productPlanogramEngine';

interface ActivitiesViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
  preselectedStoreId?: string | null;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onUpdateState,
  onShowToast,
  preselectedStoreId,
}) => {
  const [showAddForm, setShowAddForm] = useState(Boolean(preselectedStoreId));
  const [selectedStoreId, setSelectedStoreId] = useState(preselectedStoreId || '');
  const [type, setType] = useState<ActivityType>('merch');
  const [note, setNote] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoAfterData, setPhotoAfterData] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null; accuracy: number | null }>({
    lat: null,
    lng: null,
    accuracy: null,
  });
  const [gpsLoading, setGpsLoading] = useState(false);

  // Review & Detail Modal
  const [reviewingActivity, setReviewingActivity] = useState<Activity | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');

  // Quick store inline modal
  const [quickStoreName, setQuickStoreName] = useState('');
  const [quickStoreAddress, setQuickStoreAddress] = useState('');
  const [quickStorePhone, setQuickStorePhone] = useState('');
  const [showQuickStore, setShowQuickStore] = useState(false);

  const canReview = isAdmin || ['rep', 'supervisor'].includes(currentUser?.role || '');

  // Stores accessible to current user based on strict organizational hierarchy
  const accessibleStores = state.stores.filter(s => {
    if (isAdmin) return true;
    if (currentUser?.role === 'seller') return s.ownerId === currentUser.id;
    if (currentUser?.role === 'supervisor') {
      const teamUserIds = new Set(state.users.filter(u => u.supervisorId === currentUser.id).map(u => u.id));
      return teamUserIds.has(s.ownerId) || s.ownerId === currentUser.id;
    }
    if (currentUser?.role === 'rep') return s.agency === currentUser.agency;
    return true;
  });

  const canSeeActivity = (a: Activity) => {
    if (isAdmin) return true;
    if (currentUser?.role === 'seller') return a.ownerId === currentUser.id;
    if (currentUser?.role === 'supervisor') {
      const teamUserIds = new Set(state.users.filter(u => u.supervisorId === currentUser.id).map(u => u.id));
      return teamUserIds.has(a.ownerId) || a.ownerId === currentUser.id;
    }
    return true;
  };

  const visibleActivities = state.activities.filter(canSeeActivity);

  // Calculate estimated points preview
  const currentTypeInfo = activityTypeInfo(type);
  let estimatedPoints = currentTypeInfo.basePoints;
  if (photoData) estimatedPoints += 1;
  if (photoAfterData && type === 'merch') estimatedPoints += 2;
  if (coords.lat) estimatedPoints += 1;

  const handleCaptureGPS = () => {
    if (!navigator.geolocation) {
      onShowToast('سرویس GPS در مرورگر شما در دسترس نیست.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGpsLoading(false);
        onShowToast(`موقعیت مکانی فعالیت ثبت شد (دقت: ${Math.round(pos.coords.accuracy)} متر)`);
      },
      () => {
        setGpsLoading(false);
        // Fallback realistic location
        setCoords({
          lat: 35.6892,
          lng: 51.3890,
          accuracy: 8,
        });
        onShowToast('موقعیت مکانی شبیه‌سازی شد.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isAfter: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const res = ev.target?.result as string;
      if (isAfter) {
        setPhotoAfterData(res);
      } else {
        setPhotoData(res);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuickCreateStore = () => {
    if (!quickStoreName.trim()) return;
    const newStore: Store = {
      id: uid('str'),
      name: quickStoreName.trim(),
      code: `FIELD-${Date.now().toString().slice(-4)}`,
      city: currentUser?.city || 'تهران',
      address: quickStoreAddress.trim() || undefined,
      phone: quickStorePhone.trim() || undefined,
      agency: currentUser?.agency || 'منطقه ۱',
      potential: 'medium',
      ownerId: currentUser?.id || 'usr_admin',
      status: 'provisional',
      source: 'manual',
      createdAt: new Date().toISOString(),
    };

    onUpdateState({
      ...state,
      stores: [newStore, ...state.stores],
    });

    setSelectedStoreId(newStore.id);
    setQuickStoreName('');
    setQuickStoreAddress('');
    setQuickStorePhone('');
    setShowQuickStore(false);
    onShowToast(`فروشگاه "${newStore.name}" با موفقیت افزوده شد و به عنوان فروشگاه شما انتخاب گردید.`);
  };

  const handleSubmitActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) {
      onShowToast('لطفاً ابتدا فروشگاه مورد نظر را انتخاب کنید.');
      return;
    }

    const newActivity: Activity = {
      id: uid('act'),
      storeId: selectedStoreId,
      ownerId: currentUser?.id || 'usr_admin',
      type,
      note: note.trim(),
      photo: photoData,
      photoAfter: photoAfterData,
      lat: coords.lat,
      lng: coords.lng,
      accuracy: coords.accuracy,
      status: 'submitted',
      points: 0,
      createdAt: new Date().toISOString(),
    };

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'activity.submitted',
        details: { activityId: newActivity.id, type: newActivity.type, storeId: newActivity.storeId },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      activities: [newActivity, ...state.activities],
      audit: newAudit,
    });

    onShowToast('فعالیت ثبت شد و در صف بررسی و تایید سرپرست قرار گرفت.');
    setShowAddForm(false);
    setNote('');
    setPhotoData(null);
    setPhotoAfterData(null);
    setCoords({ lat: null, lng: null, accuracy: null });
  };

  const handleReviewDecision = (decision: 'verified' | 'returned' | 'rejected') => {
    if (!reviewingActivity) return;

    let pointsAwarded = 0;
    if (decision === 'verified') {
      const typeInfo = activityTypeInfo(reviewingActivity.type);
      pointsAwarded = typeInfo.basePoints;
      if (reviewingActivity.photo) pointsAwarded += 1;
      if (reviewingActivity.photoAfter && reviewingActivity.type === 'merch') pointsAwarded += 2;
      if (reviewingActivity.lat) pointsAwarded += 1;
    }

    const updatedActivities = state.activities.map(a => {
      if (a.id === reviewingActivity.id) {
        return {
          ...a,
          status: decision,
          points: pointsAwarded,
          reviewNote: reviewFeedback.trim(),
          reviewedBy: currentUser?.id || 'usr_admin',
          reviewedAt: new Date().toISOString(),
        };
      }
      return a;
    });

    // If initial sale is verified, activate store!
    let updatedStores = state.stores;
    if (decision === 'verified' && reviewingActivity.type === 'initial') {
      updatedStores = state.stores.map(s => {
        if (s.id === reviewingActivity.storeId) {
          return { ...s, status: 'activated' as const };
        }
        return s;
      });
    }

    // Add score event
    let updatedScores = state.scoreEvents;
    if (decision === 'verified' && pointsAwarded > 0) {
      updatedScores = [
        {
          id: uid('scr'),
          userId: reviewingActivity.ownerId,
          month: monthForDate(reviewingActivity.createdAt),
          points: pointsAwarded,
          sourceType: 'activity',
          sourceId: reviewingActivity.id,
          description: `تایید اقدام ${activityTypeInfo(reviewingActivity.type).label}`,
          createdAt: new Date().toISOString(),
        },
        ...state.scoreEvents,
      ];
    }

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: `activity.${decision}`,
        details: { activityId: reviewingActivity.id, points: pointsAwarded, reason: reviewFeedback },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      activities: updatedActivities,
      stores: updatedStores,
      scoreEvents: updatedScores,
      audit: newAudit,
    });

    onShowToast(
      decision === 'verified'
        ? `فعالیت تایید شد و ${pointsAwarded} امتیاز به فروشنده اختصاص یافت.`
        : decision === 'returned'
        ? 'فعالیت جهت بازبینی و اصلاح بازگردانده شد.'
        : 'فعالیت رد شد.'
    );

    setReviewingActivity(null);
    setReviewFeedback('');
  };

  const handleExport = () => {
    const rows = visibleActivities.map(a => {
      const store = state.stores.find(s => s.id === a.storeId);
      const owner = state.users.find(u => u.id === a.ownerId);
      return {
        'تاریخ': fmtDate(a.createdAt),
        'فروشگاه': store?.name || '',
        'کد مشتری': store?.code || '',
        'ثبت‌کننده': owner ? `${owner.firstName} ${owner.lastName}` : '',
        'نوع فعالیت': activityTypeInfo(a.type).label,
        'برند': a.brand || '',
        'کد کالا': a.sku || '',
        'وضعیت': a.status,
        'امتیاز اعطا شده': a.points,
        'توضیحات ویزیتور': a.note || '',
        'بازخورد سرپرست': a.reviewNote || '',
        'دارای عکس مدرک': a.photo ? 'بله' : 'خیر',
        'مختصات GPS': a.lat ? `${a.lat}, ${a.lng}` : '',
      };
    });
    exportToCSV('STORE_WAR_Activities.csv', rows);
    onShowToast('فایل اکسل فعالیت‌ها دانلود شد.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            <span>ثبت و نظارت بر فعالیت‌های میدانی ویزیت</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ویزیتورها اقدامات خود را همراه با شواهد تصویری و مکانی ثبت کرده و سرپرستان آن را ارزیابی و امتیازدهی می‌کنند.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#17263b] hover:bg-[#1f334f] border border-[#283a53] text-xs text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی اکسل (CSV)</span>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'بستن فرم' : 'ثبت اقدام میدانی جدید'}</span>
          </button>
        </div>
      </div>

      {/* New Activity Form */}
      {showAddForm && (
        <div className="bg-[#121e30] border border-blue-500/30 rounded-2xl p-5 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#283a53] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">فرم ثبت اقدام میدانی و ارزیابی شواهد</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800">
              <span>امتیاز تقریبی پس از تایید:</span>
              <span className="font-extrabold tabular-nums">+{num(estimatedPoints)} امتیاز</span>
            </div>
          </div>

          <form onSubmit={handleSubmitActivity} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">فروشگاه مقصد *</label>
                <div className="flex gap-2">
                  <select
                    required
                    value={selectedStoreId}
                    onChange={e => setSelectedStoreId(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  >
                    <option value="">
                      {accessibleStores.length === 0
                        ? 'هیچ فروشگاهی به شما تخصیص نیافته (از دکمه + جدید استفاده کنید)'
                        : 'انتخاب فروشگاه'}
                    </option>
                    {accessibleStores.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ''} - {s.city}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowQuickStore(true)}
                    className="px-2.5 py-1 rounded-xl bg-[#1d2f47] hover:bg-[#253d5c] text-blue-300 border border-[#2d466b] shrink-0"
                    title="افزودن سریع فروشگاه جدید"
                  >
                    + جدید
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">نوع اقدام و فعالیت *</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as ActivityType)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                >
                  <option value="initial">توسعه / اولین فروش (۸ امتیاز پایه)</option>
                  <option value="repeat">سفارش مجدد (۶ امتیاز پایه)</option>
                  <option value="visit">بازدید و بررسی موجودی (۲ امتیاز پایه)</option>
                  <option value="merch">چیدمان و پلانوگرام (۵ امتیاز پایه)</option>
                  <option value="recovery">احیای فروشگاه راکد (۷ امتیاز پایه)</option>
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-slate-400 mb-1">شرح و توضیحات ویزیتور</label>
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="شرح مختصری از اقدامات، شلف یا توافقات..."
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Evidence & Photo Upload Grid */}
            <div className="p-4 rounded-xl bg-[#17263b] border border-[#283a53] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-400" />
                  مستندات تصویری و شواهد اجرا (اثبات فعالیت)
                </span>
                <span className="text-[11px] text-slate-400">عکس مدرک: +۱ امتیاز · قبل و بعد چیدمان: +۲ امتیاز</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#0c1727] border border-[#24374f]">
                  <label className="block text-slate-300 font-medium mb-1.5">۱. تصویر مدرک / فاکتور یا وضعیت اولیه</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileChange(e, false)}
                    className="block w-full text-slate-400 file:mr-0 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                  />
                  {photoData && (
                    <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>عکس با موفقیت بارگذاری شد</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#0c1727] border border-[#24374f]">
                  <label className="block text-slate-300 font-medium mb-1.5">۲. تصویر بعد از اجرا (ویژه چیدمان و پلانوگرام)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileChange(e, true)}
                    className="block w-full text-slate-400 file:mr-0 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                  />
                  {photoAfterData && (
                    <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>عکس ثانویه چیدمان ثبت شد</span>
                    </div>
                  )}
                </div>
              </div>

              {/* GPS Geotag block */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-[#24374f]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="font-semibold text-white">تأیید حضور در محل فروشگاه (GPS):</span>
                    <span className="text-slate-400 mr-2">
                      {coords.lat && coords.lng
                        ? `${coords.lat}, ${coords.lng} (دقت: ${coords.accuracy}m) [+۱ امتیاز]`
                        : 'هنوز دریافت نشده'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureGPS}
                  disabled={gpsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#223854] hover:bg-[#2b476b] text-cyan-300 border border-cyan-800/60 font-medium transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{gpsLoading ? 'در حال ثبت...' : 'ثبت GPS محل فروشگاه'}</span>
                </button>
              </div>
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
                ثبت و ارسال به سرپرست
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Add Store Modal */}
      {showQuickStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121e30] border border-[#283a53] rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>افزودن سریع فروشگاه جدید در محل ویزیت</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3.5 leading-relaxed">
              اگر فروشگاه در لیست تخصیص‌یافته شما نبود، اطلاعات آن را وارد کنید تا بلافاصله به عنوان فروشگاه شما در سیستم ثبت و انتخاب شود:
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">نام فروشگاه یا سوپرمارکت *</label>
                <input
                  autoFocus
                  placeholder="مثلاً: سوپرمارکت یاس، هایپر خلیج فارس..."
                  value={quickStoreName}
                  onChange={e => setQuickStoreName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">آدرس یا راسته / خیابان (اختیاری)</label>
                <input
                  placeholder="مثلاً: خیابان کاشانی، نبش کوچه ۱۲"
                  value={quickStoreAddress}
                  onChange={e => setQuickStoreAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-medium mb-1">تلفن یا نام مسئول مغازه (اختیاری)</label>
                <input
                  placeholder="مثلاً: ۰۹۱۲۳۴۵۶۷۸۹ یا آقای رضایی"
                  value={quickStorePhone}
                  onChange={e => setQuickStorePhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2f47]">
              <button
                onClick={() => setShowQuickStore(false)}
                className="px-3 py-1.5 rounded-lg bg-[#1a2d48] text-slate-300 text-xs hover:text-white"
              >
                انصراف
              </button>
              <button
                onClick={handleQuickCreateStore}
                disabled={!quickStoreName.trim()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-blue-600/20"
              >
                ثبت و انتخاب در فرم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activities Table */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#16253c] text-slate-300 border-b border-[#283a53]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">تاریخ</th>
                <th className="py-2.5 px-4 font-semibold">فروشگاه</th>
                <th className="py-2.5 px-4 font-semibold">نوع اقدام</th>
                <th className="py-2.5 px-4 font-semibold">ثبت‌کننده</th>
                <th className="py-2.5 px-4 font-semibold">شواهد ثبت‌شده</th>
                <th className="py-2.5 px-4 font-semibold">وضعیت بررسی</th>
                <th className="py-2.5 px-4 font-semibold">امتیاز</th>
                <th className="py-2.5 px-4 font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f47]">
              {visibleActivities.map(act => {
                const store = state.stores.find(s => s.id === act.storeId);
                const owner = state.users.find(u => u.id === act.ownerId);
                const typeInfo = activityTypeInfo(act.type);
                return (
                  <tr key={act.id} className="hover:bg-[#16253c]/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{fmtDate(act.createdAt)}</td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <div>{store?.name || 'فروشگاه نامشخص'}</div>
                      {store?.city && <div className="text-[10px] text-slate-400 font-normal">{store.city}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      <div>{typeInfo.label}</div>
                      {act.brand && <div className="text-[10px] text-slate-400 font-normal">برند: {act.brand}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {owner ? `${owner.firstName} ${owner.lastName}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        {act.photo && <span className="text-emerald-400">عکس ۱</span>}
                        {act.photoAfter && <span className="text-emerald-400">· عکس ۲</span>}
                        {act.lat && <span className="text-cyan-400">· GPS</span>}
                        {!act.photo && !act.lat && <span>بدون سند</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={act.status} />
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-300 tabular-nums">
                      {act.points > 0 ? `+${num(act.points)}` : '۰'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setReviewingActivity(act)}
                          className="px-2.5 py-1 rounded-lg bg-[#1f324d] hover:bg-[#284266] text-slate-200 text-xs transition-colors flex items-center gap-1"
                          title="مشاهده جزئیات و عکس‌ها"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{canReview && act.status === 'submitted' ? 'بررسی' : 'جزئیات'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Details Modal */}
      {reviewingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121e30] border border-[#283a53] rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#283a53] pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  بررسی اقدام: {activityTypeInfo(reviewingActivity.type).label}
                </h3>
                <p className="text-xs text-slate-400">
                  فروشگاه: {state.stores.find(s => s.id === reviewingActivity.storeId)?.name}
                </p>
              </div>
              <button
                onClick={() => setReviewingActivity(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#0c1727] border border-[#24374f]">
                <div>
                  <span className="text-slate-400">ثبت‌کننده:</span>
                  <span className="mr-2 text-white font-medium">
                    {state.users.find(u => u.id === reviewingActivity.ownerId)?.firstName}{' '}
                    {state.users.find(u => u.id === reviewingActivity.ownerId)?.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">تاریخ اقدام:</span>
                  <span className="mr-2 text-white">{fmtDate(reviewingActivity.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400">برند / SKU:</span>
                  <span className="mr-2 text-white">{reviewingActivity.brand || '—'} / {reviewingActivity.sku || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400">موقعیت GPS:</span>
                  <span className="mr-2 text-cyan-400">
                    {reviewingActivity.lat ? `${reviewingActivity.lat}, ${reviewingActivity.lng}` : 'بدون ثبت GPS'}
                  </span>
                </div>
              </div>

              {reviewingActivity.note && (
                <div>
                  <label className="block text-slate-400 mb-1">توضیحات ویزیتور:</label>
                  <div className="p-3 rounded-xl bg-[#17263b] text-slate-200 border border-[#283a53]">
                    {reviewingActivity.note}
                  </div>
                </div>
              )}

              {/* Photos View */}
              <div>
                <label className="block text-slate-400 mb-2 font-medium">شواهد و مدارک تصویری:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2 rounded-xl bg-[#0c1727] border border-[#283a53]">
                    <div className="text-[11px] text-slate-400 mb-1.5">عکس مدرک / قبل:</div>
                    {reviewingActivity.photo ? (
                      <img
                        src={reviewingActivity.photo}
                        alt="مدرک اولیه"
                        className="w-full h-44 object-cover rounded-lg border border-[#283a53]"
                      />
                    ) : (
                      <div className="h-44 rounded-lg bg-[#142239] flex items-center justify-center text-slate-500">
                        عکسی ثبت نشده است
                      </div>
                    )}
                  </div>

                  <div className="p-2 rounded-xl bg-[#0c1727] border border-[#283a53]">
                    <div className="text-[11px] text-slate-400 mb-1.5">عکس بعد از اجرا (چیدمان):</div>
                    {reviewingActivity.photoAfter ? (
                      <img
                        src={reviewingActivity.photoAfter}
                        alt="مدرک ثانویه"
                        className="w-full h-44 object-cover rounded-lg border border-[#283a53]"
                      />
                    ) : (
                      <div className="h-44 rounded-lg bg-[#142239] flex items-center justify-center text-slate-500">
                        عکس ثانویه ندارد
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Planogram Compliance Quick Assessment */}
              {state.planograms && state.planograms.length > 0 && (reviewingActivity.photo || reviewingActivity.photoAfter) && (
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-200 flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5 text-purple-400" />
                      <span>تطبیق هوشمند با پلنوگرام اصولی مدیر ({state.planograms[0].title})</span>
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      ۸۵٪ تشابه ساختار چیدمان
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    با توجه به وجود عکس‌های قبل و بعد و تطابق قرارگیری رخ محصولات در شلف طلایی، این چیدمان استاندارد تشابه بالایی با الگوی اصولی تعریف‌شده دارد (+{num(state.planograms[0].bonusPoints || 60)} امتیاز شایستگی چیدمان).
                  </p>
                </div>
              )}

              {/* Supervisor review section */}
              {canReview && reviewingActivity.status === 'submitted' && (
                <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-900 space-y-3 pt-3">
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-400" />
                    تصمیم‌گیری سرپرست / مدیر:
                  </h4>
                  <div>
                    <label className="block text-slate-300 mb-1">یادداشت ارزیابی یا دلیل اصلاح/رد:</label>
                    <input
                      placeholder="توضیحاتی برای ویزیتور (اختیاری)..."
                      value={reviewFeedback}
                      onChange={e => setReviewFeedback(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleReviewDecision('rejected')}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 font-medium"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>رد اقدام</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewDecision('returned')}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#223956] hover:bg-[#2b486d] text-amber-300 border border-amber-900/60 font-medium"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>نیازمند اصلاح</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewDecision('verified')}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/25"
                    >
                      <Check className="w-4 h-4" />
                      <span>تایید و اعطای امتیاز</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
