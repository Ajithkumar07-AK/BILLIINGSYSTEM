import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "supermarket_jwt_secret_constant_2026_xyz";

// ─── In-Memory Data Store ────────────────────────────────────

interface DBUser { id: string; name: string; email: string; mobile: string; password?: string; role: string; }
interface DBProduct { id: string; name: string; category: string; price: number; stock: number; }
interface DBCustomer { id: string; name: string; email: string; mobile: string; date: string; time: string; }
interface DBPurchase { id: string; customerId: string; customerName: string; customerEmail: string; customerMobile: string; products: any[]; quantity: number; totalAmount: number; purchaseDate: string; }
interface DBVisitor { id: string; customerId: string; name: string; email: string; mobile: string; loginTime: string; visitDate: string; }

const data: {
  users: DBUser[];
  products: DBProduct[];
  customers: DBCustomer[];
  purchases: DBPurchase[];
  visitors: DBVisitor[];
} = {
  users: [
    { id: "u_admin", name: "Admin Manager", email: "admin@supermarket.com", mobile: "9876543210", role: "admin" },
    { id: "u_customer", name: "Ramesh Kanna", email: "ramesh@gmail.com", mobile: "9123456789", role: "customer" }
  ],
  products: [
    { id: "p1", name: "Rice (Basmati Premium)", category: "Groceries", price: 60, stock: 150 },
    { id: "p2", name: "Sugar (Refined Safe)", category: "Groceries", price: 50, stock: 120 },
    { id: "p3", name: "Wheat Flour (Atta)", category: "Groceries", price: 45, stock: 180 },
    { id: "p4", name: "Table Salt", category: "Groceries", price: 20, stock: 200 },
    { id: "p5", name: "Pepsi Cold Drink", category: "Beverages", price: 40, stock: 100 },
    { id: "p6", name: "Coca Cola Classic", category: "Beverages", price: 40, stock: 100 },
    { id: "p7", name: "Sprite Lemon Drink", category: "Beverages", price: 40, stock: 100 },
    { id: "p8", name: "Potato Chips (Masala)", category: "Snacks", price: 20, stock: 150 },
    { id: "p9", name: "Marie Gold Biscuits", category: "Snacks", price: 10, stock: 250 },
    { id: "p10", name: "Chocolate Cookies", category: "Snacks", price: 30, stock: 120 },
    { id: "p11", name: "Toned Milk (1 Litre)", category: "Dairy", price: 30, stock: 80 },
    { id: "p12", name: "Amul Salted Butter", category: "Dairy", price: 55, stock: 90 },
    { id: "p13", name: "Processed Cheese Slices", category: "Dairy", price: 120, stock: 75 },
    { id: "p14", name: "Sandalwood Soap", category: "Personal Care", price: 35, stock: 140 },
    { id: "p15", name: "Herbal Shampoo", category: "Personal Care", price: 120, stock: 95 },
    { id: "p16", name: "Mint Toothpaste", category: "Personal Care", price: 80, stock: 110 }
  ],
  customers: [],
  purchases: [],
  visitors: []
};

// ─── Helpers ──────────────────────────────────────────────────

function genId(prefix: string) {
  return prefix + Math.random().toString(36).substr(2, 9);
}

function indDate() {
  const d = new Date();
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function indTime() {
  const d = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
  const h = d.getUTCHours() % 12 || 12;
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return h + ":" + m + " " + (d.getUTCHours() >= 12 ? "PM" : "AM");
}

async function hashPw(pw: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw + JWT_SECRET));
  return "s256_" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Middleware ────────────────────────────────────────────────

app.use((_r: any, res: any, n: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  n();
});

app.use(express.json());

function auth(req: any, res: any, n: any) {
  const t = req.headers["authorization"]?.split(" ")[1];
  if (!t) return res.status(401).json({ error: "Token required" });
  jwt.verify(t, JWT_SECRET, (e: any, u: any) => {
    if (e) return res.status(403).json({ error: "Invalid token" });
    req.user = u;
    n();
  });
}

function admin(req: any, res: any, n: any) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  n();
}

// ─── Auth Routes ──────────────────────────────────────────────

