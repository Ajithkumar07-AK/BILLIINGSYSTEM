import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const SECRET = process.env.JWT_SECRET || "supermarket_jwt_secret_constant_2026_xyz";

// In-memory store
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

function genId(p: string) { return p + Math.random().toString(36).substr(2, 9); }
function indDate() { const d = new Date(); return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0]; }
function indTime() { const d = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); const h = d.getUTCHours() % 12 || 12; return h + ":" + String(d.getUTCMinutes()).padStart(2, "0") + " " + (d.getUTCHours() >= 12 ? "PM" : "AM"); }

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

// ─── Auth ─────────────────────────────────────────────────────

app.get("/api/db/status", (_r, s) => s.json({ mongo: { status: "disconnected" }, local: { type: "In-Memory" } }));

app.post("/api/auth/login", (req, res) => {
  const { email } = req.body || {};
  const user = users.find((u: any) => u.email === email?.toLowerCase());
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  if (user.role === "customer") {
    const td = indDate(), tt = indTime();
    let c = customers.find((x: any) => x.email === user.email);
    if (!c) { c = { id: genId("c_"), name: user.name, email: user.email, mobile: user.mobile, date: td, time: tt }; customers.push(c); }
    visitors.push({ id: genId("v_"), customerId: c.id, name: user.name, email: user.email, mobile: user.mobile, loginTime: tt, visitDate: td });
  }
  const tok = jwt.sign({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, SECRET, { expiresIn: "24h" });
  res.json({ message: "Login ok", token: tok, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, mobile, password, confirmPassword, role } = req.body || {};
  if (!name || !email || !mobile || !password || !confirmPassword) return res.status(400).json({ error: "All fields required" });
  if (password !== confirmPassword) return res.status(400).json({ error: "Passwords mismatch" });
  if (password.length < 6) return res.status(400).json({ error: "Password too short" });
  if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ error: "Invalid mobile" });
  if (users.find((u: any) => u.email === email.toLowerCase())) return res.status(400).json({ error: "Email taken" });
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
  res.status(201).json({ message: "Registered", token: tok, user: { id: nu.id, name: nu.name, email: nu.email, mobile: nu.mobile, role: nu.role } });
});

// ─── Products ─────────────────────────────────────────────────

app.get("/api/products", auth, (_r, s) => s.json(products));

app.post("/api/products", auth, admin, (req, res) => {
  const { name, category, price, stock } = req.body || {};
  if (!name || !category || price == null || stock == null) return res.status(400).json({ error: "All fields required" });
  const np = Number(price), ns = Number(stock);
  if (isNaN(np) || np <= 0) return res.status(400).json({ error: "Bad price" });
  if (isNaN(ns) || ns < 0) return res.status(400).json({ error: "Bad stock" });
  const p = { id: genId("p_"), name, category, price: np, stock: ns };
  products.push(p);
  res.status(211).json(p);
});

