module.exports = {
  config: {
    name: "نيم",
    version: "3.0",
    author: "edit",
    role: 1,
    shortDescription: "تغيير اسم المجموعة",
    category: "group",
    guide: "{pn} [الاسم]",
    countDown: 3
  },

  onStart: async ({ api, event, args }) => {
    const { threadID } = event;
    if (!args[0]) return;
    const newName = args.join(" ").trim();
    try {
      await api.setTitle(newName, threadID);
    } catch (e) {}
  }
};
