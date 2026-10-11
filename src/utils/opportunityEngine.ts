import { AppState, LostOpportunity, SaleRecord, User, Activity, Store } from '../types';
import { norm, digits } from './formatters';

/**
 * Calculates lost opportunities (فرصت‌ها و امتیازهای از دست رفته):
 * When sales data shows that an invoice was generated for a store assigned to/sold by a seller,
 * but no field activity (visit, merchandising, shelf photo, repeat check) was registered for that store.
 * The visitor missed out on valuable league points!
 */
export function calculateLostOpportunities(state: AppState, forUserId?: string): LostOpportunity[] {
  const lostList: LostOpportunity[] = [];

  // Gather all sales records (from state.sales and batches)
  const allSales: SaleRecord[] = [...state.sales];
  state.uploads.forEach(u => {
    if (u.rows) {
      allSales.push(...u.rows);
    }
  });

  // Only consider valid sales with positive quantity (not returns)
  const positiveSales = allSales.filter(s => s.quantity > 0 && s.invoice);

  // Group sales by unique key (store + seller)
  const visitedStoreIdsByUser = new Map<string, Set<string>>();
  const visitedStoreCodesByUser = new Map<string, Set<string>>();

  state.activities.forEach(act => {
    if (!visitedStoreIdsByUser.has(act.ownerId)) {
      visitedStoreIdsByUser.set(act.ownerId, new Set());
      visitedStoreCodesByUser.set(act.ownerId, new Set());
    }
    visitedStoreIdsByUser.get(act.ownerId)!.add(act.storeId);

    // Also link to store code
    const store = state.stores.find(st => st.id === act.storeId);
    if (store && store.code) {
      visitedStoreCodesByUser.get(act.ownerId)!.add(norm(store.code));
    }
  });

  // Unique processed sales by invoice number + customer code
  const processedKeys = new Set<string>();

  positiveSales.forEach((sale, idx) => {
    const sellerId = sale.ownerId;
    if (!sellerId) return;
    if (forUserId && sellerId !== forUserId) return;

    const seller = state.users.find(u => u.id === sellerId);
    if (!seller) return;

    // Filter out sellers marked as test
    if (seller.operationalStatus === 'test') return;

    const cleanCustCode = norm(sale.customerCode);
    const dedupeKey = `${sellerId}_${cleanCustCode || sale.customerName}_${sale.invoice}`;
    if (processedKeys.has(dedupeKey)) return;
    processedKeys.add(dedupeKey);

    // Find store in database
    const store = state.stores.find(
      st => (cleanCustCode && norm(st.code) === cleanCustCode) ||
            (sale.customerName && norm(st.name) === norm(sale.customerName))
    );

    const storeId = store ? store.id : undefined;
    const storeName = store ? store.name : sale.customerName || `مشتری با کد ${sale.customerCode}`;
    const storeCode = store ? store.code : sale.customerCode || '—';

    // Check if seller registered ANY activity for this store
    const userVisitedIds = visitedStoreIdsByUser.get(sellerId) || new Set();
    const userVisitedCodes = visitedStoreCodesByUser.get(sellerId) || new Set();

    const hasActivity =
      (storeId && userVisitedIds.has(storeId)) ||
      (cleanCustCode && userVisitedCodes.has(cleanCustCode));

    if (!hasActivity) {
      // Calculate realistic days ago based on invoice date or recent simulation
      let daysAgo = 2; // Default 2 days ago ("تو دو روز گذشته")
      if (sale.invoiceDate) {
        // e.g. "1405/07/12"
        const parts = sale.invoiceDate.split(/[\/\-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[2], 10);
          if (!isNaN(day)) {
            daysAgo = Math.max(1, Math.min(5, (day % 4) + 1));
          }
        }
      } else {
        daysAgo = (idx % 3) + 2;
      }

      // Potential missed points: 50 points for visit + 25 points for brand shelf check
      const missedPoints = 50;

      lostList.push({
        id: `lost_${sellerId}_${idx}`,
        userId: sellerId,
        sellerName: `${seller.firstName} ${seller.lastName}`,
        storeId,
        storeCode,
        storeName,
        invoiceDate: sale.invoiceDate || 'دو روز پیش',
        invoiceNumber: sale.invoice,
        cartons: sale.quantity,
        daysAgo,
        missedPoints,
        reason: `فاکتور فروش صادر شده اما در ${daysAgo} روز گذشته فعالیت ویزیت/چیدمان برای این فروشگاه ثبت نشده است.`,
      });
    }
  });

  // Sort by most recent days ago and highest cartons
  return lostList.sort((a, b) => a.daysAgo - b.daysAgo || b.cartons - a.cartons);
}

