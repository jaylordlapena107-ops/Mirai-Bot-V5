const bold = (text) => {
  const map = { a:'𝗮',b:'𝗯',c:'𝗰',d:'𝗱',e:'𝗲',f:'𝗳',g:'𝗴',h:'𝗵',i:'𝗶',j:'𝗷',k:'𝗸',l:'𝗹',m:'𝗺',n:'𝗻',o:'𝗼',p:'𝗽',q:'𝗾',r:'𝗿',s:'𝘀',t:'𝘁',u:'𝘂',v:'𝘃',w:'𝘄',x:'𝘅',y:'𝘆',z:'𝘇',A:'𝗔',B:'𝗕',C:'𝗖',D:'𝗗',E:'𝗘',F:'𝗙',G:'𝗚',H:'𝗛',I:'𝗜',J:'𝗝',K:'𝗞',L:'𝗟',M:'𝗠',N:'𝗡',O:'𝗢',P:'𝗣',Q:'𝗤',R:'𝗥',S:'𝗦',T:'𝗧',U:'𝗨',V:'𝗩',W:'𝗪',X:'𝗫',Y:'𝗬',Z:'𝗭',0:'𝟬',1:'𝟭',2:'𝟮',3:'𝟯',4:'𝟰',5:'𝟱',6:'𝟲',7:'𝟳',8:'𝟴',9:'𝟵' };
  return String(text).split('').map(c => map[c] || c).join('');
};

