const { Kafka } = require('kafkajs');
var os = require('os');
const fetch = require('node-fetch');

class KafkaJavaProxy {

    constructor(name, brokers) {
        this.name = name;
        this.brokers = brokers;
    }

    async connect() {
        let response = await fetch("http://localhost:7980/api/admin/connections", {
            method: 'POST',
            body: JSON.stringify({ name: this.name, brokers: this.brokers }),
            headers: { "Content-Type": "application/json" }
        });
        await response.json();
        console.log("connected " + this.name);
    }

    async disconnect() {
        let response = await fetch("http://localhost:7980/api/admin/connections/" + this.name, {
            method: 'DELETE'
        });
        await response.json();
    }

    async getTopics() {
        let response = await fetch("http://localhost:7980/api/admin/connections/" + this.name + "/topics", {
            method: 'GET'
        });
        return await response.json();
    }

    async getOffsets(topic) {
        let response = await fetch("http://localhost:7980/api/admin/connections/" + this.name + "/topics/" + topic + "/offsets", {
            method: 'GET'
        });
        return await response.json();
    }

    async subscribe(topic, offsets, isLoadMore) {
        if (isLoadMore) {
            for (let offset of offsets) {
                offset.stopPos = offset.end;
            }
        }
        console.log('Loading', offsets.map(x => x.numberOfMessages).reduce((x, y) => x + y), 'messages');
        let response = await fetch("http://localhost:7980/api/admin/connections/" + this.name + "/topics/" + topic, {
            method: 'POST',
            body: JSON.stringify(offsets),
            headers: { "Content-Type": "application/json" }
        });
        await response.json();
    }

    async unsubscribe(topic) {
        let response = await fetch("http://localhost:7980/api/admin/connections/" + this.name + "/topics/" + topic, {
            method: 'DELETE'
        });
        await response.json();
    }

    async produce(topic, message) {
        let response = await fetch("http://localhost:7980/api/admin/connections/" + this.name + "/topics/" + topic, {
            method: 'PUT',
            body: JSON.stringify(message),
            headers: { "Content-Type": "application/json" }
        });
        await response.json();
    }

    async offloadMessages() {
        let response = await fetch("http://localhost:7980/api/admin/connections/" + this.name + "/messages", {
            method: 'GET'
        });
        let messages = await response.json();
        if (messages.length > 0) {
            console.log('Sending', messages.length, 'messages to the screen.');
            let partitions = [...new Set(messages.map(x => x.partition))].sort();
            console.log(partitions.map(partition => {
                return partition + ': ' +
                    Math.min(...messages.filter(message => message.partition === partition).map(x => x.offset)) + ' ' +
                    Math.max(...messages.filter(message => message.partition === partition).map(x => x.offset))
            }).join('\n'));
        }
        return messages;
    }
}

module.exports = KafkaJavaProxy;

