/**
 * Client-side image compression to reduce Supabase Storage bandwidth.
 * Resizes large images and converts to WebP when supported.
 */

const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_MAX_HEIGHT = 1200;
const DEFAULT_QUALITY = 0.82;

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
  } = options;

  // Skip non-image files or SVGs
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  // Skip small files (under 100KB) — compression overhead not worth it
  if (file.size < 100 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Only resize if larger than max dimensions
      if (width <= maxWidth && height <= maxHeight) {
        // Still re-encode for quality reduction if file is large (>500KB)
        if (file.size < 500 * 1024) {
          resolve(file);
          return;
        }
      }

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round(width * (maxHeight / height));
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP, fallback to original type
      const outputType = supportsWebP() ? 'image/webp' : file.type;
      const ext = outputType === 'image/webp' ? 'webp' : file.name.split('.').pop() || 'jpg';

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // If compressed is larger, return original
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressed = new File([blob], `${baseName}.${ext}`, {
            type: outputType,
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}

let _supportsWebP: boolean | null = null;

function supportsWebP(): boolean {
  if (_supportsWebP !== null) return _supportsWebP;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  _supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  return _supportsWebP;
}
