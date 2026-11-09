import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '100mb' }));

// Shared server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    apiVersion: 'v1alpha',
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Losslessly concatenate multiple 24kHz 16-bit mono WAV buffers
function concatWavBuffers(wavBuffers: Buffer[]): Buffer {
  if (wavBuffers.length === 0) return Buffer.alloc(0);
  if (wavBuffers.length === 1) return wavBuffers[0];

  const pcmList: Buffer[] = [];
  for (const wav of wavBuffers) {
    if (wav.length > 44) {
      pcmList.push(wav.subarray(44));
    }
  }

  const totalPcm = Buffer.concat(pcmList);
  const masterHeader = Buffer.from(wavBuffers[0].subarray(0, 44));
  masterHeader.writeUInt32LE(36 + totalPcm.length, 4);
  masterHeader.writeUInt32LE(totalPcm.length, 40);

  return Buffer.concat([masterHeader, totalPcm]);
}

// Convert WAV Buffer to high-quality MP3 using FFmpeg
function convertWavToMp3(wavBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-f', 'mp3',
      '-b:a', '192k',
      '-y',
      'pipe:1',
    ]);

    const chunks: Buffer[] = [];
    let stderr = '';

    ffmpeg.stdout.on('data', (data: Buffer) => chunks.push(data));
    ffmpeg.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`FFmpeg failed (exit code ${code}): ${stderr}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });

    ffmpeg.stdin.end(wavBuffer);
  });
}

// Clean user-friendly error formatting in Khmer
function formatGeminiError(error: any): string {
  const msg = error?.message || String(error);
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    return 'អ្នកបានស្នើសុំច្រើនដងពេកក្នុងមួយនាទី (Rate limit)។ សូមរង់ចាំប្រហែល ១០ វិនាទី រួចចុចម្តងទៀត។';
  }
  if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
    return 'សិទ្ធិចូលប្រើប្រាស់មិនត្រឹមត្រូវ។ សូមពិនិត្យមើល GEMINI_API_KEY នៅក្នុង Settings > Secrets។';
  }
  if (msg.includes('INVALID_ARGUMENT') || msg.includes('400')) {
    return 'ទិន្នន័យស្នើសុំមិនត្រឹមត្រូវ។ សូមពិនិត្យមើលអត្ថបទខ្មែរដែលបានបញ្ចូល។';
  }
  return 'កំហុសបច្ចេកទេសក្នុងការបង្កើតសំឡេង។ សូមព្យាយាមម្តងទៀត។';
}

// Available voice profiles
const VOICES = [
  {
    id: 'Kore',
    gender: 'female',
    nameKh: 'កូរ៉េ (សំឡេងស្រី - ស្រទន់ ពិរោះ)',
    nameEn: 'Kore (Female - Warm & Natural)',
    descKh: 'សំឡេងស្រីស្រទន់ ស័ក្តិសមសម្រាប់អានអត្ថបទ រឿង និងព័ត៌មានទូទៅ',
    badge: 'ពេញនិយម',
  },
  {
    id: 'Zephyr',
    gender: 'female',
    nameKh: 'សេហ្វៀ (សំឡេងស្រី - ស្រស់ថ្លា រស់រវើក)',
    nameEn: 'Zephyr (Female - Bright & Cheerful)',
    descKh: 'សំឡេងស្រីវ័យក្មេង ស្រស់ថ្លា ស័ក្តិសមសម្រាប់ការផ្សាយពាណិជ្ជកម្ម និងស្វាគមន៍',
    badge: 'ស្រស់ថ្លា',
  },
  {
    id: 'Puck',
    gender: 'male',
    nameKh: 'ផាក់ (សំឡេងប្រុស - ច្បាស់ រឹងមាំ)',
    nameEn: 'Puck (Male - Clear & Energetic)',
    descKh: 'សំឡេងប្រុសច្បាស់ មានថាមពល ល្អសម្រាប់អានព័ត៌មាន និងការបង្រៀន',
    badge: 'ពេញនិយម',
  },
  {
    id: 'Charon',
    gender: 'male',
    nameKh: 'ការ៉ុន (សំឡេងប្រុស - ជ្រៅ សុភាព)',
    nameEn: 'Charon (Male - Deep & Calm)',
    descKh: 'សំឡេងប្រុសទន់ភ្លន់ ជ្រៅ មានភាពស្ងប់ស្ងាត់ ល្អសម្រាប់រឿងនិទាន និងសម្រង់គំនិត',
    badge: 'សុភាព',
  },
  {
    id: 'Fenrir',
    gender: 'male',
    nameKh: 'ហ្វេនរីរ (សំឡេងប្រុស - ផ្លូវការ វិទ្យុ)',
    nameEn: 'Fenrir (Male - Authoritative Broadcaster)',
    descKh: 'សំឡេងប្រុសផ្លូវការ ដូចពិធីករវិទ្យុ ឬទូរទស្សន៍អាជីព',
    badge: 'ផ្លូវការ',
  },
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Download full project code as ZIP for GitHub / Render deployment
app.get('/api/download-project', (req, res) => {
  const zipPath = path.resolve(__dirname, 'public', 'rachtts-studio-code.zip');
  res.download(zipPath, 'rachtts-studio-code.zip');
});

// List available voices
app.get('/api/voices', (req, res) => {
  res.json(VOICES);
});

// Helper to cleanly segment Khmer text into logical paragraphs/sentences
function splitKhmerText(text: string, maxChunkLen = 1200): string[] {
  if (text.length <= maxChunkLen) return [text.trim()];
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if (currentChunk.length + trimmedPara.length + 2 <= maxChunkLen) {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      if (trimmedPara.length <= maxChunkLen) {
        currentChunk = trimmedPara;
      } else {
        // Split by Khmer sentence delimiters: ៕ or ។ or \n
        const sentences = trimmedPara.split(/(?<=[៕។\n])/);
        for (const sent of sentences) {
          const trimmedSent = sent.trim();
          if (!trimmedSent) continue;

          if (currentChunk.length + trimmedSent.length + 1 <= maxChunkLen) {
            currentChunk += (currentChunk ? ' ' : '') + trimmedSent;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = trimmedSent;
          }
        }
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks.filter((c) => c.trim().length > 0);
}

// Split Long Text (up to 50,000+ characters) into manageable chunks
app.post('/api/tts/split-chunks', (req, res) => {
  const { text, maxChunkLength = 1200 } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'អត្ថបទត្រូវការជាចាំបាច់ (Text required)' });
  }

  const chunks = splitKhmerText(text, maxChunkLength);
  const chunkDetails = chunks.map((chunk, index) => ({
    index: index + 1,
    text: chunk,
    charCount: chunk.length,
    estimatedSeconds: Math.max(1, Math.round(chunk.length / 18)),
  }));

  return res.json({
    totalLength: text.length,
    totalChunks: chunks.length,
    chunks: chunkDetails,
  });
});

// Merge multiple generated WAV chunks into one unified master WAV & MP3
app.post('/api/tts/merge', async (req, res) => {
  try {
    const { wavChunks, text = '', voice = 'Kore', gender = 'female', style = 'natural' } = req.body;
    if (!Array.isArray(wavChunks) || wavChunks.length === 0) {
      return res.status(400).json({ error: 'បញ្ជីសំឡេងមិនទាន់ត្រឹមត្រូវ (wavChunks required)' });
    }

    const buffers = wavChunks.map((b64: string) => Buffer.from(b64, 'base64'));
    const mergedWav = concatWavBuffers(buffers);
    const mergedMp3 = await convertWavToMp3(mergedWav);
    const durationSeconds = Math.max(0.1, Number(((mergedWav.length - 44) / 48000).toFixed(2)));

    return res.json({
      success: true,
      text,
      voice,
      gender,
      style,
      durationSeconds,
      wavBase64: mergedWav.toString('base64'),
      mp3Base64: mergedMp3.toString('base64'),
      wavSize: mergedWav.length,
      mp3Size: mergedMp3.length,
    });
  } catch (err: any) {
    console.error('Audio Merge Error:', err);
    return res.status(500).json({ error: 'បរាជ័យក្នុងការផ្គុំឯកសារសំឡេង' });
  }
});

// Generate Single-Speaker Khmer TTS
app.post('/api/tts/generate', async (req, res) => {
  try {
    const {
      text,
      voice = 'Kore',
      gender = 'female',
      style = 'natural',
      customInstruction = '',
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'សូមបញ្ចូលអត្ថបទដែលត្រូវនិយាយ (Text is required)' });
    }

    const trimmedText = text.trim();
    if (trimmedText.length > 5000) {
      return res.status(400).json({ error: 'អត្ថបទក្នុងមួយភាគវែងពេក (អតិបរមា ៥,០០០ តួអក្សរក្នុងមួយភាគ)' });
    }

    // Build style prompt tailored for Khmer pronunciation
    let stylePrompt = 'Speak fluently and naturally in standard Cambodian Khmer (ភាសាខ្មែរ) with accurate native pronunciation, correct cadence, and natural pauses.';
    if (style === 'news') {
      stylePrompt += ' Tone: Professional news broadcaster, clear, articulate, and authoritative.';
    } else if (style === 'story') {
      stylePrompt += ' Tone: Expressive Khmer storyteller, warm, engaging, and emotional pacing.';
    } else if (style === 'cheerful') {
      stylePrompt += ' Tone: Cheerful, upbeat, friendly, and welcoming.';
    } else if (style === 'calm') {
      stylePrompt += ' Tone: Gentle, calming, peaceful, and soft-spoken.';
    } else if (style === 'formal') {
      stylePrompt += ' Tone: Formal, dignified, and respectful Cambodian honorific style.';
    } else {
      stylePrompt += ' Tone: Natural, conversational, and warm native Khmer speaker.';
    }

    if (customInstruction && typeof customInstruction === 'string' && customInstruction.trim()) {
      stylePrompt += ` Additional guidance: ${customInstruction.trim()}`;
    }

    // Validate voice name
    const validVoices = ['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir'];
    const chosenVoice = validVoices.includes(voice) ? voice : (gender === 'male' ? 'Puck' : 'Kore');

    // Call Gemini 3.8 Flash TTS
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: trimmedText,
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({
        error: 'មិនអាចបង្កើតសំឡេងបានទេ។ សូមព្យាយាមម្តងទៀត។ (Audio data missing in response)',
      });
    }

    const wavBuffer = Buffer.from(base64Audio, 'base64');

    // Convert WAV to MP3 using ffmpeg
    const mp3Buffer = await convertWavToMp3(wavBuffer);

    // Calculate duration in seconds (24000Hz, 16-bit mono = 48,000 bytes/sec)
    const durationSeconds = Math.max(0.1, Number(((wavBuffer.length - 44) / 48000).toFixed(2)));

    return res.json({
      success: true,
      text: trimmedText,
      voice: chosenVoice,
      gender,
      style,
      durationSeconds,
      wavBase64: base64Audio,
      mp3Base64: mp3Buffer.toString('base64'),
      wavSize: wavBuffer.length,
      mp3Size: mp3Buffer.length,
    });
  } catch (error: any) {
    console.error('TTS Generation Error:', error);
    return res.status(500).json({
      error: formatGeminiError(error),
    });
  }
});

// Generate Dual-Speaker Dialogue TTS
app.post('/api/tts/dialogue', async (req, res) => {
  try {
    const {
      turns, // Array of { speaker: 'ប្រុស' | 'ស្រី', text: string }
      speaker1Voice = 'Puck', // Male
      speaker2Voice = 'Kore', // Female
    } = req.body;

    if (!Array.isArray(turns) || turns.length === 0) {
      return res.status(400).json({ error: 'សូមបញ្ចូលកិច្ចសន្ទនា (Dialogue turns required)' });
    }

    const parts = turns.map((turn: { speaker: string; text: string }) => {
      const isMale = turn.speaker === 'ប្រុស' || turn.speaker === 'Male';
      const speaker = isMale ? 'Male' : 'Female';
      return {
        text: turn.text,
        speechMetadata: {
          speaker,
        },
      };
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Male',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: speaker1Voice },
                },
              },
              {
                speaker: 'Female',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: speaker2Voice },
                },
              },
            ],
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'មិនអាចបង្កើតកិច្ចសន្ទនាជាសំឡេងបានទេ' });
    }

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    const mp3Buffer = await convertWavToMp3(wavBuffer);
    const durationSeconds = Math.max(0.1, Number(((wavBuffer.length - 44) / 48000).toFixed(2)));

    return res.json({
      success: true,
      durationSeconds,
      wavBase64: base64Audio,
      mp3Base64: mp3Buffer.toString('base64'),
      wavSize: wavBuffer.length,
      mp3Size: mp3Buffer.length,
    });
  } catch (error: any) {
    console.error('Dialogue TTS Generation Error:', error);
    return res.status(500).json({
      error: formatGeminiError(error),
    });
  }
});

// Setup Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Khmer TTS Server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
