import telegramApi from "./telegram-api.js";
import user_dataset from "../dataset-src/index.js";

const ss_input = document.getElementById("messageInput");
const ss_button = document.getElementById("sendMessageBtn");

const audioPicker = document.getElementById("audioPicker");

// Open the picker
function openAudioPicker() {
  audioPicker.value = ""; // Optional: allows selecting the same file again
  audioPicker.click();
}

const copyBtn = document.getElementById("copyPeerIdBtn");

const bot_username = document.getElementById("peerIdLabel");

const copyBtnFeedBack = document.getElementById("copyFeedback");

copyBtn.addEventListener("click", async ()=> {
  const user_botoken = localStorage.getItem("bot_token");

  if(!user_botoken){
    console.log("no bot token");
    return;
  }

  const user_db = new user_dataset("telora_user_db");

  const data = await user_db.select_from("user", "user_data");
  const url = `https://t.me/${data.username}/`;

  await copyPeerId(url);
});

async function copyPeerId(text) {

  if (!text) {
    showToast(toastMsg, toastEl, 'failed to copy', 'fa-circle-exclamation', 'fa-solid');
    return;
  }

  // Modern clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showCopyFeedback())
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-100px';
  textarea.style.left = '-100px';
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (success) showCopyFeedback();
  else console.warn('Fallback copy failed');
}

function showCopyFeedback() {
  copyBtnFeedBack.classList.add('show');
  setTimeout(() => copyBtnFeedBack.classList.remove('show'), 1500);
}


let recent_chat = safeParse(localStorage.getItem("recent_chat"), []);

let current_chat = null;

function handleMessage(sender, type, content, time){
  if(!sender || !type || !content) return;

  const room = current_chat_room;

  const message = { sender, type, content, time, room };

  // ✅ store locally FIRST
  if (!messages[room]) messages[room] = [];
  messages[room].push(message);

  localStorage.setItem("messages", JSON.stringify(messages));

  // ✅ then render
  renderMessages(message);
}

function formatTelegramDate(unixTime) {
  if (!unixTime) return "Unknown";
  
  const date = new Date(unixTime * 1000);
  
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}



async function renderMessages(messages, user_db, state="") {
  if (!Array.isArray(messages)) {
    messages = [messages];
  }

  let html = '';

  for (let msg of messages) {
    
    const user_data = await user_db.select_from("user", "user_data");

    const timeStr = msg.date || "just now";  
    const wrapperClass = msg.chat_id === user_data.id 
      ? 'message-wrapper me' 
      : 'message-wrapper other';

    if (msg.type === 'text') {
      html += `<div class="${wrapperClass}">
        <div class="message-bubble">  
          <div class="bubble-content">  
            <span class="message-text" data-full="${escapeHTML(msg.message)}">${formatMessagePreview(msg.message)}</span>  
            <span class="timestamp">${formatTelegramDate(timeStr)} <span data-message-id="${msg.message_id}"><i class="fa-solid ${state === "pending" ? "fa-clock" : "fa-check"}"></i></span></span>  
          </div>  
        </div>  
      </div>`;
    } else if (msg.type === "image") {
      html += `<div class="${wrapperClass}">  
        <div class="message-bubble">  
          <div class="bubble-content">  
            <img src="${msg.message}" alt="image" class="message-image" loading="lazy">  
            <span class="timestamp">${formatTelegramDate(timeStr)} <span data-message-id="${msg.message_id}"><i class="fa-solid ${state === "pending" ? "fa-clock" : "fa-check"}"></i></span></span>  
          </div>  
        </div>  
      </div>`;
    } else if (msg.type === "video") {
      html += `<div class="${wrapperClass}">  
        <div class="message-bubble">  
          <div class="bubble-content">  
            <video src="${msg.message}" alt="video" class="message-image" controls playsinline preload="metadata" ></video> 
            <span class="timestamp">${formatTelegramDate(timeStr)} <span data-message-id="${msg.message_id}"><i class="fa-solid ${state === "pending" ? "fa-clock" : "fa-check"}"></i></span></span>  
          </div>  
        </div>  
      </div>`;
   } else if (msg.type === "audio") {
     html += `<div class="${wrapperClass}">  
        <div class="message-bubble">  
          <div class="bubble-content">  
            <audio src="${msg.message}" preload="metadata" class="message-image" controls></audio>  
            <span class="timestamp">${formatTelegramDate(timeStr)} <span data-message-id="${msg.message_id}"><i class="fa-solid ${state === "pending" ? "fa-clock" : "fa-check"}"></i></span></span>  
          </div>  
        </div>  
      </div>`;
}
  }

  messageContainer.insertAdjacentHTML('beforeend', html);
  messageContainer.scrollTop = messageContainer.scrollHeight;
  
  console.log("message added");
}
      

