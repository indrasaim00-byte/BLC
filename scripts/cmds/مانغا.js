const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const ANILIST = "https://graphql.anilist.co";
const MANGADEX = "https://api.mangadex.org";
const cacheDir = path.join(__dirname, "cache");
const MAX_PER_MSG = 10;
const LANG_PRIORITY = ["ar", "en"];

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

function cleanDesc(text, limit = 500) {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .substring(0, limit);
}

function getGeminiKey() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config.json"), "utf-8"));
    return process.env.GEMINI_API_KEY || cfg.apiKeys?.gemini || null;
  } catch (_) { return process.env.GEMINI_API_KEY || null; }
}

async function translateToArabic(text) {
  const apiKey = getGeminiKey();
  if (!apiKey || !text) return text || "لا يوجد وصف.";
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ role: "user", parts: [{ text: `ترجم النص التالي إلى العربية بشكل طبيعي وسلس، بدون إضافة أي شرح أو تعليق، فقط الترجمة:\n\n${text}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 600 }
      },
      { headers: { "Content-Type": "application/json" }, timeout: 15000 }
    );
    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
  } catch (_) { return text; }
}

async function downloadImage(url, filePath) {
  try {
    fs.ensureDirSync(path.dirname(filePath));
    const res = await axios.get(url.trim(), {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://mangadex.org"
      }
    });
    const ct = res.headers["content-type"] || "";
    if (!ct.includes("image") && !ct.includes("octet")) return null;
    fs.writeFileSync(filePath, Buffer.from(res.data));
    return filePath;
  } catch (_) { return null; }
}

async function sendMsg(message, body) {
  return new Promise(resolve => message.reply(body, (err, info) => resolve(info?.messageID || null)));
}

async function anilistSearch(query) {
  const res = await axios.post(ANILIST,
    { query: SEARCH_QUERY, variables: { search: query } },
    { headers: { "Content-Type": "application/json", "Accept": "application/json" }, timeout: 15000 }
  );
  return res.data?.data?.Page?.media?.[0] || null;
}

async function mdSearch(title) {
  try {
    const res = await axios.get(`${MANGADEX}/manga`, {
      params: { title, limit: 5, "order[relevance]": "desc" },
      timeout: 12000
    });
    const results = res.data?.data || [];
    const tLow = title.toLowerCase();
    const exact = results.find(m => {
      const attrs = m.attributes;
      const allTitles = [
        ...Object.values(attrs.title || {}),
        ...(attrs.altTitles || []).flatMap(obj => Object.values(obj))
      ].map(s => s?.toLowerCase?.());
      return allTitles.some(at => at && (at === tLow || at.includes(tLow) || tLow.includes(at)));
    });
    return (exact || results[0]) || null;
  } catch (_) { return null; }
}

async function mdGetChapters(mdId, chapterNum) {
  for (const lang of LANG_PRIORITY) {
    try {
      const res = await axios.get(`${MANGADEX}/chapter`, {
        params: {
          manga: mdId,
          chapter: String(chapterNum),
          "translatedLanguage[]": lang,
          "order[chapter]": "asc",
          limit: 10
        },
        timeout: 12000
      });
      const chapters = (res.data?.data || []).filter(c => {
        const ch = c.attributes?.chapter;
        return ch && Math.abs(parseFloat(ch) - parseFloat(chapterNum)) < 0.01;
      });
      if (chapters.length) return { chapter: chapters[0], lang };
    } catch (_) {}
  }
  return null;
}

async function mdGetPages(chapterId) {
  try {
    const res = await axios.get(`${MANGADEX}/at-home/server/${chapterId}`, { timeout: 12000 });
    const base = res.data?.baseUrl;
    const hash = res.data?.chapter?.hash;
    const files = res.data?.chapter?.dataSaver || res.data?.chapter?.data || [];
    if (!base || !hash || !files.length) return [];
    const folder = res.data?.chapter?.dataSaver ? "data-saver" : "data";
    return files.map(f => `${base}/${folder}/${hash}/${f}`);
  } catch (_) { return []; }
}

async function mdGetAvailableChapters(mdId) {
  const langCounts = {};
  for (const lang of LANG_PRIORITY) {
    try {
      const res = await axios.get(`${MANGADEX}/manga/${mdId}/aggregate`, {
        params: { "translatedLanguage[]": lang },
        timeout: 10000
      });
      const volumes = res.data?.volumes || {};
      const nums = [];
      for (const vol of Object.values(volumes)) {
        for (const ch of Object.values(vol.chapters || {})) {
          if (ch.chapter && ch.chapter !== "none") nums.push(parseFloat(ch.chapter));
        }
      }
      if (nums.length) {
        langCounts[lang] = nums.sort((a, b) => a - b);
        break;
      }
    } catch (_) {}
  }
  return langCounts;
}

module.exports = {
  config: {
    name: "مانغا",
    aliases: ["manga", "مانهوا", "مانجا", "manhua", "manhwa"],
    version: "6.0",
    author: "Saint",
    countDown: 5,
    role: 0,
    shortDescription: "ابحث عن مانغا أو اقرأ فصولها",
    longDescription: "البحث عن مانغا مع صورة الغلاف والنبذة، وقراءة الفصول كصور",
    category: "anime",
    guide: "{pn} [اسم المانغا]\n{pn} [اسم المانغا] فصل [رقم]"
  },

  onStart: async function ({ api, event, args, message }) {
    const input = args.join(" ").trim();
    if (!input) return message.reply(
      "🔍 اكتب اسم المانغا بعد الأمر.\n" +
      "مثال: .مانغا one piece\n" +
      "لقراءة فصل: .مانغا one piece فصل 1"
    );

    const chMatch =
      input.match(/^(.+?)\s+(?:ال)?فصل\s+(\d+(?:\.\d+)?)$/i) ||
      input.match(/^(.+?)\s+ch(?:apter)?\s*(\d+(?:\.\d+)?)$/i);

    const isChapter = !!chMatch;
    const query = chMatch ? chMatch[1].trim() : input;
    const chapterNum = chMatch ? chMatch[2] : null;

    const waitID = await sendMsg(message,
      "◈ ↞جاري البحث..〔 ! 〕\n◈ 𝗕⃪𝗹𝗮𝗰⃪𝗸 : 𝗠⃪𝗮⃪𝗵⃪𝗼𝗿𝗮⃪\n━━━━━━━━━━━━━"
    );
    const unsend = () => { if (waitID) setTimeout(() => api.unsendMessage(waitID).catch(() => {}), 2000); };

    try {
      if (isChapter) {
        await handleChapter(message, api, query, chapterNum, unsend);
      } else {
        await handleInfo(message, api, query, unsend);
      }
    } catch (err) {
      console.error("[مانغا]", err.message);
      unsend();
      message.reply("❌ حدث خطأ أثناء البحث، جرب مرة أخرى.");
    }
  }
};

async function handleInfo(message, api, query, unsend) {
  const m = await anilistSearch(query).catch(() => null);
  if (!m) {
    unsend();
    return message.reply(`❌ لم أجد نتائج لـ "${query}"\nجرب كتابة الاسم بالإنجليزي.`);
  }

  const title = m.title.english || m.title.romaji;
  const titleAr = m.title.native || "";
  const type = countryLabel(m.countryOfOrigin);
  const status = statusLabel(m.status);
  const chapters = m.chapters ? `${m.chapters} فصل` : "مستمرة";
  const volumes = m.volumes ? `${m.volumes} مجلد` : "-";
  const score = m.averageScore ? `${m.averageScore}/100` : "لا يوجد";
  const year = m.startDate?.year || "غير معروف";
  const genres = m.genres?.slice(0, 5).join(" • ") || "-";
  const rawDesc = cleanDesc(m.description);

  const mdManga = await mdSearch(title || query).catch(() => null);
  let chaptersText = "";

  if (mdManga) {
    const mdId = mdManga.id;
    const langCounts = await mdGetAvailableChapters(mdId).catch(() => ({}));
    const arChapters = langCounts["ar"] || [];
    const enChapters = langCounts["en"] || [];

    if (arChapters.length) {
      chaptersText = `\n\n📚 فصول عربية متاحة (${arChapters.length}):\n`;
      const preview = arChapters.slice(0, 30).map(n => `${n}`).join(" • ");
      chaptersText += preview;
      if (arChapters.length > 30) chaptersText += ` ... حتى فصل ${arChapters[arChapters.length - 1]}`;
      chaptersText += `\n\n💡 لقراءة فصل:\n.مانغا ${query} فصل [رقم]`;
    } else if (enChapters.length) {
      chaptersText = `\n\n📚 فصول إنجليزية متاحة (${enChapters.length}):\n`;
      const preview = enChapters.slice(0, 30).map(n => `${n}`).join(" • ");
      chaptersText += preview;
      if (enChapters.length > 30) chaptersText += ` ... حتى فصل ${enChapters[enChapters.length - 1]}`;
      chaptersText += `\n\n💡 لقراءة فصل:\n.مانغا ${query} فصل [رقم]`;
    } else {
      chaptersText = `\n\n⚠️ لا توجد فصول متاحة حالياً.`;
    }
  } else {
    chaptersText = `\n\n⚠️ لا توجد فصول متاحة حالياً.`;
  }

  const [descAr, coverPath] = await Promise.all([
    translateToArabic(rawDesc),
    m.coverImage?.large
      ? downloadImage(m.coverImage.large, path.join(cacheDir, `manga_${m.id}.jpg`))
      : Promise.resolve(null)
  ]);

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
    `\n📝 القصة:\n${descAr}\n` +
    chaptersText +
    `\n\n✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n` +
    `↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`;

  unsend();
  await sendMsg(message, body);

  if (coverPath) {
    message.reply({ body: "", attachment: [fs.createReadStream(coverPath)] }, () => {
      fs.remove(coverPath).catch(() => {});
    });
  }
}

async function handleChapter(message, api, query, chapterNum, unsend) {
  const searchNames = [query];
  const aniManga = await anilistSearch(query).catch(() => null);
  if (aniManga) {
    if (aniManga.title.english) searchNames.unshift(aniManga.title.english);
    if (aniManga.title.romaji && aniManga.title.romaji !== aniManga.title.english)
      searchNames.push(aniManga.title.romaji);
  }

  let mdManga = null;
  let mangaTitle = aniManga?.title?.english || aniManga?.title?.romaji || query;

  for (const name of searchNames) {
    mdManga = await mdSearch(name).catch(() => null);
    if (mdManga) { mangaTitle = mdManga.attributes?.title?.en || Object.values(mdManga.attributes?.title || {})[0] || mangaTitle; break; }
  }

  if (!mdManga) {
    unsend();
    return message.reply(`❌ لم أجد "${query}" في قاعدة البيانات.\nجرب كتابة الاسم بالإنجليزي.`);
  }

  const result = await mdGetChapters(mdManga.id, chapterNum);
  if (!result) {
    unsend();
    return message.reply(
      `❌ الفصل ${chapterNum} غير متاح لـ "${mangaTitle}".\n` +
      `اكتب: .مانغا ${query}\nلرؤية الفصول المتاحة.`
    );
  }

  const pages = await mdGetPages(result.chapter.id);
  if (!pages.length) {
    unsend();
    return message.reply(`❌ فشل تحميل صفحات الفصل ${chapterNum}، جرب مرة أخرى.`);
  }

  const langMap = {
    ar: "🇸🇦 عربي", en: "🇬🇧 إنجليزي", ja: "🇯🇵 ياباني",
    ko: "🇰🇷 كوري", zh: "🇨🇳 صيني", fr: "🇫🇷 فرنسي",
    es: "🇪🇸 إسباني", it: "🇮🇹 إيطالي", pt: "🇧🇷 برتغالي",
    de: "🇩🇪 ألماني", ru: "🇷🇺 روسي", tr: "🇹🇷 تركي"
  };
  const langLabel = langMap[result.lang] || result.lang;
  const chTitle = result.chapter.attributes?.title || "";

  unsend();

  await sendMsg(message,
    `╭━━━━━━━━━━━━━━━━━╮\n` +
    `   📖 ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝗠𝗮𝗻𝗴𝗮\n` +
    `╰━━━━━━━━━━━━━━━━━╯\n\n` +
    `📌 ${mangaTitle}\n` +
    `📄 الفصل ${chapterNum}${chTitle ? " — " + chTitle : ""}\n` +
    `🌐 اللغة: ${langLabel}\n` +
    `📑 عدد الصفحات: ${pages.length}\n` +
    `\n⏬ جاري إرسال الصفحات...`
  );

  const tmpDir = path.join(cacheDir, `ch_${Date.now()}`);
  fs.ensureDirSync(tmpDir);

  const downloaded = [];
  for (let i = 0; i < pages.length; i += 5) {
    const batch = pages.slice(i, i + 5);
    const results = await Promise.all(
      batch.map((url, j) => {
        const ext = url.includes(".webp") ? "webp" : "jpg";
        const fp = path.join(tmpDir, `page_${String(i + j + 1).padStart(3, "0")}.${ext}`);
        return downloadImage(url, fp);
      })
    );
    downloaded.push(...results);
  }

  const valid = downloaded.filter(Boolean);
  if (!valid.length) {
    fs.remove(tmpDir).catch(() => {});
    return message.reply("❌ فشل تحميل الصفحات، جرب مرة أخرى.");
  }

  for (let i = 0; i < valid.length; i += MAX_PER_MSG) {
    const chunk = valid.slice(i, i + MAX_PER_MSG);
    const streams = chunk.map(p => fs.createReadStream(p));
    const range = `${i + 1}-${Math.min(i + MAX_PER_MSG, valid.length)}`;
    const isLast = i + MAX_PER_MSG >= valid.length;

    await new Promise(resolve => {
      message.reply({
        body: isLast
          ? `📄 الصفحات ${range} من ${valid.length}\n✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`
          : `📄 الصفحات ${range} من ${valid.length}`,
        attachment: streams
      }, () => resolve());
    });

    if (!isLast) await new Promise(r => setTimeout(r, 1500));
  }

  fs.remove(tmpDir).catch(() => {});
}
