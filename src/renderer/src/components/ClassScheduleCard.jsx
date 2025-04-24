import React, { useState, useEffect } from 'react';
import dummyData from './DummyData'; // Import the dummy data

// Helper function to convert 24-hour time to 12-hour format
const formatTimeTo12Hour = (time) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12; // Convert 0 to 12-hour format
  return `${formattedHour}:${minutes} ${ampm}`;
};

const ClassScheduleCard = () => {
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState([]);
  const [useDummyData, setUseDummyData] = useState(false); // Toggle for test mode

  // Function to fetch schedule data from the API
  const fetchScheduleData = async () => {
    if (useDummyData) {
      console.log('Using dummy data');
      setScheduleData(dummyData); // Use dummy data in test mode
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/proxy/course-plotting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          VenueID: '0000000009',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schedule data');
      }

      const data = await response.json();
      setScheduleData(data.data); // Update state with fetched data
    } catch (error) {
      console.error('Error fetching schedule data:', error);
    }
  };

  // Poll the API every 30 seconds
  useEffect(() => {
    fetchScheduleData(); // Fetch data immediately on mount

    const interval = setInterval(() => {
      fetchScheduleData();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [useDummyData]); // Re-run when `useDummyData` changes

  // Update the current date every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // Algorithm to check if a schedule is the current one
  useEffect(() => {
    const checkCurrentSchedule = () => {
      const now = new Date();
      const nowTimeString = now.toTimeString().split(' ')[0]; // Format as HH:mm:ss
      const currentDay = (now.getDay() || 7).toString(); // Get current day as a string (1 = Monday, 7 = Sunday)

      const current = scheduleData.find((schedule) => {
        const startTime = new Date(`1970-01-01T${schedule.StartTime}`);
        const endTime = new Date(`1970-01-01T${schedule.EndTime}`);
        const nowTime = new Date(`1970-01-01T${nowTimeString}`);
        return (
          nowTime >= startTime &&
          nowTime <= endTime &&
          schedule.DayOfWeek === currentDay // Match the current day
        );
      });

      setCurrentSchedule(current || null); // Update state with the current schedule or null
    };

    const interval = setInterval(checkCurrentSchedule, 1000); // Check every second
    checkCurrentSchedule(); // Run immediately on mount

    return () => clearInterval(interval); // Cleanup on unmount
  }, [scheduleData]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 flex gap-6">
          <div className="rounded-md bg-gray-100 dark:bg-gray-700 flex-grow flex justify-center items-center flex-col">
            {/* Month with red background */}
            <p className="text-2xl font-medium text-white bg-red-600 w-full text-center px-4 py-2 rounded-t-md">
              {currentDate.toLocaleDateString('en-US', { month: 'long' })} {/* Current month */}
            </p>
            {/* Day with white background */}
            <p className="text-9xl font-bold text-gray-800 bg-white px-6 py-4">
              {currentDate.getDate()} {/* Current date */}
            </p>
            {/* Weekday with white background */}
            <p className="text-2xl font-medium text-gray-800 bg-white w-full text-center px-4 py-2 rounded-b-md">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long' })} {/* Current weekday */}
            </p>
          </div>
          <div className="p-4 rounded-md bg-gray-100 dark:bg-gray-700 flex-grow flex flex-col justify-center text-left">

            {currentSchedule ? (
              <>
                <p className="text-2xl font-bold text-gray-500 dark:text-gray-400 mb-4">{currentSchedule.CourseCode}</p>
                <p className="text-5xl font-bold text-gray-600 dark:text-gray-300 mb-4">
                  {currentSchedule.CourseName.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}
                </p>
                <div className="flex items-center gap-4">
                  <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                    {`${currentSchedule.FirstName.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())} ${currentSchedule.LastName.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}`}
                  </p>
                  <span className="text-xl font-bold text-gray-500 dark:text-gray-400">|</span>
                  <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                    {`${currentSchedule.ProgramAbbr} ${currentSchedule.YearLevel}${currentSchedule.Section}`}
                  </p>
                  <span className="text-xl font-bold text-gray-500 dark:text-gray-400">|</span>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                    {formatTimeTo12Hour(currentSchedule.StartTime)} - {formatTimeTo12Hour(currentSchedule.EndTime)}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xl font-medium text-gray-700 dark:text-gray-200">No class is currently ongoing.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassScheduleCard;