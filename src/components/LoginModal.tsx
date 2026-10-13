import React, { useEffect, useState } from 'react';
import { AuthSession, AppState } from '../types';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { digits } from '../utils/formatters';
import { Key, Phone, ShieldCheck, Database, UserPlus, Mail, ArrowLeft } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  state: AppState;
  onLoginSuccess: (session: AuthSession) => void;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

type Screen = 'login' | 'signup' | 'forgot' | 'reset';

function toE164IranianPhone(value: string): string {
  const clean = digits(value).replace(/[^0-9+]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('0098')) return '+' + clean.slice(2);
  if (clean.startsWith('98')) return '+' + clean;
  if (clean.startsWith('0')) return '+98' + clean.slice(1);
  return '+98' + clean;
}

const fieldClass = 'w-full px-3 py-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess, onShowToast }) => {
  const [screen, setScreen] = useState<Screen>('login');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'seller' | 'supervisor' | 'support' | 'rep'>('seller');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token=')) setScreen('reset');
  }, []);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured || !supabase) {
      onShowToast('اتصال پایگاه داده تنظیم نشده است؛ تنظیمات Supabase را بررسی کنید.');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ phone: toE164IranianPhone(phone), password });
      if (error || !data.user) throw error || new Error('ورود انجام نشد.');
      const { data: profile, error: profileError } = await supabase.from('profiles').select('id,role,status').eq('id', data.user.id).single();
      if (profileError) throw profileError;
      if (profile.status !== 'approved') {
        await supabase.auth.signOut();
        throw new Error('درخواست حساب شما هنوز توسط مدیر تأیید نشده است.');
      }
      if (profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('در این نسخه آزمایشی، ورود عملیاتی فعلاً برای مدیر سامانه فعال است.');
      }
      onLoginSuccess({ admin: true, id: data.user.id });
      onShowToast('با موفقیت وارد STORE WAR شدید.');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'ورود ناموفق بود؛ شماره، رمز و تنظیمات Auth را بررسی کنید.');
    } finally { setBusy(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return onShowToast('اتصال Supabase تنظیم نشده است.');
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://miladdehghant-lab.github.io/SW-TEST1/'
      });
      if (error) throw error;
      onShowToast('اگر امکان بازیابی برای این حساب فعال باشد، دستورالعمل بازیابی ارسال می‌شود.');
      setScreen('login');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'ارسال لینک بازیابی انجام نشد.');
    } finally { setBusy(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return onShowToast('اتصال Supabase تنظیم نشده است.');
    if (newPassword.length < 8) return onShowToast('رمز جدید باید حداقل ۸ کاراکتر داشته باشد.');
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await supabase.auth.signOut();
      window.history.replaceState({}, document.title, window.location.pathname);
      setPassword('');
      setNewPassword('');
      setScreen('login');
      onShowToast('رمز عبور تغییر کرد. اکنون با رمز جدید وارد شوید.');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'تغییر رمز انجام نشد؛ لینک ممکن است منقضی شده باشد.');
    } finally { setBusy(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return onShowToast('اتصال Supabase تنظیم نشده است.');
    if (password.length < 8) return onShowToast('رمز عبور باید حداقل ۸ کاراکتر داشته باشد.');
    setBusy(true);
    try {
      const normalizedPhone = toE164IranianPhone(phone);
      const { data, error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
        options: { data: { display_name: name.trim(), requested_role: role, phone: normalizedPhone } }
      });
      if (error) throw error;
      if (data.session) {
        setScreen('login');
        onShowToast('درخواست ثبت‌نام ثبت شد؛ پس از تأیید مدیر امکان ورود خواهید داشت.');
      } else {
        onShowToast('درخواست ثبت‌نام ارسال شد. اگر تأیید شماره موبایل در Supabase فعال است، کد پیامکی را تکمیل کنید؛ سپس حساب در انتظار تأیید مدیر خواهد بود.');
        setScreen('login');
      }
      setPassword('');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'ثبت‌نام انجام نشد؛ تنظیمات تأیید شماره و پایگاه داده را بررسی کنید.');
    } finally { setBusy(false); }
  };

  const titles: Record<Screen, string> = {
    login: 'ورود امن',
    signup: 'ثبت‌نام در STORE WAR',
    forgot: 'بازیابی رمز عبور',
    reset: 'تعیین رمز عبور جدید'
  };
  const submit = screen === 'login' ? handleLogin : screen === 'signup' ? handleSignup : screen === 'forgot' ? handleForgot : handleReset;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl w-full max-w-md p-6 shadow-2xl my-auto">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl mx-auto mb-3">⚔</div>
          <h2 className="text-xl font-black text-white">STORE WAR</h2>
          <p className="text-xs text-slate-400 mt-1">نسخه آزمایشی متصل به پایگاه داده واقعی</p>
        </div>
        {!supabaseConfigured && <div className="mb-4 rounded-xl border border-amber-700 bg-amber-950/40 p-3 text-xs leading-6 text-amber-100"><Database className="inline w-4 h-4 ml-1" />اتصال پایگاه داده تنظیم نشده است.</div>}
        <h3 className="text-base font-bold text-white mb-4 text-center">{titles[screen]}</h3>
        <form onSubmit={submit} className="space-y-4 text-xs">
          {screen === 'signup' && <>
            <div><label className="block text-slate-400 mb-1">نام و نام خانوادگی</label><input required value={name} onChange={e => setName(e.target.value)} className={fieldClass} autoComplete="name" /></div>
            <div><label className="block text-slate-400 mb-1">نقش درخواستی</label><select value={role} onChange={e => setRole(e.target.value as typeof role)} className={fieldClass}><option value="seller">فروشنده</option><option value="supervisor">سرپرست فروش</option><option value="support">کارشناس پشتیبانی فروش</option><option value="rep">نماینده</option></select><p className="text-slate-500 mt-1">نقش و دسترسی نهایی پس از بررسی مدیر تعیین می‌شود.</p></div>
          </>}
          {(screen === 'login' || screen === 'signup') && <div><label className="block text-slate-400 mb-1">شماره موبایل</label><div className="relative"><input required dir="ltr" autoComplete="tel" placeholder="+98912… یا 0912…" value={phone} onChange={e => setPhone(e.target.value)} className={fieldClass + ' pl-3 pr-9 font-mono'} /><Phone className="w-4 h-4 text-slate-500 absolute right-3 top-3" /></div></div>}
          {screen === 'forgot' && <div><label className="block text-slate-400 mb-1">ایمیل حساب کاربری</label><div className="relative"><input required type="email" dir="ltr" autoComplete="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} className={fieldClass + ' pl-3 pr-9'} /><Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3" /></div><p className="text-slate-500 mt-1">بازیابی از طریق ایمیل ثبت‌شده در حساب Supabase انجام می‌شود.</p></div>}
          {(screen === 'login' || screen === 'signup') && <div><label className="block text-slate-400 mb-1">رمز عبور {screen === 'signup' && '(حداقل ۸ کاراکتر)'}</label><input required minLength={screen === 'signup' ? 8 : undefined} type="password" autoComplete={screen === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} className={fieldClass} /></div>}
          {screen === 'reset' && <div><label className="block text-slate-400 mb-1">رمز عبور جدید (حداقل ۸ کاراکتر)</label><input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={fieldClass} /></div>}
          <button disabled={busy || !supabaseConfigured} type="submit" className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition-colors shadow-lg">{busy ? 'در حال انجام…' : titles[screen]}</button>
        </form>
        <div className="flex flex-col items-center gap-3 mt-5 text-xs">
          {screen === 'login' && <><button type="button" onClick={() => setScreen('forgot')} className="text-blue-300 hover:text-white">فراموشی رمز عبور</button><button type="button" onClick={() => setScreen('signup')} className="text-cyan-300 hover:text-white"><UserPlus className="inline w-4 h-4 ml-1" />ثبت‌نام کاربر جدید</button></>}
          {screen !== 'login' && screen !== 'reset' && <button type="button" onClick={() => setScreen('login')} className="text-slate-300 hover:text-white"><ArrowLeft className="inline w-4 h-4 ml-1" />بازگشت به ورود</button>}
          {screen === 'reset' && <p className="text-slate-400 text-center leading-5">اگر این صفحه پس از کلیک روی لینک ایمیل باز شده، رمز جدید را وارد کنید.</p>}
        </div>
        {screen === 'login' && <p className="text-[11px] text-slate-500 leading-5 mt-5 text-center">حساب باید در Supabase ساخته شده باشد و پس از تأیید مدیر امکان ورود خواهد داشت.</p>}
      </div>
    </div>
  );
};
