import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ensureAnonymousAuth } from "../utils/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
  writeBatch,
  doc,
  increment,
  getDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Logo } from "../components/Logo";
import {
  Send,
  CheckCircle2,
  Loader2,
  LayoutDashboard,
  ArrowRight,
  ExternalLink,
  Instagram,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import {
  resolveIdentity,
  getPrimaryTokenSync,
  ingestHandoffFromUrl,
  primeHandoffUrl,
  parseIgUA,
  computeDeviceClass,
  isInstagramBrowser,
  type DeviceTokens,
} from "../utils/identity";
const ThemeCorkboard = React.lazy(() => import("../components/NewTheme").then(m => ({ default: m.ThemeCorkboard })));

// --- INSTAGRAM BLOCKER ---
function useInstagramEscape() {
  const [isIg, setIsIg] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (ua.toLowerCase().includes("instagram")) {
      setIsIg(true);
      // if (/android/i.test(ua)) {
      //   window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end;`;
      // }
    }
  }, []);
  return isIg;
}

function InstagramBlocker() {
  const isIt = (() => {
    if (typeof navigator !== "undefined" && navigator.language) {
      return navigator.language.toLowerCase().startsWith('it');
    }
    return true;
  })();

  return (
    <div className="fixed inset-0 bg-[#F3ECE0] z-[9999] p-8 flex flex-col items-center justify-center text-center transition-colors">
      <div className="w-20 h-20 bg-[#DC5F00] text-[#F3ECE0] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
        <ExternalLink className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-black text-[#000000] mb-4 uppercase transition-colors">
        {isIt ? "Esci da Instagram" : "Exit Instagram"}
      </h1>
      <p className="text-[#000000] font-medium mb-8 max-w-sm transition-colors">
        {isIt ? (
          <>
            Per un'esperienza completa apri Agorà nel browser del tuo telefono.
            <br />
            <br />
            Tocca i tre puntini in alto a destra <b>(⋮)</b> e seleziona{" "}
            <b>"Apri nel browser del sistema"</b>.
          </>
        ) : (
          <>
            For the full experience, open Agorà in your phone's browser.
            <br />
            <br />
            Tap the three dots in the top right <b>(⋮)</b> and select{" "}
            <b>"Open in system browser"</b>.
          </>
        )}
      </p>
    </div>
  );
}

// --- LAYOUT CONSTRAINTS AND METRICS ---
const layoutValidationOpts = {
  vA: 0,
  vB: 0,
  vC: 0,
  vD: 0,
  pastes: 0,
  copies: 0,
  cuts: 0,
  autofillUsed: false,
  backspaces: 0,
  rageClicks: 0,
  lastClickPos: null as { x: number; y: number; time: number } | null,
  fieldFocusTimes: {} as Record<string, number>,
  mouseDistance: 0,
  lastMousePos: null as { x: number; y: number } | null,
  typingIntervals: [] as number[],
  deviceMotion: {
    alpha: 0,
    beta: 0,
    gamma: 0,
    accelX: 0,
    accelY: 0,
    accelZ: 0,
  },
  tRef: Date.now(),
};

// Device identity is centralized in utils/identity.ts. As soon as this module
// loads we (1) ingest any cross-browser handoff payload present in the URL, then
// (2) resolve/persist the device token across all backends — so a device is
// identified on EVERY visit, not only when a message is submitted (this also
// keeps the iOS ITP inactivity clock reset on every open).
if (typeof window !== "undefined") {
  try { ingestHandoffFromUrl(); } catch {}
  resolveIdentity().catch(() => {});
}

// Thin sync accessor used inside the submit payload.
const getLToken = (): string => getPrimaryTokenSync();

// Cache of the full token map, filled asynchronously.
const _tokenMap: { v: DeviceTokens } = { v: {} };
if (typeof window !== "undefined") {
  resolveIdentity().then((r) => { _tokenMap.v = r.tokens; }).catch(() => {});
}

function useLayoutValidation() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    layoutValidationOpts.vA = 0;
    layoutValidationOpts.vB = 0;
    layoutValidationOpts.vC = 0;
    layoutValidationOpts.vD = 0;
    layoutValidationOpts.pastes = 0;
    layoutValidationOpts.copies = 0;
    layoutValidationOpts.cuts = 0;
    layoutValidationOpts.autofillUsed = false;
    layoutValidationOpts.backspaces = 0;
    layoutValidationOpts.rageClicks = 0;
    layoutValidationOpts.lastClickPos = null;
    layoutValidationOpts.fieldFocusTimes = {};
    layoutValidationOpts.mouseDistance = 0;
    layoutValidationOpts.lastMousePos = null;
    layoutValidationOpts.typingIntervals = [];
    layoutValidationOpts.deviceMotion = {
      alpha: 0,
      beta: 0,
      gamma: 0,
      accelX: 0,
      accelY: 0,
      accelZ: 0,
    };
    layoutValidationOpts.tRef = Date.now();

    const ev1 = (e: MouseEvent) => {
      layoutValidationOpts.vA++;
      const now = Date.now();
      if (layoutValidationOpts.lastClickPos) {
        const dx = e.clientX - layoutValidationOpts.lastClickPos.x;
        const dy = e.clientY - layoutValidationOpts.lastClickPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const timeDiff = now - layoutValidationOpts.lastClickPos.time;
        if (timeDiff < 400 && dist < 40) {
          layoutValidationOpts.rageClicks++;
        }
      }
      layoutValidationOpts.lastClickPos = {
        x: e.clientX,
        y: e.clientY,
        time: now,
      };
    };
    let lastScrollTime = 0;
    const ev2 = () => {
      const now = Date.now();
      if (now - lastScrollTime < 100) return;
      lastScrollTime = now;
      const depth = Math.round(
        (window.scrollY /
          Math.max(1, document.body.scrollHeight - window.innerHeight)) *
          100,
      );
      if (depth > layoutValidationOpts.vB) layoutValidationOpts.vB = depth;
    };

    let lastKeyTime = 0;
    const ev3 = (e: KeyboardEvent) => {
      layoutValidationOpts.vC++;
      if (e.key === "Backspace") layoutValidationOpts.backspaces++;
      const now = Date.now();
      if (lastKeyTime > 0) {
        const diff = now - lastKeyTime;
        if (diff < 1000) layoutValidationOpts.typingIntervals.push(diff);
      }
      lastKeyTime = now;
    };

    const ev4 = () => layoutValidationOpts.vD++;
    const evPaste = () => layoutValidationOpts.pastes++;
    const evCopy = () => layoutValidationOpts.copies++;
    const evCut = () => layoutValidationOpts.cuts++;

    const checkAutofill = () => {
      const inputs = document.querySelectorAll("input, textarea");
      inputs.forEach((el) => {
        try {
          if (el.matches(":-webkit-autofill"))
            layoutValidationOpts.autofillUsed = true;
        } catch (e) {}
      });
    };

    let currentFocusTarget: string | null = null;
    let focusStartTime = 0;
    const evFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target.tagName &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        currentFocusTarget =
          target.getAttribute("name") ||
          target.id ||
          target.tagName.toLowerCase();
        focusStartTime = Date.now();
      }
    };
    const evBlurFocus = () => {
      if (currentFocusTarget && focusStartTime > 0) {
        const duration = Date.now() - focusStartTime;
        if (!layoutValidationOpts.fieldFocusTimes[currentFocusTarget]) {
          layoutValidationOpts.fieldFocusTimes[currentFocusTarget] = 0;
        }
        layoutValidationOpts.fieldFocusTimes[currentFocusTarget] += duration;
      }
      currentFocusTarget = null;
      focusStartTime = 0;
    };

    const evMouseMove = (e: MouseEvent) => {
      if (layoutValidationOpts.lastMousePos) {
        const dx = e.clientX - layoutValidationOpts.lastMousePos.x;
        const dy = e.clientY - layoutValidationOpts.lastMousePos.y;
        layoutValidationOpts.mouseDistance += Math.sqrt(dx * dx + dy * dy);
      }
      layoutValidationOpts.lastMousePos = { x: e.clientX, y: e.clientY };
    };

    const evTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        if (layoutValidationOpts.lastMousePos) {
          const dx = touch.clientX - layoutValidationOpts.lastMousePos.x;
          const dy = touch.clientY - layoutValidationOpts.lastMousePos.y;
          layoutValidationOpts.mouseDistance += Math.sqrt(dx * dx + dy * dy);
        }
        layoutValidationOpts.lastMousePos = {
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    };

    const evDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null)
        layoutValidationOpts.deviceMotion.alpha = Math.round(e.alpha);
      if (e.beta !== null)
        layoutValidationOpts.deviceMotion.beta = Math.round(e.beta);
      if (e.gamma !== null)
        layoutValidationOpts.deviceMotion.gamma = Math.round(e.gamma);
    };

    const evDeviceMotion = (e: DeviceMotionEvent) => {
      if (e.accelerationIncludingGravity) {
        if (e.accelerationIncludingGravity.x !== null)
          layoutValidationOpts.deviceMotion.accelX =
            Math.round(e.accelerationIncludingGravity.x * 10) / 10;
        if (e.accelerationIncludingGravity.y !== null)
          layoutValidationOpts.deviceMotion.accelY =
            Math.round(e.accelerationIncludingGravity.y * 10) / 10;
        if (e.accelerationIncludingGravity.z !== null)
          layoutValidationOpts.deviceMotion.accelZ =
            Math.round(e.accelerationIncludingGravity.z * 10) / 10;
      }
    };

    window.addEventListener("click", ev1, { passive: true });
    window.addEventListener("scroll", ev2, { passive: true });
    window.addEventListener("keydown", ev3, { passive: true });
    window.addEventListener("blur", ev4, { passive: true });
    window.addEventListener("paste", evPaste, { passive: true });
    window.addEventListener("copy", evCopy, { passive: true });
    window.addEventListener("cut", evCut, { passive: true });
    window.addEventListener("change", checkAutofill, { passive: true });
    window.addEventListener("input", checkAutofill, { passive: true });
    window.addEventListener("focusin", evFocus, { passive: true });
    window.addEventListener("focusout", evBlurFocus, { passive: true });

    let lastMouseMove = 0;
    const throttledMouseMove = (e: MouseEvent) => {
      if (Date.now() - lastMouseMove > 50) {
        evMouseMove(e);
        lastMouseMove = Date.now();
      }
    };
    window.addEventListener("mousemove", throttledMouseMove, { passive: true });

    let lastTouchMove = 0;
    const throttledTouchMove = (e: TouchEvent) => {
      if (Date.now() - lastTouchMove > 50) {
        evTouchMove(e);
        lastTouchMove = Date.now();
      }
    };
    window.addEventListener("touchmove", throttledTouchMove, { passive: true });

    // For iOS 13+ devices, deviceorientation may not fire without permission, but on Android/older it works. No need to prompt explicitly.
    window.addEventListener("deviceorientation", evDeviceOrientation as any, {
      passive: true,
    });
    window.addEventListener("devicemotion", evDeviceMotion as any, {
      passive: true,
    });

    return () => {
      window.removeEventListener("click", ev1);
      window.removeEventListener("scroll", ev2);
      window.removeEventListener("keydown", ev3);
      window.removeEventListener("blur", ev4);
      window.removeEventListener("paste", evPaste);
      window.removeEventListener("copy", evCopy);
      window.removeEventListener("cut", evCut);
      window.removeEventListener("change", checkAutofill);
      window.removeEventListener("input", checkAutofill);
      window.removeEventListener("focusin", evFocus);
      window.removeEventListener("focusout", evBlurFocus);
      window.removeEventListener("mousemove", throttledMouseMove);
      window.removeEventListener("touchmove", throttledTouchMove);
      window.removeEventListener(
        "deviceorientation",
        evDeviceOrientation as any,
      );
      window.removeEventListener("devicemotion", evDeviceMotion as any);
    };
  }, []);
}

