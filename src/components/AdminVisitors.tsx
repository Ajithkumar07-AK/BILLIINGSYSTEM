import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Eye, Search, Calendar, Clock, Contact } from "lucide-react";
import { Visitor } from "../types";

export default function AdminVisitors() {
  const { fetchWithAuth, addToast } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/visitors");
      const data = await res.json();
      setVisitors(data);
    } catch (e) {
      addToast("Failed to load store visitors ledger", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredVisitors = visitors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.mobile.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        <p className="mt-4 text-xs text-slate-500">Retrieving visitor logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Eye className="h-5 w-5 text-emerald-600" />
          Today's Visitor Ledger Logs
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Monitor customer logins, web traffic entries, and immediate storefront visits.
        </p>
      </div>

      {/* Control Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search visitors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-white"
          />
        </div>
        <span className="text-xs font-semibold text-slate-400">
          Showing {filteredVisitors.length} logins
        </span>
      </div>

      {/* Grid */}
      {filteredVisitors.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <p className="text-sm font-medium text-slate-400">No visitors logged matching query constraints.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVisitors.map((v) => (
            <div
              key={v.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex gap-4 hover:shadow"
            >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-100 text-orange-850 dark:bg-orange-950 dark:text-orange-300 flex items-center justify-center font-bold font-mono">
                VS
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-850 dark:text-white truncate">{v.name}</h4>
                <p className="text-xs text-slate-400 truncate">{v.email}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-1">+91 {v.mobile}</p>
                
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-medium font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {v.visitDate}
                  </span>
                  <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                    <Clock className="h-3 w-3" /> {v.loginTime}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
