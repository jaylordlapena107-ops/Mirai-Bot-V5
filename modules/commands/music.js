const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const bold = require('../../utils/bold');

const AI_NAME = "Music AI";
const VERSION = "1.0.0";
const TEAM = "TEAM STARTCOPE BETA";
const TEMP_DIR = path.join(process.cwd(), 'utils/data/music_temp');
fs.ensureDirSync(TEMP_DIR);

const MUSIC_SYSTEM = `You are Music AI, a creative music expert and songwriter under ${TEAM}.
You specialize in composing song lyrics, discussing music, recommending songs, explaining music theory, and creating original compositions.
When asked to make a song/music, write complete song lyrics with Verse, Chorus, and Bridge sections.
Support OPM (Original Pilipino Music), pop, ballad, hip-hop, R&B, love songs, and all genres.
Detect language: write in Filipino/Tagalog if requested, English if English, mix if needed.
Be creative, emotional, and musically accurate.`;

const history = new Map();

function isTagalog(text) {
  const tagalogWords = ['ang', 'ng', 'na', 'sa', 'at', 'ay', 'ko', 'mo', 'ka', 'po', 'opo',
    'ako', 'ikaw', 'siya', 'kami', 'tayo', 'kayo', 'sila', 'nang', 'din', 'rin', 'lang',
    'pero', 'kung', 'para', 'kasi', 'dahil', 'hindi', 'oo', 'pala', 'nga', 'naman', 'yung',
    'yun', 'doon', 'dito', 'nito', 'kanila', 'kanyang', 'pag', 'mag', 'mga'];
  const words = text.toLowerCase().split(/\s+/);
  return words.filter(w => tagalogWords.includes(w)).length >= 2;
}

async function pollinate(messages, temperature = 0.85) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await axios.post('https://text.pollinations.ai/', {
        messages, model: 'openai', temperature
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 50000 });
      const text = typeof res.data === 'string' ? res.data
        : res.data?.choices?.[0]?.message?.content || res.data?.text || String(res.data);
      if (!text || text.length < 2) throw new Error('Empty response from AI');
      return text;
    } catch (e) {
      const is429 = e.response?.status === 429;
      const isTimeout = e.code === 'ECONNABORTED' || e.message?.includes('timeout');
      if ((is429 || isTimeout) && i < 3) {
        const wait = (i + 1) * 4000 + Math.random() * 2000;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
}

async function chatAboutMusic(msg, threadID) {
  const h = history.get(threadID) || [];
  h.push({ role: 'user', content: msg });
  const reply = await pollinate([{ role: 'system', content: MUSIC_SYSTEM }, ...h], 0.85);
  h.push({ role: 'assistant', content: reply });
  history.set(threadID, h);
  return reply;
}

async function generateLyrics(concept, lang = 'tl') {
  const langInstr = lang === 'tl'
    ? 'Write the lyrics in Filipino/Tagalog (OPM style).'
    : 'Write the lyrics in English.';
  const prompt = `Create a complete original song about: "${concept}".
${langInstr}
Include: Title, [Verse 1], [Chorus], [Verse 2], [Chorus], [Bridge], [Outro].
Make it emotional, melodic, and catchy. Max 300 words total.`;
  return pollinate([
    { role: 'system', content: MUSIC_SYSTEM },
    { role: 'user', content: prompt }
  ], 0.9);
}

async function textToVoice(text, lang = 'tl') {
  const cleanText = text
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[*_#]/g, '')
    .replace(/\n+/g, '. ')
    .trim()
    .slice(0, 190);

  if (!cleanText) throw new Error('No text to convert to voice');

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
      const fp = path.join(TEMP_DIR, `music_${Date.now()}.mp3`);
      await fs.writeFile(fp, Buffer.from(res.data));
      return fp;
    } catch (e) {
      if (i < 2) { await new Promise(r => setTimeout(r, (i + 1) * 2000)); continue; }
      throw e;
    }
  }
}

function cleanup(fp) { setTimeout(() => fs.remove(fp).catch(() => {}), 180000); }

function pushReply(info, senderID, threadID, extra = {}) {
  if (!info?.messageID) return;
  global.client.handleReply.push({ name: 'music', messageID: info.messageID, author: senderID, threadID, ...extra });
}

