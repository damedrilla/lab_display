import React, { useState, useEffect } from 'react';
import logo from '../assets/CSS.png'; // Import the image

const LaboratoryName = ({ name }) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrentTime(timeString);
    };

    const interval = setInterval(updateClock, 1000); // Update every second
    updateClock(); // Initialize immediately

    return () => clearInterval(interval); // Cleanup on component unmount
  }, []);

  return (
    <div className="w-full flex items-center justify-between py-4 px-8 bg-gray-800 text-white">
      {/* Left: Logo and Laboratory Name */}
      <div className="flex items-center">
        <img
          src={logo} // Use the imported image
          alt="Logo"
          className="h-12 w-12 mr-4" // Adjust size and spacing as needed
        />
        <p className="text-4xl font-bold">{name || 'Loading...'}</p> {/* Increased font size */}
      </div>

      {/* Right: Real-Time Clock */}
      <div className="text-3xl font-bold ">{currentTime}</div>
    </div>
  );
};

export default LaboratoryName;