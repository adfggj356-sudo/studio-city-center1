import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  SplitSquareVertical,
  CheckCircle2,
  Trash2,
  Eye,
  Crop as CropIcon,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { StudioImage, ViewMode } from '../types';
import { CropRect, CropPreset, calculateA6PrintSpec, ImageEnhancementOptions } from '../utils/imageMath';
import { InteractiveCropOverlay } from './InteractiveCropOverlay';

interface PreviewPanelProps {
  currentImage: StudioImage | null;
  images: StudioImage[];
  activeImageIndex: number;
  onSelectImage: (index: number) => void;
  onDeleteImage: (id: string) => void;
  isManualCrop: boolean;
  manualCrop: CropRect | null;
  onManualCropChange: (rect: CropRect) => void;
  options: ImageEnhancementOptions;
  onOptionsChange: (opts: ImageEnhancementOptions) => void;
  onApplyManualCrop: () => void;
  onCancelManualCrop: () => void;
  onResetFullImage: () => void;
  onRestoreOriginalSize: () => void;
  isProcessing: boolean;
  onUploadClick: () => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  currentImage,
  images,
  activeImageIndex,
  onSelectImage,
  onDeleteImage,
  isManualCrop,
  manualCrop,
  onManualCropChange,
  options,
  onOptionsChange,
  onApplyManualCrop,
  onCancelManualCrop,
  onResetFullImage,
  onRestoreOriginalSize,
  isProcessing,
  onUploadClick,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0 - 100
  const [zoom, setZoom] = useState<number>(1);
  const [cropPreset, setCropPreset] = useState<CropPreset>(options.cropPreset || 'a6_portrait');

