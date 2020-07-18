const { ipcMain } = require('electron');
const KafkaProxy = require("./kafka.proxy.js");

class KafkaManager {

    constructor(window) {
        this.connections = {};
        this.window = window;
        setInterval(() => {
            this.offloadMessages();
        }, 500);

    }

    async connect(name, brokers) {
        console.log('New connection to ' + brokers + ' named ' + name);
        let proxy = new KafkaProxy(brokers.split(','));
        await proxy.connect();
        this.connections[name] = {
            proxy: proxy,
            subscriptions: []
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
        this.window.webContents.send('offsets', { name, topic, offsets });
    }

    async getTopics(name) {
        let topics = await this.connections[name].proxy.getTopics();
        this.window.webContents.send('topics', { name, topics });
    }

    async subscribe(name, topic, offsets) {
        await this.connections[name].proxy.subscribe(topic, offsets);
    }

    async unsubscribe(name, topic) {
        await this.connections[name].proxy.unsubscribe(topic);
    }

    async publish(name, topic, message) {
        await this.connections[name].proxy.produce(topic, message);
    }

    offloadMessages() {
        for (let name of Object.keys(this.connections)) {
            let messages = this.connections[name].proxy.offloadMessages();
            if (messages && messages.length > 0) {
                this.window.webContents.send('messages', { name, messages });
            }
        }
    }

}

module.exports = KafkaManager;

