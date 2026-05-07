/**
 * joinNoti event — Welcome new members with text + voice
 * TEAM STARTCOPE BETA
 */

const fs = require('fs-extra');
const path = require('path');

const TEMP_DIR = path.join(
  process.cwd(),
  'utils/data/welcome_voice_temp'
);

fs.ensureDirSync(TEMP_DIR);

module.exports.config = {
  name: 'joinNoti',
  eventType: ['log:subscribe'],
  version: '6.0.0',
  credits: 'Mirai Team | TEAM STARTCOPE BETA',
  description: 'Welcome new members with text + voice',
};

// ── GENERATE VOICE ────────────────────────────────────
async function generateWelcomeVoice(
  firstNames,
  threadName
) {

  try {

    const {
      MsEdgeTTS,
      OUTPUT_FORMAT
    } = require('msedge-tts');

    const tts = new MsEdgeTTS();

    await tts.setMetadata(
      'en-US-GuyNeural',
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const nameStr =
      firstNames.slice(0, 3).join(' and ');

    const greeting =
      firstNames.length === 1
        ? `Welcome, ${nameStr}! Great to have you in ${threadName}. Enjoy the group!`
        : `Welcome everyone — ${nameStr}! Great to have you all in ${threadName}. Enjoy!`;

    const fp = path.join(
      TEMP_DIR,
      `welcome_voice_${Date.now()}.mp3`
    );

    const { audioStream } =
      await tts.toStream(greeting);

    await new Promise((resolve, reject) => {

      const chunks = [];

      audioStream.on(
        'data',
        chunk => chunks.push(chunk)
      );

      audioStream.on('end', () => {

        fs.writeFileSync(
          fp,
          Buffer.concat(chunks)
        );

        resolve();
      });

      audioStream.on('error', reject);

      setTimeout(() => reject(
        new Error('TTS timeout')
      ), 20000);
    });

    return fp;

  } catch (e) {

    console.log(
      '[JoinNoti] Voice failed:',
      e.message
    );

    return null;
  }
}

module.exports.run = async function ({
  api,
  event,
  Users
}) {

  const { threadID } = event;

  // ── BOT ADDED ───────────────────────────────────────
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

    return api.sendMessage(
      `👋 Hello Everyone!\n\n` +
      `🤖 I'm ${global.config.BOTNAME || 'Mirai Bot'}!\n` +
      `⌨️ Prefix: ${global.config.PREFIX}\n` +
      `📖 Type ${global.config.PREFIX}help to see commands!`,
      threadID
    );
  }

  // ── USER JOINED ─────────────────────────────────────
  try {

    const {
      threadName,
      participantIDs
    } = await api.getThreadInfo(threadID);

    const safeThreadName =
      String(threadName || 'Group Chat')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40) || 'Group Chat';

    const nameArray = [];
    const mentions = [];
    const memLengths = [];

    let i = 0;

    for (const p of event.logMessageData.addedParticipants) {

      nameArray.push(p.fullName);

      mentions.push({
        tag: p.fullName,
        id: p.userFbId
      });

      memLengths.push(
        participantIDs.length - i++
      );

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

    // ── SEND WELCOME MESSAGE ──────────────────────────
    api.sendMessage(
      {
        body:
`👋 Welcome ${nameArray.join(', ')}!

🎉 Welcome to ${safeThreadName}
🔢 You are member #${memLengths[0]}

━━━━━━━━━━━━━━━
🌿 BARKADA CRAFT SMP
━━━━━━━━━━━━━━━

📡 SERVER IPs

🇵🇭 PH SERVER
┃ JAVA IP: barkadacraftsmp.ph1-mczie.fun:4090
┃ BEDROCK IP: barkadacraftsmp.ph1-mczie.fun
┃ PORT: 4090

🇸🇬 SG SERVER
┃ JAVA IP: barkadacraftsmp.sg1-mczie.fun:4090
┃ BEDROCK IP: barkadacraftsmp.sg1-mczie.fun
┃ PORT: 4090

━━━━━━━━━━━━━━━
🎮 Join to BarkadaCraft SMP now!
`,
        mentions
      },
      threadID
    );

    // ── VOICE WELCOME ─────────────────────────────────
    const firstNames = nameArray.map(name =>
      name
        .replace(/[^\x00-\x7F]/g, ' ')
        .trim()
        .split(/\s+/)[0] || 'friend'
    );

    generateWelcomeVoice(
      firstNames,
      safeThreadName
    ).then(voicePath => {

      if (!voicePath) return;

      api.sendMessage(
        {
          attachment:
            fs.createReadStream(voicePath)
        },
        threadID,
        () => {

          setTimeout(() => {

            fs.remove(voicePath)
              .catch(() => {});

          }, 120000);
        }
      );
    });

  } catch (e) {

    console.log(
      '[JoinNoti] Error:',
      e.message
    );
  }
};
