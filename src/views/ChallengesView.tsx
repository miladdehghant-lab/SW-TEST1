import React, { useState } from 'react';
import { WeeklyChallenge, AppState, User } from '../types';
import { num, uid, monthDefault } from '../utils/formatters';
import { Trophy, Flame, Plus, CheckCircle, Clock, Sparkles } from 'lucide-react';

interface ChallengesViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const ChallengesView: React.FC<ChallengesViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onUpdateState,
  onShowToast,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('مولفیکس');
  const [targetCount, setTargetCount] = useState('3');
  const [rewardPoints, setRewardPoints] = useState('15');
  const [type, setType] = useState<WeeklyChallenge['type']>('merch');

  const currentUserId = currentUser?.id || 'usr_admin';
  const canManage = isAdmin || currentUser?.role === 'supervisor' || currentUser?.role === 'rep';

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    const newChallenge: WeeklyChallenge = {
      id: uid('ch'),
      title: title.trim(),
      description: description.trim(),
      brand: brand.trim(),
      type,
      targetCount: Number(targetCount) || 1,
      rewardPoints: Number(rewardPoints) || 10,
      startDate: '1405-07-01',
      endDate: '1405-07-15',
      active: true,
      userProgress: {},
    };

    onUpdateState({
      ...state,
      challenges: [newChallenge, ...state.challenges],
      audit: [
        {
          id: uid('log'),
          at: new Date().toISOString(),
          by: currentUser?.id || 'usr_admin',
          action: 'challenge.created',
          details: { title: newChallenge.title, reward: newChallenge.rewardPoints },
        },
        ...state.audit,
      ],
    });

    onShowToast(`چالش جدید "${newChallenge.title}" فعال شد.`);
    setShowAddModal(false);
    setTitle('');
    setDescription('');
  };

  const handleClaimReward = (ch: WeeklyChallenge) => {
    // Add reward points to current seller
    const newScoreEvent = {
      id: uid('scr'),
      userId: currentUserId,
      month: monthDefault(),
      points: ch.rewardPoints,
      sourceType: 'target_bonus' as const,
      sourceId: ch.id,
      description: `جایزه تکمیل چالش هفتگی: ${ch.title}`,
      createdAt: new Date().toISOString(),
    };

    onUpdateState({
      ...state,
      scoreEvents: [newScoreEvent, ...state.scoreEvents],
      audit: [
        {
          id: uid('log'),
          at: new Date().toISOString(),
          by: currentUserId,
          action: 'challenge.claimed',
          details: { challengeId: ch.id, points: ch.rewardPoints },
        },
        ...state.audit,
      ],
    });

    onShowToast(`تبریک! ${num(ch.rewardPoints)} امتیاز جایزه چالش به حساب شما واریز شد! 🎉`);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-[#121e30] border border-amber-600/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-400">فاز ۱: رقابت فردی ویزیتورها</span>
            <span className="text-slate-500">·</span>
            <span className="text-xs text-slate-300">ماموریت‌های ویژه هفتگی</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <span>چالش‌های امتیازی هفتگی (Weekly Quests)</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            ویزیتورها علاوه بر رتبه‌بندی ماهانه، در چالش‌های کوتاه‌مدت هفتگی شرکت می‌کنند تا با تمرکز بر اهداف کلیدی شرکت (مثل پلانوگرام یا سبد کالای خاص) امتیازات ویژه کسب کنند.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف چالش هفتگی جدید</span>
          </button>
        )}
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {state.challenges.map(ch => {
          const userCount = ch.userProgress?.[currentUserId] || 0;
          const pct = Math.min(100, Math.round((userCount / ch.targetCount) * 100));
          const isCompleted = userCount >= ch.targetCount;
          const hasClaimed = state.scoreEvents.some(
            e => e.userId === currentUserId && e.sourceId === ch.id
          );

          return (
            <div
              key={ch.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isCompleted
                  ? 'bg-gradient-to-b from-[#162a3f] to-[#121e30] border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-[#121e30] border-[#283a53]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-800/80">
                    +{num(ch.rewardPoints)} امتیاز جایزه
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    تا {ch.endDate}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1.5">{ch.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{ch.description}</p>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#1e2f47]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">پیشرفت شما:</span>
                  <span className="font-bold text-white tabular-nums">
                    {num(userCount)} از {num(ch.targetCount)} ({num(pct)}%)
                  </span>
                </div>

                <div className="h-2 rounded-full bg-[#17253a] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isCompleted ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {isCompleted ? (
                  hasClaimed ? (
                    <div className="py-2 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>امتیاز جایزه دریافت شد</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleClaimReward(ch)}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-colors flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>دریافت جایزه ({num(ch.rewardPoints)} امتیاز)</span>
                    </button>
                  )
                ) : (
                  <div className="py-1.5 text-center text-[11px] text-slate-500">
                    در حال اجرا توسط تیم ویزیت
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Challenge Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121e30] border border-[#283a53] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">تعریف چالش هفتگی جدید</h3>
            <form onSubmit={handleCreateChallenge} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">عنوان چالش</label>
                <input
                  required
                  placeholder="مثال: چالش شلف طلایی در هایپرمارکت‌ها"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">شرح ماموریت برای ویزیتورها</label>
                <textarea
                  required
                  rows={2}
                  placeholder="اقدامات لازم را توضیح دهید..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">نوع چالش</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  >
                    <option value="merch">چیدمان و پلانوگرام</option>
                    <option value="initial_stores">بازگشایی فروشگاه جدید</option>
                    <option value="qty_sales">حجم و تناژ فروش</option>
                    <option value="repeat_orders">تکرار سفارش مشتری</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">برند هدف</label>
                  <select
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  >
                    <option value="مولفیکس">مولفیکس (Molfix)</option>
                    <option value="ببم">ببم (Bebem)</option>
                    <option value="مولپد">مولپد (Molped)</option>
                    <option value="تنو">تنو (Teno)</option>
                    <option value="پاپیا">پاپیا (Papia)</option>
                    <option value="تست">تست (Test)</option>
                    <option value="سبد کلی محصولات">سبد کلی محصولات</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">هدف عددی (تعداد)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={targetCount}
                    onChange={e => setTargetCount(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">امتیاز پاداش</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={rewardPoints}
                    onChange={e => setRewardPoints(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  فعال‌سازی چالش
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
