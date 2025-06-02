import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; // Import axios for API requests

const NFCReaderPopup = ({labName}) => {
  const labNameRef = useRef(labName);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [uid, setUid] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null); // State to store student information
  const [error, setError] = useState(null); // State to store errors
  const wsRef = useRef(null); // Use a ref to store the WebSocket instance
  const reconnectIntervalRef = useRef(null); // Use a ref to store the reconnect interval
  
  //To retain the lab name across re-renders
  useEffect(() => {
    labNameRef.current = labName;
  }, [labName]);

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

        try {
          // 1. Check if instructor is present
          const facultyRes = await axios.get('http://ws-server.local:5000/api/current_faculty');
          if (!facultyRes.data || facultyRes.data.isPresent !== 1) {
            setError('Instructor is not present yet. Entry denied.');
            setStudentInfo(null);
            setTimeout(() => {
              setIsPopupVisible(false);
              setError(null);
            }, 5000);
            return;
          }

          // 2. Fetch student information using the UID
          const response = await axios.get(`http://ws-server.local:5000/proxy/students/${scannedUid}`);
          const { StudentInfo, Picture } = response.data;
          if (response.data.status !== 200) {
            throw new Error('Failed to fetch student information');
          }
          const fetchedStudentInfo = { ...StudentInfo, Picture };
          setStudentInfo(fetchedStudentInfo);
          setError(null);

          //Since the masterlists of every subject are not yet implemented, we will go straight to logging the student entry
          //for now. If the masterlists get implemented, it should be before the step 3 below.

          //await axios.post(`masterlist.url/${fetchedStudentInfo.StudentNo}`, {'courseID': whatever_course_id}`); or sumn

          // 3. Log student entry
          await axios.post('http://ws-server.local:5000/api/student_logs', {
            studID: fetchedStudentInfo.StudentNo,
            full_name: `${fetchedStudentInfo.FirstName} ${fetchedStudentInfo.LastName}`,
            instructor: facultyRes.data.full_name,
            yr_section: `${fetchedStudentInfo.CourseAbbr} ${fetchedStudentInfo.Year}${fetchedStudentInfo.Section}`,
            lab_name: labNameRef.current, 
          });

          // 4. Unlock the door
          try {
            const unlockResponse = await axios.post('http://maclab.local:5000/unlock');
            console.log('Door unlock response:', unlockResponse.data);
          } catch (unlockError) {
            console.error('Error unlocking the door:', unlockError);
          }
        } catch (err) {
          console.error('Error:', err);
          setError('Failed to fetch student information.');
          setStudentInfo(null);
        }

        // Hide the popup after 5 seconds
        setTimeout(() => {
          setIsPopupVisible(false);
          setStudentInfo(null);
          setError(null);
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