import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { HomePage } from '../pages/HomePage';
import { StatisticsPage } from '../pages/StatisticsPage';
import { DeeplinksPage } from '../pages/DeeplinksPage';
import { LinkDetailsPage } from '../pages/LinkDetailsPage';
import { QrCodesPage } from '../pages/QrCodesPage';
import { QrDesignPage } from '../pages/QrDesignPage';
import { AuthPage } from '../pages/AuthPage';
import { useAuth } from '../stores/auth';
const RequireAuth = () => {
    const isAuthenticated = useAuth(state => !!state.token);
    if (!isAuthenticated)
        return _jsx(Navigate, { to: "/auth", replace: true });
    return _jsx(Outlet, {});
};
export const AppRoutes = () => {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/auth", element: _jsx(AuthPage, {}) }), _jsx(Route, { element: _jsx(RequireAuth, {}), children: _jsxs(Route, { element: _jsx(DashboardLayout, {}), children: [_jsx(Route, { index: true, element: _jsx(HomePage, {}) }), _jsx(Route, { path: "statistics", element: _jsx(StatisticsPage, {}) }), _jsx(Route, { path: "statistics/:linkId", element: _jsx(StatisticsPage, {}) }), _jsx(Route, { path: "deeplinks", element: _jsx(DeeplinksPage, {}) }), _jsx(Route, { path: "deeplinks/:linkId", element: _jsx(LinkDetailsPage, {}) }), _jsx(Route, { path: "qr-codes", element: _jsx(QrCodesPage, {}) }), _jsx(Route, { path: "qr-codes/:qrId/design", element: _jsx(QrDesignPage, {}) })] }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
};
