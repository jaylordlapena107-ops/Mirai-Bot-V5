/**
 * joinNoti event — Welcome new members with image + voice
 * TEAM STARTCOPE BETA
 */

const bold = require('../../utils/bold');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const TEMP_DIR = path.join(
  process.cwd(),
  'utils/data/welcome_voice_temp'
);

fs.ensureDirSync(TEMP_DIR);

module.exports.config = {
  name: 'joinNoti',
  eventType: ['log:subscribe'],
  version: '5.0.0',
  credits: 'Mirai Team | TEAM STARTCOPE BETA',
  description: 'Welcome new members with image + voice',
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
      `👋 ${bold('Hello Everyone!')}\n\n` +
      `🤖 I'm ${bold(global.config.BOTNAME || 'Mirai Bot')}!\n` +
      `⌨️ Prefix: ${bold(global.config.PREFIX)}\n` +
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

    const firstUser =
      event.logMessageData.addedParticipants[0];

    // ── WELCOME IMAGE ─────────────────────────────────
    try {

      const avatarUrl =
        `https://graph.facebook.com/${firstUser.userFbId}/picture?width=512&height=512`;

      const welcomeAPI =
        `https://urangkapolka.vercel.app/api/welcome` +
        `?username=${encodeURIComponent(nameArray.join(', '))}` +
        `&avatarUrl=${encodeURIComponent(avatarUrl)}` +
        `&groupname=${encodeURIComponent(safeThreadName)}` +
        `&bg=${encodeURIComponent('https://i.imgur.com/YzgoR04.png')}` +
        `&memberCount=${encodeURIComponent(memLengths[0])}`;

      const imgPath = path.join(
        TEMP_DIR,
        `welcome_${Date.now()}.png`
      );

      const response = await axios({
        url: welcomeAPI,
        method: 'GET',
        responseType: 'stream'
      });

      const writer =
        fs.createWriteStream(imgPath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {

        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // SEND IMAGE
      api.sendMessage(
        {
          body:
            `👋 Welcome ${nameArray.join(', ')}!\n` +
            `🎉 Welcome to ${safeThreadName}\n` +
            `🔢 Member #${memLengths[0]}`,
          attachment:
            fs.createReadStream(imgPath),
          mentions
        },
        threadID,
        () => {

          setTimeout(() => {

            fs.remove(imgPath)
              .catch(() => {});

          }, 120000);
        }
      );

    } catch (err) {

      console.log(
        '[JoinNoti] Welcome image failed:',
        err.message
      );
    }

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
