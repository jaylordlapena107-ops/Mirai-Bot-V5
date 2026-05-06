const bold = require('../../utils/bold');

const MESSAGES = [
  // English - Jesus
  `🙏 ${bold('Jesus loves you!')} No matter what you're going through, God's grace is always sufficient. Cast all your worries unto Him — He cares for you. ❤️✝️`,
  `✝️ ${bold('"For God so loved the world that He gave His only begotten Son, that whoever believes in Him shall not perish but have eternal life."')} — John 3:16 🙏`,
  `🌟 Jesus is the way, the truth, and the life. Whatever storm you face today — the one who calmed the seas is walking right beside you. 🙏`,
  `💪 ${bold('God has a plan for you!')} Even when life feels uncertain and dark, trust that the Lord is working behind the scenes. Romans 8:28 — All things work together for good. ✝️`,
  `🕊️ ${bold('Peace be with you!')} The peace that surpasses all understanding — that is the gift Jesus gives freely. Rest in Him today. 🙏❤️`,
  `🌅 ${bold('Good morning! God woke you up today for a reason.')} Every breath is a gift. Make today count for His glory. Rise up and shine! ✨✝️`,
  `💛 Jesus didn't wait for you to be perfect. He loved you while you were still a sinner. That's grace. That's the Gospel. That's JESUS. ❤️🙏`,
  `🔥 ${bold('You are not forgotten!')} God sees every tear you cry, every prayer you whisper, every battle you fight alone. He is near. He is faithful. ✝️`,
  // English - Loss/Death
  `🕊️ ${bold('To everyone who has lost someone dear...')} They are not truly gone. They are in the arms of the Father, free from all pain and sorrow. Until we meet again. 💔🌟`,
  `💔 Missing someone is one of the hardest feelings in this world. But hold on — God reunites us in ways beyond our understanding. Their memory lives on forever. 🕊️`,
  `🌸 ${bold('Gone too soon, but never forgotten.')} Every person who leaves this world leaves a mark on our hearts that time can never erase. Rest in peace, beloved souls. 🙏`,
  `🌟 Death is not the end — it is just the beginning of something eternal. For those who believe, there is a place where there is no more crying, no more pain. Revelation 21:4 🕊️✝️`,
  `💫 To the ones we've lost — thank you for the memories, the laughter, the love. Heaven gained an angel, and we carry you in our hearts every single day. 🕊️❤️`,
  `🌹 ${bold('Grief is just love with nowhere to go.')} If you are hurting today because you lost someone, know that God holds every one of your tears in His hands. 🙏`,
  // Tagalog - Jesus
  `🙏 ${bold('Mahal ka ni Hesus!')} Hindi ka nag-iisa sa iyong mga pagsubok. Ang Diyos ay laging nandito para sa iyo. Huwag kailanman sumuko! ❤️✝️`,
  `✝️ ${bold('"Sapagkat gayon na lamang ang pagmamahal ng Diyos sa sanlibutan, na ibinigay Niya ang Kanyang bugtong na Anak, upang ang sinumang sumampalataya sa Kanya ay hindi mapahamak."')} — Juan 3:16 🙏`,
  `🌟 Si Hesus ang daan, ang katotohanan, at ang buhay. Kahit gaano kalakas ang iyong pinagdadaanan ngayon — nandoon Siya para hawakan ang iyong kamay. Magtiwala! 🙏`,
  `💪 ${bold('May plano ang Diyos para sa iyo!')} Kahit parang wala nang pag-asa, tandaan — ang Panginoon ay nagtatrabaho sa iyong kabiguan at gagawin itong tagumpay. ✝️`,
  `🕊️ ${bold('Sumandal ka sa Diyos ngayon.')} Ang Kanyang kapayapaan ay hindi mauunawaan ng ating isipan. Hayaan mong Siya ang mag-alaga sa iyo. 🙏❤️`,
  `🌅 ${bold('Magandang araw! Pinukaw ka ng Diyos ngayon para sa isang layunin.')} Bawat hininga ay regalo. Gamitin mo ang araw na ito para sa Kanyang kaluwalhatian. ✨✝️`,
  // Tagalog - Loss/Death
  `🕊️ ${bold('Sa lahat ng nawalan ng mahal sa buhay...')} Hindi sila tunay na nawala. Nandoon na sila sa piling ng Panginoon, malaya na sa lahat ng sakit at luha. 💔🌟`,
  `💔 Mahirap talaga ang mawalan ng isang taong mahal mo. Ngunit huwag manlupaypay — ang Diyos ay nagtitipon ng ating mga pag-ibig sa Langit. Magkikita ulit tayo. 🕊️`,
  `🌸 ${bold('Nawala man sila sa ating paningin, nananatili sila sa ating puso.')} Bawat alaala, bawat tawa, bawat yakap — hindi mapupunasan ng panahon. 🙏`,
  `🌟 Ang kamatayan ay hindi katapusan — ito ay simula ng isang bagay na walang hanggan. Para sa mga naniniwala, may lugar na walang luha, walang sakit, walang pagdurusa. ✝️🕊️`,
  `💫 Sa aming mga minahal na nawala — salamat sa mga alaala, sa tawanan, sa pagmamahal. Ang langit ay nagkaroon ng bagong anghel, at dinadala namin kayo sa aming mga puso araw-araw. 🕊️❤️`,
  `🌹 ${bold('Ang lungkot ay pagmamahal na walang mapuntahan.')} Kung ikaw ay nagdurusa ngayon dahil sa isang nawala — alam ng Diyos ang bawat luha mo. Hindi ka nag-iisa. 🙏`,
];

let broadcastInterval = null;
let broadcastApi = null;

function getRandomMsg() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

async function sendToAllGroups() {
  if (!broadcastApi) return;
  try {
    const threads = Array.from(global.data.threadData?.keys() || []);
    if (!threads.length) return;
    for (const tid of threads) {
      try {
        await new Promise(r => setTimeout(r, 1500)); // small delay between sends
        broadcastApi.sendMessage(getRandomMsg(), String(tid));
      } catch (e) { /* silent fail per thread */ }
    }
  } catch (e) { console.error('[Broadcast Error]', e.message); }
}

module.exports.config = {
  name: 'broadcast',
  version: '1.0.0',
  hasPermssion: 0,
  credits: 'TEAM STARTCOPE BETA',
  description: 'Auto-broadcasts Jesus & remembrance messages to all GCs every ~1 hour 24/7',
  eventType: [],
};

module.exports.onLoad = function ({ api }) {
  broadcastApi = api;
  if (broadcastInterval) clearInterval(broadcastInterval);
  // 1 hour = 3,600,000 ms  (with ±5 min random jitter to avoid Meta pattern detection)
  const scheduleNext = () => {
    const jitter = (Math.random() - 0.5) * 10 * 60 * 1000; // ±5 min
    const delay = 60 * 60 * 1000 + jitter;
    broadcastInterval = setTimeout(async () => {
      await sendToAllGroups();
      scheduleNext();
    }, delay);
  };
  scheduleNext();
  console.log('[Broadcast] ✅ Auto-broadcast started — every ~1 hour (with jitter) to all GCs');
};

module.exports.run = async function () {};
