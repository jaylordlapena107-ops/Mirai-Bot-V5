const bold = require('../../utils/bold');

const VERSION = '1.0.0';
const TEAM = 'TEAM STARTCOPE BETA';
const POST_INTERVAL_MS = 51 * 60 * 1000; // 51 minutes

// Track per-thread autopost timers
const timers = new Map();

const MESSAGES = [
  // English — Jesus / Faith
  `🙏 ${bold('Jesus loves you!')} No matter what you're going through right now, God's grace is always more than enough. Cast all your worries upon Him — He truly cares for you. ❤️✝️`,
  `✝️ ${bold('"For God so loved the world that He gave His only begotten Son, that whoever believes in Him shall not perish but have eternal life."')} — John 3:16 🙏`,
  `🌟 Jesus is the way, the truth, and the life. Whatever storm you face today — the One who calmed the seas is right beside you. Trust Him fully. 🙏`,
  `💪 ${bold('God has an amazing plan for your life!')} Even in your darkest moment, He is working everything out for your good. Romans 8:28 — All things work together. ✝️`,
  `🕊️ ${bold('Peace be with you!')} The peace that surpasses all understanding — Jesus gives it freely. You don't have to earn it. Just rest in Him. 🙏❤️`,
  `🌅 ${bold('Every morning is a new mercy from God.')} His compassions never fail. Great is His faithfulness. Start today with praise in your heart! ✨✝️`,
  `💛 Jesus didn't wait for you to be perfect. He loved you while you were still a sinner. That's grace. That's mercy. That's the Gospel. ❤️🙏`,
  `🔥 ${bold('You are not forgotten!')} God sees every tear, every prayer whispered in the dark, every battle fought in silence. He is near. He is faithful always. ✝️`,
  `🌈 ${bold('Jeremiah 29:11')} — "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." 🙏`,
  `💎 ${bold('Your worth is not determined by your mistakes.')} You are chosen, loved, redeemed, and called by name. You are a child of the Most High God. ❤️✝️`,
  // English — Remembrance / Loss
  `🕊️ ${bold('To everyone who has lost someone dear...')} They are not truly gone. They are resting in the arms of the Father, free from all pain. Until we meet again in eternity. 💔🌟`,
  `💔 Missing someone you love is one of life's deepest pains. But hold on — God reunites every love in ways far beyond what we can imagine. 🕊️`,
  `🌸 ${bold('Gone too soon, but never forgotten.')} Those who leave this world leave a mark on our hearts that time and distance can never erase. Rest peacefully, beloved souls. 🙏`,
  `🌟 Death is not the end. For those who believe, it is the beginning of something eternal — a place with no more crying, no more pain, no more sorrow. Revelation 21:4 ✝️🕊️`,
  `🌹 ${bold('Grief is just love with nowhere to go.')} If you are hurting today because you lost someone — God holds every one of your tears in His hands. You are not alone. 🙏`,
  // Tagalog — Hesus / Pananampalataya
  `🙏 ${bold('Mahal ka ni Hesus!')} Hindi ka nag-iisa sa iyong mga pagsubok. Ang Diyos ay laging kasama mo. Huwag kailanman sumuko! ❤️✝️`,
  `✝️ ${bold('"Sapagkat gayon na lamang ang pagmamahal ng Diyos sa sanlibutan, na ibinigay Niya ang Kanyang bugtong na Anak."')} — Juan 3:16 🙏`,
  `🌟 Si Hesus ang daan, ang katotohanan, at ang buhay. Kahit gaano kalakas ang iyong bagyo ngayon — nandoon Siya para hawakan ang iyong kamay. 🙏`,
  `💪 ${bold('May magandang plano ang Diyos para sa iyo!')} Kahit parang wala nang pag-asa — ang Panginoon ay gumagawa sa likod ng mga eksena. Magtiwala! ✝️`,
  `🕊️ ${bold('Sumandal ka sa Diyos ngayon.')} Ang Kanyang kapayapaan ay hindi mauunawaan ng ating isipan — ngunit mararamdaman mo ito sa iyong puso. 🙏❤️`,
  `🌅 ${bold('Bagong araw, bagong awa ng Diyos!')} Ang Kanyang pagmamahal ay hindi nauubos. Simulan ang araw na ito ng may pasasalamat at papuri. ✨✝️`,
  `💛 Hindi hinintay ni Hesus na maging perpekto ka bago ka Niya mahalin. Minahal ka Niya habang ikaw ay makasalanan pa. Iyon ang grasya. Iyon ang Ebanghelyo. ❤️🙏`,
  `🔥 ${bold('Hindi ka nakalimutan ng Diyos!')} Nakikita Niya ang bawat luha mo, bawat panalangin mo, bawat labanan mo sa dilim. Siya ay tapat. Lagi. ✝️`,
  // Tagalog — Nawala / Pagdadalamhati
  `🕊️ ${bold('Sa lahat ng nawalan ng mahal sa buhay...')} Hindi sila tunay na nawala. Nandoon na sila sa piling ng Panginoon, malaya na. Magkikita ulit tayo. 💔🌟`,
  `💔 Mahirap talaga ang mawalan ng taong mahal mo sa buhay. Ngunit huwag manlupaypay — ang Diyos ay nagtitipon ng ating mga pagmamahal sa Langit. 🕊️`,
  `🌸 ${bold('Nawala man sila sa ating paningin, nananatili sila sa ating puso magpakailanman.')} Bawat alaala, bawat ngiti, bawat yakap — hindi mapupunasan ng panahon. 🙏`,
  `🌹 ${bold('Ang lungkot ay pagmamahal na walang mapuntahan.')} Kung ikaw ay nagdurusa ngayon dahil sa isang nawala — alam ng Diyos ang bawat luha mo. Hindi ka nag-iisa. 🙏`,
  // General Inspiration
  `✨ ${bold('Huwag sumuko!')} Ang pinakamadilim na gabi ay laging sinusundan ng umaga. Ang iyong oras ng tagumpay ay darating. Magtiwala sa proseso. 💪`,
  `🌟 ${bold('You were born for this moment.')} Every challenge you face today is shaping you into the person God created you to be. Keep going. Keep believing. ✝️💪`,
  `💫 ${bold('Kahit sino man ang bumaba sa iyo —')} alalahanin mo: ang Diyos ang nagtayo sa iyo. At ang sinumang itinayo ng Diyos ay hindi matatumba ng tao. 🔥✝️`,
];

