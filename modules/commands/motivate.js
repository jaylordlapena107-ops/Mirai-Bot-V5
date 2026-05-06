const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const bold = require('../../utils/bold');

const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/motivate_temp');
fs.ensureDirSync(TEMP_DIR);
function cleanup(...files) { setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000); }
function isTagalog(text) {
  const tw = ['ang','ng','na','sa','at','ay','ko','mo','ka','po','ako','siya','nang','din','pero','para','kasi','hindi','yung','mga'];
  return text.toLowerCase().split(/\s+/).filter(w => tw.includes(w)).length >= 2;
}

async function generateMotivation(situation) {
  const isTl = isTagalog(situation);
  const prompt = isTl
    ? `Sumulat ng malalim, heartfelt, at napaka-motivational na mensahe (3-4 talata) para sa isang tao na: "${situation}". Sa Filipino/Tagalog. Maging may puso, uplifting, at nagbibigay ng pag-asa.`
    : `Write a deeply heartfelt, powerful motivational message (3-4 paragraphs) for someone who is: "${situation}". Be warm, uplifting, and give real hope. Make it feel personal.`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.post('https://text.pollinations.ai/', {
        messages: [
          { role: 'system', content: 'You write powerful, heartfelt motivational messages that genuinely uplift people.' },
          { role: 'user', content: prompt }
        ],
        model: 'openai', temperature: 0.9
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
      const text = typeof res.data === 'string' ? res.data : res.data?.choices?.[0]?.message?.content || String(res.data);
      if (text?.length > 30) return text.trim();
    } catch (e) { if (i < 2) await new Promise(r => setTimeout(r, 2000)); }
  }
  return 'You are stronger than you think. Every challenge you face is building you into the person you are meant to be. Don\'t give up — your breakthrough is closer than you know. God sees you, and He has not forgotten you. Keep going!';
}

async function generateVoice(text, isTl, outPath) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(isTl ? 'fil-PH-AngeloNeural' : 'en-US-GuyNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: '-5%', pitch: '+10Hz' });
  return new Promise((res, rej) => {
    const chunks = [];
    audioStream.on('data', d => chunks.push(d));
    audioStream.on('end', async () => { await fs.writeFile(outPath, Buffer.concat(chunks)); res(); });
    audioStream.on('error', rej);
  });
}

module.exports.config = {
  name: 'motivate',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'AI generates a powerful personal motivational message with voice — FREE',
  commandCategory: 'Faith',
  usages: '[your situation / what you\'re going through]',
  cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';
  const situation = args.length ? args.join(' ').trim() : 'feeling lost and hopeless';
  const isTl = isTagalog(situation);

  api.setMessageReaction('💪', messageID, () => {}, true);
  api.sendMessage(`💪 ${bold('Ginagawa ang mensahe para sa iyo...')}\n⏳ ${bold('Please wait...')}`, threadID);

  const ts = Date.now();
  const voicePath = path.join(TEMP_DIR, `mot_${ts}.mp3`);
  try {
    const msg = await generateMotivation(situation);
    await generateVoice(msg, isTl, voicePath);
    api.setMessageReaction('✅', messageID, () => {}, true);
    await api.sendMessage(
      `💪 ${bold('MOTIVATIONAL MESSAGE')} — ${bold(TEAM)}\n${'─'.repeat(30)}\n📝 ${bold('For:')} ${situation}\n${'─'.repeat(30)}\n` +
      msg + `\n${'─'.repeat(30)}\n🎤 ${bold('Voice ipinapadala...')} 👇`, threadID
    );
    return api.sendMessage({ body: `💪 ${bold('MOTIVATE')}\n🏷️ ${bold(TEAM)}`, attachment: fs.createReadStream(voicePath) }, threadID, () => cleanup(voicePath));
  } catch (e) {
    cleanup(voicePath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(`❌ Error: ${e.message?.slice(0,150)}`, threadID, messageID);
  }
};
