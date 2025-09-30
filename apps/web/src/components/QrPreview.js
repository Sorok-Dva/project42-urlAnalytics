import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { renderQrToElement, updateQrInstance } from '../lib/qrDesign';
export const QrPreview = ({ data, design, size = 200, className }) => {
    const containerRef = useRef(null);
    const instanceRef = useRef(null);
    useEffect(() => {
        if (!containerRef.current)
            return;
        containerRef.current.innerHTML = '';
        instanceRef.current = renderQrToElement(containerRef.current, design, data, size);
    }, []);
    useEffect(() => {
        updateQrInstance(instanceRef.current, design, data, size);
    }, [data, design, size]);
    return _jsx("div", { ref: containerRef, className: className });
};
export default QrPreview;
