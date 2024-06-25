import electron from 'electron';
import Store from 'electron-store';
import path from 'path';
import { fileURLToPath } from 'url';
import fs, { read } from 'fs';


// Set __dirname
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Import modules
const {app, BrowserWindow, Menu, Tray, nativeImage, ipcMain} = electron;

// Set environment
process.env.NODE_ENV = 'development';

// Check environment
const isDev = process.env.NODE_ENV !== 'production';

// Check platform
const isMac = process.platform === 'darwin';

//Set app name
app.setName('Reminders');

// Init store & defaults
const store = new Store();

let mainWindow;
let remindersList = [];

// Create main window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'Reminders',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, './preload.js')
        }
    });

    // Open dev tools if not in production
    if(isDev){
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile('./renderer/mainWindow.html');
}

// Create about window
function createAboutWindow() {
    let aboutWindow = new BrowserWindow({
        title: 'About',
        width: 300,
        height: 450,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, './preload.js')
        }
    });

    aboutWindow.loadFile('./renderer/about.html');

    // Intercept link clicks to open in external browser
    aboutWindow.webContents.on('will-navigate', (e, url) => {
        e.preventDefault();
        electron.shell.openExternal(url);
    });

    aboutWindow.show();

    // Garbage collection
    aboutWindow.on('close', () => {
        aboutWindow = null;
    });
}

//Create Tray
function createTray() {
    // check if keepInTray is set to false
    if (!store.get('keepInTray')) return;

    const icon = nativeImage.createFromPath('./assets/icons/png/icon.png');
    const tray = new Tray(icon);

    tray.setToolTip('Reminders');
    tray.setContextMenu(Menu.buildFromTemplate(trayMenu));
}

// Create add window
function createAddWindow() {
    let addWindow = new BrowserWindow({
        title: 'New Reminder',
        width: 300,
        height: 300,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, './preload.js')
        }
    });

    addWindow.loadFile('./renderer/newReminder.html');

    addWindow.show();

    // Garbage collection
    addWindow.on('close', () => {
        addWindow = null;
    });
}

// Create restart window
function createRestartWindow() {
    let restartWindow = new BrowserWindow({
        title: 'Restart Required',
        width: 300,
        height: 200,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, './preload.js')
        }
    });

    restartWindow.loadFile('./renderer/restart.html');

    restartWindow.show();

    // Garbage collection

    restartWindow.on('close', () => {
        restartWindow = null;
    });
}

// Create load window
function createLoadWindow() {
    let loadWindow = new BrowserWindow({
        title: 'Load Reminders',
        width: 300,
        height: 200,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, './preload.js')
        }
    });

    loadWindow.loadFile('./renderer/loadReminders.html');

    loadWindow.show();

    // Garbage collection
    loadWindow.on('close', () => {
        loadWindow = null;
    });
}

// Read saved JSON file and set remindersList
function readJSONFile(filePath) {
    // Check if file exists
    fs.readFile(filePath, 'utf8', (err, data) => {
        // Check for error
        if(err){
            console.log(err);
            return;
        }

        // Log file path
        console.log("Reading file from: " + filePath);

        // Parse JSON data and check for errors
        let reminders;
        try {
            reminders = JSON.parse(data);
        } catch (err) {
            console.log(err);
            return;
        }

        //convert reminders to array
        remindersList = Object.values(reminders);
        console.log("Reminders file read successfully");
    });
}

// Add reminder and save to JSON file
function saveJSONFile(filePath, event) {
    // Add to remindersList
    remindersList.push(event);

    console.log(remindersList);

    // Convert remindersList to JSON
    let reminders = {};
    for(let i = 0; i < remindersList.length; i++){
        reminders[i] = remindersList[i];
    }
    

    // Write to JSON file
    fs.writeFile(filePath, JSON.stringify(reminders), (err) => {
        if(err){
            console.log(err);
            return;
        }

        console.log("Reminders saved to file");
    });
}

ipcMain.on('app:restart', () => {
    app.relaunch();
    app.quit();
});

ipcMain.on('reminder:add', (ipcEvent, event) => {
    console.log(event);
    
    // Add to remindersList
    saveJSONFile(store.get('loadPath'), event);

    mainWindow.webContents.send('reminder:add', event);
});

ipcMain.on('reminder:load', (ipcEvent, loadPath) => {
    store.set('loadPath', loadPath);
    readJSONFile(store.get('loadPath'));
});

// Listen for app to be ready
app.whenReady().then(() => {
    createMainWindow();

    // Implement menu
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    readJSONFile(store.get('loadPath'));

    // Implement tray
    createTray();

    app.on('activate', () => {
        if(BrowserWindow.getAllWindows().length === 0){
            createMainWindow();
        }
    });
});

// Menu template
const menu = [
    ...(isMac ? [{
        label: app.name,
        submenu: [
            {
                label: 'About Reminders',
                click: createAboutWindow
            },
            {type: 'separator'},
            {role: 'quit'}
        ]
    }] : []),
    {
        label: 'File',
        submenu: [
            {
                label: 'New Reminder',
                accelerator: 'CmdOrCtrl+A',
                click: createAddWindow
            },
            {
                label: 'Load Reminders',
                click: createLoadWindow
            },
            {
                label: 'Keep in tray',
                type: 'checkbox',
                checked: store.get('keepInTray'),
                tooltip: 'Requires Restart',
                click: e => {
                    store.set('keepInTray', e.checked);
                    createRestartWindow();
                    console.log('Keep in tray ' + store.get('keepInTray'));
                }
            },
            {type: 'separator'},
            isMac ? {role: 'close'} : {role: 'quit'}
        ]
    },
    ...(!isMac ? [{
        label: 'Help',
        submenu: [
            {
                label: 'About',
                click: createAboutWindow
            }
        ]
    }] : [])
];

// Tray menu
const trayMenu = [
    {
        label: 'Open Reminders',
        click: () => {
            if(BrowserWindow.getAllWindows().length === 0){
                createMainWindow();
            }
        }
    },
    {
        label: 'New Reminder',
        click: createAddWindow
    },
    {
        type: 'separator'
    },
    {
        label: 'About Reminders...',
        click: createAboutWindow
    },
    {
        type: 'separator'
    },
    {
        label: 'Keep in tray',
        type: 'checkbox',
        checked: store.get('keepInTray'),
        tooltip: 'Requires Restart',
        click: e => {
            store.set('keepInTray', e.checked);
            createRestartWindow();
            console.log('Keep in tray ' + store.get('keepInTray'));
        }
    },
    {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit()
    }
];

if(isDev){
    menu.push({
        label: 'Developer',
        submenu: [
            {role: 'reload'},
            {role: 'forcereload'},
            {type: 'separator'},
            {role: 'toggledevtools'}
        ]
    });
}

app.on('window-all-closed', () => {
    if(!isMac) {
        app.quit();
    }
});