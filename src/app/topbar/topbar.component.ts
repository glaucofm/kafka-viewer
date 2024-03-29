import {Component} from '@angular/core';
import {KafkaService} from '../service/kafka.service';
import {Column, EventType, KafkaConnection, Topic} from '../model/types';
import {StorageService} from '../service/storage.service';
import {MessageBoxComponent} from "../messagebox/message-box.component";
import {EventService} from "../service/event.service";
import {ConfigurationService} from "../service/configuration.service";
import * as moment from "moment";

@Component({
    selector: 'app-topbar',
    templateUrl: './topbar.component.html',
    styleUrls: ['./topbar.component.css']
})
export class TopbarComponent {

    public kafkaService: KafkaService;
    public configurationService: ConfigurationService;
    public editingConnection: KafkaConnection;
    public oldConnection: KafkaConnection;
    public columns: Column[] = MessageBoxComponent.getInitialColumns();
    public oldColumns: string = '';
    public filterText: string = '';
    public isFiltering: boolean;
    public fontSize;
    public topicQuery;

    public topicMenu: {
        [key: string]: {
            isOpen: boolean,
            overriden: boolean
        }
    } = {};

    public publishDetails: {
        isVisible: boolean,
        connection?: KafkaConnection,
        topic?: Topic,
        key: string;
        headers: string;
        value: string;
        topics?: { connection: KafkaConnection, topic: Topic }[];
        messageIndex: number;
        messageTime: string;
        numOfMessages: number;
    } = {
        isVisible: false,
        key: null,
        headers: null,
        value: '',
        messageIndex: -1,
        numOfMessages: 0,
        messageTime: undefined
    };

    constructor(kafkaService: KafkaService,
                configurationService: ConfigurationService) {
        this.kafkaService = kafkaService;
        this.configurationService = configurationService;

        if (StorageService.get('columns')) {
            this.columns = StorageService.get('columns');
        }
        setInterval(() => { this.closeTopics(); }, 1000);
        setInterval(() => { this.detectColumnsChanges(); }, 100);
        this.fontSize = this.configurationService.config.fontSize;
    }

    closeTopics() {
        if (!document.getElementById('menu-topic-content') || document.getElementById('menu-topic-content').style.display == 'none') {
            for (let connection of this.kafkaService.activeConnections) {
                if (connection.topics && connection.topics.filter(x => x.isSelected).length > 0) {
                    if (this.topicMenu[connection.name] && this.topicMenu[connection.name].isOpen && !this.topicMenu[connection.name].overriden) {
                        this.topicMenu[connection.name].isOpen = false;
                    }
                }
            }
        }
    }

    detectColumnsChanges() {
        if (!this.columns) {
            return;
        }
        let columns = this.columns.filter(x => x.isUserDefined).map(x => x.name + x.jsonPath + x.isEnabled).join('');
        if (columns != this.oldColumns) {
            this.oldColumns = columns;
            EventService.emitter.emit({ type: EventType.COLUMNS_MODIFIED, data: this.columns });
            StorageService.save('columns', this.columns);
        }
    }

    editConnection(connection?: KafkaConnection) {
        if (connection) {
            this.editingConnection = connection;
            this.oldConnection = JSON.parse(JSON.stringify(connection));
        } else {
            this.editingConnection = {brokers: '', name: '', useJavaProxy: false };
        }
        this.closeMenu('menu-connections');
    }

    saveConnection() {
        this.kafkaService.saveConnection(this.editingConnection, this.oldConnection);
        this.editingConnection = null;
    }

    toggleTopic(connection: KafkaConnection, topic: Topic) {
        topic.isSelected = !topic.isSelected;
        topic.isPreferred = true;
        if (topic.isSelected) {
            this.kafkaService.subscribe(connection, topic);
        } else {
            this.kafkaService.unsubscribe(connection, topic);
        }
        if (!connection.preferredTopics.includes(topic.name)) {
            connection.preferredTopics.push(topic.name);
        }
        this.kafkaService.saveConnection(connection);
    }

    openPublishModal(connection: KafkaConnection, topic: Topic) {
        this.publishDetails.isVisible = true;
        this.publishDetails.connection = connection;
        this.publishDetails.topic = topic? topic : this.publishDetails.topic;
        let messages = StorageService.get("published-messages");
        if (messages && messages.length > 0) {
            this.publishDetails.messageIndex = this.publishDetails.messageIndex < 0? 0 : this.publishDetails.messageIndex;
            this.publishDetails.value = messages[this.publishDetails.messageIndex].value;
            this.publishDetails.messageTime = moment(messages[this.publishDetails.messageIndex].time).fromNow();
            this.publishDetails.numOfMessages = messages.length;
        }
    }

