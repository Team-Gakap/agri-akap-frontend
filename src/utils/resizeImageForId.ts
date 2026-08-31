/**
 * Shrink a phone-camera still to a JPEG data URL suitable for farmer ID portraits.
 * Keeps the longest edge at `maxEdge` so uploads stay well under typical API limits.
 */
export function resizeImageForId(
  file: File | Blob,
  maxEdge = 800,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          resolve(drawJpeg(img, maxEdge, quality));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Could not decode the image.'));
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Re-encode a raw Base64 image or data URL as JPEG, shrinking the long edge.
 * Returns the same shape as the input (data URL vs raw payload).
 */
export function resizeBase64Image(
  input: string,
  maxEdge = 1600,
  quality = 0.7,
): Promise<string> {
  const keepDataUrl = input.startsWith('data:');
  const dataUrl = keepDataUrl ? input : `data:image/jpeg;base64,${input}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const out = drawJpeg(img, maxEdge, quality);
        resolve(keepDataUrl ? out : (out.split(',')[1] ?? out));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Could not decode the image.'));
    img.src = dataUrl;
  });
}

/** Best-effort shrink for offline sync payloads; returns the original on failure. */
export async function shrinkSyncImage(
  input: string | null | undefined,
  maxEdge = 1600,
  quality = 0.7,
): Promise<string | null | undefined> {
  if (!input) return input;
  try {
    return await resizeBase64Image(input, maxEdge, quality);
  } catch {
    return input;
  }
}

function drawJpeg(img: HTMLImageElement, maxEdge: number, quality: number): string {
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height, 1));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not prepare the photo.');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}
