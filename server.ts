import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { DBStore } from "./server-db";
import { User, Product, Customer, Purchase, Visitor, UserRole } from "./src/types";
import {
  saveUserToMongo,
  logLoginToMongo,
  getMongoStatus,
  seedUsersToMongo,
  saveProductToMongo,
  saveCustomerToMongo,
  deleteCustomerFromMongo,
  saveVisitorToMongo,
  savePurchaseToMongo,
  seedInitialStoreToMongo
} from "./server-mongodb";

// Initialize the Database Store
DBStore.initialize();

// Helper function to send real OTP verification code via Gmail SMTP if configured
async function sendOTPEmail(email: string, otp: string, purpose: "login" | "register") {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log(`[OTP SYSTEM] Gmail SMTP is not configured in .env. Falling back to sandbox simulation.`);
    console.log(`[OTP SYSTEM] GENERATED CODE FOR ${email.toUpperCase()} (${purpose.toUpperCase()}): ${otp}`);
    return { sent: false, error: "SMTP credentials not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const subject = purpose === "login" 
      ? "🔐 Login Verification Code - AR Supermarket" 
      : "🌟 Registration Verification Code - AR Supermarket";

    const mailOptions = {
      from: `"AR Supermarket Billing System" <${emailUser}>`,
      to: email.toLowerCase(),
      subject: subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 24px; font-weight: 800; color: #10b981; letter-spacing: -0.5px;">AR Supermarket Billing System</div>
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-top: 4px; font-weight: 700;">Secure Identity Gatekeeper</div>
          </div>
          
          <div style="border-top: 2px solid #f1f5f9; padding-top: 24px;">
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello,</p>
            <p style="font-size: 15px; line-height: 1.6; color: #334155;">You requested a security verification code to sign into or register your AR Supermarket customer profile.</p>
            
            <div style="margin: 28px 0; text-align: center;">
              <p style="font-size: 11px; font-weight: 755; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 10px;">Verification Code (${purpose})</p>
              <div style="display: inline-block; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 40px; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #ef4444;">${otp}</div>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
              This code is valid for <strong>5 minutes</strong>. If you did not make this request, you can safely disregard this email.
            </p>
          </div>

          <div style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
            <p>This is an automated system email. Do not reply to this message.</p>
            <p style="margin-top: 4px;">&copy; 2026 AR Supermarket. All rights reserved.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[OTP SYSTEM] Real verification email successfully sent to ${email}. ID: ${info.messageId}`);
    return { sent: true };
  } catch (err: any) {
    console.error(`[OTP SYSTEM] Failed to send real SMTP verification email to ${email}:`, err.message);
    return { sent: false, error: err.message };
  }
}


// Seed database users & catalogs to MongoDB billing_system asynchronously if database is online
seedUsersToMongo(DBStore.getUsers()).catch((err) => {
  console.warn("MongoDB initial seeding was skipped:", err.message);
});
seedInitialStoreToMongo({
  products: DBStore.getProducts(),
  customers: DBStore.getCustomers(),
  purchases: DBStore.getPurchases(),
  visitors: DBStore.getVisitors()
}).catch((err) => {
  console.warn("MongoDB store details seeding was skipped:", err.message);
});

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supermarket_jwt_secret_constant_2026_xyz";

// Native CORS headers middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use(express.json());

// Helpers for formatted date and time
function getIndiaDate() {
  // Return current Date in YYYY-MM-DD form
  const d = new Date();
  const offset = 5.5 * 60 * 60 * 1000; // India offset
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
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

// Authentication Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// Admin checking middleware
function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin role required." });
  }
  next();
}

// OTP Store for Ordinary Customers (Security Layer)
interface PendingOTP {
  email: string;
  otp: string;
  expiresAt: number;
  userData?: any; // For registration
}
const pendingOTPs = new Map<string, PendingOTP>();

// API Routes

// Registration
app.post("/api/auth/register", async (req, res) => {
  const { name, email, mobile, password, confirmPassword, role } = req.body;

  if (!name || !email || !mobile || !password || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  // Strong password validation helper
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  // Mobile number validation (10 digits)
  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
  }

  // Unique email check
  const existingUser = DBStore.findUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ error: "Email is already registered" });
  }

  // Hash Password
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const finalRole = (role === "admin" || role === "customer") ? role : "customer";

  // Create User
  const newUser = DBStore.createUser({
    name,
    email: email.toLowerCase(),
    mobile,
    password: passwordHash,
    role: finalRole
  });

  // Store user registration details asynchronously in MongoDB (billing_system.users and billing_system.anime)
  saveUserToMongo({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    mobile: newUser.mobile,
    password: newUser.password,
    role: newUser.role
  }).catch((err) => console.error("MongoDB write warning during registration:", err.message));

  if (finalRole === "customer") {
    // Create Customer profile card
    const todayVal = getIndiaDate();
    const timeVal = getIndiaTime();
    const newCust = DBStore.createCustomer({
      name,
      email: email.toLowerCase(),
      mobile,
      date: todayVal,
      time: timeVal
    });

    // Create Visitor log record
    DBStore.createVisitor({
      customerId: newCust.id,
      name: newCust.name,
      email: newCust.email,
      mobile: newCust.mobile,
      loginTime: timeVal,
      visitDate: todayVal
    });

    // Ensure they both sync to local in-memory DB and MongoDB properly
    saveCustomerToMongo(newCust).catch((err) => console.warn("MongoDB customer sync warning:", err.message));
    saveVisitorToMongo({
      customerId: newCust.id,
      name: newCust.name,
      email: newCust.email,
      mobile: newCust.mobile,
      loginTime: timeVal,
      visitDate: todayVal
    }).catch((err) => console.warn("MongoDB visitor sync warning:", err.message));
  }

  // Generate Token
  const token = jwt.sign(
    { id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile, role: newUser.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  return res.status(201).json({
    message: "Registration successful",
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      mobile: newUser.mobile,
      role: newUser.role
    }
  });
});

// Login (Both Admin and User/Customer)
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = DBStore.findUserByEmail(email);
  if (!user || !user.password) {
    // Record login failure details in MongoDB billing_system
    logLoginToMongo({
      email: email ? email.toLowerCase() : "unknown",
      role: null,
      success: false,
      time: getIndiaTime(),
      date: getIndiaDate()
    }).catch((err) => console.warn("MongoDB connection offline. Login log skipped:", err.message));

    return res.status(400).json({ error: "Invalid email or password" });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    // Record login failure details in MongoDB billing_system
    logLoginToMongo({
      email: user.email.toLowerCase(),
      role: user.role,
      success: false,
      time: getIndiaTime(),
      date: getIndiaDate()
    }).catch((err) => console.warn("MongoDB connection offline. Login log skipped:", err.message));

    return res.status(400).json({ error: "Invalid email or password" });
  }

  if (user.role === "customer") {
    // Record login in MongoDB
    logLoginToMongo({
      email: user.email.toLowerCase(),
      role: user.role,
      success: true,
      time: getIndiaTime(),
      date: getIndiaDate()
    }).catch((err) => console.warn("MongoDB connection offline. Login log skipped:", err.message));

    // Sync Customer and create Visitor trace
    const todayVal = getIndiaDate();
    const timeVal = getIndiaTime();
    let targetCust = DBStore.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase());
    if (!targetCust) {
      targetCust = DBStore.createCustomer({
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        date: todayVal,
        time: timeVal
      });
      saveCustomerToMongo(targetCust).catch((err) => console.warn("MongoDB customer sync warning:", err.message));
    }

    // Add Visitor Trace in system
    DBStore.createVisitor({
      customerId: targetCust.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      loginTime: timeVal,
      visitDate: todayVal
    });
    saveVisitorToMongo({
      customerId: targetCust.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      loginTime: timeVal,
      visitDate: todayVal
    }).catch((err) => console.warn("MongoDB visitor sync warning:", err.message));
  } else {
    // Record login for non-customer
    logLoginToMongo({
      email: user.email.toLowerCase(),
      role: user.role,
      success: true,
      time: getIndiaTime(),
      date: getIndiaDate()
    }).catch((err) => console.warn("MongoDB connection offline. Login log skipped:", err.message));
  }

  // Generate Token
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  return res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role
    }
  });
});

// Verify Email OTP for Users/Customers (Kept for compatibility, returns immediate success block if called)
app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp, action } = req.body;

  if (!email || !otp || !action) {
    return res.status(400).json({ error: "Email, OTP code, and action fields are required" });
  }

  const record = pendingOTPs.get(email.toLowerCase());
  if (!record || record.otp !== otp || record.expiresAt < Date.now()) {
    return res.status(400).json({ error: "Invalid, incorrect, or expired OTP code" });
  }

  // Clean up OTP on success
  pendingOTPs.delete(email.toLowerCase());

  if (action === "register") {
    const { name, email: lowerEmail, mobile, passwordHash, finalRole } = record.userData;

    // Create User
    const newUser = DBStore.createUser({
      name,
      email: lowerEmail,
      mobile,
      password: passwordHash,
      role: finalRole
    });

    // Store user registration details asynchronously in MongoDB
    saveUserToMongo({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      mobile: newUser.mobile,
      password: newUser.password,
      role: newUser.role
    }).catch((err) => console.error("MongoDB write warning during registration:", err.message));

    // Create Customer profile card
    const todayVal = getIndiaDate();
    const timeVal = getIndiaTime();
    const newCust = DBStore.createCustomer({
      name,
      email: lowerEmail,
      mobile,
      date: todayVal,
      time: timeVal
    });

    // Create Visitor log record
    DBStore.createVisitor({
      customerId: newCust.id,
      name: newCust.name,
      email: newCust.email,
      mobile: newCust.mobile,
      loginTime: timeVal,
      visitDate: todayVal
    });

    // Ensure they both sync to local in-memory DB and MongoDB properly
    saveCustomerToMongo(newCust).catch((err) => console.warn("MongoDB customer sync warning:", err.message));
    saveVisitorToMongo({
      customerId: newCust.id,
      name: newCust.name,
      email: newCust.email,
      mobile: newCust.mobile,
      loginTime: timeVal,
      visitDate: todayVal
    }).catch((err) => console.warn("MongoDB visitor sync warning:", err.message));

    // Generate Token
    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, mobile: newUser.mobile, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(201).json({
      message: "Registration completed successfully!",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        role: newUser.role
      }
    });

  } else if (action === "login") {
    const user = DBStore.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Associated user profile no longer exists" });
    }

    // Record login in MongoDB
    logLoginToMongo({
      email: user.email.toLowerCase(),
      role: user.role,
      success: true,
      time: getIndiaTime(),
      date: getIndiaDate()
    }).catch((err) => console.warn("MongoDB connection offline. Login log skipped:", err.message));

    // Sync Customer and create Visitor trace
    const todayVal = getIndiaDate();
    const timeVal = getIndiaTime();
    let targetCust = DBStore.getCustomers().find(c => c.email.toLowerCase() === user.email.toLowerCase());
    if (!targetCust) {
      targetCust = DBStore.createCustomer({
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        date: todayVal,
        time: timeVal
      });
      saveCustomerToMongo(targetCust).catch((err) => console.warn("MongoDB customer sync warning:", err.message));
    }

    // Add Visitor Trace in system
    DBStore.createVisitor({
      customerId: targetCust.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      loginTime: timeVal,
      visitDate: todayVal
    });
    saveVisitorToMongo({
      customerId: targetCust.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      loginTime: timeVal,
      visitDate: todayVal
    }).catch((err) => console.warn("MongoDB visitor sync warning:", err.message));

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      message: "Authentication completed successfully!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });
  }

  return res.status(400).json({ error: "Unsupported verification scope action" });
});

// GET database and MongoDB status info
app.get("/api/db/status", (req, res) => {
  return res.json({
    mongo: getMongoStatus(),
    local: {
      type: "JSON File Store",
      filePath: "data/supermarket_db.json"
    }
  });
});

// Products catalog (GET is accessible by logged in users or admins)
app.get("/api/products", authenticateToken, (req, res) => {
  return res.json(DBStore.getProducts());
});

// Products modification (Admin only)
app.post("/api/products", authenticateToken, requireAdmin, (req, res) => {
  const { name, category, price, stock } = req.body;
  if (!name || !category || price === undefined || stock === undefined) {
    return res.status(400).json({ error: "All product fields are required" });
  }
  const numericPrice = parseFloat(price);
  const numericStock = parseInt(stock, 10);
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: "Price must be a valid positive number" });
  }
  if (isNaN(numericStock) || numericStock < 0) {
    return res.status(400).json({ error: "Stock must be a non-negative integer" });
  }

  const newProduct = DBStore.createProduct({
    name,
    category,
    price: numericPrice,
    stock: numericStock
  });
  saveProductToMongo(newProduct, "create").catch((err) => console.warn("MongoDB catalog sync warning:", err.message));
  return res.status(211).json(newProduct);
});

// Update product
app.put("/api/products/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, category, price, stock } = req.body;

  const updates: Partial<Product> = {};
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (price !== undefined) {
    const val = parseFloat(price);
    if (isNaN(val) || val <= 0) return res.status(400).json({ error: "Invalid price" });
    updates.price = val;
  }
  if (stock !== undefined) {
    const val = parseInt(stock, 10);
    if (isNaN(val) || val < 0) return res.status(400).json({ error: "Invalid stock" });
    updates.stock = val;
  }

  const updated = DBStore.updateProduct(id, updates);
  if (!updated) {
    return res.status(404).json({ error: "Product not found" });
  }
  saveProductToMongo(updated, "update").catch((err) => console.warn("MongoDB catalog sync warning:", err.message));
  return res.json(updated);
});

// Delete product
app.delete("/api/products/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const targetProduct = DBStore.getProducts().find(p => p.id === id);
  const deleted = DBStore.deleteProduct(id);
  if (!deleted) {
    return res.status(404).json({ error: "Product not found" });
  }
  if (targetProduct) {
    saveProductToMongo(targetProduct, "delete").catch((err) => console.warn("MongoDB catalog sync warning:", err.message));
  }
  return res.json({ message: "Product deleted successfully" });
});

// Customer Details form submission (prior to checkout)
app.post("/api/customer/profile", authenticateToken, (req, res) => {
  const { name, email, mobile } = req.body;
  if (!name || !email || !mobile) {
    return res.status(400).json({ error: "Customers Name, Email, and Mobile is required" });
  }

  const date = getIndiaDate();
  const time = getIndiaTime();

  // Create or retrieve customer card
  let activeCustomer = DBStore.getCustomers().find(c => c.email.toLowerCase() === email.toLowerCase());
  if (activeCustomer) {
    // Already exists, we can return or extend log
    return res.json({ message: "Customer profile already active", customer: activeCustomer });
  }

  activeCustomer = DBStore.createCustomer({
    name,
    email: email.toLowerCase(),
    mobile,
    date,
    time
  });

  saveCustomerToMongo(activeCustomer).catch((err) => console.warn("MongoDB customer sync warning:", err.message));

  return res.status(201).json({ message: "Customer card registered successfully", customer: activeCustomer });
});

// Retrieve Customers List (Admin only)
app.get("/api/customers", authenticateToken, requireAdmin, (req, res) => {
  return res.json(DBStore.getCustomers());
});

// Update Customer Details (Admin only)
app.put("/api/customers/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, date, time } = req.body;

  if (!name || !email || !mobile) {
    return res.status(400).json({ error: "Name, email and mobile are required" });
  }

  const updated = DBStore.updateCustomer(id, { name, email, mobile, date, time });
  if (!updated) {
    return res.status(404).json({ error: "Customer not found" });
  }

  return res.json({ message: "Customer details updated successfully" });
});

// Delete Customer (Admin only)
app.delete("/api/customers/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  const customer = DBStore.getCustomers().find(c => c.id === id);
  if (!customer) {
    return res.status(404).json({ error: "Customer profile not found" });
  }

  const email = customer.email;

  // 1. Delete customer ledger profile from local memory/JSON persistence
  const deleted = DBStore.deleteCustomer(id);
  if (!deleted) {
    return res.status(404).json({ error: "Customer profile not found" });
  }

  // 2. Delete matching User login profile from local memory/JSON to keep accounts in sync
  if (email) {
    DBStore.deleteUserByEmail(email);
  }

  // 3. Delete from MongoDB to fully ensure they are wiped out from account details lists
  deleteCustomerFromMongo(id, email).catch((err) => {
    console.warn("MongoDB customer deletion sync warning:", err.message);
  });

  return res.json({ message: "Customer profile and login credentials deleted successfully" });
});

// Purchase Management
// POST: create a new checkout transaction
app.post("/api/purchases", authenticateToken, (req, res) => {
  const { customerDetails, cartItems, subtotal, gst, grandTotal } = req.body;

  if (!customerDetails || !cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: "Customer details and selected cart items are required" });
  }

  const { name, email, mobile } = customerDetails;
  if (!name || !email || !mobile) {
    return res.status(400).json({ error: "Incomplete billing customer details" });
  }

  const todayVal = getIndiaDate();
  const timeVal = getIndiaTime();

  // 1. Ensure customer is logged in the "Customers" collection
  let targetCust = DBStore.getCustomers().find(c => c.email.toLowerCase() === email.toLowerCase());
  if (!targetCust) {
    targetCust = DBStore.createCustomer({
      name,
      email: email.toLowerCase(),
      mobile,
      date: todayVal,
      time: timeVal
    });
    saveCustomerToMongo(targetCust).catch((err) => console.warn("MongoDB customer sync warning:", err.message));
  }

  // 2. Validate inventory stocks server-side
  const productsCatalog = DBStore.getProducts();
  const validatedProducts: any[] = [];
  let calculatedSubtotal = 0;
  let totalQty = 0;

  for (const item of cartItems) {
    const originalProd = productsCatalog.find(p => p.id === item.productId);
    if (!originalProd) {
      return res.status(400).json({ error: `Product lookup failed for ID: ${item.productId}` });
    }
    if (originalProd.stock < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock for product '${originalProd.name}'. Available: ${originalProd.stock}, Requested: ${item.quantity}`
      });
    }

    calculatedSubtotal += originalProd.price * item.quantity;
    totalQty += item.quantity;

    validatedProducts.push({
      productId: originalProd.id,
      name: originalProd.name,
      category: originalProd.category,
      price: originalProd.price,
      quantity: item.quantity
    });
  }

  const serverGst = parseFloat((calculatedSubtotal * 0.18).toFixed(2));
  const serverGrandTotal = parseFloat((calculatedSubtotal + serverGst).toFixed(2));

  // 3. Create purchase transaction record
  const newPurchase = DBStore.createPurchase({
    customerId: targetCust.id,
    customerName: targetCust.name,
    customerEmail: targetCust.email,
    customerMobile: targetCust.mobile,
    products: validatedProducts,
    quantity: totalQty,
    totalAmount: serverGrandTotal,
    purchaseDate: todayVal
  });

  savePurchaseToMongo(newPurchase).catch((err) => console.warn("MongoDB purchase sync warning:", err.message));

  return res.status(201).json({
    message: "Invoice generated successfully",
    purchase: newPurchase,
    billingMeta: {
      subtotal: calculatedSubtotal,
      gst: serverGst,
      grandTotal: serverGrandTotal
    }
  });
});

