import React from 'react';

const NotificationPopup = ({ message, isSuccess }) => {
  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${
        isSuccess ? 'bg-green-600' : 'bg-red-600'
      } text-white`}
    >
      <p className="text-lg font-bold">{message}</p>
    </div>
  );
};

export default NotificationPopup;