import {Component, ViewEncapsulation} from '@angular/core';
import {KafkaService} from '../service/kafka.service';
import {Column, KafkaConnection, Topic} from '../model/types';
import {StorageService} from '../service/storage.service';
import {MessageBoxComponent} from "../messagebox/message-box.component";
import {EventService} from "../service/event.service";
import {ConfigurationService} from "../service/configuration.service";

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

    public topicMenu: {
        [key: string]: {
            isOpen: boolean,
            overriden: boolean
        }
    } = {};

    public publishDetails: {
        connection?: KafkaConnection,
        topic?: Topic,
        message: string
    } = {
        message: null
    };

    constructor(kafkaService: KafkaService, configurationService: ConfigurationService) {
        this.kafkaService = kafkaService;
        this.configurationService = configurationService;

        if (StorageService.get('columns')) {
            this.columns = StorageService.get('columns');
        }
        setInterval(() => { this.closeTopics(); }, 1000);
        setInterval(() => { this.detectColumnsChanges(); }, 100);
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
            EventService.emitter.emit({ type: 'columns-modified', data: this.columns });
            StorageService.save('columns', this.columns);
        }
    }

    editConnection(connection?: KafkaConnection) {
        if (connection) {
            this.editingConnection = connection;
            this.oldConnection = JSON.parse(JSON.stringify(connection));
        } else {
            this.editingConnection = {brokers: '', name: ''};
        }
        this.closeMenu('menu-connections');
    }

    saveConnection() {
        this.kafkaService.saveConnection(this.editingConnection, this.oldConnection);
        this.editingConnection = null;
    }

    toggleTopic(connection: KafkaConnection, topic: Topic) {
        topic.isSelected = !topic.isSelected;
        if (topic.isSelected) {
            this.kafkaService.subscribe(connection, topic);
        } else {
            this.kafkaService.unsubscribe(connection, topic);
        }
    }

    openPublishModal(connection: KafkaConnection, topic: Topic) {
        this.publishDetails.connection = connection;
        this.publishDetails.topic = topic;
    }

    publish() {
        this.kafkaService.publish(this.publishDetails.connection, this.publishDetails.topic, this.publishDetails.message);
        this.publishDetails.topic = null;
    }

    closeMenu(menu: string) {
        document.getElementById(menu).classList.remove('hover');
        setTimeout(() => {
            document.getElementById(menu).classList.add('hover');
        }, 200);
    }

    getTopics(connection: KafkaConnection, selected: boolean) {
        return connection.topics.filter(x => selected ? x.isSelected : !x.isSelected);
    }

    areUnselectedTopicsOpen(connection: KafkaConnection): boolean {
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
        EventService.emitter.emit({ type: "columns-modified", data: this.columns });
    }

    moveColumnUp(column: Column) {
        let index = this.columns.findIndex(x => x.name === column.name);
        this.columns[index] = this.columns[index - 1];
        this.columns[index - 1] = column;
    }

    moveColumnDown(column: Column) {
        let index = this.columns.findIndex(x => x.name === column.name);
        this.columns[index] = this.columns[index + 1];
        this.columns[index + 1] = column;
    }

    removeColumn(column: Column) {
        this.columns = this.columns.filter(x => x.name !== column.name);
    }

    setTheme(theme) {
        this.configurationService.setTheme({ name: theme });
    }
}
