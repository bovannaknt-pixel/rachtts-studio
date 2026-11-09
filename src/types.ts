export type VoiceGender = 'female' | 'male';

export interface VoiceOption {
  id: string; // 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir'
  gender: VoiceGender;
  nameKh: string;
  nameEn: string;
  descKh: string;
  badge: string;
  avatarColor: string;
}

export type SpeechStyle = 'natural' | 'news' | 'story' | 'cheerful' | 'calm' | 'formal';

export interface StyleOption {
  id: SpeechStyle;
  labelKh: string;
  labelEn: string;
  descKh: string;
  icon: string;
}

export interface GeneratedSpeech {
  id: string;
  text: string;
  voice: string;
  gender: VoiceGender;
  style: SpeechStyle;
  timestamp: number;
  durationSeconds: number;
  wavBase64: string;
  mp3Base64: string;
  wavSize: number;
  mp3Size: number;
  isDialogue?: boolean;
}

export interface DialogueTurn {
  id: string;
  speaker: 'ប្រុស' | 'ស្រី';
  text: string;
}

export interface TextChunk {
  index: number;
  text: string;
  charCount: number;
  estimatedSeconds: number;
  status: 'idle' | 'loading' | 'completed' | 'error';
  wavBase64?: string;
  mp3Base64?: string;
  durationSeconds?: number;
  error?: string;
}