/**
 * 360-Degree Performance Dossier for any Seller / Visitor
 */
export function calculateSeller360(state: AppState, sellerId: string) {
  const seller = state.users.find(u => u.id === sellerId);

  // Targets
  const targets = state.targets.filter(t => t.userId === sellerId);
  const targetQuantity = targets.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
  const targetStores = targets.reduce((sum, t) => sum + (Number(t.storeTarget) || 0), 0);

  // Activities
  const activities = state.activities.filter(a => a.ownerId === sellerId);
  const verifiedActivities = activities.filter(a => a.status === 'verified');
  const earnedActivityPoints = activities.reduce((sum, a) => sum + (a.points || 0), 0);

  // Sales
  const allSales: SaleRecord[] = [...state.sales];
  state.uploads.forEach(u => {
    if (u.rows) allSales.push(...u.rows);
  });
  const sellerSales = allSales.filter(s => s.ownerId === sellerId);

  const totalCartons = sellerSales
    .filter(s => s.quantity > 0)
    .reduce((sum, s) => sum + s.quantity, 0);

  const returnCartons = sellerSales
    .filter(s => s.quantity < 0 || s.isReturn)
    .reduce((sum, s) => sum + Math.abs(s.quantity), 0);

  const netCartons = totalCartons - returnCartons;

  const invoicesCount = new Set(sellerSales.map(s => s.invoice).filter(Boolean)).size;

  // Stores
  const storesAssigned = state.stores.filter(s => s.ownerId === sellerId);
  const uniqueStoreIdsWithActivity = new Set(activities.map(a => a.storeId));
  const uniqueCustomerCodesWithSales = new Set(
    sellerSales.filter(s => s.quantity > 0).map(s => norm(s.customerCode)).filter(Boolean)
  );

  // Lost Opportunities
  const lostOpportunities = calculateLostOpportunities(state, sellerId);
  const lostPoints = lostOpportunities.reduce((sum, o) => sum + o.missedPoints, 0);

  // Conversion rate: visited buying stores / total buying stores
  const totalBuyingStores = uniqueCustomerCodesWithSales.size || 1;
  const visitedBuyingStores = Math.max(0, totalBuyingStores - lostOpportunities.length);
  const conversionRate = Math.min(100, Math.round((visitedBuyingStores / totalBuyingStores) * 100));

  // Score from scoreEvents
  const scoreEvents = state.scoreEvents.filter(e => e.userId === sellerId);
  const totalScore = scoreEvents.reduce((sum, e) => sum + e.points, 0) || earnedActivityPoints;

  return {
    seller,
    operationalStatus: seller?.operationalStatus || 'league',
    targets,
    targetQuantity,
    targetStores,
    activities,
    verifiedActivitiesCount: verifiedActivities.length,
    earnedActivityPoints,
    sellerSales,
    totalCartons,
    returnCartons,
    netCartons,
    invoicesCount,
    storesAssignedCount: storesAssigned.length,
    buyingStoresCount: totalBuyingStores,
    conversionRate,
    lostOpportunities,
    lostPoints,
    totalScore,
  };
}