module.exports.config = {
  name: 'startcopeapi',
  version: '1.0.0',
  hasPermssion: 0,
  credits: 'TEAM STARTCOPE BETA',
  description: 'Show all free API endpoints used by Drian AI & Christopher AI — libre, no API key needed',
  commandCategory: 'AI',
  usages: '[text | image | video | all]',
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const sub = args[0]?.toLowerCase() || 'all';

  const header =
    `╔══════════════════════════════════╗\n` +
    `║  🌐 ${bold('STARTCOPE FREE API GUIDE')}    ║\n` +
    `║  🤖 ${bold('Drian AI')} & ${bold('Christopher AI')}   ║\n` +
    `║  🏷️  ${bold('TEAM STARTCOPE BETA')}        ║\n` +
    `╚══════════════════════════════════╝\n\n` +
    `✅ ${bold('LAHAT AY LIBRE — WALANG API KEY!')}\n` +
    `🔓 ${bold('No limit, No registration needed')}\n\n`;

  const textAPI =
    `━━━ 💬 ${bold('TEXT / CHAT AI API')} ━━━\n\n` +
    `🔗 ${bold('Endpoint:')}\n` +
    `https://text.pollinations.ai/\n\n` +
    `📤 ${bold('Method:')} POST\n` +
    `📋 ${bold('Body (JSON):')}\n` +
    `{\n` +
    `  "messages": [\n` +
    `    {"role":"system","content":"You are..."},\n` +
    `    {"role":"user","content":"[TANONG]"}\n` +
    `  ],\n` +
    `  "model": "openai",\n` +
    `  "temperature": 0.7\n` +
    `}\n\n` +
    `💡 ${bold('Simple GET (quick use):')}\n` +
    `https://text.pollinations.ai/[TANONG]\n\n` +
    `📌 ${bold('Example curl:')}\n` +
    `curl -X POST https://text.pollinations.ai/\\\n` +
    ` -H "Content-Type: application/json"\\\n` +
    ` -d '{"messages":[{"role":"user","content":"Hello"}],"model":"openai"}'\n\n`;

  const imageAPI =
    `━━━ 🎨 ${bold('IMAGE GENERATION API')} ━━━\n\n` +
    `🔗 ${bold('Endpoint:')}\n` +
    `https://image.pollinations.ai/prompt/[PROMPT]\n\n` +
    `📤 ${bold('Method:')} GET\n` +
    `⚙️ ${bold('Parameters:')}\n` +
    `  • width=1024 (px)\n` +
    `  • height=1024 (px)\n` +
    `  • nologo=true\n` +
    `  • enhance=true\n` +
    `  • seed=[number] (random)\n\n` +
    `📌 ${bold('Full Example URL:')}\n` +
    `https://image.pollinations.ai/prompt/\n` +
    `anime+sunset+over+ocean\n` +
    `?width=1024&height=1024&nologo=true\n` +
    `&enhance=true&seed=12345\n\n` +
    `💡 ${bold('Just open the URL in browser')} para ma-download ang image!\n\n`;

  const videoAPI =
    `━━━ 🎬 ${bold('VIDEO GENERATION')} ━━━\n\n` +
    `🔗 ${bold('Method:')} Image Frames + FFmpeg\n` +
    `⚙️ ${bold('How it works:')}\n` +
    `  1. Generate multiple scene images\n` +
    `     via Pollinations Image API\n` +
    `  2. Combine frames with FFmpeg\n` +
    `  3. Output as MP4 video\n\n` +
    `📌 ${bold('In-bot usage:')}\n` +
    `  !video [scene description]\n` +
    `  !video movie [movie concept]\n` +
    `  !video scenes [number] [prompt]\n\n` +
    `🔗 ${bold('Image API for frames:')}\n` +
    `https://image.pollinations.ai/\n\n`;

  const imageVisionAPI =
    `━━━ 🔍 ${bold('IMAGE VISION / ANALYSIS')} ━━━\n\n` +
    `🔗 ${bold('Endpoint:')}\n` +
    `https://api.airforce/v1/chat/completions\n\n` +
    `📤 ${bold('Method:')} POST\n` +
    `🔑 ${bold('Auth:')} Bearer free (any token)\n` +
    `📋 ${bold('Body (JSON):')}\n` +
    `{\n` +
    `  "model": "gpt-4o",\n` +
    `  "messages": [{"role":"user",\n` +
    `    "content": [\n` +
    `      {"type":"text","text":"Describe..."},\n` +
    `      {"type":"image_url",\n` +
    `       "image_url":{"url":"[IMG_URL]"}}\n` +
    `    ]\n` +
    `  }]\n` +
    `}\n\n`;

  const botUsage =
    `━━━ 🤖 ${bold('BOT COMMANDS')} ━━━\n\n` +
    `🟢 ${bold('DRIAN AI')} (by Manuelson Yasis)\n` +
    `  !drian [tanong]\n` +
    `  !drian imagine [prompt]\n` +
    `  !drian analyze + photo\n\n` +
    `🔷 ${bold('CHRISTOPHER AI')} (by TEAM STARTCOPE BETA)\n` +
    `  !christopher [tanong]\n` +
    `  !christopher imagine [prompt]\n` +
    `  !christopher analyze + photo\n\n` +
    `🎬 ${bold('VIDEO AI')}\n` +
    `  !video [prompt]\n` +
    `  !video movie [konsepto]\n\n` +
    `🌐 ${bold('VIEW API INFO:')}\n` +
    `  !startcopeapi text\n` +
    `  !startcopeapi image\n` +
    `  !startcopeapi video\n` +
    `  !startcopeapi all\n\n`;

  const footer =
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ ${bold('Lahat ng API ay 100% LIBRE')}\n` +
    `🔓 ${bold('No API Key, No Registration')}\n` +
    `♾️  ${bold('Powered by Pollinations.ai')}\n` +
    `🏷️  ${bold('TEAM STARTCOPE BETA')} 🤖\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  let msg = header;
  if (sub === 'text') msg += textAPI + footer;
  else if (sub === 'image') msg += imageAPI + footer;
  else if (sub === 'video') msg += videoAPI + footer;
  else if (sub === 'vision' || sub === 'analyze') msg += imageVisionAPI + footer;
  else msg += textAPI + imageAPI + imageVisionAPI + videoAPI + botUsage + footer;

  return api.sendMessage(msg, threadID, messageID);
};
