import { createContext, useContext, useMemo, useState } from "react";

const ToastContext = createContext({ showToast: () => {} });

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const value = useMemo(
    () => ({
      showToast: (message, type = "info") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2600);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <div className={`toast ${toast.type}`}>{toast.message}</div> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
