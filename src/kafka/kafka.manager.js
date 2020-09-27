const { ipcMain } = require('electron');
const KafkaProxy = require("./kafka.proxy.js");
const KafkaBridge = require("./kafka.java.proxy.js");
const fetch = require('node-fetch');

class KafkaManager {

    constructor(window) {
        this.connections = {};
        this.window = window;
        setInterval(async () => {
            await this.offloadMessages();
        }, 500);
    }

    async connect(name, brokers, useJavaProxy) {
        console.log('New connection to ' + brokers + ' named ' + name);
        let proxy = undefined;
        if (useJavaProxy) {
            await this.startJavaProxy();
            proxy = new KafkaBridge(name, brokers);
        } else {
            proxy = new KafkaProxy(brokers.split(','));
        }
        await proxy.connect();
        this.connections[name] = {
            proxy: proxy
        };
        this.window.webContents.send('connected', name);
        this.getTopics(name);
    }

    async disconnect(name) {
        console.log('disconnect ' + name);
        await this.connections[name].proxy.disconnect();
        delete this.connections[name];
    }

    async getOffsets(name, topic) {
        let offsets = await this.connections[name].proxy.getOffsets(topic);
        offsets.sort((a, b) => a.partition === b.partition? 0: a.partition < b.partition? -1 : 1);
        console.log('offsets', topic, offsets);
        this.window.webContents.send('offsets', { name, topic, offsets });
    }

    async getTopics(name) {
        let topics = await this.connections[name].proxy.getTopics();
        this.window.webContents.send('topics', { name, topics });
    }

    async subscribe(name, topic, offsets, isLoadMore) {
        offsets.sort((a, b) => a.partition === b.partition? 0: a.partition < b.partition? -1 : 1);
        await this.connections[name].proxy.subscribe(topic, offsets, isLoadMore);
    }

    async unsubscribe(name, topic) {
        await this.connections[name].proxy.unsubscribe(topic);
    }

    async publish(name, topic, message) {
        message.payload = message.value;
        await this.connections[name].proxy.produce(topic, message);
    }

    async offloadMessages() {
        for (let name of Object.keys(this.connections)) {
            let messages = await this.connections[name].proxy.offloadMessages();
            if (messages && messages.length > 0) {
                this.window.webContents.send('messages', { name, messages });
            }
        }
    }

    async startJavaProxy() {
        let appPath = require('electron').app.getAppPath();
        let jarPath = appPath + '\\lib\\kafka-admin.jar';
        if (appPath.endsWith('app.asar')) {
            jarPath = appPath + '\\..\\..\\lib\\kafka-admin.jar';
        }
        console.log("Starting Java proxy path at ", jarPath);
        if (await this.isJavaProxyUp()) {
            return;
        }
        let child = require('child_process').spawn('java', ['-jar', jarPath] );
        child.stdout.on('data', data => process.stdout.write(data.toString()));
        child.stderr.on('data', data => process.stdout.write(data.toString()));
        await sleep(3000);
        let i = 0;
        while (!(await this.isJavaProxyUp())) {
            console.log('Waiting Java proxy finish start up...');
            await sleep(1000);
            i++;
            if (i > 30) {
                throw 'Could not start Java bridge. Check if Java is on the path.';
            }
        }
    }

    async isJavaProxyUp() {
        try {
            if (await (await fetch('http://localhost:7980/api/admin')).text()) {
                return true;
            }
        } catch (e) {
        }
        return false;
    }

}

module.exports = KafkaManager;

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
