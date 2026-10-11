import React, { useState } from 'react';
import { AppState, User, LostOpportunity } from '../types';
import { calculateLostOpportunities } from '../utils/opportunityEngine';
import { num } from '../utils/formatters';
import { AlertTriangle, Clock, ArrowLeft, Store as StoreIcon, ShieldAlert, Award, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface LostPointsAlertCardProps {
  state: AppState;
  currentUser: User | null;
  isAdmin: boolean;
  onStartActivityForStore?: (storeId: string) => void;
  onOpenSellerDossier?: (sellerId: string) => void;
}

export const LostPointsAlertCard: React.FC<LostPointsAlertCardProps> = ({
  state,
  currentUser,
  isAdmin,
  onStartActivityForStore,
  onOpenSellerDossier,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('all');

  const isSeller = currentUser?.role === 'seller';
  const targetUserId = isSeller ? currentUser.id : selectedSellerFilter === 'all' ? undefined : selectedSellerFilter;

  const lostOpportunities = calculateLostOpportunities(state, targetUserId);
  const totalMissedPoints = lostOpportunities.reduce((sum, o) => sum + o.missedPoints, 0);

  if (lostOpportunities.length === 0) {
    return null;
  }

  // Get distinct sellers in lost opportunities for manager filter
  const sellerOptions = Array.from(new Set(lostOpportunities.map(o => o.userId))).map(id => {
    const user = state.users.find(u => u.id === id);
    const count = lostOpportunities.filter(o => o.userId === id).length;
    const points = lostOpportunities.filter(o => o.userId === id).reduce((s, o) => s + o.missedPoints, 0);
    return { id, name: user ? `${user.firstName} ${user.lastName}` : id, count, points };
  });

  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-950/50 via-[#181824] to-[#121c2d] border border-amber-500/40 overflow-hidden shadow-xl shadow-amber-950/20">
      {/* Header Bar */}
      <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>هشدار فرصت‌ها و امتیازهای از دست رفته (Lost Points)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {num(totalMissedPoints)} امتیاز از دست رفت
                </span>
              </h3>
            </div>
            <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
              {isSeller ? (
                <>
                  آقای <strong className="text-white">{currentUser.firstName} {currentUser.lastName}</strong>، در چند روز گذشته برای فروشگاه‌های زیر فاکتور فروش در سیستم ثبت شده اما هیچ فعالیت میدانی ثبت نکرده‌اید! می‌توانستید این امتیازات را کسب کنید:
                </>
              ) : (
                <>
                  فاکتورهای فروش در سیستم ثبت شده‌اند اما اقدامی توسط ویزیتورها جهت ویزیت، چیدمان یا ثبت عکس صورت نگرفته و امتیازات سوخته است.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {!isSeller && sellerOptions.length > 1 && (
            <select
              value={selectedSellerFilter}
              onChange={e => setSelectedSellerFilter(e.target.value)}
              className="text-xs bg-[#0c1727] border border-amber-500/30 text-amber-200 rounded-xl px-2.5 py-1.5 outline-none"
            >
              <option value="all">همه ویزیتورها ({lostOpportunities.length} مورد)</option>
              {sellerOptions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.count} فرصت - {num(s.points)} امتیاز)
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded List */}
      {expanded && (
        <div className="p-4 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lostOpportunities.slice(0, 6).map(opp => {
              return (
                <div
                  key={opp.id}
                  className="p-3.5 rounded-xl bg-[#0c1727]/90 border border-[#283a53] hover:border-amber-500/40 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <StoreIcon className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
                        <h4 className="text-xs font-bold text-white line-clamp-1">{opp.storeName}</h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold shrink-0">
                        -{num(opp.missedPoints)} امتیاز
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>شماره فاکتور:</span>
                        <span className="font-mono text-slate-200" dir="ltr">{opp.invoiceNumber}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>حجم فروش در فاکتور:</span>
                        <span className="font-bold text-cyan-300">{num(opp.cartons)} کارتن</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>ویزیتور مسئول:</span>
                        <span className="text-amber-200">{opp.sellerName}</span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#1e2f47] flex items-center gap-1.5 text-[10px] text-amber-300/80">
                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>فاکتور {opp.daysAgo} روز پیش صادر شده اما ثبتی نداشتید!</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {onStartActivityForStore && opp.storeId && (
                      <button
                        onClick={() => onStartActivityForStore(opp.storeId!)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] transition-colors shadow-sm"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>ثبت فعالیت و جبران امتیاز</span>
                      </button>
                    )}
                    {onOpenSellerDossier && !isSeller && (
                      <button
                        onClick={() => onOpenSellerDossier(opp.userId)}
                        className="py-1.5 px-2.5 rounded-lg bg-[#18283e] hover:bg-[#203654] text-slate-300 hover:text-white text-[11px] transition-colors"
                        title="بررسی کارنامه ۳۶۰ این ویزیتور"
                      >
                        کارنامه
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {lostOpportunities.length > 6 && (
            <div className="text-center pt-2">
              <span className="text-xs text-amber-300/70">
                و تعداد {lostOpportunities.length - 6} فاکتور دیگر بدون فعالیت میدانی ثبت‌شده...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
