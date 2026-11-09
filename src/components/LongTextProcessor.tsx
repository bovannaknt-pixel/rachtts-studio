import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Download,
  Sparkles,
  Layers,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Upload,
  Music,
  Check,
} from 'lucide-react';
import { TextChunk, GeneratedSpeech, VoiceOption, SpeechStyle } from '../types';
import { AudioPlayer } from './AudioPlayer';

interface LongTextProcessorProps {
  text: string;
  voice: VoiceOption;
  style: SpeechStyle;
  customInstruction?: string;
  onMergedSuccess: (speech: GeneratedSpeech) => void;
}

export const LongTextProcessor: React.FC<LongTextProcessorProps> = ({
  text,
  voice,
  style,
  customInstruction = '',
  onMergedSuccess,
}) => {
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const [mergedSpeech, setMergedSpeech] = useState<GeneratedSpeech | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [activePlayingIndex, setActivePlayingIndex] = useState<number | null>(null);

  const audioRefs = useRef<{ [key: number]: HTMLAudioElement }>({});
  const isCancelledRef = useRef(false);

  // Split text into chunks whenever text changes
  useEffect(() => {
    if (!text.trim()) {
      setChunks([]);
      return;
    }

    const splitText = async () => {
      setIsSplitting(true);
      try {
        const res = await fetch('/api/tts/split-chunks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, maxChunkLength: 1200 }),
        });
        const data = await res.json();
        if (data.chunks) {
          setChunks(
            data.chunks.map((c: any) => ({
              ...c,
              status: 'idle',
            }))
          );
        }
      } catch (err) {
        console.error('Failed to split text:', err);
      } finally {
        setIsSplitting(false);
      }
    };

    splitText();
  }, [text]);

  const totalChars = chunks.reduce((sum, c) => sum + c.charCount, 0);
  const totalEstimatedMins = Math.max(1, Math.round(totalChars / 18 / 60));
  const completedChunks = chunks.filter((c) => c.status === 'completed');
  const progressPercent =
    chunks.length > 0 ? Math.round((completedChunks.length / chunks.length) * 100) : 0;

  // Synthesize single chunk with automatic rate limit retry
  const synthesizeChunk = async (chunk: TextChunk): Promise<{ wavBase64: string; mp3Base64: string; durationSeconds: number }> => {
    let retries = 0;
    const maxRetries = 4;

    while (retries < maxRetries) {
      if (isCancelledRef.current) {
        throw new Error('Cancelled by user');
      }

      try {
        const res = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chunk.text,
            voice: voice.id,
            gender: voice.gender,
            style,
            customInstruction,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          return {
            wavBase64: data.wavBase64,
            mp3Base64: data.mp3Base64,
            durationSeconds: data.durationSeconds || chunk.estimatedSeconds,
          };
        }

        const errMsg = data.error || '';
        // If rate limit, wait 12s then retry
        if (errMsg.includes('Rate limit') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          for (let s = 12; s > 0; s--) {
            if (isCancelledRef.current) throw new Error('Cancelled by user');
            setRateLimitCountdown(s);
            await new Promise((r) => setTimeout(r, 1000));
          }
          setRateLimitCountdown(null);
          retries++;
          continue;
        }

        throw new Error(errMsg || 'បរាជ័យក្នុងការបម្លែង');
      } catch (err: any) {
        if (err.message === 'Cancelled by user') throw err;
        if (retries >= maxRetries - 1) throw err;
        retries++;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    throw new Error('លើសចំនួនដងនៃការសាកល្បង');
  };

  // Start sequential processing
  const startProcessing = async () => {
    if (chunks.length === 0) return;
    setIsProcessing(true);
    setIsPaused(false);
    isCancelledRef.current = false;

    const updatedChunks = [...chunks];

    for (let i = 0; i < updatedChunks.length; i++) {
      if (isCancelledRef.current) break;

      // Skip already completed chunks
      if (updatedChunks[i].status === 'completed') continue;

      setCurrentIndex(i);
      updatedChunks[i] = { ...updatedChunks[i], status: 'loading' };
      setChunks([...updatedChunks]);

      try {
        const result = await synthesizeChunk(updatedChunks[i]);
        updatedChunks[i] = {
          ...updatedChunks[i],
          status: 'completed',
          wavBase64: result.wavBase64,
          mp3Base64: result.mp3Base64,
          durationSeconds: result.durationSeconds,
        };
        setChunks([...updatedChunks]);
      } catch (err: any) {
        if (isCancelledRef.current) break;
        updatedChunks[i] = {
          ...updatedChunks[i],
          status: 'error',
          error: err.message || 'កំហុសបច្ចេកទេស',
        };
        setChunks([...updatedChunks]);
      }

      // Small pacing delay between requests to be gentle on rate limits
      await new Promise((r) => setTimeout(r, 1500));
    }

    setIsProcessing(false);
    setCurrentIndex(-1);

    // If all completed, merge!
    const allDone = updatedChunks.every((c) => c.status === 'completed');
    if (allDone) {
      await handleMerge(updatedChunks);
    }
  };

  const pauseProcessing = () => {
    isCancelledRef.current = true;
    setIsProcessing(false);
    setIsPaused(true);
    setCurrentIndex(-1);
    setRateLimitCountdown(null);
  };

  // Merge all WAV chunks into unified master file
  const handleMerge = async (chunksToMerge = chunks) => {
    const completed = chunksToMerge.filter((c) => c.status === 'completed' && c.wavBase64);
    if (completed.length === 0) return;

    setIsMerging(true);
    try {
      const wavChunks = completed.map((c) => c.wavBase64 as string);
      const res = await fetch('/api/tts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wavChunks,
          text: text.slice(0, 150) + (text.length > 150 ? '...' : ''),
          voice: voice.nameKh,
          gender: voice.gender,
          style,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const fullSpeech: GeneratedSpeech = {
          id: `long_${Date.now()}`,
          text: `[អត្ថបទវែង ៥០,០០០ តួអក្សរ] ${text.slice(0, 150)}...`,
          voice: voice.nameKh,
          gender: voice.gender,
          style,
          timestamp: Date.now(),
          durationSeconds: data.durationSeconds,
          wavBase64: data.wavBase64,
          mp3Base64: data.mp3Base64,
          wavSize: data.wavSize,
          mp3Size: data.mp3Size,
        };
        setMergedSpeech(fullSpeech);
        onMergedSuccess(fullSpeech);
      }
    } catch (err) {
      console.error('Failed to merge:', err);
    } finally {
      setIsMerging(false);
    }
  };

  // Individual Chunk Play
  const playChunk = (index: number, mp3Base64?: string, wavBase64?: string) => {
    const src = mp3Base64
      ? `data:audio/mp3;base64,${mp3Base64}`
      : `data:audio/wav;base64,${wavBase64}`;

    if (activePlayingIndex === index) {
      audioRefs.current[index]?.pause();
      setActivePlayingIndex(null);
      return;
    }

    // Stop others
    Object.values(audioRefs.current).forEach((a) => a?.pause());

    let audio = audioRefs.current[index];
    if (!audio) {
      audio = new Audio(src);
      audioRefs.current[index] = audio;
    } else {
      audio.src = src;
    }

    audio.onended = () => setActivePlayingIndex(null);
    audio.play().catch(console.error);
    setActivePlayingIndex(index);
  };

  // Download single chunk
  const downloadSingleChunk = (chunk: TextChunk, format: 'mp3' | 'wav') => {
    const isMp3 = format === 'mp3';
    const base64Data = isMp3 ? chunk.mp3Base64 : chunk.wavBase64;
    if (!base64Data) return;

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: isMp3 ? 'audio/mp3' : 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `khmer_tts_part_${chunk.index}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-amber-950/30 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              ម៉ូដអានអត្ថបទវែង ៥០,០០០ តួអក្សរ (Long-form TTS)
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            ដំណើរការបម្លែងជាភាគៗ (Chunk Segmentation & Auto-Merge)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ប្រព័ន្ធបែងចែកអត្ថបទធំដោយស្វ័យប្រវត្តិតាមវណ្ណយុត្តិខ្មែរ (៕ និង ។) រួចផ្គុំជាឯកសារ MP3 & WAV ពេញលេញតែមួយ
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs">
          <div className="text-center px-2">
            <div className="text-slate-400 text-[10px]">ចំនួនតួអក្សរ</div>
            <div className="font-bold text-slate-200 font-mono">{totalChars.toLocaleString()}</div>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div className="text-center px-2">
            <div className="text-slate-400 text-[10px]">ចំនួនភាគ</div>
            <div className="font-bold text-amber-400 font-mono">{chunks.length} ភាគ</div>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div className="text-center px-2">
            <div className="text-slate-400 text-[10px]">រយៈពេលសរុប</div>
            <div className="font-bold text-indigo-400 font-mono">~{totalEstimatedMins} នាទី</div>
          </div>
        </div>
      </div>

      {/* Control Buttons & Progress Bar */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isProcessing ? (
              <button
                type="button"
                onClick={startProcessing}
                disabled={chunks.length === 0 || isSplitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {completedChunks.length > 0 && completedChunks.length < chunks.length
                    ? `បន្តការបម្លែងភាគដែលនៅសល់ (${chunks.length - completedChunks.length})`
                    : 'ចាប់ផ្តើមបម្លែងគ្រប់ភាគ (Start All)'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseProcessing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs sm:text-sm border border-slate-700 transition-all"
              >
                <Pause className="w-4 h-4" />
                <span>ផ្អាកបណ្តោះអាសន្ន (Pause)</span>
              </button>
            )}

            {completedChunks.length > 1 && (
              <button
                type="button"
                onClick={() => handleMerge()}
                disabled={isMerging}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
                title="ផ្គុំភាគដែលរួចរាល់ទាំងអស់ចូលគ្នាជាឯកសារតែមួយ"
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>{isMerging ? 'កំពុងផ្គុំសំឡេង...' : `ផ្គុំភាគដែលរួចរាល់ (${completedChunks.length})`}</span>
              </button>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="text-xs text-slate-400 font-mono">
            បានរួចរាល់: <strong className="text-amber-400">{completedChunks.length}</strong> / {chunks.length} ភាគ ({progressPercent}%)
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Rate limit countdown notification */}
        {rateLimitCountdown !== null && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 animate-pulse">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              កំពុងសម្រាកតាមប្រព័ន្ធកំណត់ (Rate limit)៖ នឹងបន្តដោយស្វ័យប្រវត្តិនឹងភាគបន្ទាប់ក្នុងរយៈពេល{' '}
              <strong>{rateLimitCountdown} វិនាទី</strong>...
            </span>
          </div>
        )}
      </div>

      {/* Merged Master Audio Result */}
      {mergedSpeech && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span>ឯកសារសំឡេងពេញលេញ (Master Audio File សម្រាប់អត្ថបទទាំងមូល)</span>
          </div>
          <AudioPlayer speech={mergedSpeech} autoPlay={false} />
        </div>
      )}

      {/* Chunks List */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>បញ្ជីភាគដែលត្រូវបានបែងចែក ({chunks.length} ភាគ)</span>
        </h4>

        {isSplitting ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
            <span>កំពុងបែងចែកកថាខណ្ឌខ្មែរ...</span>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {chunks.map((chunk, index) => {
              const isCurrent = currentIndex === index;
              const isDone = chunk.status === 'completed';
              const isErr = chunk.status === 'error';
              const isLoading = chunk.status === 'loading';
              const isPlaying = activePlayingIndex === index;

              return (
                <div
                  key={chunk.index}
                  className={`p-3.5 rounded-xl border transition-all text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isCurrent || isLoading
                      ? 'bg-amber-950/20 border-amber-500/70 shadow-md ring-1 ring-amber-500/40'
                      : isDone
                      ? 'bg-slate-900/80 border-slate-800'
                      : isErr
                      ? 'bg-rose-950/20 border-rose-800/60'
                      : 'bg-slate-950/50 border-slate-850'
                  }`}
                >
                  {/* Left: Part badge and text preview */}
                  <div className="space-y-1 overflow-hidden flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                        ភាគទី {chunk.index}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {chunk.charCount} តួអក្សរ • ~{chunk.estimatedSeconds}s
                      </span>
                      {isDone && (
                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>រួចរាល់ ({chunk.durationSeconds}s)</span>
                        </span>
                      )}
                      {isLoading && (
                        <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>កំពុងបម្លែង...</span>
                        </span>
                      )}
                      {isErr && (
                        <span className="text-[10px] text-rose-400">
                          {chunk.error || 'បរាជ័យ'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 font-khmer line-clamp-2 leading-relaxed">
                      {chunk.text}
                    </p>
                  </div>

                  {/* Right: Actions for this chunk */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isDone && (
                      <>
                        <button
                          type="button"
                          onClick={() => playChunk(index, chunk.mp3Base64, chunk.wavBase64)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                            isPlaying
                              ? 'bg-amber-500 text-slate-950 shadow-md'
                              : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40'
                          }`}
                          title={isPlaying ? 'ផ្អាក' : 'ស្តាប់ភាគនេះ'}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadSingleChunk(chunk, 'mp3')}
                          className="px-2 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-colors"
                          title="ទាញយកភាគនេះជា MP3"
                        >
                          MP3
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadSingleChunk(chunk, 'wav')}
                          className="px-2 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-colors"
                          title="ទាញយកភាគនេះជា WAV"
                        >
                          WAV
                        </button>
                      </>
                    )}

                    {!isDone && !isLoading && (
                      <span className="text-[11px] text-slate-500 italic">
                        រង់ចាំ
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
