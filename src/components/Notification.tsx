import React, { useEffect } from "react";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
}

interface NotificationProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

interface ToastItemProps {
  key?: React.Key;
  toast: ToastMessage;
  removeToast: (id: string) => void;
}

function ToastItem({ toast, removeToast }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  let bgColor = "bg-white text-slate-800 border-slate-200 shadow-md";
  let icon = <Info className="h-5 w-5 text-indigo-500" />;

  switch (toast.type) {
    case "success":
      bgColor = "bg-emerald-50 text-emerald-950 border-emerald-200 shadow-sm";
      icon = <CheckCircle className="h-5 w-5 text-emerald-600" />;
      break;
    case "error":
      bgColor = "bg-rose-50 text-rose-950 border-rose-200 shadow-sm";
      icon = <XCircle className="h-5 w-5 text-rose-600" />;
      break;
    case "warning":
      bgColor = "bg-amber-50 text-amber-950 border-amber-200 shadow-sm";
      icon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
      break;
    case "info":
      bgColor = "bg-sky-50 text-sky-950 border-sky-200 shadow-sm";
      icon = <Info className="h-5 w-5 text-sky-600" />;
      break;
  }

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border duration-300 transform animate-slide-in ${bgColor}`}
    >
      {icon}
      <div className="flex-1 text-sm font-medium">{toast.text}</div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function Notification({ toasts, removeToast }: NotificationProps) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
}

