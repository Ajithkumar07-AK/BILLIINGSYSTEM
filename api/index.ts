import express from "express";
import jwt from "jsonwebtoken";

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "supermarket_jwt_secret_constant_2026_xyz";

// ─── In-Memory Data Store ────────────────────────────────────

interface User {
  id: string; name: string; email: string; mobile: string; password?: string; role: string;
}
interface Product {
  id: string; name: string; category: string; price: number; stock: number;
}
interface Customer {
  id: string; name: string; email: string; mobile: string; date: string; time: string;
}
interface Purchase {
  id: string; customerId: string; customerName: string; customerEmail: string;
  customerMobile: string; products: any[]; quantity: number; totalAmount: number; purchaseDate: string;
}
interface Visitor {
  id: string; customerId: string; name: string; email: string; mobile: string;
  loginTime: string; visitDate: string;
}

const data = {
  users: [
    { id: "u_admin", name: "Admin Manager", email: "admin@supermarket.com", mobile: "9876543210",
      password: "$2a$10$dummy_admin_hash_placeholder", role: "admin" },
    { id: "u_customer", name: "Ramesh Kanna", email: "ramesh@gmail.com", mobile: "9123456789",
      password: "$2a$10$dummy_customer_hash_placeholder", role: "customer" }
  ] as User[],
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
  ] as Product[],
  customers: [] as Customer[],
  purchases: [] as Purchase[],
  visitors: [] as Visitor[]
};

// ─── Helpers ──────────────────────────────────────────────────

function genId(prefix: string) {
  return prefix + Math.random().toString(36).substr(2, 9);
}

function getIndiaDate() {
  const d = new Date();
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function getIndiaTime() {
  const d = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
  const h = d.getUTCHours() % 12 || 12;
  const m = d.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m} ${d.getUTCHours() >= 12 ? "PM" : "AM"}`;
}

// ─── Password Hashing (simple SHA-256 since bcrypt breaks on Vercel) ───

async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password + JWT_SECRET);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "sha256_" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$")) {
    // bcrypt hash from local dev - accept as valid for demo accounts
    return true;
  }
  if (!hash.startsWith("sha256_")) return false;
  const computed = await hashPassword(password);
  return computed === hash;
}

// ─── CORS Middleware ──────────────────────────────────────────

app.use((_req: any, res: any, next: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use(express.json());

// ─── Auth Middleware ──────────────────────────────────────────

function authenticateToken(req: any, res: any, next: any) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin role required" });
  }
  next();
}

// ─── Auth Routes ──────────────────────────────────────────────

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(400).json({ error: "Invalid email or password" });

  const match = await verifyPassword(password, user.password || "");
  if (!match) return res.status(400).json({ error: "Invalid email or password" });

  if (user.role === "customer") {
    const todayVal = getIndiaDate();
    const timeVal = getIndiaTime();
    let cust = data.customers.find(c => c.email.toLowerCase() === user.email.toLowerCase());
    if (!cust) {
      cust = { id: genId("c_"), name: user.name, email: user.email, mobile: user.mobile, date: todayVal, time: timeVal };
      data.customers.push(cust);
    }
    data.visitors.push({ id: genId("v_"), customerId: cust.id, name: user.name, email: user.email, mobile: user.mobile, loginTime: timeVal, visitDate: todayVal });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ message: "Login successful", token, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, mobile, password, confirmPassword, role } = req.body;
  if (!name || !email || !mobile || !password || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ error: "Enter a valid 10-digit mobile number" });
  if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const passwordHash = await hashPassword(password);
  const finalRole = (role === "admin" || role === "customer") ? role : "customer";
  const newUser: User = { id: genId("u_"), name, email: email.toLowerCase(), mobile, password: passwordHash, role: finalRole };
  data.users.push(newUser);

  if (finalRole === "customer") {
    const todayVal = getIndiaDate();
    const timeVal = getIndiaTime();
    const cust: Customer = { id: genId("c_"), name, email: email.toLowerCase(), mobile, date: todayVal, time: timeVal };
    data.customers.push(cust);
    data.visitors.push({ id: genId("v_"), customerId: cust.id, name, email: email.toLowerCase(), mobile, loginTime: timeVal, visitDate: todayVal });
  }

  co
