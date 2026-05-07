const {
  getData,
  setData
} = require("../../database.js");

// ── CONFIG ─────────────────────────────
module.exports.config = {
  name: "slot",
  version: "2.0.0",
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

  const updated =
    current + amount;

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

    // ── GET SETTINGS ─────────────────
    let settings =
      await getData(
        `slotSettings/${threadID}`
      );

    if (!settings)
      settings = {};

    // default ON
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

    // ── SLOT ON ─────────────────────
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

    // ── SLOT OFF ────────────────────
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

    // ── CHECK IF OFF ────────────────
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
│ 💰 Win up to 5x
│ your money!
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

    // ── SPIN ───────────────────────
    const a = randomEmoji();
    const b = randomEmoji();
    const c = randomEmoji();

    let reward = 0;
    let result = "LOSE";

    // jackpot
    if (
      a === b &&
      b === c
    ) {

      reward = bet * 5;
      result = "JACKPOT";
    }

    // 2 match
    else if (
      a === b ||
      b === c ||
      a === c
    ) {

      reward = bet * 2;
      result = "WIN";
    }

    // lose
    else {

      reward = -bet;
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
│ ${a} │ ${b} │ ${c}
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
