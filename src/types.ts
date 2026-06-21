export type UserRole = "admin" | "customer";

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  password?: string; // Opt out on sending to frontend
  role: UserRole;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  date: string;
  time: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
}

export interface Purchase {
  id: string;
  customerId: string; // references Customer or User
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  products: PurchaseItem[];
  quantity: number; // Total quantity of items
  totalAmount: number;
  purchaseDate: string; // ISO String or YYYY-MM-DD
}

export interface Visitor {
  id: string;
  customerId: string; // references User if logged in
  name: string;
  email: string;
  mobile: string;
  loginTime: string;
  visitDate: string;
}

export interface ReportStats {
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalProductsSold: number;
  numberOfSales: number;
  totalCustomersCount: number;
  totalVisitorsCount: number;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    role: UserRole;
  };
}
