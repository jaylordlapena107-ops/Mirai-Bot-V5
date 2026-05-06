const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const bold = require('../../utils/bold');

const VERSION = "3.0.0";
const TEAM = "TEAM STARTCOPE BETA";
const TEMP_DIR = path.join(process.cwd(), 'utils/data/jingle_temp');
fs.ensureDirSync(TEMP_DIR);

// ─── VOICE CHARACTERS ────────────────────────────────────────────────────────
const VOICES = {
  dj:      { voice: 'en-US-GuyNeural',                   opts: { rate: '+10%', pitch: '+0Hz'   }, label: '🎙️ DJ Announcer',      fx: null         },
  male:    { voice: 'en-US-ChristopherNeural',            opts: { rate: '-5%',  pitch: '-20Hz'  }, label: '👨 Male (US)',          fx: null         },
  female:  { voice: 'en-US-EmmaNeural',                   opts: { rate: '+0%',  pitch: '+0Hz'   }, label: '👩 Female (US)',        fx: null         },
  aria:    { voice: 'en-US-AriaNeural',                   opts: { rate: '+0%',  pitch: '+0Hz'   }, label: '💃 Aria (US)',          fx: null         },
  sexy:    { voice: 'en-US-JennyNeural',                  opts: { rate: '-15%', pitch: '-30Hz'  }, label: '🥰 Sexy / Smooth',     fx: null         },
  grandpa: { voice: 'en-US-ChristopherNeural',            opts: { rate: '-28%', pitch: '-80Hz'  }, label: '👴 Grandpa',           fx: null         },
  grandma: { voice: 'en-US-AriaNeural',                   opts: { rate: '-25%', pitch: '-50Hz'  }, label: '👵 Grandma',           fx: null         },
  kid:     { voice: 'en-US-AnaNeural',                    opts: { rate: '+10%', pitch: '+60Hz'  }, label: '🧒 Kid',               fx: null         },
  news:    { voice: 'en-US-SteffanNeural',                opts: { rate: '-5%',  pitch: '+0Hz'   }, label: '📰 News Anchor',       fx: null         },
  uk:      { voice: 'en-GB-RyanNeural',                   opts: { rate: '-5%',  pitch: '+0Hz'   }, label: '🇬🇧 British Male',      fx: null         },
  uklady:  { voice: 'en-GB-SoniaNeural',                  opts: { rate: '+0%',  pitch: '+0Hz'   }, label: '🇬🇧 British Female',    fx: null         },
  au:      { voice: 'en-AU-WilliamMultilingualNeural',    opts: { rate: '+0%',  pitch: '+0Hz'   }, label: '🦘 Australian',        fx: null         },
  fil:     { voice: 'fil-PH-AngeloNeural',                opts: { rate: '-5%',  pitch: '+0Hz'   }, label: '🇵🇭 Filipino Lalaki',   fx: null         },
  filgirl: { voice: 'fil-PH-BlessicaNeural',              opts: { rate: '-5%',  pitch: '+0Hz'   }, label: '🇵🇭 Filipino Babae',    fx: null         },
  indian:  { voice: 'en-IN-PrabhatNeural',                opts: { rate: '+0%',  pitch: '+0Hz'   }, label: '🇮🇳 Indian',           fx: null         },
  robot:   { voice: 'en-US-GuyNeural',                    opts: { rate: '-5%',  pitch: '+0Hz'   }, label: '🤖 Robot',             fx: 'robot'      },
  brian:   { voice: 'en-US-BrianNeural',                  opts: { rate: '+0%',  pitch: '+0Hz'   }, label: '🎤 Brian',             fx: null         },
  roger:   { voice: 'en-US-RogerNeural',                  opts: { rate: '+5%',  pitch: '+0Hz'   }, label: '📻 Roger (Radio)',     fx: null         },
  sg:      { voice: 'en-SG-WayneNeural',                  opts: { rate: '+0%',  pitch: '+0Hz'   }, label: '🇸🇬 Singaporean',      fx: null         },
};
const VOICE_KEYS = Object.keys(VOICES);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function cleanup(...files) {
  setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000);
}

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err, _, stderr) => {
      if (err) reject(new Error(stderr?.slice(0, 300) || err.message));
      else resolve();
    });
  });
}

// ─── MICROSOFT NEURAL TTS (FREE) ──────────────────────────────────────────────
async function generateVoice(text, voiceKey, outPath) {
  const cfg = VOICES[voiceKey];
  const tts = new MsEdgeTTS();
  await tts.setMetadata(cfg.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, cfg.opts);
  return new Promise((resolve, reject) => {
    const chunks = [];
    audioStream.on('data', d => chunks.push(d));
    audioStream.on('end', async () => {
      const buf = Buffer.concat(chunks);
      if (buf.length < 100) return reject(new Error('Empty voice audio'));
      await fs.writeFile(outPath, buf);
      resolve();
    });
    audioStream.on('error', reject);
  });
}

