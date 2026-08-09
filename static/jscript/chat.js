const msgContainer = document.getElementById("messageContainer");

let pressCount = 0;

msgContainer.addEventListener("pointerdown", (event)=>{
    const msgdiv = event.target.closest(".message-bubble");
    console.log(msgdiv); 
    pressCount++;
});

msgContainer.addEventListener("pointerup", ()=>{
    if(pressCount == 2){
        alert("dndx");
    }
});