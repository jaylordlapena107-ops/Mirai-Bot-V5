const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const bold = require('../../utils/bold');

const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/poem_temp');
fs.ensureDirSync(TEMP_DIR);

function cleanup(...files) {
  setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000); }

function isTagalog(text) {
  const tw = ['ang','ng','na','sa','at','ay','ko','mo','ka','po','ako','siya','nang','din','pero','para','kasi','hindi','yung','mga'];
  return text.toLowerCase().split(/\s+/).filter(w => tw.includes(w)).length >= 2;
}

async function generatePoem(topic) {
  const isTl = isTagalog(topic);
  const prompt = isTl
    ? `Sumulat ng maganda at malalim na tula (5-6 saknong) tungkol sa: "${topic}". Sa Filipino/Tagalog. May tugma kung posible. Maging emosyonal at heartfelt.`
    : `Write a beautiful, emotional poem (5-6 stanzas) about: "${topic}". Make it rhyme if possible. Be deeply heartfelt and poetic.`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.post('https://text.pollinations.ai/', {
        messages: [
          { role: 'system', content: 'You are a talented poet. Write beautiful, emotional, rhyming poems.' },
          { role: 'user', content: prompt }
        ],
        model: 'openai', temperature: 0.92
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
      const text = typeof res.data === 'string' ? res.data : res.data?.choices?.[0]?.message?.content || String(res.data);
      if (text?.length > 30) return text.trim();
    } catch (e) { if (i < 2) await new Promise(r => setTimeout(r, 2000)); }
  }
  return `In the quiet of the night,\nI think of you and all we shared.\nThough you may be out of sight,\nYou know how much I've always cared.`;
}

async function generateVoice(text, isTl, outPath) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(isTl ? 'fil-PH-BlessicaNeural' : 'en-US-EmmaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: '-12%', pitch: '+15Hz' });
  return new Promise((res, rej) => {
    const chunks = [];
    audioStream.on('data', d => chunks.push(d));
    audioStream.on('end', async () => { await fs.writeFile(outPath, Buffer.concat(chunks)); res(); });
    audioStream.on('error', rej);
  });
}

module.exports.config = {
  name: 'poem',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'AI writes a heartfelt poem with voice audio — FREE',
  commandCategory: 'Creative',
  usages: '[topic]',
  cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';
  if (!args.length) return api.sendMessage(`💡 Usage: ${P}poem [topic]\nExample: ${P}poem missing someone you love`, threadID, messageID);

  const topic = args.join(' ').trim();
  const isTl = isTagalog(topic);
  api.setMessageReaction('📝', messageID, () => {}, true);

  const ts = Date.now();
  const voicePath = path.join(TEMP_DIR, `poem_${ts}.mp3`);
  try {
    const poemText = await generatePoem(topic);
    await generateVoice(poemText, isTl, voicePath);
    api.setMessageReaction('✅', messageID, () => {}, true);
    await api.sendMessage(
      `📝 ${bold('POEM')} — ${bold(TEAM)}\n${'─'.repeat(30)}\n🖊️ ${bold('Topic:')} ${topic}\n${'─'.repeat(30)}\n` +
      poemText + `\n${'─'.repeat(30)}\n🎤 ${bold('Voice ipinapadala...')} 👇`, threadID
    );
    return api.sendMessage({ body: `📝 ${bold('POEM')}\n🖊️ ${topic}\n🏷️ ${bold(TEAM)}`, attachment: fs.createReadStream(voicePath) }, threadID, () => cleanup(voicePath));
  } catch (e) {
    cleanup(voicePath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(`❌ Error: ${e.message?.slice(0,150)}`, threadID, messageID);
  }
};
