const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const bold = require('../../utils/bold');

const VERSION = "1.1.0";
const TEAM = "TEAM STARTCOPE BETA";
const TEMP_DIR = path.join(process.cwd(), 'utils/data/video_temp');
fs.ensureDirSync(TEMP_DIR);

async function pollinate(messages, temperature = 0.8) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await axios.post('https://text.pollinations.ai/', {
        messages, model: 'openai', temperature
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 40000 });
      const text = typeof res.data === 'string' ? res.data
        : res.data?.choices?.[0]?.message?.content || res.data?.text || String(res.data);
      if (!text || text.length < 2) throw new Error('Empty response from AI');
      return text;
    } catch (e) {
      const is429 = e.response?.status === 429;
      const isTimeout = e.code === 'ECONNABORTED' || e.message?.includes('timeout');
      if ((is429 || isTimeout) && i < 3) {
        await new Promise(r => setTimeout(r, (i + 1) * 4000 + Math.random() * 2000));
        continue;
      }
      throw e;
    }
  }
}

async function getScenePlan(concept, count, isMovie) {
  const prompt = isMovie
    ? `Create a ${count}-scene Tagalog movie storyboard for: "${concept}".
Each scene: ONE English image prompt (max 12 words) and ONE Tagalog caption (max 8 words).
Format EXACTLY (no extra text):
SCENE 1
IMAGE: [prompt]
CAPTION: [tagalog caption]
SCENE 2
IMAGE: [prompt]
CAPTION: [tagalog caption]`
    : `Create ${count} visual scenes for a video about: "${concept}".
Each scene: ONE image prompt (max 12 words) and ONE caption (max 8 words).
Format EXACTLY:
SCENE 1
IMAGE: [prompt]
CAPTION: [caption]`;

  const text = await pollinate([
    { role: 'system', content: 'You create concise visual storyboards. Strictly follow the format. No extra text.' },
    { role: 'user', content: prompt }
  ], 0.8);

  const blocks = text.split(/SCENE\s+\d+/i).filter(b => b.trim());
  const scenes = blocks.map(b => {
    const img = (b.match(/IMAGE:\s*(.+)/i) || [])[1]?.trim();
    const cap = (b.match(/CAPTION:\s*(.+)/i) || [])[1]?.trim();
    return img ? { imagePrompt: img, caption: cap || '' } : null;
  }).filter(Boolean);

  if (!scenes.length) {
    return Array.from({ length: count }, (_, i) => ({
      imagePrompt: `${concept} cinematic scene ${i + 1}, high quality`,
      caption: `Scene ${i + 1}`
    }));
  }
  return scenes.slice(0, count);
}

async function genFrame(prompt, index) {
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ', cinematic, 16:9')}?width=1280&height=720&nologo=true&seed=${seed}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000 });
      if (!res.data || res.data.byteLength < 500) throw new Error('Invalid frame response');
      const fp = path.join(TEMP_DIR, `frame_${String(index).padStart(3, '0')}_${Date.now()}.jpg`);
      await fs.writeFile(fp, Buffer.from(res.data));
      return fp;
    } catch (e) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, (attempt + 1) * 3000)); continue; }
      throw e;
    }
  }
}

function buildVideo(framePaths, outputPath, secPerFrame = 4) {
  return new Promise((resolve, reject) => {
    const listPath = path.join(TEMP_DIR, `list_${Date.now()}.txt`);
    let list = framePaths.map(fp => `file '${fp}'\nduration ${secPerFrame}`).join('\n');
    list += `\nfile '${framePaths[framePaths.length - 1]}'`;
    fs.writeFileSync(listPath, list);

    const cmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" ` +
      `-vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p" ` +
      `-c:v libx264 -preset ultrafast -crf 26 -movflags +faststart "${outputPath}"`;

    exec(cmd, { timeout: 600000 }, (err, stdout, stderr) => {
      fs.remove(listPath).catch(() => {});
      if (err) return reject(new Error(stderr?.slice(-300) || err.message));
      resolve();
    });
  });
}

function cleanup(files) { setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000); }

