const { Kafka } = require('kafkajs')
var os = require('os');


class KafkaProxy {

    constructor(brokers) {
        this.brokers = brokers;
        this.messages = [];
        this.stopPos = {};
        this.counter = 1;
    }

    async connect() {
        this.messages = [];
        this.subscriptions = null;
        this.kafka = new Kafka({
            clientId: 'kafka-viewer-' + os.userInfo().username + '-' + String(Math.floor(Math.random() * 999999999)),
            brokers: this.brokers,
            connectionTimeout: 10000
        });
        this.producer = this.kafka.producer();
        await this.producer.connect();
        this.consumers = [];
        console.log("connected");
    }

    async disconnect() {
        await this.producer.disconnect();
        for (let consumer of this.consumers) {
            await consumer.consumer.disconnect();
        }
    }

    async getTopics() {
        const admin = this.kafka.admin();
        await admin.connect();
        try {
            return (await admin.listTopics()).filter(x => !x.startsWith("_")).sort();
        } catch (e) {
            console.log(e);
        } finally {
            await admin.disconnect();
        }
    }

    async getOffsets(topic) {
        const admin = this.kafka.admin();
        await admin.connect();
        try {
            let offsets = await admin.fetchTopicOffsets(topic);
            return offsets.map( x => { return {
                partition: x.partition,
                start: Number(x.low),
                end: Number(x.high) - 1
            }});
        } finally {
            await admin.disconnect();
        }
    }

    async subscribe(topic, offsets, isLoadMore) {
        let groupId = 'kafka-viewer-' + os.userInfo().username + '-' + String(Math.floor(Math.random() * 999999) + '-' + String(Math.floor(Math.random() * 999999)));
        if (isLoadMore) {
            this.stopPos[groupId] = {};
            this.counter++;
            for (let offset of offsets) {
                this.stopPos[groupId][offset.partition] = {
                    stopAt: offset.end,
                    isFinished: false
                };
            }
        }
        let consumer = this.kafka.consumer({ groupId: groupId });
        await consumer.connect();
        await consumer.subscribe({ topic });
        await consumer.run({ eachMessage: (x) => { this.consume(x, groupId, isLoadMore) } });
        console.log('Loading', offsets.map(x => x.numberOfMessages).reduce((x, y) => x + y), 'messages');
        for (let offset of offsets) {
            consumer.seek({ topic, partition: offset.partition, offset: offset.position });
        }
        this.consumers.push({ topic, consumer, groupId, isLoadMore });
    }

    async unsubscribe(topic, groupId) {
        let consumer = this.consumers.find(x => x.topic === topic && (!groupId || x.groupId === groupId));
        if (consumer) {
            await consumer.consumer.disconnect();
            this.consumers = this.consumers.filter(x => x.topic !== topic);
        }
    }

    async produce(topic, message) {
        await this.producer.send({ topic, messages: [ message ] });
    }

    async consume(payload, groupId, isLoadMore) {
        let content = payload.message.value.toString();
        let offset = Number(payload.message.offset);
        if (isLoadMore) {
            if (offset > this.stopPos[groupId][payload.partition].stopAt) {
                this.stopPos[groupId][payload.partition].isFinished = true;
                if (Object.keys(this.stopPos[groupId]).filter(x => !this.stopPos[groupId][x].isFinished).length === 0) {
                    this.unsubscribe(payload.topic, groupId);
                }
                return;
            }
        }
        payload.message.topic = payload.topic;
        this.messages.push({
            topic: payload.topic,
            key: payload.message.key? payload.message.key.toString() : undefined,
            size: content.length,
            offset: offset,
            partition: payload.partition,
            timestamp: Number(payload.message.timestamp),
            payload: content,
            headers: Object.keys(payload.message.headers).map(x => [x, payload.message.headers[x]? payload.message.headers[x].toString() : null])
        });
    }

    async offloadMessages() {
        if (this.messages.length > 0) {
            console.log('Sending', this.messages.length, 'messages to the screen.');
            let partitions = [...new Set(this.messages.map(x => x.partition))].sort();
            console.log(partitions.map(partition => {
                return partition + ': ' +
                    Math.min(...this.messages.filter(message => message.partition === partition).map(x => x.offset)) + ' ' +
                    Math.max(...this.messages.filter(message => message.partition === partition).map(x => x.offset))
            }).join('\n'));
        }
        return this.messages.splice(0, this.messages.length);
    }

}

module.exports = KafkaProxy;

async function load() {
    let proxy = new KafkaProxy([ 'localhost:9092' ]);
    await proxy.connect();
    await sleep(5000);
    for (let topic of ['EXAMPLE.TOPIC.SOME.NAME.01']) {
        let messages = [];
        for (let i = 0; i < 50; i++) {
            let partition = Math.floor(Math.random() * Math.floor(5));
            messages.push({value: JSON.stringify({ somevar: i, partition}), partition });
        }
        console.log('sending messages...');
        await proxy.producer.send({topic: topic, messages })
    }
    console.log('done');
    process.exit();
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

if (process.argv.length >= 3 && process.argv[2] === 'load') {
    load();
}

