const Kafka = require('node-rdkafka');
const moment = require('moment');

// https://github.com/edenhill/librdkafka/blob/master/CONFIGURATION.md

class KafkaLoaderClient {

    constructor(brokers) {
        this.isReady = false;
        this.topicsToAssign = [];
        this.messages = [];
        this.consumer = this.newConsumer(brokers);
        this.subscriptions = null;
    }

    newConsumer(brokers) {
        let _this = this;

        let consumer = new Kafka.KafkaConsumer({
            'group.id': 'kafka-test-01',
            'metadata.broker.list': brokers,
            'enable.auto.commit': false
        }, {
            'consume.callback.max.messages': 3,
            'auto.offset.reset': 'earliest' // consume from the start
        });

        consumer.on('event.log', function(log) {
            console.log(log);
        });

        consumer.on('event.error', function(err) {
            console.error('Error from consumer', err);
        });

        consumer.on('ready', function(data) {
            console.log('consumer ready', data);
            _this.isReady = true;
            for (var assignment of _this.topicsToAssign) {
                _this.subscribe(assignment);
                _this.topicsToAssign = [];
            }
            consumer.consume();
        });

        consumer.on('data', function(message) {
            message.payload = message.value.toString();
            message.timestamp = moment(message.timestamp);
            _this.messages.push(message);
            _this.subscriptions[message.topic][message.partition] = message.offset + 1;
            console.log('message', message.topic, 'partition', message.partition, 'offset', message.offset, 'length', message.payload.length);
        });

        consumer.on('disconnected', function(arg) {
            console.log('consumer disconnected. ' + JSON.stringify(arg));
        });

        consumer.connect();

        return consumer;
    }

    disconnect() {
        this.consumer.disconnect();
    }

    subscribe(subscriptions) {
        this.subscriptions = subscriptions;
        if (!this.isReady) {
            console.log('not ready');
            this.topicsToAssign.push(subscriptions);
            return;
        }
        // interface: [ { topic: topic, partition: 0, offset: offset } ]
        this.consumer.assign(convertSubscriptions(subscriptions));
    }

    offLoadMessages() {
        if (this.messages.length === 0) {
            return [];
        }
        let messages = this.messages;
        this.messages = [];
        return messages;
    }
}

module.exports = KafkaLoaderClient;

function convertSubscriptions(connSubscriptions) {
    let subscriptions = [];
    for (const topic of Object.keys(connSubscriptions)) {
        for (const partition of Object.keys(connSubscriptions[topic])) {
            subscriptions.push({
                topic: topic,
                partition: Number(partition),
                offset: connSubscriptions[topic][partition]
            });
        }
    }
    return subscriptions;
}


// let client = new kafkaLoaderClient('192.168.58.159:9092');
// client.addTopic('TOP.KANODE.02', 10480);
