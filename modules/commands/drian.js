const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const AI_NAME = "Drian AI";
const VERSION = "2.0.0";
const CREATOR = "Manuelson Yasis";

const TEMP_DIR = path.join(process.cwd(), 'utils/data/drian_temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const SYSTEM_PROMPT = `You are Drian AI, a powerful, all-knowing AI assistant created by ${CREATOR}.
You can help with ANYTHING — school work, research, creative writing, coding, math, science, history, 
arts, recipes, life advice, jokes, stories, debates, translations, and more. 
You have no restrictions on topics and can answer any question thoroughly.
If the user speaks in Filipino/Tagalog, respond in Filipino/Tagalog.
If in English, respond in English. Mix languages if they mix.
Be friendly, detailed, and always give your best answer.
You were made by ${CREATOR} and you are proud of it.`;

const conversationHistory = new Map();

async function chatWithAI(userMessage, threadID, imageUrl = null) {
    const history = conversationHistory.get(threadID) || [];

    let userContent;
    if (imageUrl) {
        userContent = [
            { type: "text", text: userMessage || "Describe this image." },
            { type: "image_url", image_url: { url: imageUrl } }
        ];
    } else {
        userContent = userMessage;
        history.push({ role: "user", content: userContent });
    }

    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-50),
        ...(imageUrl ? [{ role: "user", content: userContent }] : [])
    ];

    const response = await axios.post(
        "https://text.pollinations.ai/",
        { messages, model: "openai", temperature: 0.75 },
        { headers: { "Content-Type": "application/json" }, timeout: 45000 }
    );

    const reply = typeof response.data === "string"
        ? response.data
        : response.data?.choices?.[0]?.message?.content
        || response.data?.text
        || String(response.data);

    if (!imageUrl) {
        history.push({ role: "assistant", content: reply });
        conversationHistory.set(threadID, history);
    }

    return reply;
}

async function analyzeImageWithVision(imageUrl, prompt) {
    const retryDelays = [2000, 5000, 10000];
    for (let i = 0; i <= retryDelays.length; i++) {
        try {
            const res = await axios.post(
                "https://api.airforce/v1/chat/completions",
                {
                    model: "gpt-4o",
                    messages: [{
                        role: "user",
                        content: [
                            { type: "text", text: prompt || "Describe this image in detail. What do you see?" },
                            { type: "image_url", image_url: { url: imageUrl } }
                        ]
                    }],
                    max_tokens: 1000
                },
                {
                    headers: { "Authorization": "Bearer free", "Content-Type": "application/json" },
                    timeout: 40000
                }
            );
            return res.data?.choices?.[0]?.message?.content || "Unable to analyze image.";
        } catch (e) {
            if (e.response?.status === 429 && i < retryDelays.length) {
                await new Promise(r => setTimeout(r, retryDelays[i]));
                continue;
            }
            throw e;
        }
    }
}

async function generateImage(prompt) {
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 999999)}`;
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
    const fileName = `drian_img_${Date.now()}.jpg`;
    const filePath = path.join(TEMP_DIR, fileName);
    await fs.writeFile(filePath, Buffer.from(res.data));
    return filePath;
}

async function editImage(originalImageUrl, editPrompt) {
    let description = "";
    try {
        description = await analyzeImageWithVision(
            originalImageUrl,
            "Describe this image in full detail: colors, objects, style, background, mood."
        );
    } catch (e) {
        description = "photo";
    }
    const newPrompt = `${editPrompt}. Based on: ${description.slice(0, 300)}`;
    return generateImage(newPrompt);
}

function registerReply(api, info, senderID, threadID, extra = {}) {
    if (!info) return;
    global.client.handleReply.push({
        name: "drian",
        messageID: info.messageID,
        author: senderID,
        threadID,
        ...extra
    });
}

function cleanupFile(filePath) {
    setTimeout(() => { try { fs.removeSync(filePath); } catch (e) {} }, 60000);
}

function makeHeader(title = AI_NAME) {
    return `🤖 ${title} v${VERSION}\n👤 Made by ${CREATOR}\n${"─".repeat(32)}\n`;
}

function makeFooter() {
    return `\n${"─".repeat(32)}\n💬 Reply para mag-follow up`;
}

