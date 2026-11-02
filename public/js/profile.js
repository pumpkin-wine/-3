async function renderProfile() {
    if (!isClient()) return navigate('catalog');
    await refreshMyBookings();
    const statusNames = { booked: 'Ожидает', confirmed: 'Подтверждено', issued: 'Выдано', returned: 'Возвращено' };
    
    document.getElementById('app').innerHTML = `
        <h2>Личный кабинет</h2>
        <p>Имя: ${currentUser.name}</p>
        <p>Логин: ${currentUser.login}</p>
        <p>Роль: Клиент</p>
        <h3>Мои бронирования</h3>
        ${db.bookings.length === 0 ? '<p>Нет бронирований.</p>' : `
            <table>
                <tr><th>Оборудование</th><th>Даты</th><th>Стоимость</th><th>Статус</th><th>Штраф</th></tr>
                ${db.bookings.map(b => `<tr>
                    <td>${b.item_name}</td>
                    <td>${b.start_date} — ${b.end_date}</td>
                    <td>${b.total_price} ₽</td>
                    <td>${statusNames[b.status] || b.status}</td>
                    <td>${b.penalty > 0 ? b.penalty + ' ₽' : 'Нет'}</td>
                </tr>`).join('')}
            </table>
        `}
    `;
}