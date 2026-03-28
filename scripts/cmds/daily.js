const fs = require("fs");

const balanceFile = __dirname + "/game.json";

function getUserData(uid) {
  const data = JSON.parse(fs.readFileSync(balanceFile));
  return data[uid] || { balance: 1000, daily: 0 };
}

function setUserData(uid, obj) {
  const data = JSON.parse(fs.readFileSync(balanceFile));
  data[uid] = obj;
  fs.writeFileSync(balanceFile, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "يومي",
  aliases: ["يومي", "ديلي", "daily"],
  version: "1.0",
  author: "Saint",
  role: 0,
  category: "economy",
  shortDescription: "Daily bonus reward"
};

module.exports.onStart = async function ({ api, event }) {

  const { senderID, threadID, messageID } = event;

  let userData = getUserData(senderID);

  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;

  if (now - userData.daily < cooldown) {
    const remaining = cooldown - (now - userData.daily);
    const hour = Math.floor(remaining / 3600000);
    const minute = Math.floor((remaining % 3600000) / 60000);

    return api.sendMessage(
      `⏳ You already claimed daily bonus.\n\nCome back after ${hour}h ${minute}m`,
      threadID,
      messageID
    );
  }

  const bonus = 500;

  userData.balance = (userData.balance || 1000) + bonus;
  userData.daily = now;

  setUserData(senderID, userData);

  api.sendMessage(
    `🎁 Daily Bonus Claimed!\n💰 +${bonus}$ added\n🏦 New Balance: ${userData.balance}$`,
    threadID,
    messageID
  );
};
