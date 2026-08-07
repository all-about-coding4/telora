import helper from "./helper.js";
import user_dataset from "../dataset-src/index.js";

let lastUpdateId = Number(localStorage.getItem("last_update_id")) || 0;

const nuser_db = new user_dataset("telora_user_db");

// ------------------------------------------------------------------
// Helper: online check
// ------------------------------------------------------------------
function online() {
    if (!navigator.onLine) {
        console.log("Offline - skipping Telegram sync");
        return false;
    }
    return true;
}

// ------------------------------------------------------------------
// Helper: mark a message as delivered in the UI
// ------------------------------------------------------------------
function markDelivered(messageId) {
    const state = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!state) return;

    const icon = state.querySelector("i");
    if (icon) {
        icon.className = "fa-solid fa-check";
    }
}

// ------------------------------------------------------------------
// Validate bot token
// ------------------------------------------------------------------
async function validate_token(token) {
    if (!online()) return;

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        if (!response.ok) {
            console.error("validate_token: HTTP error", response.status);
            return [false, "bad bot token"];
        }

        const data = await response.json();
        if (data.ok) {
            return [true, data.result];
        } else {
            return [false, "bad bot token"];
        }
    } catch (err) {
        console.error("validate_token: network error", err);
        return [false, "network error"];
    }
}

// ------------------------------------------------------------------
// Get file URL from Telegram
// ------------------------------------------------------------------
async function getFileUrl(token, fileId) {
    if (!online()) return;

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
        );
        if (!response.ok) {
            console.error("getFileUrl: HTTP error", response.status);
            return null;
        }

        const data = await response.json();
        if (!data.ok) {
            console.error("getFileUrl: Telegram error", data);
            return null;
        }

        return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
    } catch (err) {
        console.error("getFileUrl: network error", err);
        return null;
    }
}

// ------------------------------------------------------------------
// Get updates from Telegram
// ------------------------------------------------------------------
async function get_updates(token, database) {
    if (!online()) return;

    try {
        const result = await fetch(
            `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId}&timeout=25`
        );
        if (!result.ok) {
            console.error("get_updates: HTTP error", result.status);
            return;
        }

        const data = await result.json();
        if (!data.ok) {
            console.error("get_updates: Telegram error", data);
            return;
        }

        const updates = data.result;
        if (updates.length === 0) return;

        // Process each update individually – one bad update should not break the rest
        for (const update of updates) {
            try {
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

                if (chatModalOverlay.classList.contains("active") && String(from_id) === String(bblop)) {
                    await helper.renderMessages(newMessage, database);
                }
            } catch (err) {
                console.error("get_updates: error processing one update", err, update);
                // Continue with the next update
            }
        }

        // Advance offset only after all updates have been processed
        lastUpdateId = updates[updates.length - 1].update_id + 1;
        localStorage.setItem("last_update_id", lastUpdateId);
    } catch (err) {
        console.error("get_updates: fatal error", err);
    }
}

