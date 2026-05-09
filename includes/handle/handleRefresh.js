const leaveNoti = require('../../modules/events/leaveNoti.js');

module.exports = function ({ api, models, Users, Threads, Currencies }) {
  const logger = require("../../utils/log.js");

  return async function ({ event }) {
    const { threadID, logMessageType, logMessageData } = event;
    const { setData, getData, delData } = Threads;

    try {
      let threadData = await getData(threadID);
      if (!threadData) {
        logger('Thread data not found: ' + threadID, '[ERROR]');
        return;
      }

      let dataThread = threadData.threadInfo || {};
      dataThread.adminIDs = dataThread.adminIDs || [];
      dataThread.participantIDs = dataThread.participantIDs || [];

      switch (logMessageType) {

        case "log:thread-admins": {
          if (logMessageData.ADMIN_EVENT == "add_admin") {
            dataThread.adminIDs.push({ id: logMessageData.TARGET_ID });
          } else if (logMessageData.ADMIN_EVENT == "remove_admin") {
            dataThread.adminIDs = dataThread.adminIDs.filter(item => item.id != logMessageData.TARGET_ID);
          }

          logger('Refreshed admin list for thread ' + threadID, '[UPDATE DATA]');
          await setData(threadID, { threadInfo: dataThread });
          break;
        }

        case "log:thread-name": {
          logger('Updated thread name for ' + threadID, '[UPDATE DATA]');
          dataThread.threadName = logMessageData.name;
          await setData(threadID, { threadInfo: dataThread });
          break;
        }

        case 'log:unsubscribe': {
          const userFbId = logMessageData.leftParticipantFbId;

          if (userFbId == api.getCurrentUserID()) {
            logger('Deleting data for thread ' + threadID, '[DELETE DATA THREAD]');
            const index = global.data.allThreadID?.findIndex(item => item == threadID);
            if (index > -1) global.data.allThreadID.splice(index, 1);
            await delData(threadID);
            return;
          } else {

            // OPTIONAL: kung gusto mo pati leave notification silent
            // comment mo ito
            // await leaveNoti.run({ api, event, Users, Threads });

            const participantIndex = dataThread.participantIDs.findIndex(item => item == userFbId);
            if (participantIndex > -1) dataThread.participantIDs.splice(participantIndex, 1);

            const adminIndex = dataThread.adminIDs.findIndex(item => item.id == userFbId);
            if (adminIndex > -1) dataThread.adminIDs.splice(adminIndex, 1);

            logger('Removed user ' + userFbId, '[DELETE DATA USER]');
            await setData(threadID, { threadInfo: dataThread });
          }
          break;
        }
      }

    } catch (e) {
      console.error('Error updating data: ' + e);
    }

    return;
  };
};
