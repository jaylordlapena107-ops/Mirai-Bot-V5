const { getData, setData } = require("../../database.js");

module.exports.config = {
  name: "invite",
  eventType: [
    "log:subscribe",
    "log:unsubscribe"
  ],
  version: "2.0.0",
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
      logMessageType,
      logMessageData
    } = event;

    // ─────────────────────────────────
    // MEMBER ADDED
    // ─────────────────────────────────
    if (
      logMessageType ===
      "log:subscribe"
    ) {

      const addedUsers =
        logMessageData
        .addedParticipants || [];

      const botID =
        String(
          api.getCurrentUserID()
        );

      // ignore if bot added
      const isBotAdded =
        addedUsers.some(
          user =>
            String(user.userFbId)
            === botID
        );

      if (isBotAdded)
        return;

      const inviterID =
        String(author);

      const inviterName =
        await Users.getNameUser(
          inviterID
        );

      // invite database
      let inviteData =
        await getData(
          `inviteSystem/${threadID}`
        );

      if (!inviteData)
        inviteData = {};

      // member database
      let memberData =
        await getData(
          `inviteMembers/${threadID}`
        );

      if (!memberData)
        memberData = {};

      // create inviter
      if (!inviteData[inviterID]) {

        inviteData[inviterID] = {
          count: 0
        };
      }

      let reward = 0;
      let names = "";
      let spamNames = "";

      // check every added member
      for (const user of addedUsers) {

        const uid =
          String(user.userFbId);

        // already invited before
        if (memberData[uid]) {

          spamNames +=
`│ ❌ ${user.fullName}
`;

          continue;
        }

        // save member inviter
        memberData[uid] = {
          inviterID,
          joinedAt: Date.now()
        };

        inviteData[inviterID]
        .count += 1;

        reward += 50;

        names +=
`│ 👤 ${user.fullName}
`;
      }

      // save databases
      await setData(
        `inviteSystem/${threadID}`,
        inviteData
      );

      await setData(
        `inviteMembers/${threadID}`,
        memberData
      );

      // if no valid invite
      if (reward <= 0) {

        return api.sendMessage(

`╭───────────────⭓
│ ⚠️ SPAM ADD DETECTED
├───────────────⭔
${spamNames}│
│ These members were
│ already invited before.
│
│ ❌ No reward given.
╰───────────────⭓`,

          threadID
        );
      }

      // add reward
      const balance =
        await addMoney(
          inviterID,
          reward
        );

      const totalInvites =
        inviteData[inviterID]
        .count;

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
${spamNames ?
`
├───────────────⭔
│ ⚠️ Spam Add Blocked
${spamNames}│ No reward given.
` : ""}
╰───────────────⭓`,

        threadID
      );
    }

    // ─────────────────────────────────
    // MEMBER LEFT / REMOVED
    // ─────────────────────────────────
    if (
      logMessageType ===
      "log:unsubscribe"
    ) {

      const leftUID =
        String(
          logMessageData
          .leftParticipantFbId
        );

      // ignore bot leave
      if (
        leftUID ===
        String(
          api.getCurrentUserID()
        )
      ) return;

      let memberData =
        await getData(
          `inviteMembers/${threadID}`
        );

      if (!memberData)
        memberData = {};

      // not invited
      if (!memberData[leftUID])
        return;

      const inviterID =
        memberData[leftUID]
        .inviterID;

      const inviterName =
        await Users.getNameUser(
          inviterID
        );

      const leftName =
        await Users.getNameUser(
          leftUID
        );

      // remove saved member
      delete memberData[leftUID];

      await setData(
        `inviteMembers/${threadID}`,
        memberData
      );

      // invite stats
      let inviteData =
        await getData(
          `inviteSystem/${threadID}`
        );

      if (!inviteData)
        inviteData = {};

      if (
        inviteData[inviterID]
      ) {

        inviteData[inviterID]
        .count -= 1;

        if (
          inviteData[inviterID]
          .count < 0
        ) {

          inviteData[inviterID]
          .count = 0;
        }
      }

      await setData(
        `inviteSystem/${threadID}`,
        inviteData
      );

      // deduct money
      const currentMoney =
        await getMoney(
          inviterID
        );

      let deduct = 50;

      // prevent negative
      if (currentMoney < 50) {

        deduct = currentMoney;
      }

      const balance =
        await addMoney(
          inviterID,
          -deduct
        );

      return api.sendMessage(

`╭───────────────⭓
│ 📤 MEMBER LEFT
├───────────────⭔
│ 👤 ${leftName}
│ left or was removed.
│
│ 📨 Inviter:
│ ${inviterName}
│
│ 💸 Deducted:
│ -${deduct} Money
│
│ 🏦 New Balance:
│ ${balance}
╰───────────────⭓`,

        threadID
      );
    }

  } catch (e) {

    console.log(
      "INVITE ERROR:",
      e
    );

  }
};
