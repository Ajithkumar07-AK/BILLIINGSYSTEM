import express from "express";
import jwt from "jsonwebtoken";
import path from "path";

const app = express();
const SECRET = process.env.JWT_SECRET || "supermarket_jwt_secret_constant_2026_xyz";

// ─── In-Memory Store ──────────────────────────────────────────
const users: any[] = [
  { id: "u_admin", name: "Admin Manager", email: "admin@supermarket.com", mobile: "9876543210", role: "admin" },
  { id: "u_customer", name: "Ramesh Kanna", email: "ramesh@gmail.com", mobile: "9123456789", role: "customer" }
];
const products: any[] = [
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
];
const customers: any[] = [];
const purchases: any[] = [];
const visitors: any[] = [];
const otpStore = new Map<string, { otp: string; expiresAt: number; userData?: any }>();

function genId(p: string) { return p + Math.random().toString(36).substr(2, 9); }
function indDate() { const d = new Date(); return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0]; }
function indTime() { const d = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); return (d.getUTCHours() % 12 || 12) + ":" + String(d.getUTCMinutes()).padStart(2, "0") + " " + (d.getUTCHours() >= 12 ? "PM" : "AM"); }

// ─── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use((_r: any, res: any, n: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  n();
});

function auth(req: any, res: any, n: any) {
  const t = req.headers["authorization"]?.split(" ")[1];
  if (!t) return res.status(401).json({ error: "Token required" });
  jwt.verify(t, SECRET, (e: any, u: any) => { if (e) return res.status(403).json({ error: "Invalid" }); req.user = u; n(); });
}

function admin(req: any, res: any, n: any) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Admin only" }); n();
}

// ─── Auth Routes ──────────────────────────────────────────────

app.get("/api/db/status", (_r, s) => s.json({ mongo: { status: "disconnected", uri: "not-configured", database: "billing_system", error: null }, local: { type: "In-Memory Store", filePath: "vercel-memory-only" } }));

