import React, { useState } from 'react';
import { AppState, User, UserOperationalStatus, TargetRequest } from '../types';
import { calculateSeller360 } from '../utils/opportunityEngine';
import { num, fmtDate, monthDefault, uid, roleLabel } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import {
  X,
  UserCheck,
  Target,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  Award,
  Package,
  Store as StoreIcon,
  Send,
  CheckCircle,
  HelpCircle,
  Shield,
  Layers,
  Camera,
} from 'lucide-react';

interface SellerDossierModalProps {
  sellerId: string;
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  currentUser: User | null;
  isAdmin: boolean;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
  onStartActivityForStore?: (storeId: string) => void;
}

export const SellerDossierModal: React.FC<SellerDossierModalProps> = ({
  sellerId,
  isOpen,
  onClose,
  state,
  currentUser,
  isAdmin,
  onUpdateState,
  onShowToast,
  onStartActivityForStore,
}) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'activities' | 'lost' | 'stores'>('sales');

  // Target request modal/form state
  const [showTargetRequestForm, setShowTargetRequestForm] = useState(false);
  const [targetBasis, setTargetBasis] = useState<'sales_history' | 'territory_capacity' | 'new_hire' | 'custom'>('new_hire');
  const [targetRequestNote, setTargetRequestNote] = useState('');

  if (!isOpen) return null;

  const dossier = calculateSeller360(state, sellerId);
  const seller = dossier.seller;

  if (!seller) {
    return null;
  }

  // Handle changing operational status
  const handleChangeOperationalStatus = (newStatus: UserOperationalStatus) => {
    const updatedUsers = state.users.map(u => (u.id === seller.id ? { ...u, operationalStatus: newStatus } : u));
    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'seller.operational_status_changed',
        details: { sellerId: seller.id, old: seller.operationalStatus, new: newStatus },
      },
      ...state.audit,
    ];

    onUpdateState({ ...state, users: updatedUsers, audit: newAudit });
    onShowToast(`وضعیت عملیاتی ${seller.firstName} ${seller.lastName} به «${
      newStatus === 'league' ? 'رسمی در لیگ' : newStatus === 'trainee' ? 'آموزشی' : 'موقت / تستی'
    }» تغییر یافت.`);
  };

  // Submit request to Data Support Specialist
  const handleSubmitTargetRequest = (e: React.FormEvent) => {
    e.preventDefault();

    const newRequest: TargetRequest = {
      id: uid('treq'),
      userId: seller.id,
      userName: `${seller.firstName} ${seller.lastName}`,
      requestedBy: `${currentUser?.firstName || 'مدیر'} ${currentUser?.lastName || ''} (${roleLabel(currentUser?.role)})`,
      month: monthDefault(),
      basis: targetBasis,
      note: targetRequestNote.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const currentRequests = state.targetRequests || [];
    const updatedUsers = state.users.map(u => (u.id === seller.id ? { ...u, targetStatus: 'requested' as const } : u));

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'target.requested_from_support',
        details: { targetRequestId: newRequest.id, seller: newRequest.userName, basis: targetBasis },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      targetRequests: [newRequest, ...currentRequests],
      users: updatedUsers,
      audit: newAudit,
    });

    setShowTargetRequestForm(false);
    setTargetRequestNote('');
    onShowToast(`درخواست تعیین تارگت برای کارشناس داده و پشتیبانی با موفقیت ارسال شد.`);
  };

  const currentRequestsForUser = (state.targetRequests || []).filter(r => r.userId === seller.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="bg-[#101b2b] border border-[#283a53] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#24374e] bg-[#142337] flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-600/30 shrink-0">
              {seller.firstName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">
                  کارنامه ۳۶۰ درجه و پرونده عملکرد: {seller.firstName} {seller.lastName}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-medium">
                  {seller.agency}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                شماره تماس: <span className="font-mono text-slate-300" dir="ltr">{seller.phone}</span> · شهر: {seller.city}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1f334d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operational Status Control Bar */}
        <div className="px-5 py-3 bg-[#0c1624] border-b border-[#203248] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">وضعیت عملیاتی در پلتفرم:</span>
            <div className="flex items-center gap-1.5 p-1 bg-[#142236] rounded-xl border border-[#24374e]">
              <button
                onClick={() => handleChangeOperationalStatus('league')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  dossier.operationalStatus === 'league'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏆 رسمی در لیگ
              </button>
              <button
                onClick={() => handleChangeOperationalStatus('trainee')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  dossier.operationalStatus === 'trainee'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎓 آموزشی / بدو استخدام
              </button>
              <button
                onClick={() => handleChangeOperationalStatus('test')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  dossier.operationalStatus === 'test'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🧪 موقت / تستی (بدون تارگت)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {dossier.targets.length > 0 ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                <span>دارای تارگت فعال ({num(dossier.targetQuantity)} کارتن)</span>
              </span>
            ) : currentRequestsForUser.length > 0 ? (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium flex items-center gap-1">
                <Send className="w-3.5 h-3.5" />
                <span>درخواست تارگت در کارتابل پشتیبان</span>
              </span>
            ) : (
              <button
                onClick={() => setShowTargetRequestForm(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>درخواست تعیین تارگت از پشتیبان</span>
              </button>
            )}
          </div>
        </div>

        {/* Target Request Form Modal / Drawer */}
        {showTargetRequestForm && (
          <div className="p-4 bg-amber-950/40 border-b border-amber-500/30 animate-in fade-in text-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                <span>ارسال درخواست به کارشناس داده و پشتیبانی جهت تعیین تارگت فروش</span>
              </h4>
              <button onClick={() => setShowTargetRequestForm(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTargetRequest} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">مبنای پیشنهادی تعیین تارگت:</label>
                  <select
                    value={targetBasis}
                    onChange={e => setTargetBasis(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-[#0c1727] border border-amber-500/30 text-white outline-none focus:border-amber-500"
                  >
                    <option value="new_hire">تارگت پایه ویزیتور جدید (ورودی استاندارد)</option>
                    <option value="sales_history">بر اساس سوابق فروش و فاکتورهای دوره‌های قبل</option>
                    <option value="territory_capacity">بر اساس ظرفیت منطقه و شعبه تحت پوشش</option>
                    <option value="custom">اعلام به عنوان ویزیتور تستی/آموزشی (بدون تارگت)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">توضیحات و یادداشت برای کارشناس داده:</label>
                  <input
                    value={targetRequestNote}
                    onChange={e => setTargetRequestNote(e.target.value)}
                    placeholder="مثال: ویزیتور جدید برای برندهای مولفیکس و تنو در یزد..."
                    className="w-full p-2 rounded-xl bg-[#0c1727] border border-amber-500/30 text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTargetRequestForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#18283d] text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  ارسال درخواست به کارشناس پشتیبانی
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-5 flex-1">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0c1727] border border-[#24374e]">
              <span className="text-[11px] text-slate-400 block mb-1">فروش خالص اکسل</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-cyan-400 font-mono">{num(dossier.netCartons)}</span>
                <span className="text-[11px] text-slate-400">کارتن</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                {dossier.invoicesCount} فاکتور · {dossier.returnCartons > 0 ? `${num(dossier.returnCartons)} برگشتی` : 'بدون برگشت'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c1727] border border-[#24374e]">
              <span className="text-[11px] text-slate-400 block mb-1">فعالیت‌های میدانی</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-emerald-400 font-mono">{num(dossier.activities.length)}</span>
                <span className="text-[11px] text-slate-400">ثبت</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                {dossier.verifiedActivitiesCount} تاییدشده · {num(dossier.earnedActivityPoints)} امتیاز کسب‌شده
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c1727] border border-amber-500/30 bg-amber-950/10">
              <span className="text-[11px] text-amber-300 block mb-1">امتیازهای از دست رفته</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-amber-400 font-mono">-{num(dossier.lostPoints)}</span>
                <span className="text-[11px] text-amber-200/70">امتیاز</span>
              </div>
              <span className="text-[10px] text-amber-400/80 block mt-1">
                {dossier.lostOpportunities.length} فاکتور بدون اقدام میدانی
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c1727] border border-[#24374e]">
              <span className="text-[11px] text-slate-400 block mb-1">نرخ پوشش و تبدیل</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-white font-mono">{dossier.conversionRate}%</span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                از {dossier.buyingStoresCount} مغازه خریدار فعال
              </span>
            </div>
          </div>

          {/* Dossier Tabs Navigation */}
          <div className="border-b border-[#24374e] flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('sales')}
              className={`pb-2.5 px-3 font-semibold transition-all relative ${
                activeTab === 'sales' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              گزارش فروش و فاکتورها ({dossier.sellerSales.length})
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`pb-2.5 px-3 font-semibold transition-all relative ${
                activeTab === 'activities' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              فعالیت‌های میدانی و عکس‌ها ({dossier.activities.length})
            </button>
            <button
              onClick={() => setActiveTab('lost')}
              className={`pb-2.5 px-3 font-semibold transition-all relative ${
                activeTab === 'lost' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              فرصت‌ها و امتیازات سوخته ({dossier.lostOpportunities.length})
            </button>
            <button
              onClick={() => setActiveTab('stores')}
              className={`pb-2.5 px-3 font-semibold transition-all relative ${
                activeTab === 'stores' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              فروشگاه‌های تحت پوشش ({dossier.storesAssignedCount})
            </button>
          </div>

          {/* Tab 1: Sales Invoices */}
          {activeTab === 'sales' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-[#24374e]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#142337] text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">شماره فاکتور</th>
                      <th className="py-2.5 px-3">تاریخ</th>
                      <th className="py-2.5 px-3">فروشگاه / مشتری</th>
                      <th className="py-2.5 px-3">کد مشتری</th>
                      <th className="py-2.5 px-3">برند / کالا</th>
                      <th className="py-2.5 px-3">تعداد کارتن</th>
                      <th className="py-2.5 px-3">نوع ردیف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2f47]">
                    {dossier.sellerSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          هیچ فاکتور فروشی برای این ویزیتور از اکسل بارگذاری نشده است.
                        </td>
                      </tr>
                    ) : (
                      dossier.sellerSales.map((sale, idx) => (
                        <tr key={sale.id || idx} className="hover:bg-[#16253c]/40">
                          <td className="py-2.5 px-3 font-mono text-white" dir="ltr">{sale.invoice}</td>
                          <td className="py-2.5 px-3 text-slate-400">{sale.invoiceDate || '—'}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{sale.customerName || '—'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400" dir="ltr">{sale.customerCode || '—'}</td>
                          <td className="py-2.5 px-3 text-slate-300">{sale.brand} {sale.product ? `· ${sale.product}` : ''}</td>
                          <td className={`py-2.5 px-3 font-bold font-mono ${sale.quantity < 0 ? 'text-rose-400' : 'text-cyan-300'}`}>
                            {num(sale.quantity)}
                          </td>
                          <td className="py-2.5 px-3">
                            {sale.quantity < 0 || sale.isReturn ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                برگشت از فروش
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                فروش قطعی
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Field Activities */}
          {activeTab === 'activities' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-[#24374e]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#142337] text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">فروشگاه</th>
                      <th className="py-2.5 px-3">نوع فعالیت</th>
                      <th className="py-2.5 px-3">برند / SKU</th>
                      <th className="py-2.5 px-3">عکس شلف</th>
                      <th className="py-2.5 px-3">امتیاز</th>
                      <th className="py-2.5 px-3">وضعیت تایید</th>
                      <th className="py-2.5 px-3">تاریخ ثبت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2f47]">
                    {dossier.activities.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          هیچ فعالیت میدانی توسط این ویزیتور ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      dossier.activities.map(act => {
                        const st = state.stores.find(s => s.id === act.storeId);
                        return (
                          <tr key={act.id} className="hover:bg-[#16253c]/40">
                            <td className="py-2.5 px-3 font-semibold text-white">{st?.name || act.storeId}</td>
                            <td className="py-2.5 px-3 text-slate-300">
                              {act.type === 'initial' ? 'ثبت اولیه' : act.type === 'repeat' ? 'سفارش مجدد' : act.type === 'merch' ? 'چیدمان' : 'ویزیت'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{act.brand || '—'}</td>
                            <td className="py-2.5 px-3">
                              {act.photo ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300">
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>دارد</span>
                                </span>
                              ) : (
                                <span className="text-slate-500">ندارد</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-amber-400">+{act.points}</td>
                            <td className="py-2.5 px-3">
                              <StatusBadge status={act.status} />
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">{fmtDate(act.createdAt)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Lost Opportunities */}
          {activeTab === 'lost' && (
            <div className="space-y-3">
              {dossier.lostOpportunities.length === 0 ? (
                <div className="p-8 text-center text-emerald-300 bg-emerald-950/20 rounded-xl border border-emerald-500/30 text-xs">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                  <span>عالی است! هیچ فرصت فاکتوری بدون اقدام میدانی توسط این فروشنده رها نشده است.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dossier.lostOpportunities.map(opp => (
                    <div
                      key={opp.id}
                      className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StoreIcon className="w-4 h-4 text-amber-400" />
                          <span className="font-bold text-white">{opp.storeName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({opp.storeCode})</span>
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                            -{opp.missedPoints} امتیاز
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          فاکتور #{opp.invoiceNumber} به میزان {num(opp.cartons)} کارتن صادر شده اما در {opp.daysAgo} روز گذشته ویزیت یا چیدمانی ثبت نشده است.
                        </p>
                      </div>

                      {onStartActivityForStore && opp.storeId && (
                        <button
                          onClick={() => {
                            onClose();
                            onStartActivityForStore(opp.storeId!);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 text-xs transition-colors shadow-sm"
                        >
                          ثبت فعالیت جبرانی
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Assigned Stores */}
          {activeTab === 'stores' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {state.stores
                  .filter(st => st.ownerId === seller.id)
                  .map(st => (
                    <div key={st.id} className="p-3 rounded-xl bg-[#0c1727] border border-[#24374e] text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-white">{st.name}</span>
                        <StatusBadge status={st.status} />
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <div>کد مشتری: <span className="font-mono text-slate-200">{st.code}</span></div>
                        <div>آدرس: {st.address || '—'}</div>
                        <div>پتانسیل: {st.potential}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
