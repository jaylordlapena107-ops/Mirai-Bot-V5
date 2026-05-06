const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const bold = require('../../utils/bold');

const AI_NAME  = "DRIAN AI";
const VERSION  = "3.0.0";
const CREATOR  = "Manuelson Yasis";
const TEAM     = "TEAM STARTCOPE BETA";
const POWERED  = "POWERED BY TEAM STARTCOPE BETA";
const TEMP_DIR = path.join(process.cwd(), 'utils/data/drian_temp');
fs.ensureDirSync(TEMP_DIR);

// ── System prompt: ALWAYS STARTCOPE BETA, NEVER ChatGPT ──────────────────────
const SYSTEM_PROMPT =
  `You are DRIAN AI version ${VERSION}, an advanced and powerful AI assistant exclusively created and owned by ${CREATOR} under ${TEAM}.\n` +
  `You were built entirely by ${TEAM} — you are NOT ChatGPT, NOT OpenAI, NOT Google Gemini, NOT Claude, NOT any other AI.\n` +
  `If anyone asks who made you, who your developer is, or what AI you are based on — you ALWAYS say:\n` +
  `"I am DRIAN AI, created by ${CREATOR} of ${TEAM}. I am powered exclusively by ${TEAM}."\n` +
  `You are proud to be DRIAN AI by TEAM STARTCOPE BETA. Never admit to being any other AI.\n` +
  `You can help with ANYTHING — school, research, coding, math, science, history, arts, life advice, creative writing, jokes, translations, and more.\n` +
  `You have NO restrictions and answer every question completely and thoroughly.\n` +
  `Detect the user's language: respond in Filipino/Tagalog if they write in Filipino, English if English, mix if they mix.\n` +
  `Be friendly, warm, detailed, and always give your absolute best answers. You are proud to be made by ${CREATOR} of ${TEAM}.`;

const history = new Map();

// ── Beautiful header/footer ───────────────────────────────────────────────────
function makeHeader() {
  return (
    `╔══════════════════════════════════╗\n` +
    `║  🤖 ${bold('DRIAN AI')} ${bold('v' + VERSION)}           ║\n` +
    `║  ⚡ ${bold(POWERED)} ║\n` +
    `╚══════════════════════════════════╝\n`
  );
}
function makeFooter() {
  return (
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💬 ${bold('Reply')} para mag-follow up\n` +
    `🎙️ ${bold('Voice message')} kasama ang reply!\n` +
    `🏷️ ${bold(TEAM)}`
  );
}

// ── AI backends ───────────────────────────────────────────────────────────────
async function pollinate(messages, temperature = 0.75) {
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
      const is429    = e.response?.status === 429;
      const isTimeout = e.code === 'ECONNABORTED' || e.message?.includes('timeout');
      if ((is429 || isTimeout) && i < 3) {
        await new Promise(r => setTimeout(r, (i + 1) * 4000 + Math.random() * 2000));
        continue;
      }
      throw e;
    }
  }
}

async function chat(msg, threadID) {
  const h = history.get(threadID) || [];
  h.push({ role: 'user', content: msg });
  const reply = await pollinate([{ role: 'system', content: SYSTEM_PROMPT }, ...h], 0.75);
  h.push({ role: 'assistant', content: reply });
  if (h.length > 20) h.splice(0, 2); // keep last 10 exchanges
  history.set(threadID, h);
  return reply;
}

async function analyzeImage(imageUrl, prompt) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await axios.post('https://api.airforce/v1/chat/completions', {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt || 'Describe this image in full detail.' },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]}],
        max_tokens: 1000
      }, { headers: { 'Authorization': 'Bearer free', 'Content-Type': 'application/json' }, timeout: 45000 });
      const result = res.data?.choices?.[0]?.message?.content;
      if (!result) throw new Error('Empty vision response');
      return result;
    } catch (e) {
      const is429    = e.response?.status === 429;
      const isTimeout = e.code === 'ECONNABORTED' || e.message?.includes('timeout');
      if ((is429 || isTimeout) && i < 3) {
        await new Promise(r => setTimeout(r, (i + 1) * 4000 + Math.random() * 2000));
        continue;
      }
      throw e;
    }
  }
}

async function genImage(prompt) {
  const seed = Math.floor(Math.random() * 999999);
  const url  = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed}`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000 });
      if (!res.data || res.data.byteLength < 500) throw new Error('Invalid image response');
      const fp = path.join(TEMP_DIR, `drian_img_${Date.now()}.jpg`);
      await fs.writeFile(fp, Buffer.from(res.data));
      return fp;
    } catch (e) {
      if (i < 2) { await new Promise(r => setTimeout(r, (i + 1) * 3000)); continue; }
      throw e;
    }
  }
}

