module.exports.config = {
    name: "leaveNoti",
    eventType: ["log:unsubscribe"],
    version: "3.0.0",
    credits: "Ranz | Edited",
    description: "Silent leave system"
};

module.exports.run = async function ({
    api,
    event
}) {

    try {

        const { threadID } = event;

        const leftID =
            event.logMessageData.leftParticipantFbId;

        // Ignore bot leave
        if (leftID == api.getCurrentUserID())
            return;

        // No leave message
        return;

    } catch (e) {

        console.log(
            "[leaveNoti]",
            e
        );

    }
};
