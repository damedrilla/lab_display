import React from 'react';
import ClassScheduleCard from './components/ClassScheduleCard';
import LaboratoryName from './components/LaboratoryName';
import AnnouncementPopup from './components/AnnouncementPopup';
import NFCReaderPopup from './components/NFCReaderPopup'; // Import the NFC reader popup

const App = () => {
  return (
    <div className="relative flex flex-col items-center min-h-screen bg-gray-900">
      <LaboratoryName name="MAC Laboratory" />
      <div className="relative">
        <ClassScheduleCard />
        <AnnouncementPopup /> {/* Superimpose the announcement popup */}
      </div>
      <NFCReaderPopup /> {/* Include the NFC reader popup */}
    </div>
  );
};

export default App;