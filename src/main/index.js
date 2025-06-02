import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import path from 'path'
import { execFile } from 'child_process'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
    }
  })

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' *;"
        ],
      },
    });
  });
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('wss://localhost:8765')) {
    event.preventDefault(); // Prevent the default behavior
    callback(true); // Allow the insecure certificate
  } else if (url.startsWith('wss://localhost:8770')) {
    event.preventDefault(); // Prevent the default behavior
    callback(true); // Allow the insecure certificate
  }
  else {
    callback(false); // Reject other certificates
  }
});

ipcMain.on('run-verify-fingerprint', (event) => {
  const exePath = 'C:\\current_schedule\\VerifyFingerprintAPP\\bin\\Release\\net9.0-windows\\publish\\VerifyFingerprintAPP.exe';

  const child = execFile(exePath);

child.stdout.on('data', async (data) => {
  const output = data.toString();
  console.log("stdout:", output);

  const match = output.match(/employee no:\s*(EMP\d+)/i); // relaxed digit restriction

  if (match) {
    const employeeNumber = match[1].toUpperCase(); // normalize

    try {
      const response = await fetch('https://unis.cspc.edu.ph/unise/APIv1/Employee/');
      const json = await response.json();

      const employee = json.data.find(emp => emp.EmployeeNo === employeeNumber);

      if (employee) {
        const fullName = `${employee.FirstName} ${employee.LastName}`;
        event.reply('dotnet-result', {
          success: true,
          message: 'Fingerprint verification successful!',
          employeeNumber,
          fullName
        });
      } else {
        event.reply('dotnet-result', {
          success: true,
          message: `Fingerprint matched, but employee ID ${employeeNumber} was not found in the database.`,
          employeeNumber
        });
      }
    } catch (err) {
      console.error("Error fetching employee data:", err);
      event.reply('dotnet-result', {
        success: true,
        message: `Fingerprint matched with ${employeeNumber}, but failed to fetch employee details.`,
        employeeNumber
      });
    }
  } else if (output.includes("No match found")) {
    event.reply('dotnet-result', {
      success: false,
      message: 'Fingerprint verification failed.'
    });
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
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
