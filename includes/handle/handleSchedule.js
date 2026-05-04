const cron = require('node-cron');
const moment = require('moment-timezone');
const logger = require('../../utils/log');
const bold = require('../../utils/bold');

const TZ = 'Asia/Manila';

const mealMessages = [
  {
    cron: '0 6 * * *',
    message: () =>
      `🌅 ${bold('Good Morning!')} 🌞\n\n` +
      `╔══════════════════╗\n` +
      `║  🌤️  ${bold('RISE & SHINE')}  🌤️  ║\n` +
      `╚══════════════════╝\n\n` +
      `Good morning everyone! 👋\n` +
      `A new day has started — make it count! 💪\n\n` +
      `⏰ ${bold('Time:')} ${moment().tz(TZ).format('hh:mm A')} | ${moment().tz(TZ).format('dddd, MMMM D YYYY')}\n` +
      `🌏 ${bold('Timezone:')} Asia/Manila`
  },
  {
    cron: '0 7 * * *',
    message: () =>
      `🍳 ${bold('Breakfast Time!')} ☕\n\n` +
      `╔══════════════════╗\n` +
      `║  🍽️  ${bold('BREAKFAST')}  🍽️   ║\n` +
      `╚══════════════════╝\n\n` +
      `Don't skip breakfast! 🥞🍳🥐\n` +
      `Eat well so you can have a great and productive day! 😊\n\n` +
      `⏰ ${bold('Time:')} ${moment().tz(TZ).format('hh:mm A')}\n` +
      `📅 ${moment().tz(TZ).format('dddd, MMMM D YYYY')}`
  },
  {
    cron: '0 10 * * *',
    message: () =>
      `☕ ${bold('Morning Break!')} 🍪\n\n` +
      `╔══════════════════╗\n` +
      `║  ☕ ${bold('MID-MORNING')}  ☕  ║\n` +
      `╚══════════════════╝\n\n` +
      `Time for a short break! ☕🍪\n` +
      `Grab a snack and recharge! 😄\n\n` +
      `⏰ ${bold('Time:')} ${moment().tz(TZ).format('hh:mm A')}\n` +
      `📅 ${moment().tz(TZ).format('dddd, MMMM D YYYY')}`
  },
  {
    cron: '0 12 * * *',
    message: () =>
      `🍱 ${bold('Lunch Time!')} 🥘\n\n` +
      `╔══════════════════╗\n` +
      `║  🍜  ${bold('LUNCH TIME')}  🍜  ║\n` +
      `╚══════════════════╝\n\n` +
      `It's lunch time everyone! 🍽️\n` +
      `Take a break and eat a proper meal! 😋🍚🥗\n\n` +
      `⏰ ${bold('Time:')} ${moment().tz(TZ).format('hh:mm A')}\n` +
      `📅 ${moment().tz(TZ).format('dddd, MMMM D YYYY')}`
  },
  {
    cron: '0 15 * * *',
    message: () =>
      `🧃 ${bold('Afternoon Snack!')} 🍌\n\n` +
      `╔══════════════════╗\n` +
      `║  🍎 ${bold('MERIENDA TIME')} 🍎 ║\n` +
      `╚══════════════════╝\n\n` +
      `Merienda time! 😄🍌🧃\n` +
      `A little snack to keep you going through the afternoon! 💪\n\n` +
      `⏰ ${bold('Time:')} ${moment().tz(TZ).format('hh:mm A')}\n` +
      `📅 ${moment().tz(TZ).format('dddd, MMMM D YYYY')}`
  },
  {
    cron: '0 18 * * *',
    message: () =>
      `🍖 ${bold('Dinner Time!')} 🍛\n\n` +
      `╔══════════════════╗\n` +
      `║  🍛  ${bold('DINNER TIME')}  🍛  ║\n` +
      `╚══════════════════╝\n\n` +
      `Dinner time! 🌆🍖🍛\n` +
      `Enjoy your meal with your family! ❤️\n\n` +
      `⏰ ${bold('Time:')} ${moment().tz(TZ).format('hh:mm A')}\n` +
      `📅 ${moment().tz(TZ).format('dddd, MMMM D YYYY')}`
  },
  {
    cron: '0 21 * * *',
    message: () =>
      `🌙 ${bold('Good Night!')} ⭐\n\n` +
      `╔══════════════════╗\n` +
      `║  🌙  ${bold('GOOD NIGHT')}  🌙  ║\n` +
      `╚══════════════════╝\n\n` +
      `Good night everyone! 🌙⭐\n` +
      `Rest well, tomorrow is a new opportunity! 😴💤\n` +
      `Take care and God bless! 🙏\n\n` +
      `⏰ ${bold('Time:')} ${moment().tz(TZ).format('hh:mm A')}\n` +
      `📅 ${moment().tz(TZ).format('dddd, MMMM D YYYY')}`
  }
];

module.exports = function ({ api, Threads }) {
  mealMessages.forEach(({ cron: schedule, message }) => {
    cron.schedule(schedule, async () => {
      try {
        const allThreadIDs = global.data.allThreadID || [];
        const msg = message();
        let sent = 0;
        for (const threadID of allThreadIDs) {
          try {
            await api.sendMessage(msg, threadID);
            sent++;
            await new Promise(r => setTimeout(r, 500));
          } catch (e) {}
        }
        logger(`Auto time message sent to ${sent} groups`, '[ SCHEDULE ] >');
      } catch (e) {
        console.error('Schedule error:', e);
      }
    }, { timezone: TZ });
  });

  cron.schedule('*/10 * * * *', async () => {
    try {
      const groupList = (await api.getThreadList(100, null, ['INBOX'])).filter(g => g.isSubscribed && g.isGroup);
      for (const { threadID } of groupList) {
        const newInfo = await api.getThreadInfo(threadID);
        const old = await Threads.getData(threadID);
        if (JSON.stringify(newInfo) !== JSON.stringify(old?.threadInfo)) {
          await Threads.setData(threadID, { threadInfo: newInfo });
        }
      }
    } catch (e) {}
  }, { timezone: TZ });

  logger('⏰ Schedule system started (6AM/7AM/10AM/12PM/3PM/6PM/9PM)', '[ SCHEDULE ] >');
};
