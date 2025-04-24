import React, { useState, useEffect } from 'react';

const NFCReaderPopup = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [uid, setUid] = useState(null);

  useEffect(() => {
    let ws;
    let reconnectInterval;

    const connectWebSocket = () => {
      ws = new WebSocket('wss://localhost:8765'); // Connect to the secure WebSocket server

      ws.onopen = () => {
        console.log('Secure WebSocket connection opened!');
        clearInterval(reconnectInterval); // Clear the reconnection interval on successful connection
      };

      ws.onmessage = (event) => {
        const scannedUid = event.data;
        console.log('UID received:', scannedUid);

        setUid(scannedUid);
        setIsPopupVisible(true);

        // Hide the popup after 5 seconds
        setTimeout(() => {
          setIsPopupVisible(false);
        }, 5000);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        reconnectInterval = setInterval(() => {
          console.log('Reconnecting...');
          connectWebSocket(); // Attempt to reconnect
        }, 5000); // Retry every 5 seconds
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close(); // Close the connection on error to trigger reconnection
      };
    };

    connectWebSocket(); // Establish the initial connection

    return () => {
      clearInterval(reconnectInterval); // Cleanup the reconnection interval
      if (ws) ws.close(); // Close the WebSocket connection on component unmount
    };
  }, []);

  if (!isPopupVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-gray-800 text-white p-4 rounded shadow-lg z-50">
      <p className="text-lg font-bold">NFC Scan</p>
      <p>UID: {uid}</p>
    </div>
  );
};

export default NFCReaderPopup;