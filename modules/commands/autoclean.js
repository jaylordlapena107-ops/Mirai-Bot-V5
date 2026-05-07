const { setData, getData } = require("../../database.js");

// ── PARSE DURATION ─────────────────────────────
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
    return num * 60 * 1000;

  if (unit === "h")
    return num * 60 * 60 * 1000;

  if (unit === "d")
    return num * 24 * 60 * 60 * 1000;

  return null;
}

// ── FORMAT TIME ───────────────────────────────
function formatTime(ms) {

  if (ms <= 0)
    return "0s";

  const sec =
    Math.floor(ms / 1000) % 60;

  const min =
    Math.floor(ms / (1000 * 60)) % 60;

  const hr =
    Math.floor(ms / (1000 * 60 * 60)) % 24;

  const day =
    Math.floor(ms / (1000 * 60 * 60 * 24));

  return `${day > 0 ? day + "d " : ""}${hr > 0 ? hr + "h " : ""}${min > 0 ? min + "m " : ""}${sec}s`;
}

// ── GET USER NAME ─────────────────────────────
async function getUserName(uid, api) {

  try {

    const info =
      await api.getUserInfo(uid);

    return (
      info?.[uid]?.name ||
      `FB-USER`
    );

  } catch {

    return `FB-USER`;

  }
}

// ── FORMAT LIST ───────────────────────────────
async function formatList(uids, api) {

  if (!uids || uids.length === 0)
    return "┃ None";

  let text = "";

  for (const uid of uids) {

    const name =
      await getUserName(uid, api);

    text +=
`┃ • ${name}
`;
  }

  return text;
}

// ── CONFIG ────────────────────────────────────
module.exports.config = {
  name: "autoclean",
  version: "7.0.0",
  hasPermission: 1,
  credits: "ChatGPT + NN",
  description:
    "Auto kick inactive members",
  commandCategory: "group",
  usages:
    "/autoclean 1m|1h|1d",
  cooldowns: 5
};

// ── AUTO KICK ─────────────────────────────────
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
    String(
      api.getCurrentUserID()
    );

  const ownerID =
    "61559999326713";

  api.getThreadInfo(
    threadID,
    async (err, info) => {

      if (err)
        return;

      const inactive =
        data.totalUsers.filter(
          uid =>

            !data.activeUsers.includes(uid) &&

            uid !== botID &&

            uid !== ownerID &&

            !info.adminIDs.some(
              a => a.id == uid
            )
        );

      // ── KICK USERS ─────────────────
      for (const uid of inactive) {

        try {

          await api.removeUserFromGroup(
            uid,
            threadID
          );

        } catch {}
      }

      // ── DELETE SESSION ────────────
      await setData(
        `/autoclean/${threadID}`,
        null
      );

      return api.sendMessage(

`╭───────────────⭓
│ 🧹 AUTO CLEAN FINISHED
├───────────────⭔
│ ✅ Active Users:
│ ${data.activeUsers.length}
│
│ 🚫 Members Kicked:
│ ${inactive.length}
│
│ 👥 Total Members:
│ ${data.totalUsers.length}
│
│ ⚡ Inactive users
│ were removed
│ automatically.
╰───────────────⭓`,

        threadID
      );
    }
  );
}

