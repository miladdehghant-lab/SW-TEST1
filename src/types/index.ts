export type UserRole = 'admin' | 'rep' | 'supervisor' | 'support' | 'seller';

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'inactive';

export type UserOperationalStatus = 'league' | 'trainee' | 'test';

export interface User {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  nationalId?: string;
  city: string;
  agency: string;
  role: UserRole;
  status: UserStatus;
  operationalStatus?: UserOperationalStatus; // 'league' (رسمی در لیگ), 'trainee' (آموزشی), 'test' (موقت/تستی)
  targetStatus?: 'has_target' | 'requested' | 'not_needed';
  isSamplePhone?: boolean; // شماره موقت یا سمپل حاصل از خواندن فایل
  isConvertedUser?: boolean; // آیا به کاربر کامل تبدیل شده است
  password?: string;
  supervisorId?: string;
  createdAt: string;
}

export type StorePotential = 'low' | 'medium' | 'high';
export type StoreStatus = 'activated' | 'provisional' | 'inactive' | 'incomplete';

export interface Store {
  id: string;
  name: string;
  code: string;
  city: string;
  contact?: string;
  phone?: string;
  address?: string;
  agency: string;
  potential: StorePotential;
  ownerId: string;
  status: StoreStatus;
  needsCompletion?: boolean;
  source?: 'manual' | 'excel_ingestion';
  completedAt?: string;
  completedBy?: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  createdAt: string;
}

export type ActivityType = 'initial' | 'repeat' | 'visit' | 'merch' | 'recovery';
export type ActivityStatus = 'submitted' | 'verified' | 'returned' | 'rejected';

