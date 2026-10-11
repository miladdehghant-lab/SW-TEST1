import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Layers, ShieldCheck, Zap, Database, Smartphone, X } from 'lucide-react';

interface ArchitectureReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureReviewModal: React.FC<ArchitectureReviewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#283a53] bg-[#16253b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">گزارش ارزیابی فنی و معماری STORE WAR (Pilot V1)</h2>
              <p className="text-xs text-slate-400">تحلیل کدهای ارسالی، دستاوردها، چالش‌ها و نقشه راه پیش‌رو</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-200">
          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-200">
            <p className="font-semibold text-white mb-1">نتیجه کلی بررسی کد:</p>
            پایلوت اولیه شما ساختار مفهومی و عملیاتی بسیار منسجم و دقیقی در حوزه پخش مویرگی (FMCG Sales Execution) دارد. جریان‌های منطقی اعم از سطوح دسترسی سازمانی (RBAC)، چرخه اعتبارسنجی فعالیت‌های میدانی، ایمپورت اکسل فاکتورهای فروش و تبدیل فعالیت به امتیاز گیمیفیکیشن به‌درستی پایه‌ریزی شده‌اند.
          </div>

          {/* 1. What's working great */}
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ۱. دستاوردهای کلیدی که در کد شما پیاده‌سازی شده است:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#17263b] border border-[#283a53]">
                <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  مدل نقش‌ها و تفکیک دسترسی (RBAC)
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تفکیک شفاف بین مدیر سیستم، مدیر نمایندگی، سرپرست فروش، مسئول ثبت اطلاعات و ویزیتورها رعایت شده است؛ فروشنده فقط فروشگاه و فعالیت خود را می‌بیند، در حالی که سرپرست دسترسی تأیید دارد.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#17263b] border border-[#283a53]">
                <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                  <Database className="w-4 h-4" />
                  موتور تطبیق ستون‌های اکسل فروش
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  سیستم هوشمند نگاشت نام مستعار (Aliases) برای عناوین فارسی و انگلیسی فاکتورها، اعتبارسنجی مقادیر عددی و خطایابی سطر‌به‌سطر پیاده شده و مانع از تأیید داده‌های مخدوش می‌شود.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#17263b] border border-[#283a53]">
                <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  چرخه تأیید دو مرحله‌ای و امتیازدهی
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  فعالیت‌های ثبت‌شده (اولین فروش، چیدمان، بازدید) خودبه‌خود امتیاز نمی‌گیرند؛ ابتدا توسط سرپرست یا مدیر بررسی و در صورت احراز شواهد تصویری و مکانی (GPS) تایید و امتیازدهی می‌شوند.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#17263b] border border-[#283a53]">
                <div className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  چرخه عمر فروشگاه‌ها و تارگت ماهانه
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  فروشگاه جدید ابتدا «موقت» ثبت می‌شود و صرفاً پس از تایید اولین فروش رسمی، وضعیت آن به «فعال‌شده» ارتقا می‌یابد؛ تحقق تارگت‌ها نیز بر اساس فاکتورهای تاییدشده سنجیده می‌شود.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Key gaps for production */}
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              ۲. گلوگاه‌ها و چالش‌های فنی مهم که برای عملیاتی‌سازی باید ارتقا یابند:
            </h3>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#17263b] border border-[#283a53] flex items-start gap-3">
                <span className="text-amber-400 font-bold shrink-0">الف)</span>
                <div>
                  <h4 className="font-semibold text-white">محدودیت ذخیره‌سازی محلی (LocalStorage vs Cloud Database)</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    در کد فعلی تمام دیتابیس در LocalStorage ذخیره می‌شود. عکس‌های دوربین با فرمت Base64 حجم بالایی دارند و سقف ۵ مگابایتی مرورگر به‌سرعت پر می‌شود. برای نسخه چندکاربره واقعی نیاز به اتصال به دیتابیس ابری (مانند PostgreSQL یا Firestore) و سرویس آپلود ابری عکس‌ها (S3/Cloud Storage) داریم.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#17263b] border border-[#283a53] flex items-start gap-3">
                <span className="text-amber-400 font-bold shrink-0">ب)</span>
                <div>
                  <h4 className="font-semibold text-white">قابلیت کارکرد آفلاین در مناطق کور آنتن‌دهی (Offline-First PWA)</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    ویزیتورها اغلب در سوپرمارکت‌های زیرزمینی یا حاشیه شهر دسترسی پایدار به اینترنت ندارند. نرم‌افزار باید امکان ذخیره آفلاین فعالیت‌ها و ارسال خودکار در صف انتظار (Sync Queue) را پس از برقراری اینترنت داشته باشد.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#17263b] border border-[#283a53] flex items-start gap-3">
                <span className="text-amber-400 font-bold shrink-0">ج)</span>
                <div>
                  <h4 className="font-semibold text-white">اعتبارسنجی جغرافیایی هوشمند (Geofencing & Anti-Fraud)</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    در حال حاضر مختصات GPS بدون مقایسه با مختصات ثبت‌شده فروشگاه ذخیره می‌شود. در سیستم‌های حرفه‌ای پخش، فاصله فیزیکی ویزیتور تا فروشگاه در لحظه ثبت ویزیت محاسبه می‌شود (مثلاً خطای مجاز حداکثر ۵۰ تا ۱۰۰ متر) تا از ثبت صوری ویزیت جلوگیری شود.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#17263b] border border-[#283a53] flex items-start gap-3">
                <span className="text-amber-400 font-bold shrink-0">د)</span>
                <div>
                  <h4 className="font-semibold text-white">فرمول نهایی اوزان و امتیازدهی گیمیفیکیشن (Composite Score Formula)</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    در کد شما ضرایب وزنی (Coverage: 15, Assortment: 15, Drop: 15, Stock: 10, Repeat: 15, ...) تعریف شده اما هنوز در یک شاخص وزنی نهایی (Composite Index) ادغام نشده است. باید فرمول ترکیب تارگت و امتیاز رفتاری مشخص شود.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Agreed Architecture & Next Steps */}
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              ۳. توافقات استراتژیک نقشه راه و مصوبات فنی:
            </h3>
            <div className="p-4 rounded-xl bg-[#1a2d48] border border-emerald-900/60 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 text-xs flex items-center justify-center shrink-0 font-bold">۱</span>
                <p className="text-xs text-slate-300">
                  <b className="text-white">فرمت مرجع «کارآمد سیستم»:</b> تطبیق کامل با عناوین و خروجی‌های کارآمد سیستم (کد تفصیل، عنوان مشتری، نام بازاریاب، تعداد کارتن، برگه فروش و...) پیاده‌سازی و قالب استاندارد اکسل آن در بخش داده‌های فروش تعبیه شد.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 text-xs flex items-center justify-center shrink-0 font-bold">۲</span>
                <p className="text-xs text-slate-300">
                  <b className="text-white">نقشه راه ۴ فاز یک‌ساله:</b> فاز ۱ (ویزیتورها و چالش‌های هفتگی) فعال است. فاز ۲ (سرپرستان و نبرد تیم‌ها) پیش‌نمایش داده شد و زیرساخت فاز ۳ (مغازه‌داران B2B) و فاز ۴ (مصرف‌کننده نهایی B2C) آماده اتصال است.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 text-xs flex items-center justify-center shrink-0 font-bold">۳</span>
                <p className="text-xs text-slate-300">
                  <b className="text-white">پایلوت ۸ نفره استان یزد و استقرار نهایی:</b> معماری آماده است تا به محض عبور از تست محلی، پایگاه داده آنلاین چندکاربره (Cloud Database) و در نهایت پکیج داکر برای استقرار روی هاست و دامین اختصاصی شرکت کارفرما فعال گردد.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#283a53] bg-[#16253b] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            نسخه آزمایشی مدرن‌شده STORE WAR فعال است؛ می‌توانید با سوئیچ سریع بین نقش‌ها تمام بخش‌ها را تست کنید.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            بستن و ادامه کار با نرم‌افزار
          </button>
        </div>
      </div>
    </div>
  );
};
