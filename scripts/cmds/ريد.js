const { config } = global.BlackBot;
const { writeFileSync } = require("fs-extra");

const raidIntervals = {};

module.exports = {
    config: {
        name: "ريد",
        aliases: ["raid"],
        version: "1.0",
        author: "Bot",
        countDown: 0,
        role: 2,
        description: {
            ar: "تفعيل/إيقاف وضع الريد - يقفل الأوامر على الأعضاء ويرسل رسالة متكررة",
            en: "Enable/disable raid mode - locks commands for members and sends repeated message"
        },
        category: "owner",
        guide: {
            ar: "   {pn} <الوقت>[s] [النص]: تفعيل الريد مع إرسال النص كل X ثانية (s) أو X دقيقة"
                + "\n   {pn} off: إيقاف الريد وإعادة تفعيل الأوامر للأعضاء"
                + "\n   مثال: {pn} 10s تنبيه: الكروب في حالة ريد"
                + "\n   مثال: {pn} 2 تنبيه: الكروب في حالة ريد",
            en: "   {pn} <time>[s] [text]: activate raid, send text every X seconds (s) or X minutes"
                + "\n   {pn} off: stop raid mode"
        }
    },

    langs: {
        ar: {
            raidOn: "🔴 | تم تفعيل وضع الريد!\n⏱ سيتم إرسال الرسالة كل %1\n🔒 الأوامر مقفلة للأعضاء - الأدمن فقط يمكنه الاستخدام",
            raidOff: "🟢 | تم إيقاف وضع الريد!\n🔓 الأوامر متاحة للجميع الآن",
            alreadyOff: "⚠️ | وضع الريد غير مفعّل أصلاً",
            invalidTime: "⚠️ | صيغة الوقت غير صحيحة\nمثال: ريد 10s نص (ثواني) | ريد 5 نص (دقائق)",
            seconds: "%1 ثانية",
            minutes: "%1 دقيقة"
        },
        en: {
            raidOn: "🔴 | Raid mode activated!\n⏱ Message will be sent every %1\n🔒 Commands locked for members - only admins can use",
            raidOff: "🟢 | Raid mode deactivated!\n🔓 Commands are available for everyone now",
            alreadyOff: "⚠️ | Raid mode is not active",
            invalidTime: "⚠️ | Invalid time format\nExample: raid 10s text (seconds) | raid 5 text (minutes)",
            seconds: "%1 seconds",
            minutes: "%1 minutes"
        }
    },

    onStart: async function ({ args, event, api }) {
        const threadID = event.threadID;

        if (args[0] === "off") {
            if (!raidIntervals[threadID]) return;
            clearInterval(raidIntervals[threadID]);
            delete raidIntervals[threadID];
            config.adminOnly.enable = false;
            writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
            global.da3SilentMode = { enable: false };
            return;
        }

        const timeArg = args[0];
        if (!timeArg) return;

        let intervalMs;

        if (timeArg.toLowerCase().endsWith("s")) {
            const secs = parseInt(timeArg.slice(0, -1));
            if (isNaN(secs) || secs <= 0) return;
            intervalMs = secs * 1000;
        } else {
            const mins = parseInt(timeArg);
            if (isNaN(mins) || mins <= 0) return;
            intervalMs = mins * 60 * 1000;
        }

        const defaultRaidText = `𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒𝑵𝑲ۥِْ؍ۥِْ؍ُ☠🇭🇰🩸𝑴𝑲 𒈞‌‌𖠚𐎥𝑲𝑺☄🇭🇰🩸𝑴𝑲𒈒
𝒁𝑲𖠚𒈒𝑴𝑲🇭🇰🩸𝑲𝑺𖠚ۥِْ؍ۥ𒈒𝑴𝑲🇭🇰🩸𝑵𝑲☠𒈒

‌⌯ ⟅˖ִ𝗜 𝗔𝗠 ࿂͜•𝙈𝙖𝙨𝙩𝙚𝙧 ། 𝘿𝙚̲̅𝙖̲̅𝙩̲̅𝙝ᬼ 
𝘵͟𝘩𝘦 𝘨͟r͟𝘦𝘢͟𝘵͟𝘦𝘴𝘵 𝘸𝘳𝘪͟𝘭͟͟𝘪͟͟𝘵͟𝘦𝘳 ͟o͟𝘧 𝘵𝘩𝘦 ͟𝘦͟𝘷𝘪𝘭 ͟𝘮͟𝘢͟𝘴͟𝘵𝘦𝘳'𝘴 𝘯͟e͟𝘸𝘴͟𝘱͟𝘢𝘱𝘦𝘳 

 ‌           ⏤͟͟͞͞🔴                        

     𝗥𝗲𝘁𝘂𝗿𝗻 𝗼𝗳 𝘁𝗵𝗲 𝗗𝗲𝗮𝗱      
 ‌ ‌   ─⃝͎̽𝙎𖤌˖𝘼ɵ⃪𝆭͜͡X͎𝆭̽ʌ𝆭⃟ɴ𝙄☃️𝆺𝅥⃝𝙈✬      

 ➣  𝆺𝅥⃝𝗗𝗘𝗩𝗜𝗟 ۬༐ 𝗦҈𝗮𝗶𝗻𝘁🩸𒁂`;
        const customText = args.slice(1).join(" ") || defaultRaidText;

        if (raidIntervals[threadID]) {
            clearInterval(raidIntervals[threadID]);
            delete raidIntervals[threadID];
        }

        config.adminOnly.enable = true;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        global.da3SilentMode = { enable: true };

        raidIntervals[threadID] = setInterval(() => {
            if (!raidIntervals[threadID]) return;
            api.sendMessage(customText, threadID);
        }, intervalMs);
    },

    onChat: async function ({ event, message }) {
        const threadID = event.threadID;
        const adminBot = global.BlackBot.config.adminBot || [];
        const senderID = event.senderID;

        if (!raidIntervals[threadID]) return;

        if (!adminBot.includes(senderID)) {
            return;
        }
    }
};
