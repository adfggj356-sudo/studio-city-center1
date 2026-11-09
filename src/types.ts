import { CropRect, ImageEnhancementOptions } from './utils/imageMath';

export interface StudioImage {
  id: string;
  name: string;
  originalUrl: string;
  processedUrl: string;
  width: number;
  height: number;
  processedWidth: number;
  processedHeight: number;
  sizeBytes: number;
  cropRect: CropRect;
  options: ImageEnhancementOptions;
  status: 'ready' | 'processing' | 'done';
  aiAdvice?: string;
  isAiEnhanced?: boolean;
}

export type ViewMode = 'split' | 'processed' | 'original';
