const fs = require('fs');
const path = require('path');

/**
 * Default Speicherpfad – kann in allen Funktionen mit economyPath überschrieben werden.
 */
const defaultPath = path.join(__dirname, '..', 'database', 'economy.json');

/** Default-Kapazitäten (kannst du bei Bedarf anpassen) */
const DEFAULT_WALLET_CAP = 1000000n;
const DEFAULT_BANK_CAP   = 10000000n;

/**
 * Stellt sicher, dass die Datei existiert und ein gültiges JSON-Objekt enthält.
 */
function loadEconomy(dbPath = defaultPath) {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      fs.writeFileSync(dbPath, '{}');
      return {};
    }
    const raw = fs.readFileSync(dbPath, 'utf8') || '{}';
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch (err) {
    console.error('[economy-phoenix] Fehler beim Laden der Economy:', err);
    return {};
  }
}

/**
 * Speichert die komplette Economy-Datenbank.
 */
function saveEconomy(db, dbPath = defaultPath) {
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('[economy-phoenix] Fehler beim Speichern der Economy:', err);
  }
}

/**
 * Egal ob Number, String (auch wissenschaftliche Notation) oder BigInt –
 * wir landen immer bei einem BigInt >= 0n.
 */
function toBigInt(val) {
  if (typeof val === 'bigint') return val >= 0n ? val : 0n;

  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return 0n;
    const n = Math.trunc(val);
    return n >= 0 ? BigInt(n) : 0n;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0n;

    // Direkte Ganzzahl?
    if (/^[+-]?\d+$/.test(trimmed)) {
      try {
        const bi = BigInt(trimmed);
        return bi >= 0n ? bi : 0n;
      } catch {
        return 0n;
      }
    }

    // z.B. "1.0000201963098084e+23" -> über Number
    const asNum = Number(trimmed);
    if (!Number.isFinite(asNum)) return 0n;
    const n = Math.trunc(asNum);
    return n >= 0 ? BigInt(n) : 0n;
  }

  return 0n;
}

/**
 * Normalisiert BigInt -> String für JSON.
 */
function fromBigInt(bi) {
  if (typeof bi !== 'bigint') bi = toBigInt(bi);
  if (bi < 0n) bi = 0n;
  return bi.toString();
}

/**
 * Stellt sicher, dass ein User-Eintrag existiert & Felder korrekt typisiert sind.
 * Mutiert das db-Objekt direkt.
 */
function ensureUser(db, userId) {
  if (!db[userId] || typeof db[userId] !== 'object') {
    db[userId] = {
      wallet: fromBigInt(0n),
      bank: fromBigInt(0n),
      walletCapacity: fromBigInt(DEFAULT_WALLET_CAP),
      bankCapacity: fromBigInt(DEFAULT_BANK_CAP),
      shieldUntil: null,
      lastDaily: 0,
      cooldowns: {}
    };
    return db[userId];
  }

  const user = db[userId];

  user.wallet = fromBigInt(user.wallet);
  user.bank   = fromBigInt(user.bank);

  user.walletCapacity = fromBigInt(
    user.walletCapacity != null ? user.walletCapacity : DEFAULT_WALLET_CAP
  );
  user.bankCapacity = fromBigInt(
    user.bankCapacity != null ? user.bankCapacity : DEFAULT_BANK_CAP
  );

  if (user.shieldUntil !== null && typeof user.shieldUntil !== 'number') {
    user.shieldUntil = Number(user.shieldUntil) || null;
  }

  if (typeof user.lastDaily !== 'number' || !Number.isFinite(user.lastDaily)) {
    user.lastDaily = 0;
  }

  if (!user.cooldowns || typeof user.cooldowns !== 'object') {
    user.cooldowns = {};
  }

  return user;
}

/**
 * Hilfsfunktion: gibt eine "lesbare" View zurück (Numbers), damit alte Commands nicht sofort brechen.
 * Intern wird trotzdem alles als BigInt + String gespeichert.
 */
function viewUser(user) {
  const walletBI = toBigInt(user.wallet);
  const bankBI   = toBigInt(user.bank);
  const wCapBI   = toBigInt(user.walletCapacity);
  const bCapBI   = toBigInt(user.bankCapacity);

  return {
    wallet: Number(walletBI),
    bank: Number(bankBI),
    walletCapacity: Number(wCapBI),
    bankCapacity: Number(bCapBI),
    shieldUntil: user.shieldUntil ?? null,
    lastDaily: user.lastDaily ?? 0,
    cooldowns: user.cooldowns || {}
  };
}

