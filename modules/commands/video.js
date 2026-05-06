const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { execSync, exec } = require('child_process');

const AI_NAME = "Video AI";
const VERSION = "1.0.0";
const TEAM = "TEAM STARTCOPE BETA";

const TEMP_DIR = path.join(process.cwd(), 'utils/data/video_temp');
fs.ensureDirSync(TEMP_DIR);

function bold(text) {
  const map = { a:'𝗮',b:'𝗯',c:'𝗰',d:'𝗱',e:'𝗲',f:'𝗳',g:'𝗴',h:'𝗵',i:'𝗶',j:'𝗷',k:'𝗸',l:'𝗹',m:'𝗺',n:'𝗻',o:'𝗼',p:'𝗽',q:'𝗾',r:'𝗿',s:'𝘀',t:'𝘁',u:'𝘂',v:'𝘃',w:'𝘄',x:'𝘅',y:'𝘆',z:'𝘇',A:'𝗔',B:'𝗕',C:'𝗖',D:'𝗗',E:'𝗘',F:'𝗙',G:'𝗚',H:'𝗛',I:'𝗜',J:'𝗝',K:'𝗞',L:'𝗟',M:'𝗠',N:'𝗡',O:'𝗢',P:'𝗣',Q:'𝗤',R:'𝗥',S:'𝗦',T:'𝗧',U:'𝗨',V:'𝗩',W:'𝗪',X:'𝗫',Y:'𝗬',Z:'𝗭',0:'𝟬',1:'𝟭',2:'𝟮',3:'𝟯',4:'𝟰',5:'𝟱',6:'𝟲',7:'𝟳',8:'𝟴',9:'𝟵' };
  return String(text).split('').map(c => map[c] || c).join('');
}

async function generateScenePlan(concept, sceneCount, isMovie) {
  const prompt = isMovie
    ? `Create a ${sceneCount}-scene Tagalog movie storyboard for: "${concept}".
       For EACH scene, give ONE SHORT English image generation prompt (max 15 words) and ONE SHORT Tagalog scene caption (max 10 words).
       Format EXACTLY like this (repeat ${sceneCount} times):
       SCENE 1
       IMAGE: [english image prompt here]
       CAPTION: [tagalog caption here]
       SCENE 2
       IMAGE: [english image prompt here]
       CAPTION: [tagalog caption here]
       Only output the scenes, nothing else.`
    : `Create ${sceneCount} visual scenes for a video about: "${concept}".
       For EACH scene, give ONE SHORT English image generation prompt (max 15 words) and ONE SHORT caption (max 10 words).
       Format EXACTLY like this:
       SCENE 1
       IMAGE: [english image prompt here]
       CAPTION: [caption here]
       Only output the scenes, nothing else.`;

  const res = await axios.post('https://text.pollinations.ai/', {
    messages: [
      { role: 'system', content: 'You create precise visual storyboards. Follow the format exactly. Be concise.' },
      { role: 'user', content: prompt }
    ],
    model: 'openai',
    temperature: 0.8
  }, { headers: { 'Content-Type': 'application/json' }, timeout: 45000 });

  const text = typeof res.data === 'string' ? res.data : res.data?.choices?.[0]?.message?.content || '';
  const scenes = [];
  const sceneBlocks = text.split(/SCENE\s+\d+/i).filter(b => b.trim());

  for (const block of sceneBlocks) {
    const imgMatch = block.match(/IMAGE:\s*(.+)/i);
    const capMatch = block.match(/CAPTION:\s*(.+)/i);
    if (imgMatch) {
      scenes.push({
        imagePrompt: imgMatch[1].trim(),
        caption: capMatch ? capMatch[1].trim() : ''
      });
    }
  }

  if (scenes.length === 0) {
    for (let i = 1; i <= sceneCount; i++) {
      scenes.push({ imagePrompt: `${concept} scene ${i}, cinematic, high quality`, caption: `Scene ${i}` });
    }
  }

  return scenes.slice(0, sceneCount);
}

