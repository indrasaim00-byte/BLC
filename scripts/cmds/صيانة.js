const pendingMap = new Map();

const DEVELOPER_ID = "61583835186508";

module.exports = {
  config: {
    name: "صيانة",
    aliases: ["maintenance", "report"],
    version: "1.0",
    author: "edit",
    role: 0,
    shortDescription: "إرسال مشكلة أو طلب للمطوّر مباشرة",
    category: "utility",
    guide: "{pn} [المشكلة أو الطلب]",
    countDown: 10
  },

  onStart: async ({ api, event, args, usersData }) => {
    const { threadID, senderID, messageID } = event;

    if (!args[0]) {
      return api.sendMessage("⚙️ اكتب مشكلتك أو طلبك بعد الأمر.\nمثال: .صيانة الأمر X لا يعمل", threadID, messageID);
    }

    const text = args.join(" ").trim();

    let senderName = "مستخدم مجهول";
    try {
      senderName = await usersData.getName(senderID);
    } catch (_) {}

    let threadName = threadID;
    try {
      const info = await api.getThreadInfo(threadID);
      threadName = info.threadName || threadID;
    } catch (_) {}

    const forwardMsg =
      `┌──『 🔧 صيانة / طلب 』\n` +
      `│ 👤 من: ${senderName}\n` +
      `│ 🆔 ID: ${senderID}\n` +
      `│ 💬 الجروب: ${threadName}\n` +
      `│ 🗂️ Thread: ${threadID}\n` +
      `└──────────────────\n\n` +
      `📝 ${text}\n\n` +
      `↩️ رد على هذه الرسالة لإرسال ردك للجروب مباشرة.`;

    api.sendMessage(forwardMsg, DEVELOPER_ID, (err, info) => {
      if (err || !info) return;

      pendingMap.set(info.messageID, {
        originalThreadID: threadID,
        originalSenderID: senderID,
        originalMessageID: messageID,
        senderName
      });

      global.BlackBot.onReply.set(info.messageID, {
        commandName: "صيانة",
        messageID: info.messageID,
        author: DEVELOPER_ID,
        delete: () => global.BlackBot.onReply.delete(info.messageID)
      });

      api.sendMessage("✅ تم إرسال مشكلتك للمطوّر، انتظر الرد.", threadID, messageID);
    });
  },

  onReply: async ({ api, event, Reply }) => {
    const { senderID, body, threadID } = event;

    if (senderID !== DEVELOPER_ID) return;

    const data = pendingMap.get(Reply.messageID);
    if (!data) return;

    const replyText = (body || "").trim();
    if (!replyText) return;

    const outMsg =
      `🔧 رد المطوّر:\n\n${replyText}`;

    api.sendMessage(outMsg, data.originalThreadID, data.originalMessageID);

    Reply.delete();
    pendingMap.delete(Reply.messageID);
  }
};
