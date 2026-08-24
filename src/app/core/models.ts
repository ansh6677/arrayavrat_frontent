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
  /** PAGE = self-registered on the website, ADF = added by the farm. */
  signupSource?: string;
  /** Products this customer usually takes — pre-ticked in the daily entry sheet. */
  preferredProductIds?: string[];
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
  entries: DayEntryRow[];
  expenseRows: DayExpenseRow[];
}

export interface Stats {
  month: string;
  monthLabel: string;
  todaySales: number;
  monthSales: number;
  totalSales: number;
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
