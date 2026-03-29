module.exports = {
  config: {
    name: "autoAcceptInbox",
    version: "2.0",
    author: "BlackBot",
    description: "Auto accept pending private message requests every minute",
    category: "events"
  },

  onStart: async ({ api, event }) => {
    if (global.BlackBot.config.antiInbox === true) return;

    const { threadID, senderID, isGroup } = event;

    if (isGroup === false || threadID == senderID) {
      try {
        await api.handleMessageRequest(threadID, true);
      } catch (e) {}
    }

    if (!global._autoAcceptInboxStarted) {
      global._autoAcceptInboxStarted = true;

      const acceptPending = async () => {
        try {
          const pending = await api.getThreadList(30, null, ["PENDING"]);
          if (pending && pending.length > 0) {
            for (const thread of pending) {
              if (!thread.isGroup) {
                try {
                  await api.handleMessageRequest(thread.threadID, true);
                  global.utils.log.info("INBOX", `✅ قبلت رسالة خاص من: ${thread.threadID}`);
                } catch (e) {}
                await new Promise(r => setTimeout(r, 500));
              }
            }
          }

          const other = await api.getThreadList(30, null, ["OTHER"]);
          if (other && other.length > 0) {
            for (const thread of other) {
              if (!thread.isGroup) {
                try {
                  await api.handleMessageRequest(thread.threadID, true);
                  global.utils.log.info("INBOX", `✅ قبلت رسالة خاص من: ${thread.threadID}`);
                } catch (e) {}
                await new Promise(r => setTimeout(r, 500));
              }
            }
          }
        } catch (e) {}
      };

      await acceptPending();
      setInterval(acceptPending, 60000);
    }
  }
};
