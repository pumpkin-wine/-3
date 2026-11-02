let selectedItem = null;

function openBookingModal(id) {
    if (!currentUser) { showToast('Войдите'); return navigate('auth'); }
    selectedItem = db.items.find(i => i.id === id);
    document.getElementById('modal-item-name').innerText = selectedItem.name;
    document.getElementById('book-start').value = '';
    document.getElementById('book-end').value = '';
    document.getElementById('book-total').innerText = '0';
    openModal('modal-booking');
}

function calculatePrice() {
    const s = document.getElementById('book-start').value;
    const e = document.getElementById('book-end').value;
    if (!s || !e) return;
    const days = Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1;
    document.getElementById('book-total').innerText = days > 0 ? days * selectedItem.price : '0';
}

async function confirmBooking() {
    const s = document.getElementById('book-start').value;
    const e = document.getElementById('book-end').value;
    if (!s || !e) return showToast('Выберите даты');
    try {
        await api.post('/bookings', { itemId: selectedItem.id, startDate: s, endDate: e });
        closeModal('modal-booking');
        showToast('Успешно забронировано!');
        await renderCatalog();
    } catch (err) { showToast(err.message); }
}