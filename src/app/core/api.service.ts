import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_URL } from './farm';
import { Bill, DailyEntry, DayDetail, Expense, ExtraSale, ExtraSummary, LoginActivity, Payment, Product, Stats, UserInfo } from './models';

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

  // ---------------- Customer ----------------

  getMyBill(from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<Bill>(`${API_URL}/customer/bill`, { params });
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

  addEntry(data: { customerId: string; productId: string; quantity: number; rate?: number; entryDate?: string; note?: string; paid?: boolean; paymentMode?: string }) {
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
    items: { productId: string; quantity: number; rate?: number }[];
    /** Unique id per save tap — the backend ignores an accidental repeat. */
    requestId?: string;
  }) {
    return this.http.post<{ created: number; days: number; totalAmount: number; duplicate?: boolean }>(
      `${API_URL}/admin/entries/bulk`, data);
  }

  getEntries(filter: { customerId?: string; from?: string; to?: string }) {
    let params = new HttpParams();
    if (filter.customerId) params = params.set('customerId', filter.customerId);
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    return this.http.get<DailyEntry[]>(`${API_URL}/admin/entries`, { params });
  }

  deleteEntry(id: string) {
    return this.http.delete(`${API_URL}/admin/entries/${id}`);
  }

  // ---------------- Admin: payments ----------------

  addPayment(data: { customerId: string; amount: number; paymentDate?: string; mode?: string; note?: string; forPeriod?: string }) {
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
