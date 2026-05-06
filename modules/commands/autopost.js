/**
 * !autopost — Posts Tagalog Jesus messages to Facebook TIMELINE/WALL
 * Posts every ~1 hour · Quiet window 12 AM – 5 AM PH · Admin only
 * Uses api.createPost() — posts to the bot's own Facebook wall, NOT group chat
 */

const fs   = require('fs-extra');
const path = require('path');
const bold = require('../../utils/bold');

const VERSION = '3.0.0';
const TEAM    = 'TEAM STARTCOPE BETA';

// ── State persistence ─────────────────────────────────────────────────────────
const STATE_FILE = path.join(process.cwd(), 'utils/data/autopost_state.json');
fs.ensureDirSync(path.dirname(STATE_FILE));

function loadState() {
  try { return fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {}; }
  catch { return {}; }
}
function saveState(d) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(d, null, 2)); } catch {}
}

// ── Global state (not per-thread — posts to Facebook WALL) ───────────────────
let state = {
  enabled:      false,
  count:        0,
  lastPostedAt: null,
  hourlyDone:   0,
  hourKey:      null,
};

function loadPersistedState() {
  const saved = loadState();
  if (saved.enabled      !== undefined) state.enabled      = saved.enabled;
  if (saved.count        !== undefined) state.count        = saved.count;
  if (saved.lastPostedAt !== undefined) state.lastPostedAt = saved.lastPostedAt;
}
function persist() { saveState(state); }

// ── Timing helpers ────────────────────────────────────────────────────────────
const pick  = (a) => a[Math.floor(Math.random() * a.length)];
const rand  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function phHour()        { return (new Date().getUTCHours() + 8) % 24; }
function inQuietWindow() { const h = phHour(); return h >= 0 && h < 5; }
function currentHourKey() {
  const n = new Date();
  return `${n.getUTCFullYear()}-${n.getUTCMonth()}-${n.getUTCDate()}-${n.getUTCHours()}`;
}
function msUntil5AM() {
  const now    = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 21, 0, 0));
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
  return target - now;
}

// ── Rotate hourly budget ──────────────────────────────────────────────────────
function rotateHour() {
  const hk = currentHourKey();
  if (hk !== state.hourKey) {
    state.hourKey    = hk;
    state.hourlyDone = 0;
    const ph = phHour();
    console.log(`[Autopost] 🕐 New PH hour ${String(ph).padStart(2,'0')}:00 — budget reset`);
  }
}

