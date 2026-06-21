import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { IndianRupee, ShoppingCart, UserCheck, Eye, Search, ArrowRight, Star, Tag, X } from "lucide-react";

export default function AdminDashboard() {
  const { fetchWithAuth, addToast } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCardDetail, setActiveCardDetail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/dashboard/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      addToast("Failed to load dashboard metrics", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Loading live dashboard telemetry...</p>
      </div>
    );
  }

  if (!stats) return null;

  const { card1, card2, card3, card4 } = stats;

  const renderDetailSection = () => {
    if (!activeCardDetail) return null;

    let title = "";
    let headers: string[] = [];
    let rData: any[] = [];
    let filterPlaceholder = "";

    switch (activeCardDetail) {
      case "card2":
        title = "Products Sold Breakdown";
        headers = ["Product Name", "Category", "Unit Price", "Sold Qty", "Revenue (with GST)"];
        filterPlaceholder = "Search by item name or category...";
        rData = card2.productsSoldBreakdown.map((p: any) => ({
          col1: p.name,
          col2: p.category,
          col3: `₹${p.price.toLocaleString("en-IN")}`,
          col4: p.quantitySold,
          col5: `₹${p.totalRev.toLocaleString("en-IN")}`,
          raw: p
        }));
        break;
      case "card3":
        title = "Customer Purchases Log";
        headers = ["Customer Details", "Products Purchased", "Total Items", "Paid Amount", "Transaction Date"];
        filterPlaceholder = "Search by name or email...";
        rData = card3.purchasesBreakdown.map((p: any) => ({
          col1: (
            <div>
              <p className="font-semibold text-slate-800 dark:text-white">{p.customerName}</p>
              <p className="text-[11px] text-slate-400 font-mono">{p.email} | {p.mobile}</p>
            </div>
          ),
          col2: <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">{p.productsPurchased}</p>,
          col3: p.quantity,
          col4: <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{p.purchaseAmount.toLocaleString("en-IN")}</span>,
          col5: p.purchaseDate,
          raw: p
        }));
        break;
      case "card4":
        title = "Today's Visitors Ledger";
        headers = ["Visitor Profile", "Mobile Number", "Arrival Time", "Status", "Log Date"];
        filterPlaceholder = "Search visitor name...";
        rData = card4.visitorsTodayBreakdown.map((p: any) => ({
          col1: (
            <div>
              <p className="font-semibold text-slate-800 dark:text-white">{p.customerName}</p>
              <p className="text-[11px] text-slate-400 font-mono">{p.email}</p>
            </div>
          ),
          col2: p.mobile,
          col3: p.loginTime,
          col4: <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">Active Store Visitor</span>,
          col5: p.visitDate,
          raw: p
        }));
        break;
      default:
        return null;
    }

    // Client-side search matching
    const filteredRows = rData.filter((row: any) => {
      const matchText = searchTerm.toLowerCase();
      if (!matchText) return true;

      // Extract raw search target depending on type
      const raw = row.raw;
      if (activeCardDetail === "card2") {
        return raw.name.toLowerCase().includes(matchText) || raw.category.toLowerCase().includes(matchText);
      } else if (activeCardDetail === "card3") {
        return raw.customerName.toLowerCase().includes(matchText) || raw.email.toLowerCase().includes(matchText);
      } else if (activeCardDetail === "card4") {
        return raw.customerName.toLowerCase().includes(matchText) || raw.email.toLowerCase().includes(matchText);
      }
      return true;
    });

    return (
      <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden animate-slide-in">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Showing filtered overview of clickable metric records
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={filterPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 dark:bg-slate-800"
              />
            </div>
            <button
              onClick={() => {
                setActiveCardDetail(null);
                setSearchTerm("");
              }}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredRows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No matching records found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  {headers.map((h, i) => (
                    <th key={i} className="px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredRows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-medium">{row.col1}</td>
                    <td className="px-6 py-4">{row.col2}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{row.col3}</td>
                    <td className="px-6 py-4 text-center font-mono font-medium">{row.col4}</td>
                    <td className="px-6 py-4 font-medium">{row.col5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-emerald-800 text-white rounded-3xl p-6 md:p-8 flex items-center justify-between gap-6 relative overflow-hidden shadow-lg shadow-emerald-900/10">
        <div className="relative z-10 max-w-xl">
          <span className="bg-emerald-700/60 text-emerald-200 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-600">
            AR Store Hub
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-3">
            AR Supermarket Admin Terminal
          </h2>
          <p className="mt-2 text-sm text-emerald-100 leading-relaxed">
            Monitor real-time sales transactions, inspect digital invoice logs, track user sign-ins, and generate graphical reports instantly.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center p-8 pointer-events-none">
          <ShoppingCart className="h-64 w-64 rotate-12" />
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/55 rounded-2xl relative">
              <IndianRupee className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Financial Status
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-0.5">Total Revenue Generated</span>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ₹{card1.totalRevenue.toLocaleString("en-IN")}
            </h4>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Today's Sales</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                ₹{card1.todayRevenue.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="border-l border-slate-100 dark:border-slate-800 pl-3">
              <span className="text-slate-400 block font-medium">Monthly Rev</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ₹{card1.monthlyRevenue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Products Sold */}
        <button
          onClick={() => {
            setActiveCardDetail(activeCardDetail === "card2" ? null : "card2");
            setSearchTerm("");
          }}
          className={`text-left bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm hover:shadow-md transition cursor-pointer relative ${
            activeCardDetail === "card2" ? "border-emerald-600 ring-2 ring-emerald-500/20" : "border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-teal-100 dark:bg-teal-950/55 rounded-2xl">
              <ShoppingCart className="h-6 w-6 text-teal-700 dark:text-teal-400" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
              Inspect <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-0.5">Total Products Sold</span>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {card2.totalProductsSold.toLocaleString("en-IN")} Units
            </h4>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block font-medium">No. of Invoices</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{card2.numberOfSales} Transactions</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 underline">View Breakdown</span>
          </div>
        </button>

        {/* Card 3: Customers Purchased */}
        <button
          onClick={() => {
            setActiveCardDetail(activeCardDetail === "card3" ? null : "card3");
            setSearchTerm("");
          }}
          className={`text-left bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm hover:shadow-md transition cursor-pointer relative ${
            activeCardDetail === "card3" ? "border-emerald-600 ring-2 ring-emerald-500/20" : "border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-violet-100 dark:bg-violet-950/55 rounded-2xl">
              <UserCheck className="h-6 w-6 text-violet-700 dark:text-violet-400" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
              Inspect <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-0.5">Billing Customers</span>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {card3.totalCustomersPurchasedCount} unique
            </h4>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Total Ledger Logs</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">View customer purchases</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 underline">View List</span>
          </div>
        </button>

        {/* Card 4: Visitors Today */}
        <button
          onClick={() => {
            setActiveCardDetail(activeCardDetail === "card4" ? null : "card4");
            setSearchTerm("");
          }}
          className={`text-left bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm hover:shadow-md transition cursor-pointer relative ${
            activeCardDetail === "card4" ? "border-emerald-600 ring-2 ring-emerald-500/20" : "border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-pink-100 dark:bg-pink-950/55 rounded-2xl">
              <Eye className="h-6 w-6 text-pink-700 dark:text-pink-400" />
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest">
              Inspect <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-0.5">Today's Store Visitors</span>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {card4.totalVisitorsToday} active
            </h4>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block font-medium">All-Time Live Hits</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{card4.totalVisitorsAllTime} visits</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 underline">View Hits</span>
          </div>
        </button>
      </div>

      {/* Conditional Detail Tables */}
      {renderDetailSection()}

      {/* Quick Category Summary Cards */}
      <div className="bg-slate-50 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/60">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-4">AR Supermarket Catalog Stock Status Alert</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { cat: "Groceries", color: "border-emerald-500 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200" },
            { cat: "Beverages", color: "border-sky-500 bg-sky-500/5 text-sky-800 dark:text-sky-200" },
            { cat: "Snacks", color: "border-amber-500 bg-amber-500/5 text-amber-800 dark:text-amber-200" },
            { cat: "Dairy", color: "border-teal-500 bg-teal-500/5 text-teal-800 dark:text-teal-200" },
            { cat: "Personal Care", color: "border-fuchsia-500 bg-fuchsia-500/5 text-fuchsia-800 dark:text-fuchsia-200" }
          ].map((c) => {
            // Count category goods with < 90 in stock
            const lowStockItemsCount = card2.productsSoldBreakdown
              .filter((x: any) => x.category === c.cat && x.stock <= 80).length;

            return (
              <div key={c.cat} className={`border rounded-2xl p-4 text-center ${c.color}`}>
                <p className="text-xs font-semibold">{c.cat}</p>
                <div className="mt-1 text-lg font-extrabold">Active SKU</div>
                <p className="text-[10px] font-medium opacity-85 mt-2">
                  Stock status: safe
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
