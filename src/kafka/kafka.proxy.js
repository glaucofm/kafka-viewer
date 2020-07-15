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
            return response.topics.filter(x => !x.name.startsWith("_")).map(x => x.name);
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

    consume(topic, partition, message) {
        console.log({
            key: message.key.toString(),
            value: message.value.toString(),
            headers: message.headers,
        });
    }

    async subscribe(topic, offsets) {
        await this.consumer.subscribe(topic);
        for (let offset of offsets) {
            this.consumer.seek({ topic, partition: offset.partition, offset: offset.position });
        }
    }

}

async function main() {
    let proxy = new KafkaProxy([ '192.168.58.159:9092' ]);
    await proxy.connect();
    console.log(await proxy.getTopics());
    console.log(await proxy.getOffsets('my.topic.1'));
}

main();

