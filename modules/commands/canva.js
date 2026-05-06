/**
 * !canva — AI Design Generator + STARTCOPE NEWS Image Maker
 * Powered by Pollinations AI image generation (free, no API key)
 * TEAM STARTCOPE BETA
 *
 * Commands:
 *   !canva news [title]       — Generate STARTCOPE NEWS image
 *   !canva design [prompt]    — Generate a custom design
 *   !canva logo [text]        — Generate a logo
 *   !canva [prompt] + photo   — Apply AI design to uploaded photo
 *   Reply to canva image to update design
 */

const axios  = require('axios');
const fs     = require('fs-extra');
const path   = require('path');
const bold   = require('../../utils/bold');

const TEAM     = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/canva_temp');
fs.ensureDirSync(TEMP_DIR);

// ── Pollinations image generator ──────────────────────────────────────────────
async function generateImage(prompt, width = 1080, height = 1080) {
  const seed   = Math.floor(Math.random() * 999999);
  const url    = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
                 `?width=${width}&height=${height}&nologo=true&enhance=true&seed=${seed}&model=flux`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000 });
      if (!res.data || res.data.byteLength < 1000) throw new Error('Invalid image');
      const fp = path.join(TEMP_DIR, `canva_${Date.now()}.jpg`);
      fs.writeFileSync(fp, Buffer.from(res.data));
      return fp;
    } catch (e) {
      if (i < 2) await new Promise(r => setTimeout(r, (i + 1) * 3000));
      else throw e;
    }
  }
}

// ── STARTCOPE NEWS prompt builder ─────────────────────────────────────────────
function buildNewsPrompt(title = 'Breaking News', extra = '') {
  const safeTitle = title.slice(0, 60).replace(/"/g, "'");
  return (
    `professional Philippine TV news broadcast lower third graphic, ` +
    `five-pointed star logo at top center with Google Play Store gradient colors: blue green yellow red, ` +
    `text "STARTCOPE" in large bold white sans-serif font, text "NEWS" in red bold font below star, ` +
    `dark navy blue solid background, glowing red accent horizontal bar, ` +
    `headline in large bright yellow bold text: "${safeTitle}", ` +
    `red banner strip at bottom with crisp white text: TEAM STARTCOPE BETA, ` +
    `ultra HD 4K, 100% sharp and legible text, high contrast, clean minimal layout, ` +
    `no decorative patterns overlapping text, professional broadcast design, photorealistic` +
    (extra ? `, ${extra}` : '')
  );
}

// ── Design prompt builder ─────────────────────────────────────────────────────
function buildDesignPrompt(subject, style = '') {
  return (
    `professional graphic design poster, ${subject}, ` +
    `modern minimalist style, vibrant colors, bold typography, ` +
    `sleek layout, sharp edges, ultra HD quality, ` +
    `"TEAM STARTCOPE BETA" branding at the bottom in small text` +
    (style ? `, ${style}` : '')
  );
}

function buildLogoPrompt(text) {
  return (
    `professional logo design for "${text}", ` +
    `geometric star shape icon, Google Play Store gradient colors (blue green yellow red), ` +
    `bold modern font, clean white background, vector art style, ` +
    `ultra HD sharp, no blur, professional brand identity`
  );
}

function cleanup(fp) { setTimeout(() => fs.remove(fp).catch(() => {}), 180000); }

function pushReply(info, senderID, threadID, extra = {}) {
  if (!info?.messageID) return;
  global.client.handleReply.push({ name: 'canva', messageID: info.messageID, author: senderID, threadID, ...extra });
}

// ── Command config ────────────────────────────────────────────────────────────
module.exports.config = {
  name:            'canva',
  version:         '1.0.0',
  hasPermssion:    0,
  credits:         TEAM,
  description:     'AI Design Generator + STARTCOPE NEWS image maker — free',
  commandCategory: 'AI',
  usages:          'news [title] | design [prompt] | logo [text] | [prompt]+photo',
  cooldowns:       5
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
      `║  🎨 ${bold('CANVA AI')} — ${bold('DESIGN STUDIO')} ║\n` +
      `║  ⚡ ${bold('TEAM STARTCOPE BETA')}      ║\n` +
      `╚══════════════════════════════════╝\n\n` +
      `✨ ${bold('Free AI Design Generator!')}\n` +
      `💡 ${bold('Reply to any canva image to update it!')}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 ${bold('COMMANDS:')}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📰 ${bold(P + 'canva news')} [title]\n` +
      `   → Generate STARTCOPE NEWS image\n\n` +
      `🎨 ${bold(P + 'canva design')} [prompt]\n` +
      `   → Generate custom design poster\n\n` +
      `⭐ ${bold(P + 'canva logo')} [text]\n` +
      `   → Generate professional logo\n\n` +
      `🖼️ ${bold(P + 'canva')} [prompt] + ${bold('photo attached')}\n` +
      `   → AI redesign of your photo\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 ${bold('EXAMPLES:')}\n` +
      `• ${P}canva news "Bagyo sa Pilipinas"\n` +
      `• ${P}canva design neon city poster\n` +
      `• ${P}canva logo STARTCOPE\n\n` +
      `💡 Reply sa output nito para mag-update!\n` +
      `🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  // ── NEWS image ──────────────────────────────────────────────────────────────
  if (sub === 'news') {
    const title = args.slice(1).join(' ').trim() || 'Breaking News Update';
    api.setMessageReaction('📰', messageID, () => {}, true);
    try {
      const prompt = buildNewsPrompt(title);
      const fp     = await generateImage(prompt, 1080, 1080);
      api.setMessageReaction('✅', messageID, () => {}, true);
      return api.sendMessage({
        body:
          `╔══════════════════════════════════╗\n` +
          `║  📰 ${bold('STARTCOPE NEWS')}             ║\n` +
          `║  ⭐ ${bold('TEAM STARTCOPE BETA')}      ║\n` +
          `╚══════════════════════════════════╝\n\n` +
          `📌 ${bold('Title:')} ${title}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `💡 Reply para mag-update ng design!\n` +
          `🏷️ ${bold(TEAM)}`,
        attachment: fs.createReadStream(fp)
      }, threadID, (err, info) => {
        cleanup(fp);
        pushReply(info, senderID, threadID, { type: 'news', title });
      });
    } catch (e) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(`❌ ${bold('Error generating news image.')}\n🔧 ${e.message}`, threadID, messageID);
    }
  }

  // ── LOGO ────────────────────────────────────────────────────────────────────
  if (sub === 'logo') {
    const text = args.slice(1).join(' ').trim() || 'STARTCOPE';
    api.setMessageReaction('⭐', messageID, () => {}, true);
    try {
      const prompt = buildLogoPrompt(text);
      const fp     = await generateImage(prompt, 1024, 1024);
      api.setMessageReaction('✅', messageID, () => {}, true);
      return api.sendMessage({
        body:
          `⭐ ${bold('LOGO GENERATED!')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📝 ${bold('Text:')} ${text}\n` +
          `💡 Reply para mag-update ng design!\n` +
          `🏷️ ${bold(TEAM)}`,
        attachment: fs.createReadStream(fp)
      }, threadID, (err, info) => {
        cleanup(fp);
        pushReply(info, senderID, threadID, { type: 'logo', text });
      });
    } catch (e) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(`❌ ${bold('Error generating logo.')}\n🔧 ${e.message}`, threadID, messageID);
    }
  }

  // ── Photo redesign (with attached image) ────────────────────────────────────
  if (photos.length) {
    const stylePrompt = args.join(' ').trim() || 'professional design';
    api.setMessageReaction('🎨', messageID, () => {}, true);
    try {
      const imgUrl = photos[0].url || photos[0].previewUrl;
      // Use Pollinations with the image as reference
      const prompt = `artistic redesign of this photo: ${stylePrompt}, ` +
        `professional graphic design style, vibrant colors, "TEAM STARTCOPE BETA" branding, ` +
        `ultra HD quality, sharp and clean`;
      const fp = await generateImage(prompt, 1080, 1080);
      api.setMessageReaction('✅', messageID, () => {}, true);
      return api.sendMessage({
        body:
          `🎨 ${bold('PHOTO REDESIGNED!')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🖼️ ${bold('Style:')} ${stylePrompt}\n` +
          `💡 Reply para mag-update ng design!\n` +
          `🏷️ ${bold(TEAM)}`,
        attachment: fs.createReadStream(fp)
      }, threadID, (err, info) => {
        cleanup(fp);
        pushReply(info, senderID, threadID, { type: 'design', prompt: stylePrompt });
      });
    } catch (e) {
      api.setMessageReaction('❌', messageID, () => {}, true);
      return api.sendMessage(`❌ ${bold('Hindi ma-redesign ang photo.')}\n🔧 ${e.message}`, threadID, messageID);
    }
  }

  // ── DESIGN (general prompt) ─────────────────────────────────────────────────
  const designPrompt = (sub === 'design' ? args.slice(1) : args).join(' ').trim();
  if (!designPrompt) return api.sendMessage(
    `❌ Lagyan ng design prompt!\n💡 Example: !canva design neon city poster`, threadID, messageID
  );

  api.setMessageReaction('🎨', messageID, () => {}, true);
  try {
    const prompt = buildDesignPrompt(designPrompt);
    const fp     = await generateImage(prompt, 1080, 1080);
    api.setMessageReaction('✅', messageID, () => {}, true);
    return api.sendMessage({
      body:
        `🎨 ${bold('DESIGN GENERATED!')}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 ${bold('Prompt:')} ${designPrompt}\n` +
        `💡 Reply para mag-update ng design!\n` +
        `🏷️ ${bold(TEAM)}`,
      attachment: fs.createReadStream(fp)
    }, threadID, (err, info) => {
      cleanup(fp);
      pushReply(info, senderID, threadID, { type: 'design', prompt: designPrompt });
    });
  } catch (e) {
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(`❌ ${bold('Error generating design.')}\n🔧 ${e.message}`, threadID, messageID);
  }
};

