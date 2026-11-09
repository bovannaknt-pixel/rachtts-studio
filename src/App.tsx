import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Music,
  Users,
  Sparkles,
  Download,
  Volume2,
  Settings2,
  Trash2,
  Copy,
  Check,
  FileAudio,
  Radio,
  BookOpen,
  Smile,
  Feather,
  ShieldCheck,
  RefreshCw,
  Info,
  Layers,
  Upload,
  BookMarked,
  ArrowRight,
} from 'lucide-react';
import { VOICES, STYLES, SAMPLE_TEXTS } from './data/voices';
import { VoiceOption, SpeechStyle, GeneratedSpeech, DialogueTurn } from './types';
import { VoiceSelector } from './components/VoiceSelector';
import { AudioPlayer } from './components/AudioPlayer';
import { DialogueMode } from './components/DialogueMode';
import { HistoryDrawer } from './components/HistoryDrawer';
import { LongTextProcessor } from './components/LongTextProcessor';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import rachttsLogo from './assets/images/rachtts_logo_1794216810522.jpg';

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'longtext' | 'dialogue'>('single');

  // Voice & Tone settings
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[0]); // Default Kore (female)
  const [selectedStyle, setSelectedStyle] = useState<SpeechStyle>('natural');
  const [customInstruction, setCustomInstruction] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [text, setText] = useState(SAMPLE_TEXTS[0].text);

  // Status & Audio
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentSpeech, setCurrentSpeech] = useState<GeneratedSpeech | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // History state (stored in localStorage)
  const [history, setHistory] = useState<GeneratedSpeech[]>(() => {
    try {
      const saved = localStorage.getItem('khmer_tts_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('khmer_tts_history', JSON.stringify(history.slice(0, 15)));
    } catch {
      // storage quota
    }
  }, [history]);

  // Character and word counts
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedSeconds = Math.max(1, Math.round(charCount / 18)); // Approx 18 Khmer chars/sec
  const estimatedMinutes = Math.max(0.1, Number((charCount / 18 / 60).toFixed(1)));

  // Handle File Upload (.txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      alert('សូមជ្រើសរើសឯកសារអត្ថបទដែលមានកន្ទុយ .txt');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const sliced = content.slice(0, 50000);
        setText(sliced);
        if (content.length > 50000) {
          alert('ឯកសាររបស់អ្នកមានប្រវែងលើស ៥០,០០០ តួអក្សរ។ ប្រព័ន្ធបានកាត់ត្រឹម ៥០,០០០ តួអក្សរដំបូង។');
        }
        if (sliced.length > 1500) {
          setActiveTab('longtext');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle Generate Single TTS
  const handleGenerateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setErrorMessage('សូមបញ្ចូលអត្ថបទជាភាសាខ្មែរដែលអ្នកចង់ឱ្យនិយាយ');
      return;
    }

    // If text is very long, automatically switch to Long Text mode for optimal quality
    if (text.length > 2500) {
      setActiveTab('longtext');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voice: selectedVoice.id,
          gender: selectedVoice.gender,
          style: selectedStyle,
          customInstruction: customInstruction.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'មានបញ្ហាក្នុងការបង្កើតសំឡេង');
      }

      const newSpeech: GeneratedSpeech = {
        id: Date.now().toString(),
        text: text.trim(),
        voice: data.voice || selectedVoice.id,
        gender: selectedVoice.gender,
        style: selectedStyle,
        timestamp: Date.now(),
        durationSeconds: data.durationSeconds || estimatedSeconds,
        wavBase64: data.wavBase64,
        mp3Base64: data.mp3Base64,
        wavSize: data.wavSize || 0,
        mp3Size: data.mp3Size || 0,
      };

      setCurrentSpeech(newSpeech);
      setHistory((prev) => [newSpeech, ...prev.filter((item) => item.id !== newSpeech.id)]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'មិនអាចភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើសេវាបានទេ');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Generate Dialogue
  const handleGenerateDialogue = async (
    turns: DialogueTurn[],
    maleVoice: string,
    femaleVoice: string
  ) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/tts/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turns,
          speaker1Voice: maleVoice,
          speaker2Voice: femaleVoice,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'មានបញ្ហាក្នុងការបង្កើតកិច្ចសន្ទនា');
      }

      const summaryText = turns.map((t) => `${t.speaker}: ${t.text}`).join(' | ');

      const newSpeech: GeneratedSpeech = {
        id: Date.now().toString(),
        text: summaryText,
        voice: `${maleVoice} & ${femaleVoice}`,
        gender: 'female',
        style: 'natural',
        timestamp: Date.now(),
        durationSeconds: data.durationSeconds || 5,
        wavBase64: data.wavBase64,
        mp3Base64: data.mp3Base64,
        wavSize: data.wavSize || 0,
        mp3Size: data.mp3Size || 0,
        isDialogue: true,
      };

      setCurrentSpeech(newSpeech);
      setHistory((prev) => [newSpeech, ...prev]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'មិនអាចបង្កើតកិច្ចសន្ទនាបានទេ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = (sample: (typeof SAMPLE_TEXTS)[0]) => {
    setText(sample.text);
    const foundVoice = VOICES.find((v) => v.id === sample.recommendedVoice);
    if (foundVoice) setSelectedVoice(foundVoice);
    setSelectedStyle(sample.recommendedStyle);

    if (sample.text.length > 1500) {
      setActiveTab('longtext');
    }
  };

  const handleCopyText = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleClearText = () => {
    setText('');
  };

  const getStyleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Radio':
        return <Radio className="w-3.5 h-3.5" />;
      case 'BookOpen':
        return <BookOpen className="w-3.5 h-3.5" />;
      case 'Smile':
        return <Smile className="w-3.5 h-3.5" />;
      case 'Feather':
        return <Feather className="w-3.5 h-3.5" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Banner & Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shadow-xl shadow-amber-500/20 border-2 border-amber-400/60 bg-slate-900 group-hover:scale-105 transition-transform duration-300">
                <img
                  src={rachttsLogo}
                  alt="rachtts.studio.kh Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950"
                title="Online & Ready"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5 font-sans">
                  <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                    rachtts.studio.kh
                  </span>
                </h1>
                <span className="text-[10px] font-semibold text-cyan-300 font-sans px-2 py-0.5 bg-cyan-950/60 border border-cyan-500/30 rounded-full">
                  TTS Studio
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                បម្លែងអត្ថបទទៅជាសំឡេងនិយាយភាសាខ្មែរ គាំទ្រដល់ ៥០,០០០ តួអក្សរ • MP3 & WAV
              </p>
            </div>
          </div>

          {/* Feature Badges */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>អានបានដល់ ៥០,០០០ តួអក្សរ</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <span className="px-2 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-lg">
                MP3
              </span>
              <span className="px-2 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg">
                WAV
              </span>
            </div>

            {/* In-App PWA Install Button */}
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 w-full flex-1 space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-sm flex items-start justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-2.5">
              <span className="text-rose-400 text-base">⚠️</span>
              <div>
                <p className="font-semibold">កំហុសក្នុងការប្រតិបត្តិការ</p>
                <p className="text-xs text-rose-300/90 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-white px-2 py-1 rounded bg-rose-900/40"
            >
              បិទ
            </button>
          </div>
        )}

        {/* 3 Main Modes Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'single'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>អត្ថបទខ្លី (Single TTS)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('longtext')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'longtext'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              <span>អត្ថបទវែង ៥០,០០០ តួអក្សរ (Long Text)</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-black/20 rounded font-mono font-bold">50k</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dialogue')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'dialogue'
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>កិច្ចសន្ទនាប្រុស-ស្រី (Dialogue)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-amber-400 font-bold">{charCount.toLocaleString()}</span>
            <span>/ 50,000 តួអក្សរ</span>
          </div>
        </div>

        {/* Active Audio Player if any generated audio exists */}
        {currentSpeech && activeTab !== 'longtext' && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-300">
            <AudioPlayer speech={currentSpeech} />
          </section>
        )}

        {/* Global Voice Character Selection (Used for both Single and Long Text modes) */}
        {activeTab !== 'dialogue' && (
          <section className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl">
            <VoiceSelector
              selectedVoiceId={selectedVoice.id}
              onSelectVoice={(voice) => setSelectedVoice(voice)}
            />
          </section>
        )}

        {/* Global Speech Style / Emotion */}
        {activeTab !== 'dialogue' && (
          <section className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>រចនាប័ទ្មសំឡេង និងអារម្មណ៍ (Tone & Style)</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {STYLES.map((style) => {
                const isSelected = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/80 text-amber-200 shadow-sm'
                        : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold">
                      {getStyleIcon(style.icon)}
                      <span className="truncate">{style.labelKh}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block truncate">
                      {style.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Advanced Guidance Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>
                  {showAdvanced
                    ? 'លាក់ការកំណត់កម្រិតសំឡេងលម្អិត'
                    : 'ការណែនាំបន្ថែមលើសំឡេង (Optional Custom Guidance)'}
                </span>
              </button>

              {showAdvanced && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <label className="text-xs text-slate-400 block mb-1">
                    សរសេរបញ្ជាក់ពីរបៀបបញ្ចេញសំឡេងបន្ថែម (ឧទាហរណ៍៖ និយាយយឺតៗច្បាស់ៗ, សំឡេងកក់ក្តៅ, លើកដាក់ចង្វាក់...)
                  </label>
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="ឧ. និយាយយឺតៗ គួរសម និងបញ្ចេញសំឡេងច្បាស់ៗ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Global Textarea with Upload button (for Single and Long Text) */}
        {activeTab !== 'dialogue' && (
          <section className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <FileAudio className="w-4 h-4 text-amber-400" />
                <span>អត្ថបទជាភាសាខ្មែរ (រហូតដល់ ៥០,០០០ តួអក្សរ)</span>
              </label>

              {/* Upload file + Presets */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 transition-colors"
                  title="ផ្ទុកឡើងឯកសារ .txt ដែលមានរហូតដល់ ៥០,០០០ តួអក្សរ"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>ផ្ទុកឯកសារ .txt</span>
                </button>

                {/* Presets */}
                <div className="flex flex-wrap items-center gap-1">
                  {SAMPLE_TEXTS.map((sample) => (
                    <button
                      key={sample.title}
                      type="button"
                      onClick={() => handleApplyPreset(sample)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                    >
                      {sample.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                rows={activeTab === 'longtext' ? 8 : 6}
                value={text}
                maxLength={50000}
                onChange={(e) => setText(e.target.value)}
                placeholder="សូមវាយ ឬបិទភ្ជាប់ (Paste) អត្ថបទភាសាខ្មែរនៅទីនេះ (គាំទ្ររហូតដល់ ៥០,០០០ តួអក្សរ សម្រាប់សៀវភៅ រឿងនិទាន ឬអត្ថបទសារព័ត៌មានវែង)..."
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-khmer leading-relaxed resize-y min-h-[160px]"
              />

              {/* Actions below textarea */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-200 font-semibold">
                    {charCount.toLocaleString()} / 50,000 តួអក្សរ
                  </span>
                  <span className="text-slate-500">•</span>
                  <span>{wordCount.toLocaleString()} ពាក្យ</span>
                  <span className="text-slate-500">•</span>
                  <span>រយៈពេលប្រហាក់ប្រហែល: ~{estimatedMinutes} នាទី ({estimatedSeconds}s)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="hover:text-slate-200 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-800"
                    title="ចម្លងអត្ថបទ"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">បានចម្លង</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>ចម្លង</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearText}
                    className="hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-800"
                    title="សម្អាតអត្ថបទ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>សម្អាត</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Switcher Suggestion if text is long and user is on Single Tab */}
            {activeTab === 'single' && charCount > 1500 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    អត្ថបទរបស់អ្នកមានប្រវែងវែង ({charCount.toLocaleString()} តួអក្សរ)។ យើងសូមណែនាំឱ្យប្រើប្រាស់ផ្ទាំង <strong>«អត្ថបទវែង ៥០,០០០ តួអក្សរ»</strong> ដើម្បីបម្លែងជាភាគៗ និងទាញយកជា MP3/WAV ពេញលេញ!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('longtext')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-amber-400 transition-colors shadow-sm shrink-0"
                >
                  <span>ប្តូរទៅអត្ថបទវែង</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Single Tab Generate Button */}
            {activeTab === 'single' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>ជ្រើសបាន: </span>
                  <span className="font-semibold text-slate-200">
                    {selectedVoice.nameKh} ({selectedVoice.gender === 'female' ? 'សំឡេងស្រី' : 'សំឡេងប្រុស'})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateSingle}
                  disabled={isLoading || !text.trim()}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      <span>កំពុងបង្កើតសំឡេងនិយាយ...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-slate-950" />
                      <span>បម្លែងទៅជាសំឡេងនិយាយ (Convert to Speech)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: LONG TEXT PROCESSOR (UP TO 50,000 CHARACTERS) */}
        {activeTab === 'longtext' && (
          <section className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl">
            <LongTextProcessor
              text={text}
              voice={selectedVoice}
              style={selectedStyle}
              customInstruction={customInstruction}
              onMergedSuccess={(speech) => {
                setCurrentSpeech(speech);
                setHistory((prev) => [speech, ...prev]);
              }}
            />
          </section>
        )}

        {/* TAB 3: DUAL-SPEAKER DIALOGUE */}
        {activeTab === 'dialogue' && (
          <section className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>បង្កើតកិច្ចសន្ទនាប្រុស-ស្រីជាសំឡេង (Dual-Speaker Dialogue)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                បច្ចេកវិទ្យា Gemini 3.8 Flash TTS គាំទ្រការសន្ទនាឆ្លើយឆ្លងគ្នារវាងតួអង្គប្រុស និងស្រីក្នុងឯកសារសំឡេងតែមួយ
              </p>
            </div>

            <DialogueMode
              isLoading={isLoading}
              onGenerateDialogue={handleGenerateDialogue}
            />
          </section>
        )}

        {/* History Drawer */}
        <section className="pt-4">
          <HistoryDrawer
            history={history}
            onSelectSpeech={(speech) => setCurrentSpeech(speech)}
            onClearHistory={() => setHistory([])}
            activeSpeechId={currentSpeech?.id}
          />
        </section>

        {/* Educational Info on Khmer 50,000 Chars & Audio Quality */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-sm">
              <BookMarked className="w-4 h-4 text-amber-400" />
              <span>ការអាន ៥០,០០០ តួអក្សរ</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              ប្រព័ន្ធធ្វើការបែងចែកអត្ថបទធំដោយស្វ័យប្រវត្តិតាមវណ្ណយុត្តិខណ្ឌ <strong className="text-amber-300">៕</strong> និង <strong className="text-amber-300">។</strong> ទៅជាភាគៗ ហើយផ្គុំជាឯកសារ MP3 & WAV ពេញលេញតែមួយ។
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-rose-400" />
              <span>សំឡេងប្រុស និងស្រី</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              ជ្រើសរើសសំឡេងស្រីស្រទន់ (Kore, Zephyr) ឬសំឡេងប្រុសច្បាស់មានថាមពល (Puck, Charon, Fenrir) សម្រាប់ការអានសៀវភៅ ឬព័ត៌មានវែងៗ។
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-sm">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>ទាញយក MP3 & WAV</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              អាចទាញយកជាភាគៗ ឬទាញយកឯកសារមេពេញលេញ (Master Audio) ជា MP3 192k ឬ WAV 24kHz Lossless តាមតម្រូវការ។
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-5 mt-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <img
              src={rachttsLogo}
              alt="Logo"
              className="w-6 h-6 rounded-lg object-cover border border-amber-500/40"
            />
            <p>
              © {new Date().getFullYear()} <strong className="text-slate-200 font-sans">rachtts.studio.kh</strong> • សំឡេងខ្មែរ AI TTS Studio
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-slate-400">
            <a
              href="/api/download-project"
              download="rachtts-studio-code.zip"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-amber-300 border border-slate-800 text-xs font-medium hover:border-amber-500/40 transition-colors shadow-sm"
              title="ទាញយកកូដគម្រោងទាំងអស់ជា ZIP ដើម្បីដាក់ចូល GitHub"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>ទាញយកកូដគម្រោង (Project ZIP)</span>
            </a>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">គាំទ្រ ៥០,០០០ តួអក្សរ</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">MP3 & WAV</span>
          </div>
        </div>
      </footer>

      {/* PWA Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
