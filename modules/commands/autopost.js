const fs = require('fs-extra');
const path = require('path');
const bold = require('../../utils/bold');

const VERSION = '2.0.0';
const TEAM = 'TEAM STARTCOPE BETA';

// ─── STATE PERSISTENCE ─────────────────────────────────────────────────────────
const STATE_FILE = path.join(process.cwd(), 'utils/data/autopost_state.json');
fs.ensureDirSync(path.dirname(STATE_FILE));

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {}
  return {};
}
function saveState(data) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2)); } catch {}
}

// Per-thread state: { [threadID]: { enabled, count, lastPostedAt, hourlyDone, currentHourKey } }
let threadStates = loadState();

// ─── TIMING HELPERS ────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// PH time (UTC+8)
function phHour() { return (new Date().getUTCHours() + 8) % 24; }
function hourKey() {
  const n = new Date();
  return `${n.getUTCFullYear()}-${n.getUTCMonth()}-${n.getUTCDate()}-${n.getUTCHours()}`;
}

// Quiet window: 12:00 AM – 4:59 AM PH → no posting
function inQuietWindow() { const h = phHour(); return h >= 0 && h < 5; }

// ms until 5:00 AM PH (= 21:00 UTC previous day)
function msUntil5AM() {
  const now = new Date();
  const target = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 21, 0, 0
  ));
  if (target.getTime() <= now.getTime()) target.setUTCDate(target.getUTCDate() + 1);
  return target.getTime() - now.getTime();
}

// ─── MESSAGE POOL — Tagalog Jesus Messages ─────────────────────────────────────
const DIVIDERS = [
  '━━━━━━━━━━━━━━━━━━━━━━━━',
  '═══════════════════════',
  '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  '•───────────────────•',
  '◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆',
  '✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦',
];

