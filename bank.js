const moment = require("moment-timezone");
const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "bank",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Quat | Edited",
  description: "Check or manage bank balance",
  commandCategory: "Economy",
  usages: "[ + , - , * , / , ++ , -- , +- , +% , -% , pay ]",
  cooldowns: 0,
  usePrefix: false
};

// ── GET USER MONEY ───────────────────────────────
async function getMoney(uid) {

  let data =
    await getData(`bank/${uid}`);

  if (!data)
    data = {};

  return data.money || 0;
}

// ── SET USER MONEY ───────────────────────────────
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

// ── ADD MONEY ────────────────────────────────────
async function addMoney(uid, amount) {

  const current =
    await getMoney(uid);

  await setMoney(
    uid,
    current + amount
  );

  return current + amount;
}

module.exports.run = async function ({
  api,
  event,
  args,
  Users,
  permssion
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

    // ── UI FUNCTION ─────────────────────
    const send =
      (msg) =>
        api.sendMessage(
          msg,
          threadID
        );

    const noPerm =
      () =>
        send(

`╭───────────────⭓
│ 🔒 ACCESS DENIED
├───────────────⭔
│ Bot Admin only.
╰───────────────⭓`
        );

    // ── COMMANDS ───────────────────────

    switch (args[0]) {

      // ADD
      case "+": {

        if (permssion < 2)
          return noPerm();

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
│ 💰 ${newMoney}
│ ⏰ ${time}
╰───────────────⭓`
        );
      }

      // REMOVE
      case "-": {

        if (permssion < 2)
          return noPerm();

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
│ 💰 ${newMoney}
│ ⏰ ${time}
╰───────────────⭓`
        );
      }

      // RESET
      case "--": {

        if (permssion < 2)
          return noPerm();

        await setMoney(
          targetID,
          0
        );

        return send(

`╭───────────────⭓
│ 🗑️ BALANCE RESET
├───────────────⭔
│ 👤 ${name}
│ 💰 0
╰───────────────⭓`
        );
      }

      // SET MONEY
      case "+-": {

        if (permssion < 2)
          return noPerm();

        await setMoney(
          targetID,
          amount
        );

        return send(

`╭───────────────⭓
│ 💰 BALANCE SET
├───────────────⭔
│ 👤 ${name}
│ 💵 ${amount}
╰───────────────⭓`
        );
      }

      // PAY
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
│ Your Balance:
│ 💰 ${senderMoney}
╰───────────────⭓`
          );
        }

        await addMoney(
          senderID,
          -payAmount
        );

        await addMoney(
          targetID,
          payAmount
        );

        return send(

`╭───────────────⭓
│ ✅ TRANSFER SUCCESS
├───────────────⭔
│ 👤 Sent to:
│ ${name}
│
│ 💸 ${payAmount}
│ ⏰ ${time}
╰───────────────⭓`
        );
      }

    }

    // ── SHOW BALANCE ───────────────────
    return send(

`╭───────────────⭓
│ 🏦 BANK ACCOUNT
├───────────────⭔
│ 👤 ${name}
│ 💰 ${money}
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