  const containerRef = useRef<HTMLDivElement>(null);
  const renderedImgRef = useRef<HTMLImageElement>(null);
  const [renderedDims, setRenderedDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const isDraggingSplit = useRef(false);

  // Update rendered image dimensions on load or window resize
  const updateRenderedDimensions = useCallback(() => {
    if (renderedImgRef.current) {
      setRenderedDims({
        width: renderedImgRef.current.clientWidth,
        height: renderedImgRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateRenderedDimensions();
    window.addEventListener('resize', updateRenderedDimensions);
    return () => window.removeEventListener('resize', updateRenderedDimensions);
  }, [currentImage, viewMode, zoom, isManualCrop, updateRenderedDimensions]);

  // Calculate print specs
  const printSpec = currentImage
    ? calculateA6PrintSpec(currentImage.processedWidth, currentImage.processedHeight)
    : null;

  // Split slider mouse handlers
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplit.current = true;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingSplit.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const pos = ((clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.min(95, Math.max(5, pos)));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingSplit.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));
  const handleResetZoom = () => setZoom(1);

  // Default initial crop rect if none exists
  const activeCropRect: CropRect = manualCrop || {
    x: 0,
    y: 0,
    width: currentImage?.width || 800,
    height: currentImage?.height || 1000,
  };

  return (
    <section className="flex-1 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5 overflow-hidden">
      {/* Block Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            البلوك الثاني: معاينة الصورة قبل الحفظ
          </h2>
          {options.sizeMode === 'original' && (
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
              الحجم الأصلي مفعل
            </span>
          )}
          {(isManualCrop || options.sizeMode === 'manual') && (
            <span className="text-[10px] font-semibold bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
              القص اليدوي مفعل
            </span>
          )}
        </div>

        {/* View Mode & Zoom Toolbar */}
        {currentImage && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Button: استعادة الحجم الأصلي */}
            {options.sizeMode !== 'original' && (
              <button
                type="button"
                onClick={onRestoreOriginalSize}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold transition-colors"
                title="استعادة حجم وأبعاد الصورة الأصلية فوراً"
              >
                <RotateCcw className="w-3 h-3 text-sky-600" />
                <span>استعادة الحجم الأصلي</span>
              </button>
            )}

            {/* Split Comparison Toolbar (hidden during manual crop for clean focus) */}
            {!isManualCrop && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'split'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="مقارنة بالانقسام قبل وبعد"
                >
                  قبل / بعد
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('processed')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'processed'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="عرض الصورة المعدلة فقط"
                >
                  الصورة المحسّنة
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('original')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'original'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="عرض الصورة الأصلية"
                >
                  الأصلية
                </button>
              </div>
            )}

            {/* Zoom buttons */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white"
                title="تصغير"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono px-1 font-semibold text-slate-700">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white"
                title="تكبير"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white"
                title="ملاءمة الشاشة 100%"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Preview Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[320px] max-h-[460px] rounded-xl border border-slate-200 canvas-checkerboard overflow-hidden flex items-center justify-center select-none"
      >
        {isProcessing && (
          <div className="absolute inset-0 z-40 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-sky-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-800">
              جاري معالجة وتوضيح الصورة بالاستوديو...
            </p>
          </div>
        )}

        {currentImage ? (
          <div
            className="relative transition-transform duration-75 flex items-center justify-center"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Interactive Manual Crop Mode Overlay */}
            {isManualCrop ? (
              <div className="relative inline-block max-h-[420px] shadow-xl rounded-sm overflow-hidden">
                <img
                  ref={renderedImgRef}
                  src={currentImage.originalUrl}
                  alt="تحديد القص اليدوي"
                  onLoad={updateRenderedDimensions}
                  className="max-h-[420px] max-w-full block select-none"
                />

                {renderedDims.width > 0 && renderedDims.height > 0 && (
                  <InteractiveCropOverlay
                    naturalWidth={currentImage.width}
                    naturalHeight={currentImage.height}
                    containerWidth={renderedDims.width}
                    containerHeight={renderedDims.height}
                    crop={activeCropRect}
                    onChange={onManualCropChange}
                    preset={cropPreset}
                    onPresetChange={(p) => {
                      setCropPreset(p);
                      onOptionsChange({ ...options, cropPreset: p });
                    }}
                    onApply={onApplyManualCrop}
                    onCancel={onCancelManualCrop}
                    onResetFull={onResetFullImage}
                  />
                )}
              </div>
            ) : (
              <>
                {/* Single mode: Original */}
                {viewMode === 'original' && (
                  <img
                    src={currentImage.originalUrl}
                    alt="الصورة الأصلية"
                    className="max-h-[420px] max-w-full object-contain shadow-lg rounded-sm"
                  />
                )}

                {/* Single mode: Processed */}
                {viewMode === 'processed' && (
                  <img
                    src={currentImage.processedUrl || currentImage.originalUrl}
                    alt="الصورة المحسنة"
                    className="max-h-[420px] max-w-full object-contain shadow-lg rounded-sm"
                  />
                )}

                {/* Split Comparison Mode (Before / After) */}
                {viewMode === 'split' && (
                  <div className="relative max-h-[420px] overflow-hidden rounded-sm shadow-xl flex items-center justify-center">
                    {/* Processed (After) Image in background */}
                    <img
                      src={currentImage.processedUrl || currentImage.originalUrl}
                      alt="بعد التعديل"
                      className="max-h-[420px] max-w-full block select-none pointer-events-none"
                    />

                    {/* Original (Before) Image clipped */}
                    <div
                      className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-amber-400 z-10"
                      style={{ width: `${splitPos}%` }}
                    >
                      <img
                        src={currentImage.originalUrl}
                        alt="قبل التعديل"
                        className="max-h-[420px] max-w-none block select-none pointer-events-none"
                        style={{ height: '100%' }}
                      />
                      {/* "قبل" Tag */}
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold tracking-wide">
                        قبل
                      </span>
                    </div>

                    {/* "بعد" Tag */}
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-sky-700/80 text-white text-[10px] font-bold tracking-wide z-0">
                      بعد
                    </span>

                    {/* Split Handle Divider */}
                    <div
                      className="absolute inset-y-0 z-20 flex items-center justify-center cursor-ew-resize"
                      style={{ left: `calc(${splitPos}% - 14px)` }}
                      onMouseDown={handleSplitMouseDown}
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-900 shadow-md flex items-center justify-center ring-2 ring-white">
                        <SplitSquareVertical className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 mb-3">
              <Eye className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              لا توجد صورة محددة حالياً
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              قم بفتح صورة من جهازك، أو اختر أحد نماذج الاستوديو الجاهزة للبدء في المعالجة.
            </p>
            <button
              type="button"
              onClick={onUploadClick}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs"
            >
              فتح صورة من الكمبيوتر
            </button>
          </div>
        )}
      </div>

      {/* Specifications & Print Readiness Bar */}
      {currentImage && printSpec && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">الأبعاد الأصلية:</span>
            <span className="font-mono font-bold text-slate-800">
              {currentImage.width} × {currentImage.height} بكسل
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">أبعاد الحفظ الحالية:</span>
            <span className="font-mono font-bold text-sky-700">
              {currentImage.processedWidth} × {currentImage.processedHeight} بكسل
              {options.sizeMode === 'original' && ' (الحجم الأصلي)'}
              {options.sizeMode === 'manual' && ' (قص يدوي)'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">
              {options.sizeMode === 'a6' ? 'مقاس طباعة A6:' : 'وضع المقاس:'}
            </span>
            <span className="font-bold text-amber-900 font-mono">
              {options.sizeMode === 'a6'
                ? `${printSpec.widthCm} × ${printSpec.heightCm} سم`
                : options.sizeMode === 'original'
                ? 'الحجم الأصلي للصورة'
                : 'قص يدوي مخصص'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">جاهزية الطباعة:</span>
            <div className="flex items-center gap-1 font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{printSpec.qualityRating} ({printSpec.dpi} DPI)</span>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Image Thumbnails Gallery Strip */}
      {images.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
            <span>معرض الصور المفتوحة في الاستوديو ({images.length}):</span>
            <span className="text-[11px] text-slate-400">انقر للتنقل بين الصور</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
            {images.map((img, idx) => (
              <div
                key={img.id}
                onClick={() => onSelectImage(idx)}
                className={`group relative w-16 h-20 rounded-lg overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                  idx === activeImageIndex
                    ? 'border-amber-400 ring-2 ring-amber-200 shadow-xs'
                    : 'border-slate-200 hover:border-sky-300 opacity-80 hover:opacity-100'
                }`}
              >
                <img
                  src={img.processedUrl || img.originalUrl}
                  alt={img.name}
                  className="w-full h-full object-cover"
                />

                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center truncate px-0.5">
                  #{idx + 1}
                </span>

                {/* Delete individual photo button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage(img.id);
                  }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  title="إزالة هذه الصورة من المعرض"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