// ── Message pool — Tagalog Jesus messages ────────────────────────────────────
const DIVIDERS = [
  '━━━━━━━━━━━━━━━━━━━━━━━━',
  '═══════════════════════',
  '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  '•───────────────────•',
  '◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆',
  '✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦',
];
const MESSAGES = [
  `🙏 ${bold('MAHAL KA NG DIYOS!')}\n\nHindi ka nag-iisa sa iyong mga pagsubok. Ang Diyos ay laging kasama mo — sa bawat hakbang, sa bawat luha, sa bawat pagkabigo.\n\n${bold('"Sapagkat gayon na lamang ang pagmamahal ng Diyos sa sanlibutan, na ibinigay Niya ang Kanyang bugtong na Anak."')}\n— Juan 3:16\n\n✝️ Huwag kailanman sumuko. Magtiwala sa Kanya. ❤️`,
  `✝️ ${bold('HESUS AY KASAMA MO NGAYON.')}\n\nKahit parang mag-isa ka sa iyong laban — hindi ka tunay na nag-iisa. Si Hesus ay nakakaalam ng bawat hirap mo, bawat luha mo, bawat dalangin mo.\n\n${bold('"Ako ay lagi ninyong kasama, hanggang sa katapusan ng sanlibutan."')}\n— Mateo 28:20 ✝️🙏`,
  `🌟 ${bold('HUWAG MATAKOT — NANDITO ANG DIYOS.')}\n\nAng buhay ay puno ng pagsubok, ngunit ang Diyos ay mas dakila sa lahat ng iyong problema. Ipagkatiwala sa Kanya ang lahat — ang Kanyang kapayapaan ay sumasaklaw sa lahat ng ating pag-iisip.\n\n${bold('Filipos 4:7')} — "Ang kapayapaan ng Diyos na lalagpas sa lahat ng pag-unawa ay mag-iingat sa inyong puso at pag-iisip." 🕊️`,
  `💛 ${bold('ANG GRASYA NG DIYOS AY LIBRE.')}\n\nHindi hinintay ni Hesus na maging perpekto ka bago ka Niya mahalin. Minahal ka Niya habang ikaw ay makasalanan pa. Iyon ang tunay na pagmamahal — walang kondisyon, walang hangganan.\n\n${bold('"Ngunit pinapatunayan ng Diyos ang Kanyang sariling pagmamahal sa atin, na si Kristo ay namatay para sa atin nang tayo\'y makasalanan pa."')}\n— Roma 5:8 ❤️✝️`,
  `🔥 ${bold('HINDI KA NAKALIMUTAN NG DIYOS!')}\n\nNakikita Niya ang bawat luha mo. Naririnig Niya ang bawat dalangin mo kahit tahimik. Alam Niya ang bawat labanan mo sa dilim ng gabi.\n\nSiya ay tapat. Siya ay nagmamahal. At hindi Niya kailanman pababayaan ang isa sa Kanyang mga minamahal. ✝️🙏\n\n${bold('Roma 8:38-39')} — Walang makapaghihiwalay sa atin sa pagmamahal ng Diyos!`,
  `🌅 ${bold('BAGONG ARAW, BAGONG AWA NG DIYOS!')}\n\nBawat umaga ay patunay na ang Diyos ay nagbibigay ng isa pang pagkakataon. Ang Kanyang mga awa ay hindi nauubos — bago sila tuwing umaga.\n\n${bold('Panaghoy 3:22-23')} — "Ang tapat na pagmamahal ng PANGINOON ay hindi nagwawakas; ang Kanyang mga awa ay hindi mauubos; bago ang mga ito tuwing umaga." ✨🌸`,
  `💪 ${bold('MAY PLANO ANG DIYOS PARA SA IYO!')}\n\nKahit parang wala nang pag-asa, kahit parang lahat ay bumagsak — huwag sumuko. Ang Diyos ay nagtatrabaho sa likod ng bawat sitwasyon para sa iyong kabutihan.\n\n${bold('Jeremias 29:11')} — "Sapagkat alam Ko ang mga plano Ko para sa inyo, mga plano para sa kapakanan at hindi para sa kasawian, upang bigyan kayo ng pag-asa at isang kinabukasan." ✝️💫`,
  `🕊️ ${bold('SUMANDAL KA SA DIYOS NGAYON.')}\n\nKapag napagod ka na sa pagsusulit ng buhay, kapag wala ka nang lakas — iyon ang tamang oras para ialay ang lahat kay Hesus.\n\n${bold('"Halina sa Akin, kayong lahat na pagod at nabibigatan, at Ako\'y magbibigay sa inyo ng pahinga."')}\n— Mateo 11:28 🙏✝️`,
  `🌈 ${bold('LAGING MAY PAG-ASA KAY HESUS!')}\n\nSa mundong puno ng kalungkutan at kawalan ng katiyakan — si Hesus ang ating pag-asa na hindi kailanman mabibigo.\n\n${bold('"Si Hesus ay siya ring kahapon, ngayon, at magpakailanman."')}\n— Hebreo 13:8\n\nAng mga pangako ng Diyos ay totoong totoo. Maaasahan mo Siya ngayon at magpakailanman. ❤️✝️`,
  `💎 ${bold('IKAW AY MAHALAGA SA MGA MATA NG DIYOS.')}\n\nHindi ka isang pagkakamali. Hindi ka isang aksidente. Nilikha ka ng Diyos nang may layunin, nang may pagmamahal, at nang may plano para sa iyong buhay.\n\n${bold('Awit 139:14')} — "Papupuriin kita dahil ako ay kakarkilala at kahanga-hangang yari; kamangha-mangha ang Iyong mga gawa." ✨🙏`,
  `✝️ ${bold('DALANGIN PARA SA LAHAT NGAYON:')}\n\n"Panginoon, salamat sa buhay na ito. Salamat sa bawat araw na gising ako at may pagkakataong mahalin ang mga taong mahal ko.\n\nKasamahan Mo ako sa lahat ng aking pagsubok. Bigyan Mo ako ng lakas, karunungan, at kapayapaan. At sa lahat ng bagay — Ikaw ang aking pag-asa at lakas."\n\nAmen. 🙏❤️✝️`,
  `🌸 ${bold('ANG PANANAMPALATAYA AY NAGBIBIGAY NG LAKAS.')}\n\nKahit maliit lang ang iyong pananampalataya — sapat iyon para gumalaw ang Diyos sa iyong buhay.\n\n${bold('Mateo 17:20')} — "...kung mayroon kayong pananampalataya na kasing liit ng butil ng mustasa, masasabi ninyo sa bundok na ito, \'Lumipat ka mula rito papunta roon,\' at lilipat ito." 🔥✝️`,
  `🕊️ ${bold('SA LAHAT NG NAWALAN NG MAHAL SA BUHAY...')}\n\nHindi sila tunay na nawala. Nandoon na sila sa piling ng Panginoon — malaya na sa lahat ng sakit, luha, at pagdurusa.\n\n${bold('"At papahirain ng Diyos ang bawat luha mula sa kanilang mga mata; hindi na magkakaroon ng kamatayan, ni ng pagdadalamhati."')}\n— Pahayag 21:4\n\nMagkikita ulit tayo sa Langit. 💔🌟`,
  `✨ ${bold('HUWAG SUMUKO — IKAW AY HINDI TAPOS PA!')}\n\nAng pinakamadilim na gabi ay laging sinusundan ng liwanag ng umaga. Ang iyong pagsubok ay hindi katapusan — ito ay simula ng isang mas magandang kabanata ng iyong buhay.\n\n${bold('"Ang nananatili sa Akin at Ako sa kanya ay nagbubunga ng marami."')}\n— Juan 15:5 💪🌟`,
  `🇵🇭 ${bold('PARA SA BAWAT PILIPINO NA NAGBABASA NITO:')}\n\nAng Diyos ay nagmamahal sa iyo — kahit nasaan ka man ngayon, kahit anong pinagdadaanan mo.\n\nIkaw ay isang minamahal na anak ng Diyos Mataas. Ang iyong buhay ay may layunin. Ang iyong hirap ay pansamantala. Ang Kanyang pagmamahal ay walang hanggan.\n\nMagtiwala. Manalangin. Huwag sumuko. ✝️❤️🙏`,
  `🌟 ${bold('ANG DIYOS AY NAGTATRABAHO KAHIT HINDI MO NAKIKITA.')}\n\nMinsan parang walang nangyayari sa iyong mga dalangin. Ngunit tandaan — ang katahimikan ng Diyos ay hindi kahulugang Siya ay wala.\n\nSiya ay gumagawa sa likod ng lahat. Magtiwala sa Kanyang panahon — palagi itong perpekto. ✝️⏳\n\n${bold('Eclesiastes 3:11')} — "Ginawa Niya ang lahat ng bagay na maganda sa takdang panahon."`,
  `💖 ${bold('MENSAHE NI HESUS PARA SA IYO NGAYON:')}\n\n"Anak, nakikita Ko ang iyong mga luha. Naririnig Ko ang iyong mga dalangin. Alam Ko ang lahat ng iyong pinaglalabanan.\n\nHuwag kang matakot. Hawak Ko ang iyong kamay. Hindi Kita pababayaan. Pagkatiwalaan Mo Ako — may plano Ako para sa iyong buhay na mas maganda pa sa iyong inaasahan."\n\n— Hesus ✝️❤️🙏`,
  `🔥 ${bold('MAGING MATATAG SA PANANAMPALATAYA!')}\n\nAng Diyos ay nagbibigay ng kapangyarihan sa mga pagod. Nagbibigay Siya ng lakas sa mahihina.\n\n${bold('Isaias 40:31')} — "...sila na naghihintay sa PANGINOON ay may bagong lakas. Sila ay lalayag na parang agila; sila ay tatakbo at hindi mapapagod; sila ay lalakad at hindi mahahapo." ✝️💪🌟`,
  `💫 ${bold('SA AMING MGA MINAHAL NA NAWALA —')}\n\nSalamat sa mga alaala, sa tawanan, sa yakap, at sa pagmamahal. Ang Langit ay nagkaroon ng bagong anghel.\n\nHanggang sa muli tayong magkita sa lugar na walang luha, walang sakit, walang pagdadalamhati.\n\nMahal namin kayo. 🕊️❤️✝️`,
  `🙏 ${bold('MANALANGIN TAYO NANG MAGKASAMA:')}\n\n"Hesus, ikaw ang aking pastol. Ikaw ang nagbibigay ng lakas sa aking kahinaan. Sa bawat araw — gabayan Mo ang aking mga yapak, pangalagaan Mo ang aking pamilya, at punuin Mo ng Iyong kapayapaan ang aking puso."\n\n${bold('Amen.')} 🕊️✝️\n\nHindi kailanman huli para manalangin. ❤️`,
];

