import React, { useState } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed or running as standalone web app, suppress
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-medium">
        <Check className="w-3.5 h-3.5" />
        <span>Web App បានដំឡើងរួចរាល់</span>
      </div>
    );
  }

  // Chromium / Android / Desktop PWA flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 transition-all transform active:scale-95 border border-cyan-400/40"
        title="ដំឡើង rachtts.studio.kh ជា Web App លើទូរសព្ទ ឬកុំព្យូទ័ររបស់អ្នក"
      >
        <Smartphone className="w-4 h-4 text-cyan-200" />
        <span>ដំឡើង App (Install)</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          title="របៀបដំឡើងលើ iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>ដំឡើងលើ iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    ដំឡើង rachtts.studio.kh លើ iOS
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    iPhone / iPad Safari
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 mb-4">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    1
                  </span>
                  <p>
                    ចុចប៊ូតុង <strong>Share (ចែករំលែក <Share className="inline w-3 h-3 text-cyan-400 mb-0.5" />)</strong> នៅលើរបារឧបករណ៍ Safari ខាងក្រោម។
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    2
                  </span>
                  <p>
                    អូសចុះក្រោម រួចចុចលើ <strong>«Add to Home Screen (បន្ថែមទៅអេក្រង់ដើម <PlusSquare className="inline w-3 h-3 text-amber-400 mb-0.5" />)»</strong>។
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold shrink-0 text-[11px]">
                    3
                  </span>
                  <p>
                    ចុច <strong>«Add (បន្ថែម)»</strong> នៅជ្រុងខាងស្តាំខាងលើជាការស្រេច។
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-bold text-xs shadow-md transition-opacity hover:opacity-90"
              >
                យល់ព្រម (Close)
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback desktop / browser install button
  return (
    <button
      type="button"
      onClick={() => {
        alert(
          'ដើម្បីដំឡើង Web App នេះ៖\n\n• លើ Chrome/Edge (កុំព្យូទ័រ)៖ ចុចលើរូបសញ្ញា Install ឬ icon កុំព្យូទ័រនៅខាងស្តាំនៃរបារ Address Bar\n• លើ Android Chrome៖ ចុចសញ្ញាបីចំនុច (...) រួចជ្រើសរើស «Install app»\n• លើ iPhone Safari៖ ចុច Share រួចជ្រើសរើស «Add to Home Screen»'
        );
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-colors"
      title="ដំឡើងជា Web App"
    >
      <Download className="w-3.5 h-3.5 text-cyan-400" />
      <span>ដំឡើង Web App</span>
    </button>
  );
};