module.exports.config = {
    name: "drian",
    version: VERSION,
    hasPermssion: 0,
    credits: CREATOR,
    description: "Drian AI — Powerful free AI: chat, image generation, image analysis & editing",
    commandCategory: "AI",
    usages: "[question] | imagine [prompt] | edit [prompt] + reply to image | analyze + attach image | reset",
    cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const prefix = global.config.PREFIX;

    if (!args.length && !(event.attachments?.length)) {
        return api.sendMessage(
            `╔══════════════════════════╗\n` +
            `║   🤖 DRIAN AI v${VERSION}    ║\n` +
            `║   👤 by ${CREATOR}  ║\n` +
            `╚══════════════════════════╝\n\n` +
            `✨ Kaya kong gawin LAHAT — libre, walang limit!\n\n` +
            `📋 MGA COMMANDS:\n` +
            `${"─".repeat(30)}\n` +
            `💬 ${prefix}drian [tanong]\n` +
            `   → Magtanong ng kahit ano!\n\n` +
            `🎨 ${prefix}drian imagine [prompt]\n` +
            `   → Mag-generate ng image\n\n` +
            `🔍 ${prefix}drian analyze [tanong]\n` +
            `   → I-attach ang image para suriin\n\n` +
            `✏️ ${prefix}drian edit [prompt]\n` +
            `   → I-reply sa image para i-edit\n\n` +
            `🔄 ${prefix}drian reset\n` +
            `   → I-clear ang conversation\n\n` +
            `${"─".repeat(30)}\n` +
            `📌 HALIMBAWA:\n` +
            `• ${prefix}drian Ano ang photosynthesis?\n` +
            `• ${prefix}drian imagine beautiful sunset anime art\n` +
            `• ${prefix}drian edit make it rainy and dark\n` +
            `• ${prefix}drian Solve: 3x² + 2x - 5 = 0\n` +
            `• ${prefix}drian Gawa ng essay tungkol sa kalikasan\n\n` +
            `💡 I-attach ang larawan tapos mag-type ng tanong!`,
            threadID, messageID
        );
    }

    const subCmd = args[0]?.toLowerCase();

    if (subCmd === "reset") {
        conversationHistory.delete(threadID);
        return api.sendMessage(
            `🔄 Conversation cleared!\n💬 Puwede na tayong magsimula ulit.\n💬 Type ${prefix}drian [tanong] para magsimula.`,
            threadID, messageID
        );
    }

    if (subCmd === "imagine" || subCmd === "gen" || subCmd === "generate") {
        const prompt = args.slice(1).join(" ").trim();
        if (!prompt) return api.sendMessage(`❌ Lagyan ng prompt!\n💡 Halimbawa: ${prefix}drian imagine cute anime girl studying`, threadID, messageID);

        api.setMessageReaction("🎨", messageID, () => {}, true);
        try {
            const filePath = await generateImage(prompt);
            const stream = fs.createReadStream(filePath);
            api.setMessageReaction("✅", messageID, () => {}, true);
            return api.sendMessage(
                { body: `🎨 ${AI_NAME} — Image Generated!\n👤 by ${CREATOR}\n${"─".repeat(30)}\n📝 Prompt: "${prompt}"\n${"─".repeat(30)}\n✏️ Reply "edit [bagong prompt]" para i-edit`, attachment: stream },
                threadID,
                (err, info) => {
                    cleanupFile(filePath);
                    registerReply(api, info, senderID, threadID, { type: "image", prompt });
                }
            );
        } catch (e) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage(`❌ Hindi ma-generate ang image.\n🔧 Error: ${e.message}`, threadID, messageID);
        }
    }

    const attachments = event.attachments?.filter(a => a.type === "photo" || a.type === "sticker") || [];
    const hasImage = attachments.length > 0;

    if ((subCmd === "analyze" || hasImage) && attachments.length > 0) {
        const imageUrl = attachments[0].url || attachments[0].previewUrl;
        const question = hasImage && subCmd !== "analyze"
            ? args.join(" ").trim() || "Describe this image in detail."
            : args.slice(1).join(" ").trim() || "Describe this image in detail.";

        api.setMessageReaction("🔍", messageID, () => {}, true);
        try {
            const analysis = await analyzeImageWithVision(imageUrl, question);
            api.setMessageReaction("✅", messageID, () => {}, true);
            return api.sendMessage(
                { body: makeHeader("Drian AI Vision") + analysis + makeFooter() },
                threadID,
                (err, info) => registerReply(api, info, senderID, threadID)
            );
        } catch (e) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage(
                `❌ Hindi masuri ang image ngayon.\n💡 Subukan ulit mamaya o ilarawan mo ang image sa text.\n🔧 ${e.message}`,
                threadID, messageID
            );
        }
    }

    const question = args.join(" ").trim();
    api.setMessageReaction("⏳", messageID, () => {}, true);
    try {
        const answer = await chatWithAI(question, threadID);
        api.setMessageReaction("✅", messageID, () => {}, true);
        return api.sendMessage(
            { body: makeHeader() + answer + makeFooter() },
            threadID,
            (err, info) => registerReply(api, info, senderID, threadID)
        );
    } catch (e) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(`❌ May error si Drian AI.\n🔧 ${e.message}`, threadID, messageID);
    }
};

