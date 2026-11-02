const API_URL = 'https://chat-backend-w8hg.onrender.com'; 
const WS_URL = 'wss://chat-backend-w8hg.onrender.com';

let currentUser = null;
let ws = null;

// DOM элементы
const loginModal = document.getElementById('login-modal');
const nicknameInput = document.getElementById('nickname-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const chatContainer = document.getElementById('chat-container');
const userList = document.getElementById('user-list');
const messagesArea = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// 1. Регистрация пользователя
loginBtn.addEventListener('click', async () => {
    const name = nicknameInput.value.trim();
    if (!name) {
        loginError.textContent = 'Введите никнейм';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/new-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'ok') {
            currentUser = data.user;
            loginModal.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            connectWebSocket();
        } else {
            loginError.textContent = data.message || 'Этот никнейм уже занят';
        }
    } catch (error) {
        loginError.textContent = 'Ошибка соединения с сервером (возможно, он спит)';
        console.error(error);
    }
});

// 2. Работа с WebSocket
function connectWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('WebSocket подключен');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Если пришел массив — это обновленный список пользователей
        if (Array.isArray(data)) {
            renderUserList(data);
        } 
        // Если объект — это сообщение
        else if (data.type === 'send') {
            renderMessage(data);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket отключен');
        // Можно добавить логику переподключения
    };
}

// 3. Отрисовка списка пользователей
function renderUserList(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.name === currentUser.name ? `${user.name} (You)` : user.name;
        userList.appendChild(li);
    });
}

// 4. Отрисовка сообщений
function renderMessage(msgData) {
    const isOwn = msgData.user.id === currentUser.id;
    
    const msgEl = document.createElement('div');
    msgEl.className = `message ${isOwn ? 'own' : 'other'}`;
    
    const authorEl = document.createElement('div');
    authorEl.className = 'msg-author';
    authorEl.textContent = isOwn ? 'You' : msgData.user.name;
    
    const textEl = document.createElement('div');
    textEl.className = 'msg-text';
    textEl.textContent = msgData.message;
    
    msgEl.appendChild(authorEl);
    msgEl.appendChild(textEl);
    messagesArea.appendChild(msgEl);
    
    // Автоскролл вниз
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// 5. Отправка сообщения
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !ws) return;

    const msg = {
        type: 'send',
        message: text,
        user: currentUser
    };

    ws.send(JSON.stringify(msg));
    messageInput.value = '';
});

// 6. Отправка сигнала выхода при закрытии вкладки
window.addEventListener('beforeunload', () => {
    if (ws && ws.readyState === WebSocket.OPEN && currentUser) {
        ws.send(JSON.stringify({ type: 'exit', user: currentUser }));
    }
});