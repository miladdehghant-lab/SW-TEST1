import React, { useState } from 'react';
import { User, Activity, Store, SaleRecord, AppState } from '../types';
import { num, fmtDate, activityTypeInfo } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { LostPointsAlertCard } from '../components/LostPointsAlertCard';
import { SellerDossierModal } from '../components/SellerDossierModal';
import { Trophy, Store as StoreIcon, CheckSquare, Clock, ArrowUpRight, Plus, Upload, Shield, Eye } from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface OverviewViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onNavigate: (tab: NavTab) => void;
  onOpenReview: () => void;
  onUpdateState?: (newState: AppState) => void;
  onShowToast?: (msg: string) => void;
  onStartActivityForStore?: (storeId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onNavigate,
  onOpenReview,
  onUpdateState,
  onShowToast,
  onStartActivityForStore,
}) => {
  const [inspectingSellerId, setInspectingSellerId] = useState<string | null>(null);

  const currentUserId = currentUser?.id || 'usr_admin';

  // Calculate scores and metrics for current scope
  const userScore = state.scoreEvents
    .filter(e => e.userId === currentUserId)
    .reduce((acc, curr) => acc + curr.points, 0);

  const scopedStores = state.stores.filter(s => {
    if (isAdmin) return true;
    if (currentUser?.role === 'seller') return s.ownerId === currentUser.id;
    if (currentUser?.role === 'supervisor') {
      const teamUserIds = new Set(state.users.filter(u => u.supervisorId === currentUser.id).map(u => u.id));
      return teamUserIds.has(s.ownerId) || s.ownerId === currentUser.id;
    }
    return s.agency === (currentUser?.agency || '');
  });

  const scopedActivities = state.activities.filter(a => {
    if (isAdmin) return true;
    if (currentUser?.role === 'seller') return a.ownerId === currentUser.id;
    const storeIds = new Set(scopedStores.map(s => s.id));
    return storeIds.has(a.storeId) || a.ownerId === currentUser?.id;
  });

  const pendingActivities = scopedActivities.filter(a => a.status === 'submitted');
  const activatedStores = scopedStores.filter(s => s.status === 'activated');

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-cyan-400">سامانه جامع مدیریت و رقابت تیم فروش</span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300">میدان فروش، پلانوگرام شلف و کنترل فروش</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white">
            خوش آمدید، {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'مدیر سیستم'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            سامانه پایش فعالیت‌های میدانی، تطبیق ستون‌های فایل فروش و لیگ رتبه‌بندی عملکرد
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={onOpenReview}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all shrink-0"
            title="مشاهده مشخصات فنی و معماری سامانه (مخصوص مدیر)"
          >
            <Shield className="w-4 h-4" />
            <span>مشاهده مشخصات فنی و معماری</span>
          </button>
        )}
      </div>

      {/* Prominent Lost Points Motivational Warning Card (FOMO) */}
      <LostPointsAlertCard
        state={state}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onStartActivityForStore={onStartActivityForStore}
        onOpenSellerDossier={sellerId => setInspectingSellerId(sellerId)}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 rounded-2xl bg-[#121e30] border border-[#283a53]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">امتیاز فردی شما</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white tabular-nums">
            {num(userScore)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">امتیاز ثبت‌شده در موتور بازی</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121e30] border border-[#283a53]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">فروشگاه‌های قلمرو</span>
            <StoreIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white tabular-nums">
            {num(scopedStores.length)}
          </div>
          <div className="flex items-center gap-2 text-[11px] mt-1">
            <span className="text-emerald-400 font-medium">{num(activatedStores.length)} فروشگاه فعال</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121e30] border border-[#283a53]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">کل فعالیت‌های ثبت‌شده</span>
            <CheckSquare className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white tabular-nums">
            {num(scopedActivities.length)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">شامل ویزیت، چیدمان و سفارش</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121e30] border border-[#283a53]">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">در انتظار بررسی</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-amber-300 tabular-nums">
            {num(pendingActivities.length)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">فعالیت‌های ارسالی جهت تایید</div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="p-4 rounded-2xl bg-[#121e30] border border-[#283a53]">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          دسترسی و اقدامات سریع
        </h3>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigate('stores')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت فروشگاه جدید</span>
          </button>
          <button
            onClick={() => onNavigate('activities')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1f324d] hover:bg-[#284266] text-slate-200 border border-[#314c72] text-xs font-medium transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>ثبت فعالیت میدانی (ویزیت/چیدمان)</span>
          </button>
          {(isAdmin || currentUser?.role === 'support') && (
            <button
              onClick={() => onNavigate('sales')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1f324d] hover:bg-[#284266] text-slate-200 border border-[#314c72] text-xs font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>بارگذاری فایل اکسل فروش</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('ranking')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1f324d] hover:bg-[#284266] text-slate-200 border border-[#314c72] text-xs font-medium transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>جدول رتبه‌بندی و لیگ</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => onNavigate('users')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1f324d] hover:bg-[#284266] text-slate-200 border border-[#314c72] text-xs font-medium transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span>مدیریت و کارنامه ۳۶۰ ویزیتورها</span>
            </button>
          )}
        </div>
      </div>

      {/* Recent Activities Table */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#283a53] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">آخرین فعالیت‌های ثبت‌شده</h3>
            <p className="text-xs text-slate-400 mt-0.5">وضعیت آخرین بازدیدها و اقدامات ویزیتورها در منطقه</p>
          </div>
          <button
            onClick={() => onNavigate('activities')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
          >
            <span>مشاهده همه</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {scopedActivities.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            هنوز فعالیتی در محدوده شما ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#16253c] text-slate-300 border-b border-[#283a53]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">تاریخ</th>
                  <th className="py-2.5 px-4 font-semibold">فروشگاه</th>
                  <th className="py-2.5 px-4 font-semibold">نوع اقدام</th>
                  <th className="py-2.5 px-4 font-semibold">ثبت‌کننده</th>
                  <th className="py-2.5 px-4 font-semibold">وضعیت بررسی</th>
                  <th className="py-2.5 px-4 font-semibold">امتیاز</th>
                  {isAdmin && <th className="py-2.5 px-4 font-semibold text-center">کارنامه</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2f47]">
                {scopedActivities.slice(0, 5).map(act => {
                  const store = state.stores.find(s => s.id === act.storeId);
                  const owner = state.users.find(u => u.id === act.ownerId);
                  const typeMeta = activityTypeInfo(act.type);
                  return (
                    <tr key={act.id} className="hover:bg-[#16253c]/50 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{fmtDate(act.createdAt)}</td>
                      <td className="py-3 px-4 font-medium text-white">{store?.name || 'فروشگاه نامشخص'}</td>
                      <td className="py-3 px-4 text-slate-300">{typeMeta.label}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {owner ? `${owner.firstName} ${owner.lastName}` : 'کاربر'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={act.status} />
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-300 tabular-nums">
                        {act.points > 0 ? `+${num(act.points)}` : '۰'}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-center">
                          {owner && (
                            <button
                              onClick={() => setInspectingSellerId(owner.id)}
                              className="px-2 py-1 rounded bg-[#1c2e47] hover:bg-[#253d5e] text-slate-300 hover:text-white text-[11px]"
                            >
                              مشاهده کارنامه
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seller Dossier Modal */}
      {inspectingSellerId && onUpdateState && onShowToast && (
        <SellerDossierModal
          sellerId={inspectingSellerId}
          isOpen={Boolean(inspectingSellerId)}
          onClose={() => setInspectingSellerId(null)}
          state={state}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onUpdateState={onUpdateState}
          onShowToast={onShowToast}
          onStartActivityForStore={onStartActivityForStore}
        />
      )}
    </div>
  );
};
