import { ipcMain } from 'electron';
import { execFile } from 'child_process';
import { ipcRenderer } from 'electron';

// Show a notification for the result
function showNotification(title, body) {
  new Notification(title, { body });
}

// Modify the `launchFingerprintApp` function to include notifications
ipcMain.on('run-verify-fingerprint', (event) => {
    const exePath = 'C:\\Users\\PC2\\Downloads\\maclab-registration\\maclab-registration\\FingerprintAPP\\VerifyFingerprintAPP\\bin\\Release\\net9.0-windows\\VerifyFingerprintAPP.exe';
  
    const child = execFile(exePath);
  
    child.stdout.on('data', (data) => {
      console.log("stdout:", data);
  
      if (data.includes("Fingerprint MATCHED")) {
        event.reply('dotnet-result', { success: true, message: 'Fingerprint verification successful!' });
      } else if (data.includes("No match found")) {
        event.reply('dotnet-result', { success: false, message: 'Fingerprint verification failed.' });
      }
    });
  
    child.stderr.on('data', (data) => {
      console.error("stderr:", data);
    });
  
    child.on('error', (error) => {
      console.error("Failed to launch fingerprint verification app:", error);
      event.reply('dotnet-result', { success: false, message: 'Fingerprint verification failed!' });
    });
  
    child.on('close', (code) => {
      console.log(`Fingerprint verification app exited with code ${code}`);
    });
  });