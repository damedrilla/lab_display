const WebSocket = require('ws');

// Create a WebSocket server
const wss = new WebSocket.Server({ port: 8770 });

console.log('WebSocket server started on ws://localhost:8770');

// Store all connected clients
const clients = new Set();

// Handle new client connections
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  // Handle incoming messages from a client
  ws.on('message', (message) => {
    // Convert the Buffer to a string
    const messageContent = message.toString();

    // Create a JSON object with the message content

    console.log(`Received message: ${messageContent}`);

    // Broadcast the JSON message to all connected clients
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageContent);
      }
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});