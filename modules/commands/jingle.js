const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const bold = require('../../utils/bold');

const VERSION = "2.0.0";
const TEAM = "TEAM STARTCOPE BETA";
const TEMP_DIR = path.join(process.cwd(), 'utils/data/jingle_temp');
fs.ensureDirSync(TEMP_DIR);

// Voice characters: name => { tl, speed, pitch }
const VOICES = {
  dj:     { tl: 'en',    speed: 1.05, pitch: 1.0,  label: '🎙️ DJ Announcer (English)'  },
  female: { tl: 'en',    speed: 0.92, pitch: 1.0,  label: '👩 Female (English)'         },
  male:   { tl: 'en',    speed: 0.95, pitch: 0.82, label: '👨 Male (Deep English)'      },
  uk:     { tl: 'en-gb', speed: 0.95, pitch: 1.0,  label: '🇬🇧 British (English)'       },
  fil:    { tl: 'fil',   speed: 0.90, pitch: 1.0,  label: '🇵🇭 Filipino (Tagalog)'      },
  au:     { tl: 'en-au', speed: 0.95, pitch: 1.0,  label: '🦘 Australian (English)'    },
};
const VOICE_KEYS = Object.keys(VOICES);

function cleanup(...files) {
  setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000);
}

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr?.slice(0, 300) || err.message));
      else resolve();
    });
  });
}

