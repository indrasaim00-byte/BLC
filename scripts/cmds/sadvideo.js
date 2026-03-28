const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "حزين",
    aliases: ["sad"],
    version: "2.0.0",
    author: "NAZRUL x Saint",
    countDown: 5,
    role: 0,
    shortDescription: "إرسال فيديو حزين",
    longDescription: "يرسل فيديو حزين عشوائياً مع تعليق عاطفي",
    category: "media",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ api, event }) {
    const captions = [
      "كنتَ أجمل فصل في قصتي ♡",
      "لم أنل الحب، بل عشتُ خوف الفقدان ─",
      "لا أحد ينتظرني الآن، أنا وحدي من ينتظر... ◆",
      "في الدموع قصة لا تُرى ↞",
      "خلف الابتسامة ألم لا يُحصى ─",
      "ذكراكَ لا تزال توقظني من النوم ◆",
      "لم أنسَ، بل توقفتُ عن التذكّر ─",
      "أحياناً الصمت هو أكبر إجابة ↞",
      "من أريده هو أبعد من يكون ♡",
      "أقول إنني بخير، لكن القلب ليس بخير ─"
    ];

    const caption = captions[Math.floor(Math.random() * captions.length)];

    const links = [
      "https://drive.google.com/uc?id=16KeE4J7L2Pd8cCKIBvlwEPP07A92b-eb",
      "https://drive.google.com/uc?id=16MhNPi_H0-tEe5PQrrqkx_l7SrC_l0kd",
      "https://drive.google.com/uc?id=15w4cvYmKrCW2Hul2AcvPEk5S4b-CH3EE",
      "https://drive.google.com/uc?id=16Xa6thSHdEGCiypaetbAEqVCwEAzFnKX",
      "https://drive.google.com/uc?id=16BnRPvKQd7gd3YLR_rB9QNZymotMqHu7",
      "https://drive.google.com/uc?id=15fDe2735O50z-3G4yQ5tDT9J873x5izm",
      "https://drive.google.com/uc?id=16HgiGU7_Cdh8NtpsKi92dTJmALJCV8jD",
      "https://drive.google.com/uc?id=16KTSrInqvioGnT7RrAskjHYqz8R6RgNY",
      "https://drive.google.com/uc?id=162yWrNRRTeN4tFEjQEtsR4p-4gWbTFaS",
      "https://drive.google.com/uc?id=16-q768c6nXstZEjQhWa1pZUPL2Xpjwo9",
      "https://drive.google.com/uc?id=15bfkP01mTzXutgP_0Z1iyud7SXqq-jOt",
      "https://drive.google.com/uc?id=15WnvdFOQIhKQ1nlZgsABXaf6Q2nQexGW",
      "https://drive.google.com/uc?id=16GTgYVSIDduUs4VTxadIzPPyp9KA_102",
      "https://drive.google.com/uc?id=15Y2GnA-Kcox8Mw6jioxHc1G1yP4pihnC",
      "https://drive.google.com/uc?id=16-qsG6oldtJiGq11Q3bFxKzuZJRFnoPT",
      "https://drive.google.com/uc?id=15W8ETDBXrn_JvealPwPFQ2CjvZp437-g",
      "https://drive.google.com/uc?id=15StZMKfsTdAhhECdKjS6FUFwG_OIHa7W",
      "https://drive.google.com/uc?id=16lOXxs-Z9u-mxttFnwWzdUHvrP55aHnZ",
      "https://drive.google.com/uc?id=162Qn-pcnc9iijg5dv59S9DTTQOofL4Fy",
      "https://drive.google.com/uc?id=1680rf1wQ2TrRuSLHtTwFC7GYctJAnHaX",
      "https://drive.google.com/uc?id=16-XtMXpa4r1iFJTBS2N68ARMuDH2IWpG",
      "https://drive.google.com/uc?id=15bO3lguAxsMZPvKkcvlsM6ObXOfJMz79"
    ];

    const link = links[Math.floor(Math.random() * links.length)];
    const cachePath = path.join(__dirname, "cache", "sad.mp4");

    try {
      const response = await axios({
        url: encodeURI(link),
        method: "GET",
        responseType: "stream"
      });

      await fs.ensureDir(path.join(__dirname, "cache"));
      const writer = fs.createWriteStream(cachePath);

      response.data.pipe(writer);

      writer.on("finish", async () => {
        await api.sendMessage(
          {
            body: `「 ${caption} 」`,
            attachment: fs.createReadStream(cachePath)
          },
          event.threadID
        );
        fs.unlinkSync(cachePath);
      });

      writer.on("error", (err) => {
        console.error(err);
        api.sendMessage("〔✗〕 حدثت مشكلة في إرسال الفيديو!", event.threadID);
      });

    } catch (error) {
      console.error(error);
      api.sendMessage("〔✗〕 حدثت مشكلة في جلب الفيديو.", event.threadID);
    }
  }
};
