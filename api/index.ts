import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "supermarket_jwt_secret_constant_2026_xyz";

// ─── In-Memory Data ──────────────────────────────────────────
const data: Record<string, any[]> = {
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
  customers: [] as any[],
  purchases: [] as any[],
  visitors: [] as any[]
};

function genId(p: string) { return p + Math.random().toString(36).substr(2, 9); }

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
    req.user = u; n();
  });
}

function admin(req: any, res: any, n: any) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  n();
}

// ─── Routes ───────────────────────────────────────────────────

app.get("/api/db/status", (_r, s) => s.json({ mongo: { status: "disconnected" }, local: { type: "In-Memory" } }));

app.post("/api/auth/register", async (req, res) => {
  const { name, email, mobile, password, confirmPassword, role } = req.body || {};
  if (!name || !email || !mobile || !password || !confirmPassword)
    return res.status(400).json({ error: "All fields required" });
  if (password !== confirmPassword) return res.status(400).json({ error: "Passwords mismatch" });
  if (password.length < 6) return res.status(400).json({ error: "Password too short" });
  if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ error: "Invalid mobile" });
  if (data.users.find((u: any) => u.email === email.toLowerCase()))
    return res.status(400).json({ error: "Email taken" });

  const hash = await hashPw(password);
  const r2 = (role === "admin" || role === "customer") ? role : "customer";
  const nu: any = { id: genId("u_"), name, email: email.toLowerCase(), mobile, password: hash, role: r2 };
  data.users.push(nu);

  if (r2 === "customer") {
    const td = indDate(), tt = indTime();
    const nc: any = { id: genId("c_"), name, email: email.toLowerCase(), mobile, date: td, time: tt };
    data.customers.push(nc);
    data.visitors.push({ id: genId("v_"), customerId: nc.id, name, email: email.toLowerCase(), mobile, loginTime: tt, visitDate: td });
  }

  const tok = jwt.sign({ id: nu.id, name: nu.name, email: nu.email, mobile: nu.mobile, role: nu.role }, JWT_SECRET, { expiresIn: "24h" });
  res.status(201).json({ message: "Registered", token: tok, user: { id: nu.id, name: nu.name, email: nu.email, mobile: nu.mobile, role: nu.role } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const user: any = data.users.find((u: any) => u.email === email.toLowerCase());
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const expected = await hashPw(password);
  if (user.password !== expected && !user.password.startsWith("s256_")) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  if (user.role === "customer") {
    const td = indDate(), tt = indTime();
    let c = data.customers.find((x: any) => x.email === user.email);
    if (!c) { c = { id: genId("c_"), name: user.name, email: user.email, mobile: user.mobile, date: td, time: tt }; data.customers.push(c); }
    data.visitors.push({ id: genId("v_"), customerId: c.id, name: user.name, email: user.email, mobile: user.mobile, loginTime: tt, visitDate: td });
  }

  const tok = jwt.sign({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ message: "Login ok", token: tok, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
});

app.get("/api/products", auth, (_r, s) => s.json(data.products));

app.post("/api/products", auth, admin, (req, res) => {
  const { name, category, price, stock } = req.body || {};
  if (!name || !category || price == null || stock == null) return res.status(400).json({ error: "All fields required" });
  const np = Number(price), ns = Number(stock);
  if (isNaN(np) || np <= 0) return res.status(400).json({ error: "Bad price" });
  if (isNaN(ns) || ns < 0) return res.status(400).json({ error: "Bad stock" });
  const p = { id: genId("p_"), name, category, price: np, stock: ns };
  data.products.push(p);
  res.status(211).json(p);
});

app.put("/api/products/:id", auth, admin, (req, res) => {
  const p = data.products.find((x: any) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  const b = req.body || {};
  if (b.name !== undefined) p.name = b.name;
  if (b.category !== undefined) p.category = b.category;
  if (b.price !== undefined) { const v = Number(b.price); if (isNaN(v) || v <= 0) return res.status(400).json({ error: "Bad price" }); p.price = v; }
  if (b.stock !== undefined) { const v = Number(b.stock); if (isNaN(v) || v < 0) return res.status(400).json({ error: "Bad stock" }); p.stock = v; }
  res.json(p);
});

app.delete("/api/products/:id", auth, admin, (req, res) => {
  const i = data.products.findIndex((x: any) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error:
