const fs = require('fs');
const path = require('path');

const defaultPath = path.join(__dirname, '..', 'database', 'economy.json');

function loadEconomy(dbPath = defaultPath) {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveEconomy(db, dbPath = defaultPath) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function getUserEconomy(userId, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);

  if (!db[userId]) {
    db[userId] = {
      wallet: 0,
      bank: 0,
      bankCapacity: 1000,
      shieldUntil: null,
      lastDaily: 0,
      cooldowns: {}
    };
    saveEconomy(db, dbPath);
  }
  return db[userId];
}

function balance(userId, dbPath = defaultPath) {
  const user = getUserEconomy(userId, dbPath);
  return {
    wallet: user.wallet,
    bank: user.bank,
    bankCapacity: user.bankCapacity
  };
}

function deposit(userId, amount, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);
  const user = getUserEconomy(userId, dbPath);

  if (user.wallet < amount) {
    return { noten: true, amount: 0 };
  }
  if (user.bank + amount > user.bankCapacity) {
    return { noten: true, amount: 0, message: 'Bankkapazität überschritten.' };
  }

  db[userId].wallet -= amount;
  db[userId].bank += amount;
  saveEconomy(db, dbPath);

  return { noten: false, amount: amount };
}

function withdraw(userId, amount, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);
  const user = getUserEconomy(userId, dbPath);

  if (user.bank < amount) {
    return { noten: true, amount: 0, message: 'Nicht genug auf der Bank.' };
  }

  db[userId].bank -= amount;
  db[userId].wallet += amount;
  saveEconomy(db, dbPath);

  return { noten: false, amount: amount };
}

function deduct(userId, amount, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);
  const user = getUserEconomy(userId, dbPath);

  if (user.wallet < amount) return false;
  db[userId].wallet -= amount;
  saveEconomy(db, dbPath);
  return true;
}

function give(userId, amount, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);
  const user = getUserEconomy(userId, dbPath);

  db[userId].wallet += amount;
  saveEconomy(db, dbPath);
  return true;
}

function transfer(fromId, toId, amount, dbPath = defaultPath) {
  if (!deduct(fromId, amount, dbPath)) return { success: false, message: 'Nicht genug Guthaben.' };
  give(toId, amount, dbPath);
  return { success: true, amount };
}

function giveCapacity(userId, capacity, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);
  const user = getUserEconomy(userId, dbPath);

  db[userId].bankCapacity = capacity;
  saveEconomy(db, dbPath);
  return true;
}

function daily(userId, rewardAmount = 999, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);
  const user = getUserEconomy(userId, dbPath);

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (user.lastDaily && now - user.lastDaily < ONE_DAY) {
    const remaining = ONE_DAY - (now - user.lastDaily);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    return {
      cd: true,
      cdL: `${hours}h ${minutes}m ${seconds}s`,
      amount: 0
    };
  }

  db[userId].wallet += rewardAmount;
  db[userId].lastDaily = now;
  db[userId] = user;
  saveEconomy(db, dbPath);

  return {
    cd: false,
    cdL: null,
    amount: rewardAmount
  };
}

function rob(fromId, toId, maxSteal = 500, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);
  const victim = getUserEconomy(toId, dbPath);
  const thief = getUserEconomy(fromId, dbPath);

  if (victim.wallet <= 0) return { success: false, message: 'Das Opfer hat kein Geld.' };

  const amountStolen = Math.min(victim.wallet, Math.floor(Math.random() * maxSteal) + 1);
  victim.wallet -= amountStolen;
  thief.wallet += amountStolen;

  db[fromId] = thief;
  db[toId] = victim;
  saveEconomy(db, dbPath);

  return { success: true, amount: amountStolen };
}

module.exports = {
  getUserEconomy,
  balance,
  deposit,
  withdraw,
  deduct,
  give,
  transfer,
  giveCapacity,
  daily,
  rob,
  loadEconomy,
  saveEconomy
};