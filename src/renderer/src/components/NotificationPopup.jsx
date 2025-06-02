import React from 'react';

const NotificationPopup = ({ message, isSuccess }) => {
  let style = 'bg-yellow-500'; // Default style for warnings
  if (isSuccess === 'yes') {
    style = 'bg-green-500'; // Style for success messages
  } else if (isSuccess === 'no') {
    style = 'bg-red-500'; // Style for error messages
  } else if (isSuccess === 'waiting') {
    style = 'bg-yellow-500'; // Style for informational messages
  }
  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${
        style
      } text-white`}
    >
      <p className="text-lg font-bold">{message}</p>
    </div>
  );
};

export default NotificationPopup;