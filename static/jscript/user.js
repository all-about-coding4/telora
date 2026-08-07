import helper from "./helper.js";
import telegramApi from "./telegram-api.js";
import user_dataset from "../dataset-src/index.js";

import watch_dog from "./watchdog.js";

let user_botoken = localStorage.getItem("bot_token") || "";
//localStorage.clear();

const user_db = new user_dataset("telora_user_db");

let fri_hash = localStorage.getItem("fri_hash") || null;

//console.log(user_botoken);


async function telora_user(modal, input_l, t_div, f_name, username, container) {
    if(!user_botoken){
        helper.showRegisterModal(modal);
        input_l.focus();
       await get_token(modal, t_div, input_l, f_name, username, container);
        //console.log("no token");
    }else{
        const data = await user_db.select_from("user", "user_data");
        f_name.textContent = data.first_name;
        username.textContent = data.username;
        
        await helper.renderFriendList(container, user_db);
        await helper.renderRecent(user_db);
        
        //await sync_cache(container);
        await watch_dog.runEverySecond(async () => {
            await telegramApi.get_updates(user_botoken, user_db);
        });
        
        await watch_dog.runEverySecond(async () => {
            await sync_cache(container);
    
        });
    }
    
}

async function hash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    
    return [...new Uint8Array(hashBuffer)]
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}


async function sync_cache(container) {
    
    //console.log("Syncing cache");
    const fris = await user_db.select_from("friends", "friend_data");
   // console.log(JSON.stringify(fris));
    
    const hashed = await hash(JSON.stringify(fris));
    
    //console.log(hashed);
    
    
    if(hashed === fri_hash){
        //console.log("unique cache");
        return;
    }else{
        
        fri_hash = hashed;
        await helper.renderFriendList(container, user_db);
        
        //console.log(fri_hash);
        
        localStorage.setItem("fri_hash", hashed);
    }
    
}

async function get_token(modal, t_div, token, f_name, username, container) {
    t_div.addEventListener('click', async ()=>{
        const b_token = token.value.trim();
        //console.log(b_token)
        const [result, b_data] = await telegramApi.validate_token(b_token);

        if(result){
            await user_db.create_table("user");
            await user_db.create_table("friends");
            user_db.create_table("messages");
            
            const us_data = {
                "id": b_data.id,
                "first_name": b_data.first_name,
                "username": b_data.username,
                "bot_token": b_token,
                
            };
            
            await user_db.insert("user", us_data, "user_data");
            
            f_name.textContent = b_data.first_name;
            username.textContent = b_data.username;
            token.value = "";
            helper.hideRegisterModal(modal);
            user_botoken = b_token;
            localStorage.setItem("bot_token", user_botoken);
            await watch_dog.runEverySecond(async () => { await telegramApi.get_updates(b_token, user_db) });
            
            await watch_dog.runEverySecond(async () => {
                await sync_cache(container);
            });
            
            //console.log(b_data);
        }

    });
}


export default {
    telora_user,
}
