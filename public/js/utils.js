function showToast(msg) { alert(msg); }
function openModal(id) { document.getElementById(id).style.display = 'block'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function isAdmin() { return currentUser && currentUser.role === 'admin'; }
function isManager() { return currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin'); }
function isClient() { return currentUser && currentUser.role === 'client'; }