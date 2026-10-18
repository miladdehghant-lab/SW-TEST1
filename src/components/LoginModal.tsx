import React, { useEffect, useState } from 'react';
import { AuthSession, AppState } from '../types';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { Database, UserPlus, Mail, ArrowLeft, Smartphone } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  state: AppState;
  onLoginSuccess: (session: AuthSession) => void;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

type Screen = 'login' | 'signup' | 'forgot' | 'reset';


const fieldClass = 'w-full px-3 py-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess, onShowToast }) => {
  const [screen, setScreen] = useState<Screen>('login');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'seller' | 'supervisor' | 'support' | 'rep'>('seller');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

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
    setFeedback(null);
    setBusy(true);
    try {
      const rawIdentifier = identifier.trim();
      const isEmail = rawIdentifier.includes('@');
      const normalizedPhone = rawIdentifier.replace(/[\s()-]/g, '').replace(/^0098/, '+98').replace(/^0(?=9\d{9}$)/, '+98');
      const { data, error } = await supabase.auth.signInWithPassword(
        isEmail ? { email: rawIdentifier, password } : { phone: normalizedPhone, password }
      );
      if (error || !data.user) throw error || new Error('ورود انجام نشد.');
      const { data: profile, error: profileError } = await supabase.from('profiles').select('id,role,status').eq('id', data.user.id).single();
      if (profileError) throw profileError;
      if (profile.status !== 'approved') {
        await supabase.auth.signOut();
        throw new Error('درخواست حساب شما هنوز توسط مدیر تأیید نشده است.');
      }
      onLoginSuccess({ admin: profile.role === 'admin', id: data.user.id });
      setFeedback({ kind: 'success', message: 'ورود موفق بود؛ در حال باز کردن داشبورد…' });
      onShowToast('با موفقیت وارد STORE WAR شدید.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ورود ناموفق بود؛ شماره موبایل یا ایمیل مدیر و رمز عبور را بررسی کنید.';
      setFeedback({ kind: 'error', message });
      onShowToast(message);
    } finally { setBusy(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return onShowToast('اتصال Supabase تنظیم نشده است.');
    setFeedback(null);
    setBusy(true);
    try {
      const message = 'بازیابی رمز در نسخه فعلی از طریق مسئول مستقیم یا مدیر سامانه انجام می‌شود. برای احراز هویت با مسئول سازمانی خود تماس بگیرید.';
      setFeedback({ kind: 'success', message });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ارسال لینک بازیابی انجام نشد.';
      setFeedback({ kind: 'error', message });
      onShowToast(message);
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
      const cleanPhone = identifier.trim().replace(/[\s()-]/g, '');
      if (!/^09\d{9}$/.test(cleanPhone)) throw new Error('شماره موبایل باید ۱۱ رقم و با 09 شروع شود.');
      const authPhone = `+98${cleanPhone.slice(1)}`;
      const { data, error } = await supabase.auth.signUp({
        phone: authPhone,
        password,
        options: { data: { display_name: name.trim(), requested_role: role, phone: cleanPhone } }
      });
      if (error) throw error;
      if (data.user) {
        setScreen('login');
        setFeedback({ kind: 'success', message: 'درخواست ثبت‌نام ایجاد شد. پس از بررسی هویت و تأیید مدیر سازمان، امکان ورود خواهید داشت.' });
        onShowToast('درخواست ثبت‌نام ثبت شد؛ منتظر تأیید مدیر بمانید.');
      }
      setPassword('');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'ثبت‌نام انجام نشد؛ تنظیمات تأیید ایمیل و پایگاه داده را بررسی کنید.');
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
        {feedback && <div role="status" className={`mb-4 rounded-xl border p-3 text-sm leading-6 ${feedback.kind === 'error' ? 'border-red-700 bg-red-950/50 text-red-100' : 'border-emerald-700 bg-emerald-950/40 text-emerald-100'}`}>{feedback.message}</div>}
        <form onSubmit={submit} className="space-y-4 text-xs">
          {screen === 'signup' && <>
            <div><label className="block text-slate-400 mb-1">نام و نام خانوادگی</label><input required value={name} onChange={e => setName(e.target.value)} className={fieldClass} autoComplete="name" /></div>
            <div><label className="block text-slate-400 mb-1">نقش درخواستی</label><select value={role} onChange={e => setRole(e.target.value as typeof role)} className={fieldClass}><option value="seller">فروشنده</option><option value="supervisor">سرپرست فروش</option><option value="support">کارشناس پشتیبانی فروش</option><option value="rep">نماینده</option></select><p className="text-slate-500 mt-1">نقش و دسترسی نهایی پس از بررسی مدیر تعیین می‌شود.</p></div>
          </>}
          {(screen === 'login' || screen === 'signup') && <div><label className="block text-slate-400 mb-1">{screen === 'login' ? 'شماره موبایل (مدیر فعلی می‌تواند ایمیلش را وارد کند)' : 'شماره موبایل'}</label><div className="relative"><input required dir="ltr" autoComplete="username" placeholder={screen === 'login' ? '0912... یا admin@example.com' : '0912...'} value={identifier} onChange={e => setIdentifier(e.target.value)} className={fieldClass + ' pl-3 pr-9'} /><Smartphone className="w-4 h-4 text-slate-500 absolute right-3 top-3" /></div></div>}
          {screen === 'forgot' && <p className="text-slate-300 leading-6">بازیابی رمز از طریق مسئول مستقیم یا مدیر سامانه انجام می‌شود. برای احراز هویت با مسئول سازمانی خود تماس بگیرید.</p>}
          {(screen === 'login' || screen === 'signup') && <div><label className="block text-slate-400 mb-1">رمز عبور {screen === 'signup' && '(حداقل ۸ کاراکتر)'}</label><input required minLength={screen === 'signup' ? 8 : undefined} type="password" autoComplete={screen === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} className={fieldClass} /></div>}
          {screen === 'reset' && <div><label className="block text-slate-400 mb-1">رمز عبور جدید (حداقل ۸ کاراکتر)</label><input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={fieldClass} /></div>}
          <button disabled={busy || !supabaseConfigured} type="submit" className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition-colors shadow-lg">{busy ? 'در حال انجام…' : titles[screen]}</button>
        </form>
        <div className="flex flex-col items-center gap-3 mt-5 text-xs">
          {screen === 'login' && <><button type="button" onClick={() => { setFeedback(null); setScreen('forgot'); }} className="text-blue-300 hover:text-white">فراموشی رمز عبور</button><button type="button" onClick={() => { setFeedback(null); setScreen('signup'); }} className="text-cyan-300 hover:text-white"><UserPlus className="inline w-4 h-4 ml-1" />ثبت‌نام کاربر جدید</button></>}
          {screen !== 'login' && screen !== 'reset' && <button type="button" onClick={() => { setFeedback(null); setScreen('login'); }} className="text-slate-300 hover:text-white"><ArrowLeft className="inline w-4 h-4 ml-1" />بازگشت به ورود</button>}
          {screen === 'reset' && <p className="text-slate-400 text-center leading-5">اگر این صفحه پس از کلیک روی لینک ایمیل باز شده، رمز جدید را وارد کنید.</p>}
        </div>
        {screen === 'login' && <p className="text-[11px] text-slate-500 leading-5 mt-5 text-center">حساب باید در Supabase ساخته شده باشد و پس از تأیید مدیر امکان ورود خواهد داشت. ورود روزمره با شماره موبایل و رمز عبور است.</p>}
      </div>
    </div>
  );
};