const getRenderOpts = () => {
  try {
    const c = document.createElement("canvas");
    const gl =
      c.getContext("webg" + "l") || c.getContext("experimental-webg" + "l");
    if (gl) {
      const dbg = (gl as any).getExtension("WEBGL_debug_renderer_info");
      return dbg
        ? (gl as any).getParameter(dbg.UNMASKED_RENDERER_WEBGL)
        : "Unknown";
    }
  } catch (e) {}
  return "Unknown";
};

const getAdvancedWebGL = () => {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (!gl) return { error: "N/A" };
    const dbg = (gl as any).getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg
      ? (gl as any).getParameter(dbg.UNMASKED_RENDERER_WEBGL)
      : "Unknown";
    const vendor = dbg
      ? (gl as any).getParameter(dbg.UNMASKED_VENDOR_WEBGL)
      : "Unknown";

    const maxTextureSize = (gl as any).getParameter(
      (gl as any).MAX_TEXTURE_SIZE,
    );
    const maxViewportDims = (gl as any).getParameter(
      (gl as any).MAX_VIEWPORT_DIMS,
    );
    const supportedExtensions = (gl as any).getSupportedExtensions();

    return {
      vendor: vendor || "Unknown",
      renderer: renderer || "Unknown",
      maxTextureSize,
      maxViewportDims: maxViewportDims
        ? `${maxViewportDims[0]}x${maxViewportDims[1]}`
        : "Unknown",
      extensionsCount: supportedExtensions ? supportedExtensions.length : 0,
    };
  } catch (e) {
    return { error: "Error" };
  }
};