function getRandomMsg() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

function startAutopost(api, threadID) {
  if (timers.has(threadID)) {
    clearInterval(timers.get(threadID));
  }
  const t = setInterval(() => {
    api.sendMessage(getRandomMsg(), String(threadID), err => {
      if (err) console.error('[Autopost] Send error thread', threadID, err.message);
    });
  }, POST_INTERVAL_MS);
  timers.set(threadID, t);
}

function stopAutopost(threadID) {
  if (timers.has(threadID)) {
    clearInterval(timers.get(threadID));
    timers.delete(threadID);
    return true;
  }
  return false;
}

module.exports.config = {
  name: 'autopost',
  version: VERSION,
  hasPermssion: 2, // Admin only
  credits: TEAM,
  description: 'Auto-posts random Jesus + inspiration messages to this GC every 51 minutes 24/7',
  commandCategory: 'Admin',
  usages: '[on | off | status]',
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';
  const sub = (args[0] || '').toLowerCase();

  if (!sub || sub === 'help') {
    const active = [...timers.keys()];
    return api.sendMessage(
      `╔══════════════════════════════╗\n` +
      `║  📢 ${bold('AUTOPOST v' + VERSION)}            ║\n` +
      `║  🏷️  ${bold(TEAM)}    ║\n` +
      `╚══════════════════════════════╝\n\n` +
      `📢 ${bold('Auto-posts every 51 minutes — 24/7!')}\n\n` +
      `📋 ${bold('COMMANDS:')}\n${'─'.repeat(30)}\n` +
      `${P}autopost on      — Start autopost here\n` +
      `${P}autopost off     — Stop autopost here\n` +
      `${P}autopost status  — Check all active GCs\n\n` +
      `📌 ${bold('KASALUKUYANG ACTIVE:')}\n` +
      (active.length ? active.map(id => `• Thread ${id}`).join('\n') : '• Wala pang active') +
      `\n\n⏱️ Interval: ${bold('Every 51 minutes, NON-STOP')}\n` +
      `🔒 ${bold('Admin only command')}`,
      threadID, messageID
    );
  }

  if (sub === 'on') {
    startAutopost(api, threadID);
    return api.sendMessage(
      `✅ ${bold('AUTOPOST — STARTED!')}\n\n` +
      `📢 ${bold('Non-stop auto-posting every 51 minutes!')}\n` +
      `📍 Thread: ${threadID}\n` +
      `🕒 Next post: ${bold('In ~51 minutes')}\n` +
      `🔄 Status: ${bold('RUNNING 24/7')}\n\n` +
      `💡 I-stop: ${P}autopost off`,
      threadID, messageID
    );
  }

  if (sub === 'off') {
    const stopped = stopAutopost(threadID);
    return api.sendMessage(
      stopped
        ? `🛑 ${bold('AUTOPOST — STOPPED!')}\n\nHindi na mag-po-post ang bot dito.\nI-on ulit: ${P}autopost on`
        : `⚠️ ${bold('Walang aktibong autopost dito.')}\nI-start: ${P}autopost on`,
      threadID, messageID
    );
  }

  if (sub === 'status') {
    const active = [...timers.keys()];
    return api.sendMessage(
      `📊 ${bold('AUTOPOST STATUS')}\n${'─'.repeat(30)}\n` +
      `Active GCs: ${bold(String(active.length))}\n` +
      (active.length
        ? active.map((id, i) => `${i + 1}. Thread ${id}`).join('\n')
        : 'Walang active autopost.') +
      `\n\n⏱️ Interval: ${bold('Every 51 min')}\n` +
      `🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  return api.sendMessage(`❓ Unknown subcommand. Usage: ${P}autopost [on|off|status]`, threadID, messageID);
};
