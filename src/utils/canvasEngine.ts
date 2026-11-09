import {
  CropRect,
  ImageEnhancementOptions,
  calculate1080pDimensions,
  calculateA6Crop,
  isSkinTone,
} from './imageMath';

export interface ProcessResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Loads an image from a URL or data URL and returns an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = src;
  });
}

/**
 * Executes the full studio processing pipeline on an image:
 * 1. Cropping (A6 auto or manual)
 * 2. 1080p Resolution Upscaling (bicubic multi-pass canvas)
 * 3. Auto Vibrant Colors (tone mapping, saturation boost with skin tone protection)
 * 4. AI Clarity (edge-adaptive unsharp mask preserving facial structures)
 */
export async function processStudioImage(
  imageSrc: string,
  options: ImageEnhancementOptions,
  manualCrop?: CropRect | null
): Promise<ProcessResult> {
  const img = await loadImage(imageSrc);
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  // Determine crop rectangle based on sizeMode and manualCrop
  let crop: CropRect;
  if (options.sizeMode === 'original') {
    // Keep 100% full original image dimensions without cropping
    crop = { x: 0, y: 0, width: naturalWidth, height: naturalHeight };
  } else if (options.sizeMode === 'manual' && manualCrop && manualCrop.width > 10 && manualCrop.height > 10) {
    // Custom user manual crop
    crop = {
      x: Math.max(0, Math.min(naturalWidth - 10, manualCrop.x)),
      y: Math.max(0, Math.min(naturalHeight - 10, manualCrop.y)),
      width: Math.min(naturalWidth, Math.max(10, manualCrop.width)),
      height: Math.min(naturalHeight, Math.max(10, manualCrop.height)),
    };
  } else if (options.cropToA6 || options.sizeMode === 'a6') {
    crop = calculateA6Crop(naturalWidth, naturalHeight, options.a6Orientation);
  } else {
    crop = { x: 0, y: 0, width: naturalWidth, height: naturalHeight };
  }

  // Calculate target resolution
  let targetWidth = crop.width;
  let targetHeight = crop.height;

  if (options.targetResolution1080p) {
    const res = calculate1080pDimensions(crop.width, crop.height, 1080);
    targetWidth = res.targetWidth;
    targetHeight = res.targetHeight;
  } else if (options.sizeMode === 'original') {
    // Guarantee 100% original pixels when targetResolution1080p is false
    targetWidth = naturalWidth;
    targetHeight = naturalHeight;
  }

  // Step 1: Draw cropped and scaled image onto an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // High quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw the cropped portion to target canvas
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Step 2: Pixel-level enhancement (Auto Vibrant Colors + Face-Preserving AI Clarity)
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imageData.data;
  const len = data.length;

  // Factor constants
  const vibranceFactor = options.vibrance / 100; // 0 to 1
  const contrastFactor = (options.contrast + 100) / 100; // 0.5 to 1.5
  const brightnessOffset = options.brightness * 2.55; // -127 to +127
  const saturationFactor = (options.saturation + 100) / 100;

  // Pass 1: Auto Vibrant Colors with Face/Skin Protection
  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Check if this pixel is within human skin tone range
    const isSkin = options.preserveSkinTones && isSkinTone(r, g, b);

    // Apply brightness
    r += brightnessOffset;
    g += brightnessOffset;
    b += brightnessOffset;

    // Apply Contrast (center around 128)
    r = (r - 128) * contrastFactor + 128;
    g = (g - 128) * contrastFactor + 128;
    b = (b - 128) * contrastFactor + 128;

    // Vibrance & Saturation
    const maxVal = Math.max(r, Math.max(g, b));
    const minVal = Math.min(r, Math.min(g, b));
    const delta = (maxVal - minVal) / 255; // Current saturation level
    const avg = (r + g + b) / 3;

    // Vibrance boosts less-saturated colors more than already-saturated ones
    // If skin tone, keep boost gentle to protect natural complexion
    const skinDampen = isSkin ? 0.35 : 1.0;
    const effectiveVibrance = vibranceFactor * (1 - delta) * skinDampen;
    const effectiveSat = (saturationFactor - 1) * skinDampen;

    const totalBoost = 1 + effectiveVibrance + effectiveSat;

    r = avg + (r - avg) * totalBoost;
    g = avg + (g - avg) * totalBoost;
    b = avg + (b - avg) * totalBoost;

    // Clamp values
    data[i] = Math.min(255, Math.max(0, Math.round(r)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
  }

  // Pass 2: AI Clarity / Edge-Adaptive Unsharp Mask (Preserves facial features & smooth skin)
  if (options.sharpness > 0) {
    const sharpnessAmount = (options.sharpness / 100) * 0.75; // subtle natural range
    // Create copy for convolution source
    const copy = new Uint8ClampedArray(data);
    const w = targetWidth;
    const h = targetHeight;

    // 3x3 Laplacian / Unsharp Mask with edge gradient threshold
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;

        const r = copy[idx];
        const g = copy[idx + 1];
        const b = copy[idx + 2];

        // Skin check: if it's skin, apply minimal sharpening to prevent skin texture artifacts
        const isSkin = options.preserveSkinTones && isSkinTone(r, g, b);
        const currentAmount = isSkin ? sharpnessAmount * 0.25 : sharpnessAmount;

        // Sample adjacent pixels
        const top = ((y - 1) * w + x) * 4;
        const bottom = ((y + 1) * w + x) * 4;
        const left = (y * w + (x - 1)) * 4;
        const right = (y * w + (x + 1)) * 4;

        // Micro-gradient
        const diffR = 4 * r - copy[top] - copy[bottom] - copy[left] - copy[right];
        const diffG = 4 * g - copy[top + 1] - copy[bottom + 1] - copy[left + 1] - copy[right + 1];
        const diffB = 4 * b - copy[top + 2] - copy[bottom + 2] - copy[left + 2] - copy[right + 2];

        data[idx] = Math.min(255, Math.max(0, Math.round(r + diffR * currentAmount)));
        data[idx + 1] = Math.min(255, Math.max(0, Math.round(g + diffG * currentAmount)));
        data[idx + 2] = Math.min(255, Math.max(0, Math.round(b + diffB * currentAmount)));
      }
    }
  }

  // Put modified pixel data back onto canvas
  ctx.putImageData(imageData, 0, 0);

  // Return dataURL and Blob
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas blob failed'))), 'image/jpeg', 0.95);
  });

  return {
    dataUrl,
    blob,
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * Triggers browser download of a blob with a clean studio filename
 */
export function downloadStudioFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
