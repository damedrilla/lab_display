import asyncio
import websockets
import json
from PySide6.QtWidgets import QApplication, QVBoxLayout, QLineEdit, QPushButton, QLabel, QWidget
from PySide6.QtCore import QTimer


class MessageHandlerGUI(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Message Handler")
        self.setGeometry(100, 100, 400, 300)

        # Layout and widgets
        self.layout = QVBoxLayout()
        self.label = QLabel("Enter your message:")
        self.layout.addWidget(self.label)

        self.input_field = QLineEdit()
        self.layout.addWidget(self.input_field)

        self.send_button = QPushButton("Send Message")
        self.send_button.clicked.connect(self.handle_send_message)  # Connect to a synchronous wrapper
        self.layout.addWidget(self.send_button)

        self.messages_label = QLabel("Messages:")
        self.layout.addWidget(self.messages_label)

        self.setLayout(self.layout)

        # WebSocket connection
        self.websocket = None

    async def connect_to_server(self):
        """Connect to the WebSocket server."""
        try:
            self.websocket = await websockets.connect("ws://localhost:8770")
            print("Connected to WebSocket server")
            asyncio.create_task(self.receive_messages())
        except Exception as e:
            print(f"Failed to connect to WebSocket server: {e}")

    def handle_send_message(self):
        """Handle the send button click and schedule the send_message coroutine."""
        asyncio.create_task(self.send_message())

    async def send_message(self):
        """Send a message to the WebSocket server."""
        if self.websocket:
            message = self.input_field.text()
            if message:
                await self.websocket.send(message)
                self.input_field.clear()

    async def receive_messages(self):
        """Receive messages from the WebSocket server."""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                self.messages_label.setText(f"Messages:\n{data['message']}")
        except websockets.ConnectionClosed:
            print("Connection to WebSocket server closed")


async def main():
    """Start the PySide6 GUI and asyncio event loop."""
    app = QApplication([])
    gui = MessageHandlerGUI()
    gui.show()

    # Start the WebSocket connection
    await gui.connect_to_server()

    # Run the PySide6 event loop
    loop = asyncio.get_event_loop()
    QTimer.singleShot(0, loop.stop)  # Ensure the event loop stops when the GUI closes
    app.exec()


if __name__ == "__main__":
    asyncio.run(main())