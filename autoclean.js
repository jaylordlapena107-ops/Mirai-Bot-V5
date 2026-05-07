const { setData, getData } = require("../../database.js");

// ── SETTINGS ─────────────────────────────
const OWNER_ID = "61559999326713";

// ── PARSE TIME ───────────────────────────
function parseDuration(str) {

  const match =
    str.match(/(\d+)([mhd])/);

  if (!match)
    return null;

  const num =
    parseInt(match[1]);

  const unit =
    match[2];

  if (unit === "m")
    return num * 60000;

  if (unit === "h")
    return num * 3600000;

  if (unit === "d")
    return num * 86400000;

  return null;
}

// ── FORMAT TIME ──────────────────────────
function formatTime(ms) {

  if (ms <= 0)
    return "0s";

  const s =
    Math.floor(ms / 1000) % 60;

  const m =
    Math.floor(ms / 60000) % 60;

  const h =
    Math.floor(ms / 3600000) % 24;

  const d =
    Math.floor(ms / 86400000);

  return `${d ? d + "d " : ""}${h ? h + "h " : ""}${m ? m + "m " : ""}${s}s`;
}

// ── GET USERNAME ─────────────────────────
async function getUserName(uid, api) {

  try {

    const info =
      await api.getUserInfo(uid);

    return (
      info?.[uid]?.name ||
      `User ${uid}`
    );

  } catch {

    return `User ${uid}`;
  }
}

// ── KICK SYSTEM ──────────────────────────
async function kickInactiveMembers(
  api,
  threadID
) {

  const data =
    await getData(
      `/autoclean/${threadID}`
    );

  if (!data)
    return;

  const botID =
    api.getCurrentUserID();

  const info =
    await api.getThreadInfo(
      threadID
    );

  const inactive =
    data.totalUsers.filter(uid =>

      !data.activeUsers.includes(uid) &&
      uid !== botID &&
      uid !== OWNER_ID &&
      !info.adminIDs.some(
        a => a.id == uid
      )
    );

  let kicked = 0;

  for (const uid of inactive) {

    try {

      await api.removeUserFromGroup(
        uid,
        threadID
      );

      kicked++;

    } catch {}
  }

  await setData(
    `/autoclean/${threadID}`,
    null
  );

  return api.sendMessage(

`╭━━━━━━━━━━━━━━━╮
┃ 🧹 AUTO CLEAN DONE
┣━━━━━━━━━━━━━━━┫
┃ ✅ Active:
┃ ${data.activeUsers.length}
┃
┃ ❌ Kicked:
┃ ${kicked}
┃
┃ 👥 Total Members:
┃ ${data.totalUsers.length}
╰━━━━━━━━━━━━━━━╯`,

    threadID
  );
}

// ── COMMAND ──────────────────────────────
module.exports.config = {
  name: "autoclean",
  version: "6.0.0",
  hasPermission: 1,
  credits: "ChatGPT",
  description: "Auto remove inactive members",
  commandCategory: "Group",
  usages:
    "/autoclean 1m|1h|1d",
  cooldowns: 5
};

