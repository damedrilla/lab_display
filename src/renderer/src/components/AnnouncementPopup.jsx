import React, { useState, useEffect } from 'react';

const AnnouncementPopup = () => {
    const [announcement, setAnnouncement] = useState(null);

    useEffect(() => {
        let ws;
        let reconnectInterval;

        const connectWebSocket = () => {
            ws = new WebSocket('wss://localhost:8770'); // Connect to the announcement WebSocket server

            ws.onopen = () => {;
                clearInterval(reconnectInterval); // Clear the reconnection interval on successful connection
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data); // Parse the incoming message
                    if (data.message) {
                        console.log('Updating announcement state:', data.message);
                        setAnnouncement(data.message); // Update the announcement state

                        // Clear the announcement after 5 seconds
                        setTimeout(() => {
                            setAnnouncement(null);
                            console.log('Announcement cleared after 5 seconds.');
                        }, 5000);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onclose = () => {
                reconnectInterval = setInterval(() => {
                    console.log('WebSocket connection closed. Attempting to reconnect...');
                    connectWebSocket(); // Attempt to reconnect
                }, 5000); // Retry every 5 seconds
            };

            ws.onerror = (error) => {
                ws.close(); // Close the connection on error to trigger reconnection
            };
        };

        connectWebSocket(); // Establish the initial connection

        return () => {
            clearInterval(reconnectInterval); // Cleanup the reconnection interval
            if (ws) ws.close(); // Close the WebSocket connection on component unmount
        };
    }, []);

    if (!announcement || announcement.trim() === '') {
        return null;
    }

    console.log('Rendering announcement:', announcement);

    return (
        <div
            key={announcement} // Force re-render when the announcement changes
           className="absolute inset-0 bg-blue-600 text-white p-4 flex flex-col justify-center items-center z-50"
        >
            <p className="text-2xl font-bold">Announcement</p>
            <p className='text-3xl'>{announcement}</p>
        </div>
    );
};

export default AnnouncementPopup;