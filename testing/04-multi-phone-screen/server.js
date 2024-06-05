
const express = require('express');
const app = express();
const https = require(`https`);
const fs = require(`fs`);

const options = {
    key: fs.readFileSync(`localhost.key`),
    cert: fs.readFileSync(`localhost.crt`)
}

const server = https.createServer(options, app);
const { Server } = require("socket.io");
const io = new Server(server);

const port = 443;

app.use(express.static('public'))
app.use('/node_modules', express.static('node_modules'));
server.listen(port, () => {
    console.log(`App listening on port ${port}`)
})

io.on('connection', socket => {
    console.log(`Connection`);

});
