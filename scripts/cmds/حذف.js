module.exports = {
  config: {
    name: "حذف",
    aliases: ["clearname", "removename"],
    version: "1.0",
    author: "Saint",
    countDown: 5,
    role: 0,
    shortDescription: "حذف كنيات جميع أعضاء المجموعة",
    category: "box chat",
    guide: "{pn} — يحذف كنيات جميع الأعضاء"
  },

  onStart: async function ({ event, api, threadsData, message }) {
    const { threadID } = event;
    const botID = api.getCurrentUserID();
    const adminBot = global.BlackBot.config.adminBot || [];

    const threadInfo = await api.getThreadInfo(threadID);
    const participants = threadInfo.participantIDs;

    const delay = ms => new Promise(r => setTimeout(r, ms));

    let success = 0;
    for (const uid of participants) {
      if (uid === botID || adminBot.includes(uid)) continue;
      try {
        await api.changeNickname("", threadID, uid);
        success++;
        await delay(3000 + Math.floor(Math.random() * 4000));
      } catch (e) {}
    }

    await threadsData.set(threadID, {}, "data.da3Lock");
  }
};
