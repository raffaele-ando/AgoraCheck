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

  const hasEdge = className.includes('ag-edge');
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
        borderRadius: !isReady && typeof cornerRadius === 'number' ? `${cornerRadius}px` : (cornerRadius === 'full' ? '9999px' : undefined),
        WebkitMaskImage: isReady ? svgParams.mask : undefined,
        maskImage: isReady ? svgParams.mask : undefined,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        // "100% 100%" e non "contain": è la causa del riquadro tagliato di
        // lato durante i cambi di dimensione.
        //
        // La maschera viene rigenerata da un ResizeObserver, cioè SEMPRE dopo
        // che l'elemento ha già cambiato misura. Per quel fotogramma la
        // maschera è di dimensioni vecchie e con "contain" viene rimpicciolita
        // per starci dentro e centrata: su un elemento diventato più basso, una
        // maschera 300x50 su una scatola 300x40 si riduce a 240x40 e lascia
        // 30px scoperti per lato — che è esattamente il contenuto tagliato e
        // spostato che si vede aprendo la tastiera.
        //
        // Stirandola invece al 100% per entrambi i lati, nel fotogramma di
        // ritardo la forma è appena deformata negli angoli e nulla sparisce.
        WebkitMaskSize: "100% 100%",
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "100% 100%",
        transform: 'translateZ(0)',
        isolation: 'isolate'
      }} 
      {...props}
    >
      {/*
        Filo di contorno permanente, richiesto dalla classe "ag-edge".

        Nel tema scuro i livelli hanno luminanze troppo vicine perché la sola
        differenza di colore li separi: alle basse luminanze la formula del
        contrasto è dominata dalla costante additiva, quindi due grigi scuri
        diversi restano quasi indistinguibili. Il rimedio è il bordo, come in
        tutte le interfacce scure fatte bene.

        Va disegnato come tracciato e non come CSS: l'elemento è ritagliato da
        una maschera, che taglierebbe un `border` agli angoli. Il colore
        arriva da --ag-edge-color, trasparente nel tema chiaro.
      */}
      {hasEdge && isReady && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={svgParams.w}
          height={svgParams.h}
          className="absolute inset-0 pointer-events-none z-0"
          style={{ width: '100%', height: '100%' }}
          aria-hidden="true"
        >
          <path d={svgParams.path} fill="none" stroke="var(--ag-edge-color)" strokeWidth="2" />
        </svg>
      )}
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
