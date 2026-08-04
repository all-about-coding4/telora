  <script>
    (function() {
      // --- helpers ---
      const client = new LynkClient((location.protocol === "https:" ? "wss://" : "ws://") + location.host);
      
      const toastEl = document.getElementById('toast');
      const toastMsg = document.getElementById('toastMsg');
      function showToast(text, icon = 'fa-info-circle') {
        toastMsg.innerText = text;
        toastEl.innerHTML = `<i class="far ${icon}"></i> <span>${text}</span>`;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 3000);
      }
      
      function escapeHTML(u) {
        return u.replace(/[&<>"]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[m]);
      }
      
      localStorage.clear();
     
  let isLoggedIn = false;
  
  let isConnected = false;
  const regError = document.getElementById('regError');

// handle lynk conection for improving 1 page social media

async function init_client() {
  try {
    await client.connect();
    isConnected = true;

    if (isLoggedIn) {
      showToast("connected");
    } else {
      regError.style.color = "green";
      regError.textContent = "connected";
      document.getElementById('registerBtn').disabled = false;
    }

  } catch (err) {
    console.log(err);
    isConnected = false;

    if (isLoggedIn) {
      showToast("connection failed, retrying...");
    } else {
      regError.style.color = "red";
      regError.textContent = "connecting Failed retrying after 1s";
      document.getElementById('registerBtn').disabled = true;
    }
  }
}

setInterval(() => { if (!isConnected) init_client(); }, 1000);


showRegistration();
      // --- user registration ---

      function showRegistration() {
        const modal = document.getElementById('registerModal');
        modal.classList.add('active');
        document.getElementById('regError').innerText = '';
        const registerBtn = document.getElementById('registerBtn');
        registerBtn.onclick = () => {
          const password = document.getElementById('regPassword').value.trim();
          const username = document.getElementById('regUsername').value.trim();
          if (!username) {
            document.getElementById('regError').innerText = 'username cannot be empty';
            return;
          }
          if (!password) {
            document.getElementById('regError').innerText = 'password cannot be empty';
            return;
          }
          registerBtn.disabled = true;
          registerBtn.textContent = "";
          client.emit('addUser', { username, password });
          
          //localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
          
          document.getElementById('userDisplayName').textContent = username;
          
          modal.classList.remove('active');
          if (peerId) document.getElementById('peerIdLabel').textContent = peerId;
        };
      }
      
  client.on('loginDenied', (data)=>{
    regError.style.color = "red";
    regError.textContent = data.msg;
  });

      // --- friends list ---
      let friends = [];
      function loadFriends() {
        const stored = localStorage.getItem(FRIENDS_KEY);
        renderFriendList();
      }
      function saveFriends() { localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends)); }

      function renderFriendList() {
        const container = document.getElementById('friendListVertical');
        if (!container) return;
        if (friends.length === 0) {
          container.innerHTML = '<div style="color:#a0aec0; padding:1rem; text-align:center;">— no friends yet —</div>';
          
          return;
        }
        let html = '';
        friends.forEach((f, idx) => {
          const letter = f.username.charAt(0).toUpperCase();
          html += `<div class="friend-row" data-friend-id="${f.id}" data-friend-name=" ${f.username}">
            <div class="friend-avatar">${letter}</div>
            <div class="friend-row-info">
              <div class="friend-name">${escapeHTML(f.username)}</div>
              <div class="friend-id" title="${f.id}">${escapeHTML(f.id)}</div>
            </div>
            <button class="remove-friend" data-index="${idx}" data-name="${escapeHTML(f.username)}" title="remove friend"><i class="fas fa-times"></i></button>
          </div>`;
        });
        container.innerHTML = html;

        document.querySelectorAll('.remove-friend').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = btn.dataset.index;
            const name = btn.dataset.name;
            showRemoveConfirmation(idx, name);
          });
        });

        document.querySelectorAll('.friend-row').forEach(row => {
          row.addEventListener('click', (e) => {
            if (e.target.closest('.remove-friend')) return;
            const fid = row.dataset.friendId;
            const fname = row.dataset.friendName;
            if (fid) openChatModal(fid, fname);
          });
        });
      }

      // --- remove confirmation ---
      const confirmModal = document.getElementById('confirmRemoveModal');
      const removeFriendNameSpan = document.getElementById('removeFriendName');
      let pendingRemoveIndex = null;

      function showRemoveConfirmation(index, name) {
        pendingRemoveIndex = index;
        removeFriendNameSpan.innerText = name;
        confirmModal.classList.add('active');
      }

      document.getElementById('confirmRemoveBtn').addEventListener('click', () => {
        if (pendingRemoveIndex !== null) {
          friends.splice(pendingRemoveIndex, 1);
          saveFriends();
          renderFriendList();
          showToast('friend removed', 'fa-check-circle');
          confirmModal.classList.remove('active');
          pendingRemoveIndex = null;
          if (activeFriendId && !friends.some(f => f.id === activeFriendId)) {
            closeChatModal();
          }
        }
      });
      document.getElementById('cancelRemoveBtn').addEventListener('click', () => {
        confirmModal.classList.remove('active');
        pendingRemoveIndex = null;
      });

      // --- recent chats ---
      let recentPeers = [];
      
      function loadRecent() {
        const stored = localStorage.getItem(RECENT_KEY);
        if (stored) recentPeers = JSON.parse(stored); else recentPeers = [];
        renderRecent();
      }
      
      function saveRecent() { localStorage.setItem(RECENT_KEY, JSON.stringify(recentPeers)); }
      
      function addRecent(peerId, peerName) {
        if (!peerId) return;
        recentPeers = recentPeers.filter(r => r.id !== peerId);
        recentPeers.unshift({ id: peerId, name: peerName || peerId.slice(0,5) });
        if (recentPeers.length > 8) recentPeers.pop();
        saveRecent();
        renderRecent();
      }
      
      function renderRecent() {
        const container = document.getElementById('recentList');
        if (!container) return;
        if (recentPeers.length === 0) { container.innerHTML = '<div style="color:#b5c2d6;">no recent</div>'; return; }
        let html = '';
        recentPeers.forEach(r => {
          html += `<div class="recent-chip" data-id="${r.id}"><i class="far fa-user"></i> ${escapeHTML(r.name)}</div>`;
        });
        container.innerHTML = html;
        document.querySelectorAll('.recent-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const rid = chip.dataset.id;
            if (rid) {
              const friend = friends.find(f => f.id === rid);
              openChatModal(rid, friend ? friend.username : rid.slice(0,5));
            }
          });
        });
      }

      // --- peer & connection ---
      let peerId = null;
      const peerIdSpan = document.getElementById('peerIdLabel');
      const remotePeerInput = document.getElementById('remotePeerId');
      const connectBtn = document.getElementById('connectBtn');
      const connectionStatus = document.getElementById('connectionStatus');
      const copyBtn = document.getElementById('copyPeerIdBtn');

      function setConnStatus(icon, text) {
        connectionStatus.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
      }

      connectBtn.addEventListener('click', () => {
        const remoteId = remotePeerInput.value.trim();
        if (!remoteId) { showToast('enter friend ID', 'fa-exclamation-circle'); return; }
        if (conn) conn.close();
        const newConn = peer.connect(remoteId);
        if (newConn) { setupConn(newConn); }
        else { showToast('cannot connect to peer', 'fa-exclamation-triangle'); }
      });

      copyBtn.addEventListener('click', () => {
        if (peerId) {
          navigator.clipboard.writeText(peerId).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => copyBtn.innerHTML = '<i class="far fa-copy"></i>', 1500);
          });
        }
      });

      // --- chat modal logic (Telegram behaviour) ---
      const modalOverlay = document.getElementById('chatModalOverlay');
      const chatModal = document.getElementById('chatModal');
      const closeModalBtn = document.getElementById('closeChatModal');
      const chatFriendNameSpan = document.getElementById('chatFriendName');
      const container = document.getElementById('messageContainer');
      const inputField = document.getElementById('messageInput');
      const sendBtn = document.getElementById('sendMessageBtn');
      const attachBtn = document.getElementById('attachImageBtn');
      const fileInput = document.getElementById('imageUpload');
      let messages = [];
      let activeFriendId = null;

      function openChatModal(friendId, friendName) {
        activeFriendId = friendId;
        chatFriendNameSpan.innerText = `Chat with ${friendName}`;
        messages = [];
        renderMessages();
        modalOverlay.classList.add('active');
        inputField.disabled = false;
        attachBtn.disabled = false;
        sendBtn.disabled = false;
        inputField.focus();

        if (conn) conn.close();
        const newConn = peer.connect(friendId);
        if (newConn) { setupConn(newConn); }
        else { showToast('cannot connect to peer', 'fa-exclamation-triangle'); }
      }

      function closeChatModal() {
        modalOverlay.classList.remove('active');
        activeFriendId = null;
      }

      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeChatModal();
      });
      closeModalBtn.addEventListener('click', closeChatModal);

      function formatTime(d) {
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      }

      function renderMessages() {
        let html = '';
        for (let msg of messages) {
          const timeStr = formatTime(new Date(msg.timestamp));
          const wrapperClass = msg.sender === 'me' ? 'message-wrapper me' : 'message-wrapper other';
          if (msg.type === 'text') {
            html += `<div class="${wrapperClass}">
              <div class="message-bubble">
                <div class="bubble-content">
                  <span class="message-text">${escapeHTML(msg.content)}</span>
                  <span class="timestamp">${timeStr}</span>
                </div>
              </div>
            </div>`;
          } else {
            html += `<div class="${wrapperClass}">
              <div class="message-bubble">
                <div class="bubble-content">
                  <img src="${escapeHTML(msg.content)}" alt="image" class="message-image" loading="lazy">
                  <span class="timestamp">${timeStr}</span>
                </div>
              </div>
            </div>`;
          }
        }
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
      }

      function addMessage(sender, type, content, skipSend = false) {
        const newMsg = { id: Date.now()+''+Math.random(), sender, type, content, timestamp: new Date() };
        messages.push(newMsg);
        renderMessages();
        if (conn && sender === 'me' && !skipSend) conn.send({ type, content });
        if (conn && sender === 'me' && conn.peer) {
          const remoteId = conn.peer;
          const friend = friends.find(f => f.id === remoteId);
          addRecent(remoteId, friend ? friend.username : remoteId.slice(0,5));
        }
      }

      function handleSendText() {
        if (!activeFriendId) { closeChatModal(); return; }
        const text = inputField.value.trim();
        if (!text) return;
        addMessage('me', 'text', text);
        inputField.value = '';
      }

      function handleImageUpload(file) {
        if (!activeFriendId) { closeChatModal(); return; }
        if (!file || !file.type.startsWith('image/')) {
          showToast('please select an image', 'fa-image'); return;
        }
        const reader = new FileReader();
        reader.onload = (e) => { addMessage('me', 'image', e.target.result); fileInput.value = ''; };
        reader.readAsDataURL(file);
      }

      sendBtn.addEventListener('click', handleSendText);
      inputField.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } });
      attachBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); });

      // lightbox
      const lightbox = document.getElementById('lightbox');
      const lightboxImg = document.getElementById('lightboxImg');
      const lightboxClose = document.getElementById('lightboxClose');
      container.addEventListener('click', (e) => {
        const img = e.target.closest('.message-image');
        if (!img) return;
        lightboxImg.src = img.src;
        lightbox.classList.add('active');
      });
      lightboxClose.addEventListener('click', () => { lightbox.classList.remove('active'); lightboxImg.src = ''; });
      lightbox.addEventListener('click', (e) => { if (e.target === lightbox) { lightbox.classList.remove('active'); lightboxImg.src = ''; } });

      // add friend modal
      const addModal = document.getElementById('addFriendModal');
      document.getElementById('showAddFriendModal').addEventListener('click', () => {
        document.getElementById('friendIdInput').value = '';
        document.getElementById('friendNameInput').value = '';
        document.getElementById('friendError').innerText = '';
        addModal.classList.add('active');
      });
      document.getElementById('closeAddFriendModal').addEventListener('click', () => addModal.classList.remove('active'));
      document.getElementById('saveFriendBtn').addEventListener('click', () => {
        const id = document.getElementById('friendIdInput').value.trim();
        const name = document.getElementById('friendNameInput').value.trim();
        const errDiv = document.getElementById('friendError');
        if (!id || !name) { errDiv.innerText = 'both fields required'; return; }
        if (friends.some(f => f.id === id)) { errDiv.innerText = 'duplicate friend ID'; return; }
        friends.push({ id, username: name });
        saveFriends();
        renderFriendList();
        addModal.classList.remove('active');
        showToast('friend added', 'fa-check-circle');
      });

      // initialise
      init_client();
      loadFriends();
      loadRecent();
    })();
  </script>