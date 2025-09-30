"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { fetchQrCode, updateQrCode } from "../api/qr";
import { useToast } from "../providers/ToastProvider";
import { QrPreview } from "../components/QrPreview";
import { DEFAULT_QR_DESIGN, downloadQr, designEquals, sanitizeDesign } from "../lib/qrDesign";
import { getApiErrorMessage } from "../lib/apiError";
const MODULE_OPTIONS = [
    { id: "dots-classic", label: "Classique" },
    { id: "dots-rounded", label: "Arrondis" },
    { id: "dots-diamond", label: "Diamant" },
    { id: "dots-square", label: "Carrés" },
];
const PILOT_BORDER_OPTIONS = [
    { id: "square", label: "Carré" },
    { id: "rounded", label: "Arrondi" },
    { id: "dot", label: "Point" },
];
const PILOT_CENTER_OPTIONS = [
    { id: "dot", label: "Point" },
    { id: "rounded", label: "Arrondi" },
    { id: "square", label: "Carré" },
];
const LOGO_OPTIONS = [
    { id: "p42", label: "Logo p42.fr" },
    { id: "app", label: "Logo de votre application" },
    { id: "custom", label: "Logo personnalisé" },
    { id: "none", label: "Sans logo" },
];
const COLOR_PRESETS = ["#111827", "#1d4ed8", "#0284c7", "#16a34a", "#f59e0b", "#f97316", "#ef4444", "#a855f7"];
const FORMAT_OPTIONS = [
    { id: "png", label: "PNG" },
    { id: "jpg", label: "JPG" },
    { id: "svg", label: "SVG", badge: "starter" },
];
const PILOT_BORDER_SHAPES = {
    square: "rounded-lg",
    rounded: "rounded-3xl",
    dot: "rounded-full",
};
const PILOT_CENTER_SHAPES = {
    square: "rounded-sm",
    rounded: "rounded-xl",
    dot: "rounded-full",
};
const DetectionPreview = ({ border, center, }) => (_jsx("div", { className: `flex h-12 w-12 items-center justify-center border border-accent/30 bg-slate-950/70 ${PILOT_BORDER_SHAPES[border]}`, children: _jsx("div", { className: `flex h-8 w-8 items-center justify-center border-2 border-accent/60 bg-slate-900 ${PILOT_BORDER_SHAPES[border]}`, children: _jsx("div", { className: `h-4 w-4 bg-accent ${PILOT_CENTER_SHAPES[center]}` }) }) }));
const Swatch = ({ color, active, onSelect }) => (_jsx("button", { type: "button", onClick: onSelect, className: `relative h-9 w-9 rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${active ? "border-accent shadow-[0_0_0_4px_rgba(56,189,248,0.25)]" : "border-slate-900 hover:border-accent/60"}`, style: { backgroundColor: color }, "aria-label": `Sélectionner la couleur ${color}`, children: active ? _jsx("span", { className: "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-slate-950 bg-accent" }) : null }));
const OptionTile = ({ label, active, onSelect, children, }) => (_jsxs("button", { type: "button", onClick: onSelect, className: `group flex w-full flex-col gap-2 rounded-2xl border px-3 py-3 text-[11px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${active
        ? "border-transparent bg-accent/10 text-accent shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
        : "border-slate-800 text-slate-300 hover:border-accent/40 hover:text-accent"}`, children: [_jsx("div", { className: `flex h-12 w-full items-center justify-center rounded-xl bg-slate-900/70 text-base transition ${active ? "text-accent" : "text-slate-200 group-hover:text-accent"}`, children: children }), _jsx("span", { className: "text-center leading-tight", children: label })] }));