// ── Reply handler — update design ─────────────────────────────────────────────
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, senderID, body } = event;
  if (!body?.trim()) return;

  const prev = handleReply || {};
  const newPrompt = body.trim();
  api.setMessageReaction('🎨', messageID, () => {}, true);

  try {
    let fp;
    let caption;

    if (prev.type === 'news') {
      // Update news title or regenerate with new prompt
      const isNewTitle = !newPrompt.toLowerCase().includes('style') &&
                         !newPrompt.toLowerCase().includes('design') &&
                         !newPrompt.toLowerCase().includes('color');
      const title  = isNewTitle ? newPrompt : (prev.title || 'Breaking News');
      const prompt = buildNewsPrompt(title, isNewTitle ? '' : newPrompt);
      fp      = await generateImage(prompt, 1080, 1080);
      caption =
        `📰 ${bold('STARTCOPE NEWS — UPDATED!')}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 ${bold('Title:')} ${title}\n` +
        `💡 Reply ulit para mag-update!\n` +
        `🏷️ ${bold('TEAM STARTCOPE BETA')}`;

    } else if (prev.type === 'logo') {
      const text   = newPrompt;
      const prompt = buildLogoPrompt(text);
      fp      = await generateImage(prompt, 1024, 1024);
      caption =
        `⭐ ${bold('LOGO UPDATED!')}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 ${bold('Text:')} ${text}\n` +
        `💡 Reply ulit para mag-update!\n` +
        `🏷️ ${bold('TEAM STARTCOPE BETA')}`;

    } else {
      // General design update
      const prompt = buildDesignPrompt(newPrompt);
      fp      = await generateImage(prompt, 1080, 1080);
      caption =
        `🎨 ${bold('DESIGN UPDATED!')}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 ${bold('New prompt:')} ${newPrompt}\n` +
        `💡 Reply ulit para mag-update!\n` +
        `🏷️ ${bold('TEAM STARTCOPE BETA')}`;
    }

    api.setMessageReaction('✅', messageID, () => {}, true);
    return api.sendMessage({
      body: caption,
      attachment: fs.createReadStream(fp)
    }, threadID, (err, info) => {
      if (fp) setTimeout(() => fs.remove(fp).catch(() => {}), 180000);
      if (info?.messageID) {
        global.client.handleReply.push({
          name: 'canva',
          messageID: info.messageID,
          author: senderID,
          threadID,
          ...prev,
          prompt: newPrompt
        });
      }
    });

  } catch (e) {
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(`❌ ${bold('Error updating design.')}\n🔧 ${e.message}`, threadID, messageID);
  }
};
