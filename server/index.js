const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rental-dev-secret-change-me';

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Middleware авторизации ---
function auth(roles = []) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Нет доступа' });
      }
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Неверный токен' });
    }
  };
}

// ========== AUTH ==========
app.post('/api/auth/register', (req, res) => {
  const { name, login, password } = req.body;
  if (!name || !login || !password) return res.status(400).json({ error: 'Заполните все поля' });
  if (db.prepare('SELECT id FROM users WHERE login = ?').get(login)) {
    return res.status(400).json({ error: 'Логин занят' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users (login, password, role, name) VALUES (?, ?, ?, ?)')
    .run(login, hash, 'client', name);
  res.json({ id: r.lastInsertRowid, login, role: 'client', name });
});

app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = jwt.sign(
    { id: user.id, login: user.login, role: user.role, name: user.name },
    JWT_SECRET, { expiresIn: '24h' }
  );
  res.json({ token, user: { id: user.id, login: user.login, role: user.role, name: user.name } });
});

// ========== ITEMS (public) ==========
app.get('/api/items', (req, res) => {
  const { category, search } = req.query;
  const conds = [], params = [];
  if (category && category !== 'all') { conds.push('category = ?'); params.push(category); }
  if (search) { conds.push('name LIKE ?'); params.push(`%${search}%`); }
  const sql = 'SELECT * FROM items' + (conds.length ? ' WHERE ' + conds.join(' AND ') : '');
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/tariffs', (req, res) => {
  res.json(db.prepare('SELECT * FROM tariffs WHERE id = 1').get());
});

// ========== BOOKINGS ==========
app.post('/api/bookings', auth(), (req, res) => {
  const { itemId, startDate, endDate } = req.body;
  if (!itemId || !startDate || !endDate) return res.status(400).json({ error: 'Не все поля' });
  
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Товар не найден' });
  if (item.status !== 'available' || item.quantity === 0) return res.status(400).json({ error: 'Товар недоступен' });

  // Проверка пересечения дат на уровне БД
  const overlaps = db.prepare(`
    SELECT COUNT(*) as c FROM bookings 
    WHERE item_id = ? AND status != 'returned'
    AND date(?) <= date(end_date) AND date(?) >= date(start_date)
  `).get(itemId, endDate, startDate).c;

  if (overlaps >= item.quantity) {
    return res.status(400).json({ error: 'На выбранные даты всё оборудование занято' });
  }

  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
  const total = days * item.price;

  const r = db.prepare(`
    INSERT INTO bookings (item_id, user_id, start_date, end_date, total_price, status)
    VALUES (?, ?, ?, ?, ?, 'booked')
  `).run(itemId, req.user.id, startDate, endDate, total);

  res.json({ id: r.lastInsertRowid, totalPrice: total });
});

app.get('/api/bookings/my', auth(), (req, res) => {
  res.json(db.prepare(`
    SELECT b.*, i.name as item_name FROM bookings b
    JOIN items i ON b.item_id = i.id
    WHERE b.user_id = ? ORDER BY b.id DESC
  `).all(req.user.id));
});

app.get('/api/bookings/all', auth(['manager', 'admin']), (req, res) => {
  res.json(db.prepare(`
    SELECT b.*, i.name as item_name, i.price as item_price, u.name as user_name
    FROM bookings b
    JOIN items i ON b.item_id = i.id
    JOIN users u ON b.user_id = u.id
    WHERE b.status != 'returned'
    ORDER BY b.id DESC
  `).all());
});

app.patch('/api/bookings/:id/status', auth(['manager', 'admin']), (req, res) => {
  const { status, condition } = req.body;
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Не найдено' });
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(booking.item_id);

  if (status === 'issued') {
    // ИСПРАВЛЕНИЕ 1: Защита от ухода в минус
    if (item.quantity < 1) {
        return res.status(400).json({ error: 'На складе нет свободных единиц!' });
    }
    db.prepare('UPDATE items SET quantity = quantity - 1 WHERE id = ?').run(booking.item_id);
    db.prepare('UPDATE bookings SET status = ?, condition = ? WHERE id = ?')
      .run('issued', condition || 'Отличное', req.params.id);
  } 
  else if (status === 'returned') {
    db.prepare('UPDATE items SET quantity = quantity + 1 WHERE id = ?').run(booking.item_id);
    let penalty = 0;
    
    // ИСПРАВЛЕНИЕ 2: Корректное сравнение дат (без учета времени)
    const today = new Date().toISOString().slice(0, 10); // Получаем YYYY-MM-DD
    const end_date = booking.end_date.slice(0, 10);      // Отрезаем время, если есть
    const tariff = db.prepare('SELECT * FROM tariffs WHERE id = 1').get();

    if (today > end_date) {
      const daysLate = Math.ceil((new Date(today) - new Date(end_date)) / 86400000);
      penalty += daysLate * item.price * tariff.delay_penalty;
    }
    
    const lower = (condition || '').toLowerCase();
    if (lower !== 'нормальное' && lower !== 'отличное') {
      penalty += item.price * (tariff.damage_penalty / 100);
    }
    db.prepare('UPDATE bookings SET status = ?, penalty = ?, condition = ? WHERE id = ?')
      .run('returned', penalty, condition || 'Нормальное', req.params.id);
  }
  else if (status === 'confirmed') {
    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('confirmed', req.params.id);
  }
  res.json({ ok: true });
});

// ========== ADMIN ==========
app.get('/api/admin/stats', auth(['admin']), (req, res) => {
  res.json({
    revenue: db.prepare('SELECT COALESCE(SUM(total_price + penalty), 0) as v FROM bookings').get().v,
    usersCount: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    bookedCount: db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'booked'").get().c,
    issuedCount: db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'issued'").get().c,
  });
});

app.get('/api/admin/users', auth(['admin']), (req, res) => {
  res.json(db.prepare('SELECT id, login, role, name FROM users').all());
});

app.post('/api/admin/users', auth(['admin']), (req, res) => {
  const { name, login, role } = req.body;
  if (!name || !login || !role) return res.status(400).json({ error: 'Заполните поля' });
  if (db.prepare('SELECT id FROM users WHERE login = ?').get(login)) {
    return res.status(400).json({ error: 'Логин занят' });
  }
  const hash = bcrypt.hashSync('123', 10);
  const r = db.prepare('INSERT INTO users (login, password, role, name) VALUES (?, ?, ?, ?)')
    .run(login, hash, role, name);
  res.json({ id: r.lastInsertRowid, name, login, role });
});

app.delete('/api/admin/users/:id', auth(['admin']), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Не найден' });
  if (user.login === 'admin') return res.status(400).json({ error: 'Нельзя удалить главного админа' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/items', auth(['admin']), (req, res) => {
  const { name, price, quantity, category } = req.body;
  if (!name || !price || !quantity || !category) {
    return res.status(400).json({ error: 'Заполните поля' });
  }
  const r = db.prepare('INSERT INTO items (name, category, price, quantity, status, img) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, category, price, quantity, 'available',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&q=80');
  res.json({ id: r.lastInsertRowid });
});

app.patch('/api/admin/items/:id', auth(['admin']), (req, res) => {
  db.prepare('UPDATE items SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

app.patch('/api/admin/tariffs', auth(['admin']), (req, res) => {
  const { delay_penalty, damage_penalty } = req.body;
  db.prepare('UPDATE tariffs SET delay_penalty = ?, damage_penalty = ? WHERE id = 1')
    .run(delay_penalty, damage_penalty);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
});