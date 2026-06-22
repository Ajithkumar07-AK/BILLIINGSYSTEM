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

function indDate() { const d = new Date(); return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0]; }
function indTime() { const d = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000); const h = d.getUTCHours() % 12 || 12; return h + ":" + String(d.getUTCMinutes()).padStart(2, "0") + " " + (d.getUTCHours() >= 12 ? "PM" : "AM"); }

app.get("/api/db/status", (_r, s) => s.json({ mongo: { status: "disconnected" }, local: { type: "In-Memory" } }));

app.post("/api/auth/login", (req, res) => {
  const { email } = req.body || {};
  const user = users.find((u: any) => u.email === email?.toLowerCase());
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  if (user.role === "customer") { const td = indDate(), tt = indTime(); let c = customers.find((x: any) => x.email === user.email); if (!c) { c = { id: genId("c_"), name: user.name, email: user.email, mobile: user.mobile, date: td, time: tt }; customers.push(c); } visitors.push({ id: genId("v_"), customerId: c.id, name: user.name, email: user.email, mobile: user.mobile, loginTime: tt, visitDate: td }); }
  const tok = jwt.sign({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, SECRET, { expiresIn: "24h" });
  res.json({ message: "Login ok", token: tok, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
});

app.get("/api/products", auth, (_r, s) => s.json(products));
app.get("/api/customers", auth, admin, (_r, s) => s.json(customers));
app.get("/api/purchases", auth, (req: any, s) => s.json(req.user.role === "admin" ? purchases : purchases.filter((p: any) => p.customerEmail === req.user.email?.toLowerCase())));
app.get("/api/visitors", auth, admin, (_r, s) => s.json(visitors));

export default app;