app.get("/api/db/status", (_r, s) => {
  s.json({ mongo: { status: "disconnected", uri: "not-configured", database: "billing_system", error: null }, local: { type: "In-Memory Store", filePath: "vercel-memory-only" } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const user = data.users.find((u: DBUser) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(400).json({ error: "Invalid email or password" });

  const expected = await hashPw(password);
  if (user.password !== expected) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  if (user.role === "customer") {
    const td = indDate(), tt = indTime();
    let cust = data.customers.find((c: DBCustomer) => c.email.toLowerCase() === user.email.toLowerCase());
    if (!cust) {
      cust = { id: genId("c_"), name: user.name, email: user.email, mobile: user.mobile, date: td, time: tt };
      data.customers.push(cust);
    }
    data.visitors.push({ id: genId("v_"), customerId: cust.id, name: user.name, email: user.email, mobile: user.mobile, loginTime: tt, visitDate: td });
  }

  const tok = jwt.sign({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ message: "Login successful", token: tok, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, mobile, password, confirmPassword, role } = req.body || {};
  if (!name || !email || !mobile || !password || !confirmPassword) return res.status(400).json({ error: "All fields are required" });
  if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
  if (data.users.find((u: DBUser) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email is already registered" });
  }

  const hash = await hashPw(password);
  const finalRole = (role === "admin" || role === "customer") ? role : "customer";
  const newUser: DBUser = { id: genId("u_"), name, email: email.toLowerCase(), mobile, password: hash, role: finalRole };
  data.users.push(newUser);

  if (finalRole === "customer") {
    const td = indDate(), tt = indTime();
    const newCust: DBCustomer = { id: genId("c_"), name, email: email.toLowerCase(), mobile, date: td, time: tt };
    data.customers.push(newCust);
    data.visitors.push({ id: genId("v_"), customerId: newCust.id, name, email: email.toLowerCase(), mobile, loginTime: tt, visitDate: td });
  }

  const tok = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile, role: newUser.role }, JWT_SECRET, { expiresIn: "24h" });
  res.status(201).json({ message: "Registration successful", token: tok, user: { id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile, role: newUser.role } });
});

// ─── OTP Verify ───────────────────────────────────────────────

const otps = new Map<string, { otp: string; expiresAt: number }>();

app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp, action } = req.body || {};
  if (!email || !otp || !action) return res.status(400).json({ error: "Email, OTP, and action required" });
  const rec = otps.get(email.toLowerCase());
  if (!rec || rec.otp !== otp || rec.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }
  otps.delete(email.toLowerCase());
  const user = data.users.find((u: DBUser) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(404).json({ error: "User not found" });
  const tok = jwt.sign({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ message: "Verification successful", token: tok, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
});

// ─── Products ─────────────────────────────────────────────────

app.get("/api/products", auth, (_r, s) => s.json(data.products));

app.post("/api/products", auth, admin, (req, res) => {
  const { name, category, price, stock } = req.body || {};
  if (!name || !category || price == null || stock == null) return res.status(400).json({ error: "All product fields required" });
  const np = Number(price), ns = Number(stock);
  if (isNaN(np) || np <= 0) return res.status(400).json({ error: "Price must be a positive number" });
  if (isNaN(ns) || ns < 0) return res.status(400).json({ error: "Stock must be a non-negative integer" });
  const p: DBProduct = { id: genId("p_"), name, category, price: np, stock: ns };
  data.products.push(p);
  res.status(211).json(p);
});

app.put("/api/products/:id", auth, admin, (req, res) => {
  const idx = data.products.findIndex((p: DBProduct) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });
  const b = req.body || {};
  if (b.name !== undefined) data.products[idx].name = b.name;
  if (b.category !== undefined) data.products[idx].category = b.category;
  if (b.price !== undefined) { const v = Number(b.price); if (isNaN(v) || v <= 0) return res.status(400).json({ error: "Invalid price" }); data.products[idx].price = v; }
  if (b.stock !== undefined) { const v = Number(b.stock); if (isNaN(v) || v < 0) return res.status(400).json({ error: "Invalid stock" }); data.products[idx].stock = v; }
  res.json(data.products[idx]);
});

app.delete("/api/products/:id", auth, admin, (req, res) => {
  const idx = data.products.findIndex((p: DBProduct) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });
  data.products.splice(idx, 1);
  res.json({ message: "Product deleted successfully" });
});

// ─── Customers ────────────────────────────────────────────────

app.get("/api/customers", auth, admin, (_r, s) => s.json(data.customers));

app.post("/api/customer/profile", auth, (req, res) => {
  const { name, email, mobile } = req.body || {};
  if (!name || !email || !mobile) return res.status(400).json({ error: "Name, email, and mobile required" });
  const existing = data.customers.find((c: DBCustomer) => c.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.json({ message: "Customer profile already active", customer: existing });
  const cust: DBCustomer = { id: genId("c_"), name, email: email.toLowerCase(), mobile, date: indDate(), time: indTime() };
  data.customers.push(cust);
  res.status(201).json({ message: "Customer registered successfully", customer: cust });
});

app.put("/api/customers/:id", auth, admin, (req, res) => {
  const idx = data.customers.findIndex((c: DBCustomer) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Customer not found" });
  const b = req.body || {};
  if (b.name) data.customers[idx].name = b.name;
  if (b.email) data.customers[idx].email = b.email;
  if (b.mobile) data.customers[idx].mobile = b.mobile;
  if (b.date) data.customers[idx].date = b.date;
  if (b.time) data.customers[idx].time = b.time;
  res.json({ message: "Customer updated successfully" });
});

app.delete("/api/customers/:id", auth, admin, (req, res) => {
  const idx = data.customers.findIndex((c: DBCustomer) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Customer not found" });
  const email = data.customers[idx].email;
  data.customers.splice(idx, 1);
  if (email) data.users = data.users.filter((u: DBUser) => u.email.toLowerCase() !== email.toLowerCase());
  res.json({ message: "Customer and login credentials deleted successfully" });
});

// ─── Purchases ────────────────────────────────────────────────

app.post("/api/purchases", auth, (req, res) => {
  const b = req.body || {};
  if (!b.customerDetails || !b.cartItems || b.cartItems.length === 0) {
    return res.status(400).json({ error: "Customer details and cart items are required" });
  }
  const { name, email, mobile } = b.customerDetails;
  if (!name || !email || !mobile) return res.status(400).json({ error: "Incomplete billing details" });

  const td = indDate();
  let cust = data.customers.find((c: DBCustomer) => c.email.toLowerCase() === email.toLowerCase());
  if (!cust) {
    cust = { id: genId("c_"), name, email: email.toLowerCase(), mobile, date: td, time: indTime() };
    data.customers.push(cust);
  }

  const validated: any[] = [];
  let subtotal = 0, totalQty = 0;
  for (const item of b.cartItems) {
    const prod = data.products.find((p: DBProduct) => p.id === item.productId);
    if (!prod) return res.status(400).json({ error: "Product not found: " + item.productId });
    if (prod.stock < item.quantity) return res.status(400).json({ error: "Insufficient stock for " + prod.name });
    subtotal += prod.price * item.quantity;
    totalQty += item.quantity;
    validated.push({ productId: prod.id, name: prod.name, category: prod.category, price: prod.price, quantity: item.quantity });
    prod.stock -= item.quantity;
  }

  const gst = parseFloat((subtotal * 0.18).toFixed(2));
  const grandTotal = parseFloat((subtotal + gst).toFixed(2));
  const purchase: DBPurchase = {
    id: genId("tx_"), customerId: cust.id, customerName: cust.name, customerEmail: cust.email,
    customerMobile: cust.mobile, products: validated, quantity: totalQty, totalAmount: grandTotal, purchaseDate: td
  };
  data.purchases.push(purchase);

  res.status(201).json({ message: "Invoice generated successfully", purchase, billingMeta: { subtotal, gst, grandTotal } });
});

app.get("/api/purchases", auth, (req: any, res) => {
  if (req.user.role === "admin") return res.json(data.purchases);
  res.json(data.purchases.filter((p: DBPurchase) => p.customerEmail.toLowerCase() === req.user.email.toLowerCase()));
});

// ─── Visitors ─────────────────────────────────────────────────

app.get("/api/visitors", auth, admin, (_r, s) => s.json(data.visitors));

// ─── Dashboard Stats ──────────────────────────────────────────

app.get("/api/dashboard/stats", auth, admin, (_r, s) => {
  const today = indDate();
  const month = today.substring(0, 7);
  let totalRev = 0, todayRev = 0, monthRev = 0;
  data.purchases.forEach(p => {
    totalRev += p.totalAmount;
    if (p.purchaseDate === today) todayRev += p.totalAmount;
    if (p.purchaseDate.startsWith(month)) monthRev += p.totalAmount;
  });
  let totalSold = 0;
  const salesMap: Record<string, any> = {};
  data.products.forEach(p => { salesMap[p.id] = { name: p.name, quantitySold: 0 }; });
  data.purchases.forEach(p => {
    p.products.forEach((item: any) => {
      totalSold += item.quantity;
      if (salesMap[item.productId]) salesMap[item.productId].quantitySold += item.quantity;
    });
  });
  const custPurchases = data.purchases.map(p => ({
    customerName: p.customerName, email: p.customerEmail, mobile: p.customerMobile,
    products: p.products.map((i: any) => i.name + " x" + i.quantity).join(", "),
    quantity: p.quantity, amount: p.totalAmount, date: p.purchaseDate
  }));
  const todayVis = data.visitors.filter(v => v.visitDate === today).map(v => ({
    customerName: v.name, email: v.email, mobile: v.mobile, loginTime: v.loginTime, visitDate: v.visitDate
  }));
  s.json({
    card1: { totalRevenue: parseFloat(totalRev.toFixed(2)), todayRevenue: parseFloat(todayRev.toFixed(2)), monthlyRevenue: parseFloat(monthRev.toFixed(2)) },
    card2: { totalProductsSold: totalSold, numberOfSales: data.purchases.length, productsSoldBreakdown: Object.values(salesMap).sort((a: any, b: any) => b.quantitySold - a.quantitySold) },
    card3: { totalCustomersPurchasedCount: new Set(data.purchases.map(p => p.customerId)).size, purchasesBreakdown: custPurchases },
    card4: { totalVisitorsToday: todayVis.length, totalVisitorsAllTime: data.visitors.length, visitorsTodayBreakdown: todayVis, visitorsAllTimeBreakdown: data.visitors.map(v => ({ customerName: v.name, email: v.email, mobile: v.mobile, loginTime: v.loginTime, visitDate: v.visitDate })) }
  });
});

// ─── Analytics ────────────────────────────────────────────────

app.get("/api/dashboard/analytics", auth, admin, (_r, s) => {
  const last7: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last7.push(d.toISOString().split("T")[0]); }
  const dailyRev = last7.map(date => ({
    date: date.substring(5),
    revenue: parseFloat(data.purchases.filter(p => p.purchaseDate === date).reduce((a: number, p) => a + p.totalAmount, 0).toFixed(2))
  }));
  const weeklyRev = [{ name: "Week 4 (Oldest)", revenue: 0 }, { name: "Week 3", revenue: 0 }, { name: "Week 2", revenue: 0 }, { name: "Week 1 (Current)", revenue: 0 }];
  const now = new Date();
  data.purchases.forEach(p => {
    const diff = Math.ceil(Math.abs(now.getTime() - new Date(p.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 7) weeklyRev[3].revenue += p.totalAmount;
    else if (diff <= 14) weeklyRev[2].revenue += p.totalAmount;
    else if (diff <= 21) weeklyRev[1].revenue += p.totalAmount;
    else if (diff <= 28) weeklyRev[0].revenue += p.totalAmount;
  });
  weeklyRev.forEach(w => w.revenue = parseFloat(w.revenue.toFixed(2)));
  const monthlyRev = [{ month: "Jan", revenue: 0 }, { month: "Feb", revenue: 0 }, { month: "Mar", revenue: 0 }, { month: "Apr", revenue: 0 }, { month: "May", revenue: 0 }, { month: "Jun", revenue: 0 }];
  data.purchases.forEach(p => {
    const m = parseInt(p.purchaseDate.split("-")[1], 10);
    if (m >= 1 && m <= 6) monthlyRev[m - 1].revenue += p.totalAmount;
  });
  monthlyRev.forEach(m => m.revenue = parseFloat(m.revenue.toFixed(2)));
  const counters: Record<string, any> = {};
  data.products.forEach(p => { counters[p.id] = { name: p.name, sold: 0 }; });
  data.purchases.forEach(p => { p.products.forEach((item: any) => { if (counters[item.productId]) counters[item.productId].sold += item.quantity; }); });
  const sorted = Object.values(counters).sort((a: any, b: any) => b.sold - a.sold);
  const dailyCust = last7.map(date => ({ date: date.substring(5), customers: new Set(data.purchases.filter(p => p.purchaseDate === date).map(p => p.customerId)).size }));
  const revVsSold = last7.map(date => {
    const dp = data.purchases.filter(p => p.purchaseDate === date);
    return { date: date.substring(5), revenue: parseFloat(dp.reduce((a: number, p) => a + p.totalAmount, 0).toFixed(2)), productsSold: dp.reduce((a: number, p) => a + p.quantity, 0) };
  });
  s.json({
    revenueData: { daily: dailyRev, weekly: weeklyRev, monthly: monthlyRev },
    productSales: { mostSold: sorted.slice(0, 5), leastSold: sorted.filter((p: any) => p.sold > 0).slice(-5) },
    customerStats: { daily: dailyCust, weekly: [{ name: "Week 4", customers: 0 }, { name: "Week 3", customers: 0 }, { name: "Week 2", customers: 0 }, { name: "Week 1 (Current)", customers: 0 }] },
    revenueVsSold: revVsSold
  });
});

export default app;