/**
 * Holt (oder erzeugt) einen User und gibt eine View zurück.
 */
function getUserEconomy(userId, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);
  const user = ensureUser(db, userId);
  saveEconomy(db, dbPath);
  return viewUser(user);
}

/**
 * Kurzform für "nur Kontostand".
 */
function balance(userId, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);
  const user = ensureUser(db, userId);
  saveEconomy(db, dbPath);
  const v = viewUser(user);
  return {
    wallet: v.wallet,
    bank: v.bank,
    walletCapacity: v.walletCapacity,
    bankCapacity: v.bankCapacity
  };
}

/**
 * Interner Helper: mutiert Wallet/Bank + speichert.
 */
function updateUser(dbPath, userId, updater) {
  const db = loadEconomy(dbPath);
  const user = ensureUser(db, userId);

  const walletBI = toBigInt(user.wallet);
  const bankBI   = toBigInt(user.bank);
  const wCapBI   = toBigInt(user.walletCapacity);
  const bCapBI   = toBigInt(user.bankCapacity);

  const res = updater({ walletBI, bankBI, wCapBI, bCapBI, user });

  // Falls updater nichts zurückgibt, trotzdem speichern
  if (res && res.walletBI !== undefined) {
    user.wallet = fromBigInt(res.walletBI);
  } else {
    user.wallet = fromBigInt(walletBI);
  }

  if (res && res.bankBI !== undefined) {
    user.bank = fromBigInt(res.bankBI);
  } else {
    user.bank = fromBigInt(bankBI);
  }

  if (res && res.wCapBI !== undefined) {
    user.walletCapacity = fromBigInt(res.wCapBI);
  } else {
    user.walletCapacity = fromBigInt(wCapBI);
  }

  if (res && res.bCapBI !== undefined) {
    user.bankCapacity = fromBigInt(res.bCapBI);
  } else {
    user.bankCapacity = fromBigInt(bCapBI);
  }

  saveEconomy(db, dbPath);
  return viewUser(user);
}

/**
 * Einzahlen: von Wallet -> Bank
 */
function deposit(userId, amount, dbPath = defaultPath) {
  const amt = toBigInt(amount);
  if (amt <= 0n) {
    return { success: false, message: 'Betrag muss > 0 sein.' };
  }

  const v = updateUser(dbPath, userId, ({ walletBI, bankBI, bCapBI }) => {
    if (walletBI < amt) {
      return { walletBI, bankBI, bCapBI, error: 'Nicht genug Cookies im Wallet.' };
    }
    if (bankBI + amt > bCapBI) {
      return { walletBI, bankBI, bCapBI, error: 'Bankkapazität überschritten.' };
    }
    return {
      walletBI: walletBI - amt,
      bankBI: bankBI + amt,
      bCapBI
    };
  });

  if (v.error) {
    return { success: false, message: v.error };
  }

  return { success: true, ...v };
}

/**
 * Auszahlen: von Bank -> Wallet
 */
function withdraw(userId, amount, dbPath = defaultPath) {
  const amt = toBigInt(amount);
  if (amt <= 0n) {
    return { success: false, message: 'Betrag muss > 0 sein.' };
  }

  const v = updateUser(dbPath, userId, ({ walletBI, bankBI, wCapBI }) => {
    if (bankBI < amt) {
      return { walletBI, bankBI, wCapBI, error: 'Nicht genug Cookies auf der Bank.' };
    }
    if (walletBI + amt > wCapBI) {
      return { walletBI, bankBI, wCapBI, error: 'Wallet-Kapazität überschritten.' };
    }
    return {
      walletBI: walletBI + amt,
      bankBI: bankBI - amt,
      wCapBI
    };
  });

  if (v.error) {
    return { success: false, message: v.error };
  }

  return { success: true, ...v };
}

/**
 * Direkt vom Wallet abziehen (z.B. Spieleinsatz).
 */
function deduct(userId, amount, dbPath = defaultPath) {
  const amt = toBigInt(amount);
  if (amt <= 0n) {
    return { success: false, message: 'Betrag muss > 0 sein.' };
  }

  const v = updateUser(dbPath, userId, ({ walletBI, bankBI }) => {
    if (walletBI < amt) {
      return { walletBI, bankBI, error: 'Nicht genug Cookies im Wallet.' };
    }
    return {
      walletBI: walletBI - amt,
      bankBI
    };
  });

  if (v.error) {
    return { success: false, message: v.error };
  }

  return { success: true, ...v };
}

/**
 * Direkt ins Wallet geben (z.B. Gewinne).
 */
