import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import path from "path";
import { DBStore } from "../server-db";
import {
  saveUserToMongo,
  logLoginToMongo,
  getMongoStatus,
  saveProductToMongo,
  saveCustomerToMongo,
  deleteCustomerFromMongo,
  saveVisitorToMongo,
  savePurchaseToMongo
} from "../server-mongodb";

// Initialize DB store (with fallback for read-only filesystem)
try {
  DBStore.initialize();
} catch (e) {
  console.error("DB init warning:", (e as Error).message);
}

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "supermarket_jwt_secret_constant_2026_xyz";

// CORS
app.use((_req: any, res: any, next: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use(express.json());

function getIndiaDate() {
  const d = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const localTime = new Date(d.getTime() + offset);
  return localTime.toISOString().split("T")[0];
}

function getIndiaTime() {
  const d = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const localTime = new Date(d.getTime() + offset);
  const hours = localTime.getUTCHours();
  const minutes = localTime.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const m = minutes < 10 ? "0" + minutes : minutes;
  return `${h}:${m} ${ampm}`;
}

function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }
  next();
}

const pendingOTPs = new Map<string, any>();

// ─── Auth Routes ──────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  const { name, email, mobile, password, confirmPassword, role } = req.body;
  if (!name || !email || !mobile || !password || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ error: "Enter a valid 10-digit mobile number" });
  if (DBStore.findUserByEmail(email)) return res.status(400).json({ error: "Email already registered" });

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const finalRole = (role === "admin" || role === "customer") ? role : "customer";

  const newUser = DBStore.createUser({ name, email: email.toLowerCase(), mobile, password: passwordHash, role: finalRole });

  saveUserToMongo({ id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile, password: newUser.password, role: newUser.role })
    .catch((err: any) => console.error("MongoDB write warning:", err.message));

  if (finalRole === "customer") {
    const todayVal = getIndiaDate();
    const timeVal = getIndiaTime();
    const newCust = DBStore.createCustomer({ name, email: email.toLowerCase(), mobile, date: todayVal, time: timeVal });
    DBStore.createVisitor({ customerId: newCust.id, name: newCust.name, email: newCust.email, mobile: newCust.mobile, loginTime: timeVal, visitDate: todayVal });
    saveCustomerToMongo(newCust).catch((err: any) => console.warn("MongoDB customer sync:", err.message));
    saveVisitorToMongo({ customerId: newCust.id, name: newCust.name, email: newCust.email, mobile: newCust.mobile, loginTime: timeVal, visitDate: todayVal })
      .catch((err: any) => console.warn("MongoDB visitor sync:", err.message));
  }

  const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile, role: newUser.role }, JWT_SECRET, { expiresIn: "24h" });
  return res.status(201).json({ message: "Registration successful", token, user: { id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile, role: newUser.role } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = DBStore.findUserByEmail(email);
  if (!user || !user.password) {
    logLoginToMongo({ email: email.toLowerCase(), role: null, success: false, time: getIndiaTime(), date: getIndiaDate() })
      .catch(() => {});
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    logLoginToMongo({ email: user.email.toLowerCase(), role: user.role, success: false, time: getIndiaTime(), date: getIndiaDate() })
      .catch(() => {});
    return res.status(400).json({ error: "Invalid email or password" });
  }

  if (user.role === "customer") {
    logLoginToMongo({ email: user.email.toLowerCase(), role: user.role, success: true, time: getIndiaTime(), date: getIndiaDate() }).catch(() => {});
    const todayVal = getIndiaDate();
    const timeVal = getIndiaTime();
    let targetCust = DBStore.getCustomers().find((c: any) => c.email.toLowerCase() === user.email.toLowerCase());
    if (!targetCust) {
      targetCust = DBStore.createCustomer({ name: user.name, email: user.email, mobile: user.mobile, date: todayVal, time: timeVal });
      saveCustomerToMongo(targetCust).catch(() => {});
    }
    DBStore.createVisitor({ customerId: targetCust.id, name: user.name, email: user.email, mobile: user.mobile, loginTime: timeVal, visitDate: todayVal });
    saveVisitorToMongo({ customerId: targetCust.id, name: user.name, email: user.email, mobile: user.mobile, loginTime: timeVal, visitDate: todayVal }).catch(() => {});
  } else {
    logLoginToMongo({ email: user.email.toLowerCase(), role: user.role, success: true, time: getIndiaTime(), date: getIndiaDate() }).catch(() => {});
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  return res.json({ message: "Login successful", token, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp, action } = req.body;
  if (!email || !otp || !action) return res.status(400).json({ error: "Email, OTP, and action required" });

  const record = pendingOTPs.get(email.toLowerCase());
  if (!record || record.otp !== otp || record.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }
  pendingOTPs.delete(email.toLowerCase());

  if (action === "register") {
    const { name, email: lowerEmail, mobile, passwordHash, finalRole } = record.userData;
    const newUser = DBStore.createUser({ name, email: lowerEmail, mobile, password: passwordHash, role: finalRole });
    saveUserToMongo({ id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile, password: newUser.password, role: newUser.role }).catch(() => {});
    const todayVal = getIndiaDate();
    const timeVal = getIndiaTime();
    const newCust = DBStore.createCustomer({ name, email: lowerEmail, mobile, date: todayVal, time: timeVal });
    DBStore.createVisitor({ customerId: newCust.id, name: newCust.name, email: newCust.email, mobile: newCust.mobile, loginTime: timeVal, visitDate: todayVal });
    saveCustomerToMongo(newCust).catch(() => {});
    saveVisitorToMongo({ customerId: newCust.id, name: newCust.name, email: newCust.email, mobile: newCust.mobile, loginTime: timeVal, visitDate: todayVal }).catch(() => {});
    const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile, role: newUser.role }, JWT_SECRET, { expiresIn: "24h" });
    return res.status(201).json({ message: "Registration completed!", token, user: { id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile, role: newUser.role } });
  } else if (action === "login") {
    const user = DBStore.findUserByEmail(email);
    if (!user) return res.status(404).json({ error: "User not found" });
    logLoginToMongo({ email: user.email.toLowerCase(), role: user.role, success: true, time: getIndiaTime(), date: getIndiaDate() }).catch(() => {});
    const todayVal = getIndiaDate();
    const timeVal = getIndiaTime();
    let targetCust = DBStore.getCustomers().find((c: any) => c.email.toLowerCase() === user.email.toLowerCase());
    if (!targetCust) {
      targetCust = DBStore.createCustomer({ name: user.name, email: user.email, mobile: user.mobile, date: todayVal, time: timeVal });
      saveCustomerToMongo(targetCust).catch(() => {});
    }
    DBStore.createVisitor({ customerId: targetCust.id, name: user.name, email: user.email, mobile: user.mobile, loginTime: timeVal, visitDate: todayVal });
    saveVisitorToMongo({ customerId: targetCust.id, name: user.name, email: user.email, mobile: user.mobile, loginTime: timeVal, visitDate: todayVal }).catch(() => {});
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({ message: "Login successful", token, user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role } });
  }
  return res.status(400).json({ error: "Unsupported action" });
});

