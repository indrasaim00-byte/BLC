const fs = require("fs");

const balanceFile = __dirname + "/game.json";

function getBalance(uid) {
  const data = JSON.parse(fs.readFileSync(balanceFile));
  return data[uid]?.balance ?? 1000;
}

function setBalance(uid, balance) {
  const data = JSON.parse(fs.readFileSync(balanceFile));
  data[uid] = { balance };
  fs.writeFileSync(balanceFile, JSON.stringify(data, null, 2));
}

module.exports.config = {
  name: "رهان",
    aliases: ["bet"],
  version: "2.0",
  author: "Saint",
  role: 0,
  category: "economy",
  shortDescription: "Casino betting game"
};

module.exports.onStart = async function ({ api, event, args }) {

  const { senderID, threadID, messageID } = event;

  if (!args[0])
    return api.sendMessage("🎰 Usage: bet <amount>", threadID, messageID);

  const bet = parseInt(args[0]);

  if (!bet || bet <= 0)
    return api.sendMessage("❌ Invalid bet amount!", threadID, messageID);

  let balance = getBalance(senderID);

  if (balance < bet)
    return api.sendMessage(
      `❌ رصيدك غير كافٍ!\n🏦 رصيدك: ${balance} شظايا سواء 🖤`,
      threadID,
      messageID
    );

  const outcomes = [
    { text: "💥 You lost everything!", multiplier: 0 },
    { text: "😞 You got back half.", multiplier: 0.5 },
    { text: "🟡 You broke even.", multiplier: 1 },
    { text: "🟢 You doubled your money!", multiplier: 2 },
    { text: "🔥 You tripled your bet!", multiplier: 3 },
    { text: "🎉 JACKPOT! 10x reward!", multiplier: 10 }
  ];

  // ===== Probability Control =====
  const win = Math.random() < 0.6;

  let selected;

  if (win) {
    const winOutcomes = outcomes.filter(o => o.multiplier > 0);
    selected = winOutcomes[Math.floor(Math.random() * winOutcomes.length)];
  } else {
    const loseOutcomes = outcomes.filter(o => o.multiplier === 0);
    selected = loseOutcomes[Math.floor(Math.random() * loseOutcomes.length)];
  }

  const reward = Math.floor(bet * selected.multiplier);

  balance = balance - bet + reward;

  setBalance(senderID, balance);

  const msg =
`${selected.text}

🎰 راهنت: ${bet} شظايا سواء 🖤
💸 ربحت: ${reward} شظايا سواء 🖤
💰 رصيدك الجديد: ${balance} شظايا سواء 🖤`;

  api.sendMessage(msg, threadID, messageID);
};