app.post("/api/auth/login", (req, res) => {
  const { email } = req.body || {};
  const user = users.find((u: any) => u.email === email?.toLowerCase());
  if (!user) return res.status(400).json({ error: "Invalid email or password" });
  if (user.role === "customer") {
    const td = indDate(), tt = indTime();
    let c = customers.find((x: any) => x.email === user.email);
    if (!c) { c = { id: genId("c_"), name: user.name, email: user.email, mobile: user.mobile, date: td, time: tt }; customers.push(c); }
    visitors.push({ id: genId("v_"), customerId: c.id, name: user.name, email: user.email, mobile: user.mobile, loginTime: tt, visitDate: td });
  }
  const tok = jwt.sign({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, SECRET, { expiresIn: "24h" });
  res.json({ message: "Login successful", token: tok, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, mobile, password, confirmPassword, role } = req.body || {};
  if (!name || !email || !mobile || !password || !confirmPassword) return res.status(400).json({ error: "All fields are required" });
  if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
  if (users.find((u: any) => u.email === email.toLowerCase())) return res.status(400).json({ error: "Email is already registered" });
  const fr = (role === "admin" || role === "customer") ? role : "customer";
  const nu: any = { id: genId("u_"), name, email: email.toLowerCase(), mobile, role: fr };
  users.push(nu);
  if (fr === "customer") {
    const td = indDate(), tt = indTime();
    const nc: any = { id: genId("c_"), name, email: email.toLowerCase(), mobile, date: td, time: tt };
    customers.push(nc);
    visitors.push({ id: genId("v_"), customerId: nc.id, name, email: email.toLowerCase(), mobile, loginTime: tt, visitDate: td });
  }
  const tok = jwt.sign({ id: nu.id, name: nu.name, email: nu.email, mobile: nu.mobile, role: nu.role }, SECRET, { expiresIn: "24h" });
  res.status(201).json({ message: "Registration successful", token: tok, user: { id: nu.id, name: nu.name, email: nu.email, mobile: nu.mobile, role: nu.role } });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp, action } = req.body || {};
  if (!email || !otp || !action) return res.status(400).json({ error: "Email, OTP, and action required" });
  const rec = otpStore.get(email.toLowerCase());
  if (!rec || rec.otp !== otp || rec.expiresAt < Date.now()) return res.status(400).json({ error: "Invalid or expired OTP" });
  otpStore.delete(email.toLowerCase());
  const user = users.find((u: any) => u.email === email.toLowerCase());
  if (!user) return res.status(404).json({ error: "User not found" });
  const tok = jwt.sign({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, SECRET, { expiresIn: "24h" });
  res.json({ message: "Verification successful", token: tok, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
});

// ─── Products ─────────────────────────────────────────────────

app.get("/api/products", auth, (_r, s) => s.json(products));

app.post("/api/products", auth, admin, (req, res) => {
  const { name, category, price, stock } = req.body || {};
  if (!name || !category || price == null || stock == null) return res.status(400).json({ error: "All product fields are required" });
  const np = Number(price), ns = Number(stock);
  if (isNaN(np) || np <= 0) return res.status(400).json({ error: "Price must be a valid positive number" });
  if (isNaN(ns) || ns < 0) return res.status(400).json({ error: "Stock must be a non-negative integer" });
  const p = { id: genId("p_"), name, category, price: np, stock: ns };
  products.push(p);
  res.status(211).json(p);
});

app.put("/api/products/:id", auth, admin, (req, res) => {
  const idx = products.findIndex((p: any) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });
  const b = req.body || {};
  if (b.name !== undefined) products[idx].name = b.name;
  if (b.category !== undefined) products[idx].category = b.category;
  if (b.price !== undefined) { const v = Number(b.price); if (isNaN(v) || v <= 0) return res.status(400).json({ error: "Invalid price" }); products[idx].price = v; }
  if (b.stock !== undefined) { const v = Number(b.stock); if (isNaN(v) || v < 0) return res.status(400).json({ error: "Invalid stock" }); products[idx].stock = v; }
  res.json(products[idx]);
});

app.delete("/api/products/:id", auth, admin, (req, res) => {
  const idx = products.findIndex((p: any) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });
  products.splice(idx, 1);
  res.json({ message: "Product deleted successfully" });
});

// ─── Customers ────────────────────────────────────────────────

app.get("/api/customers", auth, admin, (_r, s) => s.json(customers));

app.post("/api/customer/profile", auth, (req, res) => {
  const { name, email, mobile } = req.body || {};
  if (!name || !email || !mobile) return res.status(400).json({ error: "Customers Name, Email, and Mobile is required" });
  const ex = customers.find((c: any) => c.email.toLowerCase() === email.toLowerCase());
  if (ex) return res.json({ message: "Customer profile already active", customer: ex });
  const c = { id: genId("c_"), name, email: email.toLowerCase(), mobile, date: indDate(), time: indTime() };
  customers.push(c);
  res.status(201).json({ message: "Customer card registered successfully", customer: c });
});

app.put("/api/customers/:id", auth, admin, (req, res) => {
  const idx = customers.findIndex((c: any) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Customer not found" });
  const b = req.body || {};
  if (b.name) customers[idx].name = b.name;
  if (b.email) customers[idx].email = b.email;
  if (b.mobile) customers[idx].mobile = b.mobile;
  if (b.date) customers[idx].date = b.date;
  if (b.time) customers[idx].time = b.time;
  res.json({ message: "Customer details updated successfully" });
});

app.delete("/api/customers/:id", auth, admin, (req, res) => {
  const idx = customers.findIndex((c: any) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Customer profile not found" });
  const email = customers[idx].email;
  customers.splice(idx, 1);
  if (email) { const ui = users.findIndex((u: any) => u.email === email); if (ui !== -1) users.splice(ui, 1); }
  res.json({ message: "Customer profile and login credentials deleted successfully" });
});

// ─── Purchases ────────────────────────────────────────────────

app.post("/api/purchases", auth, (req, res) => {
  const b = req.body || {};
  if (!b.customerDetails || !b.cartItems || b.cartItems.length === 0) return res.status(400).json({ error: "Customer details and selected cart items are required" });
  const { name, email, mobile } = b.customerDetails;
  if (!name || !email || !mobile) return res.status(400).json({ error: "Incomplete billing customer details" });
  const td = indDate();
  let c = customers.find((x: any) => x.email.toLowerCase() === email.toLowerCase());
  if (!c) { c = { id: genId("c_"), name, email: email.toLowerCase(), mobile, date: td, time: indTime() }; customers.push(c); }
  const valid: any[] = [];
  let sub = 0, qty = 0;
  for (const item of b.cartItems) {
    const prod = products.find((x: any) => x.id === item.productId);
    if (!prod) return res.status(400).json({ error: "Product lookup failed for ID: " + item.productId });
    if (prod.stock < item.quantity) return res.status(400).json({ error: "Insufficient stock for product '" + prod.name + "'" });
    sub += prod.price * item.quantity; qty += item.quantity;
    valid.push({ productId: prod.id, name: prod.name, category: prod.category, price: prod.price, quantity: item.quantity });
    prod.stock -= item.quantity;
  }
  const gst = parseFloat((sub * 0.18).toFixed(2));
  const total = parseFloat((sub + gst).toFixed(2));
  const pu = { id: genId("tx_"), customerId: c.id, customerName: c.name, customerEmail: c.email, customerMobile: c.mobile, products: valid, quantity: qty, totalAmount: total, purchaseDate: td };
  purchases.push(pu);
  res.status(201).json({ message: "Invoice generated successfully", purchase: pu, billingMeta: { subtotal: sub, gst, grandTotal: total } });
});

app.get("/api/purchases", auth, (req: any, s) => {
  s.json(req.user.role === "admin" ? purchases : purchases.filter((p: any) => p.customerEmail.toLowerCase() === req.user.email.toLowerCase()));
});

// ─── Visitors ─────────────────────────────────────────────────

app.get("/api/visitors", auth, admin, (_r, s) => s.json(visitors));

// ─── Dashboard Stats ──────────────────────────────────────────

app.get("/api/dashboard/stats", auth, admin, (_r, s) => {
  const today = indDate(), month = today.substring(0, 7);
  let tr = 0, dr = 0, mr = 0;
  purchases.forEach((p: any) => { tr += p.totalAmount; if (p.purchaseDate === today) dr += p.totalAmount; if (p.purchaseDate.startsWith(month)) mr += p.totalAmount; });
  let totalSold = 0;
  const salesMap: Record<string, any> = {};
  products.forEach((p: any) => { salesMap[p.id] = { name: p.name, category: p.category, price: p.price, quantitySold: 0, totalRev: 0 }; });
  purchases.forEach((p: any) => { p.products.forEach((item: any) => { totalSold += item.quantity; if (salesMap[item.productId]) { salesMap[item.productId].quantitySold += item.quantity; salesMap[item.productId].totalRev += item.price * item.quantity * 1.18; } }); });
  const breakdown = Object.values(salesMap).map((p: any) => ({ ...p, totalRev: parseFloat(p.totalRev.toFixed(2)) })).sort((a: any, b: any) => b.quantitySold - a.quantitySold);
  const custBkdn = purchases.map((p: any) => ({ customerName: p.customerName, email: p.customerEmail, mobile: p.customerMobile, productsPurchased: p.products.map((i: any) => i.name + " (" + i.quantity + ")").join(", "), quantity: p.quantity, purchaseAmount: p.totalAmount, purchaseDate: p.purchaseDate }));
  const tv = visitors.filter((v: any) => v.visitDate === today).map((v: any) => ({ customerName: v.name, email: v.email, mobile: v.mobile, loginTime: v.loginTime, visitDate: v.visitDate }));
  s.json({
    card1: { totalRevenue: parseFloat(tr.toFixed(2)), todayRevenue: parseFloat(dr.toFixed(2)), monthlyRevenue: parseFloat(mr.toFixed(2)) },
    card2: { totalProductsSold: totalSold, numberOfSales: purchases.length, productsSoldBreakdown: breakdown },
    card3: { totalCustomersPurchasedCount: new Set(purchases.map((p: any) => p.customerId)).size, purchasesBreakdown: custBkdn },
    card4: { totalVisitorsToday: tv.length, totalVisitorsAllTime: visitors.length, visitorsTodayBreakdown: tv, visitorsAllTimeBreakdown: visitors.map((v: any) => ({ customerName: v.name, email: v.email, mobile: v.mobile, loginTime: v.loginTime, visitDate: v.visitDate })) }
  });
});

// ─── Analytics ────────────────────────────────────────────────

app.get("/api/dashboard/analytics", auth, admin, (_r, s) => {
  const last7: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last7.push(d.toISOString().split("T")[0]); }
  const dailyRev = last7.map(date => ({ date: date.substring(5), revenue: parseFloat(purchases.filter((p: any) => p.purchaseDate === date).reduce((a: number, p) => a + p.totalAmount, 0).toFixed(2)) }));
  const weeklyRev = [{ name: "Week 4 (Oldest)", revenue: 0 }, { name: "Week 3", revenue: 0 }, { name: "Week 2", revenue: 0 }, { name: "Week 1 (Current)", revenue: 0 }];
  const now = new Date();
  purchases.forEach((p: any) => { const diff = Math.ceil(Math.abs(now.getTime() - new Date(p.purchaseDate).getTime()) / 86400000); if (diff <= 7) weeklyRev[3].revenue += p.totalAmount; else if (diff <= 14) weeklyRev[2].revenue += p.totalAmount; else if (diff <= 21) weeklyRev[1].revenue += p.totalAmount; else if (diff <= 28) weeklyRev[0].revenue += p.totalAmount; });
  weeklyRev.forEach(w => w.revenue = parseFloat(w.revenue.toFixed(2)));
  const monthlyRev = [{ month: "Jan", revenue: 0 }, { month: "Feb", revenue: 0 }, { month: "Mar", revenue: 0 }, { month: "Apr", revenue: 0 }, { month: "May", revenue: 0 }, { month: "Jun", revenue: 0 }];
  purchases.forEach((p: any) => { const m = parseInt(p.purchaseDate.split("-")[1], 10); if (m >= 1 && m <= 6) monthlyRev[m - 1].revenue += p.totalAmount; });
  monthlyRev.forEach(m => m.revenue = parseFloat(m.revenue.toFixed(2)));
  const counters: Record<string, any> = {};
  products.forEach((p: any) => { counters[p.id] = { name: p.name, sold: 0 }; });
  purchases.forEach((p: any) => { p.products.forEach((item: any) => { if (counters[item.productId]) counters[item.productId].sold += item.quantity; }); });
  const sorted = Object.values(counters).sort((a: any, b: any) => b.sold - a.sold);
  const dailyCust = last7.map(date => ({ date: date.substring(5), customers: new Set(purchases.filter((p: any) => p.purchaseDate === date).map((p: any) => p.customerId)).size }));
  const revVsSold = last7.map(date => { const dp = purchases.filter((p: any) => p.purchaseDate === date); return { date: date.substring(5), revenue: parseFloat(dp.reduce((a: number, p) => a + p.totalAmount, 0).toFixed(2)), productsSold: dp.reduce((a: number, p) => a + p.quantity, 0) }; });
  s.json({
    revenueData: { daily: dailyRev, weekly: weeklyRev, monthly: monthlyRev },
    productSales: { mostSold: sorted.slice(0, 5), leastSold: sorted.filter((p: any) => p.sold > 0).slice(-5) },
    customerStats: { daily: dailyCust, weekly: [{ name: "Week 4", customers: 0 }, { name: "Week 3", customers: 0 }, { name: "Week 2", customers: 0 }, { name: "Week 1 (Current)", customers: 0 }] },
    revenueVsSold: revVsSold
  });
});

// ─── SPA Fallback for Vercel (serve index.html for non-API routes) ───

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API endpoint not found" });
  const distPath = path.join(process.cwd(), "dist");
  res.sendFile(path.join(distPath, "index.html"), (err: any) => {
    if (err) res.status(500).send("App not found");
  });
});

export default app;
