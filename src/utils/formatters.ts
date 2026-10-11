import { ActivityType, StorePotential, UserRole } from '../types';

export const ADMIN_PHONE = '09123153133';
export const ADMIN_PASSWORD = 'Milad@3133';

export const PARS_HAYAT_BRANDS = [
  'مولفیکس (Molfix)',
  'ببم (Bebem)',
  'مولپد (Molped)',
  'تنو (Teno)',
  'پاپیا (Papia)',
  'تست (Test)'
] as const;

export const SIMPLE_BRANDS = [
  'مولفیکس',
  'ببم',
  'مولپد',
  'تنو',
  'پاپیا',
  'تست'
] as const;

export const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
  'مرداد', 'شهریور', 'مهر', 'آبان',
  'آذر', 'دی', 'بهمن', 'اسفند'
];

export const ROLES: { id: UserRole; label: string; desc: string }[] = [
  { id: 'admin', label: 'مدیر ارشد سیستم', desc: 'دسترسی کامل، تأیید کاربران، مدیریت کل سامانه' },
  { id: 'rep', label: 'مدیر نمایندگی', desc: 'مدیریت و نظارت بر فعالیت‌ها و فروشگاه‌های نمایندگی' },
  { id: 'supervisor', label: 'سرپرست فروش', desc: 'هدایت فروشندگان زیرمجموعه و بررسی فعالیت‌های میدانی' },
  { id: 'support', label: 'کارشناس داده و پشتیبانی', desc: 'بارگذاری اکسل فروش، تعریف تارگت و تطبیق فاکتورها' },
  { id: 'seller', label: 'فروشنده / ویزیتور', desc: 'ثبت فروشگاه، اجرای فعالیت میدانی، ثبت عکس و مشاهده امتیاز' },
];

export function roleLabel(role?: string): string {
  const match = ROLES.find(r => r.id === role);
  return match ? match.label : role || '—';
}

export function num(n?: number | string | null): string {
  const val = Number(n) || 0;
  return val.toLocaleString('fa-IR');
}

export function digits(v?: string | number | null): string {
  return String(v ?? '')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/\s/g, '');
}

export function norm(s?: string | null): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ');
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function monthDefault(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year')?.value || '1405';
    const m = parts.find(p => p.type === 'month')?.value || '07';
    return `${y}-${m.padStart(2, '0')}`;
  } catch {
    return '1405-07';
  }
}

export function monthLabel(v?: string): string {
  const [y, m] = String(v || monthDefault()).split('-').map(Number);
  const monthName = MONTHS[(m || 1) - 1] || '';
  return `${monthName} ${y || ''}`;
}

export function monthForDate(value: string | Date): string {
  try {
    const d = new Date(value);
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
    }).formatToParts(d);
    const y = parts.find(p => p.type === 'year')?.value || '1405';
    const m = parts.find(p => p.type === 'month')?.value || '07';
    return `${y}-${m.padStart(2, '0')}`;
  } catch {
    return monthDefault();
  }
}

export function fmtDate(isoDate?: string): string {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoDate;
  }
}

export function activityTypeInfo(t: ActivityType): { label: string; desc: string; basePoints: number } {
  switch (t) {
    case 'initial':
      return { label: 'توسعه / اولین فروش', desc: 'بازگشایی و اولین سفارش معتبر فروشگاه', basePoints: 8 };
    case 'repeat':
      return { label: 'سفارش مجدد', desc: 'تکرار سفارش مشتری و تقویت موجودی', basePoints: 6 };
    case 'visit':
      return { label: 'بازدید و ارزیابی موجودی', desc: 'بررسی شلف، موجودی و وضعیت رقبا', basePoints: 2 };
    case 'merch':
      return { label: 'چیدمان و پلانوگرام', desc: 'اصلاح ویترین، استندها و چیدمان برند', basePoints: 5 };
    case 'recovery':
      return { label: 'احیای فروشگاه راکد', desc: 'فعال‌سازی مجدد فروشگاه‌های بدون سفارش', basePoints: 7 };
    default:
      return { label: t, desc: '', basePoints: 1 };
  }
}

export function potentialInfo(p: StorePotential): { label: string; color: string } {
  switch (p) {
    case 'high':
      return { label: 'بالا (VIP)', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
    case 'medium':
      return { label: 'متوسط', color: 'text-blue-400 bg-blue-950/60 border-blue-800' };
    case 'low':
      return { label: 'پایه / کم', color: 'text-slate-400 bg-slate-900/60 border-slate-700' };
  }
}