    nextPublishedMessage() {
        let messages = StorageService.get("published-messages");
        this.publishDetails.messageIndex++;
        this.publishDetails.value = messages[this.publishDetails.messageIndex].value;
        this.publishDetails.messageTime = moment(messages[this.publishDetails.messageIndex].time).fromNow();
    }

    previousPublishedMessage() {
        let messages = StorageService.get("published-messages");
        this.publishDetails.messageIndex--;
        this.publishDetails.value = messages[this.publishDetails.messageIndex].value;
        this.publishDetails.messageTime = moment(messages[this.publishDetails.messageIndex].time).fromNow();
    }

    publish() {
        let headers;
        if (this.publishDetails.headers) {
            try {
                headers = JSON.parse(this.publishDetails.headers)
            } catch (e) {
                alert(e);
                return;
            }
        }
        let messages = StorageService.get("published-messages");
        if (!messages || messages.length == 0 || this.publishDetails.value != messages[0].value) {
            messages = messages || [];
            messages.unshift({ value: this.publishDetails.value, time: new Date().valueOf() })
            this.publishDetails.numOfMessages = messages.length;
            this.publishDetails.messageIndex = 0;
            StorageService.save("published-messages", messages);
        }
        this.kafkaService.publish(this.publishDetails.topic, {
            key: this.publishDetails.key,
            headers: headers,
            value: this.publishDetails.value
        });
        this.publishDetails.isVisible = null;
    }

    closeMenu(menu: string) {
        document.getElementById(menu).classList.remove('hover');
        setTimeout(() => {
            document.getElementById(menu).classList.add('hover');
        }, 200);
    }

    getTopics(connection: KafkaConnection, preferred: boolean, filter: string = undefined) {
        return connection.topics
            .filter(x => preferred ? x.isPreferred : !x.isPreferred)
            .filter(x => !filter || x.name.toLowerCase().includes(filter.toLowerCase()));
    }

    areUnpreferredTopicsOpen(connection: KafkaConnection): boolean {
        if (!this.topicMenu[connection.name]) {
            this.topicMenu[connection.name] = {
                isOpen: false,
                overriden: false
            };
        }
        return this.topicMenu[connection.name].isOpen;
    }

    toggleUnselectedTopicsOpen(connection: KafkaConnection) {
        if (!this.topicMenu[connection.name]) {
            this.topicMenu[connection.name] = {
                isOpen: false,
                overriden: false
            };
        }
        this.topicMenu[connection.name].isOpen = !this.topicMenu[connection.name].isOpen;
        this.topicMenu[connection.name].overriden = true;
    }

    addColumn() {
        this.columns.push({name: '', isEnabled: false, isUserDefined: true, isResizable: true });
        EventService.emitter.emit({ type: EventType.COLUMNS_MODIFIED, data: this.columns });
    }

    moveColumnUp(column: Column) {
        let index = this.columns.findIndex(x => x.name === column.name);
        this.columns[index] = this.columns[index - 1];
        this.columns[index - 1] = column;
        EventService.emitter.emit({ type: EventType.COLUMNS_MODIFIED, data: this.columns });
    }

    moveColumnDown(column: Column) {
        let index = this.columns.findIndex(x => x.name === column.name);
        this.columns[index] = this.columns[index + 1];
        this.columns[index + 1] = column;
        EventService.emitter.emit({ type: EventType.COLUMNS_MODIFIED, data: this.columns });
    }

    removeColumn(column: Column) {
        this.columns = this.columns.filter(x => x.name !== column.name);
        EventService.emitter.emit({ type: EventType.COLUMNS_MODIFIED, data: this.columns });
    }

    toggleColumn(column: Column) {
        column.isEnabled = !column.isEnabled;
        EventService.emitter.emit({ type: EventType.COLUMNS_MODIFIED, data: this.columns });
    }

    setTheme(theme) {
        this.configurationService.setTheme({ name: theme });
    }

    setFilter() {
        this.isFiltering = this.filterText.length > 0;
        console.log(this.isFiltering);
        EventService.emitter.emit({ type: EventType.SET_FILTER, data: this.filterText });
    }

    setFontSize() {
        this.configurationService.config.fontSize = this.fontSize;
    }

    removePreferredTopic(connection: KafkaConnection, topic: Topic) {
        topic.isPreferred = false;
        connection.preferredTopics = connection.preferredTopics.filter(x => x != topic.name);
        this.kafkaService.saveConnection(connection);
    }
}
