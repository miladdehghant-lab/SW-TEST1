import React, { useState, useEffect } from 'react';
import { AppState, AuthSession, User } from './types';
import { supabase, supabaseConfigured } from './lib/supabase';
import { emptyPilotState, loadCloudProfile, loadCloudState, mapProfileToUser, persistCloudState } from './services/pilotRepository';
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
  const [state, setState] = useState<AppState>(() => emptyPilotState());
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentProfile, setCurrentProfile] = useState<User | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [preselectedStoreForActivity, setPreselectedStoreForActivity] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const bootstrapCloudSession = async (userId: string) => {
    if (!supabase) throw new Error('تنظیمات Supabase کامل نیست.');
    const profile = await loadCloudProfile(userId);
    const cloudState = await loadCloudState(profile);
    setCurrentProfile(mapProfileToUser(profile));
    setState(cloudState);
    setSession({ admin: profile.role === 'admin', id: userId });
    setCloudReady(true);
    setShowLoginModal(false);
  };

  // Restore the real Supabase session on every device; no local demo session is created.
  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (!supabaseConfigured || !supabase) return;
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) return;
      try {
        await bootstrapCloudSession(data.session.user.id);
      } catch (err) {
        await supabase.auth.signOut();
        if (active) showToast(err instanceof Error ? err.message : 'بازیابی نشست ناموفق بود.');
      }
    };
    void restore();
    return () => { active = false; };
  // Run once at startup; login uses the same bootstrap function below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist shared state only after it has been loaded from the real database.
  useEffect(() => {
    if (!cloudReady || !session?.admin) return;
    void persistCloudState(state, session.id).catch(err => {
      showToast(err instanceof Error ? `ذخیره در پایگاه داده ناموفق بود: ${err.message}` : 'ذخیره در پایگاه داده ناموفق بود.');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, cloudReady, session?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleUpdateState = (newState: AppState) => {
    setState(newState);
  };

  const handleSwitchUser = (_userId: string, _isAdmin = false) => {
    showToast('تغییر نقش آزمایشی غیرفعال است؛ هر نقش باید با حساب واقعی خودش وارد شود.');
  };

  const handleLogout = () => {
    void (async () => { if (supabase) await supabase.auth.signOut(); })();
    setSession(null);
    setCurrentProfile(null);
    setCloudReady(false);
    setShowLoginModal(true);
  };

  const handleResetData = () => {
    if (window.confirm('تمام داده‌های آزمایشی مشترک در پایگاه داده پاک شود؟ این عملیات قابل بازگشت نیست.')) {
      const fresh = emptyPilotState();
      if (currentProfile) fresh.users = [currentProfile];
      setState(fresh);
      showToast('داده‌های نسخه آزمایشی پاک‌سازی شدند.');
    }
  };

  const handleStartActivityForStore = (storeId: string) => {
    setPreselectedStoreForActivity(storeId);
    setCurrentTab('activities');
  };

  // The active identity comes only from Supabase Auth + the approved database profile.
  const currentUser: User | null = currentProfile;
  const isAdmin = Boolean(session?.admin && currentUser?.role === 'admin');

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
          void bootstrapCloudSession(sess.id).catch(async err => {
            if (supabase) await supabase.auth.signOut();
            setSession(null);
            setCurrentProfile(null);
            setCloudReady(false);
            setShowLoginModal(true);
            showToast(err instanceof Error ? err.message : 'اتصال به داده‌های مشترک ناموفق بود.');
          });
        }}
        onUpdateState={handleUpdateState}
        onShowToast={showToast}
      />
    </div>
  );
}
