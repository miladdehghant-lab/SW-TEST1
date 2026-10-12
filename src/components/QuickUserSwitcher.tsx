import React, { useState } from 'react';
import { User, AuthSession } from '../types';
import { roleLabel } from '../utils/formatters';
import { Users, ChevronDown, Check } from 'lucide-react';

interface QuickUserSwitcherProps {
  users: User[];
  currentSession: AuthSession | null;
  onSwitchUser: (userId: string, isAdmin?: boolean) => void;
}

export const QuickUserSwitcher: React.FC<QuickUserSwitcherProps> = ({
  users,
  currentSession,
  onSwitchUser,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Dynamically resolve options based on current users in the system
  const adminUser = users.find(u => u.role === 'admin' || u.id === 'usr_admin');
  const otherUsers = users.filter(u => u.id !== adminUser?.id && u.status === 'approved');

  const quickOptions = [
    {
      label: adminUser ? `${adminUser.firstName} ${adminUser.lastName} (مدیر ارشد کل)` : 'مدیر سیستم',
      role: 'admin',
      userId: adminUser?.id || 'usr_admin',
      isAdmin: true,
    },
    ...otherUsers.slice(0, 8).map(u => ({
      label: `${u.firstName} ${u.lastName} (${roleLabel(u.role)}${u.agency ? ` - ${u.agency}` : ''})`,
      role: u.role,
      userId: u.id,
      isAdmin: false,
    })),
  ];

  const currentUserId = currentSession?.id;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#17263b] hover:bg-[#1f334f] border border-[#283a53] text-xs text-slate-200 transition-colors"
        title="تغییر سریع کاربر برای تست دسترسی‌ها"
      >
        <Users className="w-3.5 h-3.5 text-blue-400" />
        <span className="hidden sm:inline">سوئیچ سریع نقش</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-64 bg-[#121e30] border border-[#283a53] rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in">
            <div className="px-3 py-2 border-b border-[#283a53] text-[11px] text-slate-400 font-medium">
              تغییر سریع نقش جهت آزمایش دسترسی‌ها:
            </div>
            <div className="py-1">
              {quickOptions.map(opt => {
                const isActive = (opt.isAdmin && currentSession?.admin) || currentUserId === opt.userId;
                return (
                  <button
                    key={opt.userId}
                    onClick={() => {
                      onSwitchUser(opt.userId, opt.isAdmin);
                      setIsOpen(false);
                    }}
                    className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-[#1a2d48] transition-colors ${
                      isActive ? 'text-blue-400 font-semibold bg-[#16253c]' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-white">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{roleLabel(opt.role)}</div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