module.exports.run =
async function ({
  api,
  event,
  args
}) {

  const {
    threadID,
    senderID,
    messageID
  } = event;

  const info =
    await api.getThreadInfo(
      threadID
    );

  const isAdmin =
    info.adminIDs.some(
      a => a.id == senderID
    );

  // admin only
  if (
    senderID !== OWNER_ID &&
    !isAdmin
  ) {

    return api.sendMessage(

`╭━━━━━━━━━━━━━━━╮
┃ ❌ ACCESS DENIED
┣━━━━━━━━━━━━━━━┫
┃ Only GC admins
┃ can use this.
╰━━━━━━━━━━━━━━━╯`,

      threadID,
      messageID
    );
  }

  // no args
  if (!args[0]) {

    return api.sendMessage(

`╭━━━━━━━━━━━━━━━╮
┃ 🧹 AUTO CLEAN
┣━━━━━━━━━━━━━━━┫
┃ 📌 /autoclean 1m
┃ 📌 /autoclean 1h
┃ 📌 /autoclean 1d
┃
┃ 📌 /autoclean list
┃ 📌 /autoclean cancel
┃ 📌 /autoclean kick
╰━━━━━━━━━━━━━━━╯`,

      threadID,
      messageID
    );
  }

  const option =
    args[0].toLowerCase();

  let data =
    await getData(
      `/autoclean/${threadID}`
    );

  // ── CANCEL ─────────────────────
  if (option === "cancel") {

    await setData(
      `/autoclean/${threadID}`,
      null
    );

    return api.sendMessage(

`╭━━━━━━━━━━━━━━━╮
┃ 🛑 AUTO CLEAN
┣━━━━━━━━━━━━━━━┫
┃ Event cancelled.
╰━━━━━━━━━━━━━━━╯`,

      threadID,
      messageID
    );
  }

  // ── LIST ───────────────────────
  if (option === "list") {

    if (!data) {

      return api.sendMessage(

`╭━━━━━━━━━━━━━━━╮
┃ ⚠️ NO ACTIVE EVENT
╰━━━━━━━━━━━━━━━╯`,

        threadID,
        messageID
      );
    }

    const inactive =
      data.totalUsers.filter(
        uid =>
          !data.activeUsers.includes(uid)
      );

    let msg =

`╭━━━━━━━━━━━━━━━╮
┃ 📋 AUTO CLEAN
┣━━━━━━━━━━━━━━━┫
┃ ✅ Active:
┃ ${data.activeUsers.length}
┃
┃ ❌ Inactive:
┃ ${inactive.length}
┃
┃ ⏳ Remaining:
┃ ${formatTime(
  data.endTime - Date.now()
)}
╰━━━━━━━━━━━━━━━╯`;

    return api.sendMessage(
      msg,
      threadID,
      messageID
    );
  }

  // ── FORCE KICK ─────────────────
  if (option === "kick") {

    if (!data) {

      return api.sendMessage(
        "⚠️ No active event.",
        threadID,
        messageID
      );
    }

    return kickInactiveMembers(
      api,
      threadID
    );
  }

  // ── START ──────────────────────
  const duration =
    parseDuration(option);

  if (!duration) {

    return api.sendMessage(

`╭━━━━━━━━━━━━━━━╮
┃ ❌ INVALID TIME
┣━━━━━━━━━━━━━━━┫
┃ Example:
┃ 1m / 1h / 1d
╰━━━━━━━━━━━━━━━╯`,

      threadID,
      messageID
    );
  }

  const members =
    info.participantIDs;

  const endTime =
    Date.now() + duration;

  data = {
    endTime,
    activeUsers: [],
    totalUsers: members
  };

  await setData(
    `/autoclean/${threadID}`,
    data
  );

  api.sendMessage(

`╭━━━━━━━━━━━━━━━╮
┃ 🧹 AUTO CLEAN STARTED
┣━━━━━━━━━━━━━━━┫
┃ 👥 Members:
┃ ${members.length}
┃
┃ ⏳ Duration:
┃ ${formatTime(duration)}
┃
┃ 💬 Send message
┃ to stay safe.
╰━━━━━━━━━━━━━━━╯`,

    threadID
  );

  // timer
  setTimeout(async () => {

    await kickInactiveMembers(
      api,
      threadID
    );

  }, duration);
};

// ── AUTO TRACK ───────────────────────────
module.exports.handleEvent =
async function ({
  api,
  event
}) {

  try {

    const {
      threadID,
      senderID,
      type
    } = event;

    if (
      type !== "message"
    ) return;

    let data =
      await getData(
        `/autoclean/${threadID}`
      );

    if (!data)
      return;

    if (
      !Array.isArray(
        data.activeUsers
      )
    ) {

      data.activeUsers = [];
    }

    // already active
    if (
      data.activeUsers.includes(
        senderID
      )
    ) return;

    // add active
    data.activeUsers.push(
      senderID
    );

    await setData(
      `/autoclean/${threadID}`,
      data
    );

    const name =
      await getUserName(
        senderID,
        api
      );

    return api.sendMessage(

`╭━━━━━━━━━━━━━━━╮
┃ ✅ ACTIVE REGISTERED
┣━━━━━━━━━━━━━━━┫
┃ 👤 ${name}
┃
┃ 🛡️ Safe from kick.
╰━━━━━━━━━━━━━━━╯`,

      threadID
    );

  } catch (e) {

    console.log(
      "AUTOCLEAN ERROR:",
      e
    );
  }
};
