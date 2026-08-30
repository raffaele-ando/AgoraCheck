// Media upload helper. Uploads to the Cloudflare R2-backed Worker endpoint when
// configured (VITE_MEDIA_UPLOAD_URL, e.g. https://agora.theproject.world/media),
// otherwise returns null so callers can fall back to their existing path.
// This keeps uploads working before the Worker is deployed and lets us switch
// image storage from Firestore dataURLs to R2 once it is live.

const ENDPOINT = import.meta.env.VITE_MEDIA_UPLOAD_URL || "";

export function isMediaUploadEnabled(): boolean {
  return !!ENDPOINT;
}

/**
 * Upload a File/Blob (or a dataURL string) to R2 via the edge Worker.
 * Returns the public URL, or null if the endpoint is not configured / on error.
 */
export async function uploadMedia(
  input: File | Blob | string,
  filename?: string,
): Promise<string | null> {
  if (!ENDPOINT) return null;
  try {
    let body: Blob;
    let name = filename || "upload";
    let contentType = "application/octet-stream";

    if (typeof input === "string") {
      // dataURL -> Blob
      const [head, data] = input.split(",");
      const mime = /data:([^;]+);/.exec(head)?.[1] || "image/png";
      const bin = atob(data || "");
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      body = new Blob([arr], { type: mime });
      contentType = mime;
    } else {
      body = input;
      contentType = (input as File).type || contentType;
      name = filename || (input as File).name || name;
    }

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": contentType, "X-Filename": name },
      body,
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json && typeof json.url === "string" ? json.url : null;
  } catch {
    return null;
  }
}
