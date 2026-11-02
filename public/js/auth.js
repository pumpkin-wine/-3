function renderAuth() {
    document.getElementById('app').innerHTML = `
        <h2>Вход</h2>
        <div>
            <label>Логин: <input type="text" id="auth-login"></label><br>
            <label>Пароль: <input type="password" id="auth-pass"></label><br>
            <button onclick="login()">Войти</button>
        </div>
        <hr>
        <h3>Регистрация (клиент)</h3>
        <div>
            <label>Имя: <input type="text" id="reg-name"></label><br>
            <label>Логин: <input type="text" id="reg-login"></label><br>
            <label>Пароль: <input type="password" id="reg-pass"></label><br>
            <button onclick="register()">Зарегистрироваться</button>
        </div>
    `;
}

async function login() {
    try {
        const login = document.getElementById('auth-login').value;
        const password = document.getElementById('auth-pass').value;
        const { token, user } = await api.post('/auth/login', { login, password });
        api.setToken(token);
        setCurrentUser(user);
        showToast(`Добро пожаловать, ${user.name}!`);
        navigate(user.role === 'client' ? 'catalog' : 'manager');
        updateNav();
    } catch (e) { showToast(e.message); }
}

async function register() {
    try {
        const name = document.getElementById('reg-name').value;
        const login = document.getElementById('reg-login').value;
        const password = document.getElementById('reg-pass').value;
        await api.post('/auth/register', { name, login, password });
        showToast('Регистрация успешна! Войдите.');
        renderAuth();
    } catch (e) { showToast(e.message); }
}

function logout() {
    api.setToken(null);
    setCurrentUser(null);
    navigate('catalog');
    updateNav();
    showToast('Вы вышли');
}