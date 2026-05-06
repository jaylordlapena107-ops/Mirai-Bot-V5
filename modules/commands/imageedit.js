const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const bold = require('../../utils/bold');

const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/imageedit_temp');
fs.ensureDirSync(TEMP_DIR);

const FILTERS = {
  'grayscale':       img => img.greyscale(),
  'gray':            img => img.greyscale(),
  'bw':              img => img.greyscale(),
  'black and white': img => img.greyscale(),
  'blackandwhite':   img => img.greyscale(),
  'sepia':           img => img.sepia(),
  'vintage':         img => img.sepia(),
  'blur':            img => img.blur(5),
  'soft':            img => img.blur(2),
  'invert':          img => img.invert(),
  'negative':        img => img.invert(),
  'flip':            img => img.flip({ horizontal: true }),
  'mirror':          img => img.flip({ horizontal: true }),
  'flop':            img => img.flip({ vertical: true }),
  'bright':          img => img.brightness(0.35),
  'brighten':        img => img.brightness(0.35),
  'lighten':         img => img.brightness(0.35),
  'dark':            img => img.brightness(-0.35),
  'darken':          img => img.brightness(-0.35),
  'contrast':        img => img.contrast(0.4),
  'enhance':         img => img.contrast(0.2).brightness(0.1),
  'fade':            img => img.brightness(0.2).contrast(-0.2),
  'rotate':          img => img.rotate(90),
  'rotate90':        img => img.rotate(90),
  'rotate180':       img => img.rotate(180),
  'rotate270':       img => img.rotate(270),
};

const FILTER_NAMES = Object.keys(FILTERS);

function detectFilter(prompt) {
  const p = prompt.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const key of FILTER_NAMES) {
    if (p.includes(key)) return key;
  }
  return null;
}

module.exports.config = {
  name: 'imageedit',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'I-edit ang larawan gamit ang filter — reply sa image + !imageedit [filter]',
  commandCategory: 'Image',
  usages: '[filter: grayscale | sepia | blur | bright | dark | invert | flip | contrast | rotate | vintage | enhance]',
  cooldowns: 8
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const prompt = args.join(' ').trim();

  const attachments =
    event.messageReply?.attachments?.filter(a => a.type === 'photo' || a.type === 'sticker') ||
    event.attachments?.filter(a => a.type === 'photo' || a.type === 'sticker') ||
    [];

  if (!attachments.length) {
    return api.sendMessage(
      `🎨 ${bold('Paano gamitin ang !imageedit:')}\n\n` +
      `1. Mag-send ng larawan\n` +
      `2. I-reply at i-type: ${bold('!imageedit [filter]')}\n\n` +
      `📋 ${bold('Available Filters:')}\n` +
      `• grayscale / bw\n` +
      `• sepia / vintage\n` +
      `• blur / soft\n` +
      `• bright / dark\n` +
      `• invert / negative\n` +
      `• flip / mirror / flop\n` +
      `• contrast / enhance\n` +
      `• rotate / rotate180 / rotate270\n` +
      `• fade`,
      threadID, messageID
    );
  }

  if (!prompt) {
    return api.sendMessage(
      `❓ ${bold('Walang filter na sinabi.')}\n\n` +
      `Halimbawa: ${bold('!imageedit grayscale')}\n` +
      `O: ${bold('!imageedit sepia')}\n\n` +
      `Mga filter: grayscale, sepia, blur, bright, dark, invert, flip, contrast, rotate, enhance, fade, vintage`,
      threadID, messageID
    );
  }

  const filterKey = detectFilter(prompt);
  if (!filterKey) {
    return api.sendMessage(
      `❓ ${bold('Hindi kilala ang filter: "'  + prompt + '"')}\n\n` +
      `Subukan: grayscale, sepia, blur, bright, dark, invert, flip, contrast, rotate, enhance, vintage`,
      threadID, messageID
    );
  }

  api.setMessageReaction('🎨', messageID, () => {}, true);
  api.sendMessage(`⏳ ${bold('Nag-eedit ng larawan...')} Filter: ${bold(filterKey)}`, threadID);

  const imgUrl = attachments[0].url;
  const ts = Date.now();
  const outPath = path.join(TEMP_DIR, `edit_${ts}.jpg`);

  try {
    const { Jimp } = require('jimp');

    const dlRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 20000 });
    const inputBuffer = Buffer.from(dlRes.data);

    const img = await Jimp.fromBuffer(inputBuffer);
    FILTERS[filterKey](img);
    const outBuffer = await img.getBuffer('image/jpeg');
    await fs.writeFile(outPath, outBuffer);

    api.setMessageReaction('✅', messageID, () => {}, true);
    await new Promise((res, rej) => {
      api.sendMessage({
        body: `✅ ${bold('Filter applied: ' + filterKey.toUpperCase())}\n🏷️ ${bold(TEAM)}`,
        attachment: fs.createReadStream(outPath)
      }, threadID, err => {
        fs.remove(outPath).catch(() => {});
        err ? rej(err) : res();
      });
    });

  } catch (e) {
    fs.remove(outPath).catch(() => {});
    api.setMessageReaction('❌', messageID, () => {}, true);
    console.error('[ImageEdit]', e.message);
    api.sendMessage(
      `❌ ${bold('Hindi ma-edit ang larawan.')}\n🔧 ${e.message?.slice(0, 120)}`,
      threadID, messageID
    );
  }
};
