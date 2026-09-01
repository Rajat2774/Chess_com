const socket=io();

socket.emit("Helloo bhai")

socket.on("Hello lelo sab",()=>{
    console.log("Hello le liya")
})