import React, { useState } from 'react';
import { User, UserRole, AppState } from '../types';
import { ROLES, roleLabel, digits, uid } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import {
  UserPlus,
  Check,
  X,
  Edit,
  Search,
  Trash2,
  Key,
  Shield,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Users,
  CheckSquare,
  Square,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface UsersViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onUpdateState,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'seller' | 'supervisor' | 'staff' | 'pending' | 'needs_conversion'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPass, setShowEditPass] = useState(false);

  // Convert Visitor to Official System User Modal
  const [convertingUser, setConvertingUser] = useState<User | null>(null);
  const [convertFirst, setConvertFirst] = useState('');
  const [convertLast, setConvertLast] = useState('');
  const [convertPhone, setConvertPhone] = useState('');
  const [convertNationalId, setConvertNationalId] = useState('');
  const [convertRole, setConvertRole] = useState<UserRole>('seller');
  const [convertSupervisorId, setConvertSupervisorId] = useState('');
  const [convertOperationalStatus, setConvertOperationalStatus] = useState<'league' | 'trainee' | 'test'>('league');
  const [convertCity, setConvertCity] = useState('تهران');
  const [convertAgency, setConvertAgency] = useState('منطقه ۱');
  const [convertPassword, setConvertPassword] = useState('Password123');
  const [showConvertPass, setShowConvertPass] = useState(false);

  // Quick Password Reset Modal
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [newPasswordForUser, setNewPasswordForUser] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);

  // Single User Delete Confirm Modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Multi-select for bulk delete / cleanup
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Form states for new user
  const [newPhone, setNewPhone] = useState('');
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('seller');
  const [newAgency, setNewAgency] = useState(currentUser?.agency || 'منطقه ۱');
  const [newCity, setNewCity] = useState(currentUser?.city || 'تهران');
  const [newPassword, setNewPassword] = useState('Password123');
  const [showNewPass, setShowNewPass] = useState(false);

  const canSeeUser = (u: User) => {
    if (isAdmin) return true;
    if (currentUser?.role === 'rep') return u.agency === currentUser.agency;
    if (currentUser?.role === 'supervisor') return u.supervisorId === currentUser.id || u.id === currentUser.id;
    if (currentUser?.role === 'support') return u.agency === currentUser.agency;
    return u.id === currentUser?.id;
  };

  const visibleUsers = state.users.filter(canSeeUser);
  const pendingUsers = visibleUsers.filter(u => u.status === 'pending');

  const filteredApprovedUsers = visibleUsers.filter(u => {
    if (roleFilter === 'pending') return u.status === 'pending';
    if (u.status === 'pending') return false;

    if (roleFilter === 'needs_conversion') {
      return Boolean(u.isSamplePhone || u.phone.startsWith('0900000') || u.isConvertedUser === false);
    }

    if (roleFilter === 'seller' && u.role !== 'seller') return false;
    if (roleFilter === 'supervisor' && u.role !== 'supervisor') return false;
    if (roleFilter === 'staff' && u.role !== 'admin' && u.role !== 'rep' && u.role !== 'support') return false;

    if (!search) return true;
    const q = search.toLowerCase();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return (
      fullName.includes(q) ||
      u.phone.includes(q) ||
      u.agency.toLowerCase().includes(q) ||
      u.city.toLowerCase().includes(q)
    );
  });

  const sellersCount = visibleUsers.filter(u => u.role === 'seller' && u.status !== 'pending').length;
  const supervisorsCount = visibleUsers.filter(u => u.role === 'supervisor' && u.status !== 'pending').length;
  const staffCount = visibleUsers.filter(u => (u.role === 'admin' || u.role === 'rep' || u.role === 'support') && u.status !== 'pending').length;
  const needsConversionCount = visibleUsers.filter(
    u => u.status !== 'pending' && (u.isSamplePhone || u.phone.startsWith('0900000') || u.isConvertedUser === false)
  ).length;

  const handleApprove = (user: User) => {
    const updatedUsers = state.users.map(u => (u.id === user.id ? { ...u, status: 'approved' as const, password: u.password || 'Password123' } : u));
    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'user.approved',
        details: { userId: user.id, name: `${user.firstName} ${user.lastName}` },
      },
      ...state.audit,
    ];
    onUpdateState({ ...state, users: updatedUsers, audit: newAudit });
    onShowToast(`درخواست عضویت ${user.firstName} ${user.lastName} با موفقیت تأیید شد.`);
  };

  const handleReject = (user: User) => {
    const updatedUsers = state.users.map(u => (u.id === user.id ? { ...u, status: 'rejected' as const } : u));
    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'user.rejected',
        details: { userId: user.id, name: `${user.firstName} ${user.lastName}` },
      },
      ...state.audit,
    ];
    onUpdateState({ ...state, users: updatedUsers, audit: newAudit });
    onShowToast(`درخواست عضویت ${user.firstName} ${user.lastName} رد شد.`);
  };

  // Open Convert Visitor Modal
  const handleOpenConvertUser = (u: User) => {
    setConvertingUser(u);
    setConvertFirst(u.firstName);
    setConvertLast(u.lastName);
    setConvertPhone(u.isSamplePhone || u.phone.startsWith('0900000') ? '' : u.phone);
    setConvertNationalId(u.nationalId || '');
    setConvertRole(u.role);
    setConvertSupervisorId(u.supervisorId || '');
    setConvertOperationalStatus(u.operationalStatus || 'league');
    setConvertCity(u.city || 'تهران');
    setConvertAgency(u.agency || 'منطقه ۱');
    setConvertPassword(u.password || 'Password123');
    setShowConvertPass(false);
  };

  // Save Converted User
  const handleSaveConvertUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingUser) return;

    const cleanPhone = digits(convertPhone);
    if (!/^09\d{9}$/.test(cleanPhone)) {
      onShowToast('شماره موبایل باید ۱۱ رقمی معتبر و با 09 شروع شود.');
      return;
    }

    const phoneExists = state.users.some(u => u.id !== convertingUser.id && digits(u.phone) === cleanPhone);
    if (phoneExists) {
      onShowToast('این شماره موبایل قبلاً برای کاربر دیگری در سیستم ثبت شده است.');
      return;
    }

    if (convertPassword.trim().length < 6) {
      onShowToast('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    const updatedUser: User = {
      ...convertingUser,
      firstName: convertFirst.trim(),
      lastName: convertLast.trim(),
      phone: cleanPhone,
      nationalId: convertNationalId.trim() || undefined,
      role: convertRole,
      supervisorId: convertSupervisorId || undefined,
      operationalStatus: convertOperationalStatus,
      city: convertCity.trim(),
      agency: convertAgency.trim(),
      password: convertPassword.trim(),
      isSamplePhone: false,
      isConvertedUser: true,
      status: 'approved',
    };

    const updatedUsers = state.users.map(u => (u.id === convertingUser.id ? updatedUser : u));
    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'user.converted_to_official_user',
        details: {
          userId: updatedUser.id,
          name: `${updatedUser.firstName} ${updatedUser.lastName}`,
          phone: updatedUser.phone,
          role: updatedUser.role,
        },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      users: updatedUsers,
      audit: newAudit,
    });

    setConvertingUser(null);
    onShowToast(`ویزیتور «${updatedUser.firstName} ${updatedUser.lastName}» با موفقیت به کاربر رسمی سامانه تبدیل و اطلاعات ورود او ثبت شد. ✅`);
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      onShowToast('امکان حذف کاربری که در حال حاضر با آن وارد شده‌اید وجود ندارد.');
      setUserToDelete(null);
      return;
    }

    const updatedUsers = state.users.filter(u => u.id !== user.id);
    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'user.deleted',
        details: { userId: user.id, name: `${user.firstName} ${user.lastName}`, role: user.role },
      },
      ...state.audit,
    ];

    onUpdateState({ ...state, users: updatedUsers, audit: newAudit });
    setUserToDelete(null);
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      next.delete(user.id);
      return next;
    });
    onShowToast(`کاربر «${user.firstName} ${user.lastName}» با موفقیت حذف شد.`);
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.size === 0) return;

    // Filter out current user from deletion
    const idsToDelete = Array.from(selectedUserIds).filter(id => id !== currentUser?.id);
    const updatedUsers = state.users.filter(u => !idsToDelete.includes(u.id));

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'users.bulk_deleted',
        details: { count: idsToDelete.length, ids: idsToDelete },
      },
      ...state.audit,
    ];

    onUpdateState({ ...state, users: updatedUsers, audit: newAudit });
    setSelectedUserIds(new Set());
    setShowBulkDeleteConfirm(false);
    onShowToast(`تعداد ${idsToDelete.length} کاربر و ویزیتور متفرقه با موفقیت از سیستم حذف شدند.`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedUsers = state.users.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...editingUser,
          password: editPassword.trim() ? editPassword.trim() : u.password || 'Password123',
        };
      }
      return u;
    });

    onUpdateState({ ...state, users: updatedUsers });
    setEditingUser(null);
    setEditPassword('');
    onShowToast(`اطلاعات و دسترسی کاربر «${editingUser.firstName} ${editingUser.lastName}» به‌روزرسانی شد.`);
  };

  const handleSaveResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser) return;

    if (newPasswordForUser.length < 6) {
      onShowToast('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    const updatedUsers = state.users.map(u => (u.id === resetPassUser.id ? { ...u, password: newPasswordForUser } : u));
    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'user.password_reset_by_admin',
        details: { targetUserId: resetPassUser.id, name: `${resetPassUser.firstName} ${resetPassUser.lastName}` },
      },
      ...state.audit,
    ];

    onUpdateState({ ...state, users: updatedUsers, audit: newAudit });
    setResetPassUser(null);
    setNewPasswordForUser('');
    onShowToast(`رمز عبور جدید برای «${resetPassUser.firstName} ${resetPassUser.lastName}» تنظیم و فعال شد.`);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = digits(newPhone);
    if (!/^09\d{9}$/.test(cleanPhone)) {
      onShowToast('شماره موبایل باید ۱۱ رقمی و با 09 شروع شود.');
      return;
    }
    if (state.users.some(u => digits(u.phone) === cleanPhone)) {
      onShowToast('این شماره موبایل قبلاً در سیستم ثبت شده است.');
      return;
    }

    const newUser: User = {
      id: uid('usr'),
      phone: cleanPhone,
      firstName: newFirst.trim(),
      lastName: newLast.trim(),
      city: newCity.trim(),
      agency: newAgency.trim(),
      role: newRole,
      status: 'approved',
      password: newPassword.trim() || 'Password123',
      createdAt: new Date().toISOString(),
    };

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'user.created',
        details: { userId: newUser.id, role: newUser.role },
      },
      ...state.audit,
    ];

    onUpdateState({ ...state, users: [newUser, ...state.users], audit: newAudit });
    setShowAddModal(false);
    setNewFirst('');
    setNewLast('');
    setNewPhone('');
    setNewPassword('Password123');
    onShowToast(`کاربر جدید (${newUser.firstName} ${newUser.lastName}) با موفقیت ایجاد و رمز عبور تخصیص داده شد.`);
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredApprovedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredApprovedUsers.map(u => u.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary Bar */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              مدیریت کاربران، ویزیتورها و دسترسی‌ها
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              تعریف نیروی میدانی، تنظیم یا ریست رمز عبور اختصاصی، حذف ویزیتورهای متفرقه و تأیید درخواست‌های عضویت
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-blue-600/20"
              >
                <UserPlus className="w-4 h-4" />
                <span>افزودن ویزیتور / کاربر جدید</span>
              </button>
            </div>
          )}
        </div>

        {/* Role Filters Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#1e2f47]">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              roleFilter === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-[#16253c] text-slate-400 hover:text-white'
            }`}
          >
            همه کاربران ({visibleUsers.filter(u => u.status !== 'pending').length})
          </button>
          <button
            onClick={() => setRoleFilter('seller')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              roleFilter === 'seller'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-[#16253c] text-slate-400 hover:text-white'
            }`}
          >
            فروشندگان و ویزیتورها ({sellersCount})
          </button>
          <button
            onClick={() => setRoleFilter('supervisor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              roleFilter === 'supervisor'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-[#16253c] text-slate-400 hover:text-white'
            }`}
          >
            سرپرستان فروش ({supervisorsCount})
          </button>
          <button
            onClick={() => setRoleFilter('staff')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              roleFilter === 'staff'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-[#16253c] text-slate-400 hover:text-white'
            }`}
          >
            ستاد، پشتیبانی و مدیران ({staffCount})
          </button>
          {needsConversionCount > 0 && (
            <button
              onClick={() => setRoleFilter('needs_conversion')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                roleFilter === 'needs_conversion'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>نیازمند تبدیل به کاربر ({needsConversionCount})</span>
            </button>
          )}
          {pendingUsers.length > 0 && (
            <button
              onClick={() => setRoleFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                roleFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              درخواست‌های در انتظار ({pendingUsers.length})
            </button>
          )}
        </div>
      </div>

      {/* Pending Requests Section */}
      {pendingUsers.length > 0 && (roleFilter === 'all' || roleFilter === 'pending') && (
        <div className="bg-[#121e30] border border-amber-500/30 rounded-2xl overflow-hidden">
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-300">درخواست‌های عضویت در انتظار تأیید</h3>
              <p className="text-xs text-amber-200/70 mt-0.5">کاربران جدیدی که از طریق صفحه ورود و ثبت‌نام درخواست داده‌اند</p>
            </div>
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
              {pendingUsers.length} درخواست
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#16253c] text-slate-300">
                <tr>
                  <th className="py-2.5 px-4">نام و نام خانوادگی</th>
                  <th className="py-2.5 px-4">شماره موبایل</th>
                  <th className="py-2.5 px-4">نقش درخواستی</th>
                  <th className="py-2.5 px-4">شهر / نمایندگی</th>
                  <th className="py-2.5 px-4">عملیات تصمیم‌گیری</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2f47]">
                {pendingUsers.map(u => (
                  <tr key={u.id} className="hover:bg-[#16253c]/50">
                    <td className="py-3 px-4 font-semibold text-white">{u.firstName} {u.lastName}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono" dir="ltr">{u.phone}</td>
                    <td className="py-3 px-4 text-slate-300">{roleLabel(u.role)}</td>
                    <td className="py-3 px-4 text-slate-400">{u.city} · {u.agency}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(u)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>تأیید عضویت</span>
                        </button>
                        <button
                          onClick={() => setEditingUser(u)}
                          className="px-2.5 py-1 rounded-lg bg-[#1f324d] hover:bg-[#284266] text-slate-300 text-xs transition-colors"
                        >
                          اصلاح نقش
                        </button>
                        <button
                          onClick={() => handleReject(u)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>رد</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Users Table */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#283a53] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="جستجوی نام، تلفن یا نمایندگی..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-[#0c1727] border border-[#283a53] rounded-xl text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Bulk Actions for Admin */}
          {isAdmin && selectedUserIds.size > 0 && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-rose-300 font-medium">
                {selectedUserIds.size} کاربر انتخاب شده
              </span>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف انتخاب‌شده‌ها</span>
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#16253c] text-slate-300 border-b border-[#283a53]">
              <tr>
                {isAdmin && (
                  <th className="py-2.5 px-3 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 text-slate-400 hover:text-white"
                      title="انتخاب همه"
                    >
                      {selectedUserIds.size === filteredApprovedUsers.length && filteredApprovedUsers.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="py-2.5 px-4 font-semibold">نام و نام خانوادگی</th>
                <th className="py-2.5 px-4 font-semibold">شماره تماس</th>
                <th className="py-2.5 px-4 font-semibold">نقش سازمانی</th>
                <th className="py-2.5 px-4 font-semibold">نمایندگی / منطقه</th>
                <th className="py-2.5 px-4 font-semibold">شهر</th>
                <th className="py-2.5 px-4 font-semibold">وضعیت رمز عبور</th>
                <th className="py-2.5 px-4 font-semibold">وضعیت</th>
                {isAdmin && <th className="py-2.5 px-4 font-semibold text-center">عملیات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f47]">
              {filteredApprovedUsers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="py-8 text-center text-slate-400">
                    کاربری با مشخصات جستجو شده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredApprovedUsers.map(u => {
                  const isSelected = selectedUserIds.has(u.id);
                  const hasPassword = Boolean(u.password);
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-[#16253c]/50 transition-colors ${
                        isSelected ? 'bg-blue-950/30' : ''
                      }`}
                    >
                      {isAdmin && (
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => toggleSelectUser(u.id)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{u.firstName} {u.lastName}</span>
                          {u.id === currentUser?.id && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-normal">
                              شما
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono" dir="ltr">
                        <div className="flex flex-col gap-0.5 items-end">
                          <span className="text-slate-300 font-semibold">{u.phone}</span>
                          {(u.isSamplePhone || u.phone.startsWith('0900000') || u.isConvertedUser === false) && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap font-sans">
                              شماره موقت پیش‌فرض
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] ${
                          u.role === 'admin'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : u.role === 'supervisor'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : u.role === 'seller'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{u.agency}</td>
                      <td className="py-3 px-4 text-slate-400">{u.city}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            hasPassword
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            <Key className="w-3 h-3" />
                            <span>{hasPassword ? 'دارای رمز عبور' : 'فاقد رمز'}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={u.status} />
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Convert to Official User Button */}
                            {(u.isSamplePhone || u.phone.startsWith('0900000') || u.isConvertedUser === false) && (
                              <button
                                onClick={() => handleOpenConvertUser(u)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm shrink-0"
                                title="تکمیل اطلاعات و تبدیل ویزیتور به کاربر رسمی سامانه"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>تبدیل به کاربر</span>
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditPassword(u.password || '');
                              }}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#1f324d] transition-colors"
                              title="ویرایش مشخصات و نقش"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password Button */}
                            <button
                              onClick={() => {
                                setResetPassUser(u);
                                setNewPasswordForUser(u.password || 'Password123');
                              }}
                              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-200 hover:bg-amber-950/40 transition-colors"
                              title="تنظیم یا تغییر رمز عبور"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete User Button */}
                            <button
                              onClick={() => setUserToDelete(u)}
                              disabled={u.id === currentUser?.id}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.id === currentUser?.id
                                  ? 'text-slate-600 cursor-not-allowed'
                                  : 'text-rose-400 hover:text-rose-200 hover:bg-rose-950/40'
                              }`}
                              title={u.id === currentUser?.id ? 'امکان حذف کاربر جاری وجود ندارد' : 'حذف کاربر'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121e30] border border-[#283a53] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-400" />
              افزودن ویزیتور یا کاربر سازمانی جدید
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              اطلاعات پرسنلی و رمز عبور اولیه کاربر را وارد نمایید. کاربر می‌تواند بعداً رمز را در پروفایل تغییر دهد.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">نام</label>
                  <input
                    required
                    value={newFirst}
                    onChange={e => setNewFirst(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">نام خانوادگی</label>
                  <input
                    required
                    value={newLast}
                    onChange={e => setNewLast(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">شماره موبایل (با 09)</label>
                <input
                  required
                  dir="ltr"
                  placeholder="0913..."
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">نقش سازمانی</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  >
                    {ROLES.filter(r => r.id !== 'admin').map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">شهر محل فعالیت</label>
                  <input
                    required
                    value={newCity}
                    onChange={e => setNewCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">نمایندگی / شعبه تخصیصی</label>
                <input
                  required
                  value={newAgency}
                  onChange={e => setNewAgency(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">رمز عبور اختصاصی (حداقل ۶ کاراکتر)</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full p-2.5 pl-9 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  پیش‌فرض: <code className="text-blue-300 font-mono">Password123</code> (کاربر می‌تواند در پروفایل خود تغییر دهد)
                </p>
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20"
                >
                  ایجاد و ذخیره کاربر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121e30] border border-[#283a53] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              ویرایش اطلاعات: {editingUser.firstName} {editingUser.lastName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              می‌توانید مشخصات، نقش، شعبه و رمز عبور کاربر را تغییر دهید.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">نام</label>
                  <input
                    required
                    value={editingUser.firstName}
                    onChange={e => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">نام خانوادگی</label>
                  <input
                    required
                    value={editingUser.lastName}
                    onChange={e => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">نقش سازمانی</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  >
                    {ROLES.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">شهر</label>
                  <input
                    required
                    value={editingUser.city}
                    onChange={e => setEditingUser({ ...editingUser, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">نمایندگی</label>
                <input
                  required
                  value={editingUser.agency}
                  onChange={e => setEditingUser({ ...editingUser, agency: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">رمز عبور کاربر</label>
                <div className="relative">
                  <input
                    type={showEditPass ? 'text' : 'password'}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="رمز عبور کاربر..."
                    className="w-full p-2.5 pl-9 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPass(!showEditPass)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showEditPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Reset Password Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#121e30] border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              تنظیم رمز عبور: {resetPassUser.firstName} {resetPassUser.lastName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              رمز عبور جدیدی برای ورود این ویزیتور به سامانه تعیین فرمایید.
            </p>

            <form onSubmit={handleSaveResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">رمز عبور جدید (حداقل ۶ کاراکتر)</label>
                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPasswordForUser}
                    onChange={e => setNewPasswordForUser(e.target.value)}
                    className="w-full p-2.5 pl-9 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-lg shadow-amber-600/20"
                >
                  ثبت رمز عبور جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121e30] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">تأیید حذف کاربر / ویزیتور</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              آیا از حذف کامل کاربر <strong className="text-white">«{userToDelete.firstName} {userToDelete.lastName}»</strong> ({roleLabel(userToDelete.role)} - {userToDelete.agency}) اطمینان دارید؟
            </p>

            <div className="p-3 rounded-xl bg-[#0c1727] border border-[#283a53] text-[11px] text-slate-400 mb-4">
              با حذف این کاربر، دسترسی ورود او قطع خواهد شد و از لیست ویزیتورهای فعال خارج می‌گردد.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(userToDelete)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20"
              >
                بله، کاربر حذف شود
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121e30] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">حذف گروهی کاربران انتخاب‌شده</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              شما تعداد <strong className="text-white">{selectedUserIds.size} کاربر</strong> را برای حذف انتخاب کرده‌اید. آیا از حذف تمامی این کاربران اطمینان دارید؟
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20"
              >
                تأیید و حذف گروهی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Visitor to Official System User Modal */}
      {convertingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121e30] border border-emerald-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#283a53] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  تکمیل اطلاعات و تبدیل ویزیتور به کاربر رسمی سامانه
                </h3>
              </div>
              <button
                onClick={() => setConvertingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              این ویزیتور از روی فایل اکسل خوانده شده و دارای شماره موقت سمپل است. برای فعال‌سازی کامل حساب کاربری، لطفاً شماره موبایل واقعی و مشخصات ورود او را تکمیل نمایید:
            </p>

            <form onSubmit={handleSaveConvertUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">نام *</label>
                  <input
                    required
                    value={convertFirst}
                    onChange={e => setConvertFirst(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">نام خانوادگی *</label>
                  <input
                    required
                    value={convertLast}
                    onChange={e => setConvertLast(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  شماره موبایل واقعی جهت ورود (با 09) *
                </label>
                <input
                  required
                  dir="ltr"
                  placeholder="0913... یا 0912..."
                  value={convertPhone}
                  onChange={e => setConvertPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  شماره سمپل قبلی: <code className="text-amber-300 font-mono">{convertingUser.phone}</code>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">کد ملی (اختیاری)</label>
                  <input
                    dir="ltr"
                    placeholder="۴۴۱..."
                    value={convertNationalId}
                    onChange={e => setConvertNationalId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">وضعیت عملیاتی در لیگ</label>
                  <select
                    value={convertOperationalStatus}
                    onChange={e => setConvertOperationalStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500"
                  >
                    <option value="league">عضو رسمی لیگ فروشندگان</option>
                    <option value="trainee">آموزشی (بدو استخدام)</option>
                    <option value="test">موقت / تستی</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">نقش کاربری</label>
                  <select
                    value={convertRole}
                    onChange={e => setConvertRole(e.target.value as UserRole)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500"
                  >
                    {ROLES.filter(r => r.id !== 'admin').map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">سرپرست مستقیم</label>
                  <select
                    value={convertSupervisorId}
                    onChange={e => setConvertSupervisorId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500"
                  >
                    <option value="">بدون سرپرست مستقیم</option>
                    {state.users.filter(u => u.role === 'supervisor').map(s => (
                      <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">شهر</label>
                  <input
                    required
                    value={convertCity}
                    onChange={e => setConvertCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">نمایندگی / شعبه</label>
                  <input
                    required
                    value={convertAgency}
                    onChange={e => setConvertAgency(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">رمز عبور اختصاصی ورود *</label>
                <div className="relative">
                  <input
                    type={showConvertPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={convertPassword}
                    onChange={e => setConvertPassword(e.target.value)}
                    className="w-full p-2.5 pl-9 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConvertPass(!showConvertPass)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showConvertPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1e2f47]">
                <button
                  type="button"
                  onClick={() => setConvertingUser(null)}
                  className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  تکمیل اطلاعات و تبدیل به کاربر رسمی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
