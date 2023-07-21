
// Required libraries
const cors = require('cors');             // Middleware for enabling CORS (Cross-Origin Resource Sharing)
const axios = require('axios');           // Promise based HTTP client for node.js
const fs = require('fs');                 // Node.js File System module for reading/writing files
const express = require('express');       // Express.js framework for building web applications
const https = require('https');           // HTTPS module for creating HTTPS server
const socketIO = require('socket.io');    // Socket.io library for real-time bidirectional event-based communication

// Define HTTPS credentials using the File System (fs) to read the key and certificate files
const options = {
  key: fs.readFileSync('/opt/bitnami/apache/conf/brennan.games.key'),   // Path to private key
  cert: fs.readFileSync('/opt/bitnami/apache/conf/brennan.games.crt')   // Path to certificate file
};

// Create an instance of an Express application
const app = express();

//For Older Version of JudgeGPT
const PromptGPT = require('./PromptGPT');
let promptResponse = {};

//Judge GPT
const RandomLines = require('./RandomLines');
const JudgeGPTServer = require('./JudgeGPTServer');
const judgeGPTServer = new JudgeGPTServer();
judgeGPTServer.Start();


// Use cors middleware for handling Cross-Origin Resource Sharing
app.use(cors());

// Tell Express to parse JSON in the body of incoming requests.
app.use(express.json());

// Log all incoming requests
app.use(function(req, res, next) {
    console.log(`${req.method} request for '${req.url}'`);
    next();  // Pass control to the next middleware function
});

// Call to GPT for older version of JudgeGPT
app.post('/AskGPT', function (req, res) {
    // Log the body of the request
    console.log(req.body);

    // Extract youtubeId from the request body
    const prompt = req.body.prompt;

    // Log the prompt
    console.log(prompt);

    // Create a new OpenAI Reponse with prompt
    promptResponse[prompt] = new PromptGPT(prompt);

    // Get the response 
    promptResponse[prompt].AskGPT().then((data) => {
        console.log(data);
        console.log(data.generatedText);
        res.json({ //why not make res.json = data
            generatedText: data.generatedText,
            inputPrompt: data.inputPrompt
        });
    })
    .catch((error) => {
        // If there is an error, log it and send a response
        console.error(error);
        res.json("error");
    });

});

// Serve static files related to socket.io from the node_modules directory
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));

// Define the port and HTTPS server options
const port = 3000;  // Define server port. Note: HTTPS servers typically use port 443 by default.

// Create and start the HTTPS server
const server = https.createServer(options, app).listen(port, () => {
    console.log(`Secure server is running on port ${port}`);
});

// Socket.io configuration
const io = socketIO(server, {
    cors: {
        origin: "https://brennan.games", // Specify the origins allowed to connect
        methods: ["GET", "POST"]         // Allowed HTTP methods
    },
    transports: ['polling', 'websocket'] // Specify the transports for socket.io
});

// Handle client connections using socket.io
io.on('connection', (socket) => {

    // Get client's IP address
    const clientIpAddress = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
    
    //Log client joining
    console.log(`A user connected with ID: ${socket.id} from ${clientIpAddress}`);

    //Player has successful joined game, here is player details
    socket.emit('OnJoinEvent', { 
            player: judgeGPTServer.OnPlayerConnected(clientIpAddress), 
        });

    // Emit status updates to the client at regular intervals
    const interval = setInterval(() => {

        //All details of game
        socket.emit('GameUpdate', { 
            messages: judgeGPTServer.messagesChat.messages,
            playerTurn: judgeGPTServer.GetPlayersTurn(),
            playerList: judgeGPTServer.GetPlayers()
        });
        //console.log(judgeGPTServer.messagesChat.messages);
    }, 1000);

    //Called when it is your turn
    socket.emit('OnYourTurnEvent', { 
            message: `Hello ${socket.id} from the server! Your IP is ${clientIpAddress}` 
        });


    // Handle client disconnection and clean up resources
    socket.on('SubmitTestimony', (data) => {
        console.log('A user submitted a testimony ' + data.testimony);
        
    });

    // Handle client disconnection and clean up resources
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        clearInterval(interval); // Stop the status update interval
    });
});
