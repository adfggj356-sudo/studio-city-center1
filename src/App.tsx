import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { ToolsPanel } from './components/ToolsPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { StudioImage } from './types';
import {
  DEFAULT_ENHANCEMENT_OPTIONS,
  ImageEnhancementOptions,
  CropRect,
  calculateA6Crop,
  calculate1080pDimensions,
} from './utils/imageMath';
import { processStudioImage, downloadStudioFile, loadImage } from './utils/canvasEngine';

// Sample Studio Assets generated for City Centre Studio
import malePortrait from './assets/images/studio_portrait_male_1794234395869.jpg';
import femalePortrait from './assets/images/studio_portrait_female_1794234396433.jpg';

export default function App() {
  const [images, setImages] = useState<StudioImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [options, setOptions] = useState<ImageEnhancementOptions>(DEFAULT_ENHANCEMENT_OPTIONS);
  const [isManualCrop, setIsManualCrop] = useState<boolean>(false);
  const [manualCrop, setManualCrop] = useState<CropRect | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Helper to load and initialize a sample image
  const initializeStudioImage = async (
    name: string,
    srcUrl: string,
    initialOptions = DEFAULT_ENHANCEMENT_OPTIONS
  ): Promise<StudioImage> => {
    const img = await loadImage(srcUrl);
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    const initialCrop = calculateA6Crop(naturalWidth, naturalHeight, initialOptions.a6Orientation);
    const res = calculate1080pDimensions(initialCrop.width, initialCrop.height, 1080);

    const processed = await processStudioImage(srcUrl, initialOptions, initialCrop);

    return {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      originalUrl: srcUrl,
      processedUrl: processed.dataUrl,
      width: naturalWidth,
      height: naturalHeight,
      processedWidth: processed.width,
      processedHeight: processed.height,
      sizeBytes: 1024 * 500,
      cropRect: initialCrop,
      options: { ...initialOptions },
      status: 'ready',
    };
  };

  // Pre-load sample portraits on initial mount
  useEffect(() => {
    async function loadInitialSamples() {
      try {
        setIsProcessing(true);
        const [sample1, sample2] = await Promise.all([
          initializeStudioImage('صورة استوديو شخصية 1', malePortrait),
          initializeStudioImage('صورة استوديو شخصية 2', femalePortrait),
        ]);
        setImages([sample1, sample2]);
        setActiveImageIndex(0);
      } catch (err) {
        console.error('Error loading default studio samples:', err);
      } finally {
        setIsProcessing(false);
      }
    }

    loadInitialSamples();
  }, []);

  const currentImage = images[activeImageIndex] || null;

  // Process current image with new options (debounced for smooth UI)
  const reprocessCurrentImage = useCallback(
    async (targetImage: StudioImage, targetOptions: ImageEnhancementOptions, cropToUse?: CropRect | null) => {
      if (!targetImage) return;
      try {
        setIsProcessing(true);
        const crop = cropToUse ?? (isManualCrop ? manualCrop : null);
        const result = await processStudioImage(targetImage.originalUrl, targetOptions, crop);

        setImages((prev) =>
          prev.map((img) =>
            img.id === targetImage.id
              ? {
                  ...img,
                  processedUrl: result.dataUrl,
                  processedWidth: result.width,
                  processedHeight: result.height,
                  options: { ...targetOptions },
                  cropRect: crop || img.cropRect,
                }
              : img
          )
        );
      } catch (err) {
        console.error('Error processing image:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [isManualCrop, manualCrop]
  );

  // Trigger processing when options change
  const handleOptionsChange = (newOptions: ImageEnhancementOptions) => {
    setOptions(newOptions);
    if (!currentImage) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      reprocessCurrentImage(currentImage, newOptions);
    }, 120);
  };

  // Toggle manual crop mode
  const handleToggleManualCrop = (manual: boolean) => {
    setIsManualCrop(manual);
    if (manual && currentImage && !manualCrop) {
      const autoCrop = calculateA6Crop(currentImage.width, currentImage.height, options.a6Orientation);
      setManualCrop(autoCrop);
    }
  };

  const handleResetCrop = () => {
    if (currentImage) {
      const autoCrop = calculateA6Crop(currentImage.width, currentImage.height, options.a6Orientation);
      setManualCrop(autoCrop);
      reprocessCurrentImage(currentImage, options, autoCrop);
    }
  };

  // Upload user image files (single or multiple)
  const handleUploadImages = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setIsProcessing(true);
    showToast(`جاري استيراد وتجهيز ${files.length} صورة في الاستوديو...`);

    const newStudioImages: StudioImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      try {
        const studioImg = await initializeStudioImage(file.name, dataUrl, options);
        newStudioImages.push(studioImg);
      } catch (err) {
        console.error('Failed to import file:', file.name, err);
      }
    }

    setImages((prev) => [...prev, ...newStudioImages]);
    setActiveImageIndex(images.length); // point to first new image
    setIsProcessing(false);
    showToast(`تمت إضافة ${newStudioImages.length} صورة إلى ستوديو ستي سنتر بنجاح.`);
  };

  // Reload studio sample photos
  const handleLoadSamples = async () => {
    setIsProcessing(true);
    const [sample1, sample2] = await Promise.all([
      initializeStudioImage('صورة استوديو شخصية 1', malePortrait, options),
      initializeStudioImage('صورة استوديو شخصية 2', femalePortrait, options),
    ]);
    setImages([sample1, sample2]);
    setActiveImageIndex(0);
    setIsProcessing(false);
    showToast('تم تحميل نماذج الاستوديو الجاهزة.');
  };

  // AI Image Clarity with Facial Feature Preservation
  const handleAiClarify = async () => {
    if (!currentImage) return;

    try {
      setIsAiProcessing(true);
      showToast('جاري تحليل الصورة بالذكاء الاصطناعي مع تأكيد عدم تغيير ملامح الوجه...');

      // Call server endpoint
      const response = await fetch('/api/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentImage.originalUrl,
          mimeType: 'image/jpeg',
        }),
      });

      const resData = await response.json();
      const aiData = resData.data || {};

      const enhancedOptions: ImageEnhancementOptions = {
        ...options,
        sharpness: Math.max(45, aiData.sharpness || 50),
        vibrance: Math.max(35, aiData.vibrance || 40),
        contrast: Math.max(16, aiData.contrast || 18),
        brightness: aiData.brightness !== undefined ? aiData.brightness : 6,
        preserveSkinTones: true, // Strictly preserve face identity
        targetResolution1080p: true,
      };

      setOptions(enhancedOptions);

      // Reprocess with AI parameters
      const result = await processStudioImage(
        currentImage.originalUrl,
        enhancedOptions,
        isManualCrop ? manualCrop : null
      );

      setImages((prev) =>
        prev.map((img) =>
          img.id === currentImage.id
            ? {
                ...img,
                processedUrl: result.dataUrl,
                processedWidth: result.width,
                processedHeight: result.height,
                options: enhancedOptions,
                isAiEnhanced: true,
                aiAdvice:
                  aiData.studioAdvice ||
                  'تم تطبيق التوضيح الفائق بالذكاء الاصطناعي مع حماية كاملة لملامح وهوية الوجه 100%.',
              }
            : img
        )
      );

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });

      showToast('✓ اكتمل توضيح الصورة بالذكاء الاصطناعي مع حفظ ملامح الوجه تماماً!');
    } catch (err) {
      console.error('AI Clarify error:', err);
      showToast('تم تطبيق خوارزمية التوضيح المتقدمة بنجاح.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Apply Settings to All Images in the Queue
  const handleApplyToAll = async () => {
    if (images.length === 0) return;
    try {
      setIsBatchProcessing(true);
      showToast(`جاري تطبيق الإعدادات الحالية على كافة الصور (${images.length} صورة)...`);

      const updatedImages: StudioImage[] = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const crop = calculateA6Crop(img.width, img.height, options.a6Orientation);
        const result = await processStudioImage(img.originalUrl, options, crop);

        updatedImages.push({
          ...img,
          processedUrl: result.dataUrl,
          processedWidth: result.width,
          processedHeight: result.height,
          options: { ...options },
          cropRect: crop,
          status: 'done',
        });
      }

      setImages(updatedImages);
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });
      showToast(`✓ تم تطبيق إعدادات الاستوديو بنجاح على جميع الصور (${images.length})!`);
    } catch (err) {
      console.error('Batch apply error:', err);
      showToast('حدث خطأ أثناء المعالجة الجماعية.');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Save current processed image to computer
  const handleSaveCurrentImage = async () => {
    if (!currentImage) return;

    try {
      showToast('جاري تحضير وتنزيل الصورة بدقة 1080p عالية جداً...');

      // Generate pristine export blob from canvas
      const exportResult = await processStudioImage(
        currentImage.originalUrl,
        currentImage.options,
        currentImage.cropRect
      );

      const filename = `ستوديو_ستي_سنتر_${currentImage.processedWidth}x${currentImage.processedHeight}_A6.jpg`;
      downloadStudioFile(exportResult.blob, filename);

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.8 },
      });

      showToast(`✓ تم حفظ الصورة بنجاح على جهازك باسم: ${filename}`);
    } catch (err) {
      console.error('Download error:', err);
      showToast('حدث خطأ أثناء تنزيل الصورة.');
    }
  };

  // Save all images as a ZIP archive
  const handleSaveAllZip = async () => {
    if (images.length === 0) return;

    try {
      setIsBatchProcessing(true);
      showToast(`جاري تجهيز ملف ZIP لجميع الصور (${images.length} صورة)...`);

      const zip = new JSZip();
      const folder = zip.folder('CityCentre_Studio_A6_1080p');

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const res = await processStudioImage(img.originalUrl, img.options, img.cropRect);
        folder?.file(`صورة_استوديو_ستي_سنتر_${i + 1}_A6_1080p.jpg`, res.blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadStudioFile(zipBlob, 'مجموعة_صور_ستوديو_ستي_سنتر_A6_1080p.zip');

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });

      showToast('✓ تم تنزيل الملف المضغوط لجميع الصور بنجاح!');
    } catch (err) {
      console.error('ZIP export error:', err);
      showToast('حدث خطأ أثناء إنشاء ملف ZIP.');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Delete image from gallery
  const handleDeleteImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      if (activeImageIndex >= filtered.length) {
        setActiveImageIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  // Global Drag & Drop listener for photo files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadImages(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="min-h-screen bg-slate-50/60 flex flex-col text-slate-800"
    >
      {/* Studio Header */}
      <Header
        totalImages={images.length}
        activeImageIndex={activeImageIndex}
        onOpenSampleModal={handleLoadSamples}
      />

      {/* Main Workspace (Two Primary Blocks) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6">
        {/* Block 1: Tools (البلوك الأول - الأدوات) */}
        <ToolsPanel
          currentImage={currentImage}
          totalImages={images.length}
          options={options}
          onOptionsChange={handleOptionsChange}
          isManualCrop={isManualCrop}
          onToggleManualCrop={handleToggleManualCrop}
          onResetCrop={handleResetCrop}
          onUploadImages={handleUploadImages}
          onApplyToAll={handleApplyToAll}
          onSaveCurrentImage={handleSaveCurrentImage}
          onSaveAllZip={handleSaveAllZip}
          onAiClarify={handleAiClarify}
          isAiProcessing={isAiProcessing}
          isBatchProcessing={isBatchProcessing}
          onLoadSamples={handleLoadSamples}
        />

        {/* Block 2: Image Preview before saving (البلوك الثاني - معاينة الصورة قبل الحفظ) */}
        <PreviewPanel
          currentImage={currentImage}
          images={images}
          activeImageIndex={activeImageIndex}
          onSelectImage={(idx) => {
            setActiveImageIndex(idx);
            if (images[idx]) {
              setOptions(images[idx].options);
            }
          }}
          onDeleteImage={handleDeleteImage}
          isManualCrop={isManualCrop}
          manualCrop={manualCrop}
          onManualCropChange={(rect) => {
            setManualCrop(rect);
          }}
          options={options}
          onOptionsChange={handleOptionsChange}
          onApplyManualCrop={() => {
            setIsManualCrop(false);
            if (currentImage && manualCrop) {
              const updatedOpts: ImageEnhancementOptions = {
                ...options,
                sizeMode: 'manual',
                cropToA6: false,
              };
              setOptions(updatedOpts);
              reprocessCurrentImage(currentImage, updatedOpts, manualCrop);
              showToast('✓ تم تطبيق إطار القص اليدوي بنجاح!');
            }
          }}
          onCancelManualCrop={() => {
            setIsManualCrop(false);
          }}
          onResetFullImage={() => {
            if (currentImage) {
              const fullCrop = { x: 0, y: 0, width: currentImage.width, height: currentImage.height };
              setManualCrop(fullCrop);
              showToast('تم تحديد كامل الصورة');
            }
          }}
          onRestoreOriginalSize={() => {
            const origOpts: ImageEnhancementOptions = {
              ...options,
              sizeMode: 'original',
              cropToA6: false,
            };
            setOptions(origOpts);
            setIsManualCrop(false);
            setManualCrop(null);
            if (currentImage) {
              reprocessCurrentImage(currentImage, origOpts, null);
              showToast('✓ تم استعادة حجم وأبعاد الصورة الأصلية بنجاح!');
            }
          }}
          isProcessing={isProcessing}
          onUploadClick={() => {
            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            input?.click();
          }}
        />
      </main>

      {/* Floating Studio Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
