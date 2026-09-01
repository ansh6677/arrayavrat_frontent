export interface Product {
  id?: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  price: number;
  imageUrl?: string;
  available: boolean;
  /** Teaser product (e.g. Mushroom, Spices) — shown with a "Coming soon" badge. */
  comingSoon?: boolean;
  /** Display position on the website — lower comes first. */
  sortOrder?: number;
}

export interface UserInfo {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  role: string;      // ADMIN | VIEWER | CUSTOMER
  active: boolean;
  /** The .env-managed primary administrator — locked against all edits. */
  superAdmin?: boolean;
  /** Stamped by the backend on every successful sign-in. */
  lastLoginAt?: string;
  /** PAGE = self-registered on the website, ADF = added by the farm. */
  signupSource?: string;
  /** Products this customer usually takes — pre-ticked in the daily entry sheet. */
  preferredProductIds?: string[];
  /** Usual daily quantity per product (productId → qty); missing entries default to 1. */
  preferredQuantities?: Record<string, number>;
}

export interface DailyEntry {
  id?: string;
  customerId: string;
  customerName?: string;
  productId: string;
  productName?: string;
  unit?: string;
  quantity: number;
  rate: number;
  total: number;
  entryDate: string;
  note?: string;
  /** true = paid on the spot (auto payment recorded); false = on credit. */
  paid?: boolean;
  linkedPaymentId?: string;
}

export interface Payment {
  id?: string;
  customerId: string;
  customerName?: string;
  amount: number;
  paymentDate: string;
  mode?: string;
  note?: string;
  /** YYYY-MM of the old billing cycle this payment clears; unset for normal payments. */
  forPeriod?: string;
}

export interface Expense {
  id?: string;
  category: string;
  /** How many units were bought (e.g. 5 sacks). */
  quantity?: number;
  /** Unit label shown next to the quantity (sack, litre, hour…). */
  unit?: string;
  /** Cost of one unit — amount = quantity x unitAmount. */
  unitAmount?: number;
  amount: number;
  expenseDate: string;
  note?: string;
}

export interface Bill {
  customerId: string;
  customerName: string;
  phone: string;
  address?: string;
  from: string;
  to: string;
  entries: DailyEntry[];
  periodTotal: number;
  payments: Payment[];
  periodPaid: number;
  lifetimePurchases: number;
  lifetimePaid: number;
  /** Dues carried in from before this period. */
  previousBalance: number;
  outstanding: number;
}

export interface AuthResponse {
  token: string;
  id: string;
  name: string;
  phone: string;
  role: string;
}

export interface DatePoint {
  label: string;
  total: number;
}

/** "Kaun kitna sell hua" — per-product today & this-month totals. */
export interface ProductSale {
  productId: string;
  productName: string;
  unit: string;
  todayQty: number;
  todayAmount: number;
  monthQty: number;
  monthAmount: number;
}

export interface DayPoint {
  /** ISO date (YYYY-MM-DD) — used to fetch the day breakdown. */
  date: string;
  label: string;
  sales: number;
  expenses: number;
  /** Walk-in slice of that day's sales (already inside `sales`). */
  extra: number;
}

export interface MonthOption {
  value: string;   // YYYY-MM
  label: string;   // August 2026
}

export interface DayEntryRow {
  customerName: string;
  productName: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  paid: boolean;
}

export interface DayExpenseRow {
  category: string;
  note?: string;
  quantity: number;
  unit?: string;
  unitAmount: number;
  amount: number;
}

/** Everything that happened on one day — powers the chart click-through popup. */
export interface DayDetail {
  date: string;
  label: string;
  sales: number;
  expenses: number;
  profit: number;
  entryCount: number;
  expenseCount: number;
  /** Walk-in counter sales on this day — included in the sales figure. */
  extraTotal: number;
  extraCount: number;
  entries: DayEntryRow[];
  expenseRows: DayExpenseRow[];
  extraRows: DayExtraRow[];
}

export interface DayExtraRow {
  customerName: string;
  productName: string;
  quantity: number;
  unit?: string;
  rate: number;
  total: number;
  paymentMode?: string;
}

/** A walk-in / counter sale — the occasional offline customer. */
export interface ExtraSale {
  id?: string;
  customerName?: string;
  productId?: string | null;
  productName: string;
  unit?: string;
  quantity: number;
  rate: number;
  total: number;
  saleDate: string;
  paymentMode?: string;
  note?: string;
}

export interface ExtraSummary {
  todayTotal: number;
  monthTotal: number;
  allTimeTotal: number;
  monthCount: number;
  allCount: number;
}

export interface Stats {
  month: string;
  monthLabel: string;
  todaySales: number;
  monthSales: number;
  totalSales: number;
  /** Walk-in counter sales — already included in the figures above. */
  todayExtraSales: number;
  monthExtraSales: number;
  totalExtraSales: number;
  totalPaymentsReceived: number;
  totalOutstanding: number;
  todayExpenses: number;
  monthExpenses: number;
  totalExpenses: number;
  monthProfit: number;
  customerCount: number;
  productCount: number;
  todayEntryCount: number;
  productSales: ProductSale[];
  /** One point per day of the selected month. */
  days: DayPoint[];
  /** Last 12 months. */
  monthly: DatePoint[];
  /** Dropdown options for the last 12 months. */
  months: MonthOption[];
}


/** One successful sign-in — the Login Management activity feed. */
export interface LoginEvent {
  id: string;
  userId: string;
  name: string;
  loginId: string;
  role: string;
  side: 'CUSTOMER' | 'MANAGEMENT';
  device?: string;
  at: string;
}

export interface LoginActivity {
  lastManagement: LoginEvent | null;
  lastCustomer: LoginEvent | null;
  recent: LoginEvent[];
}
