const { Kafka } = require('kafkajs')

class KafkaProxy {

    constructor(brokers) {
        this.brokers = brokers;
    }


    async connect() {
        this.isReady = false;
        this.topicsToAssign = [];
        this.messages = [];
        this.subscriptions = null;
        this.kafka = new Kafka({
            clientId: 'kafka-viewer-1',
            brokers: this.brokers,
            connectionTimeout: 10000
        });
        this.consumer = this.kafka.consumer({ groupId: 'kafka-viewer-1' });
        await this.consumer.connect();
        await this.consumer.run({ eachMessage: this.consume });
        this.producer = this.kafka.producer();
        await this.producer.connect();
        console.log("connected");
    }

    async disconnect() {
        await this.consumer.disconnect();
        await this.producer.disconnect();
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

    async getOffsets(topicName) {
        const admin = this.kafka.admin();
        await admin.connect();
        try {
            let offsets = await admin.fetchTopicOffsets(topicName);
            return offsets.map( x => { return {
                partition: x.partition,
                start: x.low,
                end: x.high
            }});
        } finally {
            await admin.disconnect();
        }
    }

    consume(payload) {
        console.log(payload);
    }

    async subscribe(topic, offsets) {
        await this.consumer.stop();
        await this.consumer.subscribe({ topic });
        await this.consumer.run({ eachMessage: this.consume });
        for (let offset of offsets) {
            this.consumer.seek({ topic, partition: offset.partition, offset: offset.position });
        }
    }

}

async function main() {
    let proxy = new KafkaProxy([ '192.168.58.159:9092' ]);
    await proxy.connect();
    // console.log(JSON.stringify(await proxy.getTopics()));
    // console.log(await proxy.getOffsets(''));
    await proxy.subscribe('', [
        { partition: 1, position: '1486', end: '1492' },
        { partition: 4, position: '1495', end: '1502' },
        { partition: 7, position: '1481', end: '1487' },
        { partition: 2, position: '1494', end: '1500' },
        { partition: 5, position: '1491', end: '1498' },
        { partition: 8, position: '1496', end: '1502' },
        { partition: 0, position: '1507', end: '1513' },
        { partition: 3, position: '1488', end: '1494' },
        { partition: 6, position: '1486', end: '1492' },
        { partition: 9, position: '1495', end: '1502' }
        ]);
}

main();

