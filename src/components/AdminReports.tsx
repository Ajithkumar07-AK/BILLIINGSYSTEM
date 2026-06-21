import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { FileText, Download, Printer, Filter, Calendar, TrendingUp, DollarSign, RefreshCw, BarChart2 } from "lucide-react";
import { Purchase } from "../types";

export default function AdminReports() {
  const { fetchWithAuth, addToast } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateFilter, setDateFilter] = useState<string>("all"); // "today", "seven_days", "this_month", "all"

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/purchases");
      const data = await res.json();
      setPurchases(data);
    } catch (e) {
      addToast("Failed to load reporting database", "error");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    const today = new Date().toISOString().split("T")[0];
    const past7Days = new Date();
    past7Days.setDate(past7Days.getDate() - 7);
    
    const currentMonth = today.substring(0, 7); // "YYYY-MM"

    return purchases.filter((p) => {
      if (dateFilter === "today") {
        return p.purchaseDate === today;
      }
      if (dateFilter === "seven_days") {
        const pDate = new Date(p.purchaseDate);
        return pDate >= past7Days;
      }
      if (dateFilter === "this_month") {
        return p.purchaseDate.startsWith(currentMonth);
      }
      return true;
    });
  };

  const filteredPurchases = getFilteredData();

  // Calculation summaries
  const totalInvoicesValue = filteredPurchases.length;
  const totalRevenueValue = filteredPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalProductsSoldValue = filteredPurchases.reduce((acc, p) => acc + p.quantity, 0);
  
  // Categorical sales breakdown
  const categorySummary: Record<string, { items: number; revenue: number }> = {};
  filteredPurchases.forEach((p) => {
    p.products.forEach((pItem) => {
      const cat = pItem.category;
      if (!categorySummary[cat]) {
        categorySummary[cat] = { items: 0, revenue: 0 };
      }
      categorySummary[cat].items += pItem.quantity;
      categorySummary[cat].revenue += (pItem.price * pItem.quantity) * 1.18; // Inc standard GST
    });
  });

  const exportCSVReport = () => {
    if (filteredPurchases.length === 0) {
      addToast("No transactions found in selected range to export", "warning");
      return;
    }

    const headers = ["Invoice ID", "Customer Details", "Products Count", "Subtotal (approx)", "GST 18%", "Paid Grand total (₹)", "Purchase Date"];
    const csvRows = [
      headers.join(","),
      ...filteredPurchases.map((p) => {
        const sub = (p.totalAmount / 1.18).toFixed(2);
        const gst = (p.totalAmount - parseFloat(sub)).toFixed(2);
        return [
          p.id,
          `"${p.customerName} (${p.customerEmail})"`,
          p.quantity,
          sub,
          gst,
          p.totalAmount,
          p.purchaseDate
        ].join(",");
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `supermarket_accounting_report_${dateFilter}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("CSV Report downloaded. Ready for Excel!", "success");
  };

  const printSummaryPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addToast("Failed to open print portal", "warning");
      return;
    }

    const todayDate = new Date().toISOString().split("T")[0];

    const htmlContent = `
      <html>
        <head>
          <title>AR Supermarket Strategic Executive Report</title>
          <style>
            body { font-family: system-ui, sans-serif; color: #1e293b; padding: 40px; }
            .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 40px; }
            .title { font-size: 24px; font-weight: bold; uppercase; margin: 0; }
            .meta { font-size: 13px; color: #64748b; margin-top: 5px; }
            .metrics-grid { display: flex; gap: 20px; margin-bottom: 40px; }
            .metric-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #f8fafc; text-align: center; }
            .metric-val { font-size: 22px; font-weight: bold; color: #10b981; margin-top: 8px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            .table th { background: #e2e8f0; text-align: left; padding: 12px; font-size: 12px; font-weight: bold; }
            .table td { padding: 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
            .footer { text-align: center; padding-top: 60px; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">🏦 AR Supermarket Executives Business Report</h1>
            <p class="meta">Corporate Billing ledger report - generated on: ${todayDate}</p>
            <p class="meta">Active filter: <strong>${dateFilter.toUpperCase().replace("_", " ")}</strong></p>
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <div>Total Completed Sales</div>
              <div class="metric-val">${totalInvoicesValue} Invoices</div>
            </div>
            <div class="metric-card">
              <div>Aggregate Goods Distributed</div>
              <div class="metric-val">${totalProductsSoldValue} Units</div>
            </div>
            <div class="metric-card">
              <div>Financial Revenue Collected</div>
              <div class="metric-val">₹${totalRevenueValue.toLocaleString("en-IN")}</div>
            </div>
          </div>

          <h3>Category Revenue Breakdown</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Product Category</th>
                <th style="text-align: right;">Distributed Units</th>
                <th style="text-align: right;">Category Share Revenue (18% GST inc)</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(categorySummary).map(([cat, stats]) => `
                <tr>
                  <td><strong>${cat}</strong></td>
                  <td style="text-align: right; font-weight: bold;">${stats.items}</td>
                  <td style="text-align: right; font-weight: bold; color: #10b981;">₹${parseFloat(stats.revenue.toFixed(2)).toLocaleString("en-IN")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer">
            <p>© 2569 AR Supermarket India Logistics - Confidential Store Reports</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="mt-4 text-xs text-slate-500 font-medium">Extracting executive spreadsheets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Executive Reports Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate and export consolidated sales sheets, check department growth metrics, and execute print tasks.
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={exportCSVReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-955 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Download Excel Spreadsheet (.CSV)
          </button>
          <button
            onClick={printSummaryPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Print executive PDF Report
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Date constraints Filter:</span>
        </div>
        <div className="flex gap-1.5">
          {[
            { id: "today", val: "Today Only" },
            { id: "seven_days", val: "Past 7 Days" },
            { id: "this_month", val: "Current Month" },
            { id: "all", val: "Full Database (All Time)" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDateFilter(item.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                dateFilter === item.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {item.val}
            </button>
          ))}
        </div>
      </div>

      {/* Numerical summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl relative overflow-hidden">
          <span className="text-xs text-slate-400 font-bold block mb-1 uppercase tracking-wider">Completed Invoices</span>
          <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {totalInvoicesValue} Invoices
          </h4>
          <p className="text-[10px] text-emerald-600 mt-2 font-medium">Sales records compiled successfully</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl relative overflow-hidden">
          <span className="text-xs text-slate-400 font-bold block mb-1 uppercase tracking-wider">Distributed Units</span>
          <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {totalProductsSoldValue} Units
          </h4>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">AR Supermarket products delivered</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl relative overflow-hidden">
          <span className="text-xs text-slate-400 font-bold block mb-1 uppercase tracking-wider">Total Revenue Generated</span>
          <h4 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            ₹{totalRevenueValue.toLocaleString("en-IN")}
          </h4>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Includes integrated 18% GST tax</p>
        </div>
      </div>

      {/* Category breakdown table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Department Product Share & Revenue Distribution</h3>
        </div>
        {Object.keys(categorySummary).length === 0 ? (
          <div className="p-8 text-center text-slate-400">No transactions recorded in selected calendar window.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/60 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4">Department Category</th>
                <th className="px-6 py-4 text-center">Items Distributed</th>
                <th className="px-6 py-4 text-right">Revenue Yield (₹ GST Inc)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {Object.entries(categorySummary).map(([cat, stats]) => (
                <tr key={cat} className="hover:bg-slate-55/70 dark:hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white">{cat}</td>
                  <td className="px-6 py-4 text-center font-mono font-medium">{stats.items} units</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-950 dark:text-emerald-400">
                    ₹{parseFloat(stats.revenue.toFixed(2)).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
