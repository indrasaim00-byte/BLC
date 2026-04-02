const axios = require("axios");
const fs = require("fs");
const path = require("path");

const CURRENCY = "شظاية سوداء 🖤";
const CURRENCY_PL = "شظايا سواء 🖤";
const balanceFile = path.join(__dirname, "game.json");
const TIMEOUT_MS = 60000;

/* ─── رصيد ─── */
function getBalance(uid) {
  try {
    const d = JSON.parse(fs.readFileSync(balanceFile));
    return d[uid]?.balance ?? 100;
  } catch { return 100; }
}
function setBalance(uid, bal) {
  try {
    const d = JSON.parse(fs.readFileSync(balanceFile));
    d[uid] = { ...(d[uid] || {}), balance: Math.max(0, bal) };
    fs.writeFileSync(balanceFile, JSON.stringify(d, null, 2));
  } catch {}
}
function addBalance(uid, amt) { setBalance(uid, getBalance(uid) + amt); }

/* ─── جلب شخصية عشوائية من AniList ─── */
const ANILIST = "https://graphql.anilist.co";
const CHAR_QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 1) {
    characters(sort: FAVOURITES_DESC) {
      name { full userPreferred }
      image { large }
      media(sort: POPULARITY_DESC, perPage: 1) {
        nodes { title { romaji english arabic } }
      }
    }
  }
}`;

async function fetchRandomCharacter() {
  const page = Math.floor(Math.random() * 200) + 1;
  const r = await axios.post(ANILIST,
    { query: CHAR_QUERY, variables: { page } },
    { timeout: 12000, headers: { "Content-Type": "application/json" } }
  );
  const char = r.data?.data?.Page?.characters?.[0];
  if (!char) throw new Error("no char");
  const fullName = char.name.full || char.name.userPreferred || "";
  const anime = char.media?.nodes?.[0]?.title;
  const animeName = anime?.arabic || anime?.english || anime?.romaji || "غير معروف";
  const imageUrl = char.image?.large;
  return { fullName, animeName, imageUrl };
}

/* ─── تنزيل الصورة ─── */
async function downloadImage(url) {
  const tmp = path.join(__dirname, "cache", `char_${Date.now()}.jpg`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  const r = await axios.get(url, { responseType: "arraybuffer", timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0" } });
  fs.writeFileSync(tmp, Buffer.from(r.data));
  return tmp;
}

/* ─── مطابقة الاسم ─── */
function normalize(s) {
  return (s || "").toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ").trim();
}
function isMatch(guess, fullName) {
  const g = normalize(guess);
  const parts = normalize(fullName).split(" ");
  if (g === normalize(fullName)) return true;
  if (parts.some(p => p.length > 2 && p === g)) return true;
  if (normalize(fullName).includes(g) && g.length >= 3) return true;
  return false;
}

/* ─── المكافآت ─── */
const REWARDS = {
  easy:   { win: 80,  label: "سهل",    hint: true  },
  medium: { win: 150, label: "متوسط",  hint: true  },
  hard:   { win: 300, label: "صعب",    hint: false },
};

module.exports = {
  config: {
    name: "شخصية",
    aliases: ["تعرف", "anime_guess", "charguess"],
    version: "1.0",
    author: "BlackBot",
    countDown: 10,
    role: 0,
    description: { ar: "تعرّف على شخصية الأنمي واكسب شظايا سواء 🖤" },
    category: "ألعاب",
    guide: { ar: "{pn} [سهل | متوسط | صعب]\nاكتب اسم الشخصية للإجابة\nاكتب هنت للحصول على تلميح (متوسط فقط)\nاكتب تخطي للتخطي" }
  },

  onStart: async ({ api, event, args, message }) => {
    const { threadID, senderID } = event;

    const diffArg = (args[0] || "متوسط").trim();
    const diffMap = { "سهل": "easy", "متوسط": "medium", "صعب": "hard", "easy": "easy", "medium": "medium", "hard": "hard" };
    const diffKey = diffMap[diffArg] || "medium";
    const diff = REWARDS[diffKey];

    let char;
    try {
      char = await fetchRandomCharacter();
    } catch {
      return message.reply("❌ فشل جلب شخصية، حاول مرة أخرى.");
    }

    let imgPath;
    try {
      imgPath = await downloadImage(char.imageUrl);
    } catch { imgPath = null; }

    const hint1Used = { value: false };
    const startTime = Date.now();
    const timeoutLabel = "60 ثانية";

    const msgBody =
      `🎮 تعرّف على الشخصية!\n` +
      `━━━━━━━━━━━━━━━\n` +
      `🏅 المستوى: ${diff.label}\n` +
      `💰 المكافأة: ${diff.win} ${CURRENCY_PL}\n` +
      `⏳ الوقت: ${timeoutLabel}\n` +
      (diff.hint ? `💡 التلميح: اكتب "هنت" للحصول على اسم الأنمي (يخصم 40 من المكافأة)\n` : "") +
      `⏭️ اكتب "تخطي" للتخطي\n` +
      `━━━━━━━━━━━━━━━\n` +
      `❓ من هذه الشخصية؟`;

    const msgObj = imgPath
      ? { body: msgBody, attachment: fs.createReadStream(imgPath) }
      : { body: msgBody };

    const sentMsg = await api.sendMessage(msgObj, threadID);
    if (imgPath) try { fs.unlinkSync(imgPath); } catch {}

    global.BlackBot.onReply.set(sentMsg.messageID, {
      commandName: "شخصية",
      messageID: sentMsg.messageID,
      threadID,
      authorID: senderID,
      char,
      diffKey,
      reward: diff.win,
      hint1Used,
      startTime,
      timeout: setTimeout(() => {
        global.BlackBot.onReply.delete(sentMsg.messageID);
        api.sendMessage(
          `⏰ انتهى الوقت!\n✨ الإجابة كانت: ${char.fullName}\n📺 من أنمي: ${char.animeName}`,
          threadID
        );
      }, TIMEOUT_MS)
    });
  },

  onReply: async ({ api, event, Reply }) => {
    const { threadID, senderID, body } = event;
    const data = Reply;

    // إلغاء المؤقت
    clearTimeout(data.timeout);
    global.BlackBot.onReply.delete(data.messageID);

    const text = (body || "").trim();

    // تخطي
    if (["تخطي", "skip", "مررها"].includes(text.toLowerCase())) {
      return api.sendMessage(
        `⏭️ تم التخطي!\n✨ الإجابة كانت: ${data.char.fullName}\n📺 من أنمي: ${data.char.animeName}`,
        threadID
      );
    }

    // تلميح
    if (["هنت", "hint", "تلميح", "مساعدة"].includes(text.toLowerCase())) {
      const diff = REWARDS[data.diffKey];
      if (!diff.hint) {
        // أعد تسجيل الرد
        data.timeout = setTimeout(() => {
          global.BlackBot.onReply.delete(data.messageID);
          api.sendMessage(`⏰ انتهى الوقت!\n✨ الإجابة كانت: ${data.char.fullName}\n📺 من أنمي: ${data.char.animeName}`, threadID);
        }, Math.max(5000, TIMEOUT_MS - (Date.now() - data.startTime)));
        global.BlackBot.onReply.set(data.messageID, data);
        return api.sendMessage("❌ التلميح غير متاح في المستوى الصعب!", threadID);
      }
      if (data.hint1Used.value) {
        data.timeout = setTimeout(() => {
          global.BlackBot.onReply.delete(data.messageID);
          api.sendMessage(`⏰ انتهى الوقت!\n✨ الإجابة كانت: ${data.char.fullName}\n📺 من أنمي: ${data.char.animeName}`, threadID);
        }, Math.max(5000, TIMEOUT_MS - (Date.now() - data.startTime)));
        global.BlackBot.onReply.set(data.messageID, data);
        return api.sendMessage("⚠️ استخدمت التلميح بالفعل!", threadID);
      }
      data.hint1Used.value = true;
      data.reward = Math.max(10, data.reward - 40);
      data.timeout = setTimeout(() => {
        global.BlackBot.onReply.delete(data.messageID);
        api.sendMessage(`⏰ انتهى الوقت!\n✨ الإجابة كانت: ${data.char.fullName}\n📺 من أنمي: ${data.char.animeName}`, threadID);
      }, Math.max(5000, TIMEOUT_MS - (Date.now() - data.startTime)));
      global.BlackBot.onReply.set(data.messageID, data);
      return api.sendMessage(
        `💡 تلميح: الشخصية من أنمي "${data.char.animeName}"\n💰 المكافأة أصبحت: ${data.reward} ${CURRENCY_PL}`,
        threadID
      );
    }

    // تحقق من الإجابة
    if (isMatch(text, data.char.fullName)) {
      const bal = getBalance(senderID);
      addBalance(senderID, data.reward);
      const newBal = getBalance(senderID);
      return api.sendMessage(
        `🎉 إجابة صحيحة!\n` +
        `✨ الشخصية: ${data.char.fullName}\n` +
        `📺 من أنمي: ${data.char.animeName}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `💰 ربحت: +${data.reward} ${CURRENCY_PL}\n` +
        `🏦 رصيدك الجديد: ${newBal} ${CURRENCY_PL}`,
        threadID
      );
    }

    // إجابة خاطئة — أعد التسجيل
    const remaining = Math.max(3000, TIMEOUT_MS - (Date.now() - data.startTime));
    data.timeout = setTimeout(() => {
      global.BlackBot.onReply.delete(data.messageID);
      api.sendMessage(`⏰ انتهى الوقت!\n✨ الإجابة كانت: ${data.char.fullName}\n📺 من أنمي: ${data.char.animeName}`, threadID);
    }, remaining);
    global.BlackBot.onReply.set(data.messageID, data);
    return api.sendMessage(`❌ إجابة خاطئة! حاول مرة أخرى ⏳ (${Math.round(remaining / 1000)}ث متبقية)`, threadID);
  }
};
