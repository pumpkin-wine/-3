async function renderAdmin() {
    if (!isAdmin()) return navigate('catalog');
    await Promise.all([refreshItems(), refreshUsers(), refreshTariffs()]);
    const stats = await api.get('/admin/stats');
    const maxCount = Math.max(stats.bookedCount, stats.issuedCount, 1);

    document.getElementById('app').innerHTML = `
        <h2>Панель администратора</h2>
        <p>Выручка: <b>${stats.revenue} ₽</b></p>
        <p>Пользователей: ${stats.usersCount}</p>
        <p>Заказов в работе: ${stats.issuedCount}</p>

        <h3>Статистика</h3>
        <div>Ожидают: ${stats.bookedCount} <div style="background:blue; height:10px; width:${(stats.bookedCount/maxCount)*100}%;"></div></div>
        <div>Выдано: ${stats.issuedCount} <div style="background:green; height:10px; width:${(stats.issuedCount/maxCount)*100}%;"></div></div>

        <h3>Добавить товар</h3>
        <div>
            <input type="text" id="add-name" placeholder="Название">
            <input type="number" id="add-price" placeholder="Цена">
            <input type="number" id="add-qty" placeholder="Кол-во">
            <input type="text" id="add-cat" placeholder="Категория">
            <button onclick="addItem()">Добавить</button>
        </div>

        <h3>Склад</h3>
        <table>
            <tr><th>Название</th><th>Цена</th><th>Кол-во</th><th>Статус</th></tr>
            ${db.items.map(i => `<tr>
                <td>${i.name}</td>
                <td>${i.price} ₽</td>
                <td>${i.quantity}</td>
                <td>
                    <select onchange="changeItemStatus(${i.id}, this.value)">
                        <option value="available" ${i.status === 'available' ? 'selected' : ''}>В работе</option>
                        <option value="repair" ${i.status === 'repair' ? 'selected' : ''}>В ремонте</option>
                        <option value="written_off" ${i.status === 'written_off' ? 'selected' : ''}>Списано</option>
                    </select>
                </td>
            </tr>`).join('')}
        </table>

        <h3>Сотрудники</h3>
        <div>
            <input type="text" id="emp-name" placeholder="Имя">
            <input type="text" id="emp-login" placeholder="Логин">
            <select id="emp-role">
                <option value="manager">Менеджер</option>
                <option value="admin">Администратор</option>
            </select>
            <button onclick="addEmployee()">Добавить</button>
        </div>
        <table>
            <tr><th>Имя</th><th>Логин</th><th>Роль</th><th>Действие</th></tr>
            ${db.users.filter(u => u.role !== 'client').map(u => `<tr>
                <td>${u.name}</td>
                <td>${u.login}</td>
                <td>${u.role}</td>
                <td><button onclick="deleteEmployee(${u.id})">Удалить</button></td>
            </tr>`).join('')}
        </table>

        <h3>Тарифы</h3>
        <div>
            Просрочка (x): <input type="number" step="0.1" value="${db.tariffs.delay_penalty}" 
                onchange="updateTariff('delay_penalty', this.value)"><br>
            Повреждение (%): <input type="number" value="${db.tariffs.damage_penalty}" 
                onchange="updateTariff('damage_penalty', this.value)">
        </div>
    `;
}

async function changeItemStatus(id, status) {
    await api.patch(`/admin/items/${id}`, { status });
    showToast('Статус изменён');
    await renderAdmin();
}

async function addItem() {
    try {
        await api.post('/admin/items', {
            name: document.getElementById('add-name').value,
            price: Number(document.getElementById('add-price').value),
            quantity: Number(document.getElementById('add-qty').value),
            category: document.getElementById('add-cat').value,
        });
        showToast('Товар добавлен');
        await renderAdmin();
    } catch (e) { showToast(e.message); }
}

async function addEmployee() {
    try {
        await api.post('/admin/users', {
            name: document.getElementById('emp-name').value,
            login: document.getElementById('emp-login').value,
            role: document.getElementById('emp-role').value,
        });
        showToast('Сотрудник добавлен (пароль: 123)');
        await renderAdmin();
    } catch (e) { showToast(e.message); }
}

async function deleteEmployee(id) {
    if (!confirm('Удалить сотрудника?')) return;
    try {
        await api.delete(`/admin/users/${id}`);
        showToast('Удалён');
        await renderAdmin();
    } catch (e) { showToast(e.message); }
}

async function updateTariff(key, value) {
    const t = { ...db.tariffs, [key]: Number(value) };
    await api.patch('/admin/tariffs', {
        delay_penalty: t.delay_penalty,
        damage_penalty: t.damage_penalty,
    });
    showToast('Тариф обновлён');
}