const MESSAGES = [
  // ── Pag-ibig ng Diyos ──
  `🙏 ${bold('MAHAL KA NG DIYOS!')}\n\nHindi ka nag-iisa sa iyong mga pagsubok. Ang Diyos ay laging kasama mo — sa bawat hakbang, sa bawat luha, sa bawat pagkabigo.\n\n${bold('"Sapagkat gayon na lamang ang pagmamahal ng Diyos sa sanlibutan, na ibinigay Niya ang Kanyang bugtong na Anak."')}\n— Juan 3:16\n\n✝️ Huwag kailanman sumuko. Magtiwala sa Kanya. ❤️`,

  `✝️ ${bold('HESUS AY KASAMA MO NGAYON.')}\n\nKahit parang mag-isa ka sa iyong laban — hindi ka tunay na nag-iisa. Si Hesus ay nakakaalam ng bawat hirap mo, bawat luha mo, bawat dalangin mo.\n\n${bold('"Ako ay lagi ninyong kasama, hanggang sa katapusan ng sanlibutan."')}\n— Mateo 28:20 ✝️🙏`,

  `🌟 ${bold('HUWAG MATAKOT — NANDITO ANG DIYOS.')}\n\nAng buhay ay puno ng pagsubok, ngunit ang Diyos ay mas dakila sa lahat ng iyong problema. Ipagkatiwala sa Kanya ang lahat — ang Kanyang kapayapaan ay sumasaklaw sa lahat ng ating pag-iisip.\n\n${bold('Filipos 4:7')} — "Ang kapayapaan ng Diyos na lalagpas sa lahat ng pag-unawa ay mag-iingat sa inyong puso at pag-iisip." 🕊️`,

  `💛 ${bold('ANG GRASYA NG DIYOS AY LIBRE.')}\n\nHindi hinintay ni Hesus na maging perpekto ka bago ka Niya mahalin. Minahal ka Niya habang ikaw ay makasalanan pa. Iyon ang tunay na pagmamahal — walang kondisyon, walang hangganan.\n\n${bold('"Ngunit pinapatunayan ng Diyos ang Kanyang sariling pagmamahal sa atin, na si Kristo ay namatay para sa atin nang tayo\'y makasalanan pa."')}\n— Roma 5:8 ❤️✝️`,

  `🔥 ${bold('HINDI KA NAKALIMUTAN NG DIYOS!')}\n\nNakikita Niya ang bawat luha mo. Naririnig Niya ang bawat dalangin mo kahit tahimik. Alam Niya ang bawat labanan mo sa dilim ng gabi.\n\nSiya ay tapat. Siya ay nagmamahal. At hindi Niya kailanman pababayaan ang isa sa Kanyang mga minamahal. ✝️🙏\n\n${bold('Roma 8:38-39')} — Walang makapaghihiwalay sa atin sa pagmamahal ng Diyos!`,

  `🌅 ${bold('BAGONG ARAW, BAGONG AWA NG DIYOS!')}\n\nBawat umaga ay patunay na ang Diyos ay nagbibigay ng isa pang pagkakataon. Ang Kanyang mga awa ay hindi nauubos — bago sila tuwing umaga.\n\n${bold('Panaghoy 3:22-23')} — "Ang tapat na pagmamahal ng PANGINOON ay hindi nagwawakas; ang Kanyang mga awa ay hindi mauubos; bago ang mga ito tuwing umaga." ✨🌸`,

  `💪 ${bold('MAY PLANO ANG DIYOS PARA SA IYO!')}\n\nKahit parang wala nang pag-asa, kahit parang lahat ay bumagsak — huwag sumuko. Ang Diyos ay nagtatrabaho sa likod ng bawat sitwasyon para sa iyong kabutihan.\n\n${bold('Jeremias 29:11')} — "Sapagkat alam Ko ang mga plano Ko para sa inyo, mga plano para sa kapakanan at hindi para sa kasawian, upang bigyan kayo ng pag-asa at isang kinabukasan." ✝️💫`,

  `🕊️ ${bold('SUMANDAL KA SA DIYOS NGAYON.')}\n\nKapag napagod ka na sa pagsusulit ng buhay, kapag wala ka nang lakas — iyon ang tamang oras para ialay ang lahat kay Hesus.\n\n${bold('"Halina sa Akin, kayong lahat na pagod at nabibigatan, at Ako\'y magbibigay sa inyo ng pahinga."')}\n— Mateo 11:28 🙏✝️\n\nHuwag dalhin ang lahat ng bigat ng mag-isa. Si Hesus ay handang tumulong sa iyo.`,

  `🌈 ${bold('LAGING MAY PAG-ASA KAY HESUS!')}\n\nSa mundong puno ng kalungkutan at kawalan ng katiyakan — si Hesus ang ating pag-asa na hindi kailanman mabibigo.\n\n${bold('"Si Hesus ay siya ring kahapon, ngayon, at magpakailanman."')}\n— Hebreo 13:8\n\nAngmga pangako ng Diyos ay totoong totoo. Maaasahan mo Siya ngayon at magpakailanman. ❤️✝️`,

  `💎 ${bold('IKAW AY MAHALAGA SA MGA MATA NG DIYOS.')}\n\nHindi ka isang pagkakamali. Hindi ka isang aksidente. Nilikha ka ng Diyos nang may layunin, nang may pagmamahal, at nang may plano para sa iyong buhay.\n\n${bold('Awit 139:14')} — "Papupuriin kita dahil ako ay kakarkilala at kahanga-hangang yari; kamangha-mangha ang Iyong mga gawa, at alam ito ng aking kaluluwa." ✨🙏`,

  // ── Panalangin at Pananampalataya ──
  `✝️ ${bold('DALANGIN PARA SA LAHAT NGAYON:')}\n\n"Panginoon, salamat sa buhay na ito. Salamat sa bawat araw na gising ako at may pagkakataong mahalin ang mga taong mahal ko.\n\nKasamahan Mo ako sa lahat ng aking pagsubok. Bigyan Mo ako ng lakas, karunungan, at kapayapaan. At sa lahat ng bagay — Ikaw ang aking pag-asa at lakas."\n\nAmen. 🙏❤️✝️`,

  `🙏 ${bold('MANALANGIN TAYO NANG MAGKASAMA:')}\n\n"Hesus, ikaw ang aking pastol. Ikaw ang nagbibigay ng lakas sa aking kahinaan. Sa bawat araw — gabayan Mo ang aking mga yapak, pangalagaan Mo ang aking pamilya, at punuin Mo ng Iyong kapayapaan ang aking puso."\n\n${bold('Amen.')} 🕊️✝️\n\nHindi kailanman huli para manalangin. Ang Diyos ay nagsasabi — "Handa Akong pakinggan ka." ❤️`,

  `🌸 ${bold('ANG PANANAMPALATAYA AY NAGBIBIGAY NG LAKAS.')}\n\nKahit maliit lang ang iyong pananampalataya — sapat iyon para gumalaw ang Diyos sa iyong buhay. Hindi kailangan ng malaking pananampalataya — kailangan lang ng tunay na puso.\n\n${bold('Mateo 17:20')} — "...kung mayroon kayong pananampalataya na kasing liit ng butil ng mustasa, masasabi ninyo sa bundok na ito, 'Lumipat ka mula rito papunta roon,' at lilipat ito." 🔥✝️`,

  // ── Alaala at Pagdadalamhati ──
  `🕊️ ${bold('SA LAHAT NG NAWALAN NG MAHAL SA BUHAY...')}\n\nHindi sila tunay na nawala. Nandoon na sila sa piling ng Panginoon — malaya na sa lahat ng sakit, luha, at pagdurusa.\n\n${bold('"At papahirain ng Diyos ang bawat luha mula sa kanilang mga mata; hindi na magkakaroon ng kamatayan, ni ng pagdadalamhati, ng pagtangis, ni ng kirot pa."')}\n— Pahayag 21:4\n\nMagkikita ulit tayo sa Langit. 💔🌟`,

  `🌹 ${bold('PARA SA MGA NAGDURUSA NGAYON:')}\n\nAng lungkot ay pagmamahal na walang mapuntahan. Kung ikaw ay nag-aalala, nagdadalamhati, o nag-iisa ngayon — alam ng Diyos ang bawat luha mo.\n\n${bold('"Ang PANGINOON ay malapit sa mga may sirang puso at iniligtas ang mga may bagbag na espiritu."')}\n— Awit 34:18 🙏\n\nHindi ka nag-iisa. Ang Diyos ay kasama mo sa bawat sandali. ❤️`,

  `💫 ${bold('SA AMING MGA MINAHAL NA NAWALA —')}\n\nSalamat sa mga alaala, sa tawanan, sa yakap, at sa pagmamahal. Ang Langit ay nagkaroon ng bagong anghel, at dinadala namin kayo sa aming mga puso araw-araw.\n\nHanggang sa muli tayong magkita sa lugar na walang luha, walang sakit, walang pagdadalamhati.\n\nMahal namin kayo. 🕊️❤️✝️`,

  // ── Inspirasyon ──
  `✨ ${bold('HUWAG SUMUKO — IKAW AY HINDI TAPOS PA!')}\n\nAng pinakamadilim na gabi ay laging sinusundan ng liwanag ng umaga. Ang iyong pagsubok ay hindi katapusan — ito ay simula ng isang mas magandang kabanata ng iyong buhay.\n\n${bold('"Ang nananatili sa Akin at Ako sa kanya ay nagbubunga ng marami."')}\n— Juan 15:5 💪🌟`,

  `🇵🇭 ${bold('PARA SA BAWAT PILIPINO NA NAGBABASA NITO:')}\n\nAng Diyos ay nagmamahal sa iyo — kahit nasaan ka man ngayon, kahit anong pinagdadaanan mo.\n\nIkaw ay isang minamahal na anak ng Diyos Mataas. Ang iyong buhay ay may layunin. Ang iyong hirap ay pansamantala. Ang Kanyang pagmamahal ay walang hanggan.\n\nMagtiwala. Manalangin. Huwag sumuko. ✝️❤️🙏`,

  `🌟 ${bold('ANG DIYOS AY NAGTATRABAHO KAHIT HINDI MO NAKIKITA.')}\n\nMinsan parang walang nangyayari sa iyong mga dalangin. Minsan parang tahimik ang Diyos. Ngunit tandaan — ang katahimikan ng Diyos ay hindi kahulugang Siya ay wala.\n\nSiya ay gumagawa sa likod ng lahat. Magtiwala sa Kanyang panahon — palagi itong perpekto. ✝️⏳\n\n${bold('Eclesiastes 3:11')} — "Ginawa Niya ang lahat ng bagay na maganda sa takdang panahon."`,

  `💖 ${bold('MENSAHE NI HESUS PARA SA IYO NGAYON:')}\n\n"Anak, nakikita Ko ang iyong mga luha. Naririnig Ko ang iyong mga dalangin. Alam Ko ang lahat ng iyong pinaglalabanan.\n\nHuwag kang matakot. Hawak Ko ang iyong kamay. Hindi Kita pababayaan. Pagkatiwalaan Mo Ako — may plano Ako para sa iyong buhay na mas maganda pa sa iyong inaasahan."\n\n— Hesus ✝️❤️ 🙏`,

  `🔥 ${bold('MAGING MATATAG SA PANANAMPALATAYA!')}\n\nAng Diyos ay nagbibigay ng kapangyarihan sa mga pagod. Nagbibigay Siya ng lakas sa mahihina. Kahit ang kabataang kababalaghan ay mapapagod — ngunit sila na naghihintay sa PANGINOON ay may bagong lakas.\n\n${bold('Isaias 40:31')} — "...sila ay lalayag na parang agila; sila ay tatakbo at hindi mapapagod; sila ay lalakad at hindi mahahapo." ✝️💪🌟`,
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function composePost() {
  const div = pick(DIVIDERS);
  const msg = pick(MESSAGES);
  // Vary the wrapper layout
  const layouts = [
    () => `${div}\n${msg}\n${div}\n🏷️ ${bold(TEAM)}`,
    () => `${msg}\n\n${div}\n🏷️ ${bold(TEAM)}`,
    () => msg,
  ];
  return pick(layouts)().trim().slice(0, 1900);
}

// ─── PER-THREAD TIMER MAP ──────────────────────────────────────────────────────
const timers = new Map(); // threadID → { timer, api }

function getTs(threadID) {
  return threadStates[String(threadID)] || {};
}
function setTs(threadID, patch) {
  threadStates[String(threadID)] = { ...getTs(threadID), ...patch };
  saveState(threadStates);
}

async function runCycle(api, threadID) {
  const ts = getTs(threadID);
  if (!ts.enabled) return;

  // 🌙 Quiet window: 12 AM – 4:59 AM PH → skip
  if (inQuietWindow()) {
    console.log(`[Autopost] 🌙 Quiet window — thread ${threadID} skip`);
    scheduleNext(api, threadID);
    return;
  }

  // 1 post per hour budget
  const hk = hourKey();
  const hourlyDone = ts.currentHourKey === hk ? (ts.hourlyDone || 0) : 0;
  if (hourlyDone >= 1) {
    console.log(`[Autopost] ✓ Hour budget reached for thread ${threadID} — waiting`);
    scheduleNext(api, threadID);
    return;
  }

  try {
    // Anti-detect: random human-like delay before sending (1–4 seconds)
    await sleep(rand(1000, 4000));

    const text = composePost();
    await new Promise((res, rej) => {
      api.sendMessage(text, String(threadID), err => err ? rej(err) : res());
    });

    const count = (ts.count || 0) + 1;
    setTs(threadID, {
      count,
      lastPostedAt: new Date().toISOString(),
      currentHourKey: hk,
      hourlyDone: hourlyDone + 1,
    });
    console.log(`[Autopost #${count}] ✅ Posted to thread ${threadID}`);
  } catch (e) {
    console.error(`[Autopost] ❌ Error thread ${threadID}:`, e.message?.slice(0, 100));
  }

  scheduleNext(api, threadID);
}

function scheduleNext(api, threadID) {
  // Cancel existing timer
  const existing = timers.get(String(threadID));
  if (existing?.timer) clearTimeout(existing.timer);

  const ts = getTs(threadID);
  if (!ts.enabled) return;

  let delay;
  if (inQuietWindow()) {
    // Resume exactly at 5 AM PH
    delay = msUntil5AM();
    const hrs = Math.floor(delay / 3600000);
    const mins = Math.floor((delay % 3600000) / 60000);
    console.log(`[Autopost] 🌙 Thread ${threadID} — quiet window, resume in ${hrs}h ${mins}m`);
  } else {
    // Every ~1 hour with ±5 min jitter (anti-detect)
    delay = 60 * 60 * 1000 + (Math.random() - 0.5) * 10 * 60 * 1000;
  }

  const timer = setTimeout(() => runCycle(api, threadID), delay);
  timers.set(String(threadID), { timer, api });
}

function startAutopost(api, threadID) {
  setTs(threadID, { enabled: true });
  // First post: run after a short delay (anti-detect: not instant)
  const firstDelay = rand(30000, 90000); // 30–90 sec
  const timer = setTimeout(() => runCycle(api, threadID), firstDelay);
  timers.set(String(threadID), { timer, api });
}

function stopAutopost(threadID) {
  const existing = timers.get(String(threadID));
  if (existing?.timer) clearTimeout(existing.timer);
  timers.delete(String(threadID));
  setTs(threadID, { enabled: false });
}

// ─── COMMAND ───────────────────────────────────────────────────────────────────
module.exports.config = {
  name: 'autopost',
  version: VERSION,
  hasPermssion: 2,
  credits: TEAM,
  description: 'Auto-posts random Tagalog Jesus messages every ~1 hour (5AM–12AM PH) — 24/7',
  commandCategory: 'Admin',
  usages: '[on | off | status]',
  cooldowns: 5
};

module.exports.onLoad = function ({ api }) {
  // Re-start any threads that had autopost enabled before bot restart
  const savedStates = loadState();
  let restored = 0;
  for (const [tid, ts] of Object.entries(savedStates)) {
    if (ts.enabled) {
      setTs(tid, { enabled: true });
      // Stagger restores by 10 sec each (anti-detect)
      setTimeout(() => scheduleNext(api, tid), restored * 10000 + 5000);
      restored++;
    }
  }
  if (restored) console.log(`[Autopost] 🔄 Restored ${restored} thread(s) from saved state`);
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P = global.config?.PREFIX || '!';
  const sub = (args[0] || '').toLowerCase();
  const ts = getTs(threadID);

  if (!sub || sub === 'help') {
    const active = Object.entries(threadStates).filter(([, s]) => s.enabled).length;
    return api.sendMessage(
      `╔══════════════════════════════╗\n` +
      `║  📢 ${bold('AUTOPOST v' + VERSION)}            ║\n` +
      `║  🏷️  ${bold(TEAM)}    ║\n` +
      `╚══════════════════════════════╝\n\n` +
      `📢 ${bold('Random Tagalog Jesus messages — every 1 hour!')}\n` +
      `🌙 ${bold('Hindi nagpo-post: 12 AM – 5 AM PH (quiet window)')}\n\n` +
      `📋 ${bold('COMMANDS:')}\n${'─'.repeat(30)}\n` +
      `${P}autopost on      — I-start dito\n` +
      `${P}autopost off     — I-stop dito\n` +
      `${P}autopost status  — Check status\n\n` +
      `📊 ${bold('STATUS NGAYON:')}\n` +
      `  • ${bold('Active GCs:')} ${active}\n` +
      `  • ${bold('Dito:')} ${ts.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
      (ts.count ? `  • ${bold('Total posts dito:')} ${ts.count}\n` : '') +
      (ts.lastPostedAt ? `  • ${bold('Last post:')} ${new Date(ts.lastPostedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}\n` : '') +
      `\n⏱️ ${bold('Every ~1 hour, 5AM–12AM PH, non-stop')}\n` +
      `🔒 ${bold('Admin only')}`,
      threadID, messageID
    );
  }

  if (sub === 'on') {
    if (ts.enabled) {
      return api.sendMessage(
        `⚠️ ${bold('Naka-ON na ang autopost dito.')}\nI-stop: ${P}autopost off`,
        threadID, messageID
      );
    }
    startAutopost(api, threadID);
    const ph = phHour();
    const isQuiet = inQuietWindow();
    return api.sendMessage(
      `✅ ${bold('AUTOPOST — STARTED!')}\n\n` +
      `📢 ${bold('Random Tagalog Jesus messages')}\n` +
      `⏱️ ${bold('Every ~1 hour (5 AM – 12 AM PH)')}\n` +
      `🌙 ${bold('Quiet window: 12 AM – 5 AM PH (no posts)')}\n` +
      (isQuiet
        ? `\n🌙 ${bold('Quiet window active ngayon.')} Magsisimula sa 5 AM PH.`
        : `\n🕒 ${bold('First post: sa loob ng 1–2 minuto.')}`) +
      `\n\n💡 I-stop: ${P}autopost off\n🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  if (sub === 'off') {
    if (!ts.enabled) {
      return api.sendMessage(
        `⚠️ ${bold('Hindi naman naka-ON ang autopost dito.')}\nI-start: ${P}autopost on`,
        threadID, messageID
      );
    }
    stopAutopost(threadID);
    return api.sendMessage(
      `🛑 ${bold('AUTOPOST — STOPPED!')}\n\n` +
      `Hindi na mag-po-post ang bot dito.\n` +
      `📊 Total na-post dito: ${bold(String(ts.count || 0))}\n` +
      `💡 I-on ulit: ${P}autopost on`,
      threadID, messageID
    );
  }

  if (sub === 'status') {
    const active = Object.entries(threadStates).filter(([, s]) => s.enabled);
    const ph = phHour();
    return api.sendMessage(
      `📊 ${bold('AUTOPOST STATUS')}\n${'─'.repeat(30)}\n` +
      `🕐 ${bold('PH Time now:')} ${String(ph).padStart(2, '0')}:xx ${ph >= 5 ? '🟢 Active window' : '🌙 Quiet window'}\n\n` +
      `${bold('Active GCs:')} ${active.length}\n` +
      (active.length
        ? active.map(([id, s], i) =>
          `${i + 1}. Thread ${id}\n   Posts: ${s.count || 0} | Last: ${s.lastPostedAt ? new Date(s.lastPostedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}`
        ).join('\n')
        : 'Walang active.') +
      `\n\n🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  return api.sendMessage(
    `❓ Unknown: ${P}autopost [on|off|status]`,
    threadID, messageID
  );
};