function composePost() {
  const div = pick(DIVIDERS);
  const msg = pick(MESSAGES);
  const ph  = phHour();
  const timeLabel = ph < 12 ? 'Magandang umaga' : ph < 18 ? 'Magandang hapon' : 'Magandang gabi';

  const layouts = [
    () => `${timeLabel}! 🌸\n\n${div}\n${msg}\n${div}\n\n🏷️ ${bold(TEAM)}`,
    () => `${msg}\n\n${div}\n🏷️ ${bold(TEAM)}`,
    () => `${div}\n${msg}\n${div}\n🏷️ ${bold(TEAM)}`,
    () => msg,
  ];
  return pick(layouts)().trim().slice(0, 1900);
}

// ── createPost wrapper ────────────────────────────────────────────────────────
function doCreatePost(api, text) {
  return new Promise((res, rej) => {
    if (typeof api.createPost !== 'function') {
      return rej(new Error('api.createPost is not available in this FCA version'));
    }
    api.createPost({ body: text }, (err, url) => err ? rej(err) : res(url));
  });
}

// ── Global timer ──────────────────────────────────────────────────────────────
let globalTimer  = null;
let globalApi    = null;

async function runCycle() {
  if (!state.enabled || !globalApi) return;

  // 🌙 Quiet window 12 AM – 5 AM PH
  if (inQuietWindow()) {
    const wait = msUntil5AM();
    const hrs  = Math.floor(wait / 3600000);
    const mins = Math.floor((wait % 3600000) / 60000);
    console.log(`[Autopost] 🌙 Quiet window — resuming in ${hrs}h ${mins}m (5 AM PH)`);
    globalTimer = setTimeout(runCycle, wait);
    return;
  }

  // 1 post per hour budget
  rotateHour();
  if (state.hourlyDone >= 1) {
    console.log(`[Autopost] ✓ Hour budget done — waiting for next hour`);
    scheduleNext();
    return;
  }

  try {
    // Anti-detect: human-like delay 1–4 sec
    await sleep(rand(1000, 4000));

    const text = composePost();
    const url  = await doCreatePost(globalApi, text);

    state.count++;
    state.hourlyDone++;
    state.lastPostedAt = new Date().toISOString();
    persist();

    console.log(`[Autopost #${state.count}] ✅ Posted to Facebook wall${url ? ' — ' + url : ''}`);

    // Save fresh appstate after every post
    try { fs.writeFileSync('./appstate.json', JSON.stringify(globalApi.getAppState(), null, 2)); } catch {}

  } catch (e) {
    console.error(`[Autopost] ❌ createPost error:`, e.message?.slice(0, 120));
  }

  scheduleNext();
}

