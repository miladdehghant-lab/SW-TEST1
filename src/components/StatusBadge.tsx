import React from 'react';
import { ActivityStatus, StoreStatus, UserStatus } from '../types';

interface StatusBadgeProps {
  status: ActivityStatus | StoreStatus | UserStatus | 'approved' | 'rejected' | 'pending';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'approved':
    case 'verified':
    case 'activated':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          {status === 'activated' ? 'فعال‌شده' : 'تأییدشده'}
        </span>
      );
    case 'pending':
    case 'submitted':
    case 'provisional':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          {status === 'provisional' ? 'موقت (در انتظار اولین فروش)' : status === 'submitted' ? 'در انتظار بررسی' : 'در انتظار تأیید'}
        </span>
      );
    case 'incomplete':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          نیازمند تکمیل اطلاعات
        </span>
      );
    case 'returned':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-400">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
          نیازمند اصلاح
        </span>
      );
    case 'rejected':
    case 'inactive':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          {status === 'inactive' ? 'غیرفعال' : 'ردشده'}
        </span>
      );
  }
};
