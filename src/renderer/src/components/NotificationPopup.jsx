const NotificationPopup = ({ message, isSuccess }) => {
  let style = 'bg-yellow-600';
  if (isSuccess === 'yes') {
    style = 'bg-green-600';
  } else if (isSuccess === 'pending') {
    style = 'bg-yellow-600';
  } else if (isSuccess === 'no') {
    style = 'bg-red-600';
  }
  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${style} text-white`}
    >
      <p className="text-lg font-bold">{message}</p>
    </div>
  );
};

export default NotificationPopup;