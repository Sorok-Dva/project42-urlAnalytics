import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
const isSelected = (active, groupId, value) => {
    const current = active[groupId];
    if (!Array.isArray(current))
        return false;
    return current.includes(value);
};
const hasSelection = (active, groupId) => {
    const current = active[groupId];
    return Array.isArray(current) && current.length > 0;
};
export const AnalyticsFiltersPanel = ({ groups, active, onToggle, onClearGroup, onClearAll }) => {
    const [query, setQuery] = useState('');
    const anyActive = Object.values(active).some(values => Array.isArray(values) && values.length > 0);
    const normalizedQuery = query.trim().toLowerCase();
    const filteredGroups = useMemo(() => {
        if (!normalizedQuery)
            return groups;
        return groups
            .map(group => {
            const matchingOptions = group.options.filter(option => {
                const label = option.label.toLowerCase();
                const value = option.value.toLowerCase();
                return label.includes(normalizedQuery) || value.includes(normalizedQuery);
            });
            return {
                ...group,
                options: matchingOptions
            };
        })
            .filter(group => group.options.length > 0 || hasSelection(active, group.id));
    }, [groups, normalizedQuery, active]);
    return (_jsxs("div", { className: "rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5", children: [_jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx("h3", { className: "text-sm font-semibold text-slate-200", children: "Filtres avanc\u00E9s" }), _jsx("div", { className: "relative", children: _jsx("input", { type: "search", value: query, onChange: event => setQuery(event.target.value), placeholder: "Rechercher un filtre", className: "rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-accent focus:outline-none" }) }), anyActive && (_jsx("button", { type: "button", onClick: onClearAll, className: "rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-accent hover:text-accent", children: "R\u00E9initialiser" }))] }), _jsxs("div", { className: "flex flex-col gap-4", children: [filteredGroups.length === 0 && (_jsx("p", { className: "text-xs text-muted", children: "Aucun filtre ne correspond \u00E0 votre recherche." })), filteredGroups.map(group => (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400", children: [_jsx("span", { children: group.label }), hasSelection(active, group.id) && (_jsx("button", { type: "button", onClick: () => onClearGroup(group.id), className: "text-[10px] text-accent hover:underline", children: "Effacer" }))] }), _jsx("div", { className: "flex flex-wrap gap-2", children: group.options.length === 0 ? (_jsx("span", { className: "text-[11px] text-slate-500", children: "Aucun r\u00E9sultat pour cette recherche." })) : (group.options.map(option => {
                                    const selected = isSelected(active, group.id, option.value);
                                    return (_jsxs("button", { type: "button", onClick: () => onToggle(group.id, option.value), className: `rounded-full px-3 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${selected
                                            ? 'bg-accent/20 text-accent ring-1 ring-accent/60'
                                            : 'border border-slate-700 text-slate-300 hover:border-accent/40 hover:text-accent'}`, children: [_jsx("span", { children: option.label }), _jsxs("span", { className: "ml-2 text-[10px] text-slate-400", children: [option.count.toLocaleString('fr-FR'), " (", option.percentage.toFixed(1), "%)"] })] }, option.value));
                                })) })] }, group.id)))] })] }));
};
