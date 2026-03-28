const { config } = global.BlackBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
  config: {
    name: "القائمة-السوداء",
    aliases: ["wl", "blacklist"],
    version: "1.6",
    author: "Saint + Modified by Rifat",
    countDown: 5,
    role: 0,
    shortDescription: {
      vi: "Bật/tắt, thêm, xóa quyền blackListIds",
      en: "Toggle, add, remove blackListIds role"
    },
    longDescription: {
      vi: "Bật/tắt, thêm, xóa quyền blackListIds",
      en: "Toggle, add, remove blackListIds role"
    },
    category: "owner",
    guide: {
      vi: "{pn} on/off: Bật hoặc tắt chế độ blacklist\n{pn} [add|-a] <uid|@tag>: Thêm quyền\n{pn} [remove|-r] <uid|@tag>: Xóa quyền\n{pn} [list|-l]: Xem danh sách",
      en: "{pn} on/off: Toggle blacklist mode\n{pn} [add|-a] <uid|@tag>: Add role\n{pn} [remove|-r] <uid|@tag>: Remove role\n{pn} [list|-l]: List all"
    },
  },

  langs: {
    vi: {
      toggledOn: "✅ | Đã bật chế độ blacklist.",
      toggledOff: "❌ | Đã tắt chế độ blacklist.",
      currentStatus: "🔄 | Trạng thái hiện tại: %1",
      added: "✅ | Đã thêm quyền blackListIds cho %1 người dùng:\n%2",
      alreadyAdmin: "\n⚠ | %1 người dùng đã có quyền:\n%2",
      missingIdAdd: "⚠ | Vui lòng nhập ID hoặc tag người dùng để thêm quyền",
      removed: "✅ | Đã xóa quyền của %1 người dùng:\n%2",
      notAdmin: "⚠ | %1 người dùng không có quyền:\n%2",
      missingIdRemove: "⚠ | Vui lòng nhập ID hoặc tag người dùng để xóa quyền",
      listAdmin: "👑 | Danh sách blackListIds:\n%1",
    },
    en: {
      toggledOn: "✅ | Blacklist mode has been turned ON.",
      toggledOff: "❌ | Blacklist mode has been turned OFF.",
      currentStatus: "🔄 | Current blacklist status: %1",
      added: "✅ | Added role for %1 users:\n%2",
      alreadyAdmin: "\n⚠ | %1 users already have role:\n%2",
      missingIdAdd: "⚠ | Please enter ID or tag to add role",
      removed: "✅ | Removed role of %1 users:\n%2",
      notAdmin: "⚠ | %1 users don't have role:\n%2",
      missingIdRemove: "⚠ | Please enter ID or tag to remove role",
      listAdmin: "👑 | List of blackListIds:\n%1",
    },
  },

  onStart: async function ({ message, args, usersData, event, getLang, api }) {
    const permission = ["100083039411474"];
    if (!permission.includes(event.senderID)) {
      return api.sendMessage("You don't have enough permission to use this command. Only My Authors Have Access.", event.threadID, event.messageID);
    }

    switch (args[0]) {
      case "on": {
        config.blackListMode.status = true;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        return message.reply(getLang("toggledOn"));
      }

      case "off": {
        config.blackListMode.status = false;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        return message.reply(getLang("toggledOff"));
      }

      case "add": case "-a": case "+": {
        if (!args[1]) return message.reply(getLang("missingIdAdd"));
        let uids = Object.keys(event.mentions).length ? Object.keys(event.mentions) : event.messageReply ? [event.messageReply.senderID] : args.filter(arg => !isNaN(arg));
        const notAdminIds = [], authorIds = [];
        for (const uid of uids) (config.blackListMode.blackListIds.includes(uid) ? authorIds : notAdminIds).push(uid);
        config.blackListMode.blackListIds.push(...notAdminIds);
        const getNames = await Promise.all(uids.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        return message.reply(
          (notAdminIds.length ? getLang("added", notAdminIds.length, getNames.map(({ uid, name }) => `• ${name} (${uid})`).join("\n")) : "") +
          (authorIds.length ? getLang("alreadyAdmin", authorIds.length, authorIds.map(uid => `• ${uid}`).join("\n")) : "")
        );
      }

      case "remove": case "-r": case "-": {
        if (!args[1]) return message.reply(getLang("missingIdRemove"));
        let uids = Object.keys(event.mentions).length ? Object.keys(event.mentions) : args.filter(arg => !isNaN(arg));
        const notAdminIds = [], authorIds = [];
        for (const uid of uids) (config.blackListMode.blackListIds.includes(uid) ? authorIds : notAdminIds).push(uid);
        for (const uid of authorIds) config.blackListMode.blackListIds.splice(config.blackListMode.blackListIds.indexOf(uid), 1);
        const getNames = await Promise.all(authorIds.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        return message.reply(
          (authorIds.length ? getLang("removed", authorIds.length, getNames.map(({ uid, name }) => `• ${name} (${uid})`).join("\n")) : "") +
          (notAdminIds.length ? getLang("notAdmin", notAdminIds.length, notAdminIds.map(uid => `• ${uid}`).join("\n")) : "")
        );
      }

      case "list": case "-l": {
        const getNames = await Promise.all(config.blackListMode.blackListIds.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
        return message.reply(getLang("listAdmin", getNames.map(({ uid, name }) => `• ${name} (${uid})`).join("\n")));
      }

      default: {
        const status = config.blackListMode.status ? "ON ✅" : "OFF ❌";
        return message.reply(getLang("currentStatus", status));
      }
    }
  }
};
