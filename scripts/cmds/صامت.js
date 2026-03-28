module.exports = {
  config: {
    name: "صامت",
    aliases: ["silent", "mode"],
    version: "1.0",
    author: "Saint",
    countDown: 0,
    role: 2,
    shortDescription: "وضع القفل الصامت للبوت",
    category: "admin",
    guide: "{pn} ريد | جولدن | بلو | off"
  },

  onStart: async function ({ args }) {
    const sub = (args[0] || "").toLowerCase().trim();
    const modes = ["ريد", "جولدن", "بلو", "red", "golden", "blue"];

    if (modes.includes(sub)) {
      global.da3SilentMode = { enable: true, mode: sub };
      return;
    }

    if (sub === "off") {
      global.da3SilentMode = { enable: false };
      return;
    }
  }
};
