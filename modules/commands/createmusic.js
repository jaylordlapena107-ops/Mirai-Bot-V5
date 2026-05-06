const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const bold = require('../../utils/bold');

const VERSION = '3.0.0';
const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/createmusic_temp');
fs.ensureDirSync(TEMP_DIR);

function cleanup(...files) {
  setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 600000);
}
function run(cmd) {
  return new Promise((res, rej) =>
    exec(cmd, { maxBuffer: 1024 * 1024 * 100 }, (e, _, se) =>
      e ? rej(new Error(se?.slice(0, 300) || e.message)) : res()
    )
  );
}

// ─── MOOD DETECTION ────────────────────────────────────────────────────────────
const MOOD_KEYWORDS = {
  sad:     ['sad','cry','miss','lost','gone','hurt','pain','broken','grief','nawala','hirap','lungkot','luha','masakit','wala','umalis','paalam','patay','namatay','death','widow'],
  happy:   ['happy','joy','celebrate','fun','dance','party','smile','laugh','fiesta','saya','masaya','celebrate','kasiyahan','pagdiriwang','bless','celebrate'],
  love:    ['love','heart','darling','baby','honey','sweetheart','forever','together','miss you','mahal','puso','irog','iniirog','minamahal','buhay','sayo','palagi','ikaw','you'],
  gospel:  ['god','jesus','lord','pray','faith','heaven','church','holy','spirit','blessing','diyos','hesus','panginoon','panalangin','langit','banal','espiritu','pananampalataya','amen'],
  upbeat:  ['go','fight','rise','strong','power','win','champion','never give up','kaya','laban','malakas','tagumpay','panalo','lakas','bumangon'],
};

function detectMood(text) {
  const lower = text.toLowerCase();
  const scores = {};
  for (const [mood, words] of Object.entries(MOOD_KEYWORDS)) {
    scores[mood] = words.filter(w => lower.includes(w)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'love'; // default to love/ballad
}

// ─── MOOD-BASED BACKGROUND MUSIC ───────────────────────────────────────────────
const MOOD_MUSIC = {
  // C major — warm romantic ballad
  love: {
    chord: '(0.28*sin(2*PI*261*t)+0.24*sin(2*PI*329*t)+0.20*sin(2*PI*392*t)+0.16*sin(2*PI*523*t)+0.10*sin(2*PI*130*t))',
    tremolo: 0.07, echoDelay: '200|400', echoDecay: '0.35|0.18', vol: 0.9, label: '💕 Romantic Ballad'
  },
  // A minor — somber, mournful
  sad: {
    chord: '(0.28*sin(2*PI*220*t)+0.22*sin(2*PI*261*t)+0.18*sin(2*PI*329*t)+0.14*sin(2*PI*440*t)+0.10*sin(2*PI*110*t))',
    tremolo: 0.04, echoDelay: '350|700', echoDecay: '0.45|0.25', vol: 0.8, label: '😢 Soulful Ballad'
  },
  // G major — bright, joyful
  happy: {
    chord: '(0.30*sin(2*PI*392*t)+0.26*sin(2*PI*494*t)+0.22*sin(2*PI*587*t)+0.18*sin(2*PI*784*t)+0.12*sin(2*PI*196*t))',
    tremolo: 0.13, echoDelay: '80|160', echoDecay: '0.25|0.12', vol: 1.0, label: '🎉 Upbeat Pop'
  },
  // D major — majestic, uplifting worship
  gospel: {
    chord: '(0.30*sin(2*PI*293*t)+0.26*sin(2*PI*369*t)+0.22*sin(2*PI*440*t)+0.18*sin(2*PI*587*t)+0.12*sin(2*PI*146*t))',
    tremolo: 0.05, echoDelay: '250|500', echoDecay: '0.40|0.22', vol: 0.9, label: '🙏 Gospel / Worship'
  },
  // E major — energetic, driving
  upbeat: {
    chord: '(0.30*sin(2*PI*329*t)+0.26*sin(2*PI*415*t)+0.22*sin(2*PI*493*t)+0.18*sin(2*PI*659*t)+0.12*sin(2*PI*164*t))',
    tremolo: 0.15, echoDelay: '60|120', echoDecay: '0.20|0.10', vol: 1.0, label: '🔥 Anthemic / Power'
  }
};

async function generateMusicBg(mood, durationSec, outPath) {
  const m = MOOD_MUSIC[mood] || MOOD_MUSIC.love;
  const cmd = [
    'ffmpeg -y',
    `-f lavfi -i "aevalsrc=${m.chord}*0.5*(1+0.65*sin(2*PI*${m.tremolo}*t)):s=44100:d=${durationSec}"`,
    `-filter_complex "[0:a]volume=${m.vol},aecho=0.8:0.65:${m.echoDelay}:${m.echoDecay}[out]"`,
    '-map "[out]"',
    '-ar 44100 -ac 2 -b:a 64k',
    `"${outPath}"`
  ].join(' ');
  await run(cmd);
}

// ─── AI LYRICS ─────────────────────────────────────────────────────────────────
function isTagalog(text) {
  const tw = ['ang','ng','na','sa','at','ay','ko','mo','ka','po','ako','ikaw','siya','nang','din','pero','para','kasi','hindi','yung','mga'];
  return text.toLowerCase().split(/\s+/).filter(w => tw.includes(w)).length >= 2;
}

async function generateLyrics(theme, mood) {
  const isTl = isTagalog(theme);
  const moodNote = { love:'romantic and emotional', sad:'deeply sorrowful and melancholic', happy:'joyful and celebratory', gospel:'worshipful and uplifting toward God', upbeat:'powerful and motivational' }[mood] || 'emotional';
  const prompt = isTl
    ? `Ikaw ay isang propesyonal na mang-aawit. Gumawa ng KUMPLETONG lyrics ng kanta na MAHABANG-MAHABA tungkol sa: "${theme}". Tone: ${moodNote}. Sa Filipino/Tagalog OPM style. Isama ang: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus x2], [Outro]. Minimum 300 salita. Maging heartfelt at tunay.`
    : `You are a professional songwriter. Write COMPLETE, LONG song lyrics about: "${theme}". Tone: ${moodNote}. Include ALL sections: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus x2], [Outro]. Minimum 300 words. Make it deeply heartfelt and authentic.`;

  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.post('https://text.pollinations.ai/', {
        messages: [
          { role: 'system', content: 'Professional heartfelt songwriter. Write complete, long, emotional song lyrics.' },
          { role: 'user', content: prompt }
        ],
        model: 'openai', temperature: 0.9
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 60000 });
      const text = typeof res.data === 'string' ? res.data : res.data?.choices?.[0]?.message?.content || String(res.data);
      if (text?.length > 80) return text.trim();
    } catch (e) {
      if (i < 2) await new Promise(r => setTimeout(r, (i + 1) * 2000));
    }
  }
  return `${theme}\n\n[Verse 1]\nYou are my life, you are my everything\nEvery breath I take, every song I sing\n\n[Chorus]\nWithout you here the world is incomplete\nYou are my heart, my soul, my heartbeat`;
}

