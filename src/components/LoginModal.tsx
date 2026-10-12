import React, { useState } from 'react';
import { AuthSession, AppState } from '../types';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { digits } from '../utils/formatters';
import { Key, Phone, ShieldCheck, Database } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  state: AppState;
  onLoginSuccess: (session: AuthSession) => void;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

function toE164IranianPhone(value: string): string {
  const clean = digits(value).replace(/[^0-9+]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('0098')) return '+' + clean.slice(2);
  if (clean.startsWith('98')) return '+' + clean;
  if (clean.startsWith('0')) return '+98' + clean.slice(1);
  return '+98' + clean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess, onShowToast }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured || !supabase) {
      onShowToast('اتصال پایگاه داده تنظیم نشده است؛ مدیر باید متغیرهای Supabase را تنظیم کند.');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: toE164IranianPhone(phone),
        password,
      });
      if (error || !data.user) throw error || new Error('ورود انجام نشد.');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,role,status')
        .eq('id', data.user.id)
        .single();
      if (profileError) throw profileError;
      if (profile.status !== 'approved') {
        await supabase.auth.signOut();
        throw new Error('حساب کاربری هنوز توسط مدیر تأیید نشده است.');
      }
      if (profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('در این نسخه آزمایشی، ورود عملیاتی فعلاً برای مدیر سامانه فعال است.');
      }
      onLoginSuccess({ admin: true, id: data.user.id });
      onShowToast('با موفقیت به پایگاه داده آزمایشی متصل شدید.');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'ورود ناموفق بود؛ شماره، رمز و تنظیمات Auth را بررسی کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl mx-auto mb-3">⚔</div>
          <h2 className="text-xl font-black text-white">STORE WAR</h2>
          <p className="text-xs text-slate-400 mt-1">نسخه آزمایشی متصل به پایگاه داده واقعی</p>
        </div>
        {!supabaseConfigured && (
          <div className="mb-4 rounded-xl border border-amber-700 bg-amber-950/40 p-3 text-xs leading-6 text-amber-100">
            <Database className="inline w-4 h-4 ml-1" />
            اتصال پایگاه داده هنوز تنظیم نشده است. مقادیر <span dir="ltr">VITE_SUPABASE_URL</span> و <span dir="ltr">VITE_SUPABASE_ANON_KEY</span> باید در تنظیمات محیط اجرا ثبت شوند.
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">شماره موبایل مدیر (با کد کشور پذیرفته می‌شود)</label>
            <div className="relative">
              <input required dir="ltr" autoComplete="username" placeholder="+98912… یا 0912…" value={phone} onChange={e => setPhone(e.target.value)} className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono" />
              <Phone className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">رمز عبور</label>
            <div className="relative">
              <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono" />
              <Key className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
            </div>
          </div>
          <button disabled={busy || !supabaseConfigured} type="submit" className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition-colors shadow-lg">
            <ShieldCheck className="inline w-4 h-4 ml-1" />{busy ? 'در حال اتصال…' : 'ورود امن'}
          </button>
          <p className="text-[11px] text-slate-500 leading-5">حساب مدیر باید از قبل در Supabase Auth ساخته شده باشد و پروفایل آن با نقش admin و وضعیت approved ثبت شده باشد. حساب پیش‌فرض و رمز ثابت در این نسخه وجود ندارد.</p>
        </form>
      </div>
    </div>
  );
};
