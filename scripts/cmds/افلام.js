const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const cacheDir = path.join(__dirname, "cache");

function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config.json"), "utf-8"));
    return cfg.apiKeys?.gemini || cfg.apiKeys?.groq || null;
  } catch (_) { return null; }
}

async function callGemini(apiKey, prompt, temperature = 0.3) {
  for (let i = 0; i <= 2; i++) {
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: 600, thinkingConfig: { thinkingBudget: 0 } } },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      return res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (err) {
      if (err.response?.status === 429 && i < 2) {
        await new Promise(r => setTimeout(r, 18000));
        continue;
      }
      throw err;
    }
  }
}

function parseInfo(text) {
  const get = (key) => {
    const m = text.match(new RegExp(`${key}:\\s*(.+?)(?:\\n|$)`, "i"));
    return m ? m[1].trim() : "";
  };
  return {
    titleEn: get("TITLE_EN"),
    titleAr: get("TITLE_AR"),
    year: get("YEAR"),
    genre: get("GENRE"),
    rating: get("RATING"),
    duration: get("DURATION"),
    director: get("DIRECTOR"),
    description: get("DESCRIPTION")
  };
}

async function getCover(title) {
  const sources = [
    async () => {
      const res = await axios.get(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title)}`, { timeout: 8000 });
      return res.data?.[0]?.show?.image?.original || null;
    },
    async () => {
      const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`, { timeout: 8000 });
      return res.data?.data?.[0]?.images?.jpg?.large_image_url || null;
    }
  ];
  for (const src of sources) {
    try { const url = await src(); if (url) return url; } catch (_) {}
  }
  return null;
}

async function downloadImage(url) {
  try {
    fs.ensureDirSync(cacheDir);
    const imgPath = path.join(cacheDir, `movie_${Date.now()}.jpg`);
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 12000 });
    fs.writeFileSync(imgPath, Buffer.from(res.data));
    return { stream: fs.createReadStream(imgPath), path: imgPath };
  } catch (_) { return null; }
}

const RANDOM_TYPES = [
  "فيلم أكشن ومغامرات", "فيلم رعب نفسي", "فيلم كوميدي", "فيلم خيال علمي",
  "فيلم جريمة وغموض", "فيلم دراما", "فيلم إثارة وتشويق",
  "فيلم رعب", "فيلم حرب", "فيلم جريمة منظمة", "فيلم رسوم متحركة"
];

module.exports = {
  config: {
    name: "أفلام",
    aliases: ["افلام", "movie", "film", "فيلم", "movies", "films"],
    version: "2.0",
    author: "Saint",
    countDown: 8,
    role: 0,
    shortDescription: "ابحث عن فيلم أو احصل على اقتراح",
    longDescription: "ابحث عن فيلم وشاهد تفاصيله ونبذة عنه مع صورة الغلاف",
    category: "media",
    guide: "{pn} [اسم الفيلم]\n{pn} — اقتراح عشوائي"
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ").trim();
    const apiKey = getApiKey();
    if (!apiKey) return message.reply("❌ لا يوجد مفتاح API. تواصل مع مطور البوت.");

    const isRandom = !query;
    const waiting = await message.reply(isRandom
      ? "╭──────────────╮\n   🎲 جاري اختيار فيلم...\n╰──────────────╯"
      : "╭──────────────╮\n   🔍 جاري البحث...\n╰──────────────╯"
    );

    try {
      let rawText;
      if (isRandom) {
        const type = RANDOM_TYPES[Math.floor(Math.random() * RANDOM_TYPES.length)];
        rawText = await callGemini(apiKey, `اقترح ${type} واحد فقط، عشوائي وممتاز (يمكن أن يكون قديماً أو جديداً).
الرد بالشكل التالي فقط بدون أي إضافات:
TITLE_EN: (الاسم بالإنجليزية)
TITLE_AR: (الاسم بالعربية)
YEAR: (سنة الإصدار)
GENRE: (التصنيف بالعربية)
RATING: (التقييم من 10)
DURATION: (مدة الفيلم بالدقائق)
DIRECTOR: (اسم المخرج)
DESCRIPTION: (قصة الفيلم في 4 أسطر بالعربية بدون حرق أحداث)`, 1.1);
      } else {
        rawText = await callGemini(apiKey, `أنت خبير أفلام. ابحث عن فيلم "${query}" وأعطني معلوماته.
إذا لم تجده بالضبط، ابحث عن أقرب نتيجة.
الرد بالشكل التالي فقط بدون أي إضافات:
TITLE_EN: (الاسم بالإنجليزية)
TITLE_AR: (الاسم بالعربية)
YEAR: (سنة الإصدار)
GENRE: (التصنيف بالعربية)
RATING: (التقييم من 10)
DURATION: (مدة الفيلم بالدقائق)
DIRECTOR: (اسم المخرج)
DESCRIPTION: (قصة الفيلم في 4 أسطر بالعربية بدون حرق أحداث)`, 0.3);
      }

      if (!rawText) {
        api.unsendMessage(waiting.messageID).catch(() => {});
        return message.reply("❌ ما قدرت أجي بنتائج، جرب مرة أخرى.");
      }

      const info = parseInfo(rawText);
      if (!info.titleEn && !info.titleAr) {
        api.unsendMessage(waiting.messageID).catch(() => {});
        return message.reply(`❌ لم أجد فيلماً بهذا الاسم: "${query}"`);
      }

      const body =
        `╭━━━━━━━━━━━━━━━━━╮\n` +
        `   🎥 ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝗠𝗼𝘃𝗶𝗲𝘀\n` +
        `╰━━━━━━━━━━━━━━━━━╯\n\n` +
        `🎬 ${info.titleAr || info.titleEn}\n` +
        (info.titleEn && info.titleAr ? `🔤 ${info.titleEn}\n` : "") +
        `📅 سنة الإصدار: ${info.year}\n` +
        `🎭 التصنيف: ${info.genre}\n` +
        `⭐ التقييم: ${info.rating}/10\n` +
        (info.duration ? `⏱️ المدة: ${info.duration} دقيقة\n` : "") +
        (info.director ? `🎬 المخرج: ${info.director}\n` : "") +
        `\n📝 القصة:\n${info.description}\n` +
        `\n✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n` +
        `↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`;

      api.unsendMessage(waiting.messageID).catch(() => {});
      await message.reply(body);

      const coverTitle = info.titleEn || info.titleAr || query;
      const coverUrl = await getCover(coverTitle);
      if (coverUrl) {
        const imgData = await downloadImage(coverUrl);
        if (imgData) {
          message.reply({ body: "", attachment: [imgData.stream] }, () => {
            fs.remove(imgData.path).catch(() => {});
          });
        }
      }

    } catch (err) {
      console.error("[أفلام]", err.message);
      api.unsendMessage(waiting.messageID).catch(() => {});
      message.reply("❌ حدث خطأ أثناء البحث، جرب مرة أخرى.");
    }
  }
};