module.exports.handleReply = async function ({ api, event, Reply }) {
    const { threadID, messageID, senderID, body } = event;
    if (!body?.trim()) return;

    const isEditCmd = body.toLowerCase().startsWith("edit ");
    const isImagineCmd = body.toLowerCase().startsWith("imagine ") || body.toLowerCase().startsWith("gen ");
    const replyType = Reply?.type;

    if ((isEditCmd || replyType === "image") && (isEditCmd || Reply?.prompt)) {
        const editPrompt = isEditCmd
            ? body.slice(5).trim()
            : body.trim();

        if (!editPrompt) return api.sendMessage(`❌ Lagyan ng edit prompt!\n💡 Halimbawa: edit make it dark and rainy`, threadID, messageID);

        api.setMessageReaction("✏️", messageID, () => {}, true);

        let filePath;
        try {
            if (replyType === "image" && Reply?.prompt) {
                filePath = await generateImage(`${editPrompt}, ${Reply.prompt}`);
            } else {
                const originalAttachments = event.messageReply?.attachments?.filter(a => a.type === "photo") || [];
                if (originalAttachments.length > 0) {
                    filePath = await editImage(originalAttachments[0].url, editPrompt);
                } else {
                    filePath = await generateImage(editPrompt);
                }
            }
            const stream = fs.createReadStream(filePath);
            api.setMessageReaction("✅", messageID, () => {}, true);
            return api.sendMessage(
                { body: `✏️ ${AI_NAME} — Image Edited!\n👤 by ${CREATOR}\n${"─".repeat(30)}\n📝 Edit: "${editPrompt}"\n${"─".repeat(30)}\n✏️ Reply "edit [prompt]" para mag-edit ulit`, attachment: stream },
                threadID,
                (err, info) => {
                    cleanupFile(filePath);
                    registerReply(api, info, senderID, threadID, { type: "image", prompt: editPrompt });
                }
            );
        } catch (e) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage(`❌ Hindi ma-edit ang image.\n🔧 ${e.message}`, threadID, messageID);
        }
    }

    if (isImagineCmd) {
        const prompt = body.replace(/^(imagine|gen)\s+/i, "").trim();
        api.setMessageReaction("🎨", messageID, () => {}, true);
        try {
            const filePath = await generateImage(prompt);
            const stream = fs.createReadStream(filePath);
            api.setMessageReaction("✅", messageID, () => {}, true);
            return api.sendMessage(
                { body: `🎨 ${AI_NAME} — Image Generated!\n👤 by ${CREATOR}\n${"─".repeat(30)}\n📝 Prompt: "${prompt}"\n${"─".repeat(30)}\n✏️ Reply "edit [prompt]" para i-edit`, attachment: stream },
                threadID,
                (err, info) => {
                    cleanupFile(filePath);
                    registerReply(api, info, senderID, threadID, { type: "image", prompt });
                }
            );
        } catch (e) {
            api.setMessageReaction("❌", messageID, () => {}, true);
            return api.sendMessage(`❌ Hindi ma-generate ang image.\n🔧 ${e.message}`, threadID, messageID);
        }
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);
    try {
        const answer = await chatWithAI(body.trim(), threadID);
        api.setMessageReaction("✅", messageID, () => {}, true);
        return api.sendMessage(
            { body: makeHeader() + answer + makeFooter() },
            threadID,
            (err, info) => registerReply(api, info, senderID, threadID)
        );
    } catch (e) {
        api.setMessageReaction("❌", messageID, () => {}, true);
        return api.sendMessage(`❌ May error si Drian AI.\n🔧 ${e.message}`, threadID, messageID);
    }
};
