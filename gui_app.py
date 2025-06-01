import sys
import asyncio
import websockets
import base64
import requests
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QVBoxLayout, QHBoxLayout, QGroupBox, QLineEdit, QPushButton, QLabel, QComboBox, QRadioButton, QButtonGroup, QMessageBox, QFileDialog, QWidget, QDialog
)
from PySide6.QtCore import QThread, Signal


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
                        self.message_received.emit(message)
                    except Exception as e:
                        print(f"Error receiving message: {e}")
                        break
        except Exception as e:
            print(f"Failed to connect to WebSocket server: {e}")

    def run(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        while self.running:
            loop.run_until_complete(self.connect())
            if self.running:
                print("WebSocket disconnected. Reconnecting in 3 seconds...")
                loop.run_until_complete(asyncio.sleep(3))

    def send_message(self, message):
        try:
            if self.websocket:
                asyncio.run(self.websocket.send(message))
            else:
                print("WebSocket is not connected.")
        except Exception as e:
            print(f"Error sending message: {e}")

    def stop(self):
        self.running = False
        self.quit()


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Lab Display Remote Control")
        self.setGeometry(100, 100, 600, 600)

        # Main layout
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QVBoxLayout(self.central_widget)

        # Add sections
        self.add_update_venue_section()
        self.add_display_change_buttons_section()
        self.add_announcement_form_section()

        # WebSocket client
        self.websocket_client = WebSocketClient("ws://ws-server.local:8770")
        self.websocket_client.start()

    def add_update_venue_section(self):
        """Create the Update Venue form section."""
        update_venue_group = QGroupBox("Update Venue")
        update_venue_layout = QVBoxLayout()

        # Machine dropdown
        self.machine_label = QLabel("Select Machine:")
        update_venue_layout.addWidget(self.machine_label)

        self.machine_dropdown = QComboBox()
        update_venue_layout.addWidget(self.machine_dropdown)

        # Venue dropdown
        self.venue_label = QLabel("Select Venue:")
        update_venue_layout.addWidget(self.venue_label)

        self.venue_dropdown = QComboBox()
        update_venue_layout.addWidget(self.venue_dropdown)

        # Update button
        self.update_venue_button = QPushButton("Update Venue")
        update_venue_layout.addWidget(self.update_venue_button)

        # Add PC button
        self.add_pc_button = QPushButton("Add PC")
        update_venue_layout.addWidget(self.add_pc_button)
        self.add_pc_button.clicked.connect(self.show_add_pc_dialog)

        # Delete PC button
        self.delete_pc_button = QPushButton("Delete PC")
        self.delete_pc_button.setStyleSheet("background-color: #e3342f; color: white;")  # Red background
        update_venue_layout.addWidget(self.delete_pc_button)
        self.delete_pc_button.clicked.connect(self.delete_selected_pc)

        # Connect button to action
        self.update_venue_button.clicked.connect(self.update_venue)

        # Fetch data for dropdowns
        self.fetch_machines()
        self.machine_dropdown.currentIndexChanged.connect(self.update_venue_dropdown)

        update_venue_group.setLayout(update_venue_layout)
        self.main_layout.addWidget(update_venue_group)

    def add_display_change_buttons_section(self):
        """Create the Display Change buttons section."""
        display_change_group = QGroupBox("Display Change Buttons")
        display_change_layout = QHBoxLayout()

        # Buttons for specific actions
        self.schedule_button = QPushButton("Show Current Schedule")
        self.image_button = QPushButton("Show Plotting")
        self.announcement_button = QPushButton("Show Announcement")

        display_change_layout.addWidget(self.schedule_button)
        display_change_layout.addWidget(self.image_button)
        display_change_layout.addWidget(self.announcement_button)

        # Connect buttons to their respective actions
        self.schedule_button.clicked.connect(self.send_schedule_message)
        self.image_button.clicked.connect(self.send_image_message)
        self.announcement_button.clicked.connect(self.send_announcement_message)

        display_change_group.setLayout(display_change_layout)
        self.main_layout.addWidget(display_change_group)

    def add_announcement_form_section(self):
        """Create the Announcement form section."""
        announcement_group = QGroupBox("Announcement Form")
        announcement_layout = QVBoxLayout()

        # Radio buttons for type selection
        self.text_radio = QRadioButton("Text")
        self.image_radio = QRadioButton("Image")
        self.text_radio.setChecked(True)  # Default to text
        self.radio_group = QButtonGroup()
        self.radio_group.addButton(self.text_radio)
        self.radio_group.addButton(self.image_radio)
        announcement_layout.addWidget(self.text_radio)
        announcement_layout.addWidget(self.image_radio)

        # Announcement input
        self.announcement_label = QLabel("Enter Announcement Text:")
        announcement_layout.addWidget(self.announcement_label)

        self.announcement_input = QLineEdit()
        announcement_layout.addWidget(self.announcement_input)

        # Image upload button
        self.image_button_upload = QPushButton("Upload Image")
        announcement_layout.addWidget(self.image_button_upload)

        self.image_path_label = QLabel("No image selected")
        announcement_layout.addWidget(self.image_path_label)

        # Submit button
        self.submit_button = QPushButton("Submit Announcement")
        announcement_layout.addWidget(self.submit_button)

        # Connect buttons to their respective actions
        self.image_button_upload.clicked.connect(self.upload_image)
        self.submit_button.clicked.connect(self.submit_announcement)

        # Connect radio buttons to toggle visibility
        self.text_radio.toggled.connect(self.update_form_visibility)
        self.image_radio.toggled.connect(self.update_form_visibility)

        # Initialize form visibility
        self.update_form_visibility()

        announcement_group.setLayout(announcement_layout)
        self.main_layout.addWidget(announcement_group)

    def fetch_machines(self):
        """Fetch machines from the API and populate the machine dropdown."""
        try:
            response = requests.get("http://ws-server.local:5000/api/pc")
            if response.status_code == 200:
                machines = response.json()
                self.machine_dropdown.clear()
                for machine in machines:
                    # Add machineName and machineID to the dropdown
                    self.machine_dropdown.addItem(f"{machine['machineName']} (ID: {machine['machineID']})", machine['machineID'])
                # Trigger venue dropdown update for the first machine
                self.update_venue_dropdown()
            else:
                self.show_popup_message(f"Error fetching machines: {response.text}", success=False)
        except Exception as e:
            self.show_popup_message(f"Error fetching machines: {e}", success=False)

    def fetch_venues(self):
        """Fetch venues from the API and populate the venue dropdown."""
        try:
            response = requests.get("http://ws-server.local:5000/api/venues")
            if response.status_code == 200:
                venues = response.json()
                self.venue_dropdown.clear()
                for venue in venues:
                    # Add VenueDesc and VenueID to the dropdown
                    self.venue_dropdown.addItem(f"{venue['VenueDesc']} (ID: {venue['VenueID']})", venue['VenueID'])
            else:
                self.show_popup_message(f"Error fetching venues: {response.text}", success=False)
        except Exception as e:
            self.show_popup_message(f"Error fetching venues: {e}", success=False)

    def update_venue_dropdown(self):
        """Update the venue dropdown based on the selected machine."""
        selected_machine_id = self.machine_dropdown.currentData()
        if not selected_machine_id:
            return

        # Fetch assigned venue for the selected machine
        try:
            response = requests.get("http://ws-server.local:5000/api/pctovenue")
            if response.status_code == 200:
                assigned_venues = response.json()
                assigned_venue_id = None

                # Find the assigned venue for the selected machine
                for item in assigned_venues:
                    if item["machineID"] == selected_machine_id:
                        assigned_venue_id = item["VenueID"]
                        break

                # Fetch all venues and set the default selection
                self.fetch_venues()
                if assigned_venue_id:
                    index = self.venue_dropdown.findData(assigned_venue_id)
                    if index != -1:
                        self.venue_dropdown.setCurrentIndex(index)
            else:
                self.show_popup_message(f"Error fetching assigned venues: {response.text}", success=False)
        except Exception as e:
            self.show_popup_message(f"Error fetching assigned venues: {e}", success=False)

    def update_venue(self):
        """Send a PUT request to update the venue ID for a machine."""
        machine_id = self.machine_dropdown.currentData()
        venue_id = self.venue_dropdown.currentData()

        if not machine_id or not venue_id:
            self.show_popup_message("Error: Both Machine and Venue must be selected.", success=False)
            return

        try:
            response = requests.put(
                "http://ws-server.local:5000/api/update_venue",
                json={"machineID": machine_id, "VenueID": venue_id},
            )
            if response.status_code == 200:
                self.show_popup_message("Venue updated successfully.")
            else:
                self.show_popup_message(f"Error updating venue: {response.text}", success=False)
        except Exception as e:
            self.show_popup_message(f"Error sending request: {e}", success=False)

    def update_form_visibility(self):
        """Update the visibility of the form fields based on the selected radio button."""
        if self.text_radio.isChecked():
            self.announcement_label.show()
            self.announcement_input.show()
            self.image_button_upload.hide()
            self.image_path_label.hide()
        elif self.image_radio.isChecked():
            self.announcement_label.hide()
            self.announcement_input.hide()
            self.image_button_upload.show()
            self.image_path_label.show()

    def show_popup_message(self, message, success=True):
        msg_box = QMessageBox()
        msg_box.setIcon(QMessageBox.Information if success else QMessageBox.Critical)
        msg_box.setWindowTitle("Success" if success else "Error")
        msg_box.setText(message)
        msg_box.exec()

    def send_schedule_message(self):
        # Send a message to display the current schedule
        message = "show_schedule"
        try:
            self.websocket_client.send_message(message)
            self.show_popup_message("Sent: Show Current Schedule")
        except Exception as e:
            self.show_popup_message(f"Error: {e}", success=False)

    def send_image_message(self):
        # Send a message to display an image
        message = "show_image"
        try:
            self.websocket_client.send_message(message)
            self.show_popup_message("Sent: Show Plotting")
        except Exception as e:
            self.show_popup_message(f"Error: {e}", success=False)

    def send_announcement_message(self):
        # Send a message to display an announcement
        message = "show_announcement"
        try:
            self.websocket_client.send_message(message)
            self.show_popup_message("Sent: Show Announcement")
        except Exception as e:
            self.show_popup_message(f"Error: {e}", success=False)

    def upload_image(self):
        # Open a file dialog to select an image
        file_path, _ = QFileDialog.getOpenFileName(self, "Select Image", "", "Images (*.png *.jpg *.jpeg)")
        if file_path:
            self.image_path_label.setText(file_path)

    def submit_announcement(self):
        # Determine if the announcement is text or image
        if self.text_radio.isChecked():
            content = self.announcement_input.text()
            is_image = 0
        elif self.image_radio.isChecked():
            file_path = self.image_path_label.text()
            if file_path == "No image selected":
                self.show_popup_message("Error: No image selected.", success=False)
                return
            try:
                # Convert the image to base64
                with open(file_path, "rb") as image_file:
                    content = base64.b64encode(image_file.read()).decode('utf-8')
                is_image = 1
            except Exception as e:
                self.show_popup_message(f"Error reading image: {e}", success=False)
                return
        else:
            self.show_popup_message("Error: Invalid announcement type.", success=False)
            return

        # Send the PUT request to update the announcement
        try:
            response = requests.put(
                "http://ws-server.local:5000/api/announcement",
                json={"content": content, "isImage": is_image},
            )
            if response.status_code == 200:
                self.show_popup_message("Announcement updated successfully.")
            else:
                self.show_popup_message(f"Error updating announcement: {response.text}", success=False)
        except Exception as e:
            self.show_popup_message(f"Error sending request: {e}", success=False)

    def show_add_pc_dialog(self):
        from PySide6.QtWidgets import QDialog, QVBoxLayout, QLabel

        dialog = QDialog(self)
        dialog.setWindowTitle("Add PC")
        layout = QVBoxLayout(dialog)

        label = QLabel("Enter PC Name:")
        layout.addWidget(label)

        pc_name_input = QLineEdit()
        layout.addWidget(pc_name_input)

        submit_btn = QPushButton("Add")
        layout.addWidget(submit_btn)

        def submit():
            pc_name = pc_name_input.text().strip()
            if not pc_name:
                self.show_popup_message("PC name cannot be empty.", success=False)
                return

            # Check if PC name already exists
            try:
                response = requests.get("http://ws-server.local:5000/api/pc")
                if response.status_code == 200:
                    machines = response.json()
                    if any(machine['machineName'].lower() == pc_name.lower() for machine in machines):
                        self.show_popup_message("PC name already exists.", success=False)
                        return
                else:
                    self.show_popup_message(f"Error checking existing PCs: {response.text}", success=False)
                    return
            except Exception as e:
                self.show_popup_message(f"Error checking existing PCs: {e}", success=False)
                return

            # Proceed to add if not exists
            try:
                response = requests.post(
                    "http://ws-server.local:5000/api/pc",
                    json={"machineName": pc_name},
                )
                if response.status_code == 201:
                    self.show_popup_message("PC added successfully.")
                    self.fetch_machines()  # Refresh the dropdown
                    dialog.accept()
                else:
                    self.show_popup_message(f"Error adding PC: {response.text}", success=False)
            except Exception as e:
                self.show_popup_message(f"Error sending request: {e}", success=False)

        submit_btn.clicked.connect(submit)
        dialog.exec()

    def delete_selected_pc(self):
        from PySide6.QtWidgets import QMessageBox

        machine_id = self.machine_dropdown.currentData()
        machine_name = self.machine_dropdown.currentText()
        if not machine_id:
            self.show_popup_message("No PC selected to delete.", success=False)
            return

        # Show warning popup
        reply = QMessageBox.question(
            self,
            "Confirm Delete",
            f"Are you sure you want to delete '{machine_name}'?\n\nThis action cannot be undone.",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            try:
                response = requests.delete(f"http://ws-server.local:5000/api/pc/{machine_id}")
                if response.status_code == 200:
                    self.show_popup_message("PC deleted successfully.")
                    self.fetch_machines()  # Refresh the dropdown
                else:
                    self.show_popup_message(f"Error deleting PC: {response.text}", success=False)
            except Exception as e:
                self.show_popup_message(f"Error sending delete request: {e}", success=False)

    def closeEvent(self, event):
        self.websocket_client.stop()
        super().closeEvent(event)


class LoadingDialog(QDialog):
    def __init__(self, message="Loading...", parent=None):
        super().__init__(parent)
        self.setWindowTitle("Please Wait")
        self.setModal(True)
        layout = QVBoxLayout(self)
        label = QLabel(message)
        layout.addWidget(label)
        self.setFixedSize(200, 80)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())