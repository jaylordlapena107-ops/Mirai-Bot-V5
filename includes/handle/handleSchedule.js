const cron = require('node-cron');
const fs = require('fs');
const moment = require('moment-timezone');
const path = require('path');
const logger = require('../../utils/log');

module.exports = function ({ api, Threads }) {
  cron.schedule('*/10 * * * *', async () => {
    const checkFile = path.join(__dirname, '..', '..', 'utils', 'data', 'check_data.json');
    const currentTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    let lastRunTime = null;

    if (fs.existsSync(checkFile)) {
      const { datetime } = JSON.parse(fs.readFileSync(checkFile, 'utf-8'));
      lastRunTime = datetime;
    }

    if (!lastRunTime || moment(currentTime).diff(moment(lastRunTime), 'minutes') >= 10) {
      try {
        const groupList = (await api.getThreadList(100, null, ['INBOX'])).filter(group => group.isSubscribed && group.isGroup);
        let dataChanged = false;

        for (const { threadID } of groupList) {
          const newThreadInfo = await api.getThreadInfo(threadID);
          const oldThreadInfo = await Threads.getData(threadID);
          if (JSON.stringify(newThreadInfo) !== JSON.stringify(oldThreadInfo.threadInfo)) {
            await Threads.setData(threadID, { threadInfo: newThreadInfo });
            dataChanged = true;
          }
        }

        if (dataChanged) {
          fs.writeFileSync(checkFile, JSON.stringify({ datetime: currentTime }));
          logger(`Auto-updated data for ${groupList.length} groups`, '[ DATA ] >');
        }
      } catch (e) {
        console.error('Schedule error:', e);
      }
    }
  });
};
