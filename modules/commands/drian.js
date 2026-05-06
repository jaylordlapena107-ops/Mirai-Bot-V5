const axios = require('axios');

const AI_NAME = "Drian AI";
const SYSTEM_PROMPT = `You are Drian AI, a smart and friendly school assistant and research helper. 
You help students with homework, explain lessons clearly, answer research questions, summarize topics, 
solve math problems, and provide study tips. Always respond in a clear, helpful, and student-friendly way. 
If the user speaks in Filipino/Tagalog, respond in Filipino/Tagalog. 
If in English, respond in English. Keep answers concise but complete.`;

const conversationHistory = new Map();

module.exports.config = {
    name: "drian",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "Mirai Team",
    description: "Drian AI — Free school assistant and research helper powered by AI",
    commandCategory: "AI",
    usages: "[question / topic / math problem]",
    cooldowns: 5
};

async function askDrianAI(prompt, threadID) {
    const history = conversationHistory.get(threadID) || [];
    history.push({ role: "user", content: prompt });

    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-10)
    ];

    const response = await axios.post(
        "https://text.pollinations.ai/",
        {
            messages,
            model: "openai",
            temperature: 0.7
        },
        {
            headers: { "Content-Type": "application/json" },
            timeout: 30000
        }
    );

    const reply = typeof response.data === "string"
        ? response.data
        : response.data?.choices?.[0]?.message?.content || response.data?.text || String(response.data);

    history.push({ role: "assistant", content: reply });

    if (history.length > 20) history.splice(0, 2);
    conversationHistory.set(threadID, history);

    return reply;
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    if (!args.length) {
        return api.sendMessage(
            `╔══════════════════════╗\n` +
            `║  🤖 ${AI_NAME}     ║\n` +
            `╚══════════════════════╝\n\n` +
            `📚 Ako si Drian AI, ang inyong libreng school assistant at research helper!\n\n` +
            `✅ Kaya kong tulungan kayo sa:\n` +
            `   • Homework at assignments\n` +
            `   • Paliwanag ng mga aralin\n` +
            `   • Research at mga paksa\n` +
            `   • Math problems\n` +
            `   • Study tips at summaries\n\n` +
            `💡 Paano gamitin:\n` +
            `   ${global.config.PREFIX}drian [inyong tanong]\n\n` +
            `📌 Halimbawa:\n` +
            `   ${global.config.PREFIX}drian Ano ang photosynthesis?\n` +
            `   ${global.config.PREFIX}drian Solve: 2x + 5 = 15\n` +
            `   ${global.config.PREFIX}drian Summarize World War 2\n\n` +
            `🔄 Type ${global.config.PREFIX}drian reset — para i-clear ang conversation`,
            threadID,
            messageID
        );
    }

    if (args[0].toLowerCase() === "reset") {
        conversationHistory.delete(threadID);
        return api.sendMessage(
            `🔄 Conversation cleared! Puwede na tayong magsimula ulit.\n💬 I-type ang ${global.config.PREFIX}drian [tanong] para magsimula.`,
            threadID, messageID
        );
    }

    const question = args.join(" ").trim();

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
        const answer = await askDrianAI(question, threadID);

        api.setMessageReaction("✅", messageID, () => {}, true);

        const header = `🤖 ${AI_NAME}\n${"─".repeat(30)}\n`;
        const footer = `\n${"─".repeat(30)}\n💬 Reply para mag-follow up question`;

        return api.sendMessage(
            { body: header + answer + footer },
            threadID,
            (err, info) => {
                if (!err && info) {
                    global.client.handleReply.push({
                        name: module.exports.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        threadID
                    });
                }
            }
        );
    } catch (error) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        console.error("[Drian AI Error]", error.message);
        return api.sendMessage(
            `❌ Hindi makontak ang Drian AI ngayon. Subukan ulit mamaya.\n🔧 Error: ${error.message}`,
            threadID, messageID
        );
    }
};

module.exports.handleReply = async function ({ api, event }) {
    const { threadID, messageID, senderID, body } = event;

    if (!body || !body.trim()) return;

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
        const answer = await askDrianAI(body.trim(), threadID);

        api.setMessageReaction("✅", messageID, () => {}, true);

        const header = `🤖 ${AI_NAME}\n${"─".repeat(30)}\n`;
        const footer = `\n${"─".repeat(30)}\n💬 Reply para mag-follow up question`;

        return api.sendMessage(
            { body: header + answer + footer },
            threadID,
            (err, info) => {
                if (!err && info) {
                    global.client.handleReply.push({
                        name: module.exports.config.name,
                        messageID: info.messageID,
                        author: senderID,
                        threadID
                    });
                }
            }
        );
    } catch (error) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(
            `❌ Hindi makontak ang Drian AI ngayon. Subukan ulit mamaya.`,
            threadID, messageID
        );
    }
};
