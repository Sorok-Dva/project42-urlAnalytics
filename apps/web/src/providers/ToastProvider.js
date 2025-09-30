import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useState } from 'react';
import { v4 as uuid } from 'uuid';
const ToastContext = createContext(undefined);
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const dismiss = useCallback((id) => {
        setToasts(current => current.filter(toast => toast.id !== id));
    }, []);
    const push = useCallback((toast) => {
        const id = uuid();
        setToasts(current => [...current, { id, ...toast }]);
        setTimeout(() => {
            setToasts(current => current.filter(message => message.id !== id));
        }, 5000);
    }, []);
    return (_jsxs(ToastContext.Provider, { value: { toasts, push, dismiss }, children: [children, _jsx("div", { className: "pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col space-y-2", children: toasts.map(toast => (_jsxs("div", { className: "pointer-events-auto w-64 rounded-xl border border-accent/40 bg-slate-900/80 px-4 py-3 shadow-xl", children: [_jsxs("div", { className: "flex items-center justify-between text-sm font-medium text-slate-100", children: [_jsx("span", { children: toast.title }), _jsx("button", { onClick: () => dismiss(toast.id), className: "text-xs text-muted", children: "\u2715" })] }), toast.description && _jsx("p", { className: "mt-1 text-xs text-muted", children: toast.description })] }, toast.id))) })] }));
};
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context)
        throw new Error('useToast must be used within ToastProvider');
    return context;
};
