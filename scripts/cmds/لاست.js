const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const gifList = [
  "https://h.top4top.io/p_3677567ew0.gif",
  "https://i.top4top.io/p_3677xwclv0.gif",
  "https://c.top4top.io/p_3677nzt8x0.gif",
  "https://k.top4top.io/p_3677k5cja0.gif",
  "https://a.top4top.io/p_367702l2h0.gif",
  "https://d.top4top.io/p_35040rp6o1.gif",
  "https://c.top4top.io/p_3504s5fvl0.gif",
  "https://e.top4top.io/p_3504gtkev2.gif",
  "https://f.top4top.io/p_3504l88323.gif",
  "https://l.top4top.io/p_3504m44g20.gif",
  "https://c.top4top.io/p_350483grh3.gif",
  "https://b.top4top.io/p_35048r1i12.gif",
  "https://j.top4top.io/p_3504vu3gk0.gif"
];

const lastGifMap = new Map();

function getNextGif(userID) {
  const used = lastGifMap.get(userID) || new Set();
  const availableIndices = gifList.map((_, i) => i).filter(i => !used.has(i));
  const pool = availableIndices.length > 0 ? availableIndices : gifList.map((_, i) => i);
  const randIdx = pool[Math.floor(Math.random() * pool.length)];
  const newUsed = availableIndices.length > 0 ? new Set(used).add(randIdx) : new Set([randIdx]);
  lastGifMap.set(userID, newUsed);
  return gifList[randIdx];
}

async function getGifStream(url) {
  const cacheDir = path.join(__dirname, "cache");
  fs.ensureDirSync(cacheDir);
  const fileName = "last_gif_" + url.split("/").pop();
  const gifPath = path.join(cacheDir, fileName);
  if (fs.existsSync(gifPath) && fs.statSync(gifPath).size > 0) {
    return fs.createReadStream(gifPath);
  }
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
    fs.writeFileSync(gifPath, Buffer.from(res.data));
    return fs.createReadStream(gifPath);
  } catch (e) {
    return null;
  }
}

const signatureText = "◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈";

async function sendSignatureAndLeave(api, targetThreadID, senderID) {
  const gifUrl = getNextGif(senderID);
  const gifStream = await getGifStream(gifUrl);
  try {
    if (gifStream) {
      await api.sendMessage({ body: signatureText, attachment: gifStream }, targetThreadID);
    } else {
      await api.sendMessage(signatureText, targetThreadID);
    }
  } catch (e) {}
  await new Promise(r => setTimeout(r, 1500));
  try {
    await api.removeUserFromGroup(api.getCurrentUserID(), targetThreadID);
  } catch (e) {}
}

async function sendSignatureAndAccept(api, targetThreadID, senderID) {
  const gifUrl = getNextGif(senderID);
  const gifStream = await getGifStream(gifUrl);
  try {
    if (gifStream) {
      await api.sendMessage({ body: signatureText, attachment: gifStream }, targetThreadID);
    } else {
      await api.sendMessage(signatureText, targetThreadID);
    }
  } catch (e) {}
}

