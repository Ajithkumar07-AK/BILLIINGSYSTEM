import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { History, Search, FileText, Printer, Download, Eye, X, Receipt } from "lucide-react";
import { Purchase } from "../types";

export default function AdminPurchases() {
  const { fetchWithAuth, addToast } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<Purchase | null>(null);

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
      addToast("Failed to load purchase history ledger", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerMobile.includes(searchTerm)
  );

  const handlePrint = (p: Purchase) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addToast("Failed to open print window. Please disable popup blockers.", "warning");
      return;
    }

    const subtotal = parseFloat((p.totalAmount / 1.18).toFixed(2));
    const gstVal = parseFloat((p.totalAmount - subtotal).toFixed(2));

    const htmlContent = `
      <html>
        <head>
          <title>AR Supermarket Invoice - ${p.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #e1e8ed; padding-bottom: 20px; margin-bottom: 30px; }
            .store-title { font-size: 24px; font-weight: bold; color: #10b981; text-transform: uppercase; margin: 0; }
            .store-sub { font-size: 12px; color: #666; margin-top: 4px; }
            .invoice-title { font-size: 20px; font-weight: bold; margin-top: 20px; color: #1e293b; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .info-table td { padding: 6px 0; font-size: 13px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th { background: #f8fafc; text-align: left; padding: 12px; font-size: 12px; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            .items-table td { padding: 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
            .summary-table { float: right; width: 300px; border-collapse: collapse; margin-top: 20px; }
            .summary-table td { padding: 8px 0; font-size: 14px; }
            .summary-table .bold { font-weight: bold; color: #10b981; font-size: 18px; }
            .footer { clear: both; text-align: center; margin-top: 80px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="store-title">🏪 AR Supermarket India Ltd.</h1>
            <p class="store-sub">Corporate Hub Plaza, Connaught Place, New Delhi - 110001</p>
          </div>
          
          <table class="info-table">
            <tr>
              <td style="width: 50%;">
                <strong>BILLED TO:</strong><br/>
                Name: ${p.customerName}<br/>
                Email: ${p.customerEmail}<br/>
                Mobile: +91 ${p.customerMobile}
              </td>
              <td style="text-align: right; vertical-align: top;">
                <strong>INVOICE DETAILS:</strong><br/>
                Invoice No: <span style="font-family: monospace;">#${p.id}</span><br/>
                Date: ${p.purchaseDate}<br/>
                Timestamp: 10:00 AM (IST)
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th>Category</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${p.products.map(item => `
                <tr>
                  <td><strong>${item.name}</strong></td>
                  <td style="color: #64748b; font-size: 11px;">${item.category}</td>
                  <td style="text-align: right;">₹${item.price.toLocaleString("en-IN")}</td>
                  <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
                  <td style="text-align: right; font-weight: bold;">₹${(item.price * item.quantity).toLocaleString("en-IN")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <table class="summary-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">₹${subtotal.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td>GST (18% integrated):</td>
              <td style="text-align: right;">₹${gstVal.toLocaleString("en-IN")}</td>
            </tr>
            <tr style="border-top: 2px solid #e2e8f0;">
              <td class="bold">GRAND TOTAL:</td>
              <td style="text-align: right;" class="bold">₹${p.totalAmount.toLocaleString("en-IN")}</td>
            </tr>
          </table>

          <div class="footer">
            <p>Thank you for shopping with us! This is a digitally initialized legal tax invoice representation.</p>
            <p>AR Supermarket Billing System Terminal (2026)</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const downloadHTMLInvoice = (p: Purchase) => {
    const subtotal = parseFloat((p.totalAmount / 1.18).toFixed(2));
    const gstVal = parseFloat((p.totalAmount - subtotal).toFixed(2));

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AR Supermarket Bill - ${p.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
    
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 40px 20px;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }

    .ctrl-bar {
      max-width: 800px;
      margin: 0 auto 24px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 12px 24px;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
      border: 1px solid #e2e8f0;
    }
    .ctrl-btn {
      background-color: #059669;
      color: white;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background-color 0.2s;
    }
    .ctrl-btn:hover {
      background-color: #047857;
    }
    .ctrl-info {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    .receipt-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px;
      border-radius: 20px;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05);
      border: 1px solid #e2e8f0;
      box-sizing: border-box;
    }

    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 800;
      color: #059669;
      margin: 0 0 6px 0;
    }
    .header p {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      font-weight: 500;
    }

    .divider {
      border-top: 1px dashed #cbd5e1;
      margin: 24px 0;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      font-size: 12px;
      margin-bottom: 36px;
    }
    .meta-col {
      line-height: 1.6;
    }
    .meta-col.right {
      text-align: right;
    }
    .meta-title {
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
      text-transform: uppercase;
      font-size: 11px;
    }
    .meta-value {
      color: #334155;
      font-size: 12px;
    }
    .meta-val-bold {
      font-weight: 600;
      color: #0f172a;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
    }
    .items-table th {
      border-bottom: 1px solid #e2e8f0;
      padding: 12px 0;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      text-align: left;
      letter-spacing: 0.05em;
    }
    .items-table td {
      padding: 16px 0;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .items-table .product-name {
      font-weight: 700;
      color: #0f172a;
    }
    .items-table .category {
      color: #64748b;
    }
    .items-table .price {
      font-family: 'JetBrains Mono', monospace;
    }
    .items-table .qty {
      font-weight: 700;
      text-align: center;
    }
    .items-table .amount {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
    }

    .summary-section {
      margin-top: 32px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .summary-table {
      width: 320px;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 6px 0;
      font-size: 13px;
      color: #475569;
    }
    .summary-table .amount-val {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
    }
    .summary-table .total-row td {
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-weight: 800;
      color: #059669;
      font-size: 15px;
    }
    .summary-table .total-row .total-val {
      font-size: 16px;
      font-family: 'JetBrains Mono', monospace;
    }

    .footer {
      text-align: center;
      margin-top: 60px;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
    }

    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .ctrl-bar {
        display: none !important;
      }
      .receipt-card {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="ctrl-bar">
    <div class="ctrl-info">
      🏪 AR Supermarket Digital Bill Document (HTML Format ready to Print/PDF)
    </div>
    <button class="ctrl-btn" onclick="window.print()">
      Print Receipt / Save PDF
    </button>
  </div>

  <div class="receipt-card">
    <div class="header">
      <h1>🏪 AR SUPERMARKET INDIA LTD.</h1>
      <p>Connaught Place Plaza, New Delhi - 110001</p>
    </div>

    <div class="divider"></div>

    <div class="meta-grid">
      <div class="meta-col">
        <div class="meta-title">Billed To:</div>
        <div class="meta-value meta-val-bold">${p.customerName}</div>
        <div class="meta-value">Email: ${p.customerEmail}</div>
        <div class="meta-value">Mobile: +91 ${p.customerMobile}</div>
      </div>
      <div class="meta-col right">
        <div class="meta-title">Invoice Reference:</div>
        <div class="meta-value">Invoice ID: <span class="meta-val-bold" style="font-family: 'JetBrains Mono', monospace;">#${p.id}</span></div>
        <div class="meta-value">Date: ${p.purchaseDate}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 45%;">Product Description</th>
          <th style="width: 20%;">Category</th>
          <th style="width: 15%; text-align: right;">Price</th>
          <th style="width: 8%; text-align: center;">Qty</th>
          <th style="width: 12%; text-align: right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${p.products.map(item => `
          <tr>
            <td><span class="product-name">${item.name}</span></td>
            <td><span class="category">${item.category}</span></td>
            <td style="text-align: right;"><span class="price">₹${item.price.toLocaleString("en-IN")}</span></td>
            <td style="text-align: center;"><span class="qty">${item.quantity}</span></td>
            <td style="text-align: right;"><span class="amount">₹${(item.price * item.quantity).toLocaleString("en-IN")}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="summary-section">
      <table class="summary-table">
        <tr>
          <td>Subtotal before tax:</td>
          <td class="amount-val">₹${subtotal.toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td>integrated GST (18%):</td>
          <td class="amount-val">₹${gstVal.toLocaleString("en-IN")}</td>
        </tr>
        <tr class="total-row">
          <td>GRAND TOTAL RECEIVED:</td>
          <td class="total-val text-right">₹${p.totalAmount.toLocaleString("en-IN")}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <p>Thank you for purchasing. AR Supermarket digital checkout software terminal (2026).</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", url);
    dlAnchorElem.setAttribute("download", `supermarket_bill_${p.id}.html`);
    dlAnchorElem.click();
    URL.revokeObjectURL(url);
    addToast("Invoice document downloaded successfully as printable HTML", "success");
  };

  const handleInvoiceSelect = (p: Purchase) => {
    setSelectedInvoice(p);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="mt-4 text-xs text-slate-500">Retrieving digital transaction ledgers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="h-5 w-5 text-emerald-600" />
          Retail Purchase Logs
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Browse historical digital transactions, print tax invoices, and export system sheets.
        </p>
      </div>

      {/* Control Pane */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Customer Name, or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-white"
          />
        </div>
        <span className="text-xs font-semibold text-slate-400">
          Loaded {filteredPurchases.length} invoices in ledger
        </span>
      </div>

      {/* List / Table */}
      {filteredPurchases.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <p className="text-sm font-medium text-slate-400">No purchases found matching constraints.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Customer Contact</th>
                <th className="px-6 py-4 text-center">Items Qty</th>
                <th className="px-6 py-4 text-right">Invoice grandTotal</th>
                <th className="px-6 py-4">Purchase Date</th>
                <th className="px-6 py-4 text-center">Receipt Handles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    #{p.id}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-white">
                    {p.customerName}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    {p.customerEmail}<br/>
                    +91 {p.customerMobile}
                  </td>
                  <td className="px-6 py-4 text-center font-bold tracking-tight">
                    {p.quantity} items
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                    ₹{p.totalAmount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">
                    {p.purchaseDate}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleInvoiceSelect(p)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg shrink-0"
                        title="Quick View Invoice Drawer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePrint(p)}
                        className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0"
                        title="Print Original GST Bill"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Large Drawer Modal for Receipt Inspection */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/45 dark:bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border-l sm:border sm:rounded-3xl border-slate-200 dark:border-slate-800 h-full sm:h-[95vh] max-w-xl w-full flex flex-col justify-between shadow-2xl relative animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                <h3 className="text-md font-bold text-slate-900 dark:text-white">
                  Invoice Details: <span className="font-mono text-emerald-600">#{selectedInvoice.id}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Bill Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              <div className="text-center pb-4 border-b border-dashed border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-bold tracking-wider uppercase text-slate-800 dark:text-white">
                  AR Supermarket India Ltd.
                </h4>
                <p className="text-slate-400 mt-1">Connaught Place Central Hub, New Delhi</p>
                <p className="text-slate-500 font-mono text-[10px] mt-0.5">GSTIN: 07AAAXXXXXXXXXXZZ</p>
              </div>

              {/* Customers & Date */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Customer info</p>
                  <p className="font-semibold text-slate-800 dark:text-white truncate">{selectedInvoice.customerName}</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">{selectedInvoice.customerEmail}</p>
                  <p className="text-[10px] text-slate-500 font-mono">+91 {selectedInvoice.customerMobile}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Receipt date</p>
                  <p className="font-semibold text-slate-800 dark:text-white">{selectedInvoice.purchaseDate}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Time: 10:00 AM</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[8px] uppercase tracking-wider border border-emerald-300 dark:border-emerald-800">
                    Paid Success
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[9px]">Purchased Items</h5>
                <div className="divide-y divide-slate-100 dark:divide-slate-850">
                  {selectedInvoice.products.map((item, index) => (
                    <div key={index} className="py-2.5 flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ₹{item.price.toLocaleString("en-IN")} × {item.quantity} units
                        </p>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing break-downs */}
              <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-4 space-y-2 text-right">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{(selectedInvoice.totalAmount / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST (18% integrated):</span>
                  <span className="font-mono">₹{(selectedInvoice.totalAmount - (selectedInvoice.totalAmount / 1.18)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-850">
                  <span>India Grand total:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{selectedInvoice.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Print control */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3">
              <button
                onClick={() => downloadHTMLInvoice(selectedInvoice)}
                className="flex-1 py-3 border border-emerald-250 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Download className="h-4 w-4" />
                Download Bill (HTML)
              </button>
              <button
                onClick={() => handlePrint(selectedInvoice)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
              >
                <Printer className="h-4 w-4" />
                Print original receipt (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
