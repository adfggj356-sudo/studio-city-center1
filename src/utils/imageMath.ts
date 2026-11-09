/**
 * Pure image processing math and specifications for Studio City Centre
 * (ستوديو ستي سنتر - خوارزميات الحسابات الدقيقة للصور وقص A6 والدقة العالية)
 */

// Standard ISO A6 paper / photo dimensions: 105mm x 148mm
// Ratio: 148 / 105 = 1.4095238... (~1:1.41)
export const A6_ASPECT_RATIO_PORTRAIT = 105 / 148; // ~0.709459 (Width / Height)
export const A6_ASPECT_RATIO_LANDSCAPE = 148 / 105; // ~1.409523 (Width / Height)

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export type SizeMode = 'original' | 'a6' | 'manual';
export type CropPreset = 'free' | 'a6_portrait' | 'a6_landscape' | 'square' | 'original';

export interface ImageEnhancementOptions {
  vibrance: number;       // 0 to 100 (default 40 for vibrant studio)
  contrast: number;       // -50 to 50 (default 18)
  saturation: number;     // -50 to 50 (default 15)
  brightness: number;     // -50 to 50 (default 6)
  sharpness: number;      // 0 to 100 (default 35 for AI clarity)
  preserveSkinTones: boolean; // Protect natural face tones from distortion
  targetResolution1080p: boolean; // Ensure at least 1080px on the short edge
  sizeMode: SizeMode;     // 'original' | 'a6' | 'manual'
  cropToA6: boolean;
  a6Orientation: 'portrait' | 'landscape';
  cropPreset?: CropPreset;
}

export const DEFAULT_ENHANCEMENT_OPTIONS: ImageEnhancementOptions = {
  vibrance: 40,
  contrast: 18,
  saturation: 15,
  brightness: 6,
  sharpness: 35,
  preserveSkinTones: true,
  targetResolution1080p: true,
  sizeMode: 'a6',
  cropToA6: true,
  a6Orientation: 'portrait',
  cropPreset: 'a6_portrait',
};

/**
 * Calculates auto-centering crop rectangle for A6 aspect ratio.
 */
export function calculateA6Crop(
  srcWidth: number,
  srcHeight: number,
  orientation: 'portrait' | 'landscape' = 'portrait'
): CropRect {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const targetRatio = orientation === 'portrait' ? A6_ASPECT_RATIO_PORTRAIT : A6_ASPECT_RATIO_LANDSCAPE;
  const currentRatio = srcWidth / srcHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (currentRatio > targetRatio) {
    // Current is wider than target -> crop width
    cropHeight = srcHeight;
    cropWidth = Math.round(srcHeight * targetRatio);
  } else {
    // Current is taller than target -> crop height
    cropWidth = srcWidth;
    cropHeight = Math.round(srcWidth / targetRatio);
  }

  // Ensure crop is within image boundaries
  cropWidth = Math.min(srcWidth, Math.max(1, cropWidth));
  cropHeight = Math.min(srcHeight, Math.max(1, cropHeight));

  // Center the crop
  const x = Math.round((srcWidth - cropWidth) / 2);
  const y = Math.round((srcHeight - cropHeight) / 2);

  return { x, y, width: cropWidth, height: cropHeight };
}

/**
 * Calculates scale factor and final dimensions to guarantee at least 1080px resolution.
 * If targetMinEdge is 1080, short edge will be at least 1080px.
 */
export function calculate1080pDimensions(
  width: number,
  height: number,
  targetMinEdge = 1080
): { targetWidth: number; targetHeight: number; scaleFactor: number } {
  if (width <= 0 || height <= 0) {
    return { targetWidth: 1080, targetHeight: 1522, scaleFactor: 1 };
  }

  const minEdge = Math.min(width, height);
  if (minEdge >= targetMinEdge) {
    // Already 1080p or higher, maintain crisp original dimensions
    return { targetWidth: width, targetHeight: height, scaleFactor: 1 };
  }

  const scaleFactor = targetMinEdge / minEdge;
  const targetWidth = Math.round(width * scaleFactor);
  const targetHeight = Math.round(height * scaleFactor);

  return { targetWidth, targetHeight, scaleFactor };
}

/**
 * Calculates physical studio print specs (DPI and size in cm) for A6 print.
 * A6 standard is 10.5 cm x 14.8 cm.
 */
export function calculateA6PrintSpec(pixelWidth: number, pixelHeight: number): {
  dpi: number;
  widthCm: number;
  heightCm: number;
  isPrintReady: boolean;
  qualityRating: 'ممتازة' | 'جيدة جداً' | 'متوسطة';
} {
  // A6 physical size in inches: 10.5cm / 2.54 = ~4.133 in, 14.8cm / 2.54 = ~5.826 in
  const widthInches = 10.5 / 2.54;
  const heightInches = 14.8 / 2.54;

  const minPixel = Math.min(pixelWidth, pixelHeight);
  const dpi = Math.round(minPixel / widthInches);

  let qualityRating: 'ممتازة' | 'جيدة جداً' | 'متوسطة' = 'متوسطة';
  if (dpi >= 250) {
    qualityRating = 'ممتازة';
  } else if (dpi >= 180) {
    qualityRating = 'جيدة جداً';
  }

  return {
    dpi,
    widthCm: 10.5,
    heightCm: 14.8,
    isPrintReady: dpi >= 200,
    qualityRating,
  };
}

/**
 * Checks whether an RGB color belongs to standard human skin tone range.
 * This is used to preserve facial features, avoid color distortion,
 * and prevent over-saturation of faces.
 */
export function isSkinTone(r: number, g: number, b: number): boolean {
  // Standard Kovac skin color detection heuristic in RGB space
  // r > 95, g > 40, b > 20, max(r,g,b)-min(r,g,b) > 15, |r-g| > 15, r > g, r > b
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (
    r > 90 &&
    g > 35 &&
    b > 15 &&
    r > g &&
    r > b &&
    max - min > 15 &&
    Math.abs(r - g) > 12
  );
}

/**
 * Formats byte size for file UI display (e.g., 2.4 ميجابايت).
 */
export function formatFileSizeArabic(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} ميجابايت`;
}
