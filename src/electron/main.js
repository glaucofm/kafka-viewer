const { app, ipcMain, BrowserWindow } = require('electron');
const http = require('http');
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

    http.createServer(handleRequest).listen(32876, function() {
        console.log('Internal server started at http://localhost:32876');
    });
}

// -------------------------------------------------------------------------------------------
// electron events
// -------------------------------------------------------------------------------------------

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

// -------------------------------------------------------------------------------------------
// internal web server for UI communication
// -------------------------------------------------------------------------------------------

function handleRequest(request, response) {
    const { headers, method, url } = request;
    let body = [];
    request.on('error', (err) => {
        console.error(err);
    }).on('data', (chunk) => {
        body.push(chunk);
    }).on('end', () => {
        body = Buffer.concat(body).toString();
        let responseBody = processRequest(headers, method, url, body);
        response.end(JSON.stringify(responseBody));
    });
}

/*
body: {
    type: EventType,
    data: any
}
 */
function processRequest(headers, method, url, body) {
    console.log(method, url, body);
    if (method === 'GET') {
        return kafkaManager.getEvents();
    } else if (method === 'POST') {
        body = JSON.parse(body);
        if (body.type === 'connect') {
            connect(body.data);
        } else if (body.type === 'disconnect') {
            disconnect(body.data);
        } else if (body.type === 'get-offsets') {
            getOffsets(body.data);
        } else if (body.type === 'subscribe') {
            subscribe(body.data);
        } else if (body.type === 'unsubscribe') {
            unsubscribe(body.data);
        } else if (body.type === 'publish') {
            publish(body.data);
        }
    }
}

// -------------------------------------------------------------------------------------------
// Events from the UI
// -------------------------------------------------------------------------------------------

// data: {
//     name: string;
//     brokers: string;
//     useJavaProxy: boolean;
// }
function connect(data) {
    console.log('connect', data);
    kafkaManager.connect(data.name, data.brokers, data.useJavaProxy);
}

// data: string
function disconnect(data) {
    console.log('disconnect', data);
    kafkaManager.disconnect(data);
}

// data: {
//     name: string;
//     topic: string;
// }
function getOffsets(data) {
    console.log('get-offsets', data);
    kafkaManager.getOffsets(data.name, data.topic);
}

// data: {
//     name: string;
//     topic: string;
//     offsets: [{ partition: number, position: number, end: number }],
//     isLoadMore: boolean
// }
function subscribe(data) {
    console.log('subscribe', data);
    kafkaManager.subscribe(data.name, data.topic, data.offsets, data.isLoadMore);
}

// data: {
//     name: string;
//     topic: string;
// }
function unsubscribe(data) {
    console.log('unsubscribe', data);
    kafkaManager.unsubscribe(data.name, data.topic);
}

// data: {
//     name: string;
//     topic: string;
//     message: {
//         key: string;
//         value: string;
//         headers: { [key: string]: string };
//    }
// }
function publish(data) {
    console.log('publish', data);
    kafkaManager.publish(data.name, data.topic, data.message);
}

