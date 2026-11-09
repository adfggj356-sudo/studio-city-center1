import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Check, X, RotateCcw, Maximize2 } from 'lucide-react';
import { CropRect, CropPreset, A6_ASPECT_RATIO_PORTRAIT, A6_ASPECT_RATIO_LANDSCAPE } from '../utils/imageMath';

interface InteractiveCropOverlayProps {
  naturalWidth: number;
  naturalHeight: number;
  containerWidth: number;
  containerHeight: number;
  crop: CropRect;
  onChange: (crop: CropRect) => void;
  preset: CropPreset;
  onPresetChange: (preset: CropPreset) => void;
  onApply: () => void;
  onCancel: () => void;
  onResetFull: () => void;
}

export const InteractiveCropOverlay: React.FC<InteractiveCropOverlayProps> = ({
  naturalWidth,
  naturalHeight,
  containerWidth,
  containerHeight,
  crop,
  onChange,
  preset,
  onPresetChange,
  onApply,
  onCancel,
  onResetFull,
}) => {
  // Convert natural crop coordinates to container visual coordinates
  const scale = containerWidth / naturalWidth;

  const visualX = crop.x * scale;
  const visualY = crop.y * scale;
  const visualW = crop.width * scale;
  const visualH = crop.height * scale;

  const [isDragging, setIsDragging] = useState<string | null>(null); // 'move' or handle name e.g. 'nw', 'se'
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialCrop: CropRect;
  }>({
    startX: 0,
    startY: 0,
    initialCrop: crop,
  });

  const getTargetRatio = (p: CropPreset): number | null => {
    switch (p) {
      case 'a6_portrait':
        return A6_ASPECT_RATIO_PORTRAIT;
      case 'a6_landscape':
        return A6_ASPECT_RATIO_LANDSCAPE;
      case 'square':
        return 1;
      case 'original':
        return naturalWidth / naturalHeight;
      case 'free':
      default:
        return null;
    }
  };

  const handleMouseDown = (action: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(action);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...crop },
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = (e.clientX - dragStartRef.current.startX) / scale;
      const deltaY = (e.clientY - dragStartRef.current.startY) / scale;
      const init = dragStartRef.current.initialCrop;
      const ratio = getTargetRatio(preset);

      let newX = init.x;
      let newY = init.y;
      let newW = init.width;
      let newH = init.height;

      if (isDragging === 'move') {
        newX = Math.max(0, Math.min(naturalWidth - init.width, init.x + deltaX));
        newY = Math.max(0, Math.min(naturalHeight - init.height, init.y + deltaY));
      } else if (isDragging === 'se') {
        // Bottom Right
        newW = Math.max(40, Math.min(naturalWidth - init.x, init.width + deltaX));
        if (ratio) {
          newH = newW / ratio;
          if (newY + newH > naturalHeight) {
            newH = naturalHeight - newY;
            newW = newH * ratio;
          }
        } else {
          newH = Math.max(40, Math.min(naturalHeight - init.y, init.height + deltaY));
        }
      } else if (isDragging === 'sw') {
        // Bottom Left
        const maxDelta = init.x + init.width - 40;
        newX = Math.max(0, Math.min(maxDelta, init.x + deltaX));
        newW = init.width + (init.x - newX);
        if (ratio) {
          newH = newW / ratio;
          if (newY + newH > naturalHeight) {
            newH = naturalHeight - newY;
            newW = newH * ratio;
            newX = init.x + init.width - newW;
          }
        } else {
          newH = Math.max(40, Math.min(naturalHeight - init.y, init.height + deltaY));
        }
      } else if (isDragging === 'ne') {
        // Top Right
        newW = Math.max(40, Math.min(naturalWidth - init.x, init.width + deltaX));
        if (ratio) {
          newH = newW / ratio;
          newY = init.y + init.height - newH;
          if (newY < 0) {
            newY = 0;
            newH = init.y + init.height;
            newW = newH * ratio;
          }
        } else {
          newY = Math.max(0, Math.min(init.y + init.height - 40, init.y + deltaY));
          newH = init.height + (init.y - newY);
        }
      } else if (isDragging === 'nw') {
        // Top Left
        newX = Math.max(0, Math.min(init.x + init.width - 40, init.x + deltaX));
        newW = init.width + (init.x - newX);
        if (ratio) {
          newH = newW / ratio;
          newY = init.y + init.height - newH;
          if (newY < 0) {
            newY = 0;
            newH = init.y + init.height;
            newW = newH * ratio;
            newX = init.x + init.width - newW;
          }
        } else {
          newY = Math.max(0, Math.min(init.y + init.height - 40, init.y + deltaY));
          newH = init.height + (init.y - newY);
        }
      }

      onChange({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    },
    [isDragging, naturalWidth, naturalHeight, scale, preset, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden"
      style={{ width: containerWidth, height: containerHeight }}
    >
      {/* Darkened mask around the crop area */}
      <div
        className="absolute bg-black/60 transition-opacity"
        style={{ top: 0, left: 0, width: '100%', height: Math.max(0, visualY) }}
      />
      <div
        className="absolute bg-black/60 transition-opacity"
        style={{
          top: Math.max(0, visualY),
          left: 0,
          width: Math.max(0, visualX),
          height: visualH,
        }}
      />
      <div
        className="absolute bg-black/60 transition-opacity"
        style={{
          top: Math.max(0, visualY),
          left: visualX + visualW,
          right: 0,
          height: visualH,
        }}
      />
      <div
        className="absolute bg-black/60 transition-opacity"
        style={{
          top: visualY + visualH,
          left: 0,
          width: '100%',
          bottom: 0,
        }}
      />

      {/* Interactive Crop Frame Box */}
      <div
        className="absolute border-2 border-amber-400 shadow-2xl pointer-events-auto cursor-move flex flex-col justify-between"
        style={{
          left: visualX,
          top: visualY,
          width: visualW,
          height: visualH,
        }}
        onMouseDown={(e) => handleMouseDown('move', e)}
      >
        {/* Rule of Thirds Lines */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
          <div className="border-r border-b border-white/60"></div>
          <div className="border-r border-b border-white/60"></div>
          <div className="border-b border-white/60"></div>
          <div className="border-r border-b border-white/60"></div>
          <div className="border-r border-b border-white/60"></div>
          <div className="border-b border-white/60"></div>
          <div className="border-r border-white/60"></div>
          <div className="border-r border-white/60"></div>
          <div></div>
        </div>

        {/* Live Crop Dimensions Tag */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 text-amber-300 text-[11px] font-mono px-2 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none">
          {crop.width} × {crop.height} px
        </div>

        {/* 4 Corner Resize Handles */}
        <div
          className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-white rounded-xs cursor-nwse-resize shadow-xs"
          onMouseDown={(e) => handleMouseDown('nw', e)}
        />
        <div
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-white rounded-xs cursor-nesw-resize shadow-xs"
          onMouseDown={(e) => handleMouseDown('ne', e)}
        />
        <div
          className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-white rounded-xs cursor-nesw-resize shadow-xs"
          onMouseDown={(e) => handleMouseDown('sw', e)}
        />
        <div
          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-white rounded-xs cursor-nwse-resize shadow-xs"
          onMouseDown={(e) => handleMouseDown('se', e)}
        />
      </div>

      {/* Crop Controls Floating Toolbar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-800 text-[11px]">النسبة:</span>

        {/* Preset Selectors */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
          <button
            type="button"
            onClick={() => onPresetChange('free')}
            className={`px-2 py-0.5 rounded transition-colors ${
              preset === 'free' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            قص حر
          </button>
          <button
            type="button"
            onClick={() => onPresetChange('a6_portrait')}
            className={`px-2 py-0.5 rounded transition-colors ${
              preset === 'a6_portrait' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            A6 طولي
          </button>
          <button
            type="button"
            onClick={() => onPresetChange('a6_landscape')}
            className={`px-2 py-0.5 rounded transition-colors ${
              preset === 'a6_landscape' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            A6 عرضي
          </button>
          <button
            type="button"
            onClick={() => onPresetChange('square')}
            className={`px-2 py-0.5 rounded transition-colors ${
              preset === 'square' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1:1 مربع
          </button>
          <button
            type="button"
            onClick={() => onPresetChange('original')}
            className={`px-2 py-0.5 rounded transition-colors ${
              preset === 'original' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            النسبة الأصلية
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
          <button
            type="button"
            onClick={onResetFull}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
            title="تحديد الصورة بالكامل"
          >
            <Maximize2 className="w-3 h-3" />
            <span>كامل الصورة</span>
          </button>

          <button
            type="button"
            onClick={onApply}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>تطبيق القص</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            title="إلغاء أداة القص"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