const buildTargetUrl = (code) => {
    const base = import.meta.env.VITE_PUBLIC_BASE_URL ?? window.location.origin;
    return `${base.replace(/\/$/, "")}/qr/${code}`;
};
export const QrDesignPage = () => {
    const { qrId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { push } = useToast();
    const fileInputRef = useRef(null);
    const { data, isLoading } = useQuery({
        queryKey: ["qr", qrId],
        enabled: Boolean(qrId),
        queryFn: () => fetchQrCode(qrId),
    });
    const [name, setName] = useState("");
    const [design, setDesign] = useState(DEFAULT_QR_DESIGN);
    const [initialDesign, setInitialDesign] = useState(DEFAULT_QR_DESIGN);
    const [initialName, setInitialName] = useState("");
    const [format, setFormat] = useState("png");
    const [customLogo, setCustomLogo] = useState(null);
    useEffect(() => {
        if (!data)
            return;
        const sanitized = sanitizeDesign(data.design);
        setDesign(sanitized);
        setInitialDesign(sanitized);
        setInitialName(data.name);
        setName(data.name);
        setCustomLogo(sanitized.logo.type === "custom" ? (sanitized.logo.value ?? null) : null);
    }, [data]);
    const updateMutation = useMutation({
        mutationFn: (payload) => updateQrCode(qrId, payload),
        onSuccess: (response) => {
            const sanitized = sanitizeDesign(response.design);
            setInitialDesign(sanitized);
            setDesign(sanitized);
            setInitialName(response.name);
            setName(response.name);
            setCustomLogo(sanitized.logo.type === "custom" ? (sanitized.logo.value ?? null) : null);
            queryClient.invalidateQueries({ queryKey: ["qr"] });
            push({ title: "Design sauvegardé" });
        },
        onError: (error) => {
            push({ title: "Impossible de sauvegarder", description: getApiErrorMessage(error) });
        },
    });
    const hasChanges = useMemo(() => {
        return name !== initialName || !designEquals(design, initialDesign);
    }, [name, design, initialName, initialDesign]);
    const handleSelectModule = (id) => setDesign((prev) => ({ ...prev, modules: id }));
    const handleSelectBorder = (id) => setDesign((prev) => ({ ...prev, pilotBorder: id }));
    const handleSelectCenter = (id) => setDesign((prev) => ({ ...prev, pilotCenter: id }));
    const handleLogoChange = (id) => {
        if (id === "custom") {
            fileInputRef.current?.click();
            return;
        }
        setDesign((prev) => ({ ...prev, logo: { type: id, value: null } }));
    };
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const value = typeof e.target?.result === "string" ? e.target.result : null;
            if (value) {
                setCustomLogo(value);
                setDesign((prev) => ({ ...prev, logo: { type: "custom", value } }));
            }
        };
        reader.readAsDataURL(file);
    };
    const handleColorChange = (color) => {
        setDesign((prev) => ({ ...prev, foreground: color }));
    };
    const handleHexInput = (event) => {
        const value = event.target.value;
        if (!value.startsWith("#")) {
            setDesign((prev) => ({ ...prev, foreground: `#${value}` }));
        }
        else {
            setDesign((prev) => ({ ...prev, foreground: value }));
        }
    };
    const handleReset = () => {
        setDesign(initialDesign);
        setName(initialName);
        setCustomLogo(initialDesign.logo.type === "custom" ? (initialDesign.logo.value ?? null) : null);
    };
    const handleDownload = async () => {
        if (!data)
            return;
        const target = buildTargetUrl(data.code);
        await downloadQr(design, target, format, name || "qr-code");
    };
    if (isLoading || !data) {
        return _jsx("div", { className: "text-muted", children: "Chargement de l'\u00E9diteur de QR..." });
    }
    const targetUrl = buildTargetUrl(data.code);
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("section", { className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4", children: [_jsx("span", { className: `text-xs ${hasChanges ? "text-amber-400" : "text-slate-500"}`, children: hasChanges ? "Changement non sauvegardé" : "Aucun changement en cours" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleReset, className: "rounded-md border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:border-accent", disabled: !hasChanges, children: "Annuler" }), _jsx("button", { onClick: () => updateMutation.mutate({ name, design }), className: "rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white disabled:bg-slate-700", disabled: !hasChanges || updateMutation.isPending, children: updateMutation.isPending ? "Enregistrement…" : "Enregistrer" })] })] }), _jsx("button", { onClick: () => navigate("/qr-codes"), className: "text-xs text-accent hover:underline", children: "\u2190 Retour aux QR Codes" }), _jsxs("div", { className: "grid gap-8 lg:grid-cols-4", children: [_jsx("div", { className: "space-y-6 lg:col-span-1", children: _jsxs("section", { className: "space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6", children: [_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx("div", { className: "flex min-h-[260px] w-full items-center justify-center rounded-3xl border border-slate-200/60 bg-white p-6 shadow-lg", children: _jsx("div", { className: "flex items-center justify-center", children: _jsx(QrPreview, { data: targetUrl, design: design, size: 260 }) }) }), _jsxs("div", { children: [_jsx("h4", { className: "mb-2 text-xs uppercase tracking-wide text-muted", children: "Format" }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [FORMAT_OPTIONS.map((option) => (_jsxs("button", { type: "button", onClick: () => setFormat(option.id), className: `rounded-full px-3 py-1 text-xs font-medium ${format === option.id ? "bg-accent text-white" : "border border-slate-700 text-slate-200"}`, children: [option.label, option.badge && (_jsx("span", { className: "ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase text-slate-300", children: option.badge }))] }, option.id))), _jsx("button", { type: "button", onClick: handleDownload, className: "ml-auto rounded-md border border-accent px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/10", children: "T\u00E9l\u00E9charger" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-muted", children: "Nom du QR" }), _jsx("input", { value: name, onChange: (event) => setName(event.target.value), className: "mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-base text-slate-100" })] }), _jsxs("p", { className: "break-all text-xs text-slate-500", children: ["URL encod\u00E9e : ", targetUrl] })] }) }), _jsxs("div", { className: "grid gap-6 lg:col-span-3", children: [_jsxs("section", { className: "rounded-2xl border border-slate-800 bg-slate-900/40 p-6", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold text-slate-200", children: "Style du QR code" }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-xs uppercase tracking-wide text-muted", children: "Modules" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: MODULE_OPTIONS.map((option) => (_jsx(OptionTile, { label: option.label, active: design.modules === option.id, onSelect: () => handleSelectModule(option.id), children: _jsx("span", { className: "text-base", children: "\u2B1A" }) }, option.id))) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-xs uppercase tracking-wide text-muted", children: "Centre des rep\u00E8res" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: PILOT_CENTER_OPTIONS.map((option) => (_jsx(OptionTile, { label: option.label, active: design.pilotCenter === option.id, onSelect: () => handleSelectCenter(option.id), children: _jsx(DetectionPreview, { border: design.pilotBorder, center: option.id }) }, option.id))) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "text-xs uppercase tracking-wide text-muted", children: "Bordure des rep\u00E8res" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: PILOT_BORDER_OPTIONS.map((option) => (_jsx(OptionTile, { label: option.label, active: design.pilotBorder === option.id, onSelect: () => handleSelectBorder(option.id), children: _jsx(DetectionPreview, { border: option.id, center: design.pilotCenter }) }, option.id))) })] })] }), _jsxs("div", { className: "mt-6 space-y-2", children: [_jsx("h4", { className: "text-xs uppercase tracking-wide text-muted", children: "Couleurs" }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [COLOR_PRESETS.map((color) => (_jsx(Swatch, { color: color, active: design.foreground === color, onSelect: () => handleColorChange(color) }, color))), _jsxs("div", { className: "flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200", children: [_jsx("span", { children: "#" }), _jsx("input", { value: design.foreground.replace("#", ""), onChange: handleHexInput, className: "w-16 bg-transparent text-xs text-slate-100 outline-none" })] })] })] })] }), _jsxs("section", { className: "rounded-2xl border border-slate-800 bg-slate-900/40 p-6", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold text-slate-200", children: "Logo du QR code" }), _jsx("div", { className: "grid grid-cols-4 gap-2", children: LOGO_OPTIONS.map((option) => (_jsx(OptionTile, { label: option.label, active: design.logo.type === option.id, onSelect: () => handleLogoChange(option.id), children: _jsx("span", { className: "text-base", children: option.id === "none" ? "∅" : option.id === "custom" ? "＋" : "☼" }) }, option.id))) }), design.logo.type === "custom" && customLogo && (_jsxs("div", { className: "mt-4 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300", children: [_jsx("img", { src: customLogo || "/placeholder.svg", alt: "Logo personnalis\u00E9", className: "h-10 w-10 rounded" }), _jsx("span", { children: "Logo personnalis\u00E9 charg\u00E9" })] })), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", className: "hidden", onChange: handleFileChange })] })] })] })] }));
};
export default QrDesignPage;
