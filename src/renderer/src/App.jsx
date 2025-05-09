import React, { useEffect, useState, useRef } from 'react';
import ClassScheduleCard from './components/ClassScheduleCard';
import LaboratoryName from './components/LaboratoryName';
import Plotting from './components/Plotting';
import axios from 'axios';
import { MACHINE_ID } from './utils/consts';
import { base64Image } from './testimg';

const App = () => {
  const [displayMode, setDisplayMode] = useState('schedule'); // 'schedule' or 'announcement'
  const [announcement, setAnnouncement] = useState(null); // State for announcement
  const wsRef = useRef(null); // WebSocket reference
  const reconnectIntervalRef = useRef(null); // Reconnection interval reference
  const pollingIntervalRef = useRef(null); // Polling interval reference
  const [laboratoryName, setLaboratoryName] = useState(''); // State for laboratory name
  const machineID = MACHINE_ID; // Replace with the actual machineID

  // Fetch announcement from the API
  const fetchAnnouncement = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/announcement');
      if (response.data && response.data.length > 0) {
        const announcementData = response.data[0]; // Assuming the first entry is the current announcement
        setAnnouncement(announcementData); // Switch to announcement display
      } else {
        setDisplayMode('schedule'); // Default to schedule if no announcement
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
      setDisplayMode('schedule'); // Default to schedule on error
    }
  };

  // WebSocket connection logic
  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current) {
        console.log('WebSocket already exists. Reusing the existing connection.');
        return;
      }

      wsRef.current = new WebSocket('ws://localhost:8770'); // Connect to the WebSocket server

      wsRef.current.onopen = () => {
        console.log('WebSocket connection established.');
        clearInterval(reconnectIntervalRef.current); // Clear reconnection interval
        reconnectIntervalRef.current = null;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = event.data; // Parse the WebSocket message
          console.log('Received WebSocket message:', data);

          if (data === 'show_announcement') {
            fetchAnnouncement();
            setDisplayMode('announcement') // Fetch the latest announcement
          } else if (data === 'show_schedule') {
            setDisplayMode('schedule'); // Switch to schedule display
          } else if (data === 'show_image') {
            setDisplayMode('show_image'); // Switch to image display
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        wsRef.current = null; // Reset WebSocket instance
        if (!reconnectIntervalRef.current) {
          reconnectIntervalRef.current = setInterval(() => {
            console.log('Reconnecting...');
            connectWebSocket(); // Attempt to reconnect
          }, 5000); // Retry every 5 seconds
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        wsRef.current.close(); // Close the connection on error
        wsRef.current = null; // Reset WebSocket instance
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current); // Cleanup reconnection interval
      }
      if (wsRef.current) {
        wsRef.current.close(); // Close WebSocket connection on unmount
        wsRef.current = null;
      }
    };
  }, []);

  // Poll announcements periodically
  useEffect(() => {
    fetchAnnouncement(); // Fetch immediately on mount

    pollingIntervalRef.current = setInterval(() => {
      fetchAnnouncement(); // Fetch periodically
    }, 1000); // Poll every 30 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current); // Cleanup polling interval
      }
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center bg-gray-900">
      <LaboratoryName name={laboratoryName} /> {/* Pass laboratoryName to LaboratoryName */}
      <div className="relative flex justify-center items-center min-h-screen">
        {(() => {
          if (displayMode === 'schedule') {
            return <ClassScheduleCard setLaboratoryName={setLaboratoryName} />; {/* Pass setter to ClassScheduleCard */ }
          } else if (displayMode === 'announcement') {
            return (
              <div className="w-full max-w-7xl bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 p-6">
                <h1 className="text-4xl font-bold p-5 text-gray-800 dark:text-gray-200 mb-4 text-center">Announcement</h1>
                {announcement?.isImage ? (
                  <img
                    src={`data:image/jpeg;base64,${announcement.content}`}
                    alt="Announcement"
                    className="w-full h-auto rounded-md"
                    style={{
                      maxWidth: '1000px', // Maximum width
                      maxHeight: '800px', // Maximum height
                      objectFit: 'contain', // Maintain aspect ratio
                    }}
                  />
                ) : (
                  <p className="text-4xl text-white-600 dark:text-gray-400 text-center">{announcement?.content}</p>
                )}
              </div>
            );
          } else if (displayMode === 'show_image') {
            return (

              <Plotting machineID={machineID} />

            );
          } else {
            return <p className="text-4xl text-white-600 dark:text-gray-400 text-center">Invalid display mode</p>;
          }
        })()}
      </div>
    </div>
  );
};

export default App;