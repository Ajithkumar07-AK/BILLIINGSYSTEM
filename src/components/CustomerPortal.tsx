import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ShoppingBag, History, User, Contact, ShoppingCart, Search, Trash2, Tag, Percent, ArrowRight, Printer, Download, X, Eye, FileCheck } from "lucide-react";
import { Product, Purchase } from "../types";

const CATEGORIES = ["All", "Groceries", "Beverages", "Snacks", "Dairy", "Personal Care"];

export default function CustomerPortal({ defaultTab = "profile" }: { defaultTab?: string }) {
  const { user, customerDetails, fetchWithAuth, addToast, saveCustomerDetails } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<string>(defaultTab);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Profile Form States
  const [name, setName] = useState<string>(customerDetails?.name || user?.name || "");
  const [email, setEmail] = useState<string>(customerDetails?.email || user?.email || "");
  const [mobile, setMobile] = useState<string>(customerDetails?.mobile || user?.mobile || "");

  // Cart State (stored in React state)
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);

  // Active generated bill modal
  const [recentInvoice, setRecentInvoice] = useState<Purchase | null>(null);

  // Completed purchase history log
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [viewHistoryRecord, setViewHistoryRecord] = useState<Purchase | null>(null);

  useEffect(() => {
    loadProducts();
    if (activeSubTab === "purchase_history") {
      loadHistory();
    }
  }, [activeSubTab]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetchWithAuth("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      addToast("Failed to fetch products catalog", "error");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetchWithAuth("/api/purchases");
      const data = await res.json();
      setPurchaseHistory(data);
    } catch (e) {
      addToast("Failed to fetch historical purchase list", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      addToast("Please fill all profile fields", "warning");
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      addToast("Please enter a valid 10-digit mobile phone number", "warning");
      return;
    }

    try {
      const res = await fetchWithAuth("/api/customer/profile", {
        method: "POST",
        body: JSON.stringify({ name, email, mobile })
      });
      if (res.ok) {
        saveCustomerDetails({ name, email, mobile });
        addToast("Profile details logged successfully", "success");
        // Automatically route to purchase tab for rapid shopping
        setActiveSubTab("purchase_products");
      } else {
        const err = await res.json();
        addToast(err.error || "Failed to update details", "error");
      }
    } catch (e) {
      addToast("Failed sync action with server", "error");
    }
  };

  // Cart operations
  const addToCart = (prod: Product) => {
    if (!customerDetails) {
      addToast("Please submit your Customer Profile form first before adding items to cart!", "warning");
      setActiveSubTab("profile");
      return;
    }

    if (prod.stock <= 0) {
      addToast(`'${prod.name}' is out of stock!`, "error");
      return;
    }

    const existingIdx = cart.findIndex(item => item.product.id === prod.id);
    if (existingIdx !== -1) {
      const activeQty = cart[existingIdx].quantity;
      if (activeQty >= prod.stock) {
        addToast(`Cannot add more. Store stock is limited to ${prod.stock} units.`, "warning");
        return;
      }
      const updated = [...cart];
      updated[existingIdx].quantity += 1;
      setCart(updated);
      addToast(`Updated ${prod.name} quantity to ${activeQty + 1}`, "success");
    } else {
      setCart([...cart, { product: prod, quantity: 1 }]);
      addToast(`Added ${prod.name} to checkout list`, "success");
    }
  };

  const updateCartQty = (prodId: string, delta: number) => {
    const idx = cart.findIndex(item => item.product.id === prodId);
    if (idx === -1) return;

    const currentItem = cart[idx];
    const newQty = currentItem.quantity + delta;

    if (newQty <= 0) {
      setCart(cart.filter(item => item.product.id !== prodId));
      addToast(`Removed ${currentItem.product.name} from cart`, "info");
      return;
    }

    if (newQty > currentItem.product.stock) {
      addToast(`Cannot add. Catalog store stock limited to ${currentItem.product.stock} units.`, "warning");
      return;
    }

    const updated = [...cart];
    updated[idx].quantity = newQty;
    setCart(updated);
  };

  const removeFromCart = (prodId: string) => {
    setCart(cart.filter(item => item.product.id !== prodId));
    addToast("Removed item", "info");
  };

  // Financial calculations
  const subtotalSum = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const gstSum = parseFloat((subtotalSum * 0.18).toFixed(2));
  const grandTotalSum = parseFloat((subtotalSum + gstSum).toFixed(2));

  const handleCheckout = async () => {
    if (!customerDetails) {
      addToast("Customer details card is missing. Please fill profile first.", "warning");
      setActiveSubTab("profile");
      return;
    }

    if (cart.length === 0) {
      addToast("Your cart is empty!", "warning");
      return;
    }

    try {
      const checkoutItems = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      const res = await fetchWithAuth("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          customerDetails,
          cartItems: checkoutItems,
          subtotal: subtotalSum,
          gst: gstSum,
          grandTotal: grandTotalSum
        })
      });

      const data = await res.json();
      if (res.ok) {
        addToast("Transaction successful. Invoice generated!", "success");
        setRecentInvoice(data.purchase);
        setCart([]); // Clear Cart state
        loadProducts(); // Sync catalog stocks
      } else {
        addToast(data.error || "Checkout transaction rejected", "error");
      }
    } catch (e: any) {
      console.error("Checkout transaction error:", e);
      addToast(`Checkout failed: ${e?.message || "Connection issue"}`, "error");
    }
  };

  // Document formatting tools
  const triggerPrintReceipt = (invoice: Purchase) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addToast("Print block popped. Please allow popups.", "warning");
      return;
    }

    const sub = parseFloat((invoice.totalAmount / 1.18).toFixed(2));
    const gst = parseFloat((invoice.totalAmount - sub).toFixed(2));

    const invoiceContent = `
      <html>
        <head>
          <title>Invoice - ${invoice.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.4; }
            .header-info { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 15px; margin-bottom: 30px; }
            .title { font-size: 22px; font-weight: bold; margin: 0; color: #10b981; }
            .table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            .table th { border-bottom: 1px solid #cbd5e1; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; color: #64748b; }
            .table td { padding: 10px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
            .totals { float: right; width: 280px; margin-top: 25px; }
            .totals td { padding: 5px 0; font-size: 13px; }
            .bold { font-weight: bold; font-size: 16px; color: #10b981; }
            .footer-claim { text-align: center; margin-top: 80px; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1 class="title">🏪 AR SUPERMARKET INDIA LTD.</h1>
            <p style="margin: 3px 0 0; font-size: 11px;">Connaught Place Plaza, New Delhi - 110001</p>
          </div>

          <table style="width: 100%; margin-bottom: 20px; font-size: 12px;">
            <tr>
              <td>
                <strong>BILLED TO:</strong><br/>
                ${invoice.customerName}<br/>
                Email: ${invoice.customerEmail}<br/>
                Mobile: +91 ${invoice.customerMobile}
              </td>
              <td style="text-align: right; vertical-align: top;">
                <strong>INVOICE REFERENCE:</strong><br/>
                Invoice ID: #${invoice.id}<br/>
                Date: ${invoice.purchaseDate}<br/>
                </td>
            </tr>
          </table>

          <table class="table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th>Category</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Total amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.products.map(item => `
                <tr>
                  <td><strong>${item.name}</strong></td>
                  <td style="color: #64748b; font-size: 10px;">${item.category}</td>
                  <td style="text-align: right;">₹${item.price.toLocaleString("en-IN")}</td>
                  <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
                  <td style="text-align: right; font-weight: bold;">₹${(item.price * item.quantity).toLocaleString("en-IN")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <table class="totals">
            <tr>
              <td>Subtotal before tax:</td>
              <td style="text-align: right;">₹${sub.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td>integrated GST (18%):</td>
              <td style="text-align: right;">₹${gst.toLocaleString("en-IN")}</td>
            </tr>
            <tr style="border-top: 1px solid #cbd5e1; font-weight: bold;">
              <td class="bold">GRAND TOTAL RECEIVED:</td>
              <td style="text-align: right;" class="bold">₹${invoice.totalAmount.toLocaleString("en-IN")}</td>
            </tr>
          </table>

          <div class="footer-claim">
            <p>Thank you for purchasing. AR Supermarket digital checkout software terminal (2026).</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(invoiceContent);
    printWindow.document.close();
  };

  const downloadJSONBill = (invoice: Purchase) => {
    const structure = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(invoice, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", structure);
    dlAnchorElem.setAttribute("download", `invoice_receipt_${invoice.id}.json`);
    dlAnchorElem.click();
    addToast("JSON Invoice statement downloaded successfully", "success");
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchCat = categoryFilter === "All" || p.category === categoryFilter;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Tab select bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("profile")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
            activeSubTab === "profile"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <User className="h-4 w-4" />
          1. Customer details Profile
        </button>
        <button
          onClick={() => setActiveSubTab("purchase_products")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
            activeSubTab === "purchase_products"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          2. Purchase products catalogue
        </button>
        <button
          onClick={() => setActiveSubTab("purchase_history")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition ${
            activeSubTab === "purchase_history"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <History className="h-4 w-4" />
          My billing Invoice History
        </button>
      </div>

      {/* Sub tabs contents */}

      {/* Tab: Profile form */}
      {activeSubTab === "profile" && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div>
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold uppercase tracking-wider text-[10px] px-3 py-1 rounded-full">
              Requirement Check
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-3 flex items-center gap-2">
              <Contact className="h-5 w-5 text-emerald-600" />
              Customer Information Registry
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Before purchasing products, customers must load their customer records. This ensures invoices are generated legally under matching identities.
            </p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kanna"
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  disabled
                  placeholder="e.g. rameshkanna@gmail.com"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-850 dark:text-slate-400 rounded-xl text-sm focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Bound to login session profile.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Mobile Number (+91 India) *
                </label>
                <input
                  type="tel"
                  required
                  pattern="\d{10}"
                  placeholder="e.g. 9123456789"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <FileCheck className="h-4 w-4" /> Ready to shop after locking details
              </span>
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                Register & Lock Profile →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Purchase Products */}
      {activeSubTab === "purchase_products" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Product list */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Filter and search bars */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search catalogue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 rounded-xl text-xs focus:outline-none text-slate-700 dark:text-white"
                />
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      categoryFilter === cat
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            {loadingProducts ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No products found matching filters.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredProducts.map((p) => {
                  const itemInCartCount = cart.find(item => item.product.id === p.id)?.quantity || 0;
                  const isOutOfStock = p.stock === 0;

                  return (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-slate-900 border border-slate-20s dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase tracking-wide">
                            {p.category}
                          </span>
                          {itemInCartCount > 0 && (
                            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {itemInCartCount} added
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-white mt-2 mb-1">{p.name}</h4>
                        <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                          ₹{p.price.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-4">
                        <span className="text-[10px] font-bold text-slate-400">
                          {isOutOfStock ? (
                            <span className="text-rose-600 block">Out of stock</span>
                          ) : (
                            <span>In Stock: <strong className="text-slate-700 dark:text-slate-200">{p.stock} units</strong></span>
                          )}
                        </span>

                        <button
                          onClick={() => addToCart(p)}
                          disabled={isOutOfStock}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 uppercase tracking-wider ${
                            isOutOfStock
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                          }`}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Add to list
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interactive checkout list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl h-fit space-y-6">
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-855 dark:text-white flex items-center gap-2 text-md">
                <ShoppingCart className="h-5 w-5 text-emerald-600" />
                Selected items list
              </h3>
              <span className="text-xs text-slate-450 font-bold tracking-wider uppercase font-mono">
                ({cart.reduce((s, c) => s + c.quantity, 0)} items)
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-sm font-medium text-slate-400">Your basket items list is empty.</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Add AR Supermarket products from catalog grids to initialize purchase billing.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Scrollable list */}
                <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-80 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.product.id} className="py-3 flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white truncate text-xs">{item.product.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">₹{item.product.price} each</p>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-200 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono text-xs font-bold text-slate-800 dark:text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="px-2 py-1 text-slate-500 hover:bg-slate-200 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotals check */}
                <div className="pt-4 border-t border-slate-150 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{subtotalSum.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>integrated GST Tax (18%):</span>
                    <span className="font-mono">+₹{gstSum.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-slate-850 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Grand Total:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{grandTotalSum.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition uppercase tracking-widest"
                >
                  Generate Invoice Billing
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Purchase History */}
      {activeSubTab === "purchase_history" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs space-y-6">
          <div>
            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-600" />
              My completed purchases receipts
            </h3>
            <p className="text-xs text-slate-400 mt-1">Review historical payments, read billing bills and download tax summaries.</p>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : purchaseHistory.length === 0 ? (
            <p className="text-slate-400 text-sm italic">You don't have any purchase history recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-3">Invoices Reference #</th>
                    <th className="px-6 py-3">Item Count</th>
                    <th className="px-6 py-3 text-right">Invoice Sum</th>
                    <th className="px-6 py-3">Purchase Date</th>
                    <th className="px-6 py-3 text-center">Receipt Handles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {purchaseHistory.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-55/70 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">#{invoice.id}</td>
                      <td className="px-6 py-4">{invoice.quantity} units</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">₹{invoice.totalAmount.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-slate-400">{invoice.purchaseDate}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setViewHistoryRecord(invoice)}
                            className="p-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 flex items-center gap-1 font-semibold"
                            title="Inspect invoice details"
                          >
                            <Eye className="h-3.5 w-3.5" /> inspect
                          </button>
                          <button
                            onClick={() => triggerPrintReceipt(invoice)}
                            className="p-1 px-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded flex items-center gap-1 font-semibold"
                            title="Print invoice Bill"
                          >
                            <Printer className="h-3.5 w-3.5" /> Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bill Success overlay modal */}
      {recentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 max-w-lg w-full rounded-3xl p-6 relative shadow-2xl animate-scale-up space-y-6 text-xs">
            <button
              onClick={() => setRecentInvoice(null)}
              className="absolute right-4 top-4 p-2 hover:bg-slate-100 rounded-full"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            <div className="text-center py-4 border-b border-dashed border-slate-205 dark:border-slate-705">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl mb-3 font-extrabold">🔔</div>
              <h3 className="text-md font-bold text-slate-900 dark:text-white">AR Supermarket Invoice generated!</h3>
              <p className="text-slate-400 mt-1 font-medium">Invoice Reference Number: <span className="font-mono text-emerald-600 font-bold">#{recentInvoice.id}</span></p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/45 p-4 rounded-xl space-y-2">
              <p className="font-semibold text-slate-700 dark:text-slate-200">Receipt recipient: <span className="font-bold">{recentInvoice.customerName}</span></p>
              <p className="text-[10px] text-slate-400">Mobile option: +91 {recentInvoice.customerMobile}</p>
              <p className="text-[10px] text-slate-405 font-mono">Date timestamp: {recentInvoice.purchaseDate} | 10:00 AM</p>
            </div>

            {/* Billing items preview list */}
            <div>
              <p className="font-bold text-slate-600 dark:text-slate-350 uppercase tracking-wider mb-2">Purchased items summary</p>
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {recentInvoice.products.map((pVal, pi) => (
                  <div key={pi} className="py-2 flex justify-between">
                    <span>{pVal.name} (QTY: {pVal.quantity})</span>
                    <span className="font-bold">₹{(pVal.price * pVal.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-4 flex justify-between font-bold text-sm text-slate-800 dark:text-white">
              <span>Grand Total Paid (18% GST inc):</span>
              <span className="font-mono text-emerald-600">₹{recentInvoice.totalAmount.toLocaleString("en-IN")}</span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => downloadJSONBill(recentInvoice)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4" /> Download Bill
              </button>
              <button
                onClick={() => triggerPrintReceipt(recentInvoice)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="h-4 w-4" /> Print bill (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect history record drawer modal */}
      {viewHistoryRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 max-w-lg w-full rounded-3xl p-6 relative shadow-2xl animate-scale-up space-y-6 text-xs animate-slide-in">
            <button
              onClick={() => setViewHistoryRecord(null)}
              className="absolute right-4 top-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>

            <div className="text-center pb-4 border-b border-dashed border-slate-205 dark:border-slate-705">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Invoice Details Receipts</h3>
              <p className="text-slate-400 mt-1 font-medium">ID Reference: <span className="font-mono text-emerald-600 font-bold">#{viewHistoryRecord.id}</span></p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/45 p-4 rounded-xl space-y-2">
              <p className="font-semibold text-slate-700 dark:text-slate-202">Receipt Recipient: <span className="font-bold">{viewHistoryRecord.customerName}</span></p>
              <p className="text-[10px] text-slate-400">Mobile Number: +91 {viewHistoryRecord.customerMobile}</p>
              <p className="text-[10px] text-slate-400 font-mono">Completed Date stamp: {viewHistoryRecord.purchaseDate}</p>
            </div>

            {/* Billing items list */}
            <div>
              <p className="font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wider mb-2">Purchased items checklist</p>
              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {viewHistoryRecord.products.map((pVal, pi) => (
                  <div key={pi} className="py-2.5 flex justify-between">
                    <span>{pVal.name} (QTY: {pVal.quantity})</span>
                    <span className="font-bold">₹{(pVal.price * pVal.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-2d0 dark:border-slate-700 pt-4 flex justify-between font-bold text-sm text-slate-800 dark:text-white">
              <span>Grand Total paid (with 18% GST):</span>
              <span className="font-mono text-emerald-600">₹{viewHistoryRecord.totalAmount.toLocaleString("en-IN")}</span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => downloadJSONBill(viewHistoryRecord)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4" /> Download bill JSON
              </button>
              <button
                onClick={() => triggerPrintReceipt(viewHistoryRecord)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="h-4 w-4" /> Print bill PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
