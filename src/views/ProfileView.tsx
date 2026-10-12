import React, { useState } from 'react';
import { AppState, User } from '../types';
import { roleLabel, uid, digits } from '../utils/formatters';
import { UserCircle, Shield, Settings, Save, Lock, Key, Eye, EyeOff, CheckCircle, AlertCircle, Phone, Sparkles } from 'lucide-react';

interface ProfileViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onUpdateState,
  onShowToast,
}) => {
  const isSamplePhone = Boolean(currentUser?.isSamplePhone || currentUser?.phone.startsWith('0900000'));
  const [firstName, setFirstName] = useState(currentUser?.firstName || 'میلاد');
  const [lastName, setLastName] = useState(currentUser?.lastName || 'دهقانی');
  const [city, setCity] = useState(currentUser?.city || 'تهران');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  // Password change form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Weights configuration for gamification engine (Admin only)
  const [weights, setWeights] = useState(state.settings.weights);

  // Current user's recorded password
  const currentSavedPassword = currentUser?.password || (isAdmin ? 'Milad@3133' : 'Password123');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    let cleanPhone = currentUser.phone;
    if (isSamplePhone && phone.trim() !== currentUser.phone) {
      const sanitized = digits(phone);
      if (!/^09\d{9}$/.test(sanitized)) {
        onShowToast('شماره موبایل باید ۱۱ رقمی معتبر و با 09 شروع شود.');
        return;
      }
      const duplicate = state.users.some(u => u.id !== currentUser.id && digits(u.phone) === sanitized);
      if (duplicate) {
        onShowToast('این شماره موبایل قبلاً برای کاربر دیگری در سیستم ثبت شده است.');
        return;
      }
      cleanPhone = sanitized;
    }

    const updatedUsers = state.users.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          city: city.trim(),
          phone: cleanPhone,
          isSamplePhone: cleanPhone.startsWith('0900000') ? u.isSamplePhone : false,
          isConvertedUser: true,
        };
      }
      return u;
    });

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser.id,
        action: 'profile.updated',
        details: { firstName, lastName, city },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      users: updatedUsers,
      audit: newAudit,
    });

    onShowToast('اطلاعات پروفایل شما با موفقیت ذخیره گردید.');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!currentPassword) {
      onShowToast('لطفاً ابتدا رمز عبور فعلی خود را وارد کنید.');
      return;
    }

    if (currentPassword !== currentSavedPassword) {
      onShowToast('رمز عبور فعلی واردشده نادرست است.');
      return;
    }

    if (newPassword.length < 6) {
      onShowToast('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    if (newPassword !== confirmPassword) {
      onShowToast('رمز عبور جدید با تکرار آن یکسان نیست.');
      return;
    }

    if (newPassword === currentPassword) {
      onShowToast('رمز عبور جدید نباید مشابه رمز عبور فعلی باشد.');
      return;
    }

    // Update user password in state.users
    const updatedUsers = state.users.map(u => {
      if (u.id === currentUser.id || (isAdmin && (u.role === 'admin' || u.id === 'usr_admin'))) {
        return {
          ...u,
          password: newPassword,
        };
      }
      return u;
    });

    // Also update current user if not in state.users yet
    const hasAdminInUsers = state.users.some(u => u.id === currentUser.id || u.role === 'admin');
    const finalUsers = hasAdminInUsers
      ? updatedUsers
      : [
          {
            ...currentUser,
            password: newPassword,
          },
          ...updatedUsers,
        ];

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser.id,
        action: 'auth.password_changed',
        details: { userId: currentUser.id, role: currentUser.role },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      users: finalUsers,
      audit: newAudit,
    });

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess(true);
    setTimeout(() => setPasswordSuccess(false), 5000);

    onShowToast(
      isAdmin
        ? 'رمز عبور مدیر ارشد با موفقیت تغییر کرد و برای ورود بعدی اعمال شد.'
        : `رمز عبور ${currentUser.firstName} ${currentUser.lastName} با موفقیت به‌روزرسانی شد.`
    );
  };

  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateState({
      ...state,
      settings: {
        ...state.settings,
        weights,
      },
      audit: [
        {
          id: uid('log'),
          at: new Date().toISOString(),
          by: currentUser?.id || 'usr_admin',
          action: 'settings.weights_updated',
          details: weights,
        },
        ...state.audit,
      ],
    });
    onShowToast('ضرایب وزنی موتور امتیازدهی گیمیفیکیشن به‌روزرسانی شد.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Card */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-blue-400" />
          مشخصات کاربری و پرسنلی
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">نام</label>
              <input
                required
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">نام خانوادگی</label>
              <input
                required
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                شماره تماس {isSamplePhone ? '(موقت - نیازمند ویرایش)' : '(غیرقابل تغییر)'}
              </label>
              <div className="relative">
                <input
                  dir="ltr"
                  readOnly={!isSamplePhone}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="09..."
                  className={`w-full p-2.5 rounded-xl border font-mono text-xs ${
                    isSamplePhone
                      ? 'bg-[#0c1727] border-amber-500/60 text-amber-200 focus:border-amber-400 outline-none'
                      : 'bg-[#0c1727]/50 border-[#283a53] text-slate-400 outline-none cursor-not-allowed'
                  }`}
                />
                {isSamplePhone ? (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-3" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                )}
              </div>
              {isSamplePhone && (
                <span className="text-[10px] text-amber-300 mt-1 block">
                  این شماره موقت است. لطفاً شماره موبایل واقعی خود را وارد کرده و دکمه ذخیره را بزنید.
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">شهر محل فعالیت</label>
              <input
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">نقش سازمانی</label>
              <div className="relative">
                <input
                  readOnly
                  value={roleLabel(currentUser?.role)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727]/50 border border-[#283a53] text-slate-400 outline-none cursor-not-allowed"
                />
                <Shield className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">نمایندگی / منطقه تخصیص‌یافته</label>
              <div className="relative">
                <input
                  readOnly
                  value={currentUser?.agency || 'دفتر مرکزی'}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727]/50 border border-[#283a53] text-slate-400 outline-none cursor-not-allowed"
                />
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره تغییرات مشخصات</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password Change Section */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            امنیت و تغییر رمز عبور اختصاصی
          </h3>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>رمز عبور فعال است</span>
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          تمام ویزیتورها، سرپرستان و مدیران می‌توانند رمز عبور ورود خود به سامانه را در این بخش تغییر داده و مدیریت نمایند.
        </p>

        {passwordSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>رمز عبور شما با موفقیت به‌روزرسانی شد. از این پس برای ورود از رمز جدید استفاده فرمایید.</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">رمز عبور فعلی</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  placeholder="رمز عبور فعلی..."
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full p-2.5 pl-9 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                  title={showCurrentPass ? 'مخفی کردن' : 'نمایش'}
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">رمز عبور جدید (حداقل ۶ کاراکتر)</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="رمز عبور جدید..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-2.5 pl-9 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                  title={showNewPass ? 'مخفی کردن' : 'نمایش'}
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">تکرار رمز عبور جدید</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="تکرار رمز عبور جدید..."
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 pl-9 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                  title={showConfirmPass ? 'مخفی کردن' : 'نمایش'}
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>پس از تغییر رمز عبور، برای ورودهای بعدی باید از رمز جدید استفاده کنید.</span>
            </div>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Key className="w-4 h-4" />
              <span>تغییر و ذخیره رمز عبور</span>
            </button>
          </div>
        </form>
      </div>

      {/* Gamification Formula Weights Settings (Admin only) */}
      {isAdmin && (
        <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            تنظیم ضرایب وزنی موتور گیمیفیکیشن (Pilot Score Weights)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            ضرایب زیر سهم هر بخش را در شاخص کل ترکیبی (Composite Performance Index) تعیین می‌کنند:
          </p>

          <form onSubmit={handleSaveWeights} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
                <label className="block text-slate-400 mb-1 font-medium">پوشش فروشگاهی (Coverage %)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={weights.coverage}
                    onChange={e => setWeights({ ...weights, coverage: Number(e.target.value) })}
                    className="w-full p-1.5 rounded-lg bg-[#14233a] border border-[#283a53] text-white font-mono text-center"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
                <label className="block text-slate-400 mb-1 font-medium">تنوع سبد (Assortment)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={weights.assortment}
                    onChange={e => setWeights({ ...weights, assortment: Number(e.target.value) })}
                    className="w-full p-1.5 rounded-lg bg-[#14233a] border border-[#283a53] text-white font-mono text-center"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
                <label className="block text-slate-400 mb-1 font-medium">میانگین فاکتور (Drop Size)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={weights.drop}
                    onChange={e => setWeights({ ...weights, drop: Number(e.target.value) })}
                    className="w-full p-1.5 rounded-lg bg-[#14233a] border border-[#283a53] text-white font-mono text-center"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
                <label className="block text-slate-400 mb-1 font-medium">عدم کسری شلف (OOS/Stock)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={weights.stock}
                    onChange={e => setWeights({ ...weights, stock: Number(e.target.value) })}
                    className="w-full p-1.5 rounded-lg bg-[#14233a] border border-[#283a53] text-white font-mono text-center"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
                <label className="block text-slate-400 mb-1 font-medium">سفارش مجدد (Repeat Orders)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={weights.repeat}
                    onChange={e => setWeights({ ...weights, repeat: Number(e.target.value) })}
                    className="w-full p-1.5 rounded-lg bg-[#14233a] border border-[#283a53] text-white font-mono text-center"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
                <label className="block text-slate-400 mb-1 font-medium">دیداری و پلانوگرام (Visibility)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={weights.visibility}
                    onChange={e => setWeights({ ...weights, visibility: Number(e.target.value) })}
                    className="w-full p-1.5 rounded-lg bg-[#14233a] border border-[#283a53] text-white font-mono text-center"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
                <label className="block text-slate-400 mb-1 font-medium">دقت ثبت و مدارک (Reliability)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={weights.reliability}
                    onChange={e => setWeights({ ...weights, reliability: Number(e.target.value) })}
                    className="w-full p-1.5 rounded-lg bg-[#14233a] border border-[#283a53] text-white font-mono text-center"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1727] border border-[#283a53]">
                <label className="block text-slate-400 mb-1 font-medium">رشد دوره (Growth Rate)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={weights.growth}
                    onChange={e => setWeights({ ...weights, growth: Number(e.target.value) })}
                    className="w-full p-1.5 rounded-lg bg-[#14233a] border border-[#283a53] text-white font-mono text-center"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>به‌روزرسانی ضرایب وزنی</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