// ─── Database Status ──────────────────────────────────────────

app.get("/api/db/status", (_req, res) => {
  res.json({ mongo: getMongoStatus(), local: { type: "JSON File Store", filePath: "data/supermarket_db.json" } });
});

// ─── Products ─────────────────────────────────────────────────

app.get("/api/products", authenticateToken, (_req, res) => {
  res.json(DBStore.getProducts());
});

app.post("/api/products", authenticateToken, requireAdmin, (req, res) => {
  const { name, category, price, stock } = req.body;
  if (!name || !category || price === undefined || stock === undefined) return res.status(400).json({ error: "All fields required" });
  const np = parseFloat(price);
  const ns = parseInt(stock, 10);
  if (isNaN(np) || np <= 0) return res.status(400).json({ error: "Invalid price" });
  if (isNaN(ns) || ns < 0) return res.status(400).json({ error: "Invalid stock" });
  const product = DBStore.createProduct({ name, category, price: np, stock: ns });
  saveProductToMongo(product, "create").catch(() => {});
  res.status(211).json(product);
});

app.put("/api/products/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, category, price, stock } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (price !== undefined) { const v = parseFloat(price); if (isNaN(v) || v <= 0) return res.status(400).json({ error: "Invalid price" }); updates.price = v; }
  if (stock !== undefined) { const v = parseInt(stock, 10); if (isNaN(v) || v < 0) return res.status(400).json({ error: "Invalid stock" }); updates.stock = v; }
  const updated = DBStore.updateProduct(id, updates);
  if (!updated) return res.status(404).json({ error: "Product not found" });
  saveProductToMongo(updated, "update").catch(() => {});
  res.json(updated);
});

