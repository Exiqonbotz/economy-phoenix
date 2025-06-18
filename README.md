# economy-phoenix

&#x20;  &#x20;

**economy-phoenix** ist ein flexibles und einfach integrierbares Economy-System für Node.js-Projekte. Ursprünglich für den **Phoenix WhatsApp-Bot** entwickelt – jetzt für alle Projekte geeignet.

---

## 🚀 Features

- 💰 **Wallet- & Bank-System**
- 📈 **Bankkapazität erweiterbar (/cookieupgrade)**
- 🎁 **Tägliche Belohnungen (/daily)**
- 🔁 **Überweisungen zwischen Nutzern (/transfer)**
- 🏴‍☠️ **Ausrauben anderer Nutzer (/rob)**
- 🎢 **Erweiterbar für Spiele (Roulette, Blackjack, uvm.)**
- 📂 **Speichert in JSON-Dateien – keine zusätzliche Datenbank notwendig**

---

## 📦 Installation

```bash
npm install economy-phoenix
```

---

## 🔧 Beispielnutzung

```js
const eco = require('economy-phoenix');

// Benutzer-Wallet anzeigen
const balance = eco.balance('user-id');
console.log(balance);

// Einzahlung vornehmen
const deposit = eco.deposit('user-id', 500);
console.log(deposit);

// Auszahlung vornehmen
const withdraw = eco.withdraw('user-id', 200);
console.log(withdraw);

// Tägliche Belohnung abholen
const daily = eco.daily('user-id');
console.log(daily);
```

---

## 📂 Speicherort

Standardmäßig wird die Wirtschaft in folgender Datei gespeichert:

```
./database/economy.json
```

Du kannst einen eigenen Pfad angeben:

```js
const eco = require('economy-phoenix');
eco.getUserEconomy('user-id', './meinPfad/economy.json');
```

---

## 🛠️ API Referenz

### `getUserEconomy(userId, dbPath?)`

Holt oder erstellt die Wirtschaftsdaten eines Nutzers.

| Parameter | Typ    | Beschreibung                                                               |
| --------- | ------ | -------------------------------------------------------------------------- |
| `userId`  | String | ID des Nutzers                                                             |
| `dbPath`  | String | *(optional)* Pfad zur JSON-Datenbank (Standard: `./database/economy.json`) |

**Rückgabe:**

```js
{
  wallet: Number,
  bank: Number,
  bankCapacity: Number,
  lastDaily: Number,
  cooldowns: Object
}
```

### `balance(userId, dbPath?)`

Gibt das aktuelle Wallet- & Bankguthaben eines Nutzers zurück.

```js
{
  wallet: Number,
  bank: Number,
  bankCapacity: Number
}
```

### `deposit(userId, amount, dbPath?)`

Zahlt Geld vom Wallet auf die Bank ein.

```js
{
  noten: Boolean,  // true = Einzahlung fehlgeschlagen
  amount: Number,  // Betrag der eingezahlt wurde
  message?: String // Bei Fehler: z.B. "Bankkapazität überschritten."
}
```

### `withdraw(userId, amount, dbPath?)`

Hebt Geld von der Bank ab und fügt es dem Wallet hinzu.

```js
{
  noten: Boolean,  // true = Auszahlung fehlgeschlagen
  amount: Number,
  message?: String
}
```

### `daily(userId, rewardAmount?, dbPath?)`

Tägliche Belohnung erhalten (Standardbetrag: `999`).

```js
{
  cd: Boolean,     // true = noch im Cooldown
  cdL: String|null, // verbleibende Zeit, falls cd = true
  amount: Number    // erhaltene Belohnung (0 wenn noch Cooldown)
}
```

### `transfer(fromId, toId, amount, dbPath?)`

Überweist Guthaben an einen anderen Nutzer.

```js
{
  success: Boolean,
  amount: Number,
  message?: String
}
```

### `rob(fromId, toId, maxSteal?, dbPath?)`

Versucht, einen anderen Nutzer auszurauben.

```js
{
  success: Boolean,
  amount?: Number,
  message?: String
}
```

### `give(userId, amount, dbPath?)`

Fügt einem Nutzer Guthaben hinzu. → Rückgabe: `true`

### `deduct(userId, amount, dbPath?)`

Zieht Guthaben von einem Nutzer ab. → Rückgabe: `true | false`

### `giveCapacity(userId, capacity, dbPath?)`

Setzt die Bankkapazität eines Nutzers. → Rückgabe: `true`

### `loadEconomy(dbPath?)`

Lädt die gesamte Datenbank als Objekt.

### `saveEconomy(db, dbPath?)`

Speichert die übergebene Datenbank.

---

## 🌍 English Version

**economy-phoenix** is a flexible and easy-to-use economy system for Node.js projects. Originally developed for the **Phoenix WhatsApp Bot** – now suitable for all your projects.

### 🚀 Features

- 💰 **Wallet & Bank System**
- 📈 **Upgradeable Bank Capacity (/cookieupgrade)**
- 🎁 **Daily Rewards (/daily)**
- 🔁 **Transfers Between Users (/transfer)**
- 🏴‍☠️ **Rob Other Players (/rob)**
- 🎢 **Extendable for Games (Roulette, Blackjack, etc.)**
- 📂 **Stores in JSON files – no additional database required**

### 📦 Installation

```bash
npm install economy-phoenix
```

### 🔧 Example Usage

```js
const eco = require('economy-phoenix');

const balance = eco.balance('user-id');
console.log(balance);

const deposit = eco.deposit('user-id', 500);
console.log(deposit);

const withdraw = eco.withdraw('user-id', 200);
console.log(withdraw);

const daily = eco.daily('user-id');
console.log(daily);
```

### 📘 API Reference

#### `getUserEconomy(userId, dbPath?)`

Gets or creates user economy data.

```js
{
  wallet: Number,
  bank: Number,
  bankCapacity: Number,
  lastDaily: Number,
  cooldowns: Object
}
```

#### `balance(userId, dbPath?)`

Returns the user's wallet and bank balance.

#### `deposit(userId, amount, dbPath?)`

Deposits money from wallet to bank.

#### `withdraw(userId, amount, dbPath?)`

Withdraws money from bank to wallet.

#### `daily(userId, rewardAmount?, dbPath?)`

Collect daily rewards (default: `999`).

#### `transfer(fromId, toId, amount, dbPath?)`

Transfers balance to another user.

#### `rob(fromId, toId, maxSteal?, dbPath?)`

Attempts to rob another player.

#### `give(userId, amount, dbPath?)`

Adds balance to a user.

#### `deduct(userId, amount, dbPath?)`

Deducts balance from a user.

#### `giveCapacity(userId, capacity, dbPath?)`

Sets a user's bank capacity.

#### `loadEconomy(dbPath?)`

Loads the entire database.

#### `saveEconomy(db, dbPath?)`

Saves the provided database.

### 📄 License

MIT License © 2025 [Exiqon](https://github.com/Exiqonbotz)

