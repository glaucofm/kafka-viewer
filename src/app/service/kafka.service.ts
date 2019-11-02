import {EventEmitter, Injectable} from '@angular/core';
import {StorageService} from './storage.service';
import {ApplicationEvent, KafkaConnection, Topic} from '../model/types';
import {EventService} from "./event.service";

@Injectable()
export class KafkaService {

    public connections: KafkaConnection[] = [];
    public activeConnections: KafkaConnection[] = [];

    private maxMessages = 200;

    constructor() {
        this.connections = StorageService.get('connections');
        if (!this.connections) {
            this.connections = [];
            StorageService.save('connections', this.connections);
        }
        for (const connection of this.connections) {
            connection.isConnected = false;
        }
        setInterval(async () => {
            for (const connection of this.activeConnections) {
                await this.getMessages(connection);
            }
        }, 500);
    }

    public saveConnection(connection: KafkaConnection, editedConnection?: KafkaConnection) {
        if (editedConnection) {
            delete this.connections[editedConnection.name];
        }
        this.connections = this.connections.filter(x => x.name != connection.name);
        this.connections.push(connection);
        this.connections = this.connections.sort((a, b) => a.name == b.name? 0 : a.name > b.name? 1 : -1);
        StorageService.save('connections', this.connections);
    }

    public connect(connection: KafkaConnection) {
        this.connectOnBackend(connection);
        connection.isConnected = true;
        this.activeConnections = this.connections.filter(x => x.isConnected);
    }

    public disconnect(connection: KafkaConnection) {
        this.getJson('disconnect', '?name=' + connection.name);
        connection.isConnected = false;
        this.activeConnections = this.connections.filter(x => x.isConnected);
        EventService.emitter.emit({ type: 'disconnect', data: connection });
    }

    public getActiveConnectionsNames(): string {
        return this.activeConnections.map(x => x.name).join(", ");
    }

    public isAnythingConnected(): boolean {
        return this.activeConnections.length > 0;
    }

    private async connectOnBackend(connection: KafkaConnection) {
        let topics = await this.getJson('connect', '?name=' + connection.name + '&brokers=' + connection.brokers);
        topics = Object.keys(topics); topics.sort();
        connection.topics = topics.map(key => { return { name: key, isSelected: false, connectionName: connection.name }});
        setTimeout(() => {
            this.restoreSelectedTopics(connection);
        }, 1000);
    }

    private restoreSelectedTopics(connection: KafkaConnection) {
        let storedTopics: Topic[] = StorageService.get('subscribed-topics-' + connection.name);
        if (!storedTopics) {
            return;
        }
        for (const topic of connection.topics) {
            let topics: Topic[] = storedTopics.filter(x => x.name == topic.name);
            if (topics && topics[0].isSelected) {
                topic.isSelected = true;
                this.subscribe(connection, topics[0]);
            }
        }
    }

    public getNumOfTopics() {
        return this.activeConnections
            .map(connection => connection.topics? connection.topics.length : 0)
            .reduce((x, y) => x + y, 0);
    }

    public getNumTopicsSelected() {
        return this.activeConnections
            .map(connection => connection.topics? connection.topics.filter(x => x.isSelected).length : 0)
            .reduce((x, y) => x + y, 0);
    }

    public async subscribe(connection: KafkaConnection, topic: Topic) {
        EventService.emitter.emit({ type: 'subscribed-to-topic', data: { topic: topic } });

        let offsets = await this.getJson('offsets', '?name=' + connection.name + '&topic=' + topic.name);
        let maxByPartition = Math.round(this.maxMessages / offsets.length);

        let totalMessagesToFetch = offsets
            .map(offset => { return offset.end - Math.max(offset.start, offset.end - maxByPartition); })
            .reduce((x, y) => x + y, 0);
        EventService.emitter.emit({ type: 'messages-to-fetch', data: { topic: topic, quantity: totalMessagesToFetch } });

        let offsetsParam = offsets.map(offset => { return offset.partition + "=" + (Math.max(offset.start, offset.end - maxByPartition)) }).join(",");

        this.getJson('subscribe', '?name=' + connection.name + '&topic=' + topic.name + '&offsets=' + offsetsParam);
        StorageService.save('subscribed-topics-' + connection.name, connection.topics);
    }

    public unsubscribe(connection: KafkaConnection, topic: Topic) {
        this.getJson('unsubscribe', '?name=' + connection.name + '&topic=' + topic.name);
        EventService.emitter.emit({ type: 'remove-topic', data: topic.name });
        StorageService.save('subscribed-topics-' + connection.name, connection.topics);
    }

    public async getMessages(connection: KafkaConnection) {
        // {"value":"59 chars","size":59,"key":null,"topic":"TOP.KAVIEW.02","offset":10490,"partition":0,"timestamp":"2019-10-04T04:15:31.894Z"}
        let messages = await this.getJson('messages', '?name=' + connection.name);
        if (messages.length) {
            console.log('Received ', messages.length, 'messages');
            EventService.emitter.emit({
                type: 'message',
                data: {
                    connection: connection,
                    messages: messages
                }
            })
        }
    }

    public async publish(connection: KafkaConnection, topic: Topic, message: string) {
        this.doPost('publish', '?name=' + connection.name + '&topic=' + topic.name, message);
    }

    private async doPost(url: string, params: string, data: string) {
        return await fetch('http://localhost:8000/' + url + params, {
            method: "POST",
            body: data
        });
    }

    private async getJson(url: string, params: string) {
        return (await fetch('http://localhost:8000/' + url + params)).json();
    }

}
