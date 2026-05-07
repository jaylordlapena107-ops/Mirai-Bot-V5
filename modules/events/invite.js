const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "invite",
  eventType: ["log:subscribe"],
  version: "1.0.0",
  credits: "ChatGPT",
  description: "Invite reward system"
};

// ── GET MONEY ─────────────────────────────
async function getMoney(uid) {

  let data =
    await getData(`bank/${uid}`);

  if (!data)
    data = {};

  return data.money || 0;
}

// ── SET MONEY ─────────────────────────────
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

// ── ADD MONEY ─────────────────────────────
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

// ── EVENT ─────────────────────────────────
module.exports.run = async function ({
  api,
  event,
  Users
}) {

  try {

    const {
      threadID,
      author,
      logMessageData
    } = event;

    // added users
    const addedUsers =
      logMessageData.addedParticipants || [];

    // bot id
    const botID =
      String(api.getCurrentUserID());

    // ignore if bot added
    const isBotAdded =
      addedUsers.some(
        user =>
          String(user.userFbId) === botID
      );

    if (isBotAdded)
      return;

    // inviter
    const inviterID =
      String(author);

    const inviterName =
      await Users.getNameUser(
        inviterID
      );

    // get database
    let inviteData =
      await getData(
        `inviteSystem/${threadID}`
      );

    if (!inviteData)
      inviteData = {};

    // create inviter
    if (!inviteData[inviterID]) {

      inviteData[inviterID] = {
        count: 0
      };
    }

    // add count
    inviteData[inviterID].count +=
      addedUsers.length;

    // save invite data
    await setData(
      `inviteSystem/${threadID}`,
      inviteData
    );

    // reward
    const reward =
      50 * addedUsers.length;

    // add money
    const balance =
      await addMoney(
        inviterID,
        reward
      );

    // total invites
    const totalInvites =
      inviteData[inviterID].count;

    // names
    let names = "";

    for (const user of addedUsers) {

      names +=
`│ 👤 ${user.fullName}
`;
    }

    // send message
    return api.sendMessage(

`╭───────────────⭓
│ 🎉 MEMBER INVITED
├───────────────⭔
${names}│
│ 📨 Invited By:
│ ${inviterName}
│
│ 🏆 Total Invited:
│ ${totalInvites}
│
│ 💸 Reward:
│ +${reward} Money
│
│ 🏦 Total Balance:
│ ${balance}
╰───────────────⭓`,

      threadID
    );

  } catch (e) {

    console.log(
      "INVITE ERROR:",
      e
    );

  }
};
