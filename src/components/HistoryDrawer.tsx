import React from 'react';
import { History, Play, Trash2, Download, Music, Clock } from 'lucide-react';
import { GeneratedSpeech } from '../types';

interface HistoryDrawerProps {
  history: GeneratedSpeech[];
  onSelectSpeech: (speech: GeneratedSpeech) => void;
  onClearHistory: () => void;
  activeSpeechId?: string;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  history,
  onSelectSpeech,
  onClearHistory,
  activeSpeechId,
}) => {
  if (history.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
        <p className="text-sm">មិនទាន់មានប្រវត្តិនៃការបម្លែងសំឡេងនៅឡើយទេ</p>
        <p className="text-xs text-slate-500 mt-1">
          រាល់សំឡេងដែលអ្នកបានបម្លែងនឹងត្រូវបានរក្សាទុកនៅទីនេះដោយស្វ័យប្រវត្តិ
        </p>
      </div>
    );
  }

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'អម្បាញ់មិញ';
    if (diff < 3600) return `${Math.floor(diff / 60)} នាទីមុន`;
    return `${Math.floor(diff / 3600)} ម៉ោងមុន`;
  };

  const handleDownload = (speech: GeneratedSpeech, format: 'mp3' | 'wav', e: React.MouseEvent) => {
    e.stopPropagation();
    const isMp3 = format === 'mp3';
    const base64Data = isMp3 ? speech.mp3Base64 : speech.wavBase64;
    const mime = isMp3 ? 'audio/mp3' : 'audio/wav';
    const ext = isMp3 ? 'mp3' : 'wav';

    if (!base64Data) return;

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `khmer_tts_${speech.voice.toLowerCase()}_${speech.timestamp}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
          <History className="w-4 h-4 text-indigo-400" />
          <span>ប្រវត្តិសំឡេងដែលបានបង្កើត ({history.length})</span>
        </h3>
        <button
          onClick={onClearHistory}
          className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
          title="លុបប្រវត្តិទាំងអស់"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>សម្អាត</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {history.map((item) => {
          const isActive = item.id === activeSpeechId;
          const isFemale = item.gender === 'female';

          return (
            <div
              key={item.id}
              onClick={() => onSelectSpeech(item)}
              className={`group p-3 rounded-xl border cursor-pointer transition-all text-left flex items-start justify-between gap-2 ${
                isActive
                  ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/40'
                  : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                      isFemale
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    }`}
                  >
                    {item.isDialogue ? 'សន្ទនា' : isFemale ? 'ស្រី' : 'ប្រុស'}
                  </span>
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {item.voice}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    • {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1 font-khmer">
                  {item.text}
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  {item.durationSeconds}s
                </div>
              </div>

              {/* Direct Quick Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleDownload(item, 'mp3', e)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600/30 text-slate-400 hover:text-emerald-300 transition-colors"
                  title="ទាញយកជា MP3"
                >
                  <span className="text-[10px] font-bold">MP3</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDownload(item, 'wav', e)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-600/30 text-slate-400 hover:text-amber-300 transition-colors"
                  title="ទាញយកជា WAV"
                >
                  <span className="text-[10px] font-bold">WAV</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
