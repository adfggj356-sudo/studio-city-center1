import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateA6Crop,
  calculate1080pDimensions,
  calculateA6PrintSpec,
  isSkinTone,
  A6_ASPECT_RATIO_PORTRAIT,
  A6_ASPECT_RATIO_LANDSCAPE,
} from './imageMath';

test('calculateA6Crop computes correct aspect ratio for square input (portrait)', () => {
  const crop = calculateA6Crop(1000, 1000, 'portrait');
  // For portrait A6, height is 1000, width should be round(1000 * 105 / 148) = 709
  assert.equal(crop.height, 1000);
  assert.equal(crop.width, Math.round(1000 * A6_ASPECT_RATIO_PORTRAIT));
  // Should be centered horizontally
  assert.equal(crop.x, Math.round((1000 - crop.width) / 2));
  assert.equal(crop.y, 0);
});

test('calculateA6Crop computes correct aspect ratio for wide input (portrait)', () => {
  const crop = calculateA6Crop(2000, 1000, 'portrait');
  assert.equal(crop.height, 1000);
  assert.equal(crop.width, Math.round(1000 * A6_ASPECT_RATIO_PORTRAIT));
  assert.ok(crop.x > 0);
});

test('calculateA6Crop handles landscape orientation correctly', () => {
  const crop = calculateA6Crop(1000, 1000, 'landscape');
  assert.equal(crop.width, 1000);
  assert.equal(crop.height, Math.round(1000 / A6_ASPECT_RATIO_LANDSCAPE));
  assert.equal(crop.x, 0);
  assert.ok(crop.y > 0);
});

test('calculate1080pDimensions scales up low-res image to reach 1080p minimum edge', () => {
  const result = calculate1080pDimensions(500, 800, 1080);
  assert.equal(result.targetWidth, 1080);
  assert.equal(result.targetHeight, Math.round(800 * (1080 / 500)));
  assert.equal(result.scaleFactor, 1080 / 500);
});

test('calculate1080pDimensions leaves images that are already 1080p or larger unscaled', () => {
  const result = calculate1080pDimensions(1920, 1080, 1080);
  assert.equal(result.targetWidth, 1920);
  assert.equal(result.targetHeight, 1080);
  assert.equal(result.scaleFactor, 1);
});

test('calculateA6PrintSpec evaluates DPI and quality rating accurately', () => {
  // A6 at 1080x1522 has min edge 1080 / (10.5 / 2.54) = ~261 DPI
  const spec = calculateA6PrintSpec(1080, 1522);
  assert.ok(spec.dpi >= 250);
  assert.equal(spec.isPrintReady, true);
  assert.equal(spec.qualityRating, 'ممتازة');

  // Low res image has lower DPI
  const lowSpec = calculateA6PrintSpec(400, 560);
  assert.ok(lowSpec.dpi < 180);
  assert.equal(lowSpec.isPrintReady, false);
  assert.equal(lowSpec.qualityRating, 'متوسطة');
});

test('isSkinTone detects realistic human skin tones and rejects non-skin colors', () => {
  // Typical human skin tones (peach, warm tan, olive)
  assert.equal(isSkinTone(210, 160, 130), true);
  assert.equal(isSkinTone(165, 115, 80), true);
  assert.equal(isSkinTone(240, 195, 170), true);

  // Pure colors / backgrounds (blue sky, green foliage, bright yellow, pure black/white)
  assert.equal(isSkinTone(40, 120, 220), false); // Blue
  assert.equal(isSkinTone(50, 180, 50), false);  // Green
  assert.equal(isSkinTone(10, 10, 10), false);   // Black
  assert.equal(isSkinTone(255, 255, 255), false);// Pure white (r > g is false)
});
