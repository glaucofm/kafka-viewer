import {Injectable} from '@angular/core';
import {StorageService} from './storage.service';
import {ApplicationEvent, EventType, KafkaConnection, Offset, Topic, TopicsEvent} from '../model/types';
import {EventService} from "./event.service";
import {ConfigurationService} from "./configuration.service";
import {IpcService} from "./ipc.service";

@Injectable()
export class KafkaService {

    public connections: KafkaConnection[] = [];
    public activeConnections: KafkaConnection[] = [];

    constructor(public configurationService: ConfigurationService, public ipcService: IpcService) {
        this.configurationService = configurationService;
        this.connections = StorageService.get('connections');
        if (!this.connections) {
            this.connections = [];
            StorageService.save('connections', this.connections);
        }
        for (const connection of this.connections) {
            connection.isConnected = false;
        }
        this.subscribeToEvents();
    }

    private subscribeToEvents() {
        let _this = this;
        EventService.emitter.subscribe((event: ApplicationEvent) => {
            if (event.type == EventType.CONNECTED) {
                _this.setConnected(event.data);
            } else if (event.type == EventType.TOPICS) {
                _this.receiveTopics(event.data.name, event.data.topics);
            } else if (event.type == EventType.OFFSETS) {
                _this.receiveOffsets(event.data.name, event.data.topic, event.data.offsets);
            } else if (event.type == EventType.MESSAGES) {
                _this.receiveMessages(event.data.name, event.data.messages);
            }
        });
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
        this.ipcService.send(EventType.CONNECT, connection);
        connection.isConnected = true;
        this.activeConnections = this.connections.filter(x => x.isConnected);
    }

    private setConnected(name: string) {
    }

    private receiveTopics(name: string, topics: string[]) {
        let connection = this.getConnection(name);
        connection.topics = topics.map(x => { return { name: x, isSelected: false, connectionName: connection.name }});
        setTimeout(() => {
            this.restoreSelectedTopics(connection);
        }, 200);
    }

    public disconnect(connection: KafkaConnection) {
        this.ipcService.send(EventType.DISCONNECT, connection.name);
        connection.isConnected = false;
        this.activeConnections = this.connections.filter(x => x.isConnected);
        EventService.emitter.emit({ type: EventType.DISCONNECT, data: connection });
    }

    public getActiveConnectionsNames(): string {
        return this.activeConnections.map(x => x.name).join(", ");
    }

    public isAnythingConnected(): boolean {
        return this.activeConnections.length > 0;
    }

    private restoreSelectedTopics(connection: KafkaConnection) {
        let storedTopics: Topic[] = StorageService.get('subscribed-topics-' + connection.name);
        if (!storedTopics) {
            return;
        }
        for (const topic of connection.topics) {
            let topics: Topic[] = storedTopics.filter(x => x.name == topic.name);
            if (topics.length > 0 && topics[0].isSelected) {
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
        EventService.emitter.emit({type: EventType.SUBSCRIBED_TO_TOPIC, data: { topic }});
        this.ipcService.send(EventType.GET_OFFSETS, { name: connection.name, topic: topic.name });
    }

    public receiveOffsets(name: string, topic: string, offsets: Offset[]) {
        let positionOffsets = this.calculatePositions(offsets, this.configurationService.config.numberOfMessagesPerTopic);
        let numberOfMessagesToFetch = positionOffsets.map(x => x.numberOfMessages).reduce((x, y) => x + y)
        EventService.emitter.emit({ type: EventType.MESSAGES_TO_FETCH, data: { topic: { connectionName: name, name: topic }, quantity: numberOfMessagesToFetch } });
        this.ipcService.send(EventType.SUBSCRIBE, { name: name, topic, offsets: positionOffsets });
        StorageService.save('subscribed-topics-' + name, this.getConnection(name).topics);
    }

    private calculatePositions(offsets: Offset[], maxMessages: number) {
        let totalMessages = offsets.map(x => x.end - x.start).reduce((x, y) => x + y);
        if (totalMessages <= maxMessages) {
            return offsets.map(x => { return {
                partition: x.partition,
                position: x.start,
                numberOfMessages: x.end - x.start
            }});
        }
        let numPartitionsWithMessages = offsets.filter(x => x.end > x.start).length;
        let positionOffsets = [];

        for (let offset of offsets) {
            let numberOfMessages = Math.round((offset.end - offset.start) * (maxMessages / totalMessages));
            positionOffsets.push({
                partition: offset.partition,
                start: offset.start,
                end: offset.end,
                position: offset.end - numberOfMessages,
                numberOfMessages
            })
        }

        let difference = maxMessages - positionOffsets.map(x => x.numberOfMessages).reduce((x, y) => x + y);
        if (difference < 0) {
            for (let offset of positionOffsets) {
                if (offset.position > offset.start && difference < 0) {
                    offset.position++;
                    offset.numberOfMessages--;
                    difference++;
                }
            }
        } else if (difference > 0) {
            for (let offset of positionOffsets) {
                if (offset.position < (offset.end - 1) && difference > 0) {
                    offset.position--;
                    offset.numberOfMessages++;
                    difference--;
                }
            }
        }

        return positionOffsets;
    }

    public unsubscribe(connection: KafkaConnection, topic: Topic) {
        this.ipcService.send(EventType.UNSUBSCRIBE, { name: topic.connectionName, topic: topic.name });
        EventService.emitter.emit({ type: EventType.REMOVE_TOPIC, data: topic.name });
        StorageService.save('subscribed-topics-' + connection.name, connection.topics);
    }

    public receiveMessages(name: string, messages) {
        console.log('Received ', messages.length, 'messages');
        let connection = this.getConnection(name);
        EventService.emitter.emit({
            type: EventType.MESSAGE,
            data: {
                connection: connection,
                messages: messages
            }
        })
    }

    public async publish(topic: Topic, message: any) {
        this.ipcService.send(EventType.PUBLISH, { name: topic.connectionName, topic: topic.name, message });
    }

    private getConnection(name: string): KafkaConnection {
        return this.connections.find(x => x.name == name);
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
