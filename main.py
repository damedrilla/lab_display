from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
import requests
import os
from dotenv import load_dotenv  # Import dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

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

if __name__ == '__main__':
    app.run(host='localhost', port=5000)