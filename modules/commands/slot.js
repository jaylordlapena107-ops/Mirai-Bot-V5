const {
  getData,
  setData
} = require("../../database.js");

// ── CONFIG ─────────────────────────────
module.exports.config = {
  name: "slot",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Simple slot gambling game",
  commandCategory: "Games",
  usages: "/slot <amount> | on | off",
  cooldowns: 5
};

// ── GET MONEY ─────────────────────────
async function getMoney(uid) {

  let data =
    await getData(`bank/${uid}`);

  if (!data)
    data = {};

  return data.money || 0;
}

// ── SET MONEY ─────────────────────────
async function setMoney(uid, amount) {

  let data =
    await getData(`bank/${uid}`);

  if (!data)
    data = {};

  data.money = amount;

  await setData(
    `bank/${uid}`,
    data
  );
}

// ── ADD MONEY ─────────────────────────
async function addMoney(uid, amount) {

  const current =
    await getMoney(uid);

  let updated =
    current + amount;

  // no negative
  if (updated < 0)
    updated = 0;

  await setMoney(
    uid,
    updated
  );

  return updated;
}

// ── RANDOM EMOJI ──────────────────────
function randomEmoji() {

  const emojis = [
    "🍒",
    "🍋",
    "🍇",
    "🍉",
    "⭐",
    "💎",
    "🔥"
  ];

  return emojis[
    Math.floor(
      Math.random() *
      emojis.length
    )
  ];
}

// ── COMMAND ───────────────────────────
module.exports.run =
async function ({
  api,
  event,
  args,
  Users
}) {

  try {

    const {
      threadID,
      messageID,
      senderID
    } = event;

    const info =
      await api.getThreadInfo(
        threadID
      );

    const isAdmin =
      info.adminIDs.some(
        a => a.id == senderID
      );

    // ── SETTINGS ─────────────────────
    let settings =
      await getData(
        `slotSettings/${threadID}`
      );

    if (!settings)
      settings = {};

    // default enabled
    if (
      typeof settings.enabled ===
      "undefined"
    ) {

      settings.enabled = true;

      await setData(
        `slotSettings/${threadID}`,
        settings
      );
    }

    const sub =
      (args[0] || "")
      .toLowerCase();

    // ── ENABLE ──────────────────────
    if (sub === "on") {

      if (!isAdmin) {

        return api.sendMessage(

`╭───────────────⭓
│ ❌ ACCESS DENIED
├───────────────⭔
│ Only GC admins
│ can enable slot.
╰───────────────⭓`,

          threadID,
          messageID
        );
      }

      settings.enabled = true;

      await setData(
        `slotSettings/${threadID}`,
        settings
      );

      return api.sendMessage(

`╭───────────────⭓
│ ✅ SLOT ENABLED
├───────────────⭔
│ Slot gambling
│ is now ON.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    // ── DISABLE ─────────────────────
    if (sub === "off") {

      if (!isAdmin) {

        return api.sendMessage(

`╭───────────────⭓
│ ❌ ACCESS DENIED
├───────────────⭔
│ Only GC admins
│ can disable slot.
╰───────────────⭓`,

          threadID,
          messageID
        );
      }

      settings.enabled = false;

      await setData(
        `slotSettings/${threadID}`,
        settings
      );

      return api.sendMessage(

`╭───────────────⭓
│ 🛑 SLOT DISABLED
├───────────────⭔
│ Slot gambling
│ is now OFF.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    // ── CHECK STATUS ────────────────
    if (
      settings.enabled === false
    ) {

      return api.sendMessage(

`╭───────────────⭓
│ 🎰 SLOT DISABLED
├───────────────⭔
│ This game is
│ currently OFF
│ in this GC.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    const name =
      await Users.getNameUser(
        senderID
      );

    // ── NO BET ─────────────────────
    if (!args[0]) {

      return api.sendMessage(

`╭───────────────⭓
│ 🎰 SLOT MACHINE
├───────────────⭔
│ 📌 Usage:
│ /slot 100
│
│ 🎛️ Settings:
│ /slot on
│ /slot off
│
│ 🎲 Low chance
│ to win money.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    // ── BET ────────────────────────
    let bet =
      parseInt(args[0]);

    if (
      isNaN(bet) ||
      bet <= 0
    ) {

      return api.sendMessage(

`╭───────────────⭓
│ ❌ INVALID BET
├───────────────⭔
│ Enter a valid
│ amount of money.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    // ── BALANCE ────────────────────
    const balance =
      await getMoney(senderID);

    if (balance < bet) {

      return api.sendMessage(

`╭───────────────⭓
│ 💸 NOT ENOUGH MONEY
├───────────────⭔
│ Your Balance:
│ ${balance}
│
│ Bet Needed:
│ ${bet}
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    // ── SLOT SYSTEM ────────────────
    let reward = 0;
    let result = "LOSE";

    // 1-100
    const chance =
      Math.floor(
        Math.random() * 100
      ) + 1;

    // visuals
    let slotA =
      randomEmoji();

    let slotB =
      randomEmoji();

    let slotC =
      randomEmoji();

    // ── 3% JACKPOT ─────────────────
    if (chance <= 3) {

      reward = bet * 5;
      result = "JACKPOT";

      slotA = "💎";
      slotB = "💎";
      slotC = "💎";
    }

    // ── 12% NORMAL WIN ─────────────
    else if (chance <= 15) {

      reward = bet * 2;
      result = "WIN";

      slotA = "🍒";
      slotB = "🍒";
      slotC = randomEmoji();
    }

    // ── 85% LOSE ───────────────────
    else {

      reward = -bet;

      while (
        slotA === slotB ||
        slotB === slotC ||
        slotA === slotC
      ) {

        slotA =
          randomEmoji();

        slotB =
          randomEmoji();

        slotC =
          randomEmoji();
      }
    }

    // ── UPDATE MONEY ───────────────
    const finalBalance =
      await addMoney(
        senderID,
        reward
      );

    // ── REWARD TEXT ────────────────
    let rewardText = "";

    if (reward > 0) {

      rewardText =
`│ ➕ Won:
│ ${reward} Money`;

    } else {

      rewardText =
`│ ➖ Lost:
│ ${bet} Money`;
    }

    // ── SEND RESULT ────────────────
    return api.sendMessage(

`╭───────────────⭓
│ 🎰 SLOT MACHINE
├───────────────⭔
│ ${slotA} │ ${slotB} │ ${slotC}
│
│ 👤 ${name}
│
│ 🏆 Result:
│ ${result}
│
${rewardText}
│
│ 🏦 Balance:
│ ${finalBalance}
╰───────────────⭓`,

      threadID,
      messageID
    );

  } catch (e) {

    console.log(
      "SLOT ERROR:",
      e
    );
  }
};
