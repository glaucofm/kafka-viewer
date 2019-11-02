const { app, ipcMain, BrowserWindow } = require('electron');

let win;

const { fork } = require('child_process');
const nodeClient = fork(`${__dirname}/../kafka/kafka.client.js`);

function createWindow () {

    win = new BrowserWindow({
        autoHideMenuBar: true,
        title: 'Kafka Viewer',
        webPreferences: {
            webSecurity: false
        }
    });

    win.loadURL(`file://${__dirname}/../../dist/angular/index.html`);

    // win.webContents.openDevTools();

    win.maximize();

    win.on('closed', function () {
        nodeClient.kill('SIGINT');
        win = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        nodeClient.kill('SIGINT');
        app.quit()
    }
});

app.on('activate', function () {
    if (win === null) {
        createWindow()
    }
});