function showRegisterModal(registerModal){
  if(registerModal && !registerModal.classList.contains('active')){
    registerModal.classList.add('active');
  }
}

function hideRegisterModal(registerModal){
  if(registerModal && registerModal.classList.contains("active")){
    registerModal.classList.remove('active');
  }
}

function showError(div, text, color){
  if(div && text){
    div.textContent = text;
    div.style.color = color || "red";
    div.style.display = "block";
  }
}

function hideError(div){
  if(!div){
    return;
  }
  
  div.style.display = "none";
}

function showToast(toastMsg, toastEl, text, icon = 'fa-info-circle', style = 'far'){
  if(toastMsg && toastEl){
    toastMsg.innerText = text;  
    toastEl.innerHTML = `<i class="${style} ${icon}"></i> <span>${text}</span>`;  
    toastEl.classList.add('show');  
    setTimeout(() => toastEl.classList.remove('show'), 3000);
  }
}

async function renderFriendList(container, user_db) {
  console.log("rendering friend");
  if (!container && !user_db) return;
  
  const friendsData = await user_db.select_from("friends", "friend_data");
  const friends = Object.values(friendsData || {});
  
  console.log(`render friends ${friends}`);
  
  console.log("friends:", friends);

console.log("isArray:", Array.isArray(friends));

console.log("length:", friends?.length);

console.log("type:", typeof friends);
  
  if (!friends || !Array.isArray(friends) || friends.length === 0) {
    container.innerHTML = `
      <div style="color:#a0aec0; padding:1rem; text-align:center;">
        — no contacts yet —
      </div>
    `;
    return;
  }
  
  let html = "";
  
  for (const friend of friends) {
    const letter = (friend.first_name || "?").charAt(0).toUpperCase();
    const chatRoom = friend.id;
    
    html += `
      <div class="friend-row"
           data-room="${chatRoom}"
           data-friend-name="${friend.first_name}">
        <div class="friend-avatar">${letter}</div>

        <div class="friend-row-info">
          <div class="friend-name">
            ${escapeHTML(friend.first_name || "")}
          </div>

          <div class="friend-id" title="${chatRoom}">
            ${friend.addedat || "recently"}
          </div>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
 // saveRecent();
  //renderRecent(recentList);
  
  document.querySelectorAll(".friend-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".remove-friend")) return;
      
      const room = row.dataset.room;
      const fname = row.dataset.friendName;
      
      openChatModal(room, fname, user_db);
    });
  });
}



async function openChatModal(room, friendName, user_db) {
  if (!room || !friendName) return;
  
  const user_data = await user_db.select_from("user", "user_data");
  
  document.getElementById("chatFriendName").innerText = friendName;
  
  const avatar = document.getElementById("chatAvatar");
  avatar.textContent = friendName.charAt(0).toUpperCase();
  
  current_chat = room;
  
  await loadMessages(room, user_db);
  
  chatModalOverlay.classList.add("active");
  
  addRecent(room, friendName, user_db);
  
  document.getElementById("closeChatModal").onclick = async () => {
    await hideChatModal();
  };
  
  const attachImageBtn = document.getElementById("attachImageBtn");
  mediaPicker(attachImageBtn, room);
  
  // Send button
  ss_button.onclick = async () => {
    const text = ss_input.value.trim();
    
    if (text) {
      ss_button.disabled = true;
      
      try {
        await telegramApi.send_message("text", room, text);
      } finally {
        ss_button.disabled = false;
      }
      
    } else {
      openAudioPicker();
    }
  };
  
  // Audio picker
  audioPicker.onchange = async () => {
    const file = audioPicker.files[0];
    if (!file) return;
    
    await telegramApi.send_message("audio", room, file);
  };
  
  console.log("chat is open");
}

async function get_current_chat() {
  return current_chat;
}

async function hideChatModal(){
 
  chatModalOverlay.classList.remove('active');
}
    
    

function renderUserData(user_data){
  if(user_data){
    peerIdLabel.textContent = user_data.uni_name;
    console.log(user_data.uni_name);
    userDisplayName.textContent = user_data.full_name;
  }
}


async function renderRecent(user_db) {
  const recentList = document.getElementById('recentList');
  
  if (!recent_chat || recent_chat.length === 0) {
    recentList.innerHTML = '<div style="color:#b5c2d6;">no recent chat</div>';
    return;
  }

  let html = ''; 
  recent_chat.forEach(r => {
    html += `<div class="recent-chip" data-room="${r.room}" data-name=${r.username}><i class="far fa-user"></i> ${escapeHTML(r.username)}</div>`;  
  });  
  recentList.innerHTML = html;

  document.querySelectorAll('.recent-chip').forEach(chip => {
    chip.addEventListener('click', () => {  
      const room = chip.dataset.room; 
      const name = chip.dataset.name;
      if (room && name) {
        openChatModal(room, name, user_db);  
      }  
    });  
  }); 
  console.log("recent chat added");
}

function escapeHTML(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"']/g, (match) => {
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return escapeMap[match];
  });
}

function safeParse(value, fallback) {
  try {
    if (!value || value === "undefined") return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveRecent() { 
  localStorage.setItem("recent_chat", JSON.stringify(recent_chat)); 
}  
        
function addRecent(room, username, user_db) {
  if (!room && !username) return;  
  recent_chat = recent_chat.filter(r => r.room !== room);  
  recent_chat.unshift({ room, username});  
  if (recent_chat.length > 8) recent_chat.pop();
  saveRecent();  
  renderRecent(user_db);  
} 


async function loadMessages(room, user_db) {
  messageContainer.innerHTML = '';
  
  const msg_data = await user_db.select_from("messages", "message_data");
  
  const roomMessages = msg_data[room] || [];
  
  renderMessages(roomMessages, user_db);
  
  console.log(roomMessages);
}
 
 
function handleImageUpload(file) {
  if (!file || !file.type.startsWith('image/')){
    showToast('please select an image'); 
    return;  
  } 
  
  const reader = new FileReader();
  reader.onload = (e) => { 
  
  const sender = user_data.userid;
  const time = "just now";
  const type = "image";
  const room = current_chat_room;
  const content = e.target.result;
  const username = user_data.username;
  
  handleMessage(sender, type, content, time);
  client.emit("sendMessage", {sender, type, content, room, username});
  
  fileInput.value = ''; 
    
  };  
  reader.readAsDataURL(file);  
} 

function get_friend_list() {
  const user_id = user_data.userid;

  if(user_id){
    client.emit("myFriends", {user_id});
  }
}



// DOUBLE TAP HANDLER (TEXT ONLY)
let lastTap = 0;

messageContainer.addEventListener("click", function (e) {
  const bubble = e.target.closest(".message-bubble");
  if (!bubble) return;

  const now = Date.now();
  const diff = now - lastTap;

  if (diff < 300 && diff > 0) {
    // DOUBLE TAP DETECTED

    // ✅ ONLY TEXT messages
    const textEl = bubble.querySelector(".message-text");
    if (!textEl) return; // ignore images

    const text = textEl.innerText.trim();
    if (!text) return;

    // COPY
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    // ✅ ANIMATION (bubble)
    bubble.classList.add("double-tap");
    setTimeout(() => {
      bubble.classList.remove("double-tap");
    }, 250);

    // ✅ TOAST (uses your existing function)
    showToast(toastMsg, toastEl, "Message copied", "fa-copy", "fa-solid");
  }

  lastTap = now;
});



function formatMessagePreview(text) {
  const limit = 120;

  if (text.length <= limit) {
    return escapeHTML(text);
  }

  const shortText = escapeHTML(text.slice(0, limit));

  return `${shortText}...<span class="see-more"> see more</span>`;
}


messageContainer.addEventListener("click", function(e) {
  const btn = e.target.closest(".see-more");
  if (!btn) return;

  const textEl = btn.closest(".message-text");
  const fullText = textEl.dataset.full;

  if (btn.dataset.expanded === "true") {
    // collapse
    textEl.innerHTML = formatMessagePreview(fullText);
  } else {
    // expand
    textEl.innerHTML = 
      `${escapeHTML(fullText)}<span class="see-more" data-expanded="true"> see less</span>`;
  }
});


// media-picker.js

function mediaPicker(target, chatId) {
  // Reuse the same input
  let input = target._mediaInput;
  
  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*,audio/*";
    input.style.display = "none";
    
    document.body.appendChild(input);
    target._mediaInput = input;
  }
  
  target.onclick = () => {
    input.value = "";
    input.click();
  };
  
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    
    let type;
    
    if (file.type.startsWith("image/")) {
      type = "image";
    } else if (file.type.startsWith("video/")) {
      type = "video";
    } else if (file.type.startsWith("audio/")) {
      type = "audio";
    } else {
      return;
    }
    
    await telegramApi.send_message(type, chatId, file);
  };
}


export default {
  showRegisterModal,
  hideRegisterModal,
  showToast,
  renderFriendList,
  openChatModal,
  renderRecent,
  get_current_chat,
  renderMessages,
  mediaPicker,
}
