import React, { useState } from 'react';
import { User, Users, Volume2, Sparkles, Check } from 'lucide-react';
import { VoiceOption, VoiceGender } from '../types';
import { VOICES } from '../data/voices';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelectVoice: (voice: VoiceOption) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  onSelectVoice,
}) => {
  const [filterGender, setFilterGender] = useState<'all' | VoiceGender>('all');

  const filteredVoices = VOICES.filter((v) => {
    if (filterGender === 'all') return true;
    return v.gender === filterGender;
  });

  return (
    <div className="space-y-3">
      {/* Header and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-amber-400" />
          <span>ជ្រើសរើសតួអង្គសំឡេង (Voice Character)</span>
        </label>

        {/* Gender Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterGender('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filterGender === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ទាំងអស់ ({VOICES.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterGender('female')}
            className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition-all ${
              filterGender === 'female'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            <span>👩</span>
            <span>សំឡេងស្រី</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterGender('male')}
            className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition-all ${
              filterGender === 'male'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-blue-300'
            }`}
          >
            <span>👨</span>
            <span>សំឡេងប្រុស</span>
          </button>
        </div>
      </div>

      {/* Voice Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredVoices.map((voice) => {
          const isSelected = voice.id === selectedVoiceId;
          const isFemale = voice.gender === 'female';

          return (
            <div
              key={voice.id}
              onClick={() => onSelectVoice(voice)}
              className={`group relative p-3.5 rounded-xl border cursor-pointer transition-all duration-200 text-left ${
                isSelected
                  ? isFemale
                    ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/80 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/50'
                    : 'bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border-blue-500/80 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/50'
                  : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Avatar, Name, Badge */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${voice.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}
                  >
                    {isFemale ? '👩' : '👨'}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-1">
                      <span>{voice.nameKh}</span>
                      {isSelected && (
                        <Check
                          className={`w-3.5 h-3.5 ${
                            isFemale ? 'text-rose-400' : 'text-blue-400'
                          }`}
                        />
                      )}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-sans block">
                      {voice.nameEn}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    isFemale
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                  }`}
                >
                  {voice.badge}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {voice.descKh}
              </p>

              {/* Active Indicator bar */}
              {isSelected && (
                <div
                  className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full ${
                    isFemale ? 'bg-rose-500' : 'bg-blue-500'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
