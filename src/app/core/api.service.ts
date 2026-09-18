import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_URL } from './farm';
import { Bill, BannerInfo, Breakdown, BreakdownType, CouponPreview, DeliveryInfo, ShopSettings, DailyEntry, DayDetail, Expense, ExtraSale, ExtraSummary, LoginActivity, Offer, Payment, Product, Stats, UserInfo } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ---------------- Public ----------------

  getProducts(category?: string) {
    let params = new HttpParams();
    if (category && category !== 'All') params = params.set('category', category);
    return this.http.get<Product[]>(`${API_URL}/public/products`, { params });
  }

  getCategories() {
    return this.http.get<string[]>(`${API_URL}/public/categories`);
  }

  // ---------------- Public: offers ----------------

  /** Live, listable coupons — what the cart's offer list shows. */
  getLiveOffers() {
    return this.http.get<Offer[]>(`${API_URL}/public/offers`);
  }

  /**
   * Checks a typed code against the cart total. A wrong code comes back as
   * `valid: false` with a message, not as an HTTP error.
   */
  validateCoupon(code: string, amount: number) {
    const params = new HttpParams().set('code', code).set('amount', String(amount));
    return this.http.get<CouponPreview>(`${API_URL}/public/offers/validate`, { params });
  }

  /** Counts one redemption when the order is actually sent to WhatsApp. */
  markCouponUsed(code: string) {
    return this.http.post(`${API_URL}/public/offers/${encodeURIComponent(code)}/used`, {});
  }

  // ---------------- Customer ----------------

  getMyBill(from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<Bill>(`${API_URL}/customer/bill`, { params });
  }

  /**
   * "I have paid by UPI" — stored as a PENDING payment. It does not change the
   * outstanding; an admin confirms it, and only then does the khata move.
   */
  claimMyPayment(data: { amount?: number; ref?: string; note?: string; requestId?: string }) {
    return this.http.post<Payment>(`${API_URL}/customer/payments/claim`, data);
  }

  /** The customer's own reports that are still waiting for verification. */
  getMyClaims() {
    return this.http.get<Payment[]>(`${API_URL}/customer/payments/claim`);
  }

  // ---------------- Admin: customers ----------------

  getCustomers() {
    return this.http.get<UserInfo[]>(`${API_URL}/admin/customers`);
  }

  addCustomer(data: Partial<UserInfo> & { password?: string }) {
    return this.http.post<UserInfo>(`${API_URL}/admin/customers`, data);
  }

  updateCustomer(id: string, data: Partial<UserInfo> & { password?: string }) {
    return this.http.put<UserInfo>(`${API_URL}/admin/customers/${id}`, data);
  }

  getCustomerBill(id: string, from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<Bill>(`${API_URL}/admin/customers/${id}/bill`, { params });
  }

  // ---------------- Admin: daily entries ----------------

  addEntry(data: { customerId: string; productId: string; quantity: number; rate?: number; entryDate?: string; note?: string; paid?: boolean; paymentMode?: string; packLabel?: string; couponCode?: string }) {
    return this.http.post<DailyEntry>(`${API_URL}/admin/entries`, data);
  }

  /** Adds the selected products for every date in a range (checkbox entry sheet). */
  addEntriesBulk(data: {
    customerId: string;
    from: string;
    to: string;
    paid?: boolean;
    paymentMode?: string;
    note?: string;
    items: { productId: string; quantity: number; rate?: number; packLabel?: string }[];
    /** Coupon applied to every entry this save creates. */
    couponCode?: string;
    /** Unique id per save tap — the backend ignores an accidental repeat. */
    requestId?: string;
  }) {
    return this.http.post<{
      created: number; days: number; totalAmount: number;
      discount?: number; couponCode?: string | null; duplicate?: boolean;
    }>(`${API_URL}/admin/entries/bulk`, data);
  }

  getEntries(filter: { customerId?: string; from?: string; to?: string }) {
    let params = new HttpParams();
    if (filter.customerId) params = params.set('customerId', filter.customerId);
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    return this.http.get<DailyEntry[]>(`${API_URL}/admin/entries`, { params });
  }

  /** Deletes the checkbox selection on a bill in one request. */
  deleteEntriesBulk(ids: string[]) {
    return this.http.post<{ deleted: number; amount: number }>(
      `${API_URL}/admin/entries/delete-bulk`, { ids });
  }

  deleteEntry(id: string) {
    return this.http.delete(`${API_URL}/admin/entries/${id}`);
  }

  // ---------------- Admin: payments ----------------

  addPayment(data: { customerId: string; amount: number; paymentDate?: string; mode?: string; note?: string }) {
    return this.http.post<Payment>(`${API_URL}/admin/payments`, data);
  }

  /** A past month's pending amount — saved as an UNPAID entry that raises the outstanding. */
  addOldDue(data: { customerId: string; amount: number; month: string; note?: string; requestId?: string }) {
    return this.http.post<DailyEntry>(`${API_URL}/admin/entries/old-due`, data);
  }

  getPayments(filter: { customerId?: string; from?: string; to?: string }) {
    let params = new HttpParams();
    if (filter.customerId) params = params.set('customerId', filter.customerId);
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    return this.http.get<Payment[]>(`${API_URL}/admin/payments`, { params });
  }

  deletePayment(id: string) {
    return this.http.delete(`${API_URL}/admin/payments/${id}`);
  }

  /** Every customer-reported UPI payment awaiting verification, all customers. */
  getPendingPayments() {
    return this.http.get<Payment[]>(`${API_URL}/admin/payments/pending`);
  }

  /**
   * Verify a customer's claim so it starts counting in the khata. Pass an
   * amount/date to correct what the customer reported; omit to accept as-is.
   */
  confirmPayment(id: string, data: { amount?: number; paymentDate?: string; mode?: string; note?: string } = {}) {
    return this.http.post<Payment>(`${API_URL}/admin/payments/${id}/confirm`, data);
  }

  // ---------------- Admin: expenses ----------------

  addExpense(data: {
    category: string;
    quantity?: number;
    unit?: string;
    unitAmount?: number;
    amount: number;
    expenseDate?: string;
    note?: string;
  }) {
    return this.http.post<Expense>(`${API_URL}/admin/expenses`, data);
  }

  getExpenses(filter: { from?: string; to?: string }) {
    let params = new HttpParams();
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    return this.http.get<Expense[]>(`${API_URL}/admin/expenses`, { params });
  }

  deleteExpense(id: string) {
    return this.http.delete(`${API_URL}/admin/expenses/${id}`);
  }

  // ---------------- Admin: products ----------------

  getAdminProducts() {
    return this.http.get<Product[]>(`${API_URL}/admin/products`);
  }

  addProduct(product: Product) {
    return this.http.post<Product>(`${API_URL}/admin/products`, product);
  }

  updateProduct(id: string, product: Product) {
    return this.http.put<Product>(`${API_URL}/admin/products/${id}`, product);
  }

  deleteProduct(id: string) {
    return this.http.delete(`${API_URL}/admin/products/${id}`);
  }

  // ---------------- Admin: staff ----------------

  getStaff() {
    return this.http.get<UserInfo[]>(`${API_URL}/admin/staff`);
  }

  addStaff(data: { name: string; loginId: string; password?: string; role: string; active?: boolean }) {
    return this.http.post<UserInfo>(`${API_URL}/admin/staff`, data);
  }

  updateStaff(id: string, data: { name?: string; loginId?: string; password?: string; role?: string; active?: boolean }) {
    return this.http.put<UserInfo>(`${API_URL}/admin/staff/${id}`, data);
  }

  deleteStaff(id: string) {
    return this.http.delete(`${API_URL}/admin/staff/${id}`);
  }

  /** Who is behind a dashboard figure — cash, online or outstanding. */
  getBreakdown(type: BreakdownType, month?: string) {
    let params = new HttpParams().set('type', type);
    if (month) params = params.set('month', month);
    return this.http.get<Breakdown>(`${API_URL}/admin/stats/breakdown`, { params });
  }

  // ---------------- Delivery settings ----------------

  /** Public: the cart needs the delivery rule before anyone signs in. */
  getDeliveryInfo() {
    return this.http.get<DeliveryInfo>(`${API_URL}/public/settings`);
  }

  /** Public: the strip shows on every page, signed in or not. */
  getBanner() {
    return this.http.get<BannerInfo>(`${API_URL}/public/banner`);
  }

  saveBanner(body: BannerInfo) {
    return this.http.put<ShopSettings>(`${API_URL}/admin/settings/banner`, body);
  }

  getShopSettings() {
    return this.http.get<ShopSettings>(`${API_URL}/admin/settings`);
  }

  saveDelivery(body: DeliveryInfo) {
    return this.http.put<ShopSettings>(`${API_URL}/admin/settings/delivery`, body);
  }

  // ---------------- Admin: product photos ----------------

  /**
   * Uploads one photo and returns the reference to store on the product.
   *
   * No Content-Type is set by hand: the browser has to add the multipart
   * boundary itself, and naming the type here would overwrite it and make the
   * upload arrive empty.
   */
  uploadImage(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<{ id: string; url: string }>(`${API_URL}/admin/images`, body);
  }

  deleteImage(id: string) {
    return this.http.delete(`${API_URL}/admin/images/${id}`);
  }

  // ---------------- Admin: offers ----------------

  getOffers() {
    return this.http.get<Offer[]>(`${API_URL}/admin/offers`);
  }

  /** Just the codes that work today for the given scope (entry-sheet chips). */
  getLiveOffersFor(scope: 'WEBSITE' | 'KHATA' | 'BOTH') {
    const params = new HttpParams().set('scope', scope);
    return this.http.get<Offer[]>(`${API_URL}/admin/offers/live`, { params });
  }

  addOffer(offer: Offer) {
    return this.http.post<Offer>(`${API_URL}/admin/offers`, offer);
  }

  updateOffer(id: string, offer: Offer) {
    return this.http.put<Offer>(`${API_URL}/admin/offers/${id}`, offer);
  }

  deleteOffer(id: string) {
    return this.http.delete(`${API_URL}/admin/offers/${id}`);
  }

  // ---------------- Admin: stats ----------------

  /** Last sign-in per side + the recent feed (Login Management). */
  getLoginActivity() {
    return this.http.get<LoginActivity>(`${API_URL}/admin/logins`);
  }

  // ---------------- extra (walk-in) sales ----------------

  addExtraSale(data: Partial<ExtraSale>) {
    return this.http.post<ExtraSale>(`${API_URL}/admin/extra-sales`, data);
  }

  getExtraSales(from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ExtraSale[]>(`${API_URL}/admin/extra-sales`, { params });
  }

  getExtraSummary() {
    return this.http.get<ExtraSummary>(`${API_URL}/admin/extra-sales/summary`);
  }

  deleteExtraSale(id: string) {
    return this.http.delete<{ status: string }>(`${API_URL}/admin/extra-sales/${id}`);
  }

  /** Any register as a CSV blob — the caller saves it with saveBlob(). */
  downloadCsv(file: string, params?: Record<string, string | undefined>) {
    let hp = new HttpParams();
    for (const [k, v] of Object.entries(params || {})) {
      if (v) hp = hp.set(k, v);
    }
    return this.http.get(`${API_URL}/admin/export/${file}`, { params: hp, responseType: 'blob' });
  }

  getStats(month?: string) {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<Stats>(`${API_URL}/admin/stats/overview`, { params });
  }

  /** Sales + expense breakdown for one day (chart click-through). */
  getDayDetail(date: string) {
    const params = new HttpParams().set('date', date);
    return this.http.get<DayDetail>(`${API_URL}/admin/stats/day`, { params });
  }
}
