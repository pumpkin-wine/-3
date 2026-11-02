async function renderManager() {
    if (!isManager()) return navigate('catalog');
    await refreshAllBookings();
    
    document.getElementById('app').innerHTML = `
        <h2>Управление заказами</h2>
        ${db.bookings.length === 0 ? '<p>Нет активных заказов.</p>' : `
            <table>
                <tr><th>Клиент</th><th>Товар</th><th>Даты</th><th>Статус</th><th>Действие</th></tr>
                ${db.bookings.map(b => {
                    let btn = '';
                    if (b.status === 'booked') btn = `<button onclick="managerAction(${b.id}, 'confirmed')">Подтвердить</button>`;
                    if (b.status === 'confirmed') btn = `<button onclick="managerAction(${b.id}, 'issued')">Выдать</button>`;
                    if (b.status === 'issued') btn = `<button onclick="managerAction(${b.id}, 'returned')">Принять возврат</button>`;
                    return `<tr>
                        <td>${b.user_name}</td>
                        <td>${b.item_name}</td>
                        <td>${b.start_date} — ${b.end_date}</td>
                        <td>${b.status}</td>
                        <td>${btn}</td>
                    </tr>`;
                }).join('')}
            </table>
        `}
    `;
}

async function managerAction(id, status) {
    let condition;
    if (status === 'issued') {
        condition = prompt("Состояние при выдаче:", "Отличное");
        if (condition === null) return;
    } else if (status === 'returned') {
        condition = prompt("Состояние при возврате:", "Нормальное");
        if (condition === null) return;
    }
    try {
        await api.patch(`/bookings/${id}/status`, { status, condition });
        showToast('Готово');
        await renderManager();
    } catch (e) { showToast(e.message); }
}