import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Plotting = ({ machineID }) => {
  const [scheduleHTML, setScheduleHTML] = useState('');
  const [venueID, setVenueID] = useState(null); // State for dynamic VenueID

  // Fetch VenueID based on machineID
  useEffect(() => {
    const fetchVenueID = async () => {
      try {
        const response = await axios.get('http://ws-server.local:5000/api/pctovenue');
        const data = response.data;

        // Find the VenueID for the given machineID
        const machineVenue = data.find((item) => parseInt(item.machineID, 10) === parseInt(machineID, 10));
        if (machineVenue) {
          setVenueID(machineVenue.VenueID);
        } else {
          console.warn('No VenueID found for the given machineID.');
          setVenueID(null);
        }
      } catch (error) {
        console.error('Error fetching VenueID:', error);
        setVenueID(null);
      }
    };

    fetchVenueID();
  }, [machineID]);

  // Fetch schedule based on VenueID
  useEffect(() => {
    if (!venueID) return; // Skip fetching if VenueID is not available

    const fetchSchedule = async () => {
      try {
        const response = await axios.post(
          'http://ws-server.local:5000/proxy/course-plotting',
          { VenueID: venueID }
        );
        const scheduleArray = Array.isArray(response.data) ? response.data : response.data.data;
        const dayOfWeekMapping = {
          1: 'Monday',
          2: 'Tuesday',
          3: 'Wednesday',
          4: 'Thursday',
          5: 'Friday',
          6: 'Saturday',
          7: 'Sunday',
        };

        const mergedSchedule = {};
        scheduleArray.forEach((schedule) => {
          const day = dayOfWeekMapping[schedule.DayOfWeek];
          const startHour = parseInt(schedule.StartTime.split(':')[0]);
          const endHour = parseInt(schedule.EndTime.split(':')[0]);
          const duration = endHour - startHour;

          const info = `
            <strong>${schedule.CourseCode}</strong><br/>
            ${schedule.ProgramAbbr} ${schedule.YearLevel}${schedule.Section}
            <br/>${schedule.LastName}<br/>
          `;

          if (!mergedSchedule[day]) mergedSchedule[day] = {};
          mergedSchedule[day][startHour] = {
            content: info,
            rowspan: duration,
          };

          for (let h = startHour + 1; h < endHour; h++) {
            mergedSchedule[day][h] = 'SKIP';
          }
        });

        let tableHTML = '<table class="table-auto mb-5 w-full border-collapse">';
        tableHTML += '<thead class="bg-gray-800 border-white border-2 text-white">';
        tableHTML += '<tr>';
        tableHTML += '<th class="px-4 py-2 text-center w-1/8">Time</th>';
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        days.forEach((day) => {
          tableHTML += `<th class="px-4 py-2 border-white border-2 text-center w-1/8">${day}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';

        for (let hour = 7; hour <= 19; hour++) {
          const start = new Date(0, 0, 0, hour, 0);
          const end = new Date(0, 0, 0, hour + 1, 0);
          const formatTime = (date) =>
            `${date.getHours() % 12 || 12}:00 ${date.getHours() < 12 ? 'AM' : 'PM'}`;
          const timeSlotLabel = `${formatTime(start)} - ${formatTime(end)}`;

          tableHTML += `<tr style="height: 50px;"><td class="px-4 py-2 border-black border-1 text-center align-middle font-semibold">${timeSlotLabel}</td>`;

          days.forEach((day) => {
            const cellData = mergedSchedule[day]?.[hour];
            if (cellData === 'SKIP') return;

            if (cellData) {
              tableHTML += `<td rowspan="${cellData.rowspan}" class="px-4 py-2 text-center border-white border-1 align-middle bg-gray-900 text-white">${cellData.content}</td>`;
            } else {
              tableHTML += `<td class="px-4 py-2 border-black border-1 text-center align-middle"></td>`;
            }
          });

          tableHTML += '</tr>';
        }

        tableHTML += '</tbody></table>';
        setScheduleHTML(tableHTML);
      } catch (error) {
        console.error('Error fetching schedule:', error);
        setScheduleHTML('<p>Error retrieving schedule data.</p>');
      }
    };

    fetchSchedule();
  }, [venueID]);

  return (
    <div className="p-0">
      <h1 className="mb-4 font-bold text-3xl text-white text-center ml-2">Class Plotting</h1>
      <div className="w-screen">
        <div className="col-md-12">
          <div
            id="schedule-container"
            className="h-[80vh] w-screen overflow-y-auto border border-gray-300 rounded-md p-4 bg-white shadow-md"
            dangerouslySetInnerHTML={{ __html: scheduleHTML }}
          />
        </div>
      </div>
    </div>
  );
};

export default Plotting;