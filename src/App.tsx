import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Notification from "./components/Notification";
import Sidebar from "./components/Sidebar";

// Admin tabs
import AdminDashboard from "./components/AdminDashboard";
import AdminCustomers from "./components/AdminCustomers";
import AdminProducts from "./components/AdminProducts";
import AdminPurchases from "./components/AdminPurchases";
import AdminReports from "./components/AdminReports";
import AdminAnalytics from "./components/AdminAnalytics";
import AdminVisitors from "./components/AdminVisitors";

// Customer tabs
import CustomerPortal from "./components/CustomerPortal";

// Icons
import {
  Moon,
  Sun,
  Menu,
  ShoppingBag,
  History,
  LayoutDashboard,
  Users,
  Eye,
  EyeOff,
  FileText,
  BarChart3,
  Calendar,
  Lock,
  Mail,
  User,
  Phone,
  ShieldAlert,
  HelpCircle
} from "lucide-react";

function SystemGateway() {
  const {
    user,
    theme,
    toggleTheme,
    login,
    register,
    toasts,
    removeToast,
    addToast
  } = useAuth();

  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Authentication UI options
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [userLoginRole, setUserLoginRole] = useState<"customer" | "admin">("customer");

  // Form Fields
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [showAuthPassword, setShowAuthPassword] = useState<boolean>(false);

  // Sign up Form Fields
  const [fullName, setFullName] = useState<string>("");
  const [signUpEmail, setSignUpEmail] = useState<string>("");
  const [signUpMobile, setSignUpMobile] = useState<string>("");
  const [signUpPassword, setSignUpPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showSignUpPassword, setShowSignUpPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Database Connection Status Panel State
  const [showDemoCredentials, setShowDemoCredentials] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<{
    mongo: { status: "connected" | "disconnected"; uri: string; database: string; error: string | null };
    local: { type: string; filePath: string };
  } | null>(null);

  React.useEffect(() => {
    // Initial fetch and periodic polling for database health status
    const checkDbHealth = () => {
      fetch("/api/db/status")
        .then((res) => res.json())
        .then((data) => setDbStatus(data))
        .catch((err) => console.log("Database status polling skipped:", err));
    };
    checkDbHealth();
    const interval = setInterval(checkDbHealth, 8000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      addToast("Please provide both email and password parameters", "warning");
      return;
    }
    const success = await login(authEmail.trim(), authPassword);
    if (success) {
      // Set active default tab depending on role
      setActiveTab(userLoginRole === "admin" ? "dashboard" : "purchase_products");
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpPassword !== confirmPassword) {
      addToast("Password conformations do not match", "warning");
      return;
    }

    const success = await register({
      name: fullName,
      email: signUpEmail,
      mobile: signUpMobile,
      password: signUpPassword,
      confirmPassword
    });

    if (success) {
      setActiveTab("purchase_products");
    }
  };

  // Switch login role selection cleanly without pre-filling any dummy details
  const selectLoginRole = (role: "admin" | "customer") => {
    setUserLoginRole(role);
    setAuthEmail("");
    setAuthPassword("");
  };

  // If user is not authenticated, display Register/Login page
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition">
        {/* Floating toast alerts */}
        <Notification toasts={toasts} removeToast={removeToast} />

        {/* Header toolbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white px-2 py-1 rounded-lg font-bold text-md">₹</div>
            <span className="font-extrabold tracking-wide text-xs uppercase text-slate-800 dark:text-white">
              Supermarket Terminal
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            title="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          </button>
        </header>

        {/* Dynamic Card containers */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            
            {/* Toggle login vs signup */}
            <div className="text-center pb-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {isSignUp ? "Create Supermarket Profile" : "Supermarket Login"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isSignUp ? "Sign up as a customer to purchase items" : "Access your supermarket account ledger"}
              </p>
            </div>

            {/* If login, show tab switcher (Customer vs Admin) */}
            {!isSignUp && (
              <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => selectLoginRole("customer")}
                  className={`flex-1 py-2 text-xs font-bold leading-none rounded-lg transition ${
                    userLoginRole === "customer"
                      ? "bg-white text-slate-905 dark:bg-slate-800 dark:text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Customer Login
                </button>
                <button
                  type="button"
                  onClick={() => selectLoginRole("admin")}
                  className={`flex-1 py-2 text-xs font-bold leading-none rounded-lg transition ${
                    userLoginRole === "admin"
                      ? "bg-white text-slate-905 dark:bg-slate-800 dark:text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Admin Manager Login
                </button>
              </div>
            )}

            {/* Main forms selection */}
            {isSignUp ? (
              // SIGN UP FORM
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kanna"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-205 dark:border-slate-705 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Email address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. rameshkanna0901@gmail.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-205 dark:border-slate-705 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Mobile Number (+91 India 10-digits) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="tel"
                      required
                      pattern="\d{10}"
                      placeholder="e.g. 9123456789"
                      value={signUpMobile}
                      onChange={(e) => setSignUpMobile(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-205 dark:border-slate-705 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showSignUpPassword ? "text" : "password"}
                        required
                        minLength={6}
                        placeholder="••••••"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 border border-slate-205 dark:border-slate-705 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
                        title={showSignUpPassword ? "Hide password" : "Show password"}
                      >
                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Confirm *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 border border-slate-205 dark:border-slate-705 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition uppercase tracking-wider mt-2 cursor-pointer"
                >
                  Create Profile & Login
                </button>
              </form>
            ) : (
              // SIGN IN FORM
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. employee@supermarket.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-205 dark:border-slate-705 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Password details
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showAuthPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 border border-slate-205 dark:border-slate-705 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPassword(!showAuthPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
                      title={showAuthPassword ? "Hide password" : "Show password"}
                    >
                      {showAuthPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition uppercase tracking-wider outline-none mt-2 cursor-pointer"
                >
                  Verify Credentials & Enter →
                </button>
              </form>
            )}

            {/* Bottom swap trigger */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
              {isSignUp ? (
                <p className="text-slate-500">
                  Already have a supermarket account?{" "}
                  <button
                    onClick={() => setIsSignUp(false)}
                    className="font-bold text-emerald-600 dark:text-emerald-400 underline hover:opacity-80"
                  >
                    Login here
                  </button>
                </p>
              ) : (
                <p className="text-slate-500">
                  New to our supermarket?{" "}
                  <button
                    onClick={() => {
                      setIsSignUp(true);
                      setFullName("");
                      setSignUpEmail("");
                      setSignUpMobile("");
                      setSignUpPassword("");
                      setConfirmPassword("");
                    }}
                    className="font-bold text-emerald-600 dark:text-emerald-400 underline hover:opacity-80"
                  >
                    Create customer store account
                  </button>
                </p>
              )}
            </div>
          </div>
        </main>

        <footer className="py-6 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900/50 text-center space-y-2 text-[10px] text-slate-400 font-mono">
          <div>Supermarket Indian Billing Engine Terminal v3.4.0 (2026)</div>
          {dbStatus && (
            <div className="flex items-center justify-center gap-1.5 md:gap-4 flex-wrap max-w-2xl mx-auto px-4 pt-1">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dbStatus.mongo.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`}></span>
                MongoDB State: <span className={dbStatus.mongo.status === 'connected' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-500 font-bold'}>{dbStatus.mongo.status.toUpperCase()}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
              <span>URI: <span className="font-bold text-slate-600 dark:text-slate-300">{dbStatus.mongo.uri}</span></span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
              <span>Database: <span className="font-bold text-slate-600 dark:text-slate-300">{dbStatus.mongo.database}</span></span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
              <span>Tracking Collection: <span className="font-bold text-emerald-600 dark:text-emerald-400">anime</span></span>
            </div>
          )}
        </footer>
      </div>
    );
  }

  // LOGGED IN VIEW ENGINE
  const isAdmin = user.role === "admin";

  const renderActiveView = () => {
    if (isAdmin) {
      switch (activeTab) {
        case "dashboard":
          return <AdminDashboard />;
        case "customers":
          return <AdminCustomers />;
        case "products":
          return <AdminProducts />;
        case "purchases":
          return <AdminPurchases />;
        case "reports":
          return <AdminReports />;
        case "analytics":
          return <AdminAnalytics />;
        case "visitors":
          return <AdminVisitors />;
        default:
          return <AdminDashboard />;
      }
    } else {
      switch (activeTab) {
        case "profile":
          return <CustomerPortal defaultTab="profile" />;
        case "purchase_products":
          return <CustomerPortal defaultTab="purchase_products" />;
        case "purchase_history":
          return <CustomerPortal defaultTab="purchase_history" />;
        default:
          return <CustomerPortal defaultTab="purchase_products" />;
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition">
      {/* Toast notifications */}
      <Notification toasts={toasts} removeToast={removeToast} />

      {/* Main Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Primary Workspace container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800/80 shrink-0 z-20 shadow-xs">
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 lg:hidden border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <span className="hidden sm:inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-full font-bold text-[10px] uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/60 font-mono">
              Role: SYSTEM {user.role.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              title="Toggle light/dark screen themes"
            >
              {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>
            
            <div className="h-9 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800 dark:text-white">{user.name}</p>
              <p className="text-[9px] text-slate-400 font-mono uppercase">{user.email}</p>
            </div>
          </div>
        </header>

        {/* Scrollable Work area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SystemGateway />
    </AuthProvider>
  );
}