export interface Activity {
  id: string;
  storeId: string;
  ownerId: string;
  type: ActivityType;
  sku?: string;
  brand?: string;
  note?: string;
  photo?: string | null;
  photoAfter?: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  status: ActivityStatus;
  points: number;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface SaleRecord {
  id: string;
  uploadId?: string;
  month: string; // e.g. "1405-07"
  agency: string;
  coveredThrough: string;
  sellerName: string;
  ownerId: string | null;
  invoice: string;
  invoiceDate?: string;
  customerCode: string;
  customerName?: string;
  brand: string;
  sku: string;
  product?: string;
  quantity: number;
  value?: string | number;
  isReturn?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  valid?: boolean;
  errors?: string[];
  warnings?: string[];
  sourceRow?: number;
}

export interface UploadBatch {
  id: string;
  fileName: string;
  month: string;
  agency: string;
  coveredThrough: string;
  createdAt: string;
  rowCount: number;
  invalidCount: number;
  returnCount?: number;
  newStoresCount?: number;
  status: 'pending' | 'approved' | 'rejected';
  rows: SaleRecord[];
  unmapped: string[];
}

export interface Target {
  id: string;
  userId: string;
  month: string;
  brand: string;
  quantity: number;
  storeTarget: number;
  agency: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
}

export interface ScoreEvent {
  id: string;
  userId: string;
  month: string;
  points: number;
  sourceType: 'activity' | 'sale' | 'target_bonus' | 'manual';
  sourceId: string;
  createdAt: string;
  description?: string;
}

export interface AuditLog {
  id: string;
  at: string;
  by: string;
  action: string;
  details: Record<string, any>;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  brand?: string;
  type: 'merch' | 'initial_stores' | 'qty_sales' | 'repeat_orders';
  targetCount: number;
  rewardPoints: number;
  startDate: string;
  endDate: string;
  active: boolean;
  userProgress?: Record<string, number>; // userId -> current count
}

export interface TeamStanding {
  id: string;
  name: string;
  supervisorId: string;
  supervisorName: string;
  agency: string;
  memberCount: number;
  totalScore: number;
  avgScore: number;
  targetQuantity: number;
  achievedQuantity: number;
  achievementPct: number;
}

export type ProjectPhase = 'phase1_visitors' | 'phase2_supervisors' | 'phase3_retailers' | 'phase4_consumers';

export interface AppSettings {
  currentPhase: ProjectPhase;
  weights: {
    coverage: number;
    assortment: number;
    drop: number;
    stock: number;
    repeat: number;
    visibility: number;
    reliability: number;
    growth: number;
  };
}

export interface TargetRequest {
  id: string;
  userId: string;
  userName: string;
  requestedBy: string;
  month: string;
  basis: 'sales_history' | 'territory_capacity' | 'new_hire' | 'custom';
  note?: string;
  status: 'pending' | 'defined' | 'marked_test' | 'rejected';
  createdAt: string;
}

export interface LostOpportunity {
  id: string;
  userId: string;
  sellerName: string;
  storeId?: string;
  storeCode: string;
  storeName: string;
  invoiceDate: string;
  invoiceNumber: string;
  cartons: number;
  daysAgo: number;
  missedPoints: number;
  reason: string;
}

export interface SubCategoryDef {
  id: string;
  name: string; // e.g. مایع لباسشویی، پوشک کامل کودک
  brand: string; // e.g. تست، مولفیکس، تنو، پاپیا، مولپد، ببم، یا عمومی
  targetWeight?: number; // اولویت و ضریب اهمیت در تارگت‌گذاری (مثلاً ۱.۵ یا ۲)
  description?: string; // توضیحات هدف‌گذاری یا ارزش استراتژیک
  isStrategicTarget?: boolean; // آیا به عنوان تارگت اختصاصی مهم در نظر گرفته شده؟
  isCustom?: boolean; // آیا توسط مدیر به صورت دستی تعریف شده؟
  createdAt: string;
}

export interface ProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  subCategory: string; // e.g. مایع لباسشویی، نرم‌کننده، پوشک، دستمال توالت، نوار بهداشتی
  packVariant?: string; // e.g. توئین پک (Twin Pack)، نرمال پک (Normal Pack)، جامبو، دوقلو، ۱۲ رول، ۳ لیتری
  packaging?: string; // e.g. کارتن ۱۲ تایی، ۳ لیتری
  barcode?: string;
  imageUrl?: string;
  pointsForPlacement?: number; // امتیاز حضور در شلف
  source: 'auto_detected' | 'manual' | 'excel_sync';
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PlanogramSlot {
  id: string;
  shelfIndex: number; // 0, 1, 2, 3...
  colIndex: number;   // 0, 1, 2, 3...
  productId?: string;
  facingCount?: number; // تعداد رخ
}

export interface Planogram {
  id: string;
  title: string;
  brand: string;
  category?: string;
  shelvesCount: number; // تعداد طبقات قفسه
  colsPerShelf: number; // تعداد خانه‌های هر طبقه
  slots: PlanogramSlot[];
  idealPhotoUrl?: string; // تصویر الگوی ایده‌آل
  description?: string;
  minComplianceScore?: number; // حداقل امتیاز تطابق جهت پاس شدن (مثلاً ۷۵%)
  bonusPoints?: number; // امتیاز استاندارد چیدمان
  createdAt: string;
  updatedAt?: string;
}

export interface TargetProposal {
  id: string;
  targetId?: string; // اگر ویرایش تارگت موجود باشد
  userId: string; // شناسه ویزیتور
  userName: string;
  month: string;
  brand: string;
  proposedQuantity: number;
  proposedStoreTarget: number;
  currentQuantity?: number;
  currentStoreTarget?: number;
  reason: string; // نظر کارشناس پشتیبانی و مبنای تغییر
  proposedBy: string; // شناسه ثبت‌کننده (پشتیبان / ثبت داده)
  proposedByName: string;
  stage: 'pending_rep' | 'pending_admin' | 'approved' | 'rejected';
  repReview?: {
    reviewedBy: string;
    reviewedByName: string;
    reviewedAt: string;
    decision: 'approved' | 'rejected';
    note?: string;
  };
  adminReview?: {
    reviewedBy: string;
    reviewedByName: string;
    reviewedAt: string;
    decision: 'approved' | 'rejected';
    note?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface AppState {
  version: number;
  users: User[];
  stores: Store[];
  activities: Activity[];
  uploads: UploadBatch[];
  sales: SaleRecord[];
  targets: Target[];
  targetRequests?: TargetRequest[];
  targetProposals?: TargetProposal[];
  scoreEvents: ScoreEvent[];
  challenges: WeeklyChallenge[];
  products?: ProductCatalogItem[];
  subCategories?: SubCategoryDef[];
  planograms?: Planogram[];
  audit: AuditLog[];
  settings: AppSettings;
}

export interface AuthSession {
  admin?: boolean;
  id: string;
}

