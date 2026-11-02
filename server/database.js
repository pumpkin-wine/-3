const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('rental.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    img TEXT
  );
  
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    total_price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'booked',
    penalty REAL DEFAULT 0,
    condition TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS tariffs (
    id INTEGER PRIMARY KEY,
    delay_penalty REAL NOT NULL DEFAULT 1.5,
    damage_penalty REAL NOT NULL DEFAULT 50
  );
`);

// Сид пользователей
if (db.prepare('SELECT COUNT(*) as c FROM users').get().c === 0) {
  const ins = db.prepare('INSERT INTO users (login, password, role, name) VALUES (?, ?, ?, ?)');
  ins.run('client', bcrypt.hashSync('123', 10), 'client', 'Иван Иванов');
  ins.run('manager', bcrypt.hashSync('123', 10), 'manager', 'Олег Петров');
  ins.run('admin', bcrypt.hashSync('123', 10), 'admin', 'Анна Смирнова');
}

// Сид товаров
if (db.prepare('SELECT COUNT(*) as c FROM items').get().c === 0) {
  const ins = db.prepare('INSERT INTO items (name, category, price, quantity, status, img) VALUES (?, ?, ?, ?, ?, ?)');
  ins.run('Перфоратор Bosch', 'Строительное', 500, 3, 'available', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&q=80');
  ins.run('Палатка 4-местная', 'Туристическое', 300, 5, 'available', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=200&q=80');
  ins.run('Велосипед горный', 'Спортивное', 800, 2, 'available', 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=200&q=80');
  ins.run('Бетономешалка', 'Строительное', 1200, 1, 'repair', 'https://images.unsplash.com/photo-1518734543999-01b4e8d0b774?w=200&q=80');
}

// Сид тарифов
if (db.prepare('SELECT COUNT(*) as c FROM tariffs').get().c === 0) {
  db.prepare('INSERT INTO tariffs (id, delay_penalty, damage_penalty) VALUES (1, 1.5, 50)').run();
}

module.exports = db;