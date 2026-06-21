import React from "react";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  History,
  FileText,
  BarChart3,
  LogOut,
  UserCircle,
  TrendingUp,
  Package,
  Eye,
  Menu,
  X
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === "admin";

  // Menu lists
  const adminMenu = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "customers", label: "Customers", icon: Users },
    { id: "products", label: "Products Catalog", icon: Package },
    { id: "purchases", label: "Purchase History", icon: History },
    { id: "reports", label: "Reports Sheet", icon: FileText },
    { id: "analytics", label: "Graph Analytics", icon: BarChart3 }
  ];

  const userMenu = [
    { id: "profile", label: "Customer Profile", icon: UserCircle },
    { id: "purchase_products", label: "Purchase Products", icon: ShoppingBag },
    { id: "purchase_history", label: "Purchase History", icon: History }
  ];

  const currentMenu = isAdmin ? adminMenu : userMenu;

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false); // Close mobile menu if open
  };

  return (
    <>
      {/* Mobile Backdrop when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-350 lg:translate-x-0 lg:static lg:h-screen ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="bg-emerald-600 text-white p-1.5 rounded-lg font-bold text-lg shadow-sm">
                ₹
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-white uppercase">
                  SuperMarket
                </h1>
                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  Billing & Analytics
                </p>
              </div>
            </div>
            {/* Close Mobile Sidebar */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User profile capsule */}
          <div className="p-4 mx-4 my-4 bg-slate-50 dark:bg-slate-800/55 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Signed in as
            </p>
            <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate">
              {user.name}
            </p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              {user.role}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {currentMenu.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  id={`nav-${item.id}`}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium tracking-wide transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <IconComponent className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-400 dark:text-slate-500"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={logout}
            id="nav-logout"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Logout Session
          </button>
        </div>
      </aside>
    </>
  );
}
