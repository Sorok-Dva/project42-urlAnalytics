import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, Area } from 'recharts';
import dayjs from '../lib/dayjs';
const numberFormatter = new Intl.NumberFormat('fr-FR');
export const LineChart = ({ data, total }) => {
    const overall = total ?? data.reduce((sum, point) => sum + point.total, 0);
    return (_jsx("div", { className: "h-64 w-full", children: _jsx(ResponsiveContainer, { children: _jsxs(RechartsLineChart, { data: data, margin: { top: 12, left: 0, right: 0, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "p42Gradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#7f5af0", stopOpacity: 0.8 }), _jsx("stop", { offset: "95%", stopColor: "#7f5af0", stopOpacity: 0 })] }) }), _jsx(XAxis, { dataKey: "timestamp", tickLine: false, axisLine: false, tickFormatter: value => dayjs(value).format('DD MMM'), tick: { fill: '#94a3b8', fontSize: 11 }, minTickGap: 24 }), _jsx(YAxis, { hide: true, tick: { fill: '#94a3b8' } }), _jsx(Tooltip, { cursor: { stroke: '#38bdf8', strokeWidth: 1 }, contentStyle: { background: '#0f172a', borderRadius: 12, border: '1px solid #334155' }, labelStyle: { color: '#e2e8f0' }, formatter: (value) => {
                            const percentage = overall === 0 ? 0 : (value / overall) * 100;
                            return [`${numberFormatter.format(value)} (${percentage.toFixed(1)}%)`, 'Hits'];
                        }, labelFormatter: label => dayjs(label).format('DD MMM YYYY HH:mm') }), _jsx(Area, { type: "monotone", dataKey: "total", stroke: "#7f5af0", fill: "url(#p42Gradient)" }), _jsx(Line, { type: "monotone", dataKey: "total", stroke: "#7f5af0", strokeWidth: 2, dot: false })] }) }) }));
};
