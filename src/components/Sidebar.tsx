import React from 'react';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  Users,
  Store,
  CheckSquare,
  FileSpreadsheet,
  Target,
  Trophy,
  FileText,
  UserCircle,
  Package,
  X,
  Menu,
  ChevronLeft
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'users'
  | 'stores'
  | 'products'
  | 'activities'
  | 'challenges'
  | 'sales'
  | 'targets'
  | 'ranking'
  | 'roadmap'
  | 'reports'
  | 'profile';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole: UserRole | 'admin';
  pendingUsersCount: number;
  pendingActivitiesCount: number;
  pendingUploadsCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  pendingUsersCount,
  pendingActivitiesCount,
  pendingUploadsCount,
  isMobileOpen,
  onCloseMobile,
  onOpenMobile,
}) => {
  const isAllowed = (tab: NavTab): boolean => {
    if (userRole === 'admin') return true;
    if (userRole === 'seller') return ['overview', 'stores', 'products', 'activities', 'challenges', 'ranking', 'roadmap', 'profile'].includes(tab);
    if (userRole === 'support') return ['overview', 'products', 'sales', 'targets', 'reports', 'roadmap', 'profile'].includes(tab);
    if (userRole === 'supervisor') return ['overview', 'stores', 'products', 'activities', 'challenges', 'targets', 'ranking', 'roadmap', 'reports', 'profile'].includes(tab);
    if (userRole === 'rep') return ['overview', 'users', 'stores', 'products', 'activities', 'challenges', 'sales', 'targets', 'ranking', 'roadmap', 'reports', 'profile'].includes(tab);
    return ['overview', 'roadmap', 'profile'].includes(tab);
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badgeCount?: number }[] = [
    { id: 'overview', label: 'نمای کلی', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'users',
      label: 'کاربران و تیم فروش',
      icon: <Users className="w-4 h-4" />,
      badgeCount: (userRole === 'admin' || userRole === 'rep') ? pendingUsersCount : 0
    },
    { id: 'stores', label: 'فروشگاه‌ها', icon: <Store className="w-4 h-4" /> },
    {
      id: 'products',
      label: 'شناسنامه کالا و پلنوگرام',
      icon: <Package className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'activities',
      label: 'فعالیت‌های میدانی',
      icon: <CheckSquare className="w-4 h-4" />,
      badgeCount: ['admin', 'rep', 'supervisor'].includes(userRole) ? pendingActivitiesCount : 0
    },
    {
      id: 'challenges',
      label: 'چالش‌های هفتگی (فاز ۱)',
      icon: <Trophy className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'sales',
      label: 'اکسل کارآمد سیستم / فروش',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badgeCount: userRole === 'admin' ? pendingUploadsCount : 0
    },
    { id: 'targets', label: 'تارگت‌ها و تحقق', icon: <Target className="w-4 h-4" /> },
    { id: 'ranking', label: 'لیگ و رتبه‌بندی', icon: <Trophy className="w-4 h-4" /> },
    { id: 'roadmap', label: 'نقشه راه ۴ فاز پروژه', icon: <FileText className="w-4 h-4 text-cyan-400" /> },
    { id: 'reports', label: 'گزارش‌ها و لاگ‌ها', icon: <FileText className="w-4 h-4" /> },
    { id: 'profile', label: 'پروفایل من', icon: <UserCircle className="w-4 h-4" /> },
  ];

  const allowedNavItems = navItems.filter(item => isAllowed(item.id));
  const activeItem = navItems.find(item => item.id === currentTab);

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* 1. Mobile Quick Bar (visible only on mobile / small screens md:hidden) */}
      <div className="md:hidden flex items-center justify-between p-3 bg-[#121e30] border border-[#283a53] rounded-2xl shadow-lg shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-cyan-400">{activeItem?.icon}</span>
          <span className="font-bold text-white">{activeItem?.label}</span>
          {Boolean(activeItem?.badgeCount && activeItem.badgeCount > 0) && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {activeItem?.badgeCount}
            </span>
          )}
        </div>

        <button
          onClick={onOpenMobile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
        >
          <Menu className="w-3.5 h-3.5" />
          <span>منوی بخش‌ها</span>
        </button>
      </div>

      {/* 2. Desktop Sidebar (hidden on mobile, visible on md and larger) */}
      <aside className="hidden md:block w-64 shrink-0">
        <nav className="p-3 bg-[#121e30] border border-[#283a53] rounded-2xl flex flex-col gap-1">
          {allowedNavItems.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-right ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-[#1a2d48]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {Boolean(item.badgeCount && item.badgeCount > 0) && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-white text-blue-700' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 3. Mobile Hamburger Drawer Modal Overlay (Slide-over for phones / PWA) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer container from right (RTL) */}
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-[#121e30] border-l border-[#283a53] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250 z-10">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#283a53] flex items-center justify-between bg-[#152338]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold">
                  ⚔
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-white">منوی بخش‌های سامانه</h3>
                  <span className="text-[10px] text-slate-400">نسخه ویژه موبایل و PWA</span>
                </div>
              </div>

              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f324d] transition-colors"
                title="بستن منو"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Nav List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {allowedNavItems.map(item => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-xs font-medium transition-all text-right ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/25'
                        : 'text-slate-300 hover:text-white hover:bg-[#1a2d48]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {Boolean(item.badgeCount && item.badgeCount > 0) && (
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                          isActive ? 'bg-white text-blue-700' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {item.badgeCount}
                        </span>
                      )}
                      <ChevronLeft className="w-3.5 h-3.5 opacity-40" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-[#283a53] bg-[#0c1626] text-center text-[10px] text-slate-500">
              STORE WAR · سامانه مدیریت تیم و رقابت فروشندگان
            </div>
          </div>
        </div>
      )}
    </>
  );
};
