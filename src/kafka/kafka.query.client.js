const kafkaNodeClient = require('kafka-node');
const util = require('util');

class KafkaQueryClient {

    constructor(brokers) {
        this.client = new kafkaNodeClient.KafkaClient({kafkaHost: brokers});
        this.admin = new kafkaNodeClient.Admin(this.client);
        this.admin.listTopicsAsync = util.promisify(this.admin.listTopics);
        this.offset = new kafkaNodeClient.Offset(this.client);
        this.offset.fetchAsync = util.promisify(this.offset.fetch);
        this.producer = new kafkaNodeClient.Producer(this.client);
        this.producer.sendAsync = util.promisify(this.producer.send);
    }

    async init() {
        this.topics = await this.getTopics();
    }

    async getTopics() {
        let topicsMeta = (await this.admin.listTopicsAsync())[1].metadata;
        let topics = {};
        for (let topicName of Object.keys(topicsMeta).filter(x => !x.startsWith("_"))) {
            topics[topicName] = {
                name: topicName,
                partitions: Object.keys(topicsMeta[topicName])
                    .map(x => topicsMeta[topicName][x].partition)
            };
        }
        return topics;
    }

    async getOffsets(topicName) {
        let startOffsets = await this.offset.fetchAsync(this.partitionize({topic: topicName, time: -2}, topicName));
        let endOffsets = await this.offset.fetchAsync(this.partitionize({topic: topicName, time: -1}, topicName));
        return Object.keys(startOffsets[topicName]).map(partition => { return {
            partition: partition,
            start: startOffsets[topicName][partition][0],
            end: endOffsets[topicName][partition][0]
        }});
    }

    async publish(topic, message) {
        let partition = this.topics[topic].partitions[Math.floor(Math.random() * this.topics[topic].partitions.length)];
        let payloads = [
            { topic: topic, messages: message, partition: partition }
        ];
        await this.producer.sendAsync(payloads);
    }

    disconnect() {
        this.client.close();
    }

    partitionize(obj, topicName) {
        let objects = [];
        for (let partition of this.topics[topicName].partitions) {
            let newobj = JSON.parse(JSON.stringify(obj));
            newobj.partition = partition;
            objects.push(newobj);
        }
        return objects;
    }
}

module.exports = KafkaQueryClient;

