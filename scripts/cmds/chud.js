module.exports = {
  config: {
    name: "حرب",
    aliases: ["chud", "war"],
    version: "2.0",
    author: "nexo_here",
    role: 2,
    category: "admin",
    guide: {
      ar: "حرب @(منشن)",
      en: "chud @(mention)"
    }
  },

  onStart: async function ({ api, event, userData, args }) {
    var mention = Object.keys(event.mentions)[0];
    if (!mention) return api.sendMessage("⚠️ لازم تعلم واحد باش تحاربه 😈", event.threadID);

    let name = event.mentions[mention];
    var arraytag = [];
    arraytag.push({ id: mention, tag: name });
    var a = function (a) { api.sendMessage(a, event.threadID); };

    setTimeout(() => { a({ body: "واش راك يا " + name + " جاي تتحدى فيا؟ والله نوريك شكون أنا يا ولد القحبة 😂😂", mentions: arraytag }); }, 3000);
    setTimeout(() => { a({ body: name + " يا ولد القحبة مع شكون جاي تلعب؟ كس أمك يا حيوان 🤬🤬🤬", mentions: arraytag }); }, 5000);
    setTimeout(() => { a({ body: name + " يا مهبول نيكك ونيك اللي ولدك كيفاش تجرأت تتحداني 😤", mentions: arraytag }); }, 7000);
    setTimeout(() => { a({ body: name + " يا ولد الشرموطة كس أختك يا كلب 🤬", mentions: arraytag }); }, 9000);
    setTimeout(() => { a({ body: name + " يا قحبة وليد الدوار روح نيك روحك 😂", mentions: arraytag }); }, 12000);
    setTimeout(() => { a({ body: name + " يا هبيل والله نقسم بالله نيكك بلا ما تحس روحك، روح نعس يا ولد القحبة 🤬", mentions: arraytag }); }, 14000);
    setTimeout(() => { a({ body: name + " يبوك ما علمكش الأدب؟ يا خسارة كس أمك 😂", mentions: arraytag }); }, 16000);
    setTimeout(() => { a({ body: name + " يا مسخ والله نيكك بلا ما تحس روحك 🖕", mentions: arraytag }); }, 18000);
    setTimeout(() => { a({ body: name + " روح سقسي يماك علاش ولدتك يا ولد القحبة 😂", mentions: arraytag }); }, 20000);
    setTimeout(() => { a({ body: name + " يا قرد والله حتى الكلاب أحسن منك يا زبالة 😍", mentions: arraytag }); }, 22000);
    setTimeout(() => { a({ body: name + " يا ولد الشرموطة زعمك أنت شي حاجة؟ نيك أمك وليد الدوار تلعب بيا؟ 🤬", mentions: arraytag }); }, 24000);
    setTimeout(() => { a({ body: name + " مازال عندك وقت تعتذر يا كلب 🤣🤣", mentions: arraytag }); }, 26000);
    setTimeout(() => { a({ body: name + " كيفاش صحتك يا ولد القحبة؟ 😍", mentions: arraytag }); }, 28000);
    setTimeout(() => { a({ body: name + " نيكك ونيك اللي ولدك يا هبيل 🥰", mentions: arraytag }); }, 30000);
    setTimeout(() => { a({ body: name + " يا مهبول يا ولد القحبة 🥰", mentions: arraytag }); }, 32000);
    setTimeout(() => { a({ body: name + " يبوك ما تنساهش يا كلب 🤬", mentions: arraytag }); }, 65000);
    setTimeout(() => { a({ body: name + " هاذي الحرب مش ح تنساها طول عمرك يا بهيم ولد القحبة 🤣🤣🤣", mentions: arraytag }); }, 34000);
    setTimeout(() => { a({ body: name + " يا قرد ولد الشرموطة 🥰", mentions: arraytag }); }, 36000);
    setTimeout(() => { a({ body: name + " تعبت ولا نكمل نيكك يا حيوان؟ 🥵🥵", mentions: arraytag }); }, 38000);
    setTimeout(() => { a({ body: name + " ما تنساش يبوك يا ولد القحبة 🤬🤬🤬🤬🤬", mentions: arraytag }); }, 40000);
    setTimeout(() => { a({ body: name + " نخليك بلا ما تحس روحك يا زبالة 🤬🤬🤬🤬🤬🤬", mentions: arraytag }); }, 44000);
    setTimeout(() => { a({ body: name + " والله نلعب بيك بلا ما نتعب يا ولد القحبة 😞🖕", mentions: arraytag }); }, 46000);
    setTimeout(() => { a({ body: "🖕🏿🖕🏿🖕🏿🖕🏿🖕🏿🖕🏿🖕🏿🖕🏿🖕🏿 " + name, mentions: arraytag }); }, 48000);
    setTimeout(() => { a({ body: name + " يا ولد القحبة روح نيك روحك بلاك من هنا 🖕🏽🖕🏽🖕🏽", mentions: arraytag }); }, 50000);
    setTimeout(() => { a({ body: name + " والله نيكك بيد وحدة، عرفت شكون أنا يا كلب؟ 🤬 نيك أمك قبل شوية 😂", mentions: arraytag }); }, 52000);
    setTimeout(() => { a({ body: name + " يا ولد القحبة 😂", mentions: arraytag }); }, 56000);
    setTimeout(() => { a({ body: name + " يا مهبول يا حيوان يا ولد الشرموطة 🤬", mentions: arraytag }); }, 58000);
    setTimeout(() => { a({ body: name + " واش بللت سروالك يا كلب؟ 🤣🤣🤣🤣🤣🤣🤣", mentions: arraytag }); }, 60000);
    setTimeout(() => { a({ body: name + " تبغي نكمل نيكك؟ 😤😤😤😤", mentions: arraytag }); }, 62000);
    setTimeout(() => { a({ body: name + " روح يا كلب نيك روحك، بلاك من هنا 🤬", mentions: arraytag }); }, 64000);
    setTimeout(() => { a({ body: name + " نيكك كيفاش نبغي يا ولد القحبة 😋😋", mentions: arraytag }); }, 66000);
    setTimeout(() => { a({ body: name + " كي تعاود تجي هكذا نعطيك أحسن منها يا ولد القحبة 😂😂😂", mentions: arraytag }); }, 68000);
    setTimeout(() => { a({ body: name + " هاذي الحرب مش ح تنساها يا ولد الشرموطة 🤣🤣🤣", mentions: arraytag }); }, 70000);
    setTimeout(() => { a({ body: name + " روح نيك روحك يا قرد 🤬🤬🤬🤬", mentions: arraytag }); }, 72000);
    setTimeout(() => { a({ body: name + " والله نوريك ما شفتهش يا زبالة 🤣🤣", mentions: arraytag }); }, 74000);
    setTimeout(() => { a({ body: name + " عرفت شكون أنا يا ولد القحبة؟ وليد الدوار تلعب بيا 😤", mentions: arraytag }); }, 76000);
    setTimeout(() => { a({ body: name + " يا ولد القحبة ما تنساش ربي شايفك يا كلب 🤬🤬🤬", mentions: arraytag }); }, 78000);
    setTimeout(() => { a({ body: name + " يا ولد الشرموطة 😍", mentions: arraytag }); }, 80000);
    setTimeout(() => { a({ body: name + " والله نيكك 😍😍😍", mentions: arraytag }); }, 82000);
    setTimeout(() => { a({ body: name + " مع شكون جاي تتحدى يا هبيل ولد القحبة؟ 🤬", mentions: arraytag }); }, 84000);
    setTimeout(() => { a({ body: name + " كيفاش ذاقتلك هاذي الحرب يا ولد الشرموطة؟ 🤣🤣🤣🤣", mentions: arraytag }); }, 86000);
  }
};
