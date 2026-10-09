/**
 * Client-Side Compression & Storage Utility
 * - Gzip compression for markdown text payloads
 * - Canvas-based WebP conversion for high-res images
 * - Storage savings calculations
 */

export async function compressText(text: string): Promise<{
  base64: string;
  originalBytes: number;
  compressedBytes: number;
  savingsPercent: number;
}> {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);
  const originalBytes = rawBytes.length;

  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Response(rawBytes).body?.pipeThrough(new CompressionStream('gzip'));
      if (stream) {
        const compressedArrayBuffer = await new Response(stream).arrayBuffer();
        const compressedUint8 = new Uint8Array(compressedArrayBuffer);
        const compressedBytes = compressedUint8.length;
        
        let binary = '';
        for (let i = 0; i < compressedUint8.byteLength; i++) {
          binary += String.fromCharCode(compressedUint8[i]);
        }
        const base64 = btoa(binary);
        const savingsPercent = originalBytes > 0 ? Math.max(0, Math.round((1 - compressedBytes / originalBytes) * 100)) : 0;

        return {
          base64,
          originalBytes,
          compressedBytes,
          savingsPercent,
        };
      }
    } catch (e) {
      console.warn('CompressionStream fallback triggered:', e);
    }
  }

  // Fallback: uncompressed base64
  let binary = '';
  for (let i = 0; i < rawBytes.byteLength; i++) {
    binary += String.fromCharCode(rawBytes[i]);
  }
  return {
    base64: btoa(binary),
    originalBytes,
    compressedBytes: originalBytes,
    savingsPercent: 0,
  };
}

export async function decompressText(base64: string): Promise<string> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  if (typeof DecompressionStream !== 'undefined') {
    try {
      const stream = new Response(bytes).body?.pipeThrough(new DecompressionStream('gzip'));
      if (stream) {
        return await new Response(stream).text();
      }
    } catch {
      // Fallback
    }
  }

  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Compresses an image file (JPEG/PNG) to modern WebP format
 * Reduces typical 4-8 MB camera photos down to 200-400 KB with no discernible reading loss.
 */
export async function compressImageToWebP(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.82
): Promise<{ file: File; originalSize: number; newSize: number; savingsPercent: number }> {
  const originalSize = file.size;

  // If already small or non-image, return as-is
  if (!file.type.startsWith('image/') || file.size < 80 * 1024) {
    return {
      file,
      originalSize,
      newSize: originalSize,
      savingsPercent: 0,
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ file, originalSize, newSize: originalSize, savingsPercent: 0 });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= originalSize) {
              resolve({ file, originalSize, newSize: originalSize, savingsPercent: 0 });
              return;
            }

            const newName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const compressedFile = new File([blob], newName, { type: 'image/webp' });
            const savingsPercent = Math.round((1 - compressedFile.size / originalSize) * 100);

            resolve({
              file: compressedFile,
              originalSize,
              newSize: compressedFile.size,
              savingsPercent,
            });
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve({ file, originalSize, newSize: originalSize, savingsPercent: 0 });
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve({ file, originalSize, newSize: originalSize, savingsPercent: 0 });
    reader.readAsDataURL(file);
  });
}
