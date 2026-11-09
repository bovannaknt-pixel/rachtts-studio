import React, { useState } from 'react';
import { Plus, Trash2, Users, Wand2, Sparkles, ArrowRightLeft } from 'lucide-react';
import { DialogueTurn } from '../types';
import { SAMPLE_DIALOGUES, VOICES } from '../data/voices';

interface DialogueModeProps {
  onGenerateDialogue: (
    turns: DialogueTurn[],
    maleVoice: string,
    femaleVoice: string
  ) => void;
  isLoading: boolean;
}

export const DialogueMode: React.FC<DialogueModeProps> = ({
  onGenerateDialogue,
  isLoading,
}) => {
  const [maleVoice, setMaleVoice] = useState('Puck');
  const [femaleVoice, setFemaleVoice] = useState('Kore');
  const [turns, setTurns] = useState<DialogueTurn[]>(SAMPLE_DIALOGUES[0].turns);

  const maleVoices = VOICES.filter((v) => v.gender === 'male');
  const femaleVoices = VOICES.filter((v) => v.gender === 'female');

  const addTurn = () => {
    const lastSpeaker = turns[turns.length - 1]?.speaker;
    const nextSpeaker = lastSpeaker === 'ប្រុស' ? 'ស្រី' : 'ប្រុស';
    setTurns([
      ...turns,
      {
        id: Date.now().toString(),
        speaker: nextSpeaker,
        text: '',
      },
    ]);
  };

  const updateTurnText = (index: number, text: string) => {
    const nextTurns = [...turns];
    nextTurns[index].text = text;
    setTurns(nextTurns);
  };

  const toggleSpeaker = (index: number) => {
    const nextTurns = [...turns];
    nextTurns[index].speaker = nextTurns[index].speaker === 'ប្រុស' ? 'ស្រី' : 'ប្រុស';
    setTurns(nextTurns);
  };

  const removeTurn = (index: number) => {
    if (turns.length <= 1) return;
    setTurns(turns.filter((_, i) => i !== index));
  };

  const loadPreset = (presetIndex: number) => {
    setTurns(SAMPLE_DIALOGUES[presetIndex].turns);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validTurns = turns.filter((t) => t.text.trim().length > 0);
    if (validTurns.length === 0) {
      alert('សូមបញ្ចូលអត្ថបទសន្ទនាយ៉ាងហោចណាស់មួយឃ្លា');
      return;
    }
    onGenerateDialogue(validTurns, maleVoice, femaleVoice);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Voice Selection for Dialogue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        {/* Male Voice */}
        <div>
          <label className="text-xs font-semibold text-blue-300 flex items-center gap-1.5 mb-1.5">
            <span>👨 តួអង្គប្រុស (Male Speaker)</span>
          </label>
          <select
            value={maleVoice}
            onChange={(e) => setMaleVoice(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {maleVoices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nameKh} - {v.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Female Voice */}
        <div>
          <label className="text-xs font-semibold text-rose-300 flex items-center gap-1.5 mb-1.5">
            <span>👩 តួអង្គស្រី (Female Speaker)</span>
          </label>
          <select
            value={femaleVoice}
            onChange={(e) => setFemaleVoice(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          >
            {femaleVoices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nameKh} - {v.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preset Dialogues */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">គំរូកិច្ចសន្ទនា:</span>
        {SAMPLE_DIALOGUES.map((preset, idx) => (
          <button
            key={preset.title}
            type="button"
            onClick={() => loadPreset(idx)}
            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-colors"
          >
            {preset.title.split(' (')[0]}
          </button>
        ))}
      </div>

      {/* Dialogue Turns */}
      <div className="space-y-3">
        {turns.map((turn, index) => {
          const isMale = turn.speaker === 'ប្រុស';

          return (
            <div
              key={turn.id || index}
              className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start gap-3 ${
                isMale
                  ? 'bg-blue-950/20 border-blue-900/40 hover:border-blue-700/60'
                  : 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
              }`}
            >
              {/* Speaker Toggle Button */}
              <button
                type="button"
                onClick={() => toggleSpeaker(index)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border ${
                  isMale
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30'
                    : 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30'
                }`}
                title="ចុចដើម្បីប្តូរតួអង្គប្រុស / ស្រី"
              >
                <span>{isMale ? '👨' : '👩'}</span>
                <span>{turn.speaker}</span>
                <ArrowRightLeft className="w-3 h-3 opacity-60 ml-0.5" />
              </button>

              {/* Text Input */}
              <div className="flex-1 w-full">
                <input
                  type="text"
                  value={turn.text}
                  onChange={(e) => updateTurnText(index, e.target.value)}
                  placeholder={`បញ្ចូលសម្តីរបស់តួអង្គ ${turn.speaker}...`}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Delete Button */}
              {turns.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTurn(index)}
                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors shrink-0"
                  title="លុបឃ្លានេះ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Turn & Submit */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={addTurn}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>បន្ថែមឃ្លាសន្ទនាថ្មី</span>
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 hover:from-amber-400 hover:to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>កំពុងបង្កើតសំឡេងសន្ទនា...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>បម្លែងកិច្ចសន្ទនាទៅជាសំឡេង (Generate)</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
