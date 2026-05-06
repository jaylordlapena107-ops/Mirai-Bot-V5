const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const bold = require('../../utils/bold');

const VERSION = "1.0.0";
const TEAM = "TEAM STARTCOPE BETA";
const TEMP_DIR = path.join(process.cwd(), 'utils/data/jingle_temp');
fs.ensureDirSync(TEMP_DIR);

function cleanup(fp) {
  setTimeout(() => fs.remove(fp).catch(() => {}), 300000);
}

function execCmd(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function getVoiceAudio(text, lang) {
  const cleanText = text.replace(/[*_#\[\]()]/g, '').replace(/\n+/g, '. ').trim().slice(0, 200);
  for (let i = 0; i < 3; i++) {
    try {
      const encoded = encodeURIComponent(cleanText);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob&ttsspeed=0.9`;
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

async function generateJingleBg(duration, outPath) {
  // Radio jingle background: upbeat chord tones (C-E-G-C5) with a catchy melody feel
  // Uses ffmpeg lavfi sine generators mixed together
  const cmd = [
    'ffmpeg -y',
    '-f lavfi -i "sine=frequency=523:duration=' + duration + '"',  // C5 - bright top note
    '-f lavfi -i "sine=frequency=392:duration=' + duration + '"',  // G4
    '-f lavfi -i "sine=frequency=329:duration=' + duration + '"',  // E4
    '-f lavfi -i "sine=frequency=261:duration=' + duration + '"',  // C4 - bass root
    '-f lavfi -i "sine=frequency=659:duration=' + (duration * 0.5) + '"', // E5 accent
    '-filter_complex',
    '"[0:a]volume=0.18[a0];[1:a]volume=0.15[a1];[2:a]volume=0.13[a2];[3:a]volume=0.12[a3];[4:a]volume=0.10,adelay=' + Math.floor(duration * 400) + '|' + Math.floor(duration * 400) + '[a4];[a0][a1][a2][a3][a4]amix=inputs=5:duration=longest[aout]"',
    '-map "[aout]"',
    '-ar 44100 -ac 2 -b:a 128k',
    outPath
  ].join(' ');
  await execCmd(cmd);
}

async function mixVoiceAndBg(voicePath, bgPath, outPath) {
  // Mix voice (weight 3) over background jingle (weight 1), fade in/out added
  const cmd = [
    'ffmpeg -y',
    '-i', voicePath,
    '-i', bgPath,
    '-filter_complex',
    '"[1:a]volume=0.35[bg];[0:a][bg]amix=inputs=2:duration=first:weights=3 1[mixed];[mixed]afade=t=in:st=0:d=0.3,afade=t=out:st=0:d=0.3[aout]"',
    '-map "[aout]"',
    '-ar 44100 -ac 2 -b:a 128k',
    outPath
  ].join(' ');
  await execCmd(cmd);
}

async function generateJingleScript(stationName) {
  const prompt = `You are a professional radio jingle writer. Write a SHORT, catchy, upbeat radio jingle ANNOUNCEMENT script (max 3 sentences, under 50 words) for this station: "${stationName}".
It must sound like a real FM radio station jingle/ID — exciting, energetic, and memorable.
Just give the script text only, no labels, no quotes, no explanation.`;
  try {
    const res = await axios.post('https://text.pollinations.ai/', {
      messages: [
        { role: 'system', content: 'You are a professional radio jingle copywriter. Write short punchy radio IDs.' },
        { role: 'user', content: prompt }
      ],
      model: 'openai',
      temperature: 0.9
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
    const text = typeof res.data === 'string' ? res.data
      : res.data?.choices?.[0]?.message?.content || res.data?.text || String(res.data);
    return text.trim().slice(0, 200);
  } catch (e) {
    // Fallback jingle if AI fails
    return `${stationName}! Your number one station for the best music! Stay tuned, stay connected, and enjoy the ride!`;
  }
}

function isTagalog(text) {
  const tagalogWords = ['ang', 'ng', 'na', 'sa', 'at', 'ay', 'ko', 'mo', 'ka', 'po', 'opo',
    'ako', 'ikaw', 'siya', 'kami', 'tayo', 'kayo', 'sila', 'nang', 'din', 'rin', 'lang',
    'pero', 'kung', 'para', 'kasi', 'dahil', 'hindi', 'yung', 'mga', 'dito', 'doon'];
  const words = text.toLowerCase().split(/\s+/);
  return words.filter(w => tagalogWords.includes(w)).length >= 2;
}

module.exports.config = {
  name: 'jingle',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Generate a real radio station voice jingle with background music — FREE, no API key needed!',
  commandCategory: 'Entertainment',
  usages: '[radio station name]',
  cooldowns: 15
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config.PREFIX;

  if (!args.length) {
    return api.sendMessage(
      `╔══════════════════════════════╗\n` +
      `║  📻 ${bold('RADIO JINGLE')} ${bold('v' + VERSION)}       ║\n` +
      `║  🏷️  ${bold(TEAM)}    ║\n` +
      `╚══════════════════════════════╝\n\n` +
      `🎙️ ${bold('Libre — Voice + Background Music!')}\n\n` +
      `📋 ${bold('PAANO GAMITIN:')}\n${'─'.repeat(30)}\n\n` +
      `📻 ${P}jingle [station name]\n` +
      `   → Mag-generate ng radio jingle\n` +
      `     na may voice at background music!\n\n` +
      `${'─'.repeat(30)}\n` +
      `📌 ${bold('HALIMBAWA:')}\n` +
      `• ${P}jingle 96.9 Easy Rock Manila\n` +
      `• ${P}jingle 101.1 Yes The Best\n` +
      `• ${P}jingle 97.9 Home Radio\n` +
      `• ${P}jingle My Awesome Radio\n\n` +
      `🎤 ${bold('Mag-se-send ng real voice jingle!')} 📻`,
      threadID, messageID
    );
  }

  const stationName = args.join(' ').trim();
  const lang = isTagalog(stationName) ? 'tl' : 'en';

  api.setMessageReaction('📻', messageID, () => {}, true);
  api.sendMessage(
    `⏳ ${bold('Ginagawa ang iyong radio jingle...')}\n` +
    `📻 ${bold('Station:')} ${stationName}\n` +
    `🎙️ Generating voice + background music...\n` +
    `⚡ ${bold('Please wait (10-20 seconds)...')}`,
    threadID
  );

  const ts = Date.now();
  const voicePath  = path.join(TEMP_DIR, `voice_${ts}.mp3`);
  const bgPath     = path.join(TEMP_DIR, `bg_${ts}.mp3`);
  const outputPath = path.join(TEMP_DIR, `jingle_${ts}.mp3`);

  try {
    // Step 1: Generate jingle script via free AI
    const script = await generateJingleScript(stationName);

    // Step 2: Get TTS voice (Google TTS, free)
    const rawVoice = await getVoiceAudio(script, lang);

    // Step 3: Generate background jingle music using ffmpeg (free, built-in)
    await generateJingleBg(8, bgPath);

    // Step 4: Mix voice + background music
    await mixVoiceAndBg(rawVoice, bgPath, outputPath);

    // Cleanup raw voice after mix
    fs.remove(rawVoice).catch(() => {});
    fs.remove(bgPath).catch(() => {});

    api.setMessageReaction('✅', messageID, () => {}, true);

    // Send script text first
    await api.sendMessage(
      `📻 ${bold('RADIO JINGLE')} — ${bold('Generated!')}\n` +
      `🏷️ ${bold(TEAM)}\n` +
      `${'─'.repeat(30)}\n` +
      `🎙️ ${bold('Station:')} ${stationName}\n` +
      `${'─'.repeat(30)}\n` +
      `📝 ${bold('Jingle Script:')}\n"${script}"\n` +
      `${'─'.repeat(30)}\n` +
      `🔊 ${bold('Sending voice jingle...')} 👇`,
      threadID
    );

    // Send the jingle audio
    return api.sendMessage({
      body: `🎙️ ${bold('RADIO JINGLE')} — ${bold(stationName)}\n🏷️ ${bold(TEAM)}\n📻 Here's your free radio jingle!`,
      attachment: fs.createReadStream(outputPath)
    }, threadID, () => cleanup(outputPath));

  } catch (e) {
    // Cleanup on error
    [voicePath, bgPath, outputPath].forEach(f => fs.remove(f).catch(() => {}));
    api.setMessageReaction('❌', messageID, () => {}, true);
    console.error('[Jingle Error]', e.message);
    return api.sendMessage(
      `❌ ${bold('May error sa Jingle Generator.')}\n` +
      `🔧 ${e.message}\n` +
      `💡 Subukan ulit mamaya.`,
      threadID, messageID
    );
  }
};