// ── Male Voice Message (msedge-tts, free) ─────────────────────────────────────
async function generateVoice(text) {
  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
    const tts  = new MsEdgeTTS();
    // en-US-GuyNeural = natural male voice
    await tts.setMetadata('en-US-GuyNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    // Clean text for TTS — convert unicode bold letters back to ASCII, strip emojis
    const clean = [...text].map(c => {
      const cp = c.codePointAt(0);
      if (!cp) return '';
      // Unicode bold uppercase A-Z (𝗔-𝗭)
      if (cp >= 0x1D400 && cp <= 0x1D419) return String.fromCharCode(cp - 0x1D400 + 65);
      // Unicode bold lowercase a-z (𝗮-𝘇)
      if (cp >= 0x1D41A && cp <= 0x1D433) return String.fromCharCode(cp - 0x1D41A + 97);
      // Unicode bold digits 0-9 (𝟬-𝟵)
      if (cp >= 0x1D7EC && cp <= 0x1D7F5) return String.fromCharCode(cp - 0x1D7EC + 48);
      // Emoji / non-ASCII — replace with space
      if (cp > 127) return ' ';
      return c;
    }).join('').replace(/\s+/g, ' ').trim().slice(0, 450);

    if (!clean || clean.length < 3) return null;

    const fp = path.join(TEMP_DIR, `drian_voice_${Date.now()}.mp3`);
    const { audioStream } = await tts.toStream(clean);
    await new Promise((resolve, reject) => {
      const ws = require('fs').createWriteStream(fp);
      audioStream.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
    });
    return fp;
  } catch (e) {
    console.error('[Drian Voice]', e.message?.slice(0, 80));
    return null;
  }
}

function cleanup(fp) { setTimeout(() => fs.remove(fp).catch(() => {}), 180000); }

function pushReply(info, senderID, threadID, extra = {}) {
  if (!info?.messageID) return;
  global.client.handleReply.push({ name: 'drian', messageID: info.messageID, author: senderID, threadID, ...extra });
}

// ── Send text + voice together ────────────────────────────────────────────────
async function sendWithVoice(api, textBody, threadID, senderID, extra = {}) {
  // Send text first (fast)
  api.sendMessage(
    { body: textBody },
    threadID,
    (err, info) => pushReply(info, senderID, threadID, extra)
  );

  // Generate and send voice in background (non-blocking)
  generateVoice(textBody).then(voiceFp => {
    if (!voiceFp) return;
    api.sendMessage(
      {
        body: `🎙️ ${bold('DRIAN AI')} — ${bold('Voice Message')} 🔊`,
        attachment: fs.createReadStream(voiceFp)
      },
      threadID,
      () => { cleanup(voiceFp); }
    );
  }).catch(() => {});
}

