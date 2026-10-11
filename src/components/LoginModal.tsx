import React, { useState } from 'react';
import { AppState, AuthSession, User, UserRole } from '../types';
import { ADMIN_PASSWORD, ADMIN_PHONE, digits, ROLES, uid } from '../utils/formatters';
import { Shield, UserPlus, LogIn, Key, Phone, Check } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  state: AppState;
  onLoginSuccess: (session: AuthSession) => void;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  state,
  onLoginSuccess,
  onUpdateState,
  onShowToast,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login form
  const [phone, setPhone] = useState(ADMIN_PHONE);
  const [password, setPassword] = useState(ADMIN_PASSWORD);

  // Signup form
  const [suFirst, setSuFirst] = useState('');
  const [suLast, setSuLast] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suNational, setSuNational] = useState('');
  const [suCity, setSuCity] = useState('یزد');
  const [suAgency, setSuAgency] = useState('یزد - منطقه ۱');
  const [suRole, setSuRole] = useState<UserRole>('seller');
  const [suPassword, setSuPassword] = useState('Password123');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = digits(phone);

    const adminUser = state.users.find(u => u.role === 'admin' || u.id === 'usr_admin');
    const adminExpectedPhone = adminUser?.phone ? digits(adminUser.phone) : ADMIN_PHONE;
    const adminExpectedPass = adminUser?.password || ADMIN_PASSWORD;

    if (cleanPhone === adminExpectedPhone && password === adminExpectedPass) {
      onLoginSuccess({ admin: true, id: adminUser?.id || 'usr_admin' });
      onShowToast('با موفقیت به عنوان مدیر ارشد سیستم وارد شدید.');
      return;
    }

    const user = state.users.find(u => digits(u.phone) === cleanPhone);
    if (!user || user.password !== password) {
      onShowToast('شماره موبایل یا رمز عبور اشتباه است.');
      return;
    }

    if (user.status !== 'approved') {
      onShowToast(
        user.status === 'pending'
          ? 'درخواست عضویت شما هنوز در انتظار تایید مدیریت است.'
          : 'حساب کاربری شما غیرفعال یا رد شده است.'
      );
      return;
    }

    onLoginSuccess({ admin: false, id: user.id });
    onShowToast(`خوش آمدید، ${user.firstName} ${user.lastName}`);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = digits(suPhone);
    if (!/^09\d{9}$/.test(cleanPhone)) {
      onShowToast('شماره موبایل باید ۱۱ رقمی و با 09 آغاز شود.');
      return;
    }

    if (state.users.some(u => u.phone === cleanPhone) || cleanPhone === ADMIN_PHONE) {
      onShowToast('برای این شماره تلفن قبلاً حساب یا درخواستی ثبت شده است.');
      return;
    }

    const newUser: User = {
      id: uid('usr'),
      firstName: suFirst.trim(),
      lastName: suLast.trim(),
      phone: cleanPhone,
      nationalId: digits(suNational),
      city: suCity.trim(),
      agency: suAgency.trim(),
      role: suRole,
      password: suPassword,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    onUpdateState({
      ...state,
      users: [...state.users, newUser],
    });

    onShowToast('درخواست عضویت شما ثبت گردید و پس از تایید مدیریت فعال خواهد شد.');
    setMode('login');
    setPhone(cleanPhone);
    setPassword(suPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-blue-500/20 mx-auto mb-3">
            ⚔
          </div>
          <h2 className="text-xl font-black text-white">STORE WAR</h2>
          <p className="text-xs text-slate-400 mt-1">سامانه عملیاتی و لیگ تیم فروش</p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">شماره موبایل</label>
              <div className="relative">
                <input
                  required
                  dir="ltr"
                  placeholder="0912..."
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">رمز عبور</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-3 pr-9 py-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                />
                <Key className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-lg shadow-blue-600/20"
            >
              ورود به سیستم
            </button>

            <button
              type="button"
              onClick={() => {
                setPhone(ADMIN_PHONE);
                setPassword(ADMIN_PASSWORD);
              }}
              className="w-full py-2 rounded-xl bg-[#17273d] hover:bg-[#1e3452] border border-[#263c5a] text-blue-300 text-xs font-medium transition-colors"
            >
              پر کردن اطلاعات اکانت مدیر آزمایشی (میلاد دهقانی)
            </button>

            <div className="pt-2 border-t border-[#24374f] text-center">
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ثبت‌نام نیروی جدید در سامانه
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">نام</label>
                <input
                  required
                  value={suFirst}
                  onChange={e => setSuFirst(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">نام خانوادگی</label>
                <input
                  required
                  value={suLast}
                  onChange={e => setSuLast(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">شماره موبایل</label>
                <input
                  required
                  dir="ltr"
                  placeholder="0912..."
                  value={suPhone}
                  onChange={e => setSuPhone(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">کد ملی</label>
                <input
                  required
                  dir="ltr"
                  value={suNational}
                  onChange={e => setSuNational(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">نقش پیشنهادی</label>
                <select
                  value={suRole}
                  onChange={e => setSuRole(e.target.value as UserRole)}
                  className="w-full p-2 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                >
                  {ROLES.filter(r => r.id !== 'admin').map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">شهر</label>
                <input
                  required
                  value={suCity}
                  onChange={e => setSuCity(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">نمایندگی / منطقه</label>
              <input
                required
                value={suAgency}
                onChange={e => setSuAgency(e.target.value)}
                className="w-full p-2 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">رمز عبور (حداقل ۸ کاراکتر)</label>
              <input
                type="password"
                required
                minLength={8}
                value={suPassword}
                onChange={e => setSuPassword(e.target.value)}
                className="w-full p-2 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-lg shadow-blue-600/20"
            >
              ثبت درخواست عضویت
            </button>

            <div className="pt-2 border-t border-[#24374f] text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                بازگشت به صفحه ورود
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
