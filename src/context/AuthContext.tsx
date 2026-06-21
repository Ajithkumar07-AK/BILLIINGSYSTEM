import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthResponse, UserRole } from "../types";
import { ToastMessage, ToastType } from "../components/Notification";

interface AuthContextType {
  user: User | null;
  token: string | null;
  theme: "light" | "dark";
  toasts: ToastMessage[];
  isLoading: boolean;
  customerDetails: { name: string; email: string; mobile: string } | null;
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  addToast: (text: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  saveCustomerDetails: (details: { name: string; email: string; mobile: string }) => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<any>;
  pendingOtp: { email: string; action: "login" | "register"; otpSimulated: string } | null;
  verifyOtp: (otp: string) => Promise<boolean>;
  cancelOtp: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [customerDetails, setCustomerDetails] = useState<{ name: string; email: string; mobile: string } | null>(null);
  const [pendingOtp, setPendingOtp] = useState<{ email: string; action: "login" | "register"; otpSimulated: string } | null>(null);

  useEffect(() => {
    // Restore session
    const savedToken = localStorage.getItem("sb_token");
    const savedUser = localStorage.getItem("sb_user");
    const savedCust = localStorage.getItem("sb_customer");
    const savedTheme = localStorage.getItem("sb_theme") as "light" | "dark";

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    if (savedCust) {
      setCustomerDetails(JSON.parse(savedCust));
    }
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isSystemDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isSystemDark);
    }
    setIsLoading(false);
  }, []);

  const addToast = (text: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("sb_theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    addToast(`Switched to ${nextTheme} mode`, "success");
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Login failed", "error");
        return false;
      }

      if (data.otpRequired) {
        setPendingOtp({
          email: data.email,
          action: "login",
          otpSimulated: data.otpSimulated
        });
        addToast("Security verification code generated!", "info");
        return true;
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("sb_token", data.token);
      localStorage.setItem("sb_user", JSON.stringify(data.user));

      // If customer logged in, initialize prefilled checkout customer profile
      if (data.user.role === "customer") {
        const details = { name: data.user.name, email: data.user.email, mobile: data.user.mobile };
        setCustomerDetails(details);
        localStorage.setItem("sb_customer", JSON.stringify(details));
      }

      addToast(`Welcome back, ${data.user.name}!`, "success");
      return true;
    } catch (e: any) {
      console.error("Login unexpected error:", e);
      addToast(`Login error: ${e?.message || "Unknown error"}`, "error");
      return false;
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Registration failed", "error");
        return false;
      }

      if (data.otpRequired) {
        setPendingOtp({
          email: data.email,
          action: "register",
          otpSimulated: data.otpSimulated
        });
        addToast("Security verification code generated!", "info");
        return true;
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("sb_token", data.token);
      localStorage.setItem("sb_user", JSON.stringify(data.user));

      const details = { name: data.user.name, email: data.user.email, mobile: data.user.mobile };
      setCustomerDetails(details);
      localStorage.setItem("sb_customer", JSON.stringify(details));

      addToast("Account created successfully!", "success");
      return true;
    } catch (e: any) {
      console.error("Registration unexpected error:", e);
      addToast(`Registration error: ${e?.message || "Unknown error"}`, "error");
      return false;
    }
  };

  const verifyOtp = async (otpCode: string): Promise<boolean> => {
    if (!pendingOtp) return false;
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingOtp.email,
          otp: otpCode,
          action: pendingOtp.action
        })
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || "Incorrect validation key code", "error");
        return false;
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("sb_token", data.token);
      localStorage.setItem("sb_user", JSON.stringify(data.user));

      if (data.user?.role === "customer") {
        const details = { name: data.user.name, email: data.user.email, mobile: data.user.mobile };
        setCustomerDetails(details);
        localStorage.setItem("sb_customer", JSON.stringify(details));
      }

      setPendingOtp(null);
      addToast(data.message || "Identity verified!", "success");
      return true;
    } catch (e: any) {
      console.error("OTP verification unexpected error:", e);
      addToast(`Verification error: ${e?.message || "Unknown error"}`, "error");
      return false;
    }
  };

  const cancelOtp = () => {
    setPendingOtp(null);
    addToast("OTP authentication cancelled", "info");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCustomerDetails(null);
    setPendingOtp(null);
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_user");
    localStorage.removeItem("sb_customer");
    addToast("Logged out successfully", "info");
  };

  const saveCustomerDetails = (details: { name: string; email: string; mobile: string }) => {
    setCustomerDetails(details);
    localStorage.setItem("sb_customer", JSON.stringify(details));
    addToast("Customer details locked for billing", "success");
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Content-Type", "application/json");

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
      logout();
      addToast("Session expired, please login again", "warning");
      throw new Error("Unauthorized access");
    }
    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        theme,
        toasts,
        isLoading,
        customerDetails,
        toggleTheme,
        login,
        register,
        logout,
        addToast,
        removeToast,
        saveCustomerDetails,
        fetchWithAuth,
        pendingOtp,
        verifyOtp,
        cancelOtp
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
