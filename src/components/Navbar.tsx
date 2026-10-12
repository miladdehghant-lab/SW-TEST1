import React from 'react';
import { User, AuthSession } from '../types';
import { roleLabel } from '../utils/formatters';
import { QuickUserSwitcher } from './QuickUserSwitcher';
import { LogOut, FileSearch, RotateCcw, Menu } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentSession: AuthSession | null;
  users: User[];
  onSwitchUser: (userId: string, isAdmin?: boolean) => void;
  onLogout: () => void;
  onOpenReview: () => void;
  onResetData: () => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentSession,
  users,
  onSwitchUser,
  onLogout,
  onOpenReview,
  onResetData,
  onToggleMobileMenu,
}) => {
  const displayName = currentSession?.admin ? 'مدیر سیستم' : currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'کاربر';
  const roleTitle = currentSession?.admin ? 'مدیر ارشد سیستم' : roleLabel(currentUser?.role);
  const agencyName = currentUser?.agency || 'دفتر مرکزی';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 md:gap-8 px-3.5 md:px-6 py-3 bg-[#0e1726]/95 backdrop-blur border-b border-[#24354c]">
      {/* Zone 1: Hamburger toggle (mobile) + Single text element wordmark */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl bg-[#142337] hover:bg-[#1e334f] text-slate-200 border border-[#283a53] transition-colors flex items-center justify-center shadow-sm"
          title="باز کردن منوی همبرگری بخش‌های برنامه"
          aria-label="منوی بخش‌ها"
        >
          <Menu className="w-5 h-5 text-cyan-400" />
        </button>

        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-blue-500/20">
          ⚔
        </div>
        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap">
            STORE WAR
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-400 tracking-wider">
            سامانه مدیریت و رقابت تیم فروش
          </span>
        </div>
      </div>

      {/* Zone 2: Informational / Status banner */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
        <span>نسخه استاندارد</span>
        <span aria-hidden="true">·</span>
        <span>منطقه: {agencyName}</span>
        <span aria-hidden="true">·</span>
        <span>فاز ۱: رقابت فردی فروشندگان</span>
      </div>

      {/* Zone 3: Actions & Current User */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Architecture Review Report Button - Only for Super Admin */}
        {currentSession?.admin && (
          <button
            onClick={onOpenReview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 text-xs font-medium transition-colors"
            title="مشاهده گزارش بررسی فنی کدهای بارگذاری شده (مخصوص مدیر سیستم)"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">گزارش ارزیابی فنی کدها</span>
          </button>
        )}

        {/* Reset Demo Data Button - Only for Super Admin */}
        {currentSession?.admin && (
          <button
            onClick={onResetData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1a2b42] border border-transparent hover:border-[#283a53] transition-colors"
            title="بازنشانی سیستم به حالت خام"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* User Card */}
        <div className="hidden sm:flex flex-col text-right pl-2 border-r border-[#24354c]">
          <span className="text-xs font-semibold text-white whitespace-nowrap">{displayName}</span>
          <span className="text-[10px] text-slate-400 whitespace-nowrap">{roleTitle}</span>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-colors"
          title="خروج از حساب کاربری"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
