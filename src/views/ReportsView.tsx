import React from 'react';
import { AppState, User } from '../types';
import { fmtDate, roleLabel } from '../utils/formatters';
import { exportToCSV } from '../utils/excelParser';
import { Download, FileText, History, FileSpreadsheet, ShieldAlert } from 'lucide-react';

interface ReportsViewProps {
  currentUser: User | null;
  isAdmin: boolean;
  state: AppState;
  onShowToast: (msg: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  isAdmin,
  state,
  onShowToast,
}) => {
  const handleExport = (type: 'stores' | 'activities' | 'sales' | 'ranking' | 'audit') => {
    switch (type) {
      case 'stores': {
        const rows = state.stores.map(s => {
          const owner = state.users.find(u => u.id === s.ownerId);
          return {
            'نام فروشگاه': s.name,
            'کد مشتری': s.code,
            'شهر': s.city,
            'نمایندگی': s.agency,
            'پتانسیل': s.potential,
            'وضعیت': s.status,
            'ویزیتور مسئول': owner ? `${owner.firstName} ${owner.lastName}` : '',
            'مختصات': s.lat ? `${s.lat},${s.lng}` : '',
          };
        });
        exportToCSV('STORE_WAR_Stores.csv', rows);
        break;
      }
      case 'activities': {
        const rows = state.activities.map(a => {
          const store = state.stores.find(s => s.id === a.storeId);
          const owner = state.users.find(u => u.id === a.ownerId);
          return {
            'تاریخ': fmtDate(a.createdAt),
            'فروشگاه': store?.name || '',
            'ویزیتور': owner ? `${owner.firstName} ${owner.lastName}` : '',
            'نوع': a.type,
            'برند': a.brand || '',
            'وضعیت': a.status,
            'امتیاز': a.points,
            'توضیحات': a.note || '',
          };
        });
        exportToCSV('STORE_WAR_Activities.csv', rows);
        break;
      }
      case 'sales': {
        const rows = state.sales.map(s => ({
          'دوره': s.month,
          'نمایندگی': s.agency,
          'فروشنده': s.sellerName,
          'شماره فاکتور': s.invoice,
          'کد مشتری': s.customerCode,
          'برند': s.brand,
          'تعداد': s.quantity,
          'مبلغ': s.value,
        }));
        exportToCSV('STORE_WAR_Sales.csv', rows);
        break;
      }
      case 'ranking': {
        const approved = state.users.filter(u => u.status === 'approved' && u.role === 'seller');
        const rows = approved.map(u => {
          const score = state.scoreEvents.filter(e => e.userId === u.id).reduce((s, e) => s + e.points, 0);
          return {
            'نام فروشنده': `${u.firstName} ${u.lastName}`,
            'نمایندگی': u.agency,
            'شماره تماس': u.phone,
            'امتیاز کل': score,
          };
        });
        exportToCSV('STORE_WAR_Ranking.csv', rows);
        break;
      }
      case 'audit': {
        const rows = state.audit.map(log => {
          const user = state.users.find(u => u.id === log.by);
          return {
            'زمان': fmtDate(log.at),
            'کاربر': user ? `${user.firstName} ${user.lastName}` : log.by,
            'عملیات': log.action,
            'جزئیات': JSON.stringify(log.details),
          };
        });
        exportToCSV('STORE_WAR_Audit.csv', rows);
        break;
      }
    }
    onShowToast('گزارش با فرمت استاندارد UTF-8 CSV استخراج شد.');
  };

  return (
    <div className="space-y-6">
      {/* Export Hub */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-400" />
          مرکز صدور گزارش‌های تحلیلی و اکسل
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          تمام فایل‌های خروجی دارای نشانه‌گذار UTF-8 BOM بوده و به‌صورت مستقیم و بدون به‌هم‌ریختگی حروف فارسی در نرم‌افزار مایکروسافت اکسل باز می‌شوند.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <button
            onClick={() => handleExport('stores')}
            className="p-3.5 rounded-xl bg-[#17263b] hover:bg-[#1f334f] border border-[#283a53] text-right flex flex-col justify-between transition-colors group"
          >
            <FileSpreadsheet className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <div>
              <div className="font-semibold text-white text-xs">بانک فروشگاه‌ها</div>
              <div className="text-[10px] text-slate-400 mt-0.5">مشخصات، وضعیت و GPS</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('activities')}
            className="p-3.5 rounded-xl bg-[#17263b] hover:bg-[#1f334f] border border-[#283a53] text-right flex flex-col justify-between transition-colors group"
          >
            <FileSpreadsheet className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <div>
              <div className="font-semibold text-white text-xs">فعالیت‌های میدانی</div>
              <div className="text-[10px] text-slate-400 mt-0.5">اقدامات، چیدمان و امتیاز</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('sales')}
            className="p-3.5 rounded-xl bg-[#17263b] hover:bg-[#1f334f] border border-[#283a53] text-right flex flex-col justify-between transition-colors group"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <div>
              <div className="font-semibold text-white text-xs">فاکتورهای فروش</div>
              <div className="text-[10px] text-slate-400 mt-0.5">سفارش‌های تاییدشده ERP</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('ranking')}
            className="p-3.5 rounded-xl bg-[#17263b] hover:bg-[#1f334f] border border-[#283a53] text-right flex flex-col justify-between transition-colors group"
          >
            <FileSpreadsheet className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <div>
              <div className="font-semibold text-white text-xs">رتبه‌بندی و امتیاز</div>
              <div className="text-[10px] text-slate-400 mt-0.5">جدول امتیاز تیم ویزیت</div>
            </div>
          </button>

          <button
            onClick={() => handleExport('audit')}
            className="p-3.5 rounded-xl bg-[#17263b] hover:bg-[#1f334f] border border-[#283a53] text-right flex flex-col justify-between transition-colors group"
          >
            <FileSpreadsheet className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <div>
              <div className="font-semibold text-white text-xs">لاگ تغییرات سیستم</div>
              <div className="text-[10px] text-slate-400 mt-0.5">تاریخچه تصمیمات و ممیزی</div>
            </div>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#121e30] border border-[#283a53] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#283a53] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              تاریخچه تغییرات و ردیابی ممیزی (Audit Trail)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">ثبت شفاف کلیه عملیات‌های تایید، رد یا ایجاد داده</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#16253c] text-slate-300 border-b border-[#283a53]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">زمان و تاریخ</th>
                <th className="py-2.5 px-4 font-semibold">کاربر اقدام‌کننده</th>
                <th className="py-2.5 px-4 font-semibold">نوع عملیات</th>
                <th className="py-2.5 px-4 font-semibold">جزئیات رکورد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f47]">
              {state.audit.slice(0, 30).map(log => {
                const user = state.users.find(u => u.id === log.by);
                return (
                  <tr key={log.id} className="hover:bg-[#16253c]/50">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{fmtDate(log.at)}</td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {user ? `${user.firstName} ${user.lastName}` : log.by === 'usr_admin' ? 'مدیر سیستم' : log.by}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-300">{log.action}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px] max-w-xs truncate" dir="ltr">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