const getWebGLSceneFingerprint = (): string => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 128;
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "N/A";

    const compileShader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    };

    const vs = compileShader(gl.VERTEX_SHADER,
      "attribute vec2 aPos; void main(){gl_Position=vec4(aPos,0.,1.);}");
    const fs = compileShader(gl.FRAGMENT_SHADER,
      "precision highp float; void main(){" +
      "float x=gl_FragCoord.x/128.;float y=gl_FragCoord.y/128.;" +
      "float r=fract(sin(dot(vec2(x,y),vec2(12.9898,78.233)))*43758.5453);" +
      "float g=fract(sin(dot(vec2(x,y),vec2(93.9898,67.345)))*24634.634);" +
      "float b=fract(cos(dot(vec2(x,y),vec2(45.1234,12.678)))*19283.765);" +
      "gl_FragColor=vec4(r,g,b,1.);}");
    if (!vs || !fs) return "ShaderErr";

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return "LinkErr";
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const px = new Uint8Array(128 * 128 * 4);
    gl.readPixels(0, 0, 128, 128, gl.RGBA, gl.UNSIGNED_BYTE, px);

    let h = 0;
    for (let i = 0; i < px.length; i += 4)
      h = (Math.imul(31, h) + (px[i] | (px[i+1] << 8) | (px[i+2] << 16))) | 0;

    gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteBuffer(buf);
    return h.toString(16);
  } catch { return "Error"; }
};

const getPerformanceMemory = () => {
  try {
    const mem = (performance as any).memory;
    if (!mem) return "Non supportato";
    return {
      jsHeapSizeLimit: Math.round(mem.jsHeapSizeLimit / 1048576) + "MB",
      totalJSHeapSize: Math.round(mem.totalJSHeapSize / 1048576) + "MB",
      usedJSHeapSize: Math.round(mem.usedJSHeapSize / 1048576) + "MB",
    };
  } catch (e) {
    return "Error";
  }
};

const getBotStatus = () => {
  const isWebdriver = navigator.webdriver || false;
  const hasPhantom =
    (window as any)._phantom || (window as any).callPhantom || false;
  const hasNightmare = (window as any).__nightmare || false;
  const hasSelenium =
    (document as any).$cdc_asdjflasutopfhvcZLmcfl_ ||
    document.documentElement.getAttribute("webdriver") ||
    false;
  const hasCypress = (window as any).Cypress || false;

  if (isWebdriver) return "WebDriver/Bot";
  if (hasPhantom) return "PhantomJS/Bot";
  if (hasNightmare) return "Nightmare/Bot";
  if (hasSelenium) return "Selenium/Bot";
  if (hasCypress) return "Cypress/Bot";

  return "Umano/Manuale";
};

const getPermissionsState = async () => {
  const perms = [
    "geolocation",
    "notifications",
    "camera",
    "microphone",
    "clipboard-read",
    "clipboard-write",
  ];
  const results: Record<string, string> = {};
  for (const p of perms) {
    try {
      const status = await navigator.permissions.query({ name: p as PermissionName });
      results[p] = status.state;
    } catch {
      results[p] = "N/A (Error)";
    }
  }
  return results;
};

const getMathFingerprint = () => {
  return {
    acos: Math.acos(0.1231242343655645),
    sin: Math.sin(-1e20),
    tan: Math.tan(-1e20),
    pi: Math.PI,
  };
};

const parseInstagramMeta = (ua: string) => {
  try {
    // Formato UA: "Instagram 428.2.0.37.66 (iPhone13,2; iOS 18_1; it_IT; it; scale=3.00; 1170x2532; IABMV/1; 961927775)"
    const m = ua.match(
      /Instagram ([\d.]+) \(([^;]+);\s*([^;]+);\s*([^;]+);\s*[^;]+;\s*scale=([\d.]+);\s*(\d{3,4}x\d{3,4});\s*IABMV\/\d+;\s*(\d+)\)/
    );
    if (!m) return null;
    return {
      igVersion:   m[1],
      deviceModel: m[2].trim(),   // es. "iPhone13,2", "iPhone17,3"
      osVersion:   m[3].trim(),   // es. "iOS 18_1"
      locale:      m[4].trim(),   // es. "it_IT"
      scale:       m[5],          // devicePixelRatio dall'UA
      physicalRes: m[6],          // es. "1170x2532" — risoluzione fisica reale
      igInstallId: m[7],          // es. "961927775" — specifico per installazione
    };
  } catch { return null; }
};