function give(userId, amount, dbPath = defaultPath) {
  const amt = toBigInt(amount);
  if (amt <= 0n) {
    return { success: false, message: 'Betrag muss > 0 sein.' };
  }

  const v = updateUser(dbPath, userId, ({ walletBI, bankBI, wCapBI }) => {
    let newWallet = walletBI + amt;
    if (newWallet > wCapBI) {
      newWallet = wCapBI;
    }
    return {
      walletBI: newWallet,
      bankBI,
      wCapBI
    };
  });

  return { success: true, ...v };
}

/**
 * Überweisen: von from -> to (Wallet -> Wallet)
 */
function transfer(fromId, toId, amount, dbPath = defaultPath) {
  const amt = toBigInt(amount);
  if (amt <= 0n) {
    return { success: false, message: 'Betrag muss > 0 sein.' };
  }

  const db = loadEconomy(dbPath);
  const from = ensureUser(db, fromId);
  const to   = ensureUser(db, toId);

  let fromWallet = toBigInt(from.wallet);
  let fromBank   = toBigInt(from.bank);
  let toWallet   = toBigInt(to.wallet);
  const toCap    = toBigInt(to.walletCapacity);

  if (fromWallet < amt) {
    return { success: false, message: 'Nicht genug Cookies im Wallet.' };
  }

  fromWallet -= amt;
  toWallet += amt;
  if (toWallet > toCap) {
    toWallet = toCap;
  }

  from.wallet = fromBigInt(fromWallet);
  from.bank   = fromBigInt(fromBank);
  to.wallet   = fromBigInt(toWallet);

  saveEconomy(db, dbPath);

  return {
    success: true,
    from: viewUser(from),
    to: viewUser(to)
  };
}

/**
 * Bankkapazität erhöhen.
 */
function giveCapacity(userId, extraCapacity, dbPath = defaultPath) {
  const extra = toBigInt(extraCapacity);
  if (extra <= 0n) {
    return { success: false, message: 'Kapazitätserhöhung muss > 0 sein.' };
  }

  const v = updateUser(dbPath, userId, ({ walletBI, bankBI, bCapBI }) => {
    return {
      walletBI,
      bankBI,
      bCapBI: bCapBI + extra
    };
  });

  return { success: true, ...v };
}

/**
 * Daily-Reward – 24h Cooldown.
 */
function daily(userId, rewardAmount, dbPath = defaultPath) {
  const amount = toBigInt(rewardAmount);
  if (amount <= 0n) {
    return { cd: true, cdL: 'Reward-Betrag muss > 0 sein.', amount: 0 };
  }

  const db = loadEconomy(dbPath);
  const user = ensureUser(db, userId);

  const now = Date.now();
  const last = typeof user.lastDaily === 'number' ? user.lastDaily : 0;
  const diff = now - last;
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay) {
    const remaining = oneDay - diff;
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    const cdL = `${hours}h ${minutes}m`;
    return { cd: true, cdL, amount: 0 };
  }

  let walletBI = toBigInt(user.wallet);
  const wCapBI = toBigInt(user.walletCapacity);

  walletBI += amount;
  if (walletBI > wCapBI) walletBI = wCapBI;

  user.wallet = fromBigInt(walletBI);
  user.lastDaily = now;

  saveEconomy(db, dbPath);

  return { cd: false, cdL: null, amount: Number(amount) };
}

/**
 * rob – generische Variante (viele Projekte nutzen eigene Logik, also nur Basic).
 * Stehlt einen Prozentsatz vom Wallet von target zu from, wenn genug vorhanden.
 */
function rob(fromId, targetId, percent = 0.02, dbPath = defaultPath) {
  const db = loadEconomy(dbPath);
  const from = ensureUser(db, fromId);
  const target = ensureUser(db, targetId);

  const victimWallet = toBigInt(target.wallet);
  if (victimWallet <= 0n) {
    return { success: false, message: 'Opfer hat kein Guthaben.' };
  }

  const p = typeof percent === 'number' && percent > 0 ? percent : 0.02;
  const stealAmt = toBigInt(Math.floor(Number(victimWallet) * p));
  if (stealAmt <= 0n) {
    return { success: false, message: 'Zu wenig Guthaben für einen Raub.' };
  }

  let fromWallet = toBigInt(from.wallet);
  let targetWallet = victimWallet - stealAmt;

  fromWallet += stealAmt;

  from.wallet = fromBigInt(fromWallet);
  target.wallet = fromBigInt(targetWallet);

  saveEconomy(db, dbPath);

  return {
    success: true,
    amount: Number(stealAmt),
    from: viewUser(from),
    target: viewUser(target)
  };
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
