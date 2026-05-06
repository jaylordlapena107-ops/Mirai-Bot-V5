const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const bold = require('../../utils/bold');

const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/quote_temp');
fs.ensureDirSync(TEMP_DIR);
function cleanup(...files) { setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000); }

const QUOTES_EN = [
  { q: 'The Lord is my shepherd; I shall not want.', a: 'Psalm 23:1' },
  { q: 'Faith is taking the first step even when you can\'t see the whole staircase.', a: 'Martin Luther King Jr.' },
  { q: 'God never said that the journey would be easy, but He did say that the arrival would be worthwhile.', a: 'Max Lucado' },
  { q: 'When you pass through the waters, I will be with you; and through the rivers, they shall not overwhelm you.', a: 'Isaiah 43:2' },
  { q: 'Be strong and courageous. Do not be afraid or terrified, for the LORD your God goes with you wherever you go.', a: 'Joshua 1:9' },
  { q: 'The pain you feel today is the strength you feel tomorrow.', a: 'Unknown' },
  { q: 'Every storm runs out of rain. Every dark night turns into day. Keep going.', a: 'Unknown' },
  { q: 'Those we love don\'t go away. They walk beside us every day.', a: 'Unknown' },
  { q: 'Grief is the price we pay for love, and it is worth every penny.', a: 'Queen Elizabeth II' },
  { q: 'Stars can\'t shine without darkness.', a: 'Unknown' },
];
const QUOTES_TL = [
  { q: 'Ang Panginoon ang aking pastol; wala akong kakulangan.', a: 'Salmo 23:1' },
  { q: 'Ang pananampalataya ay pagtanggap ng unang hakbang kahit hindi mo makita ang buong hagdan.', a: 'Martin Luther King Jr.' },
  { q: 'Hindi sinabi ng Diyos na madali ang biyahe, ngunit sinabi Niya na sulit ang pagtungo.', a: 'Max Lucado' },
  { q: 'Kapag lumakad ka sa tubig, nandoon Ako; at sa mga ilog, hindi ka malulunod.', a: 'Isaias 43:2' },
  { q: 'Maging malakas at matapang. Huwag matakot, sapagkat ang Panginoon mong Diyos ay kasama mo saan ka man pumunta.', a: 'Josue 1:9' },
  { q: 'Ang sakit na nararamdaman mo ngayon ay ang lakas na mararamdaman mo bukas.', a: 'Hindi Kilala' },
  { q: 'Ang bawat bagyo ay may katapusan. Ang bawat madilim na gabi ay magiging araw. Ituloy mo.', a: 'Hindi Kilala' },
  { q: 'Ang mga minamahal natin ay hindi talaga nag-aalis. Naglalakad sila sa tabi natin araw-araw.', a: 'Hindi Kilala' },
  { q: 'Ang mga bituin ay hindi makasisikat kung walang kadiliman.', a: 'Hindi Kilala' },
];

async function generateVoice(text, isTl, outPath) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(isTl ? 'fil-PH-BlessicaNeural' : 'en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: '-10%', pitch: '+10Hz' });
  return new Promise((res, rej) => {
    const chunks = [];
    audioStream.on('data', d => chunks.push(d));
    audioStream.on('end', async () => { await fs.writeFile(outPath, Buffer.concat(chunks)); res(); });
    audioStream.on('error', rej);
  });
}

module.exports.config = {
  name: 'quote',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'Send a random inspirational quote with voice — FREE',
  commandCategory: 'Faith',
  usages: '[en/tl]',
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const isTl = args[0]?.toLowerCase() === 'tl';
  const pool = isTl ? QUOTES_TL : QUOTES_EN;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const fullText = `"${chosen.q}" — ${chosen.a}`;

  api.setMessageReaction('💛', messageID, () => {}, true);
  const ts = Date.now();
  const voicePath = path.join(TEMP_DIR, `quote_${ts}.mp3`);
  try {
    await generateVoice(fullText, isTl, voicePath);
    api.setMessageReaction('✅', messageID, () => {}, true);
    await api.sendMessage(
      `💛 ${bold('INSPIRATIONAL QUOTE')} — ${bold(TEAM)}\n${'─'.repeat(30)}\n` +
      `"${chosen.q}"\n\n— ${bold(chosen.a)}\n${'─'.repeat(30)}\n🎤 ${bold('Voice ipinapadala...')} 👇`, threadID
    );
    return api.sendMessage({ body: `💛 ${bold('QUOTE')}\n🏷️ ${bold(TEAM)}`, attachment: fs.createReadStream(voicePath) }, threadID, () => cleanup(voicePath));
  } catch (e) {
    cleanup(voicePath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(`❌ Error: ${e.message?.slice(0,150)}`, threadID, messageID);
  }
};