module.exports.config = {
  name: 'music',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Music AI — Free AI: chat about music, generate song lyrics & send voice audio',
  commandCategory: 'AI',
  usages: '[music request] | chat [tanong] | lyrics [tema] | reset',
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const P = global.config.PREFIX;
  const sub = args[0]?.toLowerCase();

  if (!args.length) {
    return api.sendMessage(
      `╔══════════════════════════════╗\n` +
      `║  🎵 ${bold('MUSIC AI')} ${bold('v' + VERSION)}          ║\n` +
      `║  🏷️  ${bold(TEAM)}    ║\n` +
      `╚══════════════════════════════╝\n\n` +
      `🎶 ${bold('Libre — Walang API Key, Walang Limit!')}\n\n` +
      `📋 ${bold('MGA COMMANDS:')}\n${'─'.repeat(30)}\n\n` +
      `🎵 ${P}music [request]\n` +
      `   → Mag-generate ng kanta at i-send\n` +
      `     bilang voice audio 🎤\n\n` +
      `💬 ${P}music chat [tanong]\n` +
      `   → Mag-chat tungkol sa musika\n\n` +
      `📝 ${P}music lyrics [tema]\n` +
      `   → Ipakita lang ang lyrics (no audio)\n\n` +
      `🔄 ${P}music reset\n` +
      `   → I-clear ang conversation\n\n` +
      `${'─'.repeat(30)}\n` +
      `📌 ${bold('HALIMBAWA:')}\n` +
      `• ${P}music uhaw na pag-ibig\n` +
      `• ${P}music OPM love song para sa crush\n` +
      `• ${P}music chat Ano ang pinaka-sikat na OPM?\n` +
      `• ${P}music lyrics heartbreak English\n\n` +
      `🎤 ${bold('Mag-a-send ng real voice audio!')} 🎵`,
      threadID, messageID
    );
  }

  if (sub === 'reset') {
    history.delete(threadID);
    return api.sendMessage(
      `🔄 ${bold('Conversation cleared!')}\n💬 Type ${P}music [request] para magsimula.`,
      threadID, messageID
    );
  }

  if (sub === 'chat') {
    const question = args.slice(1).join(' ').trim();
    if (!question) return api.sendMessage(
      `❌ Lagyan ng tanong!\n💡 ${P}music chat Ano ang OPM?`, threadID, messageID
    );
    api.setMessageReaction('💬', messageID, () => {}, true);
    try {
      const answer = await chatAboutMusic(question, threadID);
      api.setMessageReaction('✅', messageID, () => {}, true);
      return api.sendMessage({
        body: `🎵 ${bold('MUSIC AI')} ${bold('v' + VERSION)}\n🏷️ ${bold(TEAM)}\n${'─'.repeat(30)}\n` +
              answer +
              `\n${'─'.repeat(30)}\n` +
              `💬 ${bold('Reply')} para mag-follow up\n` +
              `🎵 Type "${P}music [request]" para gumawa ng kanta`
      }, threadID, (err, info) => pushReply(info, senderID, threadID));
    } catch (e) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(`❌ ${bold('May error sa Music AI.')}\n🔧 ${e.message}`, threadID, messageID);
    }
  }

  if (sub === 'lyrics') {
    const topic = args.slice(1).join(' ').trim();
    if (!topic) return api.sendMessage(
      `❌ Lagyan ng tema!\n💡 ${P}music lyrics uhaw na pag-ibig`, threadID, messageID
    );
    api.setMessageReaction('📝', messageID, () => {}, true);
    try {
      const lang = isTagalog(topic) ? 'tl' : 'en';
      const lyrics = await generateLyrics(topic, lang);
      api.setMessageReaction('✅', messageID, () => {}, true);
      return api.sendMessage({
        body: `📝 ${bold('MUSIC AI')} — ${bold('Song Lyrics')}\n🏷️ ${bold(TEAM)}\n${'─'.repeat(30)}\n` +
              `🎵 ${bold('Topic:')} ${topic}\n${'─'.repeat(30)}\n` +
              lyrics +
              `\n${'─'.repeat(30)}\n` +
              `🎤 Type "${P}music ${topic}" para may kasama pang voice!`
      }, threadID, (err, info) => pushReply(info, senderID, threadID));
    } catch (e) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(`❌ ${bold('May error sa Music AI.')}\n🔧 ${e.message}`, threadID, messageID);
    }
  }

  const request = args.join(' ').trim();
  const lang = isTagalog(request) ? 'tl' : 'en';

  api.setMessageReaction('🎵', messageID, () => {}, true);
  api.sendMessage(
    `⏳ ${bold('Ginagawa ang iyong kanta...')}\n` +
    `🎵 ${bold('Request:')} ${request}\n` +
    `🌐 ${bold('Language:')} ${lang === 'tl' ? '🇵🇭 Filipino/Tagalog' : '🇺🇸 English'}\n` +
    `⚡ ${bold('Generating lyrics + voice audio...')}`,
    threadID
  );

  try {
    const lyrics = await generateLyrics(request, lang);
    const audioPath = await textToVoice(lyrics, lang);

    api.setMessageReaction('✅', messageID, () => {}, true);

    await api.sendMessage({
      body: `🎵 ${bold('MUSIC AI')} — ${bold('Song Generated!')}\n` +
            `🏷️ ${bold(TEAM)}\n${'─'.repeat(30)}\n` +
            `🎶 ${bold('Request:')} ${request}\n${'─'.repeat(30)}\n` +
            lyrics +
            `\n${'─'.repeat(30)}\n` +
            `🎤 ${bold('Voice audio ipinapadala...')} 👇`
    }, threadID, (err, info) => pushReply(info, senderID, threadID));

    return api.sendMessage({
      body: `🎤 ${bold('MUSIC AI')} — ${bold('Voice Audio')}\n🏷️ ${bold(TEAM)}\n🎵 "${request}"`,
      attachment: fs.createReadStream(audioPath)
    }, threadID, () => cleanup(audioPath));
  } catch (e) {
    api.setMessageReaction('❌', messageID, () => {}, true);
    console.error('[Music Error]', e.message);
    return api.sendMessage(
      `❌ ${bold('May error sa Music AI.')}\n🔧 ${e.message}\n💡 Subukan ulit mamaya.`,
      threadID, messageID
    );
  }
};

module.exports.handleReply = async function ({ api, event }) {
  const { threadID, messageID, senderID, body } = event;
  if (!body?.trim()) return;

  api.setMessageReaction('💬', messageID, () => {}, true);
  try {
    const answer = await chatAboutMusic(body.trim(), threadID);
    api.setMessageReaction('✅', messageID, () => {}, true);
    return api.sendMessage({
      body: `🎵 ${bold('MUSIC AI')}\n🏷️ ${bold(TEAM)}\n${'─'.repeat(30)}\n` +
            answer +
            `\n${'─'.repeat(30)}\n💬 ${bold('Reply')} para mag-follow up`
    }, threadID, (err, info) => pushReply(info, senderID, threadID));
  } catch (e) {
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(`❌ ${bold('May error sa Music AI.')}\n🔧 ${e.message}`, threadID, messageID);
  }
};