app.delete("/api/products/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const target = DBStore.getProducts().find((p: any) => p.id === id);
  if (!DBStore.deleteProduct(id)) return res.status(404).json({ error: "Product not found" });
  if (target) saveProductToMongo(target, "delete").catch(() => {});
  res.json({ message: "Product deleted" });
});

// ─── Customers ────────────────────────────────────────────────

app.post("/api/customer/profile", authenticateToken, (req, res) => {
  const { name, email, mobile } = req.body;
  if (!name || !email || !mobile) return res.status(400).json({ error: "Name, email, mobile required" });
  const existing = DBStore.getCustomers().find((c: any) => c.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.json({ message: "Customer profile active", customer: existing });
  const customer = DBStore.createCustomer({ name, email: email.toLowerCase(), mobile, date: getIndiaDate(), time: getIndiaTime() });
  saveCustomerToMongo(customer).catch(() => {});
  res.status(201).json({ message: "Customer registered", customer });
});

app.get("/api/customers", authenticateToken, requireAdmin, (_req, res) => {
  res.json(DBStore.getCustomers());
});

app.put("/api/customers/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, date, time } = req.body;
  if (!name || !email || !mobile) return res.status(400).json({ error: "Name, email, mobile required" });
  if (!DBStore.updateCustomer(id, { name, email, mobile, date, time })) return res.status(404).json({ error: "Customer not found" });
  res.json({ message: "Customer updated" });
});

app.delete("/api/customers/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const customer = DBStore.getCustomers().find((c: any) => c.id === id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  if (!DBStore.deleteCustomer(id)) return res.status(404).json({ error: "Customer not found" });
  if (customer.email) DBStore.deleteUserByEmail(customer.email);
  deleteCustomerFromMongo(id, customer.email).catch(() => {});
  res.json({ message: "Customer deleted" });
});

// ─── Purchases ────────────────────────────────────────────────

