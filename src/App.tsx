import React, { useState, useEffect } from 'react';
import { AppState, AuthSession, User } from './types';
import { loadState, saveState, loadSession, saveSession, resetToDefaults } from './utils/storage';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { ArchitectureReviewModal } from './components/ArchitectureReviewModal';
import { LoginModal } from './components/LoginModal';
import { OverviewView } from './views/OverviewView';
import { UsersView } from './views/UsersView';
import { StoresView } from './views/StoresView';
import { ProductsView } from './views/ProductsView';
import { ActivitiesView } from './views/ActivitiesView';
import { SalesView } from './views/SalesView';
import { TargetsView } from './views/TargetsView';
import { RankingView } from './views/RankingView';
import { ReportsView } from './views/ReportsView';
import { ProfileView } from './views/ProfileView';
import { ChallengesView } from './views/ChallengesView';
import { RoadmapView } from './views/RoadmapView';

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [session, setSession] = useState<AuthSession | null>(loadSession);
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [preselectedStoreForActivity, setPreselectedStoreForActivity] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync state to localStorage
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Sync session
  useEffect(() => {
    saveSession(session);
    if (!session) {
      setShowLoginModal(true);
    }
  }, [session]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleUpdateState = (newState: AppState) => {
    setState(newState);
  };

  const handleSwitchUser = (userId: string, isAdmin = false) => {
    const newSession: AuthSession = { admin: isAdmin, id: userId };
    setSession(newSession);
    const user = state.users.find(u => u.id === userId);
    showToast(
      isAdmin
        ? 'نقش به مدیر ارشد سیستم تغییر یافت.'
        : `نقش به ${user?.firstName} ${user?.lastName} (${user?.role}) تغییر یافت.`
    );
  };

  const handleLogout = () => {
    setSession(null);
    setShowLoginModal(true);
  };

  const handleResetData = () => {
    if (window.confirm('آیا مایلید تمام داده‌ها پاکسازی شده و سیستم به حالت کاملاً خام و آماده انتشار بازنشانی شود؟')) {
      const fresh = resetToDefaults();
      setState(fresh);
      showToast('سیستم با موفقیت به حالت خام اولیه بازنشانی شد.');
    }
  };

  const handleStartActivityForStore = (storeId: string) => {
    setPreselectedStoreForActivity(storeId);
    setCurrentTab('activities');
  };

  // Resolve current active user object
  const currentUser: User | null = session?.admin
    ? (state.users.find(u => u.role === 'admin' || u.id === 'usr_admin') || {
        id: 'usr_admin',
        phone: '09123153133',
        firstName: 'میلاد',
        lastName: 'دهقانی',
        city: 'تهران',
        agency: 'دفتر مرکزی',
        role: 'admin',
        status: 'approved',
        password: 'Milad@3133',
        createdAt: '2026-09-01T08:00:00.000Z',
      })
    : state.users.find(u => u.id === session?.id) || null;

  const isAdmin = Boolean(session?.admin || currentUser?.role === 'admin');

  // Count pending items for badges
  const pendingUsersCount = state.users.filter(u => u.status === 'pending').length;
  const pendingActivitiesCount = state.activities.filter(a => a.status === 'submitted').length;
  const pendingUploadsCount = state.uploads.filter(u => u.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#0b1220] text-[#eef4fc] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Bar */}
      <Navbar
        currentUser={currentUser}
        currentSession={session}
        users={state.users}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onOpenReview={() => setShowReviewModal(true)}
        onResetData={handleResetData}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar & Mobile Drawer */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={tab => {
            setCurrentTab(tab);
            if (tab !== 'activities') {
              setPreselectedStoreForActivity(null);
            }
          }}
          userRole={isAdmin ? 'admin' : currentUser?.role || 'seller'}
          pendingUsersCount={pendingUsersCount}
          pendingActivitiesCount={pendingActivitiesCount}
          pendingUploadsCount={pendingUploadsCount}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenMobile={() => setIsMobileMenuOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 min-w-0">
          {currentTab === 'overview' && (
            <OverviewView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onNavigate={setCurrentTab}
              onOpenReview={() => setShowReviewModal(true)}
            />
          )}

          {currentTab === 'users' && (
            <UsersView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onUpdateState={handleUpdateState}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'stores' && (
            <StoresView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onUpdateState={handleUpdateState}
              onShowToast={showToast}
              onStartActivityForStore={handleStartActivityForStore}
            />
          )}

          {currentTab === 'products' && (
            <ProductsView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onUpdateState={handleUpdateState}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'activities' && (
            <ActivitiesView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onUpdateState={handleUpdateState}
              onShowToast={showToast}
              preselectedStoreId={preselectedStoreForActivity}
            />
          )}

          {currentTab === 'challenges' && (
            <ChallengesView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onUpdateState={handleUpdateState}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'sales' && (
            <SalesView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onUpdateState={handleUpdateState}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'targets' && (
            <TargetsView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onUpdateState={handleUpdateState}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'ranking' && (
            <RankingView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
            />
          )}

          {currentTab === 'roadmap' && (
            <RoadmapView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onUpdateState={handleUpdateState}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onShowToast={showToast}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView
              currentUser={currentUser}
              isAdmin={isAdmin}
              state={state}
              onUpdateState={handleUpdateState}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-4 px-6 border-t border-[#1c2e47] text-center text-xs text-slate-500">
        STORE WAR · سامانه مدیریت قلمرو، فروشگاه‌ها، تارگت‌ها و رقابت تیم فروش · نسخه پایلوت V1
      </footer>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 px-4 py-3 rounded-xl bg-[#162942] border border-[#2b4b75] text-white text-xs shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Architecture Review Report Modal */}
      <ArchitectureReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
      />

      {/* Authentication Modal */}
      <LoginModal
        isOpen={showLoginModal}
        state={state}
        onLoginSuccess={sess => {
          setSession(sess);
          setShowLoginModal(false);
        }}
        onUpdateState={handleUpdateState}
        onShowToast={showToast}
      />
    </div>
  );
}
