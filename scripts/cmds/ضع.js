module.exports = {
  config: {
    name: "ضع",
    aliases: ["da3"],
    version: "2.0",
    author: "Saint",
    countDown: 5,
    role: 0,
    shortDescription: "ضع كنية لكل أعضاء المجموعة مع حماية",
    category: "box chat",
    guide: "{pn} [النص] | {pn} off"
  },

  onStart: async function ({ args, event, api, usersData, threadsData }) {
    const { threadID } = event;
    const text = args.join(" ").trim();
    if (!text) return;

    const botID = api.getCurrentUserID();
    const adminBot = global.BlackBot.config.adminBot || [];

    if (text === "off") {
      await threadsData.set(threadID, {}, "data.da3Lock");
      return;
    }

    const threadInfo = await api.getThreadInfo(threadID);
    const participants = threadInfo.participantIDs;

    const nicknames = {};

    const delay = ms => new Promise(r => setTimeout(r, ms));
    for (const uid of participants) {
      if (uid === botID || adminBot.includes(uid)) continue;
      try {
        let name = text;
        if (/\{userName\}/gi.test(name)) name = name.replace(/\{userName\}/gi, await usersData.getName(uid).catch(() => uid));
        if (/\{userID\}/gi.test(name)) name = name.replace(/\{userID\}/gi, uid);
        await api.changeNickname(name, threadID, uid);
        nicknames[uid] = name;
        await delay(3000 + Math.floor(Math.random() * 4000));
      } catch (e) {}
    }

    await threadsData.set(threadID, { enable: true, nickname: text, nicknames }, "data.da3Lock");
  },

  onEvent: async function ({ api, event, threadsData }) {
    const { threadID, author, logMessageType, logMessageData } = event;
    if (logMessageType !== "log:user-nickname") return;

    const lock = await threadsData.get(threadID, "data.da3Lock");
    if (!lock?.enable) return;

    const botID = api.getCurrentUserID();
    const adminBot = global.BlackBot.config.adminBot || [];

    if (author === botID || adminBot.includes(author)) return;

    const { participant_id } = logMessageData;
    const restoreNickname = lock.nicknames?.[participant_id] ?? lock.nickname ?? "";

    try {
      await api.changeNickname(restoreNickname, threadID, participant_id);
    } catch (e) {}
  }
};
