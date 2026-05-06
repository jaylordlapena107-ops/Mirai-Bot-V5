const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const bold = require('../../utils/bold');

const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/story_temp');
fs.ensureDirSync(TEMP_DIR);
function cleanup(...files) { setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000); }
function isTagalog(text) {
  const tw = ['ang','ng','na','sa','at','ay','ko','mo','ka','po','ako','siya','nang','din','pero','para','kasi','hindi','yung','mga'];
  return text.toLowerCase().split(/\s+/).filter(w => tw.includes(w)).length >= 2;
}

async function generateStory(topic) {
  const isTl = isTagalog(topic);
  const prompt = isTl
    ? `Sumulat ng maikling kwento (300-500 salita) na may aral tungkol sa: "${topic}". Sa Filipino/Tagalog. May simula, gitna, at katapusan. Maging heartfelt at may moral lesson.`
    : `Write a short inspirational story (300-500 words) with a moral lesson about: "${topic}". Make it heartfelt, with a clear beginning, middle, and end. Include a moral at the end.`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.post('https://text.pollinations.ai/', {
        messages: [
          { role: 'system', content: 'You write short heartfelt stories with moral lessons.' },
          { role: 'user', content: prompt }
        ],
        model: 'openai', temperature: 0.88
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 40000 });
      const text = typeof res.data === 'string' ? res.data : res.data?.choices?.[0]?.message?.content || String(res.data);
      if (text?.length > 50) return text.trim();
    } catch (e) { if (i < 2) await new Promise(r => setTimeout(r, 2000)); }
  }
  return 'Once upon a time, there was a person who never gave up. No matter how hard life got, they kept going. And in the end, they found that every struggle was worth it. Moral: Never give up.';
}

async function generateVoice(text, isTl, outPath) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(isTl ? 'fil-PH-AngeloNeural' : 'en-US-BrianNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text.slice(0, 2000), { rate: '-8%', pitch: '+0Hz' });
  return new Promise((res, rej) => {
    const chunks = [];
    audioStream.on('data', d => chunks.push(d));
    audioStream.on('end', async () => { await fs.writeFile(outPath, Buffer.concat(chunks)); res(); });
    audioStream.on('error', rej);
  });
}

module.exports.config = {
  name: 'story',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'AI generates an inspirational short story with voice audio — FREE',
  commandCategory: 'Creative',
  usages: '[topic]',
  cooldowns: 15
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';
  if (!args.length) return api.sendMessage(`💡 Usage: ${P}story [topic]\nExample: ${P}story never giving up on your dreams`, threadID, messageID);

  const topic = args.join(' ').trim();
  const isTl = isTagalog(topic);
  api.setMessageReaction('📖', messageID, () => {}, true);
  api.sendMessage(`📖 ${bold('Ginagawa ang kwento...')}\n📝 ${bold('Topic:')} ${topic}\n⏳ ${bold('Wait a moment...')}`, threadID);

  const ts = Date.now();
  const voicePath = path.join(TEMP_DIR, `story_${ts}.mp3`);
  try {
    const storyText = await generateStory(topic);
    await generateVoice(storyText, isTl, voicePath);
    api.setMessageReaction('✅', messageID, () => {}, true);
    await api.sendMessage(
      `📖 ${bold('SHORT STORY')} — ${bold(TEAM)}\n${'─'.repeat(30)}\n📝 ${bold('Topic:')} ${topic}\n${'─'.repeat(30)}\n` +
      storyText.slice(0, 1500) + (storyText.length > 1500 ? '\n...(continues in voice)' : '') +
      `\n${'─'.repeat(30)}\n🎤 ${bold('Voice ipinapadala...')} 👇`, threadID
    );
    return api.sendMessage({ body: `📖 ${bold('STORY')}\n📝 ${topic}\n🏷️ ${bold(TEAM)}`, attachment: fs.createReadStream(voicePath) }, threadID, () => cleanup(voicePath));
  } catch (e) {
    cleanup(voicePath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(`❌ Error: ${e.message?.slice(0,150)}`, threadID, messageID);
  }
};
