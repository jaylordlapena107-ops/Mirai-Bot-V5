const moment = require("moment-timezone");
const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "bank",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "Quat | Edited by ChatGPT",
  description: "Check or manage bank balance",
  commandCategory: "Economy",
  usages: "[ + , - , -- , +- , pay ]",
  cooldowns: 0,
  usePrefix: false
};

// ── BOT OWNER UID ──────────────────────────────
const ownerID = "61559999326713";

// ── GET USER MONEY ─────────────────────────────
async function getMoney(uid) {

  let data =
    await getData(`bank/${uid}`);

  if (!data)
    data = {};

  return data.money || 0;
}

// ── SET USER MONEY ─────────────────────────────
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

// ── ADD MONEY ──────────────────────────────────
async function addMoney(uid, amount) {

  const current =
    await getMoney(uid);

  let updated =
    current + amount;

  // no negative balance
  if (updated < 0)
    updated = 0;

  await setMoney(
    uid,
    updated
  );

  return updated;
}

module.exports.run = async function ({
  api,
  event,
  args,
  Users
}) {

  try {

    const {
      threadID,
      senderID,
      mentions,
      type,
      messageReply
    } = event;

    const time =
      moment
      .tz("Asia/Manila")
      .format(
        "hh:mm A - MMM D, YYYY"
      );

    let targetID =
      senderID;

    // reply target
    if (
      type === "message_reply"
    ) {

      targetID =
        messageReply.senderID;
    }

    // mention target
    else if (
      Object.keys(mentions)
        .length > 0
    ) {

      targetID =
        Object.keys(mentions)[0];
    }

    const name =
      await Users.getNameUser(
        targetID
      );

    const money =
      await getMoney(targetID);

    const amount =
      parseInt(args[1]);

    // ── UI SEND ─────────────────────────
    const send =
      (msg) =>
        api.sendMessage(
          msg,
          threadID
        );

    // ── OWNER CHECK ─────────────────────
    const noPerm =
      () =>
        send(

`╭───────────────⭓
│ 🔒 ACCESS DENIED
├───────────────⭔
│ Only the bot owner
│ can manage money.
╰───────────────⭓`
        );

    // ── COMMANDS ────────────────────────

    switch (args[0]) {

      // ── ADD MONEY ─────────────────
      case "+": {

        if (
          senderID !== ownerID
        ) return noPerm();

        if (
          isNaN(amount) ||
          amount <= 0
        ) {

          return send(

`╭───────────────⭓
│ ❌ INVALID AMOUNT
╰───────────────⭓`
          );
        }

        const newMoney =
          await addMoney(
            targetID,
            amount
          );

        return send(

`╭───────────────⭓
│ 💸 MONEY ADDED
├───────────────⭔
│ 👤 ${name}
│ ➕ +${amount}
│
│ 🏦 Balance:
│ ${newMoney}
│
│ ⏰ ${time}
╰───────────────⭓`
        );
      }

      // ── REMOVE MONEY ──────────────
      case "-": {

        if (
          senderID !== ownerID
        ) return noPerm();

        if (
          isNaN(amount) ||
          amount <= 0
        ) {

          return send(

`╭───────────────⭓
│ ❌ INVALID AMOUNT
╰───────────────⭓`
          );
        }

        const newMoney =
          await addMoney(
            targetID,
            -amount
          );

        return send(

`╭───────────────⭓
│ 💸 MONEY REMOVED
├───────────────⭔
│ 👤 ${name}
│ ➖ -${amount}
│
│ 🏦 Balance:
│ ${newMoney}
│
│ ⏰ ${time}
╰───────────────⭓`
        );
      }

      // ── RESET BALANCE ─────────────
      case "--": {

        if (
          senderID !== ownerID
        ) return noPerm();

        await setMoney(
          targetID,
          0
        );

        return send(

`╭───────────────⭓
│ 🗑️ BALANCE RESET
├───────────────⭔
│ 👤 ${name}
│
│ 🏦 Balance:
│ 0
╰───────────────⭓`
        );
      }

      // ── SET BALANCE ───────────────
      case "+-": {

        if (
          senderID !== ownerID
        ) return noPerm();

        if (
          isNaN(amount) ||
          amount < 0
        ) {

          return send(

`╭───────────────⭓
│ ❌ INVALID AMOUNT
╰───────────────⭓`
          );
        }

        await setMoney(
          targetID,
          amount
        );

        return send(

`╭───────────────⭓
│ 💰 BALANCE SET
├───────────────⭔
│ 👤 ${name}
│
│ 🏦 Balance:
│ ${amount}
╰───────────────⭓`
        );
      }

      // ── PAY ───────────────────────
      case "pay": {

        let payAmount =
          args[1] === "all"
            ? await getMoney(
                senderID
              )
            : parseInt(args[1]);

        const senderMoney =
          await getMoney(
            senderID
          );

        if (
          !payAmount ||
          payAmount <= 0
        ) {

          return send(

`╭───────────────⭓
│ ❌ INVALID AMOUNT
╰───────────────⭓`
          );
        }

        if (
          senderMoney <
          payAmount
        ) {

          return send(

`╭───────────────⭓
│ ❌ NOT ENOUGH MONEY
├───────────────⭔
│ 🏦 Balance:
│ ${senderMoney}
╰───────────────⭓`
          );
        }

        if (
          targetID === senderID
        ) {

          return send(

`╭───────────────⭓
│ ❌ INVALID TARGET
├───────────────⭔
│ You cannot pay
│ yourself.
╰───────────────⭓`
          );
        }

        await addMoney(
          senderID,
          -payAmount
        );

        const newBalance =
          await addMoney(
            targetID,
            payAmount
          );

        return send(

`╭───────────────⭓
│ ✅ TRANSFER SUCCESS
├───────────────⭔
│ 👤 Receiver:
│ ${name}
│
│ 💸 Sent:
│ ${payAmount}
│
│ 🏦 Receiver Balance:
│ ${newBalance}
│
│ ⏰ ${time}
╰───────────────⭓`
        );
      }

    }

    // ── SHOW BALANCE ─────────────────
    return send(

`╭───────────────⭓
│ 🏦 BANK ACCOUNT
├───────────────⭔
│ 👤 ${name}
│
│ 💰 Balance:
│ ${money}
│
│ ⏰ ${time}
╰───────────────⭓`
    );

  } catch (e) {

    console.log(
      "BANK ERROR:",
      e
    );

  }
};