// Generate voice audio via Google TTS (free, no key)
async function getVoiceAudio(text, tl, speed) {
  const cleanText = text.replace(/[*_#\[\]()]/g, '').replace(/\n+/g, '. ').trim().slice(0, 200);
  for (let i = 0; i < 3; i++) {
    try {
      const encoded = encodeURIComponent(cleanText);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${tl}&client=tw-ob&ttsspeed=${speed}`;
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!res.data || res.data.byteLength < 100) throw new Error('Empty audio response');
      const fp = path.join(TEMP_DIR, `voice_${Date.now()}.mp3`);
      await fs.writeFile(fp, Buffer.from(res.data));
      return fp;
    } catch (e) {
      if (i < 2) { await new Promise(r => setTimeout(r, (i + 1) * 2000)); continue; }
      throw e;
    }
  }
}

// Pitch-shift a voice file down for "male" deep voice effect
async function pitchShift(inputPath, pitch, outPath) {
  const rate = Math.round(44100 * pitch);
  await run(`ffmpeg -y -i "${inputPath}" -filter_complex "asetrate=${rate},aresample=44100" -b:a 128k "${outPath}"`);
}

// Generate a musical radio jingle riff (ascending C-E-G notes + full chord)
// Uses aevalsrc with exponential decay for a "hit" sound
async function generateJingleBg(padDuration, outPath) {
  const cmd = [
    'ffmpeg -y',
    // Note 1: C5 (523 Hz) — short hit
    '-f lavfi -i "aevalsrc=0.55*sin(2*PI*523*t)*exp(-t*4):s=44100:d=0.35"',
    // Note 2: E5 (659 Hz) — short hit
    '-f lavfi -i "aevalsrc=0.55*sin(2*PI*659*t)*exp(-t*4):s=44100:d=0.35"',
    // Note 3: G5 (784 Hz) — short hit
    '-f lavfi -i "aevalsrc=0.55*sin(2*PI*784*t)*exp(-t*4):s=44100:d=0.35"',
    // Final chord: C5+E5+G5+C6 — full rich chord with slow decay
    '-f lavfi -i "aevalsrc=(0.35*sin(2*PI*523*t)+0.30*sin(2*PI*659*t)+0.25*sin(2*PI*784*t)+0.20*sin(2*PI*1047*t))*exp(-t*0.55):s=44100:d=3.5"',
    // Silence pad at end
    '-f lavfi -i "aevalsrc=0:s=44100:d=' + padDuration + '"',
    // Concat the 3 notes + chord, then pad with silence
    '-filter_complex "[0][1][2][3]concat=n=4:v=0:a=1[riff];[riff][4:a]concat=n=2:v=0:a=1[padded];[padded]volume=1.0[out]"',
    '-map "[out]"',
    '-ar 44100 -ac 2 -b:a 128k',
    `"${outPath}"`
  ].join(' ');
  await run(cmd);
}

// Mix voice (foreground) + background jingle music
async function mixAudio(voicePath, bgPath, outPath) {
  const cmd = [
    'ffmpeg -y',
    `-i "${voicePath}"`,
    `-i "${bgPath}"`,
    '-filter_complex "[0:a]volume=1.8,afade=t=in:st=0:d=0.15[v];[1:a]volume=0.40[b];[v][b]amix=inputs=2:duration=first[out]"',
    '-map "[out]"',
    '-ar 44100 -ac 2 -b:a 128k',
    `"${outPath}"`
  ].join(' ');
  await run(cmd);
}

// Generate a catchy jingle script via free AI (pollinations.ai)
async function generateJingleScript(stationName, voiceChar) {
  const isFil = voiceChar === 'fil';
  const langNote = isFil
    ? 'Write the jingle in Filipino/Tagalog. Make it catchy and local sounding.'
    : 'Write the jingle in English. Make it energetic and professional.';
  const prompt = `You are a professional radio station jingle copywriter.
Write a SHORT, catchy radio station ID/jingle script (2-3 sentences, max 45 words) for: "${stationName}".
${langNote}
Sound like a real FM radio announcer — hype, punchy, memorable.
Output only the jingle script text, nothing else.`;

  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.post('https://text.pollinations.ai/', {
        messages: [
          { role: 'system', content: 'You write short punchy radio jingle scripts. Max 45 words. No labels.' },
          { role: 'user', content: prompt }
        ],
        model: 'openai', temperature: 0.92
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
      const text = typeof res.data === 'string' ? res.data
        : res.data?.choices?.[0]?.message?.content || res.data?.text || String(res.data);
      if (text && text.length > 5) return text.trim().slice(0, 220);
    } catch (e) {
      if (i < 2) { await new Promise(r => setTimeout(r, (i + 1) * 2000)); continue; }
    }
  }
  // Fallback script if AI fails
  return isFil
    ? `${stationName}! Ang pinakamagandang istasyon para sa pinakamahusay na musika! Makinig at mag-enjoy!`
    : `${stationName}! Your number one station for the hottest hits! Sit back, relax, and enjoy the ride!`;
}

module.exports.config = {
  name: 'jingle',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Generate a real radio station voice jingle with background music — FREE, multiple character voices!',
  commandCategory: 'Entertainment',
  usages: '[voice?] [radio station name]',
  cooldowns: 15
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config.PREFIX;

  if (!args.length) {
    const voiceList = VOICE_KEYS.map(k => `  • ${bold(k.padEnd(6))} — ${VOICES[k].label}`).join('\n');
    return api.sendMessage(
      `╔══════════════════════════════╗\n` +
      `║  📻 ${bold('RADIO JINGLE')} ${bold('v' + VERSION)}       ║\n` +
      `║  🏷️  ${bold(TEAM)}    ║\n` +
      `╚══════════════════════════════╝\n\n` +
      `🎙️ ${bold('Libre — Voice + Background Music!')}\n\n` +
      `📋 ${bold('PAANO GAMITIN:')}\n${'─'.repeat(30)}\n\n` +
      `📻 ${P}jingle [station name]\n` +
      `📻 ${P}jingle [voice] [station name]\n\n` +
      `🎤 ${bold('MGA VOICE CHARACTERS:')}\n${voiceList}\n\n` +
      `${'─'.repeat(30)}\n` +
      `📌 ${bold('HALIMBAWA:')}\n` +
      `• ${P}jingle 96.9 Easy Rock Manila\n` +
      `• ${P}jingle dj 96.9 Easy Rock Manila\n` +
      `• ${P}jingle male 101.1 Yes The Best\n` +
      `• ${P}jingle fil 97.9 Home Radio\n` +
      `• ${P}jingle uk DWRR 101.9\n\n` +
      `🎵 ${bold('May background music + real voice!')} 📻`,
      threadID, messageID
    );
  }

  // Detect optional voice character prefix
  let voiceKey = 'dj';
  let stationArgs = args;
  if (VOICE_KEYS.includes(args[0]?.toLowerCase())) {
    voiceKey = args[0].toLowerCase();
    stationArgs = args.slice(1);
  }

  if (!stationArgs.length) {
    return api.sendMessage(
      `❌ Lagyan ng station name!\n💡 Halimbawa: ${P}jingle ${voiceKey} 96.9 Easy Rock Manila`,
      threadID, messageID
    );
  }

  const stationName = stationArgs.join(' ').trim();
  const voice = VOICES[voiceKey];

  api.setMessageReaction('📻', messageID, () => {}, true);
  api.sendMessage(
    `⏳ ${bold('Ginagawa ang iyong radio jingle...')}\n` +
    `📻 ${bold('Station:')} ${stationName}\n` +
    `🎤 ${bold('Voice:')} ${voice.label}\n` +
    `🎵 Generating script + voice + background music...\n` +
    `⚡ ${bold('Please wait (15–25 seconds)...')}`,
    threadID
  );

  const ts = Date.now();
  const rawVoicePath  = path.join(TEMP_DIR, `rv_${ts}.mp3`);
  const voicePath     = path.join(TEMP_DIR, `v_${ts}.mp3`);
  const bgPath        = path.join(TEMP_DIR, `bg_${ts}.mp3`);
  const outputPath    = path.join(TEMP_DIR, `out_${ts}.mp3`);

  try {
    // Step 1: Generate jingle script with AI
    const script = await generateJingleScript(stationName, voiceKey);

    // Step 2: Generate voice (Google TTS, free)
    const tmpVoice = await getVoiceAudio(script, voice.tl, voice.speed);

    // Step 3: Apply pitch shift for male deep voice (or just rename for others)
    if (voice.pitch !== 1.0) {
      await pitchShift(tmpVoice, voice.pitch, voicePath);
      await fs.remove(tmpVoice);
    } else {
      await fs.move(tmpVoice, voicePath, { overwrite: true });
    }

    // Step 4: Generate musical jingle background
    // Pad duration = voice duration estimate (generous)
    await generateJingleBg(12, bgPath);

    // Step 5: Mix voice + background
    await mixAudio(voicePath, bgPath, outputPath);

    // Cleanup intermediates
    cleanup(voicePath, bgPath);

    api.setMessageReaction('✅', messageID, () => {}, true);

    // Send jingle script info first
    await api.sendMessage(
      `📻 ${bold('RADIO JINGLE')} — ${bold('Ready!')}\n` +
      `🏷️ ${bold(TEAM)}\n` +
      `${'─'.repeat(30)}\n` +
      `🎙️ ${bold('Station:')} ${stationName}\n` +
      `🎤 ${bold('Voice:')} ${voice.label}\n` +
      `${'─'.repeat(30)}\n` +
      `📝 ${bold('Jingle Script:')}\n"${script}"\n` +
      `${'─'.repeat(30)}\n` +
      `🔊 ${bold('Sending jingle audio...')} 👇`,
      threadID
    );

    // Send the jingle audio file
    return api.sendMessage({
      body: `🎙️ ${bold('RADIO JINGLE')} — ${bold(stationName)}\n🎤 ${voice.label}\n🏷️ ${bold(TEAM)}`,
      attachment: fs.createReadStream(outputPath)
    }, threadID, () => cleanup(outputPath));

  } catch (e) {
    cleanup(rawVoicePath, voicePath, bgPath, outputPath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    console.error('[Jingle Error]', e.message);
    return api.sendMessage(
      `❌ ${bold('May error sa Jingle Generator.')}\n` +
      `🔧 ${e.message?.slice(0, 200)}\n` +
      `💡 Subukan ulit mamaya.`,
      threadID, messageID
    );
  }
};
