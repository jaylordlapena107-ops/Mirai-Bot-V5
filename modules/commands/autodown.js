const axios = require('axios');
const bold = require('../../utils/bold');
const BASE_URL = 'http://dongdev.click/api/down/media';

module.exports.config = {
    name: "autodown",
    version: "1.0.0",
    hasPermssion: 2,
    credits: "DongDev",
    description: "Auto-download from Facebook, TikTok, YouTube, Instagram, etc.",
    commandCategory: "Utilities",
    usages: "[]",
    cooldowns: 5,
    prefix: true
};

module.exports.handleEvent = async ({ api, event }) => {
    if (event.senderID == api.getCurrentUserID()) return;
    if (!event.body) return;

    const args = event.body.split(/\s+/);
    const stream = (url, ext = 'jpg') => axios.get(url, { responseType: 'stream' })
        .then(res => (res.data.path = `tmp.${ext}`, res.data)).catch(() => null);
    const send = (msg) => api.sendMessage(msg, event.threadID, event.messageID);
    const head = app => `╔══════════════════╗\n║  ⬇️ ${bold('AUTODOWN')} - ${bold(app)} ║\n╚══════════════════╝`;

    for (const url of args) {
        if (/(^https:\/\/)(\w+\.|m\.)?(facebook|fb)\.(com|watch)\//.test(url)) {
            try {
                const res = (await axios.get(`${BASE_URL}?url=${encodeURIComponent(url)}`)).data;
                if (res.attachments && res.attachments.length > 0) {
                    let attachment = [];
                    if (res.queryStorieID) {
                        const match = res.attachments.find(item => item.id == res.queryStorieID);
                        if (match?.type === 'Video') attachment.push(await stream(match.url.hd || match.url.sd, 'mp4'));
                        else if (match?.type === 'Photo') attachment.push(await stream(match.url, 'jpg'));
                    } else {
                        for (const at of res.attachments) {
                            if (at.type === 'Video') attachment.push(await stream(at.url.hd || at.url.sd, 'mp4'));
                            else if (at.type === 'Photo') attachment.push(await stream(at.url, 'jpg'));
                        }
                    }
                    send({
                        body: `${head('FACEBOOK')}\n\n` +
                            `📝 ${bold('Title:')} ${res.message || "No title"}\n` +
                            (res.like ? `❤️ ${bold('Likes:')} ${res.like}\n` : '') +
                            (res.comment ? `💬 ${bold('Comments:')} ${res.comment}\n` : '') +
                            (res.share ? `🔁 ${bold('Shares:')} ${res.share}\n` : '') +
                            `👤 ${bold('Author:')} ${res.author || "unknown"}`,
                        attachment
                    });
                }
            } catch (e) { console.log(e); }
        } else if (/^(https:\/\/)(www\.|vt\.|vm\.|m\.|web\.|v\.|mobile\.)?(tiktok\.com|t\.co|twitter\.com|youtube\.com|instagram\.com|bilibili\.com|douyin\.com|capcut\.com|threads\.net)\//.test(url)) {
            const platform = /tiktok\.com/.test(url) ? 'TIKTOK' : /twitter\.com/.test(url) ? 'TWITTER' : /youtube\.com/.test(url) ? 'YOUTUBE' : /instagram\.com/.test(url) ? 'INSTAGRAM' : /bilibili\.com/.test(url) ? 'BILIBILI' : /douyin\.com/.test(url) ? 'DOUYIN' : /threads\.net/.test(url) ? 'THREADS' : /capcut\.com/.test(url) ? 'CAPCUT' : 'MEDIA';
            try {
                const res = (await axios.get(`${BASE_URL}?url=${encodeURIComponent(url)}`)).data;
                let attachments = [];
                if (res.attachments?.length > 0) {
                    for (const at of res.attachments) {
                        if (at.type === 'Video') attachments.push(await stream(at.url, 'mp4'));
                        else if (at.type === 'Photo') attachments.push(await stream(at.url, 'jpg'));
                        else if (at.type === 'Audio') attachments.push(await stream(at.url, 'mp3'));
                    }
                    send({ body: `${head(platform)}\n\n📝 ${bold('Title:')} ${res.message || "No title"}`, attachment: attachments });
                }
            } catch (e) { console.log(e); }
        }
    }
};

module.exports.run = async () => {};