// ─── VOICE ─────────────────────────────────────────────────────────────────────
const MOOD_VOICE = {
  love:   { voice: 'en-US-AriaNeural',       opts: { rate: '-8%',  pitch: '+10Hz' }, isFil: false },
  sad:    { voice: 'en-US-EmmaNeural',        opts: { rate: '-12%', pitch: '-10Hz' }, isFil: false },
  happy:  { voice: 'en-US-JennyNeural',       opts: { rate: '+5%',  pitch: '+15Hz' }, isFil: false },
  gospel: { voice: 'en-US-ChristopherNeural', opts: { rate: '-10%', pitch: '+0Hz'  }, isFil: false },
  upbeat: { voice: 'en-US-GuyNeural',         opts: { rate: '+5%',  pitch: '+10Hz' }, isFil: false },
};
const MOOD_VOICE_TL = {
  love:   { voice: 'fil-PH-BlessicaNeural', opts: { rate: '-8%',  pitch: '+0Hz'  } },
  sad:    { voice: 'fil-PH-BlessicaNeural', opts: { rate: '-15%', pitch: '-10Hz' } },
  happy:  { voice: 'fil-PH-BlessicaNeural', opts: { rate: '+5%',  pitch: '+10Hz' } },
  gospel: { voice: 'fil-PH-AngeloNeural',   opts: { rate: '-10%', pitch: '+0Hz'  } },
  upbeat: { voice: 'fil-PH-AngeloNeural',   opts: { rate: '+5%',  pitch: '+5Hz'  } },
};

async function generateVoice(text, mood, isTl, outPath) {
  const cfg = isTl ? MOOD_VOICE_TL[mood] : MOOD_VOICE[mood];
  const tts = new MsEdgeTTS();
  await tts.setMetadata(cfg.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, cfg.opts);
  return new Promise((res, rej) => {
    const chunks = [];
    audioStream.on('data', d => chunks.push(d));
    audioStream.on('end', async () => {
      const buf = Buffer.concat(chunks);
      if (buf.length < 100) return rej(new Error('Empty voice'));
      await fs.writeFile(outPath, buf);
      res();
    });
    audioStream.on('error', rej);
  });
}