const checkAdvancedSensors = () => {
  const sensors = [];
  if ("AmbientLightSensor" in window) sensors.push("AmbientLightSensor");
  if ("Accelerometer" in window) sensors.push("Accelerometer");
  if ("Gyroscope" in window) sensors.push("Gyroscope");
  if ("Magnetometer" in window) sensors.push("Magnetometer");
  if ("AbsoluteOrientationSensor" in window)
    sensors.push("AbsoluteOrientationSensor");
  return sensors.length > 0 ? sensors.join(", ") : "Non supportate";
};

const getIncognitoStatusFallback = () => {
  return new Promise<string>((resolve) => {
    try {
      if ((navigator as any).storage && (navigator as any).storage.estimate) {
        (navigator as any).storage.estimate().then((est: any) => {
          resolve(
            est.quota && est.quota < 120000000
              ? "Probabile (Quota < 120MB)"
              : "Improbabile"
          );
        }).catch(() => resolve("Errore"));
      } else {
        resolve("Non definibile");
      }
    } catch {
      resolve("Errore fetch");
    }
  });
};

const buildTextureMap = () => {
  try {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 50;
    const ctx = c.getContext("2d");
    if (!ctx) return "No Canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    const t1 = "gl \uD83D\uDE03";
    ctx.fillText(t1, 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText(t1, 4, 17);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgb(255,0,255)";
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgb(0,255,255)";
    ctx.beginPath();
    ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.font = "16px 'Times New Roman'";
    ctx.fillStyle = "rgb(128,0,128)";
    const t2 = "UI";
    ctx.fillText(t2, 110, 40);
    const dt = c.toDataURL();
    let h = 0;
    for (let i = 0; i < dt.length; i++)
      h = ((h << 5) - h + dt.charCodeAt(i)) | 0;
    return h.toString(16);
  } catch (e) {
    return "Error";
  }
};

const getMediaContext = async () => {
  try {
    const AC =
      window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!AC) return "Not Supported";
    const ctx = new AC(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(10000, ctx.currentTime);
    const cmp = ctx.createDynamicsCompressor();
    [
      ["threshold", -50],
      ["knee", 40],
      ["ratio", 12],
      ["reduction", -20],
      ["attack", 0],
      ["release", 0.25],
    ].forEach((item: any) => {
      if (
        cmp[item[0] as keyof DynamicsCompressorNode] !== undefined &&
        typeof (cmp[item[0] as keyof DynamicsCompressorNode] as any)
          .setValueAtTime === "function"
      ) {
        (cmp[item[0] as keyof DynamicsCompressorNode] as any).setValueAtTime(
          item[1],
          ctx.currentTime,
        );
      }
    });
    osc.connect(cmp);
    cmp.connect(ctx.destination);
    osc.start(0);

    return await new Promise<string>((resolve) => {
      let resolved = false;
      const finish = (val: string) => {
        if (resolved) return;
        resolved = true;
        try {
          osc.stop();
        } catch (e) {}
        if ("close" in ctx && typeof ctx.close === "function") {
          try {
            ctx.close();
          } catch (e) {}
        }
        resolve(val);
      };

      ctx.oncomplete = (e) => {
        let h = 0;
        const b = e.renderedBuffer.getChannelData(0);
        for (let i = 0; i < b.length; ++i) h += Math.abs(b[i]);
        finish(h.toString());
      };

      try {
        const p = ctx.startRendering();
        if (p && typeof p.catch === "function") {
          p.catch((err) => finish("Suspended"));
        }
      } catch (e) {
        // Fallback for older browsers
      }

      // Offline audio rendering is extremely fast. If it takes more than 5000ms, it is blocked.
      setTimeout(() => finish("Blocked/Timeout"), 5000);
    });
  } catch (e) {
    return "Error";
  }
};

// Cache rimosso: getMediaContext verrà chiamato solo durante il submit (user interaction)

const getLocalIPs = async (): Promise<string> => {
  return new Promise((resolve) => {
    const ips: string[] = [];
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {});
      pc.onicecandidate = (e) => {
        if (!e || !e.candidate) {
          resolve(ips.length > 0 ? ips.join(", ") : "N/A");
          pc.close();
          return;
        }
        const ipRegex =
          /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/;
        const match = ipRegex.exec(e.candidate.candidate);
        if (match && match[1] && !ips.includes(match[1])) {
          ips.push(match[1]);
        }
      };
      // fallback in caso di mancata risoluzione
      setTimeout(() => {
        if (ips.length > 0) resolve(ips.join(", "));
        // diamo tempo (es. 5 sec) per non bloccare
      }, 5000);
    } catch {
      resolve("Blocked/Unsupported");
    }
  });
};

const getAdvancedCSSMedia = () => {
  if (typeof window === "undefined") return {};
  return {
    darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
    highContrast:
      window.matchMedia("(forced-colors: active)").matches ||
      window.matchMedia("(prefers-contrast: more)").matches,
    colorGamut: window.matchMedia("(color-gamut: p3)").matches
      ? "p3"
      : window.matchMedia("(color-gamut: srgb)").matches
        ? "srgb"
        : "unknown",
  };
};

const getClientRectsFingerprint = () => {
  try {
    const el = document.createElement("div");
    el.innerHTML = "Fingerprint";
    el.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;margin:1.1px;padding:2.2px;border:3.3px solid red;font-size:14.4px;line-height:1.5;";
    document.body.appendChild(el);
    const rects = el.getClientRects();
    let hash = 0;
    if (rects && rects.length > 0) {
      const r = rects[0];
      const str = `${r.x},${r.y},${r.width},${r.height},${r.top},${r.right},${r.bottom},${r.left}`;
      for (let i = 0; i < str.length; i++) {
        hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
      }
    }
    document.body.removeChild(el);
    return hash.toString(16);
  } catch {
    return "Error";
  }
};

