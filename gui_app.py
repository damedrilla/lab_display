import sys
import asyncio
import websockets
from PySide6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QLineEdit, QPushButton, QTextEdit, QWidget, QLabel, QSpinBox
from PySide6.QtCore import QThread, Signal
import json

class WebSocketClient(QThread):
    message_received = Signal(str)  # Signal to send messages to the GUI

    def __init__(self, uri):
        super().__init__()
        self.uri = uri
        self.running = True
        self.websocket = None

    async def connect(self):
        try:
            async with websockets.connect(self.uri) as websocket:
                self.websocket = websocket
                while self.running:
                    try:
                        message = await websocket.recv()
                        self.message_received.emit(message)  # Emit the received message to the GUI
                    except Exception as e:
                        print(f"Error receiving message: {e}")
                        break
        except Exception as e:
            print(f"Failed to connect to WebSocket server: {e}")

    def run(self):
        asyncio.run(self.connect())

    def send_message(self, message):
        try:
            asyncio.run(self.websocket.send(message))
        except Exception as e:
            print(f"Error sending message: {e}")

    def stop(self):
        self.running = False
        self.quit()


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("WebSocket Client")
        self.setGeometry(100, 100, 400, 400)

        # Layout and widgets
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.layout = QVBoxLayout(self.central_widget)

        # Message display
        self.message_display = QTextEdit()
        self.message_display.setReadOnly(True)
        self.layout.addWidget(self.message_display)

        # Message input
        self.message_input = QLineEdit()
        self.message_input.setPlaceholderText("Enter your message here...")
        self.layout.addWidget(self.message_input)

        # Duration input
        self.duration_label = QLabel("Announcement Duration (minutes):")
        self.layout.addWidget(self.duration_label)

        self.duration_input = QSpinBox()
        self.duration_input.setRange(1, 60)  # Allow durations between 1 and 60 minutes
        self.duration_input.setValue(5)  # Default duration is 5 minutes
        self.layout.addWidget(self.duration_input)

        # Send button
        self.send_button = QPushButton("Send")
        self.layout.addWidget(self.send_button)

        # WebSocket client
        self.websocket_client = WebSocketClient("ws://localhost:8770")
        self.websocket_client.message_received.connect(self.display_message)
        self.websocket_client.start()

        # Connect button click to send message
        self.send_button.clicked.connect(self.send_message)

    def display_message(self, message):
        self.message_display.append(f"Received: {message}")

    def send_message(self):
        message = self.message_input.text()
        duration = self.duration_input.value()
        if message:
            # Combine the message and duration into a JSON object
            json_message = [message, duration]
            self.websocket_client.send_message(str(json_message))
            self.message_display.append(f"Sent: {json_message}")
            self.message_input.clear()

    def closeEvent(self, event):
        self.websocket_client.stop()
        super().closeEvent(event)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())