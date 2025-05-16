@echo off
CD /D "%~dp0"
start node websocket-server.js
start python nfc_websocket.py
start python3 main.py