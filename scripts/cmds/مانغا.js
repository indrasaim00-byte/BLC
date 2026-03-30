const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const ANILIST = "https://graphql.anilist.co";
const cacheDir = path.join(__dirname, "cache");

const SEARCH_QUERY = `
query ($search: String) {
  Page(perPage: 1) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
      id
      title { romaji english native }
      description(asHtml: false)
      status
      chapters
      volumes
      averageScore
      genres
      siteUrl
      countryOfOrigin
      startDate { year }
      coverImage { large }
    }
  }
}`;

function countryLabel(code) {
  const map = { JP: "🇯🇵 مانغا", KR: "🇰🇷 مانهوا", CN: "🇨🇳 مانهوا صينية" };
  return map[code] || "مانغا";
}

function statusLabel(s) {
  const map = {
    FINISHED: "✅ مكتملة",
    RELEASING: "🟢 مستمرة",
    NOT_YET_RELEASED: "🔜 لم تصدر بعد",
    CANCELLED: "❌ ملغاة",
    HIATUS: "⏸️ متوقفة مؤقتاً"
  };
  return map[s] || s;
}

function cleanDesc(text, limit = 400) {
  if (!text) return "لا يوجد وصف.";
  return text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim().substring(0, limit) + "...";
}

async function downloadImage(url, filePath) {
  try {
    fs.ensureDirSync(cacheDir);
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 12000 });
    fs.writeFileSync(filePath, Buffer.from(res.data));
    return fs.createReadStream(filePath);
  } catch (_) { return null; }
}

module.exports = {
  config: {
    name: "مانغا",
    aliases: ["manga", "مانهوا", "مانجا", "manhua", "manhwa"],
    version: "2.0",
    author: "Saint",
    countDown: 5,
    role: 0,
    shortDescription: "ابحث عن مانغا أو مانهوا",
    longDescription: "البحث عن مانغا أو مانهوا أو مانهوا صينية مع صورة الغلاف والنبذة والفصول",
    category: "anime",
    guide: "{pn} [اسم المانغا]"
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("🔍 اكتب اسم المانغا أو المانهوا بعد الأمر.\nمثال: .مانغا one piece");

    const waiting = await message.reply("╭──────────────╮\n   🔍 جاري البحث...\n╰──────────────╯");

    try {
      const res = await axios.post(ANILIST, {
        query: SEARCH_QUERY,
        variables: { search: query }
      }, { headers: { "Content-Type": "application/json", "Accept": "application/json" }, timeout: 15000 });

      const list = res.data?.data?.Page?.media;
      if (!list?.length) {
        api.unsendMessage(waiting.messageID).catch(() => {});
        return message.reply(`❌ لم أجد نتائج لـ "${query}"\nجرب كتابة الاسم بالإنجليزي للحصول على نتائج أدق.`);
      }

      const m = list[0];
      const title = m.title.english || m.title.romaji;
      const titleAr = m.title.native || "";
      const type = countryLabel(m.countryOfOrigin);
      const status = statusLabel(m.status);
      const chapters = m.chapters ? `${m.chapters} فصل` : "مستمرة";
      const volumes = m.volumes ? `${m.volumes} مجلد` : "-";
      const score = m.averageScore ? `${m.averageScore}/100` : "لا يوجد";
      const year = m.startDate?.year || "غير معروف";
      const genres = m.genres?.slice(0, 5).join(" • ") || "-";
      const desc = cleanDesc(m.description);

      const body =
        `╭━━━━━━━━━━━━━━━━━╮\n` +
        `   📖 ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝗠𝗮𝗻𝗴𝗮\n` +
        `╰━━━━━━━━━━━━━━━━━╯\n\n` +
        `${type}\n` +
        `📌 ${title}\n` +
        (titleAr ? `🔣 ${titleAr}\n` : "") +
        `📅 سنة الإصدار: ${year}\n` +
        `📊 الحالة: ${status}\n` +
        `📚 الفصول: ${chapters}\n` +
        `📘 المجلدات: ${volumes}\n` +
        `⭐ التقييم: ${score}\n` +
        `🎭 التصنيف: ${genres}\n` +
        `🔗 ${m.siteUrl}\n` +
        `\n📝 القصة:\n${desc}\n` +
        `\n✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n` +
        `↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`;

      api.unsendMessage(waiting.messageID).catch(() => {});

      await message.reply(body);

      if (m.coverImage?.large) {
        const imgPath = path.join(cacheDir, `manga_${m.id}.jpg`);
        const stream = await downloadImage(m.coverImage.large, imgPath);
        if (stream) {
          message.reply({ body: "", attachment: [stream] }, () => {
            fs.remove(imgPath).catch(() => {});
          });
        }
      }

    } catch (err) {
      console.error("[مانغا]", err.message);
      api.unsendMessage(waiting.messageID).catch(() => {});
      message.reply("❌ حدث خطأ أثناء البحث، جرب مرة أخرى.");
    }
  }
};
