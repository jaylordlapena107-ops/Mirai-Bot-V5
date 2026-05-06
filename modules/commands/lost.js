const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const bold = require('../../utils/bold');

const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/lost_temp');
fs.ensureDirSync(TEMP_DIR);
function cleanup(...files) { setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000); }
function isTagalog(text) {
  const tw = ['ang','ng','na','sa','at','ay','ko','mo','ka','po','ako','siya','nang','din','pero','para','kasi','hindi','yung','mga'];
  return text.toLowerCase().split(/\s+/).filter(w => tw.includes(w)).length >= 2;
}

async function generateTribute(name) {
  const isTl = isTagalog(name);
  const prompt = isTl
    ? `Sumulat ng maganda, malalim, at heartfelt na tribute / eulogy para sa isang taong nawala na: "${name}". Sa Filipino/Tagalog. 3-4 talata. May pagmamahal, pag-aalala, at pag-asa. Tapusin ng "Rest in peace."`
    : `Write a beautiful, heartfelt tribute/eulogy (3-4 paragraphs) for someone who has passed away: "${name}". Be loving, comforting, and full of hope. End with "Rest in peace."`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.post('https://text.pollinations.ai/', {
        messages: [
          { role: 'system', content: 'You write beautiful, comforting tributes and eulogies for people who have passed.' },
          { role: 'user', content: prompt }
        ],
        model: 'openai', temperature: 0.85
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
      const text = typeof res.data === 'string' ? res.data : res.data?.choices?.[0]?.message?.content || String(res.data);
      if (text?.length > 30) return text.trim();
    } catch (e) { if (i < 2) await new Promise(r => setTimeout(r, 2000)); }
  }
  return `${name} may be gone from our sight, but never from our hearts. Every memory, every laugh, every moment shared is a treasure we carry with us forever. Heaven gained a beautiful soul, and we are better for having known them. Rest in peace.`;
}

async function generateVoice(text, isTl, outPath) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(isTl ? 'fil-PH-BlessicaNeural' : 'en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: '-18%', pitch: '-10Hz' });
  return new Promise((res, rej) => {
    const chunks = [];
    audioStream.on('data', d => chunks.push(d));
    audioStream.on('end', async () => { await fs.writeFile(outPath, Buffer.concat(chunks)); res(); });
    audioStream.on('error', rej);
  });
}

module.exports.config = {
  name: 'lost',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'Generate a beautiful tribute/eulogy for someone who passed — with voice audio (FREE)',
  commandCategory: 'Faith',
  usages: '[name of person]',
  cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';
  if (!args.length) return api.sendMessage(`💡 Usage: ${P}lost [name]\nExample: ${P}lost Lola Maria`, threadID, messageID);

  const name = args.join(' ').trim();
  const isTl = isTagalog(name);
  api.setMessageReaction('🕊️', messageID, () => {}, true);
  api.sendMessage(`🕊️ ${bold('Ginagawa ang tribute...')}\n💔 ${bold('For:')} ${name}\n⏳ ${bold('Please wait...')}`, threadID);

  const ts = Date.now();
  const voicePath = path.join(TEMP_DIR, `lost_${ts}.mp3`);
  try {
    const tribute = await generateTribute(name);
    await generateVoice(tribute, isTl, voicePath);
    api.setMessageReaction('✅', messageID, () => {}, true);
    await api.sendMessage(
      `🕊️ ${bold('IN LOVING MEMORY')} — ${bold(TEAM)}\n${'─'.repeat(30)}\n💔 ${bold(name)}\n${'─'.repeat(30)}\n` +
      tribute + `\n${'─'.repeat(30)}\n🎤 ${bold('Voice tribute ipinapadala...')} 👇`, threadID
    );
    return api.sendMessage({ body: `🕊️ ${bold('IN LOVING MEMORY')}\n💔 ${name}\n🏷️ ${bold(TEAM)}`, attachment: fs.createReadStream(voicePath) }, threadID, () => cleanup(voicePath));
  } catch (e) {
    cleanup(voicePath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(`❌ Error: ${e.message?.slice(0,150)}`, threadID, messageID);
  }
};