function cleanLyricsForTTS(lyrics) {
  return lyrics
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[*_#]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function mixAudio(voicePath, bgPath, outPath) {
  await run([
    'ffmpeg -y',
    `-i "${voicePath}"`,
    `-i "${bgPath}"`,
    '-filter_complex "[0:a]volume=2.2[v];[1:a]volume=0.32[b];[v][b]amix=inputs=2:duration=first[out]"',
    '-map "[out]" -ar 44100 -ac 2 -b:a 96k',
    `"${outPath}"`
  ].join(' '));
}

// ─── COMMAND ───────────────────────────────────────────────────────────────────
module.exports.config = {
  name: 'createmusic',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'AI creates a full song with mood-based background music + matching voice — FREE',
  commandCategory: 'Music',
  usages: '[song title / theme]',
  cooldowns: 30
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';

  if (!args.length) {
    return api.sendMessage(
      `╔══════════════════════════════╗\n` +
      `║  🎵 ${bold('CREATE MUSIC v' + VERSION)}       ║\n` +
      `║  🏷️  ${bold(TEAM)}    ║\n` +
      `╚══════════════════════════════╝\n\n` +
      `🎶 ${bold('AI creates full song + mood music + voice!')}\n\n` +
      `🎼 ${bold('AUTO MOOD DETECTION:')}\n` +
      `  💕 Love/Pag-ibig → Romantic Ballad\n` +
      `  😢 Sad/Lungkot → Soulful Minor\n` +
      `  🎉 Happy/Masaya → Upbeat Pop\n` +
      `  🙏 God/Jesus → Gospel Worship\n` +
      `  🔥 Fight/Laban → Anthemic Power\n\n` +
      `📋 ${bold('HALIMBAWA:')}\n` +
      `• ${P}createmusic You're My Life\n` +
      `• ${P}createmusic Ikaw ang lahat sa akin\n` +
      `• ${P}createmusic Missing you tonight\n` +
      `• ${P}createmusic Thank you Lord Jesus\n` +
      `• ${P}createmusic Laban hanggang wakas\n\n` +
      `🎤 ${bold('Sends FULL lyrics + matching voice + music!')}`,
      threadID, messageID
    );
  }

  const theme = args.join(' ').trim();
  const isTl = isTagalog(theme);
  const mood = detectMood(theme);
  const moodInfo = MOOD_MUSIC[mood];

  api.setMessageReaction('🎵', messageID, () => {}, true);
  api.sendMessage(
    `⏳ ${bold('Ginagawa ang iyong kanta...')}\n` +
    `🎵 ${bold('Theme:')} ${theme}\n` +
    `🎼 ${bold('Mood Detected:')} ${moodInfo.label}\n` +
    `🌐 ${bold('Language:')} ${isTl ? '🇵🇭 Filipino/Tagalog' : '🇺🇸 English'}\n` +
    `⚡ ${bold('Generating lyrics + voice + music... (20–40 sec)')}`,
    threadID
  );

  const ts = Date.now();
  const voicePath = path.join(TEMP_DIR, `v_${ts}.mp3`);
  const bgPath    = path.join(TEMP_DIR, `bg_${ts}.mp3`);
  const outPath   = path.join(TEMP_DIR, `out_${ts}.mp3`);

  try {
    // Generate in parallel: lyrics + background music
    const [rawLyrics] = await Promise.all([
      generateLyrics(theme, mood),
      generateMusicBg(mood, 300, bgPath),
    ]);

    const ttsText = cleanLyricsForTTS(rawLyrics);
    await generateVoice(ttsText, mood, isTl, voicePath);
    await mixAudio(voicePath, bgPath, outPath);
    cleanup(voicePath, bgPath);

    api.setMessageReaction('✅', messageID, () => {}, true);

    await api.sendMessage(
      `🎵 ${bold('CREATE MUSIC')} — ${bold('Song Ready!')}\n` +
      `🏷️ ${bold(TEAM)}\n` +
      `${'─'.repeat(32)}\n` +
      `🎶 ${bold('Theme:')} ${theme}\n` +
      `🎼 ${bold('Mood:')} ${moodInfo.label}\n` +
      `${'─'.repeat(32)}\n` +
      rawLyrics.slice(0, 1800) +
      (rawLyrics.length > 1800 ? '\n...(continues in voice audio)' : '') +
      `\n${'─'.repeat(32)}\n` +
      `🎤 ${bold('Sending voice + music audio...')} 👇`,
      threadID
    );

    return api.sendMessage({
      body:
        `🎵 ${bold('FULL SONG')} — ${bold(theme)}\n` +
        `🎼 ${moodInfo.label}\n` +
        `🤖 AI Voice + Background Music\n` +
        `🏷️ ${bold(TEAM)}\n` +
        `📥 Hold & save to download!`,
      attachment: fs.createReadStream(outPath)
    }, threadID, () => cleanup(outPath));

  } catch (e) {
    cleanup(voicePath, bgPath, outPath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    console.error('[CreateMusic Error]', e.message);
    return api.sendMessage(
      `❌ ${bold('May error sa Create Music.')}\n🔧 ${e.message?.slice(0, 200)}\n💡 Subukan ulit.`,
      threadID, messageID
    );
  }
};