// ─── ROBOT FX ─────────────────────────────────────────────────────────────────
async function applyRobotFx(inputPath, outPath) {
  await run(
    `ffmpeg -y -i "${inputPath}" ` +
    `-filter_complex "acrusher=level_in=4:level_out=4:bits=8:mode=log:aa=1,aecho=0.8:0.7:20|40:0.5|0.3" ` +
    `-b:a 128k "${outPath}"`
  );
}

// ─── BACKGROUND MUSIC ─────────────────────────────────────────────────────────
// Ascending melody riff: C5 → E5 → G5 → C6 → G5, then full C major chord + echo/reverb
async function generateJingleBg(padDuration, outPath) {
  const cmd = [
    'ffmpeg -y',
    '-f lavfi -i "aevalsrc=0.6*sin(2*PI*523*t)*exp(-t*5):s=44100:d=0.28"',   // C5
    '-f lavfi -i "aevalsrc=0.6*sin(2*PI*659*t)*exp(-t*5):s=44100:d=0.28"',   // E5
    '-f lavfi -i "aevalsrc=0.6*sin(2*PI*784*t)*exp(-t*5):s=44100:d=0.28"',   // G5
    '-f lavfi -i "aevalsrc=0.6*sin(2*PI*1047*t)*exp(-t*5):s=44100:d=0.28"',  // C6
    '-f lavfi -i "aevalsrc=0.5*sin(2*PI*784*t)*exp(-t*5):s=44100:d=0.22"',   // G5 (return)
    '-f lavfi -i "aevalsrc=(0.30*sin(2*PI*523*t)+0.28*sin(2*PI*659*t)+0.24*sin(2*PI*784*t)+0.20*sin(2*PI*1047*t)+0.14*sin(2*PI*1319*t))*exp(-t*0.42):s=44100:d=4.5"', // full chord
    `-f lavfi -i "aevalsrc=0:s=44100:d=${padDuration}"`,                      // silence pad
    '-filter_complex "[0][1][2][3][4][5]concat=n=6:v=0:a=1[melody];[melody]aecho=0.8:0.6:80|160:0.4|0.2[echoed];[echoed][6:a]concat=n=2:v=0:a=1[padded];[padded]volume=0.85[out]"',
    '-map "[out]"',
    '-ar 44100 -ac 2 -b:a 128k',
    `"${outPath}"`
  ].join(' ');
  await run(cmd);
}

// ─── MIX VOICE + BACKGROUND ───────────────────────────────────────────────────
async function mixAudio(voicePath, bgPath, outPath) {
  await run([
    'ffmpeg -y',
    `-i "${voicePath}"`,
    `-i "${bgPath}"`,
    '-filter_complex "[0:a]volume=2.0,afade=t=in:st=0:d=0.15[v];[1:a]volume=0.38[b];[v][b]amix=inputs=2:duration=first[out]"',
    '-map "[out]"',
    '-ar 44100 -ac 2 -b:a 128k',
    `"${outPath}"`
  ].join(' '));
}

// ─── HELP TEXT ────────────────────────────────────────────────────────────────
function buildHelp(prefix) {
  const col1 = VOICE_KEYS.slice(0, 10).map(k => `  ${bold(k.padEnd(8))} ${VOICES[k].label}`).join('\n');
  const col2 = VOICE_KEYS.slice(10).map(k  => `  ${bold(k.padEnd(8))} ${VOICES[k].label}`).join('\n');
  return (
    `╔═══════════════════════════════════╗\n` +
    `║  📻 ${bold('RADIO JINGLE v' + VERSION)}           ║\n` +
    `║  🏷️  ${bold(TEAM)}       ║\n` +
    `╚═══════════════════════════════════╝\n\n` +
    `🎙️ ${bold('Microsoft Neural TTS — FREE!')}\n` +
    `🎵 ${bold('Real musical background + echo!')}\n\n` +
    `📋 ${bold('PAANO GAMITIN:')}\n${'─'.repeat(35)}\n` +
    `${prefix}jingle [text]\n` +
    `${prefix}jingle [voice] [text]\n\n` +
    `🎤 ${bold('LAHAT NG VOICE CHARACTERS:')}\n${'─'.repeat(35)}\n` +
    col1 + '\n' + col2 + '\n\n' +
    `${'─'.repeat(35)}\n` +
    `📌 ${bold('HALIMBAWA:')}\n` +
    `• ${prefix}jingle 96.9 Easy Rock Manila your number one station!\n` +
    `• ${prefix}jingle grandpa Welcome to 96.9 Easy Rock!\n` +
    `• ${prefix}jingle grandma Good morning listeners!\n` +
    `• ${prefix}jingle robot Initializing broadcast sequence!\n` +
    `• ${prefix}jingle fil Magandang umaga sa lahat!\n` +
    `• ${prefix}jingle kid This is my favorite radio station!\n` +
    `• ${prefix}jingle uk This is 96.9 Easy Rock Manila!\n\n` +
    `✅ ${bold('YOU write the script — real human prompt!')}\n` +
    `📥 ${bold('Pwedeng i-download ang audio!')}`
  );
}