function scheduleNext() {
  if (globalTimer) { clearTimeout(globalTimer); globalTimer = null; }
  if (!state.enabled) return;

  if (inQuietWindow()) {
    const wait = msUntil5AM();
    const hrs  = Math.floor(wait / 3600000);
    const mins = Math.floor((wait % 3600000) / 60000);
    console.log(`[Autopost] 🌙 Quiet window — next cycle in ${hrs}h ${mins}m`);
    globalTimer = setTimeout(runCycle, wait);
    return;
  }

  // ~1 hour ± 5 min jitter (anti-detect)
  const delay = 60 * 60 * 1000 + (Math.random() - 0.5) * 10 * 60 * 1000;
  const mins  = Math.round(delay / 60000);
  console.log(`[Autopost] ⏱️ Next post in ~${mins} min`);
  globalTimer = setTimeout(runCycle, delay);
}

function startAutopost(api) {
  globalApi      = api;
  state.enabled  = true;
  persist();
  // First post in 30–90 sec
  const first = rand(30000, 90000);
  globalTimer = setTimeout(runCycle, first);
  console.log(`[Autopost] ✅ Started — first post in ${Math.round(first / 1000)}s`);
}

function stopAutopost() {
  if (globalTimer) { clearTimeout(globalTimer); globalTimer = null; }
  state.enabled = false;
  persist();
  console.log(`[Autopost] 🛑 Stopped`);
}

// ── Command exports ───────────────────────────────────────────────────────────
module.exports.config = {
  name:            'autopost',
  version:         VERSION,
  hasPermssion:    2,
  credits:         TEAM,
  description:     'Auto-posts Tagalog Jesus messages to Facebook WALL every ~1 hour (5AM–12AM PH)',
  commandCategory: 'Admin',
  usages:          '[on | off | status]',
  cooldowns:       5
};

