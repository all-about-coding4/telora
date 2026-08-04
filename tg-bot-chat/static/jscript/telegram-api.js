import helper from "./helper.js";
import user_dataset from "../dataset-src/index.js";

let lastUpdateId = Number(localStorage.getItem("last_update_id")) || 0;

const nuser_db = new user_dataset("telora_user_db");

async function validate_token(token) {
    const data = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    
    const result = await data.json();

    if(result.ok){
        const b_data = result.result;

        return [true, b_data]
    }else{
        return [false, "bad bot token"];
    }
}

async function getFileUrl(token, fileId) {
    const response = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
    );
    
    const data = await response.json();
    
    if (!data.ok) return null;
    
    return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
}

async function get_updates(token, database) {
    const result = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId}&timeout=25`
    );
    
    const data = await result.json();
    
    if (!data.ok) return;
    
    const updates = data.result;
    
    if (updates.length === 0) return;
    
    for (const update of updates) {
        console.log(update);
        
        if (!update.message) continue;
        
        const from_id = update.message.from.id;
        
        let friends = await database.select_from("friends", "friend_data") || {};
        let messages = await database.select_from("messages", "message_data") || {};
        
        let type = "unknown";
        let fileId = "";
        let message = "";
        
        if (update.message.text) {
            
            type = "text";
            message = update.message.text;
            
        } else if (update.message.photo) {
            
            type = "image";
            fileId = update.message.photo.at(-1).file_id;
            message = await getFileUrl(token, fileId);
            console.log(message);
            
        } else if (update.message.video) {
            
            type = "video";
            fileId = update.message.video.file_id;
            message = await getFileUrl(token, fileId);
            
        } else if (update.message.voice) {
            
            type = "audio";
            fileId = update.message.voice.file_id;
            message = await getFileUrl(token, fileId);
            
        } else if (update.message.audio) {
            
            type = "audio";
            fileId = update.message.audio.file_id;
            message = await getFileUrl(token, fileId);
            
        }
        
        // Add friend if not already stored
        if (!friends[from_id]) {
            
            friends[from_id] = {
                id: from_id,
                first_name: update.message.from.first_name,
                username: update.message.from.username
            };
            
            await database.insert("friends", friends, "friend_data");
        }
        
        // Create message list for this user
        if (!messages[from_id]) {
            messages[from_id] = [];
        }
        
        const newMessage = {
            update_id: update.update_id,
            chat_id: update.message.chat.id,
            message_id: update.message.message_id,
            type: type,
            file_id: fileId,
            message: message,
            date: update.message.date
    
        };
        
        // Append new message
        messages[from_id].push(newMessage);
        
        await database.insert("messages", messages, "message_data");
        
        const bblop = await helper.get_current_chat();
        
        console.log(`current chat: ${bblop} && from id : ${from_id}`);
        
        if (chatModalOverlay.classList.contains("active") && String(from_id) === String(bblop)) {
            
            console.log("updating ui");
            
            await helper.renderMessages(newMessage, database);
        }
        
    }
    
    lastUpdateId = updates[updates.length - 1].update_id + 1;
    localStorage.setItem("last_update_id", lastUpdateId);
    
}


async function send_message(type, chatId, message, caption="") {
    const form = new FormData();
    const token = localStorage.getItem("bot_token");
    let update_id = 1;
    let msg_id = 1;
    let messages = await nuser_db.select_from("messages", "message_data") || {};
    
    const data = await nuser_db.select_from("user", "user_data");
    
    if(type === "text"){
       const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
           method: "POST",
           headers: {
               "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                
            })
       });
       
       const rop = await res.json();
       if(rop.ok){
           
           const unixTime = Math.floor(Date.now() / 1000);
           
           const newMessage = {
              update_id: update_id,
              chat_id: data.id,
              message_id: msg_id,
              type: type,
              fri_id: chatId,
              message: message,
              date: unixTime,
            };
            msg_id += 1;
            update_id += 1;
            
            messages[chatId].push(newMessage);
            
            await nuser_db.insert("messages", messages, "message_data");
            
            await helper.renderMessages(newMessage, nuser_db);
            document.getElementById("messageInput").value = "";
       }
       
    }else if(type === "image"){
        
        form.append("chat_id", chatId);
        form.append("photo", message); // File or Blob
        form.append("caption", caption);
        
        const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`,
        {
            method: "POST",
            body: form
        });
        
        const rop = await res.json();
        
       if (rop.ok) {
           
           const unixTime = Math.floor(Date.now() / 1000);
           
           const fileId = rop.result.photo.at(-1).file_id;
           const url = await getFileUrl(token, fileId);
           const newMessage = {
               update_id: update_id,
               chat_id: data.id,
               message_id: msg_id,
               type: type,
               fri_id: chatId,
               message: url,
               date: unixTime,
           };
           msg_id += 1;
           update_id += 1;
           
           messages[chatId].push(newMessage);
           
           await nuser_db.insert("messages", messages, "message_data");
           
           await helper.renderMessages(newMessage, nuser_db);
           
           document.getElementById("messageInput").value = "";
       }
        
        console.log(rop);
        
    }else if(type === "video"){
        form.append("chat_id", chatId);
        form.append("video", message);
        form.append("caption", caption);
        const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`,
        {
            method: "POST",
            body: form
        });
        
       const rop = await res.json();
       console.log(rop);
       if (rop.ok) {
           
           const unixTime = Math.floor(Date.now() / 1000);
           
           const fileId = rop.result.video.file_id;
           
           const url = await getFileUrl(token, fileId);
           
           const newMessage = {
               update_id: update_id,
               chat_id: data.id,
               message_id: msg_id,
               type: type,
               fri_id: chatId,
               message:url,
               date: unixTime,
           };
           msg_id += 1;
           update_id += 1;
           
           messages[chatId].push(newMessage);
           
           await nuser_db.insert("messages", messages, "message_data");
           
           await helper.renderMessages(newMessage, nuser_db);
           
           document.getElementById("messageInput").value = "";
       }        
        console.log(rop);
        
    }else if(type === "audio"){
        form.append("chat_id", chatId);
        form.append("voice", message);
        const res = await fetch(`https://api.telegram.org/bot${token}/sendVoice`,
        {
            method: "POST",
            body: form
        });
        
        const rop = await res.json();
        console.log(rop);
        
       if (rop.ok) {
           
           const unixTime = Math.floor(Date.now() / 1000);
           
           const fileId = rop.result.voice.file_id;
           
           const url = getFileUrl(token, fileId);
           
           const newMessage = {
               update_id: update_id,
               chat_id: data.id,
               message_id: msg_id,
               type: type,
               fri_id: chatId,
               message:url,
               date: unixTime,
           };
           msg_id += 1;
           update_id += 1;
           
           messages[chatId].push(newMessage);
           
           await nuser_db.insert("messages", messages, "message_data");
           
           await helper.renderMessages(newMessage, nuser_db);
           document.getElementById("messageInput").value = "";
       }
        
    }
}


export default {
    validate_token,
    get_updates,
    send_message,
    
}