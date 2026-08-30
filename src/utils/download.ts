// Robust client-side file download.
//
// The previous code did:
//     const a = document.createElement("a");
//     a.href = hugeDataUrl; a.download = name; a.click();
// with the anchor NEVER added to the document. Browsers (Chrome in particular)
// ignore clicks on detached anchors, and multi-megabyte `data:` URLs are often
// dropped silently — so the click appeared to do nothing at all.
//
// This helper converts the data URL to a Blob (object URLs have no size limit
// problem), attaches the anchor, clicks it, then cleans up.

/** Convert a data: URL to a Blob without blowing up on large payloads. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, data] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] || "application/octet-stream";
  const isBase64 = /;base64/i.test(head);
  if (!isBase64) {
    return new Blob([decodeURIComponent(data || "")], { type: mime });
  }
  const bin = atob(data || "");
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Trigger a browser download for a Blob. Returns true if it was dispatched. */
export function downloadBlob(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a); // MUST be in the DOM for the click to count
    a.click();
    // Give the browser a tick to start the download before revoking.
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {}
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }, 1000);
    return true;
  } catch (e) {
    console.error("downloadBlob failed", e);
    return false;
  }
}

/** Trigger a download from a data: URL. */
export function downloadDataUrl(dataUrl: string, filename: string): boolean {
  try {
    return downloadBlob(dataUrlToBlob(dataUrl), filename);
  } catch (e) {
    console.error("downloadDataUrl failed", e);
    return false;
  }
}
