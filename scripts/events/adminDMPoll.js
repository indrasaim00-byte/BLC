module.exports = {
  config: {
    name: "adminDMPoll",
    version: "1.2",
    author: "BlackBot",
    description: "Poll admin DMs every 15s — MQTT doesn't deliver DMs reliably",
    category: "events"
  },

  onStart: async ({ api }) => {
    if (global._adminDMPollStarted) return;
    global._adminDMPollStarted = true;

    const adminIDs = (global.BlackBot.config.adminBot || []).map(String);
    if (!adminIDs.length) return;

    const lastSeen = {};
    const aiName = "بلاك";
    const botID = String(global.BlackBot.botID || global.botID || "");

    const pollDMs = async () => {
      const currentBotID = botID || String(global.BlackBot.botID || global.botID || "");

      for (const adminID of adminIDs) {
        try {
          const history = await api.getThreadHistory(adminID, 5, null);
          if (!history || !history.length) continue;

          const latest = history
            .filter(m => m.body && m.body.trim() && String(m.senderID) !== currentBotID)
            .pop();

          if (!latest) continue;

          const msgID = latest.messageID;
          if (lastSeen[adminID] === msgID) continue;

          const isFirst = !lastSeen[adminID];
          lastSeen[adminID] = msgID;
          if (isFirst) continue;

          const body = latest.body.trim();

          const fakeEvent = {
            type: "message",
            threadID: adminID,
            senderID: adminID,
            messageID: msgID,
            body,
            isGroup: false,
            attachments: [],
            mentions: {},
            timestamp: latest.timestamp || Date.now()
          };

          const aiCommand = global.BlackBot.commands.get(aiName) ||
            global.BlackBot.commands.get(global.BlackBot.aliases.get(aiName));
          if (!aiCommand) continue;

          global.utils.log.info("DM POLL", `📨 أدمن ${adminID}: ${body.slice(0, 50)}`);

          try {
            await aiCommand.onStart({
              api,
              event: fakeEvent,
              args: body.split(/ +/),
              commandName: aiName
            });
          } catch (err) {
            global.utils.log.err("DM POLL", "خطأ في توجيه الرسالة للـ AI", err);
          }
        } catch (_e) {}
      }
    };

    setInterval(pollDMs, 15000);
    global.utils.log.info("DM POLL", `🔄 فحص رسائل الخاص كل 15 ثانية | ${adminIDs.length} أدمن`);
  }
};
