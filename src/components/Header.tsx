import React from 'react';
import { Camera, ShieldCheck, Sparkles, Image as ImageIcon, Sliders } from 'lucide-react';

interface HeaderProps {
  totalImages: number;
  activeImageIndex: number;
  onOpenSampleModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalImages,
  activeImageIndex,
}) => {
  return (
    <header className="bg-white border-b border-sky-100 shadow-xs px-4 lg:px-8 py-3 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand / Title Zone */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white shadow-sm ring-4 ring-amber-100">
            <Camera className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                ستوديو ستي سنتر
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                إصدار سطح المكتب
              </span>
            </div>
            <p className="text-xs text-slate-500">
              معالجة احترافية للصور الفوتوغرافية وتجهيز طباعة A6 بدقة 1080 بكسل
            </p>
          </div>
        </div>

        {/* Studio Badges (Soft yellow and calm blue accents) */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50/80 border border-sky-200/60 text-sky-800">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>حماية ملامح الوجه 100%</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200/60 text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>ألوان زاهية تلقائية</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            <ImageIcon className="w-4 h-4 text-slate-500" />
            <span>مقاس A6 · 1080p</span>
          </div>
        </div>

        {/* Active Image Indicator */}
        {totalImages > 0 && (
          <div className="text-xs text-slate-500 self-end md:self-auto font-medium">
            الصورة المعروضة: <span className="text-slate-900 font-bold">{activeImageIndex + 1}</span> من <span className="text-slate-900 font-bold">{totalImages}</span>
          </div>
        )}
      </div>
    </header>
  );
};
