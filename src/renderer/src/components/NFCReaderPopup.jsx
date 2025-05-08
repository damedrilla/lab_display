import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; // Import axios for API requests

const NFCReaderPopup = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [uid, setUid] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null); // State to store student information
  const [error, setError] = useState(null); // State to store errors
  const wsRef = useRef(null); // Use a ref to store the WebSocket instance
  const reconnectIntervalRef = useRef(null); // Use a ref to store the reconnect interval

  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current) {
        console.log('WebSocket already exists. Reusing the existing connection.');
        return;
      }

      wsRef.current = new WebSocket('wss://localhost:8765'); // Connect to the secure WebSocket server

      wsRef.current.onopen = () => {
        console.log('Secure WebSocket connection opened!');
        clearInterval(reconnectIntervalRef.current); // Clear the reconnection interval on successful connection
        reconnectIntervalRef.current = null;
      };

      wsRef.current.onmessage = async (event) => {
        const scannedUid = event.data;
        console.log('UID received:', scannedUid);

        setUid(scannedUid);
        setIsPopupVisible(true);

        // Fetch student information using the UID
        try {
          const response = await axios.get(`http://localhost:5000/proxy/students/${scannedUid}`);
          const { StudentInfo, Picture } = response.data; // Extract StudentInfo and Picture
          if (response.data.status !== 200) {
            throw new Error('Failed to fetch student information');
          }
          const fetchedStudentInfo = { ...StudentInfo, Picture }; // Prepare the student info object
          setStudentInfo(fetchedStudentInfo); // Update state with the fetched student information
          setError(null); // Clear any previous errors

          // Unlock the door if student info is fetched
          try {
            const unlockResponse = await axios.post('http://maclab.local:5000/unlock');
            console.log('Door unlock response:', unlockResponse.data);
          } catch (unlockError) {
            console.error('Error unlocking the door:', unlockError);
          }
        } catch (err) {
          console.error('Error fetching student information:', err);
          setError('Failed to fetch student information.');
          setStudentInfo(null); // Clear student info on error
        }

        // Hide the popup after 5 seconds
        setTimeout(() => {
          setIsPopupVisible(false);
          setStudentInfo(null); // Clear student info when popup hides
          setError(null); // Clear error when popup hides
        }, 5000);
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

    connectWebSocket();

    return () => {
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current); // Cleanup the reconnection interval
      }
      if (wsRef.current) {
        wsRef.current.close(); // Close the WebSocket connection on component unmount
        wsRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this effect runs only once

  return (
    isPopupVisible && (
      <div
        className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${
          studentInfo ? 'bg-green-600' : 'bg-blue-600'
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
          <p className="text-white-500 font-bold">Cardholder doesn't exist!</p>
        ) : (
          <p>Loading cardholder information...</p>
        )}
      </div>
    )
  );
};

export default NFCReaderPopup;