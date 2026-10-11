import React, { useState } from 'react';
import { Target, AppState, User, TargetRequest, TargetProposal } from '../types';
import { monthDefault, monthLabel, num, norm, uid, roleLabel } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import {
  Target as TargetIcon,
  Plus,
  Check,
  X,
  TrendingUp,
  Inbox,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  Send,
  Sparkles,
  Clock,
  ArrowRight,
  Shield,
  FileEdit,
  MessageSquare,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface TargetsViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  onShowToast: (msg: string) => void;
}

export const TargetsView: React.FC<TargetsViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onUpdateState,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'targets' | 'proposals' | 'requests'>('targets');

  // Direct Create Form (for Admin)
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetUser, setTargetUser] = useState('');
  const [targetMonth, setTargetMonth] = useState(monthDefault());
  const [targetBrand, setTargetBrand] = useState('مولفیکس');
  const [targetQty, setTargetQty] = useState('150');
  const [targetStores, setTargetStores] = useState('10');

  // Support Specialist Target Proposal Modal (Two-Stage Approval)
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposingTargetId, setProposingTargetId] = useState<string | null>(null);
  const [propUserId, setPropUserId] = useState('');
  const [propMonth, setPropMonth] = useState(monthDefault());
  const [propBrand, setPropBrand] = useState('مولفیکس');
  const [propQty, setPropQty] = useState('160');
  const [propStoreTarget, setPropStoreTarget] = useState('12');
  const [propReason, setPropReason] = useState('');

  // Reviewing Proposal Modal (for Rep or Admin)
  const [reviewingProposal, setReviewingProposal] = useState<TargetProposal | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const isSupport = currentUser?.role === 'support';
  const isRep = currentUser?.role === 'rep';
  const canManageDirectly = isAdmin;
  const canPropose = isSupport || isRep || isAdmin;

  const targetProposals = state.targetProposals || [];

  // Filter proposals relevant to current user
  const visibleProposals = targetProposals.filter(p => {
    if (isAdmin) return true;
    if (isRep) {
      const seller = state.users.find(u => u.id === p.userId);
      return seller?.agency === currentUser?.agency;
    }
    if (isSupport) return true;
    if (currentUser?.role === 'seller') return p.userId === currentUser.id;
    return true;
  });

  const pendingRepProposals = targetProposals.filter(p => p.stage === 'pending_rep');
  const pendingAdminProposals = targetProposals.filter(p => p.stage === 'pending_admin');

  // Count pending approvals needing attention from this user
  const pendingActionCount = isAdmin
    ? pendingAdminProposals.length + pendingRepProposals.length
    : isRep
    ? pendingRepProposals.filter(p => {
        const seller = state.users.find(u => u.id === p.userId);
        return seller?.agency === currentUser?.agency;
      }).length
    : 0;

  const visibleTargets = state.targets.filter(t => {
    if (isAdmin) return true;
    if (currentUser?.role === 'seller') return t.userId === currentUser.id;
    if (currentUser?.role === 'supervisor') {
      const teamUserIds = new Set(state.users.filter(u => u.supervisorId === currentUser.id).map(u => u.id));
      return teamUserIds.has(t.userId);
    }
    if (isRep) return t.agency === currentUser.agency;
    return true;
  });

  const sellers = state.users.filter(u => u.status === 'approved' && u.role === 'seller');
  const targetRequests = state.targetRequests || [];
  const pendingRequests = targetRequests.filter(r => r.status === 'pending');

  // Handler: Open Proposal Modal for a specific existing target
  const handleOpenProposeForExistingTarget = (tgt: Target) => {
    setProposingTargetId(tgt.id);
    setPropUserId(tgt.userId);
    setPropMonth(tgt.month);
    setPropBrand(tgt.brand);
    setPropQty(String(tgt.quantity));
    setPropStoreTarget(String(tgt.storeTarget));
    setPropReason('');
    setShowProposalModal(true);
  };

  // Handler: Open Proposal Modal for creating/proposing a new target
  const handleOpenProposeNewTarget = () => {
    setProposingTargetId(null);
    setPropUserId(sellers[0]?.id || '');
    setPropMonth(monthDefault());
    setPropBrand('مولفیکس');
    setPropQty('150');
    setPropStoreTarget('10');
    setPropReason('');
    setShowProposalModal(true);
  };

  // Support Specialist Submits Proposal -> Stage 1: Pending Rep Approval
  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propUserId) {
      onShowToast('لطفاً ویزیتور را انتخاب کنید.');
      return;
    }
    if (!propReason.trim()) {
      onShowToast('لطفاً دلیل و استدلال پیشنهاد تغییر تارگت را وارد کنید.');
      return;
    }

    const sellerObj = state.users.find(u => u.id === propUserId);
    const existingTarget = proposingTargetId
      ? state.targets.find(t => t.id === proposingTargetId)
      : state.targets.find(
          t => t.userId === propUserId && t.month === propMonth && norm(t.brand) === norm(propBrand)
        );

    const newProposal: TargetProposal = {
      id: uid('prop'),
      targetId: existingTarget?.id,
      userId: propUserId,
      userName: sellerObj ? `${sellerObj.firstName} ${sellerObj.lastName}` : 'ویزیتور',
      month: propMonth,
      brand: propBrand.trim(),
      proposedQuantity: Number(propQty) || 0,
      proposedStoreTarget: Number(propStoreTarget) || 0,
      currentQuantity: existingTarget?.quantity,
      currentStoreTarget: existingTarget?.storeTarget,
      reason: propReason.trim(),
      proposedBy: currentUser?.id || 'usr_support_1',
      proposedByName: `${currentUser?.firstName || 'مسئول'} ${currentUser?.lastName || 'ثبت داده'} (${roleLabel(currentUser?.role || 'support')})`,
      stage: 'pending_rep', // مرحله اول: در انتظار تایید مدیر نمایندگی
      createdAt: new Date().toISOString(),
    };

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_support_1',
        action: 'target.proposal_submitted_by_support',
        details: {
          proposalId: newProposal.id,
          sellerName: newProposal.userName,
          brand: newProposal.brand,
          proposedQuantity: newProposal.proposedQuantity,
          reason: newProposal.reason,
        },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      targetProposals: [newProposal, ...targetProposals],
      audit: newAudit,
    });

    setShowProposalModal(false);
    setActiveTab('proposals');
    onShowToast('پیشنهاد تغییر تارگت با موفقیت ثبت شد و جهت تأیید مرحله اول برای مدیر نمایندگی ارسال گردید. ✅');
  };

  // Branch Manager Review Decision (Stage 1)
  const handleRepDecision = (proposal: TargetProposal, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected') {
      const updated = targetProposals.map(p =>
        p.id === proposal.id
          ? {
              ...p,
              stage: 'rejected' as const,
              repReview: {
                reviewedBy: currentUser?.id || 'usr_rep_1',
                reviewedByName: `${currentUser?.firstName} ${currentUser?.lastName} (مدیر نمایندگی)`,
                reviewedAt: new Date().toISOString(),
                decision: 'rejected' as const,
                note: reviewNote.trim() || 'رد شده توسط مدیر نمایندگی',
              },
              updatedAt: new Date().toISOString(),
            }
          : p
      );

      onUpdateState({
        ...state,
        targetProposals: updated,
        audit: [
          {
            id: uid('log'),
            at: new Date().toISOString(),
            by: currentUser?.id || 'usr_rep_1',
            action: 'target.proposal_rejected_by_rep',
            details: { proposalId: proposal.id, reason: reviewNote },
          },
          ...state.audit,
        ],
      });

      setReviewingProposal(null);
      setReviewNote('');
      onShowToast('پیشنهاد تغییر تارگت توسط مدیر نمایندگی رد شد.');
      return;
    }

    // Approved by Rep -> Moves to Stage 2: pending_admin
    const updated = targetProposals.map(p =>
      p.id === proposal.id
        ? {
            ...p,
            stage: 'pending_admin' as const,
            repReview: {
              reviewedBy: currentUser?.id || 'usr_rep_1',
              reviewedByName: `${currentUser?.firstName} ${currentUser?.lastName} (مدیر نمایندگی)`,
              reviewedAt: new Date().toISOString(),
              decision: 'approved' as const,
              note: reviewNote.trim() || 'مورد تایید نمایندگی است.',
            },
            updatedAt: new Date().toISOString(),
          }
        : p
    );

    onUpdateState({
      ...state,
      targetProposals: updated,
      audit: [
        {
          id: uid('log'),
          at: new Date().toISOString(),
          by: currentUser?.id || 'usr_rep_1',
          action: 'target.proposal_approved_by_rep',
          details: { proposalId: proposal.id, nextStage: 'pending_admin' },
        },
        ...state.audit,
      ],
    });

    setReviewingProposal(null);
    setReviewNote('');
    onShowToast('تأیید مرحله اول توسط مدیر نمایندگی ثبت شد و جهت تصمیم‌گیری نهایی برای مدیر کل ارسال گردید.');
  };

  // General Manager Review Decision (Stage 2: Final Approval & Application in System)
  const handleAdminDecision = (proposal: TargetProposal, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected') {
      const updated = targetProposals.map(p =>
        p.id === proposal.id
          ? {
              ...p,
              stage: 'rejected' as const,
              adminReview: {
                reviewedBy: currentUser?.id || 'usr_admin',
                reviewedByName: `${currentUser?.firstName} ${currentUser?.lastName} (مدیر کل)`,
                reviewedAt: new Date().toISOString(),
                decision: 'rejected' as const,
                note: reviewNote.trim() || 'رد شده در تایید نهایی مدیر کل',
              },
              updatedAt: new Date().toISOString(),
            }
          : p
      );

      onUpdateState({
        ...state,
        targetProposals: updated,
        audit: [
          {
            id: uid('log'),
            at: new Date().toISOString(),
            by: currentUser?.id || 'usr_admin',
            action: 'target.proposal_rejected_by_admin',
            details: { proposalId: proposal.id, reason: reviewNote },
          },
          ...state.audit,
        ],
      });

      setReviewingProposal(null);
      setReviewNote('');
      onShowToast('پیشنهاد تغییر تارگت توسط مدیر کل رد شد.');
      return;
    }

    // Approved by Admin -> APPLY DIRECTLY TO STATE.TARGETS!
    const sellerObj = state.users.find(u => u.id === proposal.userId);
    let updatedTargets: Target[];

    if (proposal.targetId) {
      // Update existing target
      updatedTargets = state.targets.map(t =>
        t.id === proposal.targetId
          ? {
              ...t,
              quantity: proposal.proposedQuantity,
              storeTarget: proposal.proposedStoreTarget,
              status: 'approved' as const,
            }
          : t
      );
    } else {
      // Check if matching target exists by user/month/brand
      const existingIdx = state.targets.findIndex(
        t => t.userId === proposal.userId && t.month === proposal.month && norm(t.brand) === norm(proposal.brand)
      );
      if (existingIdx >= 0) {
        updatedTargets = state.targets.map((t, idx) =>
          idx === existingIdx
            ? {
                ...t,
                quantity: proposal.proposedQuantity,
                storeTarget: proposal.proposedStoreTarget,
                status: 'approved' as const,
              }
            : t
        );
      } else {
        // Create new Target
        const newTarget: Target = {
          id: uid('tgt'),
          userId: proposal.userId,
          month: proposal.month,
          brand: proposal.brand,
          quantity: proposal.proposedQuantity,
          storeTarget: proposal.proposedStoreTarget,
          agency: sellerObj?.agency || 'یزد - منطقه ۱',
          status: 'approved',
          createdBy: proposal.proposedBy,
          createdAt: new Date().toISOString(),
        };
        updatedTargets = [newTarget, ...state.targets];
      }
    }

    const updatedProposals = targetProposals.map(p =>
      p.id === proposal.id
        ? {
            ...p,
            stage: 'approved' as const,
            adminReview: {
              reviewedBy: currentUser?.id || 'usr_admin',
              reviewedByName: `${currentUser?.firstName} ${currentUser?.lastName} (مدیر کل)`,
              reviewedAt: new Date().toISOString(),
              decision: 'approved' as const,
              note: reviewNote.trim() || 'تایید نهایی شد و در سیستم اعمال گردید.',
            },
            updatedAt: new Date().toISOString(),
          }
        : p
    );

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'target.proposal_finally_approved_and_applied',
        details: {
          proposalId: proposal.id,
          sellerName: proposal.userName,
          brand: proposal.brand,
          newQuantity: proposal.proposedQuantity,
        },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      targets: updatedTargets,
      targetProposals: updatedProposals,
      audit: newAudit,
    });

    setReviewingProposal(null);
    setReviewNote('');
    onShowToast(`تغییرات تارگت برای ${proposal.userName} با تأیید نهایی مدیر کل در سیستم اعمال و فعال گردید! 🎉`);
  };

  // Direct Create Target by Admin
  const handleDirectCreateTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) {
      onShowToast('لطفاً فروشنده را انتخاب کنید.');
      return;
    }

    const sellerObj = state.users.find(u => u.id === targetUser);

    const newTarget: Target = {
      id: uid('tgt'),
      userId: targetUser,
      month: targetMonth,
      brand: targetBrand.trim(),
      quantity: Number(targetQty) || 0,
      storeTarget: Number(targetStores) || 0,
      agency: sellerObj?.agency || currentUser?.agency || 'یزد - منطقه ۱',
      status: 'approved',
      createdBy: currentUser?.id || 'usr_admin',
      createdAt: new Date().toISOString(),
    };

    const updatedRequests = (state.targetRequests || []).map(r =>
      r.userId === targetUser && r.status === 'pending' ? { ...r, status: 'defined' as const } : r
    );

    const updatedUsers = state.users.map(u =>
      u.id === targetUser ? { ...u, operationalStatus: 'league' as const, targetStatus: 'has_target' as const } : u
    );

    const newAudit = [
      {
        id: uid('log'),
        at: new Date().toISOString(),
        by: currentUser?.id || 'usr_admin',
        action: 'target.created_directly_by_admin',
        details: { targetId: newTarget.id, seller: sellerObj?.firstName, brand: newTarget.brand },
      },
      ...state.audit,
    ];

    onUpdateState({
      ...state,
      targets: [newTarget, ...state.targets],
      targetRequests: updatedRequests,
      users: updatedUsers,
      audit: newAudit,
    });

    onShowToast(`تارگت برای ${sellerObj?.firstName} ${sellerObj?.lastName} به صورت مستقیم ثبت و فعال شد.`);
    setShowAddForm(false);
  };

  const handleQuickDefineFromRequest = (req: TargetRequest) => {
    setTargetUser(req.userId);
    setTargetMonth(req.month || monthDefault());
    if (req.basis === 'new_hire') {
      setTargetQty('100');
      setTargetStores('8');
    } else if (req.basis === 'sales_history') {
      setTargetQty('180');
      setTargetStores('15');
    } else {
      setTargetQty('120');
      setTargetStores('10');
    }
    setShowAddForm(true);
    setActiveTab('targets');
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleDismissAsTestOrTrainee = (req: TargetRequest, type: 'trainee' | 'test') => {
    const updatedRequests = (state.targetRequests || []).map(r =>
      r.id === req.id ? { ...r, status: 'marked_test' as const } : r
    );

    const updatedUsers = state.users.map(u =>
      u.id === req.userId ? { ...u, operationalStatus: type, targetStatus: 'not_needed' as const } : u
    );

    onUpdateState({
      ...state,
      targetRequests: updatedRequests,
      users: updatedUsers,
      audit: [
        {
          id: uid('log'),
          at: new Date().toISOString(),
          by: currentUser?.id || 'usr_admin',
          action: 'target.request_marked_non_target',
          details: { requestId: req.id, userId: req.userId, type },
        },
        ...state.audit,
      ],
    });

    onShowToast(
      type === 'trainee'
        ? `کاربر ${req.userName} به عنوان ویزیتور آموزشی ثبت شد.`
        : `کاربر ${req.userName} به عنوان اکانت موقت/تستی ثبت شد.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TargetIcon className="w-5 h-5 text-amber-400" />
            <span>مدیریت تارگت و فرآیند دو مرحله‌ای مصوبات</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            مسئول پشتیبانی و ثبت داده نظرات و اصلاحات تارگت را پیشنهاد می‌دهد؛ تغییرات پس از تأیید مرحله اول (مدیر نمایندگی) و تأیید نهایی (مدیر کل) در سیستم اعمال می‌گردد.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Support Specialist / Rep / Admin Proposal Button */}
          {canPropose && (
            <button
              onClick={handleOpenProposeNewTarget}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-colors"
            >
              <FileEdit className="w-4 h-4" />
              <span>پیشنهاد تغییر یا تخصیص تارگت</span>
            </button>
          )}

          {/* Admin Direct Add */}
          {canManageDirectly && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'بستن فرم' : 'تخصیص مستقیم (مدیر کل)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#283a53] gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('targets')}
          className={`pb-3 px-3 flex items-center gap-2 transition-colors relative ${
            activeTab === 'targets'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TargetIcon className="w-4 h-4" />
          <span>تارگت‌های فعال ({num(visibleTargets.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('proposals')}
          className={`pb-3 px-3 flex items-center gap-2 transition-colors relative ${
            activeTab === 'proposals'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>کارتابل تأیید دو مرحله‌ای تغییرات</span>
          {pendingActionCount > 0 && (
            <span className="px-2 py-0.2 rounded-full bg-cyan-500 text-black text-[10px] font-extrabold animate-pulse">
              {pendingActionCount} اقدام
            </span>
          )}
          {targetProposals.length > 0 && pendingActionCount === 0 && (
            <span className="text-[10px] text-slate-400 font-mono">({num(visibleProposals.length)})</span>
          )}
        </button>

        {pendingRequests.length > 0 && (
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 px-3 flex items-center gap-2 transition-colors relative ${
              activeTab === 'requests'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>درخواست‌های ورودی جدید</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-300 text-[10px] font-bold">
              {pendingRequests.length}
            </span>
          </button>
        )}
      </div>

      {/* ===================== TAB 1: ACTIVE TARGETS ===================== */}
      {activeTab === 'targets' && (
        <div className="space-y-4">
          {/* Admin Direct Add Form */}
          {showAddForm && canManageDirectly && (
            <div className="bg-[#121e30] border border-blue-500/30 rounded-2xl p-5 shadow-xl animate-in fade-in">
              <h3 className="text-sm font-bold text-white mb-3">تخصیص هدف فروش مستقیم توسط مدیر کل</h3>
              <form onSubmit={handleDirectCreateTarget} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">فروشنده / ویزیتور *</label>
                    <select
                      required
                      value={targetUser}
                      onChange={e => setTargetUser(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                    >
                      <option value="">انتخاب فروشنده</option>
                      {sellers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} ({s.agency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">دوره هدف</label>
                    <select
                      value={targetMonth}
                      onChange={e => setTargetMonth(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                    >
                      <option value="1405-07">مهر ۱۴۰۵</option>
                      <option value="1405-08">آبان ۱۴۰۵</option>
                      <option value="1405-09">آذر ۱۴۰۵</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">برند هدف</label>
                    <select
                      value={targetBrand}
                      onChange={e => setTargetBrand(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500"
                    >
                      <option value="مولفیکس">مولفیکس (Molfix)</option>
                      <option value="ببم">ببم (Bebem)</option>
                      <option value="مولپد">مولپد (Molped)</option>
                      <option value="تنو">تنو (Teno)</option>
                      <option value="پاپیا">پاپیا (Papia)</option>
                      <option value="تست">تست (Test)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">هدف مقدار / کارتن</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={targetQty}
                      onChange={e => setTargetQty(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">هدف پوشش فروشگاه‌ها</label>
                    <input
                      type="number"
                      min="0"
                      value={targetStores}
                      onChange={e => setTargetStores(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                  >
                    ثبت مستقیم تارگت
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Targets Table */}
          <div className="bg-[#121e30] border border-[#283a53] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#16253c] text-slate-300 border-b border-[#283a53]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">دوره</th>
                    <th className="py-2.5 px-4 font-semibold">فروشنده</th>
                    <th className="py-2.5 px-4 font-semibold">وضعیت عملیاتی</th>
                    <th className="py-2.5 px-4 font-semibold">برند</th>
                    <th className="py-2.5 px-4 font-semibold">هدف فروش</th>
                    <th className="py-2.5 px-4 font-semibold">فروش تاییدشده</th>
                    <th className="py-2.5 px-4 font-semibold">درصد تحقق</th>
                    <th className="py-2.5 px-4 font-semibold">پوشش هدف</th>
                    <th className="py-2.5 px-4 font-semibold">وضعیت</th>
                    {canPropose && <th className="py-2.5 px-4 font-semibold text-center">عملیات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f47]">
                  {visibleTargets.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        تارگتی برای نمایش یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    visibleTargets.map(tgt => {
                      const user = state.users.find(u => u.id === tgt.userId);

                      // Compute actual approved sales matching seller, month, and brand
                      const actual = state.sales
                        .filter(
                          s =>
                            s.status === 'approved' &&
                            s.month === tgt.month &&
                            s.ownerId === tgt.userId &&
                            norm(s.brand) === norm(tgt.brand)
                        )
                        .reduce((sum, s) => sum + s.quantity, 0);

                      const pct = tgt.quantity > 0 ? Math.round((actual / tgt.quantity) * 100) : 0;
                      const barColor = pct >= 100 ? 'bg-emerald-400' : pct >= 70 ? 'bg-blue-400' : 'bg-amber-400';

                      return (
                        <tr key={tgt.id} className="hover:bg-[#16253c]/50 transition-colors">
                          <td className="py-3 px-4 text-slate-300">{monthLabel(tgt.month)}</td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {user ? `${user.firstName} ${user.lastName}` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              user?.operationalStatus === 'trainee'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : user?.operationalStatus === 'test'
                                ? 'bg-slate-700/50 text-slate-300'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {user?.operationalStatus === 'trainee' ? '🎓 آموزشی' : user?.operationalStatus === 'test' ? '🧪 تستی' : '🏆 رسمی لیگ'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-200 font-medium">{tgt.brand}</td>
                          <td className="py-3 px-4 font-bold text-slate-200 tabular-nums">{num(tgt.quantity)}</td>
                          <td className="py-3 px-4 font-bold text-cyan-300 tabular-nums">{num(actual)}</td>
                          <td className="py-3 px-4 min-w-[140px]">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-white tabular-nums">{num(pct)}%</span>
                              {pct >= 100 && (
                                <span className="text-emerald-400 flex items-center gap-0.5 text-[10px]">
                                  <TrendingUp className="w-3 h-3" />
                                  محقق شد
                                </span>
                              )}
                            </div>
                            <div className="h-2 rounded-full bg-[#1b2a3f] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400 tabular-nums">
                            {tgt.storeTarget > 0 ? `${num(tgt.storeTarget)} فروشگاه` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={tgt.status} />
                          </td>
                          {canPropose && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleOpenProposeForExistingTarget(tgt)}
                                className="px-2.5 py-1 rounded-lg bg-[#1f324d] hover:bg-[#284266] text-cyan-300 hover:text-white transition-colors text-[11px] flex items-center gap-1 mx-auto"
                                title="ثبت پیشنهاد اصلاح تارگت (ارسال به مدیر نمایندگی و مدیر کل)"
                              >
                                <FileEdit className="w-3.5 h-3.5" />
                                <span>پیشنهاد تغییر</span>
                              </button>
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
        </div>
      )}

      {/* ===================== TAB 2: TWO-STAGE PROPOSALS WORKFLOW ===================== */}
      {activeTab === 'proposals' && (
        <div className="space-y-4">
          {/* Explanation Alert */}
          <div className="p-4 rounded-2xl bg-[#0f1c2e] border border-cyan-500/30 flex items-start gap-3">
            <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-white">روال قانونی دو مرحله‌ای تغییر و مصوبه تارگت‌ها</h4>
              <p className="text-slate-300 leading-relaxed">
                ۱. <strong>کارشناس ثبت داده و پشتیبانی:</strong> پیشنهاد و نظر کارشناسی خود را ثبت می‌کند.<br />
                ۲. <strong>مدیر نمایندگی (مرحله اول):</strong> پیشنهاد را بر اساس شرایط منطقه بررسی و تأیید یا رد می‌نماید.<br />
                ۳. <strong>مدیر کل (مرحله نهایی):</strong> پس از تأیید نمایندگی، تصمیم‌گیری قطعی را اتخاذ کرده و با تأیید ایشان تغییرات بلافاصله در سیستم اعمال می‌شود.
              </p>
            </div>
          </div>

          {/* Proposals List */}
          <div className="grid grid-cols-1 gap-4">
            {visibleProposals.length === 0 ? (
              <div className="p-12 text-center bg-[#121e30] border border-[#283a53] rounded-2xl text-slate-400 text-xs">
                در حال حاضر هیچ پیشنهاد تغییر تارگتی در جریان نیست.
              </div>
            ) : (
              visibleProposals.map(p => {
                const seller = state.users.find(u => u.id === p.userId);
                const isPendingRep = p.stage === 'pending_rep';
                const isPendingAdmin = p.stage === 'pending_admin';
                const isApproved = p.stage === 'approved';
                const isRejected = p.stage === 'rejected';

                const canCurrentRepAct = isRep && isPendingRep && seller?.agency === currentUser?.agency;
                const canCurrentAdminAct = isAdmin && (isPendingAdmin || isPendingRep);

                return (
                  <div
                    key={p.id}
                    className={`bg-[#121e30] border rounded-2xl p-5 shadow-xl transition-all ${
                      isPendingAdmin
                        ? 'border-purple-500/50 bg-gradient-to-r from-purple-950/20 via-[#121e30] to-[#121e30]'
                        : isPendingRep
                        ? 'border-cyan-500/40'
                        : isApproved
                        ? 'border-emerald-500/40 bg-emerald-950/10'
                        : 'border-rose-500/30 opacity-75'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24374f] pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{p.userName}</span>
                          <span className="text-xs text-slate-400">({seller?.agency || 'نمایندگی'})</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                            برند {p.brand}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            دوره: {monthLabel(p.month)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                          <span>پیشنهاددهنده:</span>
                          <strong className="text-slate-200">{p.proposedByName}</strong>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div>
                        {isPendingRep && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>مرحله ۱: در انتظار تأیید مدیر نمایندگی</span>
                          </span>
                        )}
                        {isPendingAdmin && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>مرحله ۲: در انتظار تأیید نهایی مدیر کل</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تأیید نهایی و اعمال‌شده در سیستم</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>رد شده</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comparison Box & Rationale */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs">
                      {/* Previous vs Proposed Values */}
                      <div className="p-3 rounded-xl bg-[#0a1422] border border-[#1d2f47] space-y-2">
                        <span className="font-semibold text-slate-300 block">مقادیر هدف:</span>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">تارگت فعلی / قبلی:</span>
                          <span className="font-mono text-slate-300">
                            {p.currentQuantity ? `${num(p.currentQuantity)} کارتن` : 'تعریف‌نشده'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1a293d]">
                          <span className="text-cyan-400 font-bold">تارگت پیشنهادی جدید:</span>
                          <span className="font-bold text-white font-mono bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                            {num(p.proposedQuantity)} کارتن
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">پوشش فروشگاه:</span>
                          <span className="text-slate-300">{num(p.proposedStoreTarget)} مغازه</span>
                        </div>
                      </div>

                      {/* Support Specialist Rationale */}
                      <div className="md:col-span-2 p-3 rounded-xl bg-[#0a1422] border border-[#1d2f47] flex flex-col justify-between">
                        <div>
                          <span className="font-semibold text-slate-300 flex items-center gap-1 mb-1">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                            <span>استدلال و نظر کارشناس پشتیبانی / ثبت داده:</span>
                          </span>
                          <p className="text-slate-300 leading-relaxed italic bg-[#101e30] p-2.5 rounded-lg border border-[#1b2f48]">
                            «{p.reason}»
                          </p>
                        </div>

                        {/* Timeline Footnote */}
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 mt-2 pt-2 border-t border-[#1a293d]">
                          <span>ثبت: {p.proposedByName}</span>
                          {p.repReview && (
                            <span className="text-cyan-300">
                              تأیید نمایندگی: {p.repReview.reviewedByName}
                            </span>
                          )}
                          {p.adminReview && (
                            <span className="text-emerald-300">
                              تأیید مدیر کل: {p.adminReview.reviewedByName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step Progress Tracker */}
                    <div className="bg-[#0b1625] rounded-xl p-3 mb-3 border border-[#1c2e47]">
                      <div className="flex items-center justify-between text-[11px] font-medium">
                        {/* Step 1 */}
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>۱. نظر کارشناس پشتیبانی (ثبت شد)</span>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />

                        {/* Step 2 */}
                        <div className={`flex items-center gap-1.5 ${
                          p.repReview?.decision === 'approved'
                            ? 'text-emerald-400'
                            : isPendingRep
                            ? 'text-cyan-400 font-bold'
                            : isRejected && !p.repReview
                            ? 'text-slate-500'
                            : 'text-rose-400'
                        }`}>
                          {p.repReview?.decision === 'approved' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                          <span>۲. بررسی مدیر نمایندگی</span>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />

                        {/* Step 3 */}
                        <div className={`flex items-center gap-1.5 ${
                          isApproved
                            ? 'text-emerald-400 font-bold'
                            : isPendingAdmin
                            ? 'text-purple-400 font-bold'
                            : 'text-slate-500'
                        }`}>
                          {isApproved ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                          <span>۳. تأیید نهایی مدیر کل و اعمال</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons for Authorized Roles */}
                    {(canCurrentRepAct || canCurrentAdminAct) && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#20334a]">
                        <button
                          onClick={() => setReviewingProposal(p)}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                        >
                          <Check className="w-4 h-4" />
                          <span>
                            {isPendingRep ? 'تصمیم‌گیری مدیر نمایندگی (مرحله ۱)' : 'تصمیم‌گیری نهایی مدیر کل (مرحله ۲)'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 3: NEW HIRE TARGET REQUESTS ===================== */}
      {activeTab === 'requests' && pendingRequests.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-950/60 to-[#121e30] border border-amber-500/40 p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                کارتابل درخواست‌های تعیین تارگت ویزیتورهای جدید ({pendingRequests.length} درخواست)
              </h3>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              ارسال‌شده از سوی سرپرستان فروش
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.map(req => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-[#0c1727] border border-[#283a53] flex flex-col justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-white text-sm">{req.userName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                      {monthLabel(req.month)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1">
                    <div>درخواست‌دهنده: <strong className="text-slate-300">{req.requestedBy}</strong></div>
                    <div>
                      مبنا: <strong className="text-amber-300">
                        {req.basis === 'new_hire'
                          ? 'ویزیتور جدید (تارگت پایه ورودی)'
                          : req.basis === 'sales_history'
                          ? 'بر اساس سوابق فروش'
                          : 'بر اساس ظرفیت منطقه'}
                      </strong>
                    </div>
                    {req.note && (
                      <div className="text-slate-300 italic bg-[#142337] p-2 rounded-lg mt-1 border border-[#20344d]">
                        «{req.note}»
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#1e2f47]">
                  <button
                    onClick={() => handleQuickDefineFromRequest(req)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-blue-600/20"
                  >
                    <TargetIcon className="w-3.5 h-3.5" />
                    <span>تعریف تارگت</span>
                  </button>
                  <button
                    onClick={() => handleDismissAsTestOrTrainee(req, 'trainee')}
                    className="py-1.5 px-2.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-200 text-xs"
                  >
                    ثبت آموزشی
                  </button>
                  <button
                    onClick={() => handleDismissAsTestOrTrainee(req, 'test')}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    اکانت تستی
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== MODAL: SUPPORT SPECIALIST TARGET PROPOSAL ===================== */}
      {showProposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121e30] border border-cyan-500/40 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#283a53] pb-3">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  فرم پیشنهاد و نظر کارشناس پشتیبانی جهت تغییر تارگت
                </h3>
              </div>
              <button
                onClick={() => setShowProposalModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-200 leading-relaxed">
              توجه: تغییرات ثبت‌شده مستقیماً اعمال نخواهند شد؛ طبق فرآیند سازمانی، پیشنهاد شما ابتدا برای <strong>مدیر نمایندگی</strong> ارسال و پس از آن با <strong>تأیید نهایی مدیر کل</strong> در سیستم اعمال می‌شود.
            </div>

            <form onSubmit={handleSubmitProposal} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">فروشنده / ویزیتور *</label>
                  <select
                    required
                    value={propUserId}
                    onChange={e => setPropUserId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500"
                  >
                    <option value="">انتخاب فروشنده</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.agency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">دوره هدف</label>
                  <select
                    value={propMonth}
                    onChange={e => setPropMonth(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500"
                  >
                    <option value="1405-07">مهر ۱۴۰۵</option>
                    <option value="1405-08">آبان ۱۴۰۵</option>
                    <option value="1405-09">آذر ۱۴۰۵</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">برند هدف</label>
                  <select
                    value={propBrand}
                    onChange={e => setPropBrand(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500"
                  >
                    <option value="مولفیکس">مولفیکس</option>
                    <option value="ببم">ببم</option>
                    <option value="مولپد">مولپد</option>
                    <option value="تنو">تنو</option>
                    <option value="پاپیا">پاپیا</option>
                    <option value="تست">تست</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">تارگت پیشنهادی (کارتن) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={propQty}
                    onChange={e => setPropQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1">تعداد فروشگاه هدف تحت پوشش</label>
                  <input
                    type="number"
                    min="0"
                    value={propStoreTarget}
                    onChange={e => setPropStoreTarget(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  نظر، استدلال و مبنای تغییر (الزامی) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={propReason}
                  onChange={e => setPropReason(e.target.value)}
                  placeholder="علت تغییر، پتانسیل منطقه، آمار فاکتورهای اخیر، شرایط ویزیتور یا درخواست شعبه..."
                  className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2f47]">
                <button
                  type="button"
                  onClick={() => setShowProposalModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1c2e47] text-slate-300 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md shadow-cyan-600/20"
                >
                  ارسال پیشنهاد جهت تأیید مرحله ۱ (مدیر نمایندگی)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: REVIEW PROPOSAL (REP OR ADMIN) ===================== */}
      {reviewingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121e30] border border-blue-500/40 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#283a53] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  {reviewingProposal.stage === 'pending_rep'
                    ? 'بررسی و تأیید مرحله ۱ (مدیر نمایندگی)'
                    : 'بررسی و تأیید نهایی مرحله ۲ (مدیر کل)'}
                </h3>
              </div>
              <button
                onClick={() => setReviewingProposal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#0b1625] p-3.5 rounded-xl border border-[#1e2f47]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">فروشنده:</span>
                <span className="font-bold text-white">{reviewingProposal.userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">برند و دوره:</span>
                <span className="text-cyan-300 font-semibold">{reviewingProposal.brand} · {monthLabel(reviewingProposal.month)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">تارگت پیشنهادی جدید:</span>
                <span className="font-bold text-white font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  {num(reviewingProposal.proposedQuantity)} کارتن ({num(reviewingProposal.proposedStoreTarget)} مغازه)
                </span>
              </div>
              <div className="pt-2 border-t border-[#1a293d]">
                <span className="text-slate-400 block mb-1">نظر کارشناس پشتیبانی ({reviewingProposal.proposedByName}):</span>
                <p className="text-slate-200 italic bg-[#101d2d] p-2 rounded-lg border border-[#18283a]">
                  «{reviewingProposal.reason}»
                </p>
              </div>

              {reviewingProposal.repReview && (
                <div className="pt-2 border-t border-[#1a293d]">
                  <span className="text-emerald-300 block mb-1">نظر تأیید مدیر نمایندگی ({reviewingProposal.repReview.reviewedByName}):</span>
                  <p className="text-slate-200 italic bg-[#101d2d] p-2 rounded-lg border border-[#18283a]">
                    «{reviewingProposal.repReview.note}»
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1">
                توضیحات یا نظر تصمیم‌گیرنده (اختیاری):
              </label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder="توضیحات در صورت نیاز..."
                className="w-full p-2.5 rounded-xl bg-[#0c1727] border border-[#283a53] text-white outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e2f47]">
              <button
                type="button"
                onClick={() => setReviewingProposal(null)}
                className="px-3.5 py-1.5 rounded-xl bg-[#1c2e47] text-slate-300 text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (reviewingProposal.stage === 'pending_rep') {
                    handleRepDecision(reviewingProposal, 'rejected');
                  } else {
                    handleAdminDecision(reviewingProposal, 'rejected');
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold"
              >
                رد پیشنهاد
              </button>
              <button
                type="button"
                onClick={() => {
                  if (reviewingProposal.stage === 'pending_rep') {
                    handleRepDecision(reviewingProposal, 'approved');
                  } else {
                    handleAdminDecision(reviewingProposal, 'approved');
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                {reviewingProposal.stage === 'pending_rep'
                  ? 'تأیید مرحله ۱ (ارسال به مدیر کل)'
                  : 'تأیید نهایی و اعمال در سیستم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
