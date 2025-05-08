import React, { useState, useEffect, useRef } from 'react';

const AnnouncementPopup = () => {
    const [announcement, setAnnouncement] = useState(null);
    const [cooldown, setCooldown] = useState(false); // Cooldown state to block duplicate announcements
    const wsRef = useRef(null); // Use a ref to store the WebSocket instance
    const reconnectIntervalRef = useRef(null); // Use a ref to store the reconnect interval

    useEffect(() => {
        const connectWebSocket = () => {
            if (wsRef.current) {
                console.log('WebSocket already exists. Reusing the existing connection.');
                return;
            }

            wsRef.current = new WebSocket('ws://localhost:8770'); // Connect to the announcement WebSocket server

            wsRef.current.onopen = () => {
                console.log('WebSocket connection established.');
                clearInterval(reconnectIntervalRef.current); // Clear the reconnection interval on successful connection
                reconnectIntervalRef.current = null;
            };

            wsRef.current.onmessage = (event) => {
                try {
                    let data = JSON.parse(event.data); // Parse the WebSocket message
                    console.log('Received WebSocket message:', data);

                    if (data.message && !cooldown) {
                        console.log('Updating announcement state:', data.message);
                        setAnnouncement(data.message); // Update the announcement state
                        setCooldown(true); // Activate cooldown

                        // Clear the announcement after the specified duration
                        const duration = data.duration ? data.duration * 1000 : 5000; // Default to 5 seconds
                        setTimeout(() => {
                            setAnnouncement(null);
                            console.log('Announcement cleared after', duration / 1000, 'seconds.');
                        }, duration);

                        // Reset the cooldown after a short delay
                        setTimeout(() => {
                            setCooldown(false);
                            console.log('Cooldown reset.');
                        }, duration);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            wsRef.current.onclose = () => {
                console.log('WebSocket connection closed. Attempting to reconnect...');
                wsRef.current = null; // Reset the WebSocket instance
                if (!reconnectIntervalRef.current) {
                    reconnectIntervalRef.current = setInterval(() => {
                        console.log('Reconnecting...');
                        connectWebSocket(); // Attempt to reconnect
                    }, 5000); // Retry every 5 seconds
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                wsRef.current.close(); // Close the connection on error to trigger reconnection
                wsRef.current = null; // Reset the WebSocket instance
            };
        };

        connectWebSocket(); // Establish the initial connection

        return () => {
            if (reconnectIntervalRef.current) {
                clearInterval(reconnectIntervalRef.current); // Cleanup the reconnection interval
            }
            if (wsRef.current) {
                wsRef.current.close(); // Close the WebSocket connection on component unmount
                wsRef.current = null;
            }
        };
    }, [cooldown]); // Re-run the effect when cooldown changes

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
            <p className="text-3xl">{announcement}</p>
        </div>
    );
};

export default AnnouncementPopup;