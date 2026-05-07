const { getData, setData } = require("../../database.js");

// ── CONFIG ─────────────────────────────
module.exports.config = {
  name: "slot",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Simple slot gambling game",
  commandCategory: "Games",
  usages: "/slot <amount>",
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

    const name =
      await Users.getNameUser(
        senderID
      );

    // no bet
    if (!args[0]) {

      return api.sendMessage(

`╭───────────────⭓
│ 🎰 SLOT MACHINE
├───────────────⭔
│ 📌 Usage:
│ /slot 100
│
│ 💰 Win up to 5x
│ your money!
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    // bet amount
    let bet =
      parseInt(args[0]);

    // invalid
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

    // get balance
    const balance =
      await getMoney(senderID);

    // not enough
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

    // spin
    const a = randomEmoji();
    const b = randomEmoji();
    const c = randomEmoji();

    let reward = 0;
    let result = "LOSE";

    // JACKPOT
    if (
      a === b &&
      b === c
    ) {

      reward = bet * 5;
      result = "JACKPOT";

    }

    // 2 MATCH
    else if (
      a === b ||
      b === c ||
      a === c
    ) {

      reward = bet * 2;
      result = "WIN";

    }

    // LOSE
    else {

      reward = -bet;

    }

    // update money
    const finalBalance =
      await addMoney(
        senderID,
        reward
      );

    // reward text
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

    // send
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