module.exports = {
  config: {
    name: "لاست",
    aliases: ["last", "allbox"],
    version: "3.0",
    author: "Saint",
    role: 2,
    shortDescription: "قائمة المجموعات والتحكم عن بعد",
    category: "owner",
    guide: "{pn}",
    countDown: 10
  },

  onStart: async function ({ api, event, commandName }) {
    const { threadID, messageID, senderID } = event;

    let activeGroups = [], pendingGroups = [], otherGroups = [];

    try {
      const inbox = await api.getThreadList(100, null, ["INBOX"]);
      activeGroups = (inbox || []).filter(t => t.isGroup).map(g => ({ ...g, type: "active" }));
    } catch (e) {}

    try {
      const pending = await api.getThreadList(100, null, ["PENDING"]);
      pendingGroups = (pending || []).filter(t => t.isGroup).map(g => ({ ...g, type: "pending" }));
    } catch (e) {}

    try {
      const other = await api.getThreadList(100, null, ["OTHER"]);
      otherGroups = (other || []).filter(t => t.isGroup).map(g => ({ ...g, type: "other" }));
    } catch (e) {}

    activeGroups.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));

    // قائمة موحدة مرقمة
    const allGroups = [...activeGroups, ...pendingGroups, ...otherGroups];

    const typeLabel = { active: "نشطة", pending: "معلقة", other: "أخرى" };

    let msg = "";
    msg += `◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈\n`;
    msg += `   〖 ✦ قائمة المجموعات ✦ 〗\n`;
    msg += `━━━━━━━━━━\n`;

    if (allGroups.length === 0) {
      msg += `   ◆ لا توجد مجموعات\n`;
    } else {
      allGroups.forEach((g, i) => {
        msg += `\n 「${i + 1}」↞〔${g.name || "بدون اسم"}〕 [${typeLabel[g.type]}]`;
      });
    }

    msg += `\n\n━━━━━━━━━━\n`;
    msg += `   〖 الخيارات 〗\n`;
    msg += `━━━━━━━━━━\n`;
    msg += ` ◈ [رقم] خروج  ↞ مغادرة المجموعة\n`;
    msg += ` ◈ [رقم] قبول  ↞ قبول طلب الانضمام\n`;
    msg += ` ◈ [رقم] اوامر ↞ قائمة الأوامر\n`;
    msg += ` ◈ [رقم] [أمر] ↞ تنفيذ أمر عن بعد`;

    api.sendMessage(msg, threadID, (err, info) => {
      if (!info) return;
      global.BlackBot.onReply.set(info.messageID, {
        commandName,
        messageID: info.messageID,
        author: senderID,
        allGroups,
        delete: () => global.BlackBot.onReply.delete(info.messageID)
      });
    }, messageID);
  },

  onReply: async function ({ api, event, Reply }) {
    if (event.senderID !== Reply.author) return;

    const { allGroups } = Reply;
    const body = (event.body || "").trim();
    const senderID = event.senderID;

    Reply.delete();

    const match = body.match(/^(\d+)\s+(.+)$/);
    if (!match) {
      return api.sendMessage("〔!〕 صيغة غير معروفة. مثال: 1 خروج | 1 قبول | 1 اوامر | 1 ping", event.threadID);
    }

    const idx = parseInt(match[1]) - 1;
    const action = match[2].trim();

    if (idx < 0 || idx >= allGroups.length) {
      return api.sendMessage("〔✗〕 رقم غير صالح.", event.threadID);
    }

    const target = allGroups[idx];

    // ── خروج ──
    if (action === "خروج") {
      if (target.type !== "active") {
        return api.sendMessage("〔✗〕 لا يمكن المغادرة إلا من المجموعات النشطة.", event.threadID);
      }
      await sendSignatureAndLeave(api, target.threadID, senderID);
      return;
    }

    // ── قبول ──
    if (action === "قبول") {
      if (target.type === "active") {
        return api.sendMessage("〔✗〕 البوت موجود بالفعل في هذه المجموعة.", event.threadID);
      }
      await sendSignatureAndAccept(api, target.threadID, senderID);
      return;
    }

    // ── اوامر ──
    if (action === "اوامر" || action === "أوامر") {
      const prefix = global.BlackBot.config.prefix || "/";
      const cmds = [...global.BlackBot.commands.values()];
      let cmdMsg = `   〖 ✦ قائمة الأوامر ✦ 〗\n━━━━━━━━━━\n`;
      cmdMsg += `المجموعة: ${target.name || "بدون اسم"}\n━━━━━━━━━━\n`;
      cmds.forEach((c, i) => {
        cmdMsg += `${i + 1}. ${prefix}${c.config.name}`;
        if (c.config.shortDescription) cmdMsg += ` - ${c.config.shortDescription}`;
        cmdMsg += `\n`;
      });
      return api.sendMessage(cmdMsg, event.threadID);
    }

    // ── تنفيذ أمر عن بعد ──
    const prefix = global.BlackBot.config.prefix || "/";
    const cmdInput = action.startsWith(prefix) ? action.slice(prefix.length) : action;
    const parts = cmdInput.trim().split(" ");
    const cmdName = parts[0].toLowerCase();
    const cmdArgs = parts.slice(1);

    const cmd = global.BlackBot.commands.get(cmdName)
      || [...global.BlackBot.commands.values()].find(c => c.config.aliases?.includes(cmdName));

    if (!cmd) return api.sendMessage(`〔✗〕 الأمر "${cmdName}" غير موجود.`, event.threadID);

    const fakeEvent = {
      threadID: target.threadID,
      senderID: event.senderID,
      messageID: "remote_" + Date.now(),
      body: prefix + action,
      type: "message",
      attachments: [],
      mentions: {},
      isGroup: true
    };

    try {
      await cmd.onStart({
        api,
        event: fakeEvent,
        args: cmdArgs,
        message: {
          reply: (msg) => api.sendMessage(typeof msg === "object" ? msg : { body: msg }, target.threadID),
          send: (msg) => api.sendMessage(typeof msg === "object" ? msg : { body: msg }, target.threadID),
          unsend: () => {}
        },
        prefix,
        commandName: cmdName,
        threadsData: global.db.threadsData,
        usersData: global.db.usersData,
        getText: global.utils.getText,
        getLang: () => ""
      });
    } catch (e) {
      api.sendMessage(`〔✗〕 خطأ أثناء تنفيذ الأمر: ${e.message}`, event.threadID);
    }
  }
};
