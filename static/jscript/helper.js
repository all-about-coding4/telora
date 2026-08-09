import telegramApi from "./telegram-api.js";
import user_dataset from "../dataset-src/index.js";

const ss_input = document.getElementById("messageInput");
const ss_button = document.getElementById("sendMessageBtn");

const audioPicker = document.getElementById("audioPicker");

// Open the picker w
function openAudioPicker() {
  audioPicker.value = ""; // Optional: allows selecting the same file again
  audioPicker.click();
}

const copyBtn = document.getElementById("copyPeerIdBtn");

const bot_username = document.getElementById("peerIdLabel");

const copyBtnFeedBack = document.getElementById("copyFeedback");


async function copyText(text) {

  if (!text) {
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
  console.log("copy feedback");
  return;
}

copyBtn.addEventListener("click", async ()=> {
  const user_botoken = localStorage.getItem("bot_token");

  if(!user_botoken){
    console.log("no bot token");
    return;
  }

  const user_db = new user_dataset("telora_user_db");

  const data = await user_db.select_from("user", "user_data");
  const url = `https://t.me/${data.username}/`;

  await copyText(url);
});

bot_username.addEventListener("click", async ()=> {
  const user_botoken = localStorage.getItem("bot_token");

  if(!user_botoken){
    console.log("no bot token");
    return;
  }

  const user_db = new user_dataset("telora_user_db");

  const data = await user_db.select_from("user", "user_data");
  const url = `https://t.me/${data.username}/`;

  await copyText(url);
});


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

const msgContainer = document.getElementById("messageContainer");
let pressCount = 0;

msgContainer.addEventListener("click", async (e) => {

    console.log("Clicked:", e.target);

    // 1. Check if an action icon was clicked

    const icon = e.target.closest("[data-action]");

    if (icon) {

        const msgdiv = icon.closest(".message-bubble");

        if (!msgdiv) return;

        const msgId = msgdiv.dataset.msgId;
        const action = icon.dataset.action;

        if(action === "copy"){
          const activeBtn =
            document.querySelector(".msg-action-btn.active");
          const msd = msgdiv.querySelector(".message-text");

          const msg = msd.dataset.tempMsg;

            if(activeBtn){
              await copyText(msg);
              activeBtn.classList.remove("active");
              console.log(msd.textContent, msg);
            }

        }else if(action === "reply"){

        }else if(action === "delete"){

        }else if(action === "edit"){
          
        }

        console.log("Copy:", msgId);
        console.log(action)

        pressCount = 0;

        return;
    }

    // 2. Check if click is inside a message

    const msgdiv = e.target.closest(".message-bubble");

    if (!msgdiv) {

        // Clicked outside a message
        const activeBtn =
            document.querySelector(".msg-action-btn.active");

        if (activeBtn) {
            activeBtn.classList.remove("active");
        }

        pressCount = 0;

        return;
    }

    // 3. Clicked inside message

    pressCount++;

    const actionBtn =
        msgdiv.querySelector(".msg-action-btn");

    if (!actionBtn) return;


    // 4. Double click

    if (pressCount === 2) {

      const wasActive = actionBtn.classList.contains("active");

      document.querySelectorAll(".msg-action-btn.active").forEach(btn=> btn.classList.remove("active"));

      if (!wasActive){
        actionBtn.classList.add("active");
      }
        pressCount = 0;

        console.log("Double click");
    }


    console.log(`Clicked count: ${pressCount}`);
});
//s

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

        <div class="message-bubble" data-msg-id="${msg.message_id}"> 

          <div class="bubble-content">  
            <span class="message-text" data-temp-msg="${escapeHTML(msg.message)}">${formatMessagePreview(msg.message)}</span>  
            <span class="timestamp">${formatTelegramDate(timeStr)} <span data-message-id="${msg.message_id}"><i class="fa-solid ${state === "pending" ? "fa-clock" : "fa-check"}"></i></span></span>  
          </div> 

          <div class="msg-action-btn">
            <i class="fa-solid fa-reply" data-action="reply"></i>
            <i class="fa-solid fa-copy" data-action="copy"></i>
            <i class="fa-solid fa-pen" data-action="edit"></i>
            <i class="fa-solid fa-trash" data-action="delete"></i>
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

  const bubble = btn.closest(".message-bubble");
  if(!bubble) return;


  const textEl = bubble.querySelector(".message-text");
  const fullText = textEl.dataset.tempMsg;

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
