import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
const ThemeContext = createContext(undefined);
export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined')
            return 'dark';
        const stored = window.localStorage.getItem('p42-theme');
        return stored ?? 'dark';
    });
    useEffect(() => {
        if (typeof document === 'undefined')
            return;
        const element = document.documentElement;
        if (theme === 'dark')
            element.classList.add('dark');
        else
            element.classList.remove('dark');
        window.localStorage.setItem('p42-theme', theme);
    }, [theme]);
    const value = useMemo(() => ({
        theme,
        toggle: () => setTheme(current => (current === 'dark' ? 'light' : 'dark'))
    }), [theme]);
    return _jsx(ThemeContext.Provider, { value: value, children: children });
};
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context)
        throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
