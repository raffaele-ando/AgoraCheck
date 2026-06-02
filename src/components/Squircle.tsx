import React, { useEffect, useRef, useState, HTMLAttributes, FocusEvent } from 'react';
import { getSvgPath } from 'figma-squircle';

interface SquircleProps extends HTMLAttributes<HTMLDivElement> {
  cornerRadius?: number | 'full';
  cornerSmoothing?: number;
  as?: any;
  [key: string]: any;
}

export const Squircle = React.forwardRef<any, SquircleProps>(({ 
  className = '', 
  children, 
  cornerRadius = 24, 
  cornerSmoothing = 1,
  as: Component = 'div',
  style,
  onFocus,
  onBlur,
  ...props 
}, forwardedRef) => {
  const innerRef = useRef<HTMLElement>(null);
  const [svgParams, setSvgParams] = useState({ path: '', mask: '', w: 0, h: 0 });
  const [isFocused, setIsFocused] = useState(false);

  // Merge refs
  const ref = (node: any) => {
    innerRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as any).current = node;
    }
  };

  useEffect(() => {
    if (!innerRef.current) return;
    const updatePath = () => {
      const el = innerRef.current;
      if (!el) return;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (width === 0 || height === 0) return;
      
      const radius = cornerRadius === 'full' ? Math.min(width, height) / 2 : Number(cornerRadius);
      const computedPath = getSvgPath({ width, height, cornerRadius: radius, cornerSmoothing });
      
      const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${computedPath}" fill="black" /></svg>`;
      const encodedSvg = `url("data:image/svg+xml;utf8,${encodeURIComponent(svgData)}")`;
      
      setSvgParams({ path: computedPath, mask: encodedSvg, w: width, h: height });
    };

    const observer = new ResizeObserver(updatePath);
    observer.observe(innerRef.current);
    updatePath();
    
    return () => observer.disconnect();
  }, [cornerRadius, cornerSmoothing]);

  const hasFocusRing = className.includes('focus-within:squircle-ring');
  let focusColor = 'transparent';
  if (hasFocusRing) {
    const focusColorMatch = className.match(/focus-within:squircle-ring-\[([^\]]+)\]/);
    if (focusColorMatch) {
      focusColor = focusColorMatch[1];
    } else if (className.includes('focus-within:squircle-ring-[#DC5F00]')) {
      focusColor = '#DC5F00';
    }
  }

  const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!innerRef.current?.contains(e.relatedTarget as Node)) {
       setIsFocused(false);
    }
    if (onBlur) onBlur(e);
  };

  const isReady = svgParams.w > 0;

  return (
    <Component 
      ref={ref} 
      className={`relative ${className}`} 
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{ 
        ...style,
        visibility: isReady ? undefined : 'hidden',
        WebkitMaskImage: isReady ? svgParams.mask : undefined,
        maskImage: isReady ? svgParams.mask : undefined,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        transform: 'translateZ(0)',
        isolation: 'isolate'
      }} 
      {...props}
    >
      {hasFocusRing && isFocused && isReady && (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width={svgParams.w} 
          height={svgParams.h} 
          className="absolute inset-0 pointer-events-none z-50"
          style={{ width: '100%', height: '100%' }}
        >
          <path d={svgParams.path} fill="none" stroke={focusColor} strokeWidth="4" />
        </svg>
      )}
      {children}
    </Component>
  );
});

Squircle.displayName = 'Squircle';
