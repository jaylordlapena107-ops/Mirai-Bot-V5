/**
 * joinNoti event — Welcome new members
 * TEAM STARTCOPE BETA
 */

module.exports.config = {
  name: 'joinNoti',
  eventType: ['log:subscribe'],
  version: '7.0.0',
  credits: 'Mirai Team | TEAM STARTCOPE BETA',
  description: 'Welcome new members without voice',
};

module.exports.run = async function ({
  api,
  event,
  Users
}) {

  const { threadID } = event;

  // ── BOT ADDED ─────────────────────
  if (
    event.logMessageData.addedParticipants.some(
      p => p.userFbId == api.getCurrentUserID()
    )
  ) {

    api.changeNickname(
      `[ ${global.config.PREFIX} ] • ${global.config.BOTNAME || 'Mirai Bot'}`,
      threadID,
      api.getCurrentUserID()
    );

    return;
  }

  // ── USER JOINED ───────────────────
  try {

    for (
      const p of
      event.logMessageData.addedParticipants
    ) {

      // save user data
      if (
        !global.data.allUserID.includes(
          String(p.userFbId)
        )
      ) {

        await Users.createData(
          p.userFbId,
          {
            name: p.fullName,
            data: {}
          }
        );

        global.data.allUserID.push(
          String(p.userFbId)
        );
      }
    }

    // no message
    return;

  } catch (e) {

    console.log(
      '[JoinNoti] Error:',
      e.message
    );
  }
};
