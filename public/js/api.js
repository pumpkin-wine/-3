const api = {
  getToken() { return localStorage.getItem('token'); },
  setToken(t) { t ? localStorage.setItem('token', t) : localStorage.removeItem('token'); },
  
  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const url = path.startsWith('/api') ? path : '/api' + path;

    const res = await fetch(url, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.reload();
        return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
    return data;
  },
  get(p) { return this.request('GET', p); },
  post(p, b) { return this.request('POST', p, b); },
  patch(p, b) { return this.request('PATCH', p, b); },
  delete(p) { return this.request('DELETE', p); },
};