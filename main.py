from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
import requests
import os
import mysql.connector  # Import MySQL connector
from dotenv import load_dotenv  # Import dotenv
import base64  # Import base64 for encoding BLOB data

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database connection function
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="maclab_db"
    )

# Proxy route for forwarding requests to the API
@app.route('/proxy/course-plotting', methods=['POST'])
def proxy_course_plotting():
    api_url = "https://unis.cspc.edu.ph/unise/APIv1/CoursePlotting"
    headers = {'Content-Type': 'application/json'}
    try:
        # Forward the request body to the actual API
        response = requests.post(api_url, json=request.json, headers=headers)
        response.raise_for_status()  # Raise an error for HTTP errors
        return jsonify(response.json())  # Return the API response to the client
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/proxy/students/<uid>', methods=['GET'])
def getStud(uid) -> list:
    api_url = f"https://profile.cspc.edu.ph/Api/StudentInfoByCard/{uid}"
    headers = {
        'Accept': '*/*',
        'Content-Type': 'text/plain',
        'Auth-ID': os.getenv('AUTH_ID'),  # Use AUTH_ID from .env
        'Authorization': os.getenv('AUTH')  # Use AUTH from .env
    }
    try: 
        # Forward the request body to the actual API
        response = requests.get(api_url, headers=headers)
        response.raise_for_status()  # Raise an error for HTTP errors
        return jsonify(response.json()), 200  # Return the API response to the client
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# New endpoint to fetch data from the fingerprints table
@app.route('/api/fingerprints', methods=['GET'])
def get_fingerprints():
    try:
        # Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)  # Use dictionary=True to get results as dicts

        # Execute the query
        query = "SELECT * FROM fingerprints"
        cursor.execute(query)

        # Fetch all rows
        rows = cursor.fetchall()

        # Convert BLOB data (bytes) to base64-encoded strings
        for row in rows:
            if isinstance(row['fingerprint_template'], bytes):
                row['fingerprint_template'] = base64.b64encode(row['fingerprint_template']).decode('utf-8')

        # Close the connection
        cursor.close()
        connection.close()

        return jsonify(rows), 200  # Return the rows as JSON
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/VenueAssignedMachines', methods=['GET'])
def getVenueandPC():
    try:
        # Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)  # Use dictionary=True to get results as dicts

        # Execute the query
        query = "SELECT * FROM venue_assigned_machines"
        cursor.execute(query)

        # Fetch all rows
        rows = cursor.fetchall()

        # Close the connection
        cursor.close()
        connection.close()

        return jsonify(rows), 200  # Return the rows as JSON
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/announcement', methods=['GET'])
def getAnnouncement():
    try:
        # Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)  # Use dictionary=True to get results as dicts

        # Execute the query
        query = "SELECT * FROM current_announcement"
        cursor.execute(query)

        # Fetch all rows
        rows = cursor.fetchall()

        # Close the connection
        cursor.close()
        connection.close()

        return jsonify(rows), 200  # Return the rows as JSON
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/announcement', methods=['PUT'])
def updateAnnouncement():
    try:
        # Parse the JSON payload from the request
        data = request.json
        content = data.get('content')
        is_image = data.get('isImage')

        if content is None or is_image is None:
            return jsonify({'error': 'Both "content" and "isImage" fields are required.'}), 400

        # Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor()

        # Update the announcement with id = 1
        query = "UPDATE current_announcement SET content = %s, isImage = %s WHERE id = 1"
        cursor.execute(query, (content, is_image))

        # Commit the changes
        connection.commit()

        # Close the connection
        cursor.close()
        connection.close()

        return jsonify({'message': 'Announcement updated successfully.'}), 200
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pctovenue', methods=['GET'])
def getAssignedVenues():
    try:
        # Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)  # Use dictionary=True to get results as dicts

        # Execute the query with JOINs
        query = """
        SELECT vam.*, m.machineName, v.VenueDesc
        FROM venue_assigned_machines vam
        JOIN machines m ON vam.machineID = m.machineID
        JOIN venue v ON vam.VenueID = v.VenueID;
        """
        cursor.execute(query)

        # Fetch all rows
        rows = cursor.fetchall()

        # Close the connection
        cursor.close()
        connection.close()

        return jsonify(rows), 200  # Return the rows as JSON
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/venues', methods=['GET'])
def getVenues():
    try:
        # Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)  # Use dictionary=True to get results as dicts

        # Execute the query
        query = "SELECT * FROM venue"
        cursor.execute(query)

        # Fetch all rows
        rows = cursor.fetchall()

        # Close the connection
        cursor.close()
        connection.close()

        return jsonify(rows), 200  # Return the rows as JSON
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_venue', methods=['PUT'])
def updateVenue():
    try:
        # Parse the JSON payload from the request
        data = request.json
        machine_id = data.get('machineID')
        venue_id = data.get('VenueID')

        if not machine_id or not venue_id:
            return jsonify({'error': 'Both "machineID" and "VenueID" fields are required.'}), 400

        # Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor()

        # Update the venue ID for the given machine ID
        query = "UPDATE venue_assigned_machines SET VenueID = %s WHERE machineID = %s"
        cursor.execute(query, (venue_id, machine_id))

        # Commit the changes
        connection.commit()

        # Close the connection
        cursor.close()
        connection.close()

        return jsonify({'message': 'Venue updated successfully.'}), 200
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/pc', methods=['GET'])
def getPC():
    try:
        # Connect to the database
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)  # Use dictionary=True to get results as dicts

        # Execute the query
        query = "SELECT * FROM machines"
        cursor.execute(query)

        # Fetch all rows
        rows = cursor.fetchall()

        # Close the connection
        cursor.close()
        connection.close()

        return jsonify(rows), 200  # Return the rows as JSON
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500
if __name__ == '__main__':
    app.run(host='localhost', port=5000)