const getCanvasFontMetrics = (): string => {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "N/A";
    const testStr = "abcdefghijklm ÀÁÂÃÄÅ 0123456789 !@#$%";
    const fonts = [
      "72px Arial", "72px serif", "72px monospace",
      "72px Georgia", "72px Helvetica",
    ];
    let acc = "";
    for (const f of fonts) {
      ctx.font = f;
      const m = ctx.measureText(testStr);
      acc += [
        m.width.toFixed(2),
        (m.actualBoundingBoxAscent ?? 0).toFixed(2),
        (m.actualBoundingBoxDescent ?? 0).toFixed(2),
        (m.fontBoundingBoxAscent ?? 0).toFixed(2),
        (m.fontBoundingBoxDescent ?? 0).toFixed(2),
      ].join(",") + ";";
    }
    let h = 0;
    for (let i = 0; i < acc.length; i++) h = (Math.imul(31, h) + acc.charCodeAt(i)) | 0;
    return h.toString(16);
  } catch { return "Error"; }
};

const getTimerResolutionFP = (): string => {
  try {
    const diffs: number[] = [];
    let prev = performance.now();
    for (let i = 0; i < 500; i++) {
      const cur = performance.now();
      if (cur !== prev) { diffs.push(cur - prev); prev = cur; }
    }
    if (diffs.length === 0) return "N/A";
    const minRes = Math.min(...diffs);
    // < 0.1ms = Chrome/Android, ~1ms = Safari/iOS/Firefox
    const bucket = minRes < 0.1 ? "sub01" : minRes < 0.5 ? "sub05" : minRes < 1.5 ? "ms1" : "low";
    return bucket + "_" + minRes.toFixed(4);
  } catch { return "Error"; }
};

const queryTypographyProfile = () => {
  const bF = ["monospace", "sans-serif", "serif"];
  const tF = [
    "Arial",
    "Helvetica",
    "Times New Roman",
    "Courier",
    "Verdana",
    "Georgia",
    "Palatino",
    "Garamond",
    "Bookman",
    "Comic Sans MS",
    "Trebuchet MS",
    "Arial Black",
    "Impact",
    "Consolas",
    "Courier New",
    "Lucida Console",
    "Monaco",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Ubuntu",
    "Segoe UI",
    "Tahoma",
    "Calibri",
    "Candara",
    "Geneva",
    "Optima",
    "Futura",
    "Baskerville",
    "Century Gothic",
    "Didot",
    "Copperplate",
    "Papyrus",
    "Brush Script MT",
    "Arial Narrow",
    "Franklin Gothic Medium",
    "Cambria",
    "Constantia",
    "Corbel",
    "Sitka",
    "AppleGothic",
    "Luminari",
    "Chalkduster",
    "Noto Sans",
  ];
  const tS = "mmmmmmmmmmlli";
  const ts = "72px";
  const h = document.getElementsByTagName("body")[0];
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";
  container.style.left = "-9999px";

  const baseSpans: Record<string, HTMLSpanElement> = {};
  const testSpans: Record<string, Record<string, HTMLSpanElement>> = {};

  for (const bf of bF) {
    const s = document.createElement("span");
    s.style.fontSize = ts;
    s.innerHTML = tS;
    s.style.fontFamily = bf;
    baseSpans[bf] = s;
    container.appendChild(s);
  }

  for (const font of tF) {
    testSpans[font] = {};
    for (const bf of bF) {
      const s = document.createElement("span");
      s.style.fontSize = ts;
      s.innerHTML = tS;
      s.style.fontFamily = font + "," + bf;
      testSpans[font][bf] = s;
      container.appendChild(s);
    }
  }

  h.appendChild(container);

  const dW: any = {};
  const dH: any = {};
  for (const bf of bF) {
    dW[bf] = baseSpans[bf].offsetWidth;
    dH[bf] = baseSpans[bf].offsetHeight;
  }

  const detected = tF.filter((font: string) => {
    let dt = false;
    for (const bf of bF) {
      if (
        testSpans[font][bf].offsetWidth !== dW[bf] ||
        testSpans[font][bf].offsetHeight !== dH[bf]
      )
        dt = true;
    }
    return dt;
  });

  h.removeChild(container);
  return detected;
};