// ------------------------------------------------------------------
// Send a message (text / photo / video / voice)
// ------------------------------------------------------------------
async function send_message(type, chatId, message, caption = "") {
    // Offline check – if offline, return false immediately
    if (!online()) return false;

    const form = new FormData();
    const token = localStorage.getItem("bot_token");

    let messages = await nuser_db.select_from("messages", "message_data") || {};

    const tempId = crypto.randomUUID();

    const data = await nuser_db.select_from("user", "user_data");

    const unixTime = Math.floor(Date.now() / 1000);

    let newMessage = {
        chat_id: data.id,
        message_id: tempId,
        type: type,
        file_id: "",
        message: message,
        date: unixTime,
    };

    if (type === "text" && message) {
        // Render pending message
        await helper.renderMessages(newMessage, nuser_db, "pending");

        const input = document.getElementById("messageInput");
        input.value = "";
        input.dispatchEvent(new Event("input"));

        // Send text
        try {
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

            if (!res.ok) {
                console.error("sendMessage: HTTP error", res.status);
                return false;
            }

            const rop = await res.json();
            if (rop.ok) {
                markDelivered(newMessage.message_id);

                newMessage.message_id = rop.result.message_id;

                if (!messages[chatId]) {
                    messages[chatId] = [];
                }
                messages[chatId].push(newMessage);
                await nuser_db.insert("messages", messages, "message_data");
            } else {
                console.error("sendMessage: Telegram error", rop);
                return false;
            }
        } catch (err) {
            console.error("sendMessage: network error", err);
            return false;
        }
    } else if (type === "image" && message) {
        form.append("chat_id", chatId);
        form.append("photo", message); // File or Blob
        form.append("caption", caption);

        const url = URL.createObjectURL(message);
        newMessage.message = url;
        newMessage.type = "image";

        await helper.renderMessages(newMessage, nuser_db, "pending");

        // Send photo
        try {
            const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
                method: "POST",
                body: form
            });

            if (!res.ok) {
                console.error("sendPhoto: HTTP error", res.status);
                return false;
            }

            const rop = await res.json();
            if (rop.ok) {
                const fileId = rop.result.photo.at(-1).file_id;
                const i_url = await getFileUrl(token, fileId);

                markDelivered(newMessage.message_id);

                newMessage.message = i_url;
                newMessage.message_id = rop.result.message_id;
                newMessage.file_id = fileId;

                if (!messages[chatId]) {
                    messages[chatId] = [];
                }
                messages[chatId].push(newMessage);
                await nuser_db.insert("messages", messages, "message_data");
            } else {
                console.error("sendPhoto: Telegram error", rop);
                return false;
            }
        } catch (err) {
            console.error("sendPhoto: network error", err);
            return false;
        }
    } else if (type === "video") {
        form.append("chat_id", chatId);
        form.append("video", message);
        form.append("caption", caption);

        const url = URL.createObjectURL(message);
        newMessage.message = url;
        newMessage.type = "video";

        await helper.renderMessages(newMessage, nuser_db, "pending");

        // Send video
        try {
            const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
                method: "POST",
                body: form
            });

            if (!res.ok) {
                console.error("sendVideo: HTTP error", res.status);
                return false;
            }

            const rop = await res.json();
            if (rop.ok) {
                const fileId = rop.result.video.file_id;
                const v_url = await getFileUrl(token, fileId);

                markDelivered(newMessage.message_id);

                newMessage.message = v_url;
                newMessage.message_id = rop.result.message_id;
                newMessage.file_id = fileId;

                if (!messages[chatId]) {
                    messages[chatId] = [];
                }
                messages[chatId].push(newMessage);
                await nuser_db.insert("messages", messages, "message_data");
            } else {
                console.error("sendVideo: Telegram error", rop);
                return false;
            }
        } catch (err) {
            console.error("sendVideo: network error", err);
            return false;
        }
    } else if (type === "audio") {
        form.append("chat_id", chatId);
        form.append("voice", message);

        const url = URL.createObjectURL(message);
        newMessage.message = url;
        newMessage.type = "audio";

        await helper.renderMessages(newMessage, nuser_db, "pending");

        // Send voice
        try {
            const res = await fetch(`https://api.telegram.org/bot${token}/sendVoice`, {
                method: "POST",
                body: form
            });

            if (!res.ok) {
                console.error("sendVoice: HTTP error", res.status);
                return false;
            }

            const rop = await res.json();
            if (rop.ok) {
                const fileId = rop.result.voice.file_id;
                const a_url = await getFileUrl(token, fileId);

                markDelivered(newMessage.message_id);

                newMessage.message = a_url;
                newMessage.message_id = rop.result.message_id;
                newMessage.file_id = fileId;

                if (!messages[chatId]) {
                    messages[chatId] = [];
                }
                messages[chatId].push(newMessage);
                await nuser_db.insert("messages", messages, "message_data");
            } else {
                console.error("sendVoice: Telegram error", rop);
                return false;
            }
        } catch (err) {
            console.error("sendVoice: network error", err);
            return false;
        }
    }

    return true;
}

// ------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------
export default {
    validate_token,
    get_updates,
    send_message,
};