// GET: retrieve purchases
// Admin sees all history, Client only sees their own transactions
app.get("/api/purchases", authenticateToken, (req: any, res: any) => {
  const allPurchases = DBStore.getPurchases();
  if (req.user.role === "admin") {
    return res.json(allPurchases);
  } else {
    // Filter purchases by client email or mobile
    const userEmail = req.user.email.toLowerCase();
    const customerPurchases = allPurchases.filter(p => p.customerEmail.toLowerCase() === userEmail);
    return res.json(customerPurchases);
  }
});

// Visitors list (Admin only)
app.get("/api/visitors", authenticateToken, requireAdmin, (req, res) => {
  return res.json(DBStore.getVisitors());
});

// Admin Dashboard stats Endpoint
app.get("/api/dashboard/stats", authenticateToken, requireAdmin, (req, res) => {
  const purchases = DBStore.getPurchases();
  const visitors = DBStore.getVisitors();
  const customers = DBStore.getCustomers();
  const products = DBStore.getProducts();

  const today = getIndiaDate();
  const currentMonth = today.substring(0, 7); // "YYYY-MM"

  // Card 1 Calculations
  let totalRevenue = 0;
  let todayRevenue = 0;
  let monthlyRevenue = 0;

  purchases.forEach(p => {
    totalRevenue += p.totalAmount;
    if (p.purchaseDate === today) {
      todayRevenue += p.totalAmount;
    }
    if (p.purchaseDate.startsWith(currentMonth)) {
      monthlyRevenue += p.totalAmount;
    }
  });

  // Card 2 Calculations - Products sold & aggregated breakdown
  let totalProductsSold = 0;
  const productSalesMap: Record<string, { name: string; category: string; price: number; quantitySold: number; totalRev: number }> = {};

  // Initialize mapping with all active catalog products to avoid blanks
  products.forEach(p => {
    productSalesMap[p.id] = {
      name: p.name,
      category: p.category,
      price: p.price,
      quantitySold: 0,
      totalRev: 0
    };
  });

  purchases.forEach(p => {
    p.products.forEach(item => {
      totalProductsSold += item.quantity;
      if (productSalesMap[item.productId]) {
        productSalesMap[item.productId].quantitySold += item.quantity;
        productSalesMap[item.productId].totalRev += (item.price * item.quantity) * 1.18; // Est with GST
      } else {
        productSalesMap[item.productId] = {
          name: item.name,
          category: item.category,
          price: item.price,
          quantitySold: item.quantity,
          totalRev: (item.price * item.quantity) * 1.18
        };
      }
    });
  });

  const productBreakdown = Object.values(productSalesMap).map(p => ({
    ...p,
    totalRev: parseFloat(p.totalRev.toFixed(2))
  })).sort((a,b) => b.quantitySold - a.quantitySold); // Sort by highest units sold

  // Card 3 Calculations - Customer Purchases breakdown list
  // List of active purchases containing items, name, amount and date
  const customerBreakdown = purchases.map(p => {
    const productsString = p.products.map(item => `${item.name} (${item.quantity})`).join(", ");
    return {
      customerName: p.customerName,
      email: p.customerEmail,
      mobile: p.customerMobile,
      productsPurchased: productsString,
      quantity: p.quantity,
      purchaseAmount: p.totalAmount,
      purchaseDate: p.purchaseDate
    };
  });

  // Card 4: Visitors list
  const visitorsTodayList = visitors.filter(v => v.visitDate === today).map(v => ({
    customerName: v.name,
    email: v.email,
    mobile: v.mobile,
    loginTime: v.loginTime,
    visitDate: v.visitDate
  }));

  const allVisitorsList = visitors.map(v => ({
    customerName: v.name,
    email: v.email,
    mobile: v.mobile,
    loginTime: v.loginTime,
    visitDate: v.visitDate
  }));

  return res.json({
    card1: {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2))
    },
    card2: {
      totalProductsSold,
      numberOfSales: purchases.length,
      productsSoldBreakdown: productBreakdown
    },
    card3: {
      totalCustomersPurchasedCount: new Set(purchases.map(p => p.customerId)).size,
      purchasesBreakdown: customerBreakdown
    },
    card4: {
      totalVisitorsToday: visitorsTodayList.length,
      totalVisitorsAllTime: visitors.length,
      visitorsTodayBreakdown: visitorsTodayList,
      visitorsAllTimeBreakdown: allVisitorsList
    }
  });
});

