const { Kafka } = require('kafkajs')

class KafkaProxy {

    constructor(brokers) {
        this.brokers = brokers;
        this.messages = [];
    }

    async connect() {
        this.messages = [];
        this.subscriptions = null;
        this.kafka = new Kafka({
            clientId: 'kafka-viewer-1',
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
            let response = await admin.fetchTopicMetadata();
            return response.topics.filter(x => !x.name.startsWith("_")).map(x => x.name).sort();
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
                start: x.low,
                end: x.high
            }});
        } finally {
            await admin.disconnect();
        }
    }

    async subscribe(topic, offsets) {
        let consumer = this.kafka.consumer({ groupId: 'kafka-viewer-' + topic });
        await consumer.connect();
        await consumer.subscribe({ topic });
        consumer.run({ eachMessage: (x) => { this.consume(x) } });
        for (let offset of offsets) {
            consumer.seek({ topic, partition: offset.partition, offset: offset.position });
        }
        this.consumers.push({ topic, consumer });
    }

    async unsubscribe(topic) {
        let consumer = this.consumers.find(x => x.topic === topic);
        await consumer.consumer.disconnect();
        this.consumers = this.consumers.filter(x => x.topic !== topic);
    }

    async produce(topic, message) {
        await this.producer.send({ topic, messages: [ message ] });
    }

    consume(payload) {
        let content = payload.message.value.toString();
        console.log('Received message: partition', payload.partition, 'offset', payload.message.offset, 'content', content.length, 'chars');
        payload.message.topic = payload.topic;
        this.messages.push({
            topic: payload.topic,
            key: payload.message.key,
            size: content.length,
            offset: Number(payload.message.offset),
            partition: payload.partition,
            timestamp: Number(payload.message.timestamp),
            payload: content,
            headers: Object.keys(payload.message.headers).map(x => [x, payload.message.headers[x]? payload.message.headers[x].toString() : null])
        });
    }

    offloadMessages() {
        return this.messages.splice(0, this.messages.length);
    }

}

module.exports = KafkaProxy;

async function main() {
    let proxy = new KafkaProxy([ '192.168.58.159:9092' ]);
    await proxy.connect();
    // console.log(await proxy.getTopics());
    // console.log(await proxy.getOffsets('EXAMPLE.TOPIC.SOME.NAME.01'));
    await sleep(5000);
    for (let topic of ['EXAMPLE.TOPIC.SOME.NAME.02']) {
        let messages = [];
        for (let i = 0; i < 10; i++) {
            messages.push({
                value: '{ "myIndex": ' + i + ' }'
            });
        }
        console.log('sending messages...');
        await proxy.producer.send({topic: topic, messages })
    }
    console.log('done');
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// main();