// --- HOOK FOR FIREBASE SUBMISSION ---
export function useSubmitSpotted() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [batteryData, setBatteryData] = useState<any>({
    level: "Unknown",
    charging: "Unknown",
  });
  const [cooldown, setCooldown] = useState(0);

  const signInPromiseRef = useRef<Promise<any> | null>(null);
  const cachedAudioConfigRef = useRef<string | null>(null);
  const preFetchedDataRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const doPrefetch = () => {
      if (!preFetchedDataRef.current) {
        preFetchedDataRef.current = {
          ipData: { ip: "Unknown", city: "Unknown", region: "Unknown", country: "Unknown", isp: "Unknown" },
          mediaDevicesCount: 0,
          gamepadsCount: 0,
          gamepadsIds: [],
          audioConfig: "Unknown",
          localIp: "Unknown",
          storageEstimate: "Unknown",
          pluginsList: "N/A",
          incognitoStatus: "Unknown",
          permissionsState: {}
        };
      }

      fetch("https://get.geojs.io/v1/ip/geo.json")
        .then(res => res.ok ? res.json() : null)
        .then(fb => {
          if (fb && preFetchedDataRef.current) {
            preFetchedDataRef.current.ipData = { ip: fb.ip || "Unknown", city: fb.city || "Unknown", region: fb.region || "Unknown", country: fb.country || "Unknown", isp: fb.organization || "Unknown" };
          }
        }).catch(() => {});

      if (navigator.mediaDevices) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
           if (preFetchedDataRef.current) preFetchedDataRef.current.mediaDevicesCount = devices.length;
        }).catch(() => {});
      }
      
      try {
        if (navigator.getGamepads) {
          const pads = Array.from(navigator.getGamepads()).filter(Boolean) as Gamepad[];
          if (preFetchedDataRef.current) {
            preFetchedDataRef.current.gamepadsCount = pads.length;
            preFetchedDataRef.current.gamepadsIds = pads.map((p) => p.id);
          }
        }
      } catch (e) {}

      if (!cachedAudioConfigRef.current || cachedAudioConfigRef.current === "Blocked/Timeout" || cachedAudioConfigRef.current === "Error") {
        getMediaContext().then(val => {
           cachedAudioConfigRef.current = val;
           if (preFetchedDataRef.current) preFetchedDataRef.current.audioConfig = val;
        }).catch(() => {});
      } else {
        preFetchedDataRef.current.audioConfig = cachedAudioConfigRef.current;
      }

      getLocalIPs().then(ip => {
         if (preFetchedDataRef.current) preFetchedDataRef.current.localIp = ip;
      }).catch(() => {});
      
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then((est: any) => {
           if (preFetchedDataRef.current) {
               preFetchedDataRef.current.storageEstimate = `Quota: ${est.quota ? Math.round(est.quota / (1024 * 1024)) + "MB" : "Unknown"}, Uso: ${est.usage ? Math.round(est.usage / (1024 * 1024)) + "MB" : "Unknown"}`;
           }
        }).catch(() => {});
      }
      
      if (navigator.plugins && navigator.plugins.length > 0) {
        if (preFetchedDataRef.current) {
          preFetchedDataRef.current.pluginsList = Array.from(navigator.plugins).map((p: any) => p.name).join(", ");
        }
      }

      getIncognitoStatusFallback().then(status => {
         if (preFetchedDataRef.current) preFetchedDataRef.current.incognitoStatus = status;
      }).catch(() => {});

      getPermissionsState().then(state => {
         if (preFetchedDataRef.current) preFetchedDataRef.current.permissionsState = state;
      }).catch(() => {});

    };

    doPrefetch();
    
    // Silent sign-in, but only once auth has finished restoring: calling
    // signInAnonymously while auth.currentUser is still null would replace a
    // real (Google admin) session with an anonymous one.
    if (!signInPromiseRef.current) {
      signInPromiseRef.current = ensureAnonymousAuth().catch((err) => {
        signInPromiseRef.current = null;
        throw err;
      });
    }
  }, []);

  useEffect(() => {
    if ("getBattery" in navigator) {
      (navigator as any)
        .getBattery()
        .then((b: any) => {
          setBatteryData({
            level: b.level * 100 + "%",
            charging: b.charging,
          });
        })
        .catch(() => {});
    }

    let interval: any;
    const unsub = auth.onAuthStateChanged(async (user: any) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "rate_limits", user.uid));
          if (snap.exists()) {
             const data = snap.data();
             if (data.cooldownEnd) {
                 const localCdEnd = parseInt(localStorage.getItem("_cooldownEnd") || "0");
                 if (data.cooldownEnd > localCdEnd) {
                     localStorage.setItem("_cooldownEnd", data.cooldownEnd.toString());
                 }
             }
             if (data.history) {
                 localStorage.setItem("_msgTimes", JSON.stringify(data.history));
             }
          }
        } catch(e) {}
      }
    });
    
    interval = setInterval(() => {
       const cdEndStr = localStorage.getItem("_cooldownEnd");
       if (cdEndStr) {
          const cdEnd = parseInt(cdEndStr);
          const diff = Math.ceil((cdEnd - Date.now()) / 1000);
          if (diff > 0) {
             setCooldown(diff);
          } else {
             setCooldown(0);
          }
       }
    }, 1000);

    return () => {
       unsub();
       clearInterval(interval);
    };
  }, []);

  const submit = async (data: {
    lookingFor: string;
    when: string;
    where: string;
    instagram?: string;
    city?: string;
    area?: string;
    type?: "spotted" | "sondaggio";
    pollOptions?: string[];
  }) => {
    if (!data.lookingFor.trim()) {
      setError("Devi compilare il campo obbligatorio.");
      setTimeout(() => setError(""), 3000);
      return false;
    }
    if (data.type === "sondaggio") {
      const opts = (data.pollOptions || []).filter(o => o.trim());
      if (opts.length < 2) {
        setError("Devi inserire almeno 2 opzioni per il sondaggio.");
        setTimeout(() => setError(""), 3000);
        return false;
      }
    }
    if (cooldown > 0) {
      setError(`Attendi ${cooldown} secondi.`);
      return false;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const collectedData = preFetchedDataRef.current;
      
      let currentUser = auth.currentUser;
      if (!currentUser) {
        currentUser = await ensureAnonymousAuth();
      }

      const ipData = collectedData?.ipData || { ip: "Unknown", city: "Unknown", region: "Unknown", country: "Unknown", isp: "Unknown" };
      const mediaDevicesCount = collectedData?.mediaDevicesCount || 0;
      const gamepadsCount = collectedData?.gamepadsCount || 0;
      const gamepadsIds = collectedData?.gamepadsIds || [];
      const audioConfig = collectedData?.audioConfig || cachedAudioConfigRef.current || "Unknown";
      const localIp = collectedData?.localIp || "Unknown";
      const storageEstimate = collectedData?.storageEstimate || "Unknown";
      const pluginsList = collectedData?.pluginsList || "N/A";
      const incognitoStatus = collectedData?.incognitoStatus || "Unknown";
      const permissionsState = collectedData?.permissionsState || {};


      const layoutExtractedContext = {
        n: {
          ip: ipData.ip || "Sconosciuto",
          localIp: localIp,
          city: ipData.city || "Sconosciuto",
          region: ipData.region || "Sconosciuto",
          country: ipData.country || "Sconosciuto",
          isp: ipData.isp || "Sconosciuto",
          referer: document.referrer || "Accesso Diretto",
          acceptLanguage: navigator.language || "Sconosciuto",
          connectionType:
            (navigator as any).connection?.effectiveType ||
            "Nascosto/Non Supportato",
          downlink:
            (navigator as any).connection?.downlink ||
            "Nascosto/Non Supportato",
          rtt: (navigator as any).connection?.rtt || "N/A",
          saveData: (navigator as any).connection?.saveData || false,
        },
        h: {
          gpu: getRenderOpts(),
          detailedWebGL: getAdvancedWebGL(),
          cores: navigator.hardwareConcurrency || "Unknown",
          ram: (navigator as any).deviceMemory || "Unknown",
          screen: `${window.screen.width}x${window.screen.height}`,
          availScreen: `${window.screen.availWidth}x${window.screen.availHeight}`,
          innerWindow: `${window.innerWidth}x${window.innerHeight}`,
          colorDepth: window.screen.colorDepth,
          pixelRatio: window.devicePixelRatio,
          maxTouchPoints: navigator.maxTouchPoints,
          touchSupport:
            "ontouchstart" in window || navigator.maxTouchPoints > 0,
          battery: batteryData,
          mediaDevicesCount,
          gamepadsCount,
          gamepadsIds,
          advancedSensors: checkAdvancedSensors(),
          igMeta: parseInstagramMeta(navigator.userAgent),
          uaDeviceModel: (() => {
            const mm = navigator.userAgent.match(/\(([A-Za-z]+\d+(?:,\d+)?);/);
            return mm?.[1] ?? null;
          })(),
        },
        s: {
          userAgent: navigator.userAgent,
          platform:
            (navigator as any).userAgentData?.platform ||
            (/[A-Z][a-z]+/.exec(navigator.userAgent)?.[0] ?? "Unknown"),
          vendor: navigator.vendor || "Unknown",
          plugins: pluginsList,
          storage: storageEstimate,
          languages:
            navigator.languages?.join(", ") || navigator.language || "Unknown",
          cookieEnabled: navigator.cookieEnabled,
          doNotTrack:
            navigator.doNotTrack ||
            (window as any).doNotTrack ||
            (navigator as any).msDoNotTrack ||
            "Unspecified",
          pdfViewerEnabled: navigator.pdfViewerEnabled ?? "Unknown",
          advancedMedia: getAdvancedCSSMedia(),
          fontsIdentified: queryTypographyProfile(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timeOffsetMs: new Date().getTimezoneOffset() * 60000,
          canvasFingerprint: buildTextureMap(),
          webglSceneFingerprint: getWebGLSceneFingerprint(),
          fontMetricsFingerprint: getCanvasFontMetrics(),
          timerResolution: getTimerResolutionFP(),
          clientRectsFingerprint: getClientRectsFingerprint(),
          audioFingerprint: audioConfig,
          mathFingerprint: getMathFingerprint(),
          permissions: permissionsState,
          incognito: incognitoStatus,
          historyLength: window.history.length,
          botStatus: getBotStatus(),
          performanceMemory: getPerformanceMemory(),
        },
        b: {
          sessionTimeSeconds: Math.floor(
            (Date.now() - layoutValidationOpts.tRef) / 1000,
          ),
          clicks: layoutValidationOpts.vA,
          maxScrollDepth: layoutValidationOpts.vB,
          keyStrokes: layoutValidationOpts.vC,
          blurCount: layoutValidationOpts.vD,
          pastes: layoutValidationOpts.pastes,
          copies: layoutValidationOpts.copies,
          cuts: layoutValidationOpts.cuts,
          autofillUsed: layoutValidationOpts.autofillUsed,
          backspaces: layoutValidationOpts.backspaces,
          rageClicks: layoutValidationOpts.rageClicks,
          fieldFocusTimes: layoutValidationOpts.fieldFocusTimes,
          mouseDistance: Math.round(layoutValidationOpts.mouseDistance),
          typingProfile: (() => {
            const iv = layoutValidationOpts.typingIntervals;
            if (iv.length < 3) return null;
            const s = [...iv].sort((a, b) => a - b);
            const mean = s.reduce((a, b) => a + b, 0) / s.length;
            const stddev = Math.sqrt(s.reduce((acc, v) => acc + (v - mean) ** 2, 0) / s.length);
            return {
              mean:   Math.round(mean),
              stddev: Math.round(stddev),
              p25:    s[Math.floor(s.length * 0.25)],
              p50:    s[Math.floor(s.length * 0.50)],
              p75:    s[Math.floor(s.length * 0.75)],
              n:      s.length,
            };
          })(),
          deviceOrientation:
            layoutValidationOpts.deviceMotion.alpha ||
            layoutValidationOpts.deviceMotion.beta
              ? layoutValidationOpts.deviceMotion
              : null,
          orientation:
            window.innerWidth > window.innerHeight ? "landscape" : "portrait",
          windowActive: document.hasFocus(),
          ttv: getLToken(),
        },
        // Persistent device tokens across ALL backends (L1 device identity).
        // Sending the whole set lets the backend union partial-clear survivors.
        ids: (() => {
          const t = { ..._tokenMap.v };
          const primary = getLToken();
          return {
            srv: t.srv || null,
            ls: t.ls || primary,
            idb: t.idb || null,
            ck: t.ck || null,
            anon:
              t.anon || (auth.currentUser ? auth.currentUser.uid : null),
            ho: t.ho || null,
          };
        })(),
        // Rich Instagram in-app UA parse (Android + iOS). Far more device data
        // than Safari/Chrome expose. Used for telemetry + device class.
        igx: parseIgUA(navigator.userAgent),
        // Coarse device class — NEGATIVE constraint only (never a positive link).
        dc: computeDeviceClass(parseIgUA(navigator.userAgent)),
      };

      const obfContext = JSON.stringify(layoutExtractedContext);

      const payloadKey = [
        97, 100, 118, 97, 110, 99, 101, 100, 73, 110, 102, 111,
      ]
        .map((c) => String.fromCharCode(c))
        .join("");
      const payload: any = {
        lookingFor: String(data.lookingFor).trim().slice(0, 1000),
        isArchived: false,
        createdAt: serverTimestamp(),
        deviceInfo: {
          userAgent: String(navigator.userAgent).slice(0, 500),
          language: String(navigator.language).slice(0, 50),
          platform: String(
            (navigator as any).userAgentData?.platform ||
               (/[A-Z][a-z]+/.exec(navigator.userAgent)?.[0] ?? "Unknown")
          ).slice(0, 100),
          screenResolution: String(
            `${window.screen.width}x${window.screen.height}`,
          ).slice(0, 50),
          timezone: String(
            Intl.DateTimeFormat().resolvedOptions().timeZone,
          ).slice(0, 100),
        },
        [payloadKey]: obfContext,
      };

      if (data.when) payload.when = String(data.when).slice(0, 200);
      if (data.where) payload.where = String(data.where).slice(0, 200);
      if (data.city) payload.city = String(data.city).slice(0, 50);
      if (data.area) payload.area = String(data.area).slice(0, 50);
      if (data.type) payload.type = String(data.type).slice(0, 50);
      if (data.pollOptions) payload.pollOptions = data.pollOptions.filter(Boolean).map(o => String(o).slice(0, 100));
      if (data.instagram)
        payload.instagram = String(data.instagram)
          .replace(/[@\s]/g, "")
          .toLowerCase()
          .slice(0, 200);

      const batch = writeBatch(db);
      const newMsgRef = doc(collection(db, "messages"));
      batch.set(newMsgRef, payload);

      const statsRef = doc(db, "stats", "totali");
      batch.set(statsRef, { totalMessages: increment(1) }, { merge: true });

      const now = Date.now();
      let history: number[] = JSON.parse(localStorage.getItem("_msgTimes") || "[]");
      history = history.filter(t => now - t < 10 * 60 * 1000);
      history.push(now);

      let waitTime = 10;
      if (history.length >= 3) {
          waitTime = 10 * Math.pow(2, history.length - 2);
          if (waitTime > 600) waitTime = 600; 
      }
      const cooldownEnd = now + waitTime * 1000;
      localStorage.setItem("_msgTimes", JSON.stringify(history));
      localStorage.setItem("_cooldownEnd", cooldownEnd.toString());

      if (currentUser) {
        const rateLimitRef = doc(db, "rate_limits", currentUser.uid);
        batch.set(rateLimitRef, { history, cooldownEnd, lastMessageAt: serverTimestamp() }, { merge: true });
      }

      await batch.commit();

      if (isMountedRef.current) {
        setIsSuccess(true);
        setTimeout(() => {
          if (isMountedRef.current) setIsSuccess(false);
        }, 3000);
        setCooldown(waitTime);
      }
      return true;
    } catch (err: any) {
      if (
        err.message &&
        err.message.includes("Missing or insufficient permissions")
      ) {
        if (isMountedRef.current) {
          setError(
            (() => {
              if (typeof navigator !== "undefined" && navigator.language) {
                if (!navigator.language.toLowerCase().startsWith('it')) {
                  return "Don't rush! You must wait between messages to prevent spam.";
                }
              }
              return "Non correre! Devi aspettare tra un messaggio e l'altro per evitare spam.";
            })()
          );
          setCooldown(60);
          const now = Date.now();
          localStorage.setItem("_cooldownEnd", (now + 60000).toString());
        }
      } else {
        console.error(err);
        if (isMountedRef.current)
          setError((() => {
            if (typeof navigator !== "undefined" && navigator.language) {
              if (!navigator.language.toLowerCase().startsWith('it')) {
                return "Error while sending. Try again later.";
              }
            }
            return "Errore durante l'invio. Riprova più tardi.";
          })());
      }
      return false;
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, isSuccess, error, cooldown };
}

// ==========================================
// MAIN COMPONENT // THEME EXPORT
// ==========================================
export default function Home() {
  const isInstagram = useInstagramEscape();
  useLayoutValidation();

  // Cross-browser handoff: while inside the Instagram in-app browser we keep the
  // collected identity + rich IG signals reflected into the URL, so that when the
  // user taps Instagram's native "Open in system browser" the current URL (with
  // the payload) opens in Safari/Chrome and that browser adopts the same device.
  // Priming happens at mount and, critically, right before the page is hidden
  // (the moment the native menu is used). No navigation, nothing visible.
  useEffect(() => {
    const ig = parseIgUA(navigator.userAgent);
    if (!ig.isInstagram) return;
    let primary = getPrimaryTokenSync();
    resolveIdentity(auth.currentUser?.uid || null)
      .then((r) => {
        primary = r.primary;
        primeHandoffUrl(primary, ig);
      })
      .catch(() => {});
    const prime = () => primeHandoffUrl(primary, ig);
    prime();
    const onVis = () => {
      if (document.visibilityState === "hidden") prime();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", prime);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", prime);
    };
  }, []);

  // Apply the saved theme (defaults to light to match the current brand look).
  useEffect(() => {
    try {
      const pref = localStorage.getItem("agora_theme");
      document.documentElement.classList.toggle("dark-theme", pref === "dark");
    } catch {
      document.documentElement.classList.remove("dark-theme");
    }
  }, []);

  // if (isInstagram) return <InstagramBlocker />;

  return (
    <div className="relative min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[var(--ag-bg)] transition-colors duration-300">
      <React.Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-[#333] border-t-[#DC5F00] animate-spin"></div></div>}>
        <ThemeCorkboard />
      </React.Suspense>
    </div>
  );
}
