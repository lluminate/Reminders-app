import electron from 'electron';
import Store from 'electron-store';

// Import modules
const {app, BrowserWindow, Menu, Tray, nativeImage} = electron;

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

// Create main window
function createMainWindow() {
    const mainWindow = new BrowserWindow({
        title: 'Reminders'
    });

    // Open dev tools if not in production
    if(isDev){
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile('./renderer/mainWindow.html');
}

// Create about window
function createAboutWindow() {
    const aboutWindow = new BrowserWindow({
        title: 'About',
        width: 300,
        height: 450,
        resizable: false,
    });

    aboutWindow.loadFile('./renderer/about.html');

    // Intercept link clicks to open in external browser
    aboutWindow.webContents.on('will-navigate', (e, url) => {
        e.preventDefault();
        electron.shell.openExternal(url);
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
    const addWindow = new BrowserWindow({
        title: 'New Reminder',
        width: 300,
        height: 200
    });

    addWindow.loadFile('./renderer/newReminder.html');
}

// Listen for app to be ready
app.whenReady().then(() => {
    createMainWindow();

    // Implement menu
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

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
                label: 'Keep in tray',
                type: 'checkbox',
                checked: store.get('keepInTray'),
                click: e => {
                    store.set('keepInTray', e.checked);
                    app.relaunch();
                    app.exit();
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
        click: e => {
            store.set('keepInTray', e.checked);
            app.relaunch();
            app.exit();
            console.log('Keep in tray ' + store.get('keepInTray'));
        }
    },
    {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit()
    }
];

app.on('window-all-closed', () => {
    if(!isMac) {
        app.quit();
    }
});