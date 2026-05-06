const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const bold = require('../../utils/bold');

const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/prayer_temp');
fs.ensureDirSync(TEMP_DIR);

function cleanup(...files) {
  setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000);
}

function isTagalog(text) {
  const tw = ['ang','ng','na','sa','at','ay','ko','mo','ka','po','ako','ikaw','siya','nang','din','pero','para','kasi','hindi','yung','mga'];
  return text.toLowerCase().split(/\s+/).filter(w => tw.includes(w)).length >= 2;
}

async function generatePrayer(intent) {
  const isTl = isTagalog(intent);
  const prompt = isTl
    ? `Gumawa ng isang maganda, malalim, at heartfelt na panalangin (2-3 talata) tungkol sa: "${intent}". Tagalog lamang. Simulan ng "Panginoon," at tapusin ng "Amen."`
    : `Write a beautiful, heartfelt, sincere prayer (2-3 paragraphs) about: "${intent}". Start with "Dear Lord," and end with "Amen."`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.post('https://text.pollinations.ai/', {
        messages: [
          { role: 'system', content: 'You write sincere Christian prayers. Make them heartfelt and personal.' },
          { role: 'user', content: prompt }
        ],
        model: 'openai', temperature: 0.85
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
      const text = typeof res.data === 'string' ? res.data : res.data?.choices?.[0]?.message?.content || String(res.data);
      if (text?.length > 30) return text.trim();
    } catch (e) {
      if (i < 2) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return 'Dear Lord, we come before You with grateful hearts. Thank You for Your love, grace, and mercy. Guide our steps, protect our loved ones, and fill us with Your peace. In Jesus\' name, Amen.';
}

async function generateVoice(text, lang, outPath) {
  const tts = new MsEdgeTTS();
  const voice = lang === 'tl' ? 'fil-PH-BlessicaNeural' : 'en-US-AriaNeural';
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: '-15%', pitch: '+0Hz' });
  return new Promise((res, rej) => {
    const chunks = [];
    audioStream.on('data', d => chunks.push(d));
    audioStream.on('end', async () => {
      const buf = Buffer.concat(chunks);
      await fs.writeFile(outPath, buf);
      res();
    });
    audioStream.on('error', rej);
  });
}

module.exports.config = {
  name: 'prayer',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'AI generates a heartfelt prayer with voice audio — FREE',
  commandCategory: 'Faith',
  usages: '[prayer intention]',
  cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';

  const intent = args.length ? args.join(' ').trim() : 'guidance, strength, and peace';
  const isTl = isTagalog(intent);

  api.setMessageReaction('🙏', messageID, () => {}, true);

  const ts = Date.now();
  const voicePath = path.join(TEMP_DIR, `prayer_${ts}.mp3`);

  try {
    const prayerText = await generatePrayer(intent);
    await generateVoice(prayerText, isTl ? 'tl' : 'en', voicePath);

    api.setMessageReaction('✅', messageID, () => {}, true);
    await api.sendMessage(
      `🙏 ${bold('PRAYER')} — ${bold(TEAM)}\n` +
      `${'─'.repeat(32)}\n` +
      `✝️ ${bold('Intention:')} ${intent}\n` +
      `${'─'.repeat(32)}\n` +
      prayerText +
      `\n${'─'.repeat(32)}\n` +
      `🎤 ${bold('Voice prayer ipinapadala...')} 👇`,
      threadID
    );
    return api.sendMessage({
      body: `🙏 ${bold('PRAYER')} ✝️\n🏷️ ${bold(TEAM)}`,
      attachment: fs.createReadStream(voicePath)
    }, threadID, () => cleanup(voicePath));
  } catch (e) {
    cleanup(voicePath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(`❌ Error: ${e.message?.slice(0, 150)}`, threadID, messageID);
  }
};
