const express = require('express');
const socket=require('socket.io');
const http=require('http');
const {Chess}=require("chess.js");

const app=express();
const server=http.createServer(app);
const io=socket(server);

const chess=new Chess();
let players={};
let currentPlayer='w';

app.set('view engine','ejs');
app.use(express.static(path.join(__dirname,'public')));



app.get('/',(req,res)=>{
    res.send('Hello World!');
})
server.listen(3000,()=>{
    console.log('Server started on port 3000');
}); 