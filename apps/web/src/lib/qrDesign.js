import QRCodeStyling from 'qr-code-styling';
export const DEFAULT_QR_DESIGN = {
    modules: 'dots-classic',
    pilotCenter: 'dot',
    pilotBorder: 'square',
    foreground: '#111827',
    background: 'transparent',
    logo: { type: 'p42', value: null }
};
const moduleMap = {
    'dots-classic': 'dots',
    'dots-rounded': 'rounded',
    'dots-diamond': 'classy',
    'dots-square': 'square'
};
const pilotBorderMap = {
    square: 'square',
    dot: 'dot',
    rounded: 'extra-rounded'
};
const pilotCenterMap = {
    dot: 'dot',
    rounded: 'extra-rounded',
    square: 'square'
};
const LOGO_ASSETS = {
    p42: 'data:image/svg+xml;utf8,' +
        encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#111827"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#F1F5F9" font-family="Inter, sans-serif" font-weight="600" font-size="18">p42</text></svg>'),
    app: 'data:image/svg+xml;utf8,' +
        encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#2563EB"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#F8FAFC" font-family="Inter, sans-serif" font-weight="600" font-size="18">APP</text></svg>')
};
const buildLogoValue = (design) => {
    if (design.logo.type === 'p42')
        return LOGO_ASSETS.p42;
    if (design.logo.type === 'app')
        return LOGO_ASSETS.app;
    if (design.logo.type === 'custom')
        return design.logo.value ?? null;
    return null;
};
export const buildQrOptions = (design, data, size = 320) => {
    const image = buildLogoValue(design);
    const options = {
        width: size,
        height: size,
        data,
        image: image ?? undefined,
        dotsOptions: {
            type: moduleMap[design.modules],
            color: design.foreground
        },
        cornersSquareOptions: {
            type: pilotBorderMap[design.pilotBorder],
            color: design.foreground
        },
        cornersDotOptions: {
            type: pilotCenterMap[design.pilotCenter],
            color: design.foreground
        },
        backgroundOptions: {
            color: design.background && design.background !== 'transparent' ? design.background : '#ffffff00'
        }
    };
    options.imageOptions = image
        ? {
            crossOrigin: 'anonymous',
            margin: 6,
            hideBackgroundDots: true
        }
        : {
            margin: 0,
            hideBackgroundDots: false
        };
    return options;
};
export const renderQrToElement = (element, design, data, size = 320) => {
    const instance = new QRCodeStyling(buildQrOptions(design, data, size));
    instance.append(element);
    return instance;
};
export const updateQrInstance = (instance, design, data, size = 320) => {
    if (!instance)
        return;
    instance.update(buildQrOptions(design, data, size));
};
export const downloadQr = async (design, data, format, name) => {
    const instance = new QRCodeStyling(buildQrOptions(design, data, 1024));
    await instance.download({ name, extension: format === 'jpg' ? 'jpeg' : format });
};
export const designEquals = (a, b) => {
    return JSON.stringify(a) === JSON.stringify(b);
};
export const sanitizeDesign = (design) => {
    return {
        ...DEFAULT_QR_DESIGN,
        ...design,
        logo: {
            ...DEFAULT_QR_DESIGN.logo,
            ...(design?.logo ?? {})
        }
    };
};
