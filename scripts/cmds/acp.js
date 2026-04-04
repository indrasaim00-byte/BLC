const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "قبول",
    aliases: ['acp', "accept"],
    version: "2.0",
    author: "BlackBot",
    countDown: 8,
    role: 2,
    shortDescription: "قبول طلبات الصداقة",
    longDescription: "عرض وقبول أو رفض طلبات الصداقة الواردة",
    category: "Utility",
  },

  onReply: async function ({ message, Reply, event, api, commandName }) {
    const { author, listRequest, messageID } = Reply;
    if (author !== event.senderID) return;

    const args = event.body.trim().toLowerCase().split(" ");
    clearTimeout(Reply.unsendTimeout);

    if (args[0] !== "add" && args[0] !== "del") {
      return api.sendMessage("❌ | استخدم: add <رقم | all> أو del <رقم | all>", event.threadID, event.messageID);
    }

    const isAccept = args[0] === "add";
    let targetIDs = args[1] === "all"
      ? listRequest.map((_, idx) => idx + 1)
      : args.slice(1);

    const finalSuccess = [];
    const finalFailed = [];

    for (const stt of targetIDs) {
      const index = parseInt(stt) - 1;
      const user = listRequest[index];
      if (!user) {
        finalFailed.push(`لم يُعثر على الرقم ${stt}`);
        continue;
      }

      try {
        const form = {
          av: api.getCurrentUserID(),
          fb_api_caller_class: "RelayModern",
          variables: JSON.stringify({
            input: {
              source: "friends_tab",
              actor_id: api.getCurrentUserID(),
              friend_requester_id: user.id,
              client_mutation_id: Math.random().toString(36).substring(2, 15)
            },
            scale: 3,
            refresh_num: 0
          })
        };

        if (isAccept) {
          form.fb_api_req_friendly_name = "FriendingCometFriendRequestConfirmMutation";
          form.doc_id = "3147613905362928";
        } else {
          form.fb_api_req_friendly_name = "FriendingCometFriendRequestDeleteMutation";
          form.doc_id = "4108254489275063";
        }

        const res = await api.httpPost("https://www.facebook.com/api/graphql/", form);
        const data = JSON.parse(res);

        if (data.errors && data.errors.length > 0) {
          finalFailed.push(user.name);
        } else {
          finalSuccess.push(user.name);
        }
      } catch (e) {
        finalFailed.push(user.name);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    let resultMsg = "";
    if (finalSuccess.length) {
      resultMsg += `✅ ${isAccept ? "تم القبول" : "تم الرفض"}: ${finalSuccess.length}\n${finalSuccess.join("\n")}`;
    }
    if (finalFailed.length) {
      resultMsg += `\n❌ فشل: ${finalFailed.length}\n${finalFailed.join("\n")}`;
    }
    if (!resultMsg) resultMsg = "⚠️ لم يتم معالجة أي مستخدم.";

    api.unsendMessage(messageID);
    return api.sendMessage(resultMsg, event.threadID);
  },

  onStart: async function ({ event, api, commandName }) {
    try {
      let listRequest = [];

      const methods = [
        {
          doc_id: "4499164963466303",
          name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
          variables: JSON.stringify({ input: { scale: 3 } }),
          parse: (data) => {
            const edges = data?.data?.viewer?.friending_possibilities?.edges || [];
            return edges.map(e => ({ id: e.node.id, name: e.node.name, url: e.node.url }));
          }
        },
        {
          doc_id: "2997970243611848",
          name: "FriendingCometFriendRequestsRootQuery",
          variables: JSON.stringify({ input: { scale: 3 } }),
          parse: (data) => {
            const edges = data?.data?.viewer?.friend_requests?.edges
              || data?.data?.viewer?.friending_possibilities?.edges
              || [];
            return edges.map(e => ({ id: e.node?.id, name: e.node?.name, url: e.node?.url }))
              .filter(u => u.id);
          }
        }
      ];

      for (const method of methods) {
        try {
          const form = {
            av: api.getCurrentUserID(),
            fb_api_req_friendly_name: method.name,
            fb_api_caller_class: "RelayModern",
            doc_id: method.doc_id,
            variables: method.variables
          };
          const response = await api.httpPost("https://www.facebook.com/api/graphql/", form);
          let raw = response;
          if (typeof raw === "string" && raw.includes("\n")) {
            raw = raw.split("\n").find(line => {
              try { JSON.parse(line); return true; } catch { return false; }
            }) || raw;
          }
          const data = JSON.parse(raw);
          const found = method.parse(data);
          if (found.length > 0) {
            listRequest = found;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (listRequest.length === 0) {
        return api.sendMessage("✅ | لا توجد طلبات صداقة معلقة.", event.threadID);
      }

      let msg = `📋 | طلبات الصداقة الواردة (${listRequest.length}):\n`;
      listRequest.forEach((user, i) => {
        msg += `\n${i + 1}. 👤 ${user.name}`;
        msg += `\n🆔 ${user.id}`;
        if (user.url) msg += `\n🔗 ${user.url.replace("www.facebook", "fb")}`;
        msg += `\n⏰ ${moment().tz("Asia/Riyadh").format("DD/MM/YYYY HH:mm:ss")}\n`;
      });

      msg += `\n\n💬 رد على هذه الرسالة بـ:\n• add <رقم | all> — لقبول\n• del <رقم | all> — لرفض`;

      api.sendMessage(
        msg,
        event.threadID,
        (e, info) => {
          if (e || !info) return;
          global.BlackBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            listRequest,
            author: event.senderID,
            unsendTimeout: setTimeout(() => {
              api.unsendMessage(info.messageID);
            }, 120000)
          });
        },
        event.messageID
      );
    } catch (error) {
      console.error("[قبول] Error:", error);
      api.sendMessage("❌ | خطأ في جلب طلبات الصداقة: " + (error.message || ""), event.threadID);
    }
  }
};
