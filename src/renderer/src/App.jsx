import React, { useEffect, useState } from 'react';
import ClassScheduleCard from './components/ClassScheduleCard';
import LaboratoryName from './components/LaboratoryName';
import NFCReaderPopup from './components/NFCReaderPopup';
import NotificationPopup from './components/NotificationPopup';
import AnnouncementPopup from './components/AnnouncementPopup';
import axios from 'axios';

const App = () => {
  const [notification, setNotification] = useState(null); // State for notification

  // Function to trigger the fingerprint verification app
  const launchFingerprintApp = () => {
    console.log('Launching fingerprint verification app...');
    window.ipcRenderer.send('run-verify-fingerprint'); // Send the event to the main process

    // Listen for the result from the main process
    window.ipcRenderer.once('dotnet-result', (event, result) => {
      if (result.success) {
        console.log(result.message); // Log success message
        setNotification({ message: 'Fingerprint verification successful!', isSuccess: true }); // Show success notification
        try {
          const unlockResponse = axios.post('http://maclab.local:5000/unlock');
          console.log('Door unlock response:', unlockResponse.data);
        } catch (unlockError) {
          console.error('Error unlocking the door:', unlockError);
        }
      } else {
        console.error(result.message); // Log failure message
        setNotification({ message: 'Fingerprint verification failed!', isSuccess: false }); // Show failure notification
      }

      // Clear the notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    });
  };

  // Add a keydown event listener for Numpad Enter
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'NumpadEnter') {
        launchFingerprintApp();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown); // Cleanup on unmount
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center min-h-screen bg-gray-900">
      <LaboratoryName name="MAC Laboratory" />
      <div className="relative">
        <ClassScheduleCard />
      </div>
      <NFCReaderPopup />
      <AnnouncementPopup />
      {notification && (
        <NotificationPopup
          message={notification.message}
          isSuccess={notification.isSuccess}
        />
      )}
    </div>
  );
};

export default App;