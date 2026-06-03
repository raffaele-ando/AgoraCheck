export const computeDeviceProfileId = (
  parsedAdv: any,
  deviceInfo: any,
  instagram: string = ""
): string => {
  if (!parsedAdv) return "UNKNOWN";
  try {
    // Determine the root object structures. 
    // If the format has completely changed in the future, we will throw/warn.
    const hasKnownSoftware = 'software' in parsedAdv || 's' in parsedAdv;
    const hasKnownHardware = 'hardware' in parsedAdv || 'h' in parsedAdv;

    if (Object.keys(parsedAdv).length > 0 && !hasKnownSoftware && !hasKnownHardware) {
      console.warn("computeDeviceProfileId: Unrecognized parsedAdv format. Fingerprinting might fail and break profile continuity.", parsedAdv);
      // Try a best-effort deep search if format changed (not robust but better than empty)
      // but typically we should fix the parsing.
    }

    const s = parsedAdv.software || parsedAdv.s || {};
    const h = parsedAdv.hardware || parsedAdv.h || {};

    const canvas = s.canvasFingerprint || s.c || "";
    const audio = s.audioFingerprint || s.a || "";
    
    const gpu = h.gpu || h.g || "";
    const screen = h.screen || h.s || "";
    const cores = h.cores || h.c || "";
    
    // Old base seed didn't contain rects and math
    let seed = `${canvas}-${audio}-${gpu}-${screen}-${cores}`;
    
    // Backward compatibility: always prioritize instagram for fingerprint identity
    if (instagram) {
      seed = `ig-${instagram.toLowerCase().trim()}`;
    } else if (seed === "----" && deviceInfo) {
      const ip = deviceInfo.userAgent || "";
      seed = ip;
    }

    if (seed === "----" || seed === "") return "UNKNOWN";

    let h1 = 0xdeadbeef,
      h2 = 0x41c6ce57;
    for (let i = 0, ch; i < seed.length; i++) {
      ch = seed.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 =
      Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
      Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 =
      Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
      Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return `AUTO-${hash.toString(16).toUpperCase().padStart(12, "0").slice(0, 8)}`;
  } catch (e) {
    console.error("Error in computeDeviceProfileId:", e);
    return "UNKNOWN";
  }
};
