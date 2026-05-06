const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const bold = require('../../utils/bold');

const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/removebg_temp');
fs.ensureDirSync(TEMP_DIR);

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

async function removeBgJimp(inputBuffer) {
  const { Jimp } = require('jimp');
  const img = await Jimp.fromBuffer(inputBuffer);
  const w = img.bitmap.width;
  const h = img.bitmap.height;

  // Sample 4 corners + 4 edge midpoints for bg color
  const samples = [
    [0,0],[w-1,0],[0,h-1],[w-1,h-1],
    [Math.floor(w/2),0],[Math.floor(w/2),h-1],
    [0,Math.floor(h/2)],[w-1,Math.floor(h/2)]
  ];
  let rSum=0, gSum=0, bSum=0;
  for (const [x,y] of samples) {
    const idx = (y * w + x) * 4;
    rSum += img.bitmap.data[idx];
    gSum += img.bitmap.data[idx+1];
    bSum += img.bitmap.data[idx+2];
  }
  const bgR = Math.round(rSum / samples.length);
  const bgG = Math.round(gSum / samples.length);
  const bgB = Math.round(bSum / samples.length);

  const TOLERANCE = 50;
  img.scan(0, 0, w, h, (x, y, idx) => {
    const r = img.bitmap.data[idx];
    const g = img.bitmap.data[idx+1];
    const b = img.bitmap.data[idx+2];
    if (colorDist(r,g,b, bgR,bgG,bgB) < TOLERANCE) {
      img.bitmap.data[idx+3] = 0;
    }
  });

  return await img.getBuffer('image/png');
}

async function removeBgApi(inputBuffer) {
  const key = process.env.REMOVE_BG_KEY;
  if (!key) throw new Error('No API key');
  const FormData = require('form-data');
  const form = new FormData();
  form.append('image_file', inputBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  form.append('size', 'auto');
  const res = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
    headers: { ...form.getHeaders(), 'X-Api-Key': key },
    responseType: 'arraybuffer',
    timeout: 30000
  });
  return Buffer.from(res.data);
}

module.exports.config = {
  name: 'removebg',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'Tanggalin ang background ng larawan — reply sa image + !removebg',
  commandCategory: 'Image',
  usages: '',
  cooldowns: 10
};

module.exports.run = async function ({ api, event }) {
  const { threadID, messageID } = event;

  // Get image from replied message or current message
  const attachments =
    event.messageReply?.attachments?.filter(a => a.type === 'photo' || a.type === 'sticker') ||
    event.attachments?.filter(a => a.type === 'photo' || a.type === 'sticker') ||
    [];

  if (!attachments.length) {
    return api.sendMessage(
      `📷 ${bold('Paano gamitin ang !removebg:')}\n\n` +
      `1. Mag-send ng larawan\n` +
      `2. I-reply ang larawan at i-type: ${bold('!removebg')}\n\n` +
      `O kaya i-send ang larawan kasabay ng command.`,
      threadID, messageID
    );
  }

  api.setMessageReaction('🖼️', messageID, () => {}, true);
  api.sendMessage(`⏳ ${bold('Nag-aalis ng background...')} Sandali lang...`, threadID);

  const imgUrl = attachments[0].url;
  const ts = Date.now();
  const outPath = path.join(TEMP_DIR, `rmbg_${ts}.png`);

  try {
    // Download the image
    const dlRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 20000 });
    const inputBuffer = Buffer.from(dlRes.data);

    let outBuffer;
    let method = 'Free (Jimp)';

    // Try remove.bg API first if key is available
    try {
      outBuffer = await removeBgApi(inputBuffer);
      method = 'AI (remove.bg)';
    } catch {
      // Fallback to Jimp-based removal
      outBuffer = await removeBgJimp(inputBuffer);
    }

    await fs.writeFile(outPath, outBuffer);

    api.setMessageReaction('✅', messageID, () => {}, true);
    await new Promise((res, rej) => {
      api.sendMessage({
        body: `✅ ${bold('Background removed!')} (${method})\n🏷️ ${bold(TEAM)}`,
        attachment: fs.createReadStream(outPath)
      }, threadID, err => {
        fs.remove(outPath).catch(() => {});
        err ? rej(err) : res();
      });
    });

  } catch (e) {
    fs.remove(outPath).catch(() => {});
    api.setMessageReaction('❌', messageID, () => {}, true);
    console.error('[RemoveBg]', e.message);
    api.sendMessage(
      `❌ ${bold('Hindi ma-proseso ang larawan.')}\n🔧 ${e.message?.slice(0, 120)}`,
      threadID, messageID
    );
  }
};
