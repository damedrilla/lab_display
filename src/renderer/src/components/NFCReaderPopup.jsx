import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Import axios for API requests

const NFCReaderPopup = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [uid, setUid] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null); // State to store student information
  const [error, setError] = useState(null); // State to store errors

  useEffect(() => {
    let ws;
    let reconnectInterval;

    const connectWebSocket = () => {
      ws = new WebSocket('wss://localhost:8765'); // Connect to the secure WebSocket server

      ws.onopen = () => {
        console.log('Secure WebSocket connection opened!');
        clearInterval(reconnectInterval); // Clear the reconnection interval on successful connection
      };

      ws.onmessage = async (event) => {
        const scannedUid = event.data;
        console.log('UID received:', scannedUid);

        setUid(scannedUid);
        setIsPopupVisible(true);

        // Fetch student information using the UID
        try {
          const response = await axios.get(`http://localhost:5000/proxy/students/${scannedUid}`);
          const { StudentInfo, Picture } = response.data; // Extract StudentInfo and Picture

          setStudentInfo({ ...StudentInfo, Picture }); // Store the student information
          setError(null); // Clear any previous errors
        } catch (err) {
          console.error('Error fetching student information:', err);
          setError('Failed to fetch student information.');
          setStudentInfo(null); // Clear student info on error
        }

        // Hide the popup after 5 seconds
        setTimeout(() => {
          setIsPopupVisible(false);
          setStudentInfo(null); // Clear student info when popup hides
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

    connectWebSocket();

    return () => {
      clearInterval(reconnectInterval); // Cleanup the reconnection interval
      if (ws) ws.close(); // Close the WebSocket connection on component unmount
    };
  }, []);

  return (
    isPopupVisible && (
      <div
        className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${studentInfo ? 'bg-green-600' : 'bg-blue-600'
          } text-white`}
      >

        {studentInfo ? (

          <div className="font-semibold">
            <p className="text-lg font-bold">Welcome!</p>
            <p>{studentInfo.FirstName} {studentInfo.LastName}</p>
            <p>{studentInfo.StudentNo}</p>
            <p>{studentInfo.CourseAbbr} {studentInfo.Year}{studentInfo.Section}</p>
          </div>
        ) : error ? (
          <p className="text-red-500 font-bold">Cardholder doesn't exist!</p>
        ) : (
          <p>Loading cardholder information...</p>
        )}
      </div>
    )
  );
};

export default NFCReaderPopup;