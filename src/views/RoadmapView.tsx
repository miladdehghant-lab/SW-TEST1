import React, { useState } from 'react';
import { AppState, ProjectPhase, User } from '../types';
import { num } from '../utils/formatters';
import {
  Layers,
  Users,
  Store,
  Gift,
  Server,
  Cloud,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Smartphone
} from 'lucide-react';

interface RoadmapViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onUpdateState,
  onShowToast,
}) => {
  const currentPhase = state.settings.currentPhase || 'phase1_visitors';

  const handleSelectPhase = (phase: ProjectPhase) => {
    if (!isAdmin) {
      onShowToast('تغییر فاز پروژه فقط توسط مدیر سیستم امکان‌پذیر است.');
      return;
    }
    onUpdateState({
      ...state,
      settings: {
        ...state.settings,
        currentPhase: phase,
      },
    });
    onShowToast(`فاز پروژه به ${getPhaseTitle(phase)} تغییر یافت.`);
  };

  function getPhaseTitle(p: ProjectPhase) {
    switch (p) {
      case 'phase1_visitors':
        return 'فاز ۱: ویزیتورها و فروشندگان';
      case 'phase2_supervisors':
        return 'فاز ۲: سرپرستان و تیم‌های فروش';
      case 'phase3_retailers':
        return 'فاز ۳: مغازه‌داران و خرده‌فروشی';
      case 'phase4_consumers':
        return 'فاز ۴: مصرف‌کننده نهایی';
    }
  }

  // Simulated Team League for Phase 2
  const team1Members = state.users.filter(u => u.supervisorId === 'usr_sup_1');
  const team1Score = state.scoreEvents
    .filter(e => team1Members.some(m => m.id === e.userId))
    .reduce((s, e) => s + e.points, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-[#121e30] border border-blue-800/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-cyan-400">نقشه راه ۱ ساله توسعه STORE WAR</span>
          <span className="text-slate-500">·</span>
          <span className="text-xs text-slate-300">طول دوره: حداقل ۱ سال برای سبد محصولات شرکت مادر</span>
        </div>
        <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-blue-400" />
          <span>معماری ۴ فاز توسعه پلتفرم و استقرار میدانی</span>
        </h2>
        <p className="text-xs text-slate-300 mt-2 max-w-3xl leading-relaxed">
          این پلتفرم بر اساس استراتژی شما در ۴ فصل (فاز ۳ ماهه) پیاده‌سازی و مستقر می‌شود. در حال حاضر فاز ۱ به صورت فعال کلید خورده و زیرساخت فازهای بعدی آماده اتصال است.
        </p>
      </div>

      {/* 4 Phases Visual Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Phase 1 */}
        <div
          onClick={() => handleSelectPhase('phase1_visitors')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            currentPhase === 'phase1_visitors'
              ? 'bg-[#15273f] border-blue-500 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/40'
              : 'bg-[#121e30] border-[#283a53] hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-blue-400 bg-blue-950/70 px-2 py-0.5 rounded-lg border border-blue-800">
              فصل اول (ماه ۱ تا ۳)
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              در حال اجرا 🟢
            </span>
          </div>

          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold mb-3">
            <Users className="w-5 h-5" />
          </div>

          <h3 className="text-sm font-bold text-white mb-1.5">فاز ۱: ویزیتورها و میدان فروش</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            رقابت فردی ویزیتورها، چالش‌های هفتگی، ثبت شواهد عکاسی قبل/بعد چیدمان، ثبت GPS و تطبیق اکسل‌های فروش.
          </p>

          <div className="pt-3 border-t border-[#1e2f47] text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>رقابت ویزیتورها فعال</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ماژول چالش هفتگی متصل</span>
            </div>
          </div>
        </div>

        {/* Phase 2 */}
        <div
          onClick={() => handleSelectPhase('phase2_supervisors')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            currentPhase === 'phase2_supervisors'
              ? 'bg-[#15273f] border-blue-500 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/40'
              : 'bg-[#121e30] border-[#283a53] hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-purple-400 bg-purple-950/70 px-2 py-0.5 rounded-lg border border-purple-800">
              فصل دوم (ماه ۴ تا ۶)
            </span>
            <span className="text-[10px] text-slate-400">فاز بعدی</span>
          </div>

          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>

          <h3 className="text-sm font-bold text-white mb-1.5">فاز ۲: سرپرستان و نبرد تیم‌ها</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            ورود سرپرستان فروش و فعال‌سازی لیگ تیم‌ها؛ ویزیتورها حفظ می‌شوند و امتیاز تیم از عملکرد سرانه و تحقق تارگت ساخته می‌شود.
          </p>

          <div className="pt-3 border-t border-[#1e2f47] text-[11px] text-slate-300 space-y-1">
            <div className="text-cyan-300">· لیگ سرپرست الف vs ب</div>
            <div className="text-cyan-300">· پایش سرانه فروش هر تیم</div>
          </div>
        </div>

        {/* Phase 3 */}
        <div
          onClick={() => handleSelectPhase('phase3_retailers')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            currentPhase === 'phase3_retailers'
              ? 'bg-[#15273f] border-blue-500 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/40'
              : 'bg-[#121e30] border-[#283a53] hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded-lg border border-amber-800">
              فصل سوم (ماه ۷ تا ۹)
            </span>
            <span className="text-[10px] text-slate-400">افق میان‌مدت</span>
          </div>

          <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold mb-3">
            <Store className="w-5 h-5" />
          </div>

          <h3 className="text-sm font-bold text-white mb-1.5">فاز ۳: ترغیب مغازه‌داران (B2B)</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            مغازه‌دار متوجه ارزش چیدمان، پلانوگرام و تنوع سبد می‌شود؛ پنل باشگاه مشتریان، پاداش وفاداری و ثبت مستقیم فاکتور فعال می‌گردد.
          </p>

          <div className="pt-3 border-t border-[#1e2f47] text-[11px] text-slate-300 space-y-1">
            <div className="text-amber-300">· پنل سفارش اختصاصی مغازه</div>
            <div className="text-amber-300">· امتیاز حفظ شلف استاندارد</div>
          </div>
        </div>

        {/* Phase 4 */}
        <div
          onClick={() => handleSelectPhase('phase4_consumers')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            currentPhase === 'phase4_consumers'
              ? 'bg-[#15273f] border-blue-500 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/40'
              : 'bg-[#121e30] border-[#283a53] hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-rose-400 bg-rose-950/70 px-2 py-0.5 rounded-lg border border-rose-800">
              فصل چهارم (ماه ۱۰ تا ۱۲)
            </span>
            <span className="text-[10px] text-slate-400">افق نهایی</span>
          </div>

          <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold mb-3">
            <Gift className="w-5 h-5" />
          </div>

          <h3 className="text-sm font-bold text-white mb-1.5">فاز ۴: مصرف‌کننده نهایی (B2C)</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            تکمیل زنجیره با اسکن کد قرعه‌کشی روی بسته‌بندی، کش‌بک و کشش تقاضا از کف قفسه (Pull Strategy) برای تحریک خریدار واقعی.
          </p>

          <div className="pt-3 border-t border-[#1e2f47] text-[11px] text-slate-300 space-y-1">
            <div className="text-rose-300">· اسکن QR روی محصول</div>
            <div className="text-rose-300">· گردونه شانس و جایزه نهایی</div>
          </div>
        </div>
      </div>

      {/* Phase 2 Interactive Preview: Supervisor & Team League */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#283a53] pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              پیش‌نمایش لیگ تیمی سرپرستان فروش (ویژه فاز ۲)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              در این مدل، امتیاز کل تیم از جمع امتیاز اعضا و تحقق تارگت گروهی محاسبه می‌شود:
            </p>
          </div>
          <span className="text-xs text-purple-300 bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-800">
            فاز ۲ آماده اتصال است
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#16253c] text-slate-300">
              <tr>
                <th className="py-2.5 px-4">رتبه</th>
                <th className="py-2.5 px-4">نام تیم / سرپرست</th>
                <th className="py-2.5 px-4">منطقه</th>
                <th className="py-2.5 px-4">تعداد ویزیتورها</th>
                <th className="py-2.5 px-4">مجموع امتیاز تیم</th>
                <th className="py-2.5 px-4">میانگین سرانه</th>
                <th className="py-2.5 px-4">وضعیت تحقق تارگت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f47]">
              <tr className="hover:bg-[#16253c]/50">
                <td className="py-3 px-4 font-bold text-amber-400">۱ 🥇</td>
                <td className="py-3 px-4 font-semibold text-white">تیم شهید قندی (سرپرست: امیرحسین رضایی)</td>
                <td className="py-3 px-4 text-slate-400">یزد - منطقه ۱</td>
                <td className="py-3 px-4 tabular-nums text-slate-300">{num(team1Members.length)} ویزیتور</td>
                <td className="py-3 px-4 font-bold text-cyan-400 tabular-nums">{num(team1Score)} امتیاز</td>
                <td className="py-3 px-4 font-mono text-slate-200 tabular-nums">
                  {num(Math.round(team1Score / (team1Members.length || 1)))}
                </td>
                <td className="py-3 px-4 text-emerald-400 font-bold">۸۸٪ تحقق</td>
              </tr>
              <tr className="hover:bg-[#16253c]/50">
                <td className="py-3 px-4 font-bold text-slate-300">۲ 🥈</td>
                <td className="py-3 px-4 font-semibold text-white">تیم صفائیه و تفت (سرپرست: رضا کمالی)</td>
                <td className="py-3 px-4 text-slate-400">یزد - منطقه ۲</td>
                <td className="py-3 px-4 tabular-nums text-slate-300">۴ ویزیتور</td>
                <td className="py-3 px-4 font-bold text-cyan-400 tabular-nums">۱۸ امتیاز</td>
                <td className="py-3 px-4 font-mono text-slate-200 tabular-nums">۴.۵</td>
                <td className="py-3 px-4 text-blue-400 font-bold">۷۴٪ تحقق</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Online Pilot & Self-Hosting Architecture Section */}
      <div className="bg-[#121e30] border border-blue-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#283a53] pb-3">
          <Server className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white">
              معماری استقرار آنلاین، PWA و سرور اختصاصی
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              برنامه‌ریزی دقیق برای تست چندکاربره بر روی موبایل، تبلت و دسکتاپ و استقرار نهایی
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#0c1727] border border-[#24374f]">
            <div className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              ۱. دسترسی موبایل تیم میدانی (PWA)
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              ویزیتورها می‌توانند آدرس وب‌اپلیکیشن را روی گوشی‌های اندروید و iOS خود به صورت اپلیکیشن (Install PWA) نصب کنند و دوربین، مکان‌یاب و ثبت میدانی را در هر پلتفرمی اجرا کنند.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0c1727] border border-[#24374f]">
            <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
              <Cloud className="w-4 h-4" />
              ۲. پایگاه داده ابری چندکاربره زنده
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              به محض ثبت ویزیت توسط هر یک از ویزیتورها در سطح شهر، تغییر رتبه به صورت Real-time روی تبلت سرپرست و دسکتاپ مدیریت ظاهر می‌شود.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0c1727] border border-[#24374f]">
            <div className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
              <Server className="w-4 h-4" />
              ۳. استقرار روی هاست و دامین اختصاصی
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              پروژه دارای ساختار استاندارد وب و خروجی است که به راحتی روی هر سرور ابری، دیتابیس آنلاین و دامین اختصاصی شرکت مستقر و قابل بهره‌برداری می‌شود.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
