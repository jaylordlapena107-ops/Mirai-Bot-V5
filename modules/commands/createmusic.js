const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const bold = require('../../utils/bold');

const VERSION = '2.0.0';
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

function isTagalog(text) {
  const tw = ['ang','ng','na','sa','at','ay','ko','mo','ka','po','ako','ikaw','siya','kami','tayo','nang','din','pero','para','kasi','hindi','yung','mga'];
  return text.toLowerCase().split(/\s+/).filter(w => tw.includes(w)).length >= 2;
}

async function generateLyrics(theme) {
  const isTl = isTagalog(theme);
  const langNote = isTl ? 'Write entirely in Filipino/Tagalog OPM style.' : 'Write in English.';
  const prompt = `You are a professional songwriter. Write COMPLETE, LONG song lyrics for a song titled/themed: "${theme}".
${langNote}
Structure: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus x2], [Outro].
Make it emotional, melodic, deeply heartfelt, and radio-ready. Include ALL sections fully written out. Min 300 words.`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.post('https://text.pollinations.ai/', {
        messages: [
          { role: 'system', content: 'Professional OPM/pop songwriter. Write complete heartfelt song lyrics.' },
          { role: 'user', content: prompt }
        ],
        model: 'openai', temperature: 0.9
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 60000 });
      const text = typeof res.data === 'string' ? res.data : res.data?.choices?.[0]?.message?.content || String(res.data);
      if (text?.length > 50) return text.trim();
    } catch (e) {
      if (i < 2) await new Promise(r => setTimeout(r, (i + 1) * 2000));
    }
  }
  return `${theme}\n\nYou are my life, you are my everything.\nEvery breath I take, every song I sing.\nWithout you here, the world is incomplete.\nYou are my heart, my soul, my heartbeat.`;
}

async function generateVoice(text, outPath) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: '-8%', pitch: '+10Hz' });
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

async function generateFilipinVoice(text, outPath) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('fil-PH-BlessicaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: '-10%', pitch: '+0Hz' });
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

async function generateMusicBg(durationSec, outPath) {
  // Rich chord + slow tremolo effect — sounds like a ballad bed
  const cmd = [
    'ffmpeg -y',
    `-f lavfi -i "aevalsrc=(0.28*sin(2*PI*261*t)+0.24*sin(2*PI*329*t)+0.20*sin(2*PI*392*t)+0.16*sin(2*PI*523*t)+0.12*sin(2*PI*130*t))*0.5*(1+0.65*sin(2*PI*0.07*t)):s=44100:d=${durationSec}"`,
    '-filter_complex "[0:a]aecho=0.8:0.6:200|400:0.35|0.18[out]"',
    '-map "[out]"',
    '-ar 44100 -ac 2 -b:a 64k',
    `"${outPath}"`
  ].join(' ');
  await run(cmd);
}

async function mixAudio(voicePath, bgPath, outPath) {
  await run([
    'ffmpeg -y',
    `-i "${voicePath}"`,
    `-i "${bgPath}"`,
    '-filter_complex "[0:a]volume=2.2[v];[1:a]volume=0.35[b];[v][b]amix=inputs=2:duration=first[out]"',
    '-map "[out]" -ar 44100 -ac 2 -b:a 96k',
    `"${outPath}"`
  ].join(' '));
}

function cleanLyricsForTTS(lyrics) {
  return lyrics
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[*_#]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports.config = {
  name: 'createmusic',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'AI creates a full original song with voice + background music — FREE',
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
      `║  🎵 ${bold('CREATE MUSIC v' + VERSION)}         ║\n` +
      `║  🏷️  ${bold(TEAM)}    ║\n` +
      `╚══════════════════════════════╝\n\n` +
      `🎶 ${bold('AI creates full song + voice + music!')}\n\n` +
      `📋 ${bold('PAANO GAMITIN:')}\n${'─'.repeat(30)}\n\n` +
      `🎵 ${P}createmusic [title/theme]\n\n` +
      `📌 ${bold('HALIMBAWA:')}\n` +
      `• ${P}createmusic You're My Life\n` +
      `• ${P}createmusic Ikaw ang lahat sa akin\n` +
      `• ${P}createmusic Missing you tonight\n` +
      `• ${P}createmusic Kung sana nanatili ka\n\n` +
      `🎤 ${bold('Sends FULL lyrics + voice audio!')}`,
      threadID, messageID
    );
  }

  const theme = args.join(' ').trim();
  const isTl = isTagalog(theme);

  api.setMessageReaction('🎵', messageID, () => {}, true);
  api.sendMessage(
    `⏳ ${bold('Ginagawa ang iyong kanta...')}\n` +
    `🎵 ${bold('Theme:')} ${theme}\n` +
    `🌐 ${bold('Language:')} ${isTl ? '🇵🇭 Filipino' : '🇺🇸 English'}\n` +
    `⚡ ${bold('Generating lyrics + voice + music... (20–40 seconds)')}\n` +
    `🎶 Ito ay magiging isang FULL na kanta!`,
    threadID
  );

  const ts = Date.now();
  const voicePath = path.join(TEMP_DIR, `v_${ts}.mp3`);
  const bgPath    = path.join(TEMP_DIR, `bg_${ts}.mp3`);
  const outPath   = path.join(TEMP_DIR, `out_${ts}.mp3`);

  try {
    // Step 1: Generate full lyrics
    const rawLyrics = await generateLyrics(theme);
    const ttsText = cleanLyricsForTTS(rawLyrics);

    // Step 2: Generate voice (Filipino or English Neural TTS)
    if (isTl) {
      await generateFilipinVoice(ttsText, voicePath);
    } else {
      await generateVoice(ttsText, voicePath);
    }

    // Step 3: Generate long background music (match voice + extra)
    await generateMusicBg(300, bgPath); // 5 min background (voice trims it)

    // Step 4: Mix
    await mixAudio(voicePath, bgPath, outPath);
    cleanup(voicePath, bgPath);

    api.setMessageReaction('✅', messageID, () => {}, true);

    // Send lyrics first
    const lyricsMsg = `🎵 ${bold('CREATE MUSIC')} — ${bold('Song Ready!')}\n` +
      `🏷️ ${bold(TEAM)}\n` +
      `${'─'.repeat(32)}\n` +
      `🎶 ${bold('Title/Theme:')} ${theme}\n` +
      `${'─'.repeat(32)}\n` +
      rawLyrics.slice(0, 1800) +
      (rawLyrics.length > 1800 ? '\n...(continues in voice audio)' : '') +
      `\n${'─'.repeat(32)}\n` +
      `🎤 ${bold('Sending voice + music audio...')} 👇`;
    await api.sendMessage(lyricsMsg, threadID);

    // Send audio
    return api.sendMessage({
      body: `🎵 ${bold('FULL SONG')} — ${bold(theme)}\n🎤 AI Voice + Background Music\n🏷️ ${bold(TEAM)}\n📥 Hold & save to download!`,
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
