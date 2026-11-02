async function navigate(view) {
    document.getElementById('app').innerHTML = '<p>Загрузка...</p>';
    try {
        switch (view) {
            case 'catalog': await renderCatalog(); break;
            case 'auth': renderAuth(); break;
            case 'profile': await renderProfile(); break;
            case 'manager': await renderManager(); break;
            case 'admin': await renderAdmin(); break;
        }
    } catch (e) {
        document.getElementById('app').innerHTML = `<p style="color:red;">Ошибка: ${e.message}</p>`;
    }
}

function updateNav() {
    const auth = !!currentUser;
    document.getElementById('link-profile').style.display = (auth && currentUser.role === 'client') ? 'inline' : 'none';
    document.getElementById('link-manager').style.display = (auth && (currentUser.role === 'manager' || currentUser.role === 'admin')) ? 'inline' : 'none';
    document.getElementById('link-admin').style.display = (auth && currentUser.role === 'admin') ? 'inline' : 'none';
    document.getElementById('link-login').style.display = auth ? 'none' : 'inline';
    document.getElementById('link-logout').style.display = auth ? 'inline' : 'none';
    document.getElementById('user-name-display').innerText = auth ? currentUser.name : '';
}

window.onload = () => {
    updateNav();
    navigate('catalog');
};