app.post("/api/purchases", authenticateToken, (req, res) => {
  const { customerDetails, cartItems } = req.body;
  if (!customerDetails || !cartItems?.length) return res.status(400).json({ error: "Customer and cart items required" });
  const { name, email, mobile } = customerDetails;
  if (!name || !email || !mobile) return res.status(400).json({ error: "Incomplete customer details" });

  const todayVal = getIndiaDate();
  const timeVal = getIndiaTime();
  let targetCust = DBStore.getCustomers().find((c: any) => c.email.toLowerCase() === email.toLowerCase());
  if (!targetCust) {
    targetCust = DBStore.createCustomer({ name, email: email.toLowerCase(), mobile, date: todayVal, time: timeVal });
    saveCustomerToMongo(targetCust).catch(() => {});
  }

  const products = DBStore.getProducts();
  const validated: any[] = [];
  let subtotal = 0;
  let totalQty = 0;

  for (const item of cartItems) {
    const prod = products.find((p: any) => p.id === item.productId);
    if (!prod) return res.status(400).json({ error: `Product not found: ${item.productId}` });
    if (prod.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${prod.name}` });
    subtotal += prod.price * item.quantity;
    totalQty += item.quantity;
    validated.push({ productId: prod.id, name: prod.name, category: prod.category, price: prod.price, quantity: item.quantity });
  }

  const gst = parseFloat((subtotal * 0.18).toFixed(2));
  const grandTotal = parseFloat((subtotal + gst).toFixed(2));
  const purchase = DBStore.createPurchase({
    customerId: targetCust.id, customerName: targetCust.name, customerEmail: targetCust.email,
    customerMobile: targetCust.mobile, products: validated, quantity: totalQty, totalAmount: grandTotal, purchaseDate: todayVal
  });
  savePurchaseToMongo(purchase).catch(() => {});
  res.status(201).json({ message: "Invoice generated", purchase, billingMeta: { subtotal, gst, grandTotal } });
});

app.get("/api/purchases", authenticateToken, (req: any, res) => {
  const all = DBStore.getPurchases();
  if (req.user.role === "admin") return res.json(all);
  res.json(all.filter((p: any) => p.customerEmail.toLowerCase() === req.user.email.toLowerCase()));
});

// ─── Visitors ─────────────────────────────────────────────────

app.get("/api/visitors", authenticateToken, requireAdmin, (_req, res) => {
  res.json(DBStore.getVisitors());
});

// ─── Dashboard Stats ──────────────────────────────────────────

app.get("/api/dashboard/stats", authenticateToken, requireAdmin, (_req, res) => {
  const purchases = DBStore.getPurchases();
  const visitors = DBStore.getVisitors();
  const customers = DBStore.getCustomers();
  const products = DBStore.getProducts();
  const today = getIndiaDate();
  const month = today.substring(0, 7);

  let totalRev = 0, todayRev = 0, monthRev = 0;
  purchases.forEach((p: any) => {
    totalRev += p.totalAmount;
    if (p.purchaseDate === today) todayRev += p.totalAmount;
    if (p.purchaseDate.startsWith(month)) monthRev += p.totalAmount;
  });

  let totalSold = 0;
  const salesMap: Record<string, any> = {};
  products.forEach((p: any) => { salesMap[p.id] = { name: p.name, category: p.category, price: p.price, quantitySold: 0, totalRev: 0 }; });
  purchases.forEach((p: any) => {
    p.products.forEach((item: any) => {
      totalSold += item.quantity;
      if (salesMap[item.productId]) {
        salesMap[item.productId].quantitySold += item.quantity;
        salesMap[item.productId].totalRev += item.price * item.quantity * 1.18;
      } else {
        salesMap[item.productId] = { name: item.name, category: item.category, price: item.price, quantitySold: item.quantity, totalRev: item.price * item.quantity * 1.18 };
      }
    });
  });
  const breakdown = Object.values(salesMap).map((p: any) => ({ ...p, totalRev: parseFloat(p.totalRev.toFixed(2)) })).sort((a: any, b: any) => b.quantitySold - a.quantitySold);
  const custBreakdown = purchases.map((p: any) => ({ customerName: p.customerName, email: p.customerEmail, mobile: p.customerMobile, products: p.products.map((i: any) => `${i.name}(${i.quantity})`).join(", "), quantity: p.quantity, amount: p.totalAmount, date: p.purchaseDate }));
  const todayVisitors = visitors.filter((v: any) => v.visitDate === today).map((v: any) => ({ name: v.name, email: v.email, mobile: v.mobile, time: v.loginTime, date: v.visitDate }));
  const allVisitors = visitors.map((v: any) => ({ name: v.name, email: v.email, mobile: v.mobile, time: v.loginTime, date: v.visitDate }));

  res.json({
    card1: { totalRevenue: parseFloat(totalRev.toFixed(2)), todayRevenue: parseFloat(todayRev.toFixed(2)), monthlyRevenue: parseFloat(monthRev.toFixed(2)) },
    card2: { totalProductsSold: totalSold, numberOfSales: purchases.length, productsSoldBreakdown: breakdown },
    card3: { totalCustomersPurchasedCount: new Set(purchases.map((p: any) => p.customerId)).size, purchasesBreakdown: custBreakdown },
    card4: { totalVisitorsToday: todayVisitors.length, totalVisitorsAllTime: visitors.length, visitorsTodayBreakdown: todayVisitors, visitorsAllTimeBreakdown: allVisitors }
  });
});

// ─── Analytics ────────────────────────────────────────────────

app.get("/api/dashboard/analytics", authenticateToken, requireAdmin, (_req, res) => {
  const purchases = DBStore.getPurchases();
  const visitors = DBStore.getVisitors();
  const products = DBStore.getProducts();

  const last7: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last7.push(d.toISOString().split("T")[0]); }

  const dailyRev = last7.map(date => ({ date: date.substring(5), revenue: parseFloat(purchases.filter((p: any) => p.purchaseDate === date).reduce((a: number, p: any) => a + p.totalAmount, 0).toFixed(2)) }));

  const weeklyRev = [{ name: "Week 4", revenue: 0 }, { name: "Week 3", revenue: 0 }, { name: "Week 2", revenue: 0 }, { name: "Week 1 (Current)", revenue: 0 }];
  const now = new Date();
  purchases.forEach((p: any) => {
    const diff = Math.ceil(Math.abs(now.getTime() - new Date(p.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 7) weeklyRev[3].revenue += p.totalAmount;
    else if (diff <= 14) weeklyRev[2].revenue += p.totalAmount;
    else if (diff <= 21) weeklyRev[1].revenue += p.totalAmount;
    else if (diff <= 28) weeklyRev[0].revenue += p.totalAmount;
  });
  weeklyRev.forEach(w => w.revenue = parseFloat(w.revenue.toFixed(2)));

  const monthlyRev = [{ month: "Jan", revenue: 0 }, { month: "Feb", revenue: 0 }, { month: "Mar", revenue: 0 }, { month: "Apr", revenue: 0 }, { month: "May", revenue: 0 }, { month: "Jun", revenue: 0 }];
  purchases.forEach((p: any) => {
    const parts = p.purchaseDate.split("-");
    const m = parseInt(parts[1], 10);
    if (m >= 1 && m <= 6) monthlyRev[m - 1].revenue += p.totalAmount;
  });
  monthlyRev.forEach(m => m.revenue = parseFloat(m.revenue.toFixed(2)));

  const counters: Record<string, any> = {};
  products.forEach((p: any) => { counters[p.id] = { name: p.name, sold: 0 }; });
  purchases.forEach((p: any) => {
    p.products.forEach((item: any) => {
      if (counters[item.productId]) counters[item.productId].sold += item.quantity;
      else counters[item.productId] = { name: item.name, sold: item.quantity };
    });
  });
  const sorted = Object.values(counters).sort((a: any, b: any) => b.sold - a.sold);
  const mostSold = sorted.slice(0, 5);
  const leastSold = sorted.filter((p: any) => p.sold > 0).slice(-5);

  const dailyCust = last7.map(date => ({ date: date.substring(5), customers: new Set(purchases.filter((p: any) => p.purchaseDate === date).map((p: any) => p.customerId)).size }));
  const weeklyCust = [{ name: "Week 4", customers: 0 }, { name: "Week 3", customers: 0 }, { name: "Week 2", customers: 0 }, { name: "Week 1 (Current)", customers: 0 }];
  purchases.forEach((p: any) => {
    const diff = Math.ceil(Math.abs(now.getTime() - new Date(p.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 7) weeklyCust[3].customers++;
    else if (diff <= 14) weeklyCust[2].customers++;
    else if (diff <= 21) weeklyCust[1].customers++;
    else if (diff <= 28) weeklyCust[0].customers++;
  });

  const revVsSold = last7.map(date => {
    const dp = purchases.filter((p: any) => p.purchaseDate === date);
    return { date: date.substring(5), revenue: parseFloat(dp.reduce((a: number, p: any) => a + p.totalAmount, 0).toFixed(2)), productsSold: dp.reduce((a: number, p: any) => a + p.quantity, 0) };
  });

  res.json({ revenueData: { daily: dailyRev, weekly: weeklyRev, monthly: monthlyRev }, productSales: { mostSold, leastSold }, customerStats: { daily: dailyCust, weekly: weeklyCust }, revenueVsSold: revVsSold });
});

export default app;
