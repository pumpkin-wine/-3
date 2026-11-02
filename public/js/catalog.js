let searchQuery = '';
let selectedCategory = 'all';

async function renderCatalog() {
    await refreshItems();
    const categories = ['all', ...new Set(db.items.map(i => i.category))];
    document.getElementById('app').innerHTML = `
        <h2>Каталог оборудования</h2>
        <div>
            <label>Поиск: <input type="text" id="search-input" value="${searchQuery}" oninput="handleSearch(this.value)"></label>
            <label>Категория: 
                <select onchange="handleCategory(this.value)">
                    ${categories.map(c => `<option value="${c}" ${selectedCategory === c ? 'selected' : ''}>${c === 'all' ? 'Все' : c}</option>`).join('')}
                </select>
            </label>
        </div>
        <div id="catalog-grid"></div>
    `;
    renderCatalogItems();
}

function handleSearch(v) { searchQuery = v; renderCatalogItems(); }
function handleCategory(v) { selectedCategory = v; renderCatalogItems(); }

function renderCatalogItems() {
    const filtered = db.items.filter(i => {
        const s = i.name.toLowerCase().includes(searchQuery.toLowerCase());
        const c = selectedCategory === 'all' || i.category === selectedCategory;
        return s && c;
    });
    const grid = document.getElementById('catalog-grid');
    if (!filtered.length) { grid.innerHTML = '<p>Ничего не найдено.</p>'; return; }
    grid.innerHTML = filtered.map(item => `
        <div class="card">
            <img src="${item.img}" alt="${item.name}" style="max-width:200px; max-height:150px;"><br>
            <b>${item.name}</b><br>
            Категория: ${item.category}<br>
            Цена: ${item.price} ₽/сутки<br>
            В наличии: ${item.quantity} шт. (${item.status === 'available' ? 'доступно' : item.status})<br>
            <button onclick="${currentUser ? `openBookingModal(${item.id})` : `navigate('auth')`}" 
                ${item.status !== 'available' || item.quantity === 0 ? 'disabled' : ''}>
                ${currentUser ? 'Забронировать' : 'Войти для брони'}
            </button>
        </div>
    `).join('');
}