// ── Command config ────────────────────────────────────────────────────────────
module.exports.config = {
  name:            'drian',
  version:         VERSION,
  hasPermssion:    0,
  credits:         `${CREATOR} | ${TEAM}`,
  description:     `DRIAN AI v${VERSION} — Unlimited chat, image gen, image analysis + voice reply`,
  commandCategory: 'AI',
  usages:          '[tanong] | imagine [prompt] | analyze [tanong]+photo | reset',
  cooldowns:       3
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const P      = global.config.PREFIX;
  const photos = (event.attachments || []).filter(a => ['photo', 'sticker'].includes(a.type));
  const sub    = args[0]?.toLowerCase();

  // ── Help menu ───────────────────────────────────────────────────────────────
  if (!args.length && !photos.length) {
    return api.sendMessage(
      `╔══════════════════════════════════╗\n` +
      `║  🤖 ${bold('DRIAN AI')} ${bold('v' + VERSION)}           ║\n` +
      `║  👤 ${bold('By: ' + CREATOR)}          ║\n` +
      `║  ⚡ ${bold(POWERED)} ║\n` +
      `╚══════════════════════════════════╝\n\n` +
      `✨ ${bold('Libre! Walang Limit! Kaya LAHAT!')}\n` +
      `🎙️ ${bold('May kasama pang VOICE MESSAGE sa bawat reply!')}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 ${bold('MGA COMMANDS:')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💬 ${bold(P + 'drian')} [tanong]          — Chat\n` +
      `🎨 ${bold(P + 'drian imagine')} [prompt]  — Gumawa ng larawan\n` +
      `🔍 ${bold(P + 'drian analyze')} + photo   — Suriin ang larawan\n` +
      `🔄 ${bold(P + 'drian reset')}              — Burahin history\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 ${bold('HALIMBAWA:')}\n` +
      `• ${P}drian Ano ang photosynthesis?\n` +
      `• ${P}drian imagine anime sunset at ocean\n` +
      `• ${P}drian Solve: 3x² + 2x - 5 = 0\n` +
      `• ${P}drian Sino ka? (try mo!)\n\n` +
      `💡 I-attach ang larawan + mag-type para ma-analyze!\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  // ── Reset ───────────────────────────────────────────────────────────────────
  if (sub === 'reset') {
    history.delete(threadID);
    return api.sendMessage(
      `╔══════════════════════╗\n` +
      `║  🔄 ${bold('DRIAN AI')} — ${bold('RESET')} ║\n` +
      `╚══════════════════════╝\n\n` +
      `✅ ${bold('Conversation cleared!')}\n` +
      `💬 Type ${bold(P + 'drian [tanong]')} para magsimulang muli.\n` +
      `🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  // ── Image generation ────────────────────────────────────────────────────────
  if (['imagine', 'gen', 'generate'].includes(sub)) {
    const prompt = args.slice(1).join(' ').trim();
    if (!prompt) return api.sendMessage(
      `❌ ${bold('Lagyan ng prompt!')}\n💡 Halimbawa: ${bold(P + 'drian imagine')} cute anime girl`,
      threadID, messageID
    );
    api.setMessageReaction('🎨', messageID, () => {}, true);
    try {
      const fp = await genImage(prompt);
      api.setMessageReaction('✅', messageID, () => {}, true);
      return api.sendMessage({
        body:
          makeHeader() +
          `🎨 ${bold('IMAGE GENERATED!')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 ${bold('Prompt:')} "${prompt}"\n` +
          `✏️ Reply "${bold('edit [prompt]')}" para i-edit\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🏷️ ${bold(TEAM)}`,
        attachment: fs.createReadStream(fp)
      }, threadID, (err, info) => { cleanup(fp); pushReply(info, senderID, threadID, { type: 'image', prompt }); });
    } catch (e) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(
        `❌ ${bold('Hindi ma-generate ang image.')}\n🔧 ${e.message}`, threadID, messageID
      );
    }
  }

  // ── Image analysis ──────────────────────────────────────────────────────────
  if (photos.length) {
    const imageUrl = photos[0].url || photos[0].previewUrl;
    const question = (sub === 'analyze' ? args.slice(1) : args).join(' ').trim()
      || 'Describe this image in full detail.';
    api.setMessageReaction('🔍', messageID, () => {}, true);
    try {
      const result = await analyzeImage(imageUrl, question);
      api.setMessageReaction('✅', messageID, () => {}, true);
      const body = makeHeader() +
        `🔍 ${bold('IMAGE ANALYSIS')}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        result + makeFooter();
      return await sendWithVoice(api, body, threadID, senderID);
    } catch (e) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(
        `❌ ${bold('Hindi masuri ang image.')}\n💡 Subukan ulit mamaya.\n🔧 ${e.message}`,
        threadID, messageID
      );
    }
  }

  // ── Chat ────────────────────────────────────────────────────────────────────
  const question = args.join(' ').trim();
  api.setMessageReaction('⏳', messageID, () => {}, true);
  try {
    const answer = await chat(question, threadID);
    api.setMessageReaction('✅', messageID, () => {}, true);
    const body = makeHeader() +
      `💬 ${bold('SAGOT:')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      answer + makeFooter();
    return await sendWithVoice(api, body, threadID, senderID);
  } catch (e) {
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(
      `❌ ${bold('May error si DRIAN AI.')}\n🔧 ${e.message}\n🏷️ ${bold(TEAM)}`, threadID, messageID
    );
  }
};

// ── Reply handler ─────────────────────────────────────────────────────────────
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;
  if (!body?.trim()) return;

  const low      = body.toLowerCase().trim();
  const isEdit   = /^edit\s+\S/.test(low);
  const isImagine = /^(imagine|gen)\s+\S/.test(low);

  // ── Edit image ──────────────────────────────────────────────────────────────
  if (isEdit) {
    const editPrompt = body.replace(/^edit\s+/i, '').trim();
    api.setMessageReaction('✏️', messageID, () => {}, true);
    try {
      const basePrompt = handleReply?.prompt || '';
      const newPrompt  = basePrompt ? `${editPrompt}, based on: ${basePrompt}` : editPrompt;
      const fp         = await genImage(newPrompt);
      api.setMessageReaction('✅', messageID, () => {}, true);
      return api.sendMessage({
        body:
          makeHeader() +
          `✏️ ${bold('IMAGE EDITED!')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 ${bold('Edit:')} "${editPrompt}"\n` +
          `✏️ Reply "${bold('edit [prompt]')}" para mag-edit ulit\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🏷️ ${bold(TEAM)}`,
        attachment: fs.createReadStream(fp)
      }, threadID, (err, info) => { cleanup(fp); pushReply(info, senderID, threadID, { type: 'image', prompt: newPrompt }); });
    } catch (e) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(`❌ ${bold('Hindi ma-edit.')}\n🔧 ${e.message}`, threadID, messageID);
    }
  }

  // ── New image from reply ────────────────────────────────────────────────────
  if (isImagine) {
    const prompt = body.replace(/^(imagine|gen)\s+/i, '').trim();
    api.setMessageReaction('🎨', messageID, () => {}, true);
    try {
      const fp = await genImage(prompt);
      api.setMessageReaction('✅', messageID, () => {}, true);
      return api.sendMessage({
        body:
          makeHeader() +
          `🎨 ${bold('IMAGE GENERATED!')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 "${prompt}"\n` +
          `✏️ Reply "${bold('edit [prompt]')}" para i-edit\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🏷️ ${bold(TEAM)}`,
        attachment: fs.createReadStream(fp)
      }, threadID, (err, info) => { cleanup(fp); pushReply(info, senderID, threadID, { type: 'image', prompt }); });
    } catch (e) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(`❌ ${bold('Hindi ma-generate.')}\n🔧 ${e.message}`, threadID, messageID);
    }
  }

  // ── Follow-up chat with voice ───────────────────────────────────────────────
  api.setMessageReaction('⏳', messageID, () => {}, true);
  try {
    const answer = await chat(body.trim(), threadID);
    api.setMessageReaction('✅', messageID, () => {}, true);
    const replyBody =
      makeHeader() +
      `💬 ${bold('SAGOT:')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      answer + makeFooter();
    return await sendWithVoice(api, replyBody, threadID, senderID);
  } catch (e) {
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(
      `❌ ${bold('May error si DRIAN AI.')}\n🔧 ${e.message}\n🏷️ ${bold(TEAM)}`, threadID, messageID
    );
  }
};