module.exports.onLoad = function ({ api }) {
  loadPersistedState();
  if (state.enabled) {
    globalApi = api;
    console.log(`[Autopost] 🔄 Restored — was ON, resuming...`);
    setTimeout(scheduleNext, 8000);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const P   = global.config?.PREFIX || '!';
  const sub = (args[0] || '').toLowerCase();

  if (!sub || sub === 'help') {
    const ph     = phHour();
    const quiet  = inQuietWindow();
    return api.sendMessage(
      `╔══════════════════════════════╗\n` +
      `║  📢 ${bold('AUTOPOST v' + VERSION)}         ║\n` +
      `║  🏷️  ${bold(TEAM)}   ║\n` +
      `╚══════════════════════════════╝\n\n` +
      `📢 ${bold('Posts Jesus messages to Facebook WALL!')}\n` +
      `⏱️ ${bold('Every ~1 hour — 5 AM to 12 AM PH')}\n` +
      `🌙 ${bold('Quiet window: 12 AM – 5 AM PH')}\n\n` +
      `📋 ${bold('COMMANDS:')}\n${'─'.repeat(30)}\n` +
      `${P}autopost on      — I-start\n` +
      `${P}autopost off     — I-stop\n` +
      `${P}autopost status  — Check status\n\n` +
      `📊 ${bold('STATUS:')}\n` +
      `  • ${bold('State:')} ${state.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
      `  • ${bold('PH Time:')} ${String(ph).padStart(2,'0')}:xx ${quiet ? '🌙 Quiet window' : '🟢 Active'}\n` +
      `  • ${bold('Total posts:')} ${state.count}\n` +
      (state.lastPostedAt ? `  • ${bold('Last post:')} ${new Date(state.lastPostedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}\n` : '') +
      `\n🔒 ${bold('Admin only')} | Posts to Facebook WALL (not group chat)`,
      threadID, messageID
    );
  }

  if (sub === 'on') {
    if (state.enabled) {
      return api.sendMessage(`⚠️ ${bold('Naka-ON na ang Autopost.')}\nI-stop: ${P}autopost off`, threadID, messageID);
    }
    startAutopost(api);
    return api.sendMessage(
      `✅ ${bold('AUTOPOST — STARTED!')}\n\n` +
      `📢 ${bold('Tagalog Jesus messages')}\n` +
      `🖼️ ${bold('Posts to: Facebook WALL/TIMELINE')}\n` +
      `⏱️ ${bold('Every ~1 hour (5 AM – 12 AM PH)')}\n` +
      `🌙 ${bold('Quiet window: 12 AM – 5 AM PH')}\n\n` +
      (inQuietWindow()
        ? `🌙 ${bold('Quiet window ngayon.')} Magsisimula sa 5 AM PH.`
        : `🕒 ${bold('First post in 30–90 seconds...')}`) +
      `\n\n💡 I-stop: ${P}autopost off\n🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  if (sub === 'off') {
    if (!state.enabled) {
      return api.sendMessage(`⚠️ ${bold('Hindi naman naka-ON ang Autopost.')}\nI-start: ${P}autopost on`, threadID, messageID);
    }
    stopAutopost();
    return api.sendMessage(
      `🛑 ${bold('AUTOPOST — STOPPED!')}\n\n` +
      `Hindi na mag-po-post sa Facebook wall.\n` +
      `📊 Total posts: ${bold(String(state.count))}\n` +
      `💡 I-on ulit: ${P}autopost on`,
      threadID, messageID
    );
  }

  if (sub === 'status') {
    const ph    = phHour();
    const quiet = inQuietWindow();
    return api.sendMessage(
      `📊 ${bold('AUTOPOST STATUS')}\n${'─'.repeat(30)}\n` +
      `  • ${bold('State:')}       ${state.enabled ? '🟢 ON' : '🔴 OFF'}\n` +
      `  • ${bold('Posts to:')}    Facebook Wall/Timeline\n` +
      `  • ${bold('Frequency:')}   Every ~1 hour\n` +
      `  • ${bold('PH Time:')}     ${String(ph).padStart(2,'0')}:xx — ${quiet ? '🌙 Quiet window (12 AM–5 AM)' : '🟢 Active window'}\n` +
      `  • ${bold('Total posts:')} ${state.count}\n` +
      `  • ${bold('Last post:')}   ${state.lastPostedAt ? new Date(state.lastPostedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}\n` +
      `\n🏷️ ${bold(TEAM)}`,
      threadID, messageID
    );
  }

  return api.sendMessage(`❓ ${P}autopost [on|off|status]`, threadID, messageID);
};
