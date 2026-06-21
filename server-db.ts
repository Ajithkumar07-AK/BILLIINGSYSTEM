import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { User, Product, Customer, Purchase, Visitor, UserRole } from "./src/types";

const DB_FILE = path.join(process.cwd(), "data", "supermarket_db.json");

interface DBStructure {
  users: User[];
  products: Product[];
  customers: Customer[];
  purchases: Purchase[];
  visitors: Visitor[];
}

// Default Products catalog seed
const DEFAULT_PRODUCTS: Product[] = [
  // Groceries
  { id: "p1", name: "Rice (Basmati Premium)", category: "Groceries", price: 60, stock: 150 },
  { id: "p2", name: "Sugar (Refined Safe)", category: "Groceries", price: 50, stock: 120 },
  { id: "p3", name: "Wheat Flour (Atta)", category: "Groceries", price: 45, stock: 180 },
  { id: "p4", name: "Table Salt", category: "Groceries", price: 20, stock: 200 },
  // Beverages
  { id: "p5", name: "Pepsi Cold Drink", category: "Beverages", price: 40, stock: 100 },
  { id: "p6", name: "Coca Cola Classic", category: "Beverages", price: 40, stock: 100 },
  { id: "p7", name: "Sprite Lemon Drink", category: "Beverages", price: 40, stock: 100 },
  // Snacks
  { id: "p8", name: "Potato Chips (Masala)", category: "Snacks", price: 20, stock: 150 },
  { id: "p9", name: "Marie Gold Biscuits", category: "Snacks", price: 10, stock: 250 },
  { id: "p10", name: "Chocolate Cookies", category: "Snacks", price: 30, stock: 120 },
  // Dairy
  { id: "p11", name: "Toned Milk (1 Litre)", category: "Dairy", price: 30, stock: 80 },
  { id: "p12", name: "Amul Salted Butter", category: "Dairy", price: 55, stock: 90 },
  { id: "p13", name: "Processed Cheese Slices", category: "Dairy", price: 120, stock: 75 },
  // Personal Care
  { id: "p14", name: "Sandalwood Soap", category: "Personal Care", price: 35, stock: 140 },
  { id: "p15", name: "Herbal Shampoo", category: "Personal Care", price: 120, stock: 95 },
  { id: "p16", name: "Mint Toothpaste", category: "Personal Care", price: 80, stock: 110 }
];

export class DBStore {
  private static data: DBStructure = {
    users: [],
    products: [],
    customers: [],
    purchases: [],
    visitors: []
  };