// ── COMMAND ───────────────────────────────────
module.exports.run =
async function ({
  api,
  event,
  args
}) {

  const {
    threadID,
    messageID,
    senderID
  } = event;

  const ownerID =
    "61559999326713";

  const info =
    await api.getThreadInfo(
      threadID
    );

  const isAdmin =
    info.adminIDs.some(
      a => a.id == senderID
    );

  // ── ADMIN CHECK ──────────────────
  if (
    senderID !== ownerID &&
    !isAdmin
  ) {

    return api.sendMessage(

`╭───────────────⭓
│ ❌ ACCESS DENIED
├───────────────⭔
│ Only group admins
│ can use this command.
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  // ── NO ARGUMENT ──────────────────
  if (!args[0]) {

    return api.sendMessage(

`╭───────────────⭓
│ 🧹 AUTO CLEAN MENU
├───────────────⭔
│ 📌 /autoclean 1m
│ 📌 /autoclean 1h
│ 📌 /autoclean 1d
│
│ 📌 /autoclean list
│ 📌 /autoclean resend
│ 📌 /autoclean cancel
│ 📌 /autoclean startkick
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  const sub =
    args[0].toLowerCase();

  let data =
    await getData(
      `/autoclean/${threadID}`
    );

  // ── CANCEL ───────────────────────
  if (sub === "cancel") {

    await setData(
      `/autoclean/${threadID}`,
      null
    );

    return api.sendMessage(

`╭───────────────⭓
│ 🛑 AUTO CLEAN STOPPED
├───────────────⭔
│ Auto clean session
│ has been cancelled.
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  // ── START KICK ───────────────────
  if (sub === "startkick") {

    if (!data) {

      return api.sendMessage(

`╭───────────────⭓
│ ⚠️ NO ACTIVE SESSION
├───────────────⭔
│ No active auto clean
│ found in this group.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    return kickInactiveMembers(
      api,
      threadID
    );
  }

  // ── RESEND ───────────────────────
  if (sub === "resend") {

    if (!data) {

      return api.sendMessage(

`╭───────────────⭓
│ ⚠️ NO ACTIVE SESSION
├───────────────⭔
│ No active auto clean
│ found in this group.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    const remaining =
      data.endTime - Date.now();

    return api.sendMessage(

`╭───────────────⭓
│ 🧹 AUTO CLEAN ACTIVE
├───────────────⭔
│ ✅ Active:
│ ${data.activeUsers.length}
│
│ 👥 Total:
│ ${data.totalUsers.length}
│
│ ⏳ Remaining:
│ ${formatTime(remaining)}
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  // ── LIST ─────────────────────────
  if (sub === "list") {

    if (!data) {

      return api.sendMessage(

`╭───────────────⭓
│ ⚠️ NO ACTIVE SESSION
├───────────────⭔
│ No active auto clean
│ found in this group.
╰───────────────⭓`,

        threadID,
        messageID
      );
    }

    const active =
      await formatList(
        data.activeUsers,
        api
      );

    const inactive =
      await formatList(
        data.totalUsers.filter(
          uid =>
            !data.activeUsers.includes(uid)
        ),
        api
      );

    const remaining =
      data.endTime - Date.now();

    return api.sendMessage(

`╭───────────────⭓
│ 📋 AUTO CLEAN LIST
├───────────────⭔
│ ✅ ACTIVE USERS
${active}
│
│ 🚫 INACTIVE USERS
${inactive}
│
│ ⏳ Remaining:
│ ${formatTime(remaining)}
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  // ── START ────────────────────────
  const duration =
    parseDuration(sub);

  if (!duration) {

    return api.sendMessage(

`╭───────────────⭓
│ ❌ INVALID TIME
├───────────────⭔
│ Use only:
│
│ • 1m
│ • 1h
│ • 1d
╰───────────────⭓`,

      threadID,
      messageID
    );
  }

  const members =
    info.participantIDs;

  data = {
    endTime:
      Date.now() + duration,

    activeUsers: [],

    totalUsers: members
  };

  await setData(
    `/autoclean/${threadID}`,
    data
  );

  // ── SERVER ANNOUNCEMENT ──────────
  api.sendMessage(

`AUTO CLEAN is now running.

All members must send any message
to register as ACTIVE.

Members who do not chat before
the countdown ends will be
automatically kicked by the bot.

⏳ Time Remaining:
${formatTime(duration)}

👥 Total Members:
${members.length}`,

    threadID
  );

  // ── TIMER ────────────────────────
  setTimeout(async () => {

    await kickInactiveMembers(
      api,
      threadID
    );

  }, duration);
};

// ── HANDLE EVENT ─────────────────────────────
module.exports.handleEvent =
async function ({
  api,
  event
}) {

  const {
    threadID,
    senderID,
    body
  } = event;

  if (!body)
    return;

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

  // ── ALREADY ACTIVE ───────────────
  if (
    data.activeUsers.includes(
      senderID
    )
  ) return;

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

  const remaining =
    data.endTime - Date.now();

  return api.sendMessage(

`╭───────────────⭓
│ ✅ USER REGISTERED
├───────────────⭔
│ 👤 ${name}
│ is now marked
│ as active.
│
│ 📊 Active:
│ ${data.activeUsers.length}
│ / ${data.totalUsers.length}
│
│ ⏳ Remaining:
│ ${formatTime(remaining)}
╰───────────────⭓`,

    threadID
  );
};