// Admin Analytics Endpoint (Recharts helper)
app.get("/api/dashboard/analytics", authenticateToken, requireAdmin, (req, res) => {
  const purchases = DBStore.getPurchases();
  const visitors = DBStore.getVisitors();
  const products = DBStore.getProducts();

  // Past 7 dates list relative to today
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    last7Days.push(dateStr);
  }

  // 1. Revenue Graph Days (Daily, Weekly (past 4 weeks), Monthly (past 6 months))
  const dailyRevenue = last7Days.map(date => {
    const sum = purchases
      .filter(p => p.purchaseDate === date)
      .reduce((acc, p) => acc + p.totalAmount, 0);
    return {
      date: date.substring(5), // "MM-DD" style
      revenue: parseFloat(sum.toFixed(2))
    };
  });

  const weeklyRevenue = [
    { name: "Week 4 (Oldest)", revenue: 0 },
    { name: "Week 3", revenue: 0 },
    { name: "Week 2", revenue: 0 },
    { name: "Week 1 (Current)", revenue: 0 }
  ];
  // Allocate purchases of past 28 days to weekly bins
  const now = new Date();
  purchases.forEach(p => {
    const pDate = new Date(p.purchaseDate);
    const diffTime = Math.abs(now.getTime() - pDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      weeklyRevenue[3].revenue += p.totalAmount;
    } else if (diffDays <= 14) {
      weeklyRevenue[2].revenue += p.totalAmount;
    } else if (diffDays <= 21) {
      weeklyRevenue[1].revenue += p.totalAmount;
    } else if (diffDays <= 28) {
      weeklyRevenue[0].revenue += p.totalAmount;
    }
  });
  weeklyRevenue.forEach(w => w.revenue = parseFloat(w.revenue.toFixed(2)));

  const monthlyRevenueData = [
    { month: "Jan", revenue: 0 },
    { month: "Feb", revenue: 0 },
    { month: "Mar", revenue: 0 },
    { month: "Apr", revenue: 0 },
    { month: "May", revenue: 0 },
    { month: "Jun", revenue: 0 }
  ];
  purchases.forEach(p => {
    const dateParts = p.purchaseDate.split("-");
    if (dateParts.length >= 2) {
      const monthNum = parseInt(dateParts[1], 10);
      if (monthNum >= 1 && monthNum <= 6) {
        monthlyRevenueData[monthNum - 1].revenue += p.totalAmount;
      }
    }
  });
  monthlyRevenueData.forEach(m => m.revenue = parseFloat(m.revenue.toFixed(2)));


  // 2. Product Sales Graph (Most Sold / Least Sold)
  const productCounters: Record<string, { name: string; sold: number }> = {};
  products.forEach(p => {
    productCounters[p.id] = { name: p.name, sold: 0 };
  });
  purchases.forEach(p => {
    p.products.forEach(item => {
      if (productCounters[item.productId]) {
        productCounters[item.productId].sold += item.quantity;
      } else {
        productCounters[item.productId] = { name: item.name, sold: item.quantity };
      }
    });
  });

  const sortedProductStats = Object.values(productCounters)
    .sort((a, b) => b.sold - a.sold);

  const mostSoldProducts = sortedProductStats.slice(0, 5);
  const leastSoldProducts = sortedProductStats.filter(p => p.sold > 0).slice(-5);
  // Guarantee fallback if some have 0 sold
  if (leastSoldProducts.length === 0) {
    sortedProductStats.slice(-5).forEach(p => leastSoldProducts.push(p));
  }


  // 3. Customer Statistics (Daily, Weekly, Monthly)
  const dailyCustomers = last7Days.map(date => {
    const count = new Set(purchases.filter(p => p.purchaseDate === date).map(p => p.customerId)).size;
    return {
      date: date.substring(5),
      customers: count
    };
  });

  const weeklyCustomers = [
    { name: "Week 4", customers: 2 },
    { name: "Week 3", customers: 3 },
    { name: "Week 2", customers: 5 },
    { name: "Week 1 (Current)", customers: 0 }
  ];
  purchases.forEach(p => {
    const pDate = new Date(p.purchaseDate);
    const diffTime = Math.abs(now.getTime() - pDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) weeklyCustomers[3].customers++;
    else if (diffDays <= 14) weeklyCustomers[2].customers++;
    else if (diffDays <= 21) weeklyCustomers[1].customers++;
    else if (diffDays <= 28) weeklyCustomers[0].customers++;
  });


  // 4. Revenue vs Products Sold per day
  const revenueVsSold = last7Days.map(date => {
    const daysPurchases = purchases.filter(p => p.purchaseDate === date);
    const revSum = daysPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
    const unitsSum = daysPurchases.reduce((acc, p) => acc + p.quantity, 0);
    return {
      date: date.substring(5),
      revenue: parseFloat(revSum.toFixed(2)),
      productsSold: unitsSum
    };
  });

  return res.json({
    revenueData: {
      daily: dailyRevenue,
      weekly: weeklyRevenue,
      monthly: monthlyRevenueData
    },
    productSales: {
      mostSold: mostSoldProducts,
      leastSold: leastSoldProducts
    },
    customerStats: {
      daily: dailyCustomers,
      weekly: weeklyCustomers
    },
    revenueVsSold
  });
});

// Setup Vite Dev Server / Static files handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