  static initialize() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);

        // Remove any historical default seed purchases starting with tx_0 or tx_ to ensure clean user-only revenue calculation
        if (this.data.purchases) {
          this.data.purchases = this.data.purchases.filter(p => !p.id.startsWith("tx_0"));
        }
        if (this.data.visitors) {
          this.data.visitors = this.data.visitors.filter(v => !v.id.startsWith("v_") || v.id.length > 6);
        }

        // Guarantee default products exist if deleted or array empty
        if (!this.data.products || this.data.products.length === 0) {
          this.data.products = [...DEFAULT_PRODUCTS];
          this.save();
        }
        this.save();
        return;
      } catch (e) {
        console.error("Error reading database file, resetting...", e);
      }
    }

    // Initialize with Seed Data
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync("admin123", salt);
    const demoUserPasswordHash = bcrypt.hashSync("customer123", salt);

    this.data = {
      users: [
        {
          id: "u_admin",
          name: "Admin Manager",
          email: "admin@supermarket.com",
          mobile: "9876543210",
          password: adminPasswordHash,
          role: "admin"
        },
        {
          id: "u_customer",
          name: "Ramesh Kanna",
          email: "ramesh@gmail.com",
          mobile: "9123456789",
          password: demoUserPasswordHash,
          role: "customer"
        }
      ],
      products: [...DEFAULT_PRODUCTS],
      customers: [
        {
          id: "c_demo_1",
          name: "Ramesh Kanna",
          email: "ramesh@gmail.com",
          mobile: "9123456789",
          date: "2026-06-20",
          time: "09:15"
        },
        {
          id: "c_guest_2",
          name: "Aarav Sharma",
          email: "aarav_sharma@gmail.com",
          mobile: "9876123450",
          date: "2026-06-19",
          time: "14:30"
        },
        {
          id: "c_guest_3",
          name: "Priyanka Sen",
          email: "priyanka.sen@outlook.com",
          mobile: "9654783210",
          date: "2026-06-18",
          time: "11:20"
        },
        {
          id: "c_guest_4",
          name: "Vikram Malhotra",
          email: "vikram.m@gmail.com",
          mobile: "9911223344",
          date: "2026-06-17",
          time: "18:45"
        }
      ],
      purchases: [],
      visitors: []
    };

    this.save();
    console.log("Database initialized cleanly without default sample sales at " + DB_FILE);
  }

  private static seedPurchases() {
    const historicalPurchases: Purchase[] = [
      {
        id: "tx_001",
        customerId: "c_demo_1",
        customerName: "Ramesh Kanna",
        customerEmail: "ramesh@gmail.com",
        customerMobile: "9123456789",
        products: [
          { productId: "p1", name: "Rice (Basmati Premium)", category: "Groceries", price: 60, quantity: 5 },
          { productId: "p13", name: "Processed Cheese Slices", category: "Dairy", price: 120, quantity: 2 },
          { productId: "p15", name: "Herbal Shampoo", category: "Personal Care", price: 120, quantity: 1 }
        ],
        quantity: 8,
        totalAmount: 660, // (60*5 + 120*2 + 120) * 1.18 = approx grand total. Wait, let's store raw totalAmount including GST
        purchaseDate: "2026-06-20"
      },
      {
        id: "tx_002",
        customerId: "c_guest_2",
        customerName: "Aarav Sharma",
        customerEmail: "aarav_sharma@gmail.com",
        customerMobile: "9876123450",
        products: [
          { productId: "p2", name: "Sugar (Refined Safe)", category: "Groceries", price: 50, quantity: 10 },
          { productId: "p5", name: "Pepsi Cold Drink", category: "Beverages", price: 40, quantity: 6 },
          { productId: "p12", name: "Amul Salted Butter", category: "Dairy", price: 55, quantity: 3 }
        ],
        quantity: 19,
        totalAmount: 1067.9, // Raw subtotal = 500 + 240 + 165 = 905 + 18% GST (162.9) = 1067.9
        purchaseDate: "2026-06-19"
      },
      {
        id: "tx_003",
        customerId: "c_guest_3",
        customerName: "Priyanka Sen",
        customerEmail: "priyanka.sen@outlook.com",
        customerMobile: "9654783210",
        products: [
          { productId: "p14", name: "Sandalwood Soap", category: "Personal Care", price: 35, quantity: 4 },
          { productId: "p8", name: "Potato Chips (Masala)", category: "Snacks", price: 20, quantity: 12 }
        ],
        quantity: 16,
        totalAmount: 448.4, // Raw subtotal = 140 + 240 = 380 + 18% GST (68.4) = 448.4
        purchaseDate: "2026-06-18"
      },
      {
        id: "tx_004",
        customerId: "c_guest_4",
        customerName: "Vikram Malhotra",
        customerEmail: "vikram.m@gmail.com",
        customerMobile: "9911223344",
        products: [
          { productId: "p3", name: "Wheat Flour (Atta)", category: "Groceries", price: 45, quantity: 15 },
          { productId: "p11", name: "Toned Milk (1 Litre)", category: "Dairy", price: 30, quantity: 10 },
          { productId: "p16", name: "Mint Toothpaste", category: "Personal Care", price: 80, quantity: 3 }
        ],
        quantity: 28,
        totalAmount: 1433.7, // Subtotal = 675 + 300 + 240 = 1215 + 18% GST (218.7) = 1433.7
        purchaseDate: "2026-06-17"
      },
      // Previous days for beautiful graphs
      {
        id: "tx_005",
        customerId: "c_guest_2",
        customerName: "Aarav Sharma",
        customerEmail: "aarav_sharma@gmail.com",
        customerMobile: "9876123450",
        products: [
          { productId: "p1", name: "Rice (Basmati Premium)", category: "Groceries", price: 60, quantity: 20 },
          { productId: "p2", name: "Sugar (Refined Safe)", category: "Groceries", price: 50, quantity: 8 }
        ],
        quantity: 28,
        totalAmount: 1888, // Subtotal = 1200 + 400 = 1600 + 18% GST (288) = 1888
        purchaseDate: "2026-06-16"
      },
      {
        id: "tx_006",
        customerId: "c_guest_3",
        customerName: "Priyanka Sen",
        customerEmail: "priyanka.sen@outlook.com",
        customerMobile: "9654783210",
        products: [
          { productId: "p15", name: "Herbal Shampoo", category: "Personal Care", price: 120, quantity: 5 }
        ],
        quantity: 5,
        totalAmount: 708, // Subtotal = 600 + 18% GST (108) = 708
        purchaseDate: "2026-06-15"
      },
      {
        id: "tx_007",
        customerId: "c_guest_4",
        customerName: "Vikram Malhotra",
        customerEmail: "vikram.m@gmail.com",
        customerMobile: "9911223344",
        products: [
          { productId: "p10", name: "Chocolate Cookies", category: "Snacks", price: 30, quantity: 15 },
          { productId: "p6", name: "Coca Cola Classic", category: "Beverages", price: 40, quantity: 10 }
        ],
        quantity: 25,
        totalAmount: 1003, // Subtotal = 450 + 400 = 850 + 18% GST (153) = 1003
        purchaseDate: "2026-06-14"
      }
    ];

    this.data.purchases = historicalPurchases;

    // Decrement the stocks accordingly
    for (const tx of historicalPurchases) {
      for (const item of tx.products) {
        const prod = this.data.products.find(p => p.id === item.productId);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
        }
      }
    }
  }

  private static seedVisitors() {
    this.data.visitors = [
      {
        id: "v_1",
        customerId: "u_customer",
        name: "Ramesh Kanna",
        email: "ramesh@gmail.com",
        mobile: "9123456789",
        loginTime: "09:05 AM",
        visitDate: "2026-06-20"
      },
      {
        id: "v_2",
        customerId: "c_guest_2",
        name: "Aarav Sharma",
        email: "aarav_sharma@gmail.com",
        mobile: "9876123450",
        loginTime: "02:15 PM",
        visitDate: "2026-06-19"
      },
      {
        id: "v_3",
        customerId: "c_guest_3",
        name: "Priyanka Sen",
        email: "priyanka.sen@outlook.com",
        mobile: "9654783210",
        loginTime: "11:00 AM",
        visitDate: "2026-06-18"
      },
      {
        id: "v_4",
        customerId: "c_guest_4",
        name: "Vikram Malhotra",
        email: "vikram.m@gmail.com",
        mobile: "9911223344",
        loginTime: "06:30 PM",
        visitDate: "2026-06-17"
      },
      {
        id: "v_5",
        customerId: "u_customer",
        name: "Ramesh Kanna",
        email: "ramesh@gmail.com",
        mobile: "9123456789",
        loginTime: "10:11 AM",
        visitDate: "2026-06-16"
      }
    ];
  }

  static save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing to database file", e);
    }
  }

  // Collection functions emulating MongoDB operations
  static getUsers(): User[] {
    return this.data.users;
  }

  static findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  static createUser(user: Omit<User, "id">): User {
    const id = "u_" + Math.random().toString(36).substr(2, 9);
    const newUser: User = { ...user, id };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  static deleteUserByEmail(email: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
    const deleted = this.data.users.length < initialLen;
    if (deleted) this.save();
    return deleted;
  }

  static getProducts(): Product[] {
    return this.data.products;
  }

  static createProduct(product: Omit<Product, "id">): Product {
    const id = "p_" + Math.random().toString(36).substr(2, 9);
    const newProduct: Product = { ...product, id };
    this.data.products.push(newProduct);
    this.save();
    return newProduct;
  }

  static updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.products[idx] = { ...this.data.products[idx], ...updates };
      this.save();
      return this.data.products[idx];
    }
    return undefined;
  }

  static deleteProduct(id: string): boolean {
    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter(p => p.id !== id);
    const deleted = this.data.products.length < initialLen;
    if (deleted) this.save();
    return deleted;
  }

  static getCustomers(): Customer[] {
    return this.data.customers;
  }

  static createCustomer(customer: Omit<Customer, "id">): Customer {
    const id = "c_" + Math.random().toString(36).substr(2, 9);
    const newCustomer: Customer = { ...customer, id };
    this.data.customers.push(newCustomer);
    this.save();
    return newCustomer;
  }

  static updateCustomer(id: string, updated: Partial<Customer>): boolean {
    const custIndex = this.data.customers.findIndex(c => c.id === id);
    if (custIndex === -1) return false;
    this.data.customers[custIndex] = {
      ...this.data.customers[custIndex],
      ...updated
    };
    this.save();
    return true;
  }

  static deleteCustomer(id: string): boolean {
    const initialLen = this.data.customers.length;
    this.data.customers = this.data.customers.filter(c => c.id !== id);
    const deleted = this.data.customers.length < initialLen;
    if (deleted) this.save();
    return deleted;
  }

  static getPurchases(): Purchase[] {
    return this.data.purchases;
  }

  static createPurchase(purchase: Omit<Purchase, "id">): Purchase {
    const id = "tx_" + Math.random().toString(36).substr(2, 9).toUpperCase();
    const newPurchase: Purchase = { ...purchase, id };
    this.data.purchases.push(newPurchase);

    // Automatically decrement product stocks
    for (const item of newPurchase.products) {
      const prod = this.data.products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
      }
    }

    this.save();
    return newPurchase;
  }

  static getVisitors(): Visitor[] {
    return this.data.visitors;
  }

  static createVisitor(visitor: Omit<Visitor, "id">): Visitor {
    const id = "v_" + Math.random().toString(36).substr(2, 9);
    const newVisitor: Visitor = { ...visitor, id };
    this.data.visitors.push(newVisitor);
    this.save();
    return newVisitor;
  }
}