async function generateFrame(imagePrompt, index) {
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt + ', cinematic, high quality, 16:9 aspect ratio')}?width=1280&height=720&nologo=true&enhance=true&seed=${seed}`;
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000 });
  const fp = path.join(TEMP_DIR, `frame_${String(index).padStart(3, '0')}_${Date.now()}.jpg`);
  await fs.writeFile(fp, Buffer.from(res.data));
  return fp;
}

function sanitizeFFmpegText(text) {
  return (text || '')
    .replace(/[:\\]/g, ' ')
    .replace(/'/g, ' ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .trim()
    .slice(0, 60);
}

async function createVideo(scenes, outputPath, durationPerScene = 4) {
  const frameFiles = [];

  for (let i = 0; i < scenes.length; i++) {
    frameFiles.push(scenes[i].framePath);
  }

  const fileListPath = path.join(TEMP_DIR, `list_${Date.now()}.txt`);
  let fileListContent = '';
  for (const fp of frameFiles) {
    fileListContent += `file '${fp}'\nduration ${durationPerScene}\n`;
  }
  if (frameFiles.length > 0) {
    fileListContent += `file '${frameFiles[frameFiles.length - 1]}'\n`;
  }
  await fs.writeFile(fileListPath, fileListContent);

  await new Promise((resolve, reject) => {
    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${fileListPath}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p" -c:v libx264 -preset fast -crf 23 -movflags +faststart "${outputPath}" 2>&1`;
    exec(ffmpegCmd, { timeout: 300000 }, (err, stdout, stderr) => {
      fs.remove(fileListPath).catch(() => {});
      if (err) return reject(new Error('FFmpeg error: ' + (stderr || err.message).slice(0, 200)));
      resolve();
    });
  });

  return outputPath;
}

function cleanupFiles(files) {
  setTimeout(() => {
    for (const f of files) fs.remove(f).catch(() => {});
  }, 300000);
}

