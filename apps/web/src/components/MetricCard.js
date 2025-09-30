import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const MetricCard = ({ label, value, trend, action }) => {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5 shadow", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-muted", children: label }), action] }), _jsx("div", { className: "mt-2 text-3xl font-semibold text-slate-100", children: value }), trend && _jsx("div", { className: "mt-1 text-xs text-accent", children: trend })] }));
};
