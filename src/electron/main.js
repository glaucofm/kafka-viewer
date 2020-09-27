const { app, ipcMain, BrowserWindow } = require('electron');
const KafkaManager = require("../kafka/kafka.manager.js");

let win;

let kafkaManager;

function createWindow () {
    win = new BrowserWindow({
        autoHideMenuBar: true,
        title: 'Kafka Viewer',
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true
        }
    });

    win.loadURL(`file://${__dirname}/../../dist/angular/index.html`);

    // win.webContents.openDevTools();

    win.maximize();

    win.on('closed', function () {
        // nodeClient.kill('SIGINT');
        win = null;
    });

    kafkaManager = new KafkaManager(win);
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        // nodeClient.kill('SIGINT');
        app.quit()
    }
});

app.on('activate', function () {
    if (win === null) {
        createWindow()
    }
});

// data: {
//     name: string;
//     brokers: string;
// }
ipcMain.on("connect", async (event, data) => {
    console.log('connect', data);
    kafkaManager.connect(data.name, data.brokers, data.useJavaProxy);
});

// data: string
ipcMain.on("disconnect", async (event, data) => {
    console.log('disconnect', data);
    kafkaManager.disconnect(data);
});

// data: {
//     name: string;
//     topic: string;
// }
ipcMain.on("get-offsets", async (event, data) => {
    console.log('get-offsets', data);
    kafkaManager.getOffsets(data.name, data.topic);
});

// data: {
//     name: string;
//     topic: string;
//     offsets: [{ partition: number, position: number, end: number }],
//     isLoadMore: boolean
// }
ipcMain.on("subscribe", async (event, data) => {
    console.log('subscribe', data);
    kafkaManager.subscribe(data.name, data.topic, data.offsets, data.isLoadMore);
});

// data: {
//     name: string;
//     topic: string;
// }
ipcMain.on("unsubscribe", async (event, data) => {
    console.log('unsubscribe', data);
    kafkaManager.unsubscribe(data.name, data.topic);
});

// data: {
//     name: string;
//     topic: string;
//     message: {
//         key: string;
//         value: string;
//         headers: { [key: string]: string };
//    }
// }
ipcMain.on("publish", async (event, data) => {
    console.log('publish', data);
    kafkaManager.publish(data.name, data.topic, data.message);
});

