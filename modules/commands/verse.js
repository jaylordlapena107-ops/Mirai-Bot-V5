const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const bold = require('../../utils/bold');

const TEAM = 'TEAM STARTCOPE BETA';
const TEMP_DIR = path.join(process.cwd(), 'utils/data/verse_temp');
fs.ensureDirSync(TEMP_DIR);

function cleanup(...files) {
  setTimeout(() => files.forEach(f => fs.remove(f).catch(() => {})), 300000);
}

const VERSES = [
  { ref: 'John 3:16', en: 'For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.', tl: 'Sapagkat gayon na lamang ang pagmamahal ng Diyos sa sanlibutan, na ibinigay Niya ang Kanyang bugtong na Anak, upang ang sinumang sumampalataya sa Kanya ay hindi mapahamak, kundi magkaroon ng buhay na walang hanggan.' },
  { ref: 'Jeremiah 29:11', en: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.', tl: 'Sapagkat alam Ko ang mga plano Ko para sa inyo, sabi ng PANGINOON, mga plano para sa inyong kapakanan at hindi sa inyong kapahamakan, upang bigyan kayo ng pag-asa at kinabukasan.' },
  { ref: 'Philippians 4:13', en: 'I can do all things through Christ who strengthens me.', tl: 'Kaya kong gawin ang lahat ng bagay sa pamamagitan ni Cristo na nagbibigay-lakas sa akin.' },
  { ref: 'Psalm 23:1', en: 'The LORD is my shepherd; I shall not want.', tl: 'Ang PANGINOON ang aking pastol; wala akong kakulangan.' },
  { ref: 'Romans 8:28', en: 'And we know that all things work together for good to those who love God.', tl: 'At nalalaman nating lahat ng bagay ay nagkakaisa para sa ikabubuti ng mga nagmamahal sa Diyos.' },
  { ref: 'Isaiah 40:31', en: 'But those who wait on the LORD shall renew their strength; they shall mount up with wings like eagles.', tl: 'Ngunit ang mga naghihintay sa PANGINOON ay magbabago ng lakas; sila\'y lilipad na parang mga agila.' },
  { ref: 'Psalm 46:1', en: 'God is our refuge and strength, an ever-present help in trouble.', tl: 'Ang Diyos ang ating kanlungan at lakas, isang tulong na laging handa sa kabigatan ng problema.' },
  { ref: 'Matthew 5:4', en: 'Blessed are those who mourn, for they will be comforted.', tl: 'Mapalad ang mga nagdadalamhati, sapagkat sila ay aaliwin.' },
  { ref: 'Revelation 21:4', en: 'He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain.', tl: 'Papahirin Niya ang bawat luha mula sa kanilang mga mata. Hindi na magkakaroon pa ng kamatayan, pagdadalamhati, pag-iyak, o sakit.' },
  { ref: 'John 14:1-3', en: 'Do not let your hearts be troubled. You believe in God; believe also in me. My Father\'s house has many rooms... I am going there to prepare a place for you.', tl: 'Huwag ninyong hayaang mabalisa ang inyong mga puso. Naniniwala kayo sa Diyos; magtiwala rin kayo sa Akin. Maraming silid sa bahay ng Aking Ama... Pupunta Ako roon upang ihanda ang lugar para sa inyo.' },
];

async function generateVoice(text, lang, outPath) {
  const tts = new MsEdgeTTS();
  const voice = lang === 'tl' ? 'fil-PH-BlessicaNeural' : 'en-US-ChristopherNeural';
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: '-15%', pitch: '+0Hz' });
  return new Promise((res, rej) => {
    const chunks = [];
    audioStream.on('data', d => chunks.push(d));
    audioStream.on('end', async () => { await fs.writeFile(outPath, Buffer.concat(chunks)); res(); });
    audioStream.on('error', rej);
  });
}

module.exports.config = {
  name: 'verse',
  version: '1.0.0',
  hasPermssion: 0,
  credits: TEAM,
  description: 'Send a random Bible verse with voice audio — FREE',
  commandCategory: 'Faith',
  usages: '[optional: en/tl]',
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const lang = args[0]?.toLowerCase() === 'tl' ? 'tl' : 'en';
  const verse = VERSES[Math.floor(Math.random() * VERSES.length)];
  const verseText = lang === 'tl' ? verse.tl : verse.en;
  const fullText = `${verse.ref}. ${verseText}`;

  api.setMessageReaction('✝️', messageID, () => {}, true);

  const ts = Date.now();
  const voicePath = path.join(TEMP_DIR, `verse_${ts}.mp3`);

  try {
    await generateVoice(fullText, lang, voicePath);
    api.setMessageReaction('✅', messageID, () => {}, true);
    await api.sendMessage(
      `📖 ${bold('BIBLE VERSE')} — ${bold(TEAM)}\n${'─'.repeat(32)}\n` +
      `✝️ ${bold(verse.ref)}\n\n"${verseText}"\n` +
      `${'─'.repeat(32)}\n🎤 ${bold('Voice ipinapadala...')} 👇`,
      threadID
    );
    return api.sendMessage({
      body: `📖 ${bold('BIBLE VERSE')} ✝️\n${verse.ref}\n🏷️ ${bold(TEAM)}`,
      attachment: fs.createReadStream(voicePath)
    }, threadID, () => cleanup(voicePath));
  } catch (e) {
    cleanup(voicePath);
    api.setMessageReaction('❌', messageID, () => {}, true);
    return api.sendMessage(`❌ Error: ${e.message?.slice(0, 150)}`, threadID, messageID);
  }
};
