import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useCallback } from 'react';
import { feature } from 'topojson-client';
import { MapContainer, TileLayer, GeoJSON, Circle, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import countriesTopology from 'world-atlas/countries-110m.json';
const countriesTopologyTyped = countriesTopology;
const worldFeatures = feature(countriesTopologyTyped, countriesTopologyTyped.objects.countries);
const heatColor = (percentage) => {
    const clamped = Math.min(100, Math.max(0, percentage));
    const hue = 210 - clamped * 1.8; // from blue-ish to red
    const saturation = 70;
    const lightness = 30 + clamped * 0.25;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
const ZoomWatcher = ({ onChange }) => {
    useMapEvents({
        zoomend: event => onChange(event.target.getZoom())
    });
    return null;
};
const resolveFeatureKey = (feature) => {
    if (!feature) {
        return {
            iso3: undefined,
            iso2: undefined,
            name: undefined
        };
    }
    const properties = (feature.properties ?? {});
    const iso3 = (properties.iso_a3 ?? properties.ISO_A3 ?? properties.ADM0_A3);
    const iso2 = (properties.iso_a2 ?? properties.ISO_A2 ?? properties.ADM0_A2);
    const name = (properties.name ?? properties.NAME ?? properties.ADMIN);
    return {
        iso3: iso3 ? iso3.toUpperCase() : undefined,
        iso2: iso2 ? iso2.toUpperCase() : undefined,
        name: name ? name.toLowerCase() : undefined
    };
};
export const GeoAnalyticsMap = ({ countries, cities, totalEvents }) => {
    const [zoom, setZoom] = useState(2.5);
    const countryMetrics = useMemo(() => {
        const map = new Map();
        countries.forEach(country => {
            if (country.code)
                map.set(country.code.toUpperCase(), country);
            map.set(country.label.toLowerCase(), country);
        });
        return map;
    }, [countries]);
    const getCountryForFeature = useCallback((feature) => {
        const { iso3, iso2, name } = resolveFeatureKey(feature);
        if (iso3) {
            const match = countryMetrics.get(iso3);
            if (match)
                return match;
        }
        if (iso2) {
            const match = countryMetrics.get(iso2);
            if (match)
                return match;
        }
        if (name) {
            const match = countryMetrics.get(name);
            if (match)
                return match;
        }
        return undefined;
    }, [countryMetrics]);
    const style = useCallback(feature => {
        const country = getCountryForFeature(feature);
        const percentage = country?.percentage ?? 0;
        return {
            weight: 0.5,
            color: '#0f172a',
            fillOpacity: country ? 0.75 : 0.25,
            fillColor: country ? heatColor(percentage) : '#1e293b'
        };
    }, [getCountryForFeature]);
    const onEachCountry = useCallback((feature, layer) => {
        const country = getCountryForFeature(feature);
        if (country) {
            layer.bindTooltip(`${country.label} – ${country.total.toLocaleString('fr-FR')} (${country.percentage.toFixed(1)}%)`, { sticky: true });
        }
    }, [getCountryForFeature]);
    const maxCityTotal = useMemo(() => Math.max(...cities.map(city => city.total), 1), [cities]);
    const radiusForCity = (cityTotal, cityPercentage) => {
        const share = Math.max(cityPercentage / 100, cityTotal / maxCityTotal);
        const scaledShare = Math.sqrt(Math.max(0.05, share));
        const baseRadius = 15000 * scaledShare;
        const zoomFactor = Math.pow(1.5, zoom - 2);
        const radius = baseRadius / zoomFactor;
        return Math.max(400, Math.min(15000, radius));
    };
    const legendGradient = useMemo(() => {
        const stops = [0, 25, 50, 75, 100];
        return stops.map(stop => `${heatColor(stop)} ${stop}%`).join(', ');
    }, []);
    return (_jsxs("div", { className: "overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40", children: [_jsxs(MapContainer, { center: [20, 0], zoom: 2, minZoom: 2, maxZoom: 10, scrollWheelZoom: true, className: "h-[420px] w-full", children: [_jsx(ZoomWatcher, { onChange: setZoom }), _jsx(TileLayer, { attribution: '\u00A9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" }), _jsx(GeoJSON, { data: worldFeatures, style: style, onEachFeature: onEachCountry }), cities
                        .filter(city => typeof city.latitude === 'number' && typeof city.longitude === 'number')
                        .map(city => (_jsx(Circle, { center: [city.latitude, city.longitude], radius: radiusForCity(city.total, city.percentage), pathOptions: {
                            color: heatColor(city.percentage),
                            fillColor: heatColor(city.percentage),
                            fillOpacity: Math.min(0.85, 0.45 + city.percentage / 180),
                            weight: 0
                        }, children: _jsxs(Tooltip, { direction: "top", offset: [0, -2], opacity: 0.95, className: "text-xs", children: [_jsx("div", { className: "font-medium text-slate-100", children: city.label }), _jsxs("div", { className: "text-slate-200", children: [city.total.toLocaleString('fr-FR'), " hits (", city.percentage.toFixed(1), "%)"] }), city.country && _jsx("div", { className: "text-slate-400", children: city.country })] }) }, `${city.label}-${city.latitude}-${city.longitude}`)))] }), _jsx("div", { className: "border-t border-slate-800/70 px-6 py-3", children: _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("div", { className: "text-xs text-muted", children: "Intensit\u00E9 relative (% de hits)" }), _jsx("div", { className: "h-2 rounded-full", style: { background: `linear-gradient(90deg, ${legendGradient})` } }), _jsxs("div", { className: "flex justify-between text-[10px] uppercase tracking-wider text-slate-500", children: [_jsx("span", { children: "0%" }), _jsx("span", { children: "25%" }), _jsx("span", { children: "50%" }), _jsx("span", { children: "75%" }), _jsx("span", { children: "100%" })] })] }) }), _jsxs("div", { className: "border-t border-slate-800/70 px-6 py-3 text-xs text-muted", children: ["Total \u00E9v\u00E8nements consid\u00E9r\u00E9s : ", totalEvents.toLocaleString('fr-FR')] })] }));
};