module.exports.config = {
  name: 'video',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Video AI — Generate slideshow videos from prompts or uploaded images using free AI',
  commandCategory: 'AI',
  usages: '[prompt] | movie [konsepto] | scenes [number] [prompt] | attach image + [prompt]',
  cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const prefix = global.config.PREFIX;
  const attachments = (event.attachments || []).filter(a => ['photo'].includes(a.type));
  const hasPhoto = attachments.length > 0;
  const sub = args[0]?.toLowerCase();

  if (!args.length && !hasPhoto) {
    return api.sendMessage(
      `╔══════════════════════════════════╗\n` +
      `║  🎬 ${bold('VIDEO AI')} ${bold('v' + VERSION)}             ║\n` +
      `║  🏷️  ${bold(TEAM)}      ║\n` +
      `║  🤖 ${bold('Drian AI')} & ${bold('Christopher AI')}    ║\n` +
      `╚══════════════════════════════════╝\n\n` +
      `✨ ${bold('Mag-generate ng video — libre, walang limit!')}\n\n` +
      `📋 ${bold('MGA COMMANDS:')}\n${'━'.repeat(34)}\n\n` +
      `🎬 ${prefix}video [prompt]\n` +
      `   → Basic video (5 scenes)\n\n` +
      `🎥 ${prefix}video movie [konsepto]\n` +
      `   → Tagalog movie-style video\n\n` +
      `🎞️ ${prefix}video scenes [bilang] [prompt]\n` +
      `   → Custom scene count (max 20)\n\n` +
      `🖼️ Attach image + ${prefix}video [prompt]\n` +
      `   → Gawa ng video mula sa photo\n\n` +
      `${'━'.repeat(34)}\n` +
      `📌 ${bold('HALIMBAWA:')}\n` +
      `• ${prefix}video beautiful sunset at the beach\n` +
      `• ${prefix}video movie Kwento ng Pag-ibig sa Maynila\n` +
      `• ${prefix}video scenes 10 space adventure story\n\n` +
      `⚠️ ${bold('TANDAAN:')}\n` +
      `• Bawat scene = 4 segundo sa video\n` +
      `• 5 scenes = ~20 segundo na video\n` +
      `• 20 scenes = ~80 segundo na video\n` +
      `• Generation time: 1-5 minuto\n` +
      `• ${bold('Libre at walang API key!')}`,
      threadID, messageID
    );
  }

  let sceneCount = 5;
  let concept = '';
  let isMovie = false;
  let fromImage = false;
  let uploadedImageUrl = null;

  if (hasPhoto) {
    fromImage = true;
    uploadedImageUrl = attachments[0].url || attachments[0].previewUrl;
    concept = args.join(' ').trim() || 'cinematic video from this photo';
    sceneCount = 6;
  } else if (sub === 'movie') {
    isMovie = true;
    concept = args.slice(1).join(' ').trim();
    sceneCount = 10;
  } else if (sub === 'scenes') {
    const n = parseInt(args[1]);
    sceneCount = (!isNaN(n) && n >= 2 && n <= 20) ? n : 5;
    concept = args.slice(2).join(' ').trim();
  } else {
    concept = args.join(' ').trim();
    sceneCount = 5;
  }

  if (!concept) return api.sendMessage(`❌ Lagyan ng konsepto o prompt!\n💡 ${prefix}video beautiful sunset`, threadID, messageID);

  const estimatedTime = Math.ceil(sceneCount * 0.5);
  api.setMessageReaction('🎬', messageID, () => {}, true);

  api.sendMessage(
    `⏳ ${bold('Ginagawa ang iyong video...')}\n\n` +
    `🎬 ${bold('Konsepto:')} ${concept}\n` +
    `🎞️ ${bold('Mga Scene:')} ${sceneCount}\n` +
    `⏱️ ${bold('Video length:')} ~${sceneCount * 4} segundo\n` +
    `🕐 ${bold('Inaasahang oras:')} ${estimatedTime}-${estimatedTime * 2} minuto\n\n` +
    `📸 ${bold('Generating scenes... Please wait!')}`,
    threadID
  );

  const allTempFiles = [];
  const outputPath = path.join(TEMP_DIR, `video_${Date.now()}.mp4`);
  allTempFiles.push(outputPath);

  try {
    let scenes;

    if (fromImage && uploadedImageUrl) {
      const imgRes = await axios.get(uploadedImageUrl, { responseType: 'arraybuffer', timeout: 30000 });
      const basePath = path.join(TEMP_DIR, `base_${Date.now()}.jpg`);
      await fs.writeFile(basePath, Buffer.from(imgRes.data));
      allTempFiles.push(basePath);
      scenes = [{ imagePrompt: concept, caption: 'Scene 1', framePath: basePath }];
      const extraScenePlan = await generateScenePlan(concept, sceneCount - 1, isMovie);
      for (let i = 0; i < extraScenePlan.length; i++) {
        const fp = await generateFrame(extraScenePlan[i].imagePrompt, i + 1);
        allTempFiles.push(fp);
        scenes.push({ imagePrompt: extraScenePlan[i].imagePrompt, caption: extraScenePlan[i].caption, framePath: fp });
      }
    } else {
      const scenePlan = await generateScenePlan(concept, sceneCount, isMovie);
      scenes = [];
      for (let i = 0; i < scenePlan.length; i++) {
        api.sendMessage(`📸 Generating scene ${i + 1}/${scenePlan.length}: ${scenePlan[i].caption || ''}`, threadID);
        const fp = await generateFrame(scenePlan[i].imagePrompt, i);
        allTempFiles.push(fp);
        scenes.push({ ...scenePlan[i], framePath: fp });
      }
    }

    if (scenes.length === 0) throw new Error('No scenes were generated.');

    api.sendMessage(`🎞️ ${bold('Combining scenes into video...')} Please wait!`, threadID);
    await createVideo(scenes, outputPath, 4);

    if (!fs.existsSync(outputPath)) throw new Error('Video file was not created.');
    const stats = fs.statSync(outputPath);
    if (stats.size < 1000) throw new Error('Video file is too small — generation failed.');

    api.setMessageReaction('✅', messageID, () => {}, true);

    const sceneList = scenes.map((s, i) => `  ${i + 1}. ${s.caption || s.imagePrompt.slice(0, 30)}`).join('\n');

    return api.sendMessage({
      body: `🎬 ${bold('VIDEO AI')} — ${bold('Video Generated!')}\n` +
            `🏷️ ${bold(TEAM)}\n` +
            `🤖 ${bold('Drian AI')} & ${bold('Christopher AI')}\n` +
            `${'━'.repeat(34)}\n` +
            `📽️ ${bold('Konsepto:')} ${concept}\n` +
            `🎞️ ${bold('Mga Scene:')} ${scenes.length}\n` +
            `⏱️ ${bold('Video length:')} ~${scenes.length * 4} segundo\n` +
            `${'━'.repeat(34)}\n` +
            `🎭 ${bold('MGA SCENE:')}\n${sceneList}\n` +
            `${'━'.repeat(34)}\n` +
            `✅ ${bold('Libre — Walang API Key!')}`,
      attachment: fs.createReadStream(outputPath)
    }, threadID, () => cleanupFiles(allTempFiles));

  } catch (e) {
    api.setMessageReaction('❌', messageID, () => {}, true);
    cleanupFiles(allTempFiles);
    console.error('[Video AI Error]', e.message);
    return api.sendMessage(
      `❌ ${bold('Hindi ma-generate ang video.')}\n🔧 Error: ${e.message}\n\n💡 Subukan ulit o bawasan ang bilang ng scenes.`,
      threadID, messageID
    );
  }
};