module.exports.config = {
  name: 'video',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Video AI — Generate MP4 videos from text prompts or uploaded images using free AI',
  commandCategory: 'AI',
  usages: '[prompt] | movie [konsepto] | scenes [num] [prompt] | photo + [prompt]',
  cooldowns: 15
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const P = global.config.PREFIX;
  const photos = (event.attachments || []).filter(a => a.type === 'photo');
  const sub = args[0]?.toLowerCase();

  if (!args.length && !photos.length) {
    return api.sendMessage(
      `╔════════════════════════════════╗\n` +
      `║  🎬 ${bold('VIDEO AI')} ${bold('v' + VERSION)}           ║\n` +
      `║  🏷️  ${bold(TEAM)}     ║\n` +
      `╚════════════════════════════════╝\n\n` +
      `✨ ${bold('Libre — Walang API Key, Walang Limit!')}\n\n` +
      `📋 ${bold('COMMANDS:')}\n${'━'.repeat(32)}\n` +
      `🎬 ${P}video [prompt]\n   → Video (3 scenes, ~12 sec)\n\n` +
      `🎥 ${P}video movie [konsepto]\n   → Tagalog movie style (8 scenes)\n\n` +
      `🎞️ ${P}video scenes [num] [prompt]\n   → Custom scenes (2-15)\n\n` +
      `🖼️ Attach photo + ${P}video [prompt]\n   → Video mula sa iyong photo\n\n` +
      `${'━'.repeat(32)}\n` +
      `📌 ${bold('HALIMBAWA:')}\n` +
      `• ${P}video beautiful sunset beach\n` +
      `• ${P}video movie Pag-ibig sa Maynila\n` +
      `• ${P}video scenes 6 space adventure\n\n` +
      `⚡ ${bold('Bawat scene = 4 segundo')}\n` +
      `⏱️ ${bold('3 scenes ≈ 1-2 minuto lang!')}`,
      threadID, messageID
    );
  }

  let sceneCount = 3, concept = '', isMovie = false, baseImageUrl = null;

  if (photos.length) {
    baseImageUrl = photos[0].url || photos[0].previewUrl;
    concept = args.join(' ').trim() || 'cinematic video';
    sceneCount = 4;
  } else if (sub === 'movie') {
    isMovie = true; concept = args.slice(1).join(' ').trim(); sceneCount = 8;
  } else if (sub === 'scenes') {
    const n = parseInt(args[1]);
    sceneCount = (!isNaN(n) && n >= 2 && n <= 15) ? n : 3;
    concept = args.slice(2).join(' ').trim();
  } else {
    concept = args.join(' ').trim();
  }

  if (!concept) return api.sendMessage(`❌ Lagyan ng konsepto!\n💡 ${P}video beautiful sunset`, threadID, messageID);

  api.setMessageReaction('🎬', messageID, () => {}, true);
  api.sendMessage(
    `⏳ ${bold('Ginagawa ang video...')}\n` +
    `🎬 ${bold('Konsepto:')} ${concept}\n` +
    `🎞️ ${bold('Scenes:')} ${sceneCount} (${sceneCount * 4} segundo)\n` +
    `⚡ ${bold('Parallel generation — mabilis!')}`,
    threadID
  );

  const allFiles = [];
  const outputPath = path.join(TEMP_DIR, `video_${Date.now()}.mp4`);
  allFiles.push(outputPath);

  try {
    let scenes;

    if (baseImageUrl) {
      const imgData = await axios.get(baseImageUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const baseFp = path.join(TEMP_DIR, `base_${Date.now()}.jpg`);
      await fs.writeFile(baseFp, Buffer.from(imgData.data));
      allFiles.push(baseFp);

      const extraPlan = await getScenePlan(concept, sceneCount - 1, false);
      const extraFrames = await Promise.all(extraPlan.map((s, i) => genFrame(s.imagePrompt, i + 1)));
      extraFrames.forEach(fp => allFiles.push(fp));

      scenes = [
        { imagePrompt: concept, caption: 'Scene 1', framePath: baseFp },
        ...extraPlan.map((s, i) => ({ ...s, framePath: extraFrames[i] }))
      ];
    } else {
      const plan = await getScenePlan(concept, sceneCount, isMovie);
      api.sendMessage(`📸 ${bold('Generating')} ${plan.length} ${bold('scenes in parallel...')}`, threadID);

      const framePaths = await Promise.all(plan.map((s, i) => genFrame(s.imagePrompt, i)));
      framePaths.forEach(fp => allFiles.push(fp));
      scenes = plan.map((s, i) => ({ ...s, framePath: framePaths[i] }));
    }

    if (!scenes.length) throw new Error('No scenes generated.');

    api.sendMessage(`🎞️ ${bold('Combining into video...')}`, threadID);
    await buildVideo(scenes.map(s => s.framePath), outputPath);

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000)
      throw new Error('Video file creation failed.');

    api.setMessageReaction('✅', messageID, () => {}, true);
    const sceneList = scenes.map((s, i) => `  ${i + 1}. ${s.caption || s.imagePrompt.slice(0, 35)}`).join('\n');

    return api.sendMessage({
      body: `🎬 ${bold('VIDEO AI')} — ${bold('Video Ready!')}\n` +
            `🏷️ ${bold(TEAM)}\n` +
            `${'━'.repeat(32)}\n` +
            `📽️ ${bold('Konsepto:')} ${concept}\n` +
            `🎞️ ${bold('Scenes:')} ${scenes.length} | ⏱️ ~${scenes.length * 4} segundo\n` +
            `${'━'.repeat(32)}\n` +
            `🎭 ${bold('SCENES:')}\n${sceneList}\n` +
            `${'━'.repeat(32)}\n` +
            `✅ ${bold('Libre — Walang API Key!')}`,
      attachment: fs.createReadStream(outputPath)
    }, threadID, () => cleanup(allFiles));
  } catch (e) {
    api.setMessageReaction('❌', messageID, () => {}, true);
    cleanup(allFiles);
    console.error('[Video Error]', e.message);
    return api.sendMessage(
      `❌ ${bold('Hindi ma-generate ang video.')}\n🔧 ${e.message}\n💡 Bawasan ang scenes o subukan ulit.`,
      threadID, messageID
    );
  }
};
