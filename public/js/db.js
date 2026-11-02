let db = { items: [], users: [], bookings: [], tariffs: { delay_penalty: 1.5, damage_penalty: 50 } };
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

function setCurrentUser(user) {
  currentUser = user;
  if (user) localStorage.setItem('currentUser', JSON.stringify(user));
  else localStorage.removeItem('currentUser');
}

async function refreshItems() { db.items = await api.get('/items'); }
async function refreshTariffs() { db.tariffs = await api.get('/tariffs'); }
async function refreshMyBookings() { db.bookings = await api.get('/bookings/my'); }
async function refreshAllBookings() { db.bookings = await api.get('/bookings/all'); }
async function refreshUsers() { db.users = await api.get('/admin/users'); }