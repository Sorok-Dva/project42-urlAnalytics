import { jsx as _jsx } from "react/jsx-runtime";
const intervals = ['all', '1y', '3m', '1m', '1w', '1d'];
export const IntervalSelector = ({ value, onChange }) => {
    return (_jsx("div", { className: "flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-2 py-1 text-xs", children: intervals.map(option => (_jsx("button", { className: `rounded-full px-3 py-1 transition ${option === value ? 'bg-accent text-white' : 'text-slate-300 hover:bg-slate-800'}`, onClick: () => onChange(option), children: option.toUpperCase() }, option))) }));
};
