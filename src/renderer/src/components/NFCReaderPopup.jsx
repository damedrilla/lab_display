import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const NFCReaderPopup = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [uid, setUid] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [error, setError] = useState(null);
  const [unlocking, setUnlocking] = useState(false); // <-- Add this state
  const [unlockStatus, setUnlockStatus] = useState(null); // <-- Add this state
  const wsRef = useRef(null);
  const reconnectIntervalRef = useRef(null);

  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current) {
        console.log('WebSocket already exists. Reusing the existing connection.');
        return;
      }

      wsRef.current = new WebSocket('wss://localhost:8765');

      wsRef.current.onopen = () => {
        console.log('Secure WebSocket connection opened!');
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      };

      wsRef.current.onmessage = async (event) => {
        const scannedUid = event.data;
        console.log('UID received:', scannedUid);

        setUid(scannedUid);
        setIsPopupVisible(true);

        // Fetch student information using the UID
        try {
          const response = await axios.get(`http://ws-server.local:5000/proxy/students/${scannedUid}`);
          const { StudentInfo, Picture } = response.data;
          if (response.data.status !== 200) {
            throw new Error('Failed to fetch student information');
          }
          const fetchedStudentInfo = { ...StudentInfo, Picture };
          setStudentInfo(fetchedStudentInfo);
          setError(null);

          // Show unlocking notification
          setUnlocking(true);
          setUnlockStatus(null);

          // Unlock the door if student info is fetched
          try {
            const unlockResponse = await axios.post('http://maclab.local:5000/unlock');
            console.log('Door unlock response:', unlockResponse.data);
            setUnlockStatus('Door unlocked successfully!');
          } catch (unlockError) {
            console.error('Error unlocking the door:', unlockError);
            setUnlockStatus('Failed to unlock the door.');
          } finally {
            setUnlocking(false);
          }
        } catch (err) {
          console.error('Error fetching student information:', err);
          setError('Failed to fetch student information.');
          setStudentInfo(null);
        }

        // Hide the popup after 5 seconds
        setTimeout(() => {
          setIsPopupVisible(false);
          setStudentInfo(null);
          setError(null);
          setUnlocking(false);
          setUnlockStatus(null);
        }, 5000);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        wsRef.current = null;
        if (!reconnectIntervalRef.current) {
          reconnectIntervalRef.current = setInterval(() => {
            console.log('Reconnecting...');
            connectWebSocket();
          }, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        wsRef.current.close();
        wsRef.current = null;
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

return (
  isPopupVisible && (
    <div
      className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${
        unlocking
          ? 'bg-yellow-500'
          : unlockStatus === 'Door unlocked successfully!'
            ? 'bg-green-600'
            : unlockStatus === 'Failed to unlock the door.' || error
              ? 'bg-red-600'
              : 'bg-blue-600'
      } text-white`}
    >
      {studentInfo ? (
        <div className="font-semibold">
          <p className="text-lg font-bold">Welcome!</p>
          <p>{studentInfo.FirstName} {studentInfo.LastName}</p>
          <p>{studentInfo.StudentNo}</p>
          <p>{studentInfo.CourseAbbr} {studentInfo.Year}{studentInfo.Section}</p>
          {unlocking && <p className="mt-2">Unlocking door...</p>}
          {unlockStatus && <p className="mt-2">{unlockStatus}</p>}
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