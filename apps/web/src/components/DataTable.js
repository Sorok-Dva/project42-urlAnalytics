import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const DataTable = ({ data, columns, emptyMessage }) => {
    if (data.length === 0) {
        return _jsx("div", { className: "rounded-xl border border-slate-800/70 bg-slate-900/40 p-8 text-center text-sm text-muted", children: emptyMessage ?? 'No data' });
    }
    return (_jsx("div", { className: "overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/40", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-800/50 text-sm", children: [_jsx("thead", { className: "bg-slate-900/60", children: _jsx("tr", { children: columns.map(column => (_jsx("th", { className: "px-4 py-3 text-left font-semibold text-slate-300", children: column.label }, String(column.key)))) }) }), _jsx("tbody", { className: "divide-y divide-slate-800/50", children: data.map((row, index) => (_jsx("tr", { className: "hover:bg-slate-800/40", children: columns.map(column => (_jsx("td", { className: "px-4 py-3 text-slate-200", children: column.render ? column.render(row) : row[column.key] }, String(column.key)))) }, index))) })] }) }));
};
