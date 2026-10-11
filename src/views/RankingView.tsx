import React, { useState } from 'react';
import { AppState, User } from '../types';
import { monthDefault, monthLabel, num } from '../utils/formatters';
import { Trophy, Medal, Award, Flame, Star, CheckCircle, Shield } from 'lucide-react';

interface RankingViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
}

export const RankingView: React.FC<RankingViewProps> = ({
  currentUser,
  isAdmin,
  state,
}) => {
  const [tab, setTab] = useState<'cumulative' | 'monthly'>('cumulative');
  const currentMonth = monthDefault();

  const currentUserId = currentUser?.id || 'usr_admin';

  // Compute scores per seller
  const approvedSellers = state.users.filter(u => u.status === 'approved' && u.role === 'seller');

  const getScoreForUser = (userId: string, monthFilter?: string) => {
    return state.scoreEvents
      .filter(e => e.userId === userId && (!monthFilter || e.month === monthFilter))
      .reduce((sum, e) => sum + e.points, 0);
  };

  const cumulativeLeaderboard = approvedSellers
    .map(u => ({
      user: u,
      score: getScoreForUser(u.id),
      verifiedCount: state.activities.filter(a => a.ownerId === u.id && a.status === 'verified').length,
      activatedStores: state.stores.filter(s => s.ownerId === u.id && s.status === 'activated').length,
    }))
    .sort((a, b) => b.score - a.score);

  const monthlyLeaderboard = approvedSellers
    .map(u => ({
      user: u,
      score: getScoreForUser(u.id, currentMonth),
      verifiedCount: state.activities.filter(
        a => a.ownerId === u.id && a.status === 'verified' && a.createdAt.startsWith(currentMonth.replace('-', '/'))
      ).length,
      activatedStores: state.stores.filter(s => s.ownerId === u.id && s.status === 'activated').length,
    }))
    .sort((a, b) => b.score - a.score);

  const activeList = tab === 'cumulative' ? cumulativeLeaderboard : monthlyLeaderboard;

  const myRank = activeList.findIndex(item => item.user.id === currentUserId) + 1;
  const myTotalScore = getScoreForUser(currentUserId);
  const myMonthScore = getScoreForUser(currentUserId, currentMonth);

  return (
    <div className="space-y-6">
      {/* Top Scorecard */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#14233a] to-[#101b2d] border border-[#263c5a] shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              کارت امتیاز و وضعیت رقابت شما
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl md:text-5xl font-black text-cyan-400 tabular-nums">
                {num(myTotalScore)}
              </span>
              <span className="text-sm text-slate-400 font-medium">امتیاز کل ثبت‌شده</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              محاسبه‌شده بر اساس فعالیت‌های میدانی تاییدشده، مستندات تصویری و داده‌های فروش
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="p-3 rounded-xl bg-[#0c1727]/80 border border-[#283a53] text-center">
              <div className="text-[11px] text-slate-400">رتبه شما</div>
              <div className="text-xl font-extrabold text-amber-300 mt-0.5 tabular-nums">
                {myRank > 0 ? `#${num(myRank)}` : '—'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0c1727]/80 border border-[#283a53] text-center">
              <div className="text-[11px] text-slate-400">امتیاز این ماه</div>
              <div className="text-xl font-extrabold text-white mt-0.5 tabular-nums">
                {num(myMonthScore)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0c1727]/80 border border-[#283a53] text-center">
              <div className="text-[11px] text-slate-400">فروشگاه فعال</div>
              <div className="text-xl font-extrabold text-emerald-400 mt-0.5 tabular-nums">
                {num(state.stores.filter(s => s.ownerId === currentUserId && s.status === 'activated').length)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-[#0c1727] rounded-xl border border-[#283a53] text-xs">
          <button
            onClick={() => setTab('cumulative')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              tab === 'cumulative' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            لیگ تجمعی کل
          </button>
          <button
            onClick={() => setTab('monthly')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              tab === 'monthly' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            لیگ ماه جاری ({monthLabel(currentMonth)})
          </button>
        </div>

        <span className="text-xs text-slate-400">فاز ۱: رقابت انفرادی ویزیتورها</span>
      </div>

      {/* Podium for Top 3 */}
      {activeList.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 md:gap-4 pt-4">
          {/* Silver - Rank 2 */}
          <div className="p-4 rounded-2xl bg-[#121e30] border border-slate-600/40 text-center flex flex-col items-center justify-end h-48 order-1 md:order-1">
            <div className="w-10 h-10 rounded-full bg-slate-400/20 text-slate-300 flex items-center justify-center font-bold mb-2">
              <Medal className="w-5 h-5 text-slate-300" />
            </div>
            <span className="text-xs font-bold text-white">{activeList[1]?.user.firstName} {activeList[1]?.user.lastName}</span>
            <span className="text-[10px] text-slate-400">{activeList[1]?.user.agency}</span>
            <span className="text-base font-extrabold text-slate-300 mt-2 tabular-nums">
              {num(activeList[1]?.score)} امتیاز
            </span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1">مقام دوم</span>
          </div>

          {/* Gold - Rank 1 */}
          <div className="p-4 rounded-2xl bg-gradient-to-t from-[#1b2d49] to-[#203657] border border-amber-500/50 text-center flex flex-col items-center justify-end h-56 shadow-xl shadow-amber-500/10 order-2 md:order-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-2 border border-amber-500/40 shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <span className="text-sm font-extrabold text-white">{activeList[0]?.user.firstName} {activeList[0]?.user.lastName}</span>
            <span className="text-[10px] text-slate-300">{activeList[0]?.user.agency}</span>
            <span className="text-xl font-black text-amber-300 mt-2 tabular-nums">
              {num(activeList[0]?.score)} امتیاز
            </span>
            <span className="text-[11px] text-amber-400 font-bold mt-1">قهرمان لیدربورد 👑</span>
          </div>

          {/* Bronze - Rank 3 */}
          <div className="p-4 rounded-2xl bg-[#121e30] border border-amber-800/40 text-center flex flex-col items-center justify-end h-44 order-3 md:order-3">
            <div className="w-10 h-10 rounded-full bg-amber-700/20 text-amber-600 flex items-center justify-center font-bold mb-2">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-white">{activeList[2]?.user.firstName} {activeList[2]?.user.lastName}</span>
            <span className="text-[10px] text-slate-400">{activeList[2]?.user.agency}</span>
            <span className="text-base font-extrabold text-amber-500 mt-2 tabular-nums">
              {num(activeList[2]?.score)} امتیاز
            </span>
            <span className="text-[10px] text-slate-500 font-semibold mt-1">مقام سوم</span>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#16253c] text-slate-300 border-b border-[#283a53]">
              <tr>
                <th className="py-2.5 px-4 font-semibold w-16">رتبه</th>
                <th className="py-2.5 px-4 font-semibold">فروشنده</th>
                <th className="py-2.5 px-4 font-semibold">نمایندگی / منطقه</th>
                <th className="py-2.5 px-4 font-semibold">فروشگاه فعال‌شده</th>
                <th className="py-2.5 px-4 font-semibold">فعالیت‌های تاییدشده</th>
                <th className="py-2.5 px-4 font-semibold">امتیاز کل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f47]">
              {activeList.map((item, idx) => {
                const isMe = item.user.id === currentUserId;
                return (
                  <tr
                    key={item.user.id}
                    className={`transition-colors ${
                      isMe ? 'bg-blue-950/40 font-semibold' : 'hover:bg-[#16253c]/50'
                    }`}
                  >
                    <td className="py-3 px-4 tabular-nums">
                      {idx === 0 ? (
                        <span className="text-amber-400 font-extrabold">۱ 🥇</span>
                      ) : idx === 1 ? (
                        <span className="text-slate-300 font-bold">۲ 🥈</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600 font-bold">۳ 🥉</span>
                      ) : (
                        <span className="text-slate-400 font-mono">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{item.user.firstName} {item.user.lastName}</span>
                        {isMe && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            شما
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{item.user.agency}</td>
                    <td className="py-3 px-4 text-emerald-400 tabular-nums">{num(item.activatedStores)} فروشگاه</td>
                    <td className="py-3 px-4 text-slate-300 tabular-nums">{num(item.verifiedCount)} اقدام</td>
                    <td className="py-3 px-4 font-black text-cyan-400 tabular-nums text-sm">
                      {num(item.score)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note about phase 2 team battle */}
      <div className="p-4 rounded-xl bg-[#14233a] border border-[#283a53] text-xs text-slate-300 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-white mb-1">نقشه راه فاز ۲: مسابقات تیمی و لیگ نمایندگی‌ها</h4>
          <p className="text-slate-400 leading-relaxed">
            در فاز دوم پایلوت، مسابقات بین شعب (مثلاً منطقه ۱ در برابر منطقه ۲، یا تیم الف در برابر تیم ب) بر مبنای میانگین سرانه تحقق اهداف، پوشش عمودی کالاها (Assortment) و رشد دوره‌ای فروشگاه‌ها به جدول رده‌بندی اضافه خواهد شد.
          </p>
        </div>
      </div>
    </div>
  );
};
