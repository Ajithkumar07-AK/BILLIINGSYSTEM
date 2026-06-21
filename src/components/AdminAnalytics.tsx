import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { BarChart3, TrendingUp, Calendar, ShoppingBag, Users, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

export default function AdminAnalytics() {
  const { fetchWithAuth, addToast } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [revenueSpan, setRevenueSpan] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/dashboard/analytics");
      const result = await res.json();
      setData(result);
    } catch (e) {
      addToast("Failed to fetch analytics graph datasets", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <p className="mt-4 text-xs text-slate-500 font-medium">Analyzing transaction graphs...</p>
      </div>
    );
  }

  if (!data) return null;

  const { revenueData, productSales, customerStats, revenueVsSold } = data;

  // Selected revenue dataset based on toggle span
  const currentRevenueDataset = revenueData[revenueSpan];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Graph Intelligence Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Check real-time graphical feedback regarding sales growth vectors.
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 border border-slate-205 dark:border-slate-705 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Charts
        </button>
      </div>

      {/* Grid containing Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CHART 1: Revenue Area Graph */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-850 dark:text-white">Store Revenue Statistics</h3>
            </div>
            {/* Span Toggles */}
            <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-xl">
              {(["daily", "weekly", "monthly"] as const).map((span) => (
                <button
                  key={span}
                  onClick={() => setRevenueSpan(span)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                    revenueSpan === span
                      ? "bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-amber-100"
                  }`}
                >
                  {span}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentRevenueDataset} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey={revenueSpan === "daily" ? "date" : revenueSpan === "weekly" ? "name" : "month"} stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  formatter={(val: any) => [`₹${val.toLocaleString("en-IN")}`, "Gross revenue"]}
                  contentStyle={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Product Sales (Most and Least Sold) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-850 dark:text-white">Most Sold AR Supermarket items (Units)</h3>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productSales.mostSold} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} fontStyle="bold" width={80} />
                <Tooltip
                  formatter={(val: any) => [`${val} Units`, "Delivered quantity"]}
                  contentStyle={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="sold" fill="#f59e0b" radius={[0, 8, 8, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Customer Graph */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-850 dark:text-white">Active Buying Customer Volume Graph</h3>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={customerStats.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(val: any) => [val, "Active customers"]}
                  contentStyle={{ background: "#ffffff", borderRadius: "12px" }}
                />
                <Line type="monotone" dataKey="customers" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Revenue vs Products Sold */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-850 dark:text-white">Daily Correlation: Revenue vs Products Sold</h3>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueVsSold} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", borderRadius: "12px" }}
                />
                <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" fill="#38bdf8" stroke="#0284c7" fillOpacity={0.2} name="Revenue Yield (₹)" />
                <Area type="monotone" dataKey="productsSold" fill="#fda4af" stroke="#f43f5e" fillOpacity={0.1} name="Units Sold" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