app.put("/api/products/:id", auth, admin, (req, res) => {
  const idx = products.findIndex((p: any) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const b = req.body || {};
  if (b.name !== undefined) products[idx].name = b.name;
  if (b.category !== undefined) products[idx].category = b.category;
  if (b.price !== undefined) { const v = Number(b.price); if (isNaN(v) || v <= 0) return res.status(400).json({ error: "Bad price" }); products[idx].price = v; }
  if (b.stock !== undefined) { const v = Number(b.stock); if (isNaN(v) || v < 0) return res.status(400).json({ error: "Bad stock" }); products[idx].stock = v; }
  res.json(products[idx]);
});

app.delete("/api/products/:id", auth, admin, (req, res) => {
  const idx = products.findIndex((p: any) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  products.splice(idx, 1);
  res.json({ message: "Deleted" });
});

// ─── Customers ────────────────────────────────────────────────

app.get("/api/customers", auth, admin, (_r, s) => s.json(customers));

app.post("/api/customer/profile", auth, (req, res) => {
  const { name, email, mobile } = req.body || {};
  if (!name || !email || !mobile) return res.status(400).json({ error: "Required" });
  const ex = customers.find((c: any) => c.email === email.toLowerCase());
  if (ex) return res.json({ message: "Active", customer: ex });
  const c = { id: genId("c_"), name, email: email.toLowerCase(), mobile, date: indDate(), time: indTime() };
  customers.push(c);
  res.status(201).json({ message: "Created", customer: c });
});

app.put("/api/customers/:id", auth, admin, (req, res) => {
  const idx = customers.findIndex((c: any) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const b = req.body || {};
  if (b.name) customers[idx].name = b.name;
  if (b.email) customers[idx].email = b.email;
  if (b.mobile) customers[idx].mobile = b.mobile;
  if (b.date) customers[idx].date = b.date;
  if (b.time) customers[idx].time = b.time;
  res.json({ message: "Updated" });
});

app.delete("/api/customers/:id", auth, admin, (req, res) => {
  const idx = customers.findIndex((c: any) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const email = customers[idx].email;
  customers.splice(idx, 1);
  if (email) { const ui = users.findIndex((u: any) => u.email === email); if (ui !== -1) users.splice(ui, 1); }
  res.json({ message: "Deleted" });
});

// ─── Purchases ────────────────────────────────────────────────

app.post("/api/purchases", auth, (req, res) => {
  const b = req.body || {};
  if (!b.customerDetails || !b.cartItems?.length) return res.status(400).json({ error: "Missing info" });
  const { name, email, mobile } = b.customerDetails;
  if (!name || !email || !mobile) return res.status(400).json({ error: "Incomplete" });
  let c = customers.find((x: any) => x.email === email.toLowerCase());
  if (!c) { c = { id: genId("c_"), name, email: email.toLowerCase(), mobile, date: indDate(), time: indTime() }; customers.push(c); }
  const items: any[] = [];
  let sub = 0, qty = 0;
  for (const item of b.cartItems) {
    const prod = products.find((x: any) => x.id === item.productId);
    if (!prod) return res.status(400).json({ error: "Unknown product" });
    if (prod.stock < item.quantity) return res.status(400).json({ error: "Low stock" });
    sub += prod.price * item.quantity;
    qty += item.quantity;
    items.push({ productId: prod.id, name: prod.name, category: prod.category, price: prod.price, quantity: item.quantity });
    prod.stock -= item.quantity;
  }
  const gst = Math.round(sub * 0.18 * 100) / 100;
  const total = Math.round((sub + gst) * 100) / 100;
  const pu = { id: genId("tx_"), customerId: c.id, customerName: c.name, customerEmail: c.email, customerMobile: c.mobile, products: items, quantity: qty, totalAmount: total, purchaseDate: indDate() };
  purchases.push(pu);
  res.status(201).json({ message: "Invoice created", purchase: pu, billingMeta: { subtotal: sub, gst, grandTotal: total } });
});

app.get("/api/purchases", auth, (req: any, s) => {
  s.json(req.user.role === "admin" ? purchases : purchases.filter((p: any) => p.customerEmail === req.user.email?.toLowerCase()));
});

// ─── Visitors & Dashboard ─────────────────────────────────────

app.get("/api/visitors", auth, admin, (_r, s) => s.json(visitors));

app.get("/api/dashboard/stats", auth, admin, (_r, s) => {
  const td = indDate();
  let tr = 0, dr = 0, mr = 0;
  purchases.forEach((p: any) => {
    tr += p.totalAmount;
    if (p.purchaseDate === td) dr += p.totalAmount;
    if (p.purchaseDate.startsWith(td.substring(0, 7))) mr += p.totalAmount;
  });
  s.json({
    card1: { totalRevenue: Math.round(tr * 100) / 100, todayRevenue: Math.round(dr * 100) / 100, monthlyRevenue: Math.round(mr * 100) / 100 },
    card2: { totalProductsSold: purchases.reduce((a: number, p: any) => a + p.quantity, 0), numberOfSales: purchases.length },
    card3: { totalCustomersPurchasedCount: new Set(purchases.map((p: any) => p.customerId)).size },
    card4: { totalVisitorsToday: visitors.filter((v: any) => v.visitDate === td).length, totalVisitorsAllTime: visitors.length }
  });
});

app.get("/api/dashboard/analytics", auth, admin, (_r, s) => {
  const d7: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); d7.push(d.toISOString().split("T")[0]); }
  const dr = d7.map(d => ({ date: d.substring(5), revenue: Math.round(purchases.filter((x: any) => x.purchaseDate === d).reduce((a: number, x: any) => a + x.totalAmount, 0) * 100) / 100 }));
  s.json({ revenueData: { daily: dr } });
});

export default app;