// ─── COMMAND ──────────────────────────────────────────────────────────────────
module.exports.config = {
  name: 'jingle',
  version: VERSION,
  hasPermssion: 0,
  credits: TEAM,
  description: 'Generate a real radio jingle with your own script — 20 character voices + musical background (FREE)',
  commandCategory: 'Entertainment',
  usages: '[voice?] [your jingle text]',
  cooldowns: 15
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';

  if (!args.length) {
    return api.sendMessage(buildHelp(P), threadID, messageID);
  }

  // Detect optional voice character prefix
  let voiceKey = 'dj';
  let scriptArgs = args;
  if (VOICE_KEYS.includes(args[0]?.toLowerCase())) {
    voiceKey = args[0].toLowerCase();
    scriptArgs = args.slice(1);
  }

  if (!scriptArgs.length) {
    return api.sendMessage(
      `❌ Lagyan ng jingle text!\n` +
      `💡 Halimbawa: ${P}jingle ${voiceKey} 96.9 Easy Rock Manila your number one station!`,
      threadID, messageID
    );
  }

  const jingleText = scriptArgs.join(' ').trim();
  const vcfg = VOICES[voiceKey];

  api.setMessageReaction('📻', messageID, () => {}, true);
  api.sendMessage(
    `⏳ ${bold('Ginagawa ang iyong radio jingle...')}\n` +
    `🎤 ${bold('Voice:')} ${vcfg.label}\n` +
    `📝 ${bold('Script:')} "${jingleText.slice(0, 80)}${jingleText.length > 80 ? '...' : ''}"\n` +
    `🎵 Generating voice + background music...\n` +
    `⚡ ${bold('Please wait (10–20 seconds)...')}`,
    threadID
  );

  const ts = Date.now();
  const voiceRaw  = path.join(TEMP_DIR, `vr_${ts}.mp3`);
  const voiceFx   = path.join(TEMP_DIR, `vf_${ts}.mp3`);
  const bgPath    = path.join(TEMP_DIR, `bg_${ts}.mp3`);
  const outputPath = path.join(TEMP_DIR, `out_${ts}.mp3`);

  try {
    // Step 1: Generate Microsoft Neural TTS voice
    await generateVoice(jingleText, voiceKey, voiceRaw);

    // Step 2: Apply special FX if needed (robot)
    let finalVoicePath = voiceRaw;
    if (vcfg.fx === 'robot') {
      await applyRobotFx(voiceRaw, voiceFx);
      finalVoicePath = voiceFx;
    }

    // Step 3: Generate musical jingle background
    await generateJingleBg(14, bgPath);

    // Step 4: Mix voice + background music
    await mixAudio(finalVoicePath, bgPath, outputPath);

    // Cleanup intermediates
    cleanup(voiceRaw, voiceFx, bgPath);

    api.setMessageReaction('✅', messageID, () => {}, true);

    // Send info card first
    await api.sendMessage(
      `📻 ${bold('RADIO JINGLE — Ready!')}\n` +
      `🏷️ ${bold(TEAM)}\n` +
      `${'─'.repeat(32)}\n` +
      `🎤 ${bold('Voice:')} ${vcfg.label}\n` +
      `📝 ${bold('Script:')}\n"${jingleText}"\n` +
      `${'─'.repeat(32)}\n` +
      `🔊 ${bold('Sending audio...')} 👇\n` +
      `📥 ${bold('Pwedeng i-download!')}`,
      threadID
    );

    // Send the downloadable jingle audio
    return api.sendMessage({
      body: `🎙️ ${bold('RADIO JINGLE')} 📻\n🎤 ${vcfg.label}\n🏷️ ${bold(TEAM)}\n📥 Hold & save to download!`,
      attachment: fs.createReadStream(outputPath)
    }, threadID, () => cleanup(outputPath));

  } catch (e) {
    cleanup(voiceRaw, voiceFx, bgPath, outputPath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    console.error('[Jingle Error]', e.message);
    return api.sendMessage(
      `❌ ${bold('May error sa Jingle Generator.')}\n` +
      `🔧 ${e.message?.slice(0, 200)}\n` +
      `💡 Subukan ulit mamaya.`,
      threadID, messageID
    );
  }
};
