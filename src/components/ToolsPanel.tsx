import React, { useRef } from 'react';
import {
  Upload,
  Crop,
  Sparkles,
  Wand2,
  Maximize2,
  CheckSquare,
  Download,
  FolderArchive,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { ImageEnhancementOptions } from '../utils/imageMath';
import { StudioImage } from '../types';

interface ToolsPanelProps {
  currentImage: StudioImage | null;
  totalImages: number;
  options: ImageEnhancementOptions;
  onOptionsChange: (newOptions: ImageEnhancementOptions) => void;
  isManualCrop: boolean;
  onToggleManualCrop: (manual: boolean) => void;
  onResetCrop: () => void;
  onUploadImages: (files: FileList | File[]) => void;
  onApplyToAll: () => void;
  onSaveCurrentImage: () => void;
  onSaveAllZip: () => void;
  onAiClarify: () => void;
  isAiProcessing: boolean;
  isBatchProcessing: boolean;
  onLoadSamples: () => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  currentImage,
  totalImages,
  options,
  onOptionsChange,
  isManualCrop,
  onToggleManualCrop,
  onResetCrop,
  onUploadImages,
  onApplyToAll,
  onSaveCurrentImage,
  onSaveAllZip,
  onAiClarify,
  isAiProcessing,
  isBatchProcessing,
  onLoadSamples,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdvancedColors, setShowAdvancedColors] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadImages(e.target.files);
      // Reset input so re-selecting same file fires change
      e.target.value = '';
    }
  };

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  // 1-Click Auto Vibrant Colors
  const handleToggleAutoVibrant = () => {
    const isCurrentlyVibrant = options.vibrance >= 35 && options.contrast >= 15;
    if (isCurrentlyVibrant) {
      // Toggle back to natural
      onOptionsChange({
        ...options,
        vibrance: 10,
        contrast: 0,
        saturation: 0,
        brightness: 0,
      });
    } else {
      // Apply vibrant studio colors
      onOptionsChange({
        ...options,
        vibrance: 45,
        contrast: 20,
        saturation: 20,
        brightness: 6,
      });
    }
  };

  // 1-Click 1080p Resolution Boost
  const handleToggle1080p = () => {
    onOptionsChange({
      ...options,
      targetResolution1080p: !options.targetResolution1080p,
    });
  };

  // 1-Click A6 Auto vs Manual Crop
  const handleToggleA6Mode = (manual: boolean) => {
    onToggleManualCrop(manual);
    if (!options.cropToA6) {
      onOptionsChange({
        ...options,
        cropToA6: true,
      });
    }
  };

  const handleToggleA6Orientation = () => {
    onOptionsChange({
      ...options,
      cropToA6: true,
      a6Orientation: options.a6Orientation === 'portrait' ? 'landscape' : 'portrait',
    });
  };

  const isVibrantActive = options.vibrance >= 30;

  return (
    <aside className="w-full lg:w-96 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col gap-3 text-slate-800 shrink-0">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
        aria-label="اختيار ملفات الصور من الكمبيوتر"
      />

      {/* Block Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            البلوك الأول: الأدوات
          </h2>
        </div>
        <button
          type="button"
          onClick={onLoadSamples}
          className="text-xs font-medium text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition-colors border border-sky-200"
          title="تحميل نماذج استوديو جاهزة للتجربة السريعة"
        >
          نماذج جاهزة
        </button>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-210px)] pr-0.5">
        {/* Tool 1: إضافة صورة أو فتح الصورة */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">
            1. إضافة صورة أو فتح الصورة
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleOpenFileDialog}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs shadow-xs transition-all active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>فتح صورة من الجهاز</span>
            </button>
            <button
              type="button"
              onClick={handleOpenFileDialog}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-medium text-xs transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>إضافة مجموعة صور</span>
            </button>
          </div>
        </div>

        {/* Tool 2: خيارات حجم الصورة والقص (حجم أصلي / مقاس A6 / قص يدوي) */}
        <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Crop className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-slate-800">
                2. حجم الصورة والقص
              </span>
            </div>
            <span className="text-[10px] text-sky-800 font-semibold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
              {options.sizeMode === 'original'
                ? 'الحجم الأصلي'
                : options.sizeMode === 'manual' || isManualCrop
                ? 'قص يدوي'
                : 'مقاس A6'}
            </span>
          </div>

          {/* 3 Main Modes: حجم أصلي | مقاس A6 | قص يدوي */}
          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            {/* خاصية حجم الصورة الأصلي */}
            <button
              type="button"
              onClick={() => {
                onToggleManualCrop(false);
                onOptionsChange({
                  ...options,
                  sizeMode: 'original',
                  cropToA6: false,
                });
              }}
              className={`py-1.5 px-1.5 rounded-md text-center transition-all ${
                options.sizeMode === 'original' && !isManualCrop
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="الحفاظ على الحجم والأبعاد الأصلية للصورة دون قص"
            >
              الحجم الأصلي
            </button>

            {/* مقاس A6 فوتوغرافي */}
            <button
              type="button"
              onClick={() => {
                onToggleManualCrop(false);
                onOptionsChange({
                  ...options,
                  sizeMode: 'a6',
                  cropToA6: true,
                });
              }}
              className={`py-1.5 px-1.5 rounded-md text-center transition-all ${
                options.sizeMode === 'a6' && !isManualCrop
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="قص الصورة تلقائياً بمقاس A6 المعياري للطباعة (105 × 148 مم)"
            >
              مقاس A6
            </button>

            {/* خاصية القص اليدوي */}
            <button
              type="button"
              onClick={() => {
                onToggleManualCrop(true);
                onOptionsChange({
                  ...options,
                  sizeMode: 'manual',
                  cropToA6: false,
                });
              }}
              className={`py-1.5 px-1.5 rounded-md text-center transition-all ${
                isManualCrop || options.sizeMode === 'manual'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="تفعيل إطار القص اليدوي التفاعلي لتحديد الجزء المطلوب بالماوس"
            >
              القص اليدوي
            </button>
          </div>

          {/* Sub-controls based on active size mode */}
          {options.sizeMode === 'original' && !isManualCrop && (
            <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-200/60 text-[11px] text-sky-900 flex items-center justify-between">
              <span>يتم استخدام أبعاد الصورة الأصلية كاملة دون أي اقتطاع.</span>
              {currentImage && (
                <span className="font-mono font-bold shrink-0">
                  {currentImage.width} × {currentImage.height} px
                </span>
              )}
            </div>
          )}

          {options.sizeMode === 'a6' && !isManualCrop && (
            <div className="flex items-center justify-between text-xs pt-0.5">
              <button
                type="button"
                onClick={handleToggleA6Orientation}
                className="flex items-center gap-1.5 text-sky-700 hover:text-sky-900 font-medium text-xs"
              >
                <RotateCw className="w-3 h-3" />
                <span>
                  الاتجاه: {options.a6Orientation === 'portrait' ? 'طولي (105 × 148 مم)' : 'عرضي (148 × 105 مم)'}
                </span>
              </button>
              <span className="text-[10px] text-slate-500 font-mono">105:148</span>
            </div>
          )}

          {(isManualCrop || options.sizeMode === 'manual') && (
            <div className="flex flex-col gap-1.5 pt-0.5">
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950 leading-snug">
                ✂️ <strong className="font-bold">أداة القص اليدوي نشطة:</strong> اسحب وحرّك زوايا إطار التحديد الظاهر على الصورة في نافذة المعاينة.
              </div>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={onResetCrop}
                  className="text-xs text-sky-700 hover:text-sky-900 font-medium underline"
                >
                  إعادة ضبط إطار القص
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleManualCrop(false);
                    onOptionsChange({ ...options, sizeMode: 'original', cropToA6: false });
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  إلغاء والعودة للأصل
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tool 3: زر الألوان التلقائية الزاهية */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-amber-950">
                3. الألوان التلقائية الزاهية
              </span>
            </div>
            <span className="text-[10px] text-amber-800 font-medium bg-amber-100/60 px-1.5 py-0.5 rounded">
              ألوان استوديو غنية
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleAutoVibrant}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
              isVibrantActive
                ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-300'
                : 'bg-white hover:bg-amber-100/60 text-slate-700 border border-amber-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>
              {isVibrantActive ? '✓ الألوان الزاهية مفعلة' : 'تفعيل الألوان التلقائية الزاهية'}
            </span>
          </button>

          {/* Quick fine-tuning toggle */}
          <button
            type="button"
            onClick={() => setShowAdvancedColors(!showAdvancedColors)}
            className="flex items-center justify-between text-[11px] text-amber-900/80 hover:text-amber-950 pt-0.5"
          >
            <span>ضبط التشبع والتباين يدوياً</span>
            {showAdvancedColors ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showAdvancedColors && (
            <div className="flex flex-col gap-2 pt-1.5 border-t border-amber-200/60 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <span>حيوية الألوان (Vibrance):</span>
                  <span className="font-mono font-bold text-slate-800">{options.vibrance}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={options.vibrance}
                  onChange={(e) => onOptionsChange({ ...options, vibrance: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-0.5">
                  <span>التباين (Contrast):</span>
                  <span className="font-mono font-bold text-slate-800">{options.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="40"
                  value={options.contrast}
                  onChange={(e) => onOptionsChange({ ...options, contrast: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tool 4: زر توضيح الصورة بالذكاء الاصطناعي مع تفعيل خاصية عدم تغيير ملامح الصورة والوجه */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-sky-50/60 border border-sky-200/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-xs font-bold text-sky-950">
                4. توضيح الصورة بالذكاء الاصطناعي
              </span>
            </div>
            <span className="text-[10px] text-sky-800 font-semibold bg-sky-100/70 px-1.5 py-0.5 rounded">
              AI Clarity
            </span>
          </div>

          {/* Critical Feature Guarantee Checkbox (عدم تغير ملامح الصورة والوجه) */}
          <label className="flex items-start gap-2 p-2 rounded-lg bg-white border border-sky-200/80 cursor-pointer">
            <input
              type="checkbox"
              checked={options.preserveSkinTones}
              onChange={(e) => onOptionsChange({ ...options, preserveSkinTones: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-sky-600 accent-sky-600 focus:ring-sky-400"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
                تفعيل خاصية عدم تغيير ملامح الصورة والوجه
              </span>
              <span className="text-[11px] text-slate-500 leading-tight">
                حماية ملامح وهوية الوجه 100% دون أي تشويه أو تعديل.
              </span>
            </div>
          </label>

          <button
            type="button"
            onClick={onAiClarify}
            disabled={isAiProcessing || !currentImage}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
          >
            {isAiProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>جاري التحليل والتوضيح بالذكاء الاصطناعي...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>توضيح الصورة بالذكاء الاصطناعي الآن</span>
              </>
            )}
          </button>

          {currentImage?.aiAdvice && (
            <div className="p-1.5 rounded-lg bg-sky-100/60 border border-sky-200 text-[11px] text-sky-900 leading-tight">
              💡 {currentImage.aiAdvice}
            </div>
          )}
        </div>

        {/* Tool 5: زر زيادة دقة الصورة الى 1080 بكسل دقة عالية جدا */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-xs font-bold text-slate-900">
                5. دقة الصورة وجودة الإخراج
              </span>
            </div>
            <span className="text-[10px] text-slate-600 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
              {options.targetResolution1080p ? 'Full HD+' : 'الدقة الأصلية'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onOptionsChange({ ...options, targetResolution1080p: false })}
              className={`py-1.5 px-2 rounded-md transition-all ${
                !options.targetResolution1080p
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="الاحتفاظ بأبعاد ودقة الصورة الأصلية دون أي زيادة أو تصغير"
            >
              دقة الصورة الأصلية
            </button>
            <button
              type="button"
              onClick={() => onOptionsChange({ ...options, targetResolution1080p: true })}
              className={`py-1.5 px-2 rounded-md transition-all ${
                options.targetResolution1080p
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="زيادة دقة الصورة إلى 1080p+ فائقة بأعلى جودة للاستوديو"
            >
              زيادة إلى 1080p+
            </button>
          </div>

          <p className="text-[11px] text-slate-500 pt-0.5">
            {options.targetResolution1080p
              ? '✓ يتم رفع جودة ودقة الصورة تلقائياً لتكون 1080 بكسل على الأقل بجودة استوديو 300 DPI.'
              : '✓ يتم حفظ الصورة بأبعادها وبكسلاتها الأصلية كاملة كما تم التقاطها.'}
          </p>
        </div>

        {/* Tool 6: خيار تطبيق الإعدادات على الصور جميعها */}
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-amber-50/40 border border-amber-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-slate-900">
                6. خيار تطبيق الإعدادات على الصور جميعها
              </span>
            </div>
            <span className="text-[11px] text-amber-900 font-bold font-mono">
              ({totalImages} صور)
            </span>
          </div>

          <button
            type="button"
            onClick={onApplyToAll}
            disabled={isBatchProcessing || totalImages === 0}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
          >
            {isBatchProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-900" />
                <span>جاري معالجة كافة الصور...</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                <span>تطبيق كافة الإعدادات على الصور جميعها</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tool 7: زر حفظ الصورة بدقة عالية في الكمبيوتر (ثابت بالأسفل) */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">
            7. حفظ وتنزيل الصورة في الكمبيوتر
          </span>
          <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
            300 DPI جاهز للطباعة
          </span>
        </div>
        <button
          type="button"
          onClick={onSaveCurrentImage}
          disabled={!currentImage}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>حفظ الصورة بدقة عالية في الكمبيوتر</span>
        </button>

        {totalImages > 1 && (
          <button
            type="button"
            onClick={onSaveAllZip}
            disabled={isBatchProcessing}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
          >
            <FolderArchive className="w-3.5 h-3.5 text-slate-600" />
            <span>تنزيل جميع الصور معاً ({totalImages}) بصيغة ZIP</span>
          </button>
        )}
      </div>
    </aside>
  );
};
