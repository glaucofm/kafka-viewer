import {Component, QueryList, ViewChildren} from '@angular/core';
import {KafkaService} from '../service/kafka.service';
import {ApplicationEvent, Column, KafkaConnection, KafkaMessage, RowMessage, Topic} from '../model/types';
import * as moment from 'moment-timezone';
import {NgxJsonViewerComponent} from 'ngx-json-viewer';
import {EventService} from "../service/event.service";
import * as jsonPath from 'jsonpath';
import {StorageService} from "../service/storage.service";
import {ConfigurationService} from "../service/configuration.service";


@Component({
    selector: 'message-box',
    templateUrl: 'message-box.component.html',
    styleUrls: ['message-box.component.css']
})
export class MessageBoxComponent {

    public kafkaService: KafkaService;
    public configurationService: ConfigurationService;
    public messages: RowMessage[] = [];
    public showTimeAgo = true;
    public showCopyMessage = false;
    public columns: Column[] = MessageBoxComponent.getInitialColumns();
    private widthSteps = [100, 25, 0];

    @ViewChildren(NgxJsonViewerComponent) components: QueryList<NgxJsonViewerComponent>;

    constructor(kafkaService: KafkaService, configurationService: ConfigurationService) {
        this.kafkaService = kafkaService;
        this.configurationService = configurationService;

        if (StorageService.get('columns')) {
            this.columns = StorageService.get('columns');
        }

        EventService.emitter.subscribe((event: ApplicationEvent) => {
            if (event.type === 'message') {
                this.removeNotifications(event.data.connection.name, [... new Set(event.data.messages.map(x => x.topic))]);
                for (const message of event.data.messages) {
                    this.insertMessage(event.data.connection, message);
                }
                this.messages.sort((a, b) => a.timestamp == b.timestamp? 0 : a.timestamp > b.timestamp? 1 : -1).reverse();
                if (this.messages.length > this.configurationService.config.numberOfMessagesOnScreen) {
                    this.messages = this.messages.slice(0, this.configurationService.config.numberOfMessagesOnScreen);
                }
            } else if (event.type === 'remove-topic') {
                this.messages = this.messages.filter(x => x.topic !== event.data);
            } else if (event.type === 'disconnect') {
                this.messages = this.messages.filter(x => x.connection != event.data.name);
            } else if (event.type === 'columns-modified') {
                console.log('columns modified', event.data);
                this.columns = event.data;
                this.setUserValuesOnAllRows();
            } else if (event.type === 'subscribed-to-topic' || 'messages-to-fetch') {
                this.removeNotifications(event.data.topic.connectionName, [ event.data.topic.name ]);
                this.messages.unshift(this.getNotificationMessage(event));
                if (event.type == 'messages-to-fetch' && event.data.quantity == 0) {
                    setTimeout(() => {
                        this.removeNotifications(event.data.topic.connectionName, [ event.data.topic.name ]);
                    }, 10000);
                }
            }
        });
    }

    stepWidth(column: Column) {
        if (!column.naturalWidth) {
            column.naturalWidth = document.getElementById('column-' + column.name).offsetWidth;
        }
        let currentWidth = column.width? column.width : column.naturalWidth;
        let nextWidth = this.widthSteps.filter(x => x < currentWidth)[0];
        column.width = nextWidth > 0? nextWidth : null;
        console.log('column.width', column.naturalWidth, column.name, column.width);
    }

    removeNotifications(connection: string, topics: any[]) {
        for (const topic of topics) {
            this.messages = this.messages.filter(x => !(x.connection === connection && x.topic === topic && x.type !== 'message'));
        }
    }

    getNotificationMessage(event: ApplicationEvent): RowMessage {
        return {
            connection: event.data.topic.connectionName, topic: event.data.topic.name,
            timestamp: moment(new Date(), 'UTC').format("YYYY-MM-DD HH:mm.ss"),
            type: event.type, userValues: { numOfMessages: event.data.quantity },
            payload: '', size: 0, key: '', offset: 0, partition: 0,
        }
    }

    getNumberOfColumns() {
        return this.columns.filter(x => x.isEnabled).length;
    }

    static getInitialColumns(): Column[] {
        return [
            { name: 'Connection', isEnabled: true, isUserDefined: false, isResizable: true },
            { name: 'Topic', isEnabled: true, isUserDefined: false, isResizable: true },
            { name: 'Published', isEnabled: true, isUserDefined: false, isResizable: true },
            { name: 'Size', isEnabled: true, isUserDefined: false, isResizable: true },
            { name: 'Payload', isEnabled: true, isUserDefined: false },
        ];
    }

    insertMessage(connection: KafkaConnection, message: KafkaMessage) {
        let rowMessage: RowMessage = message;
        rowMessage.connection = connection.name;
        rowMessage.formattedSize = this.humanFileSize(message.size);
        rowMessage.formattedTimestamp = moment(new Date(message.timestamp), 'UTC').tz('America/Sao_Paulo').format("YYYY-MM-DD HH:mm.ss z");
        try {
            rowMessage.parsedJson = JSON.parse(rowMessage.payload);
        } catch (e) {
            console.log(e);
            console.log(rowMessage.payload);
            rowMessage.parsedJson = JSON.parse('{ "error": "invalid json" }');
        }
        rowMessage.completePayload = rowMessage.payload;
        rowMessage.type = 'message';
        if (rowMessage.payload.length > 250) {
            rowMessage.payload = rowMessage.payload.substr(0, 250);
        }
        this.setUserValues(rowMessage);
        this.messages.push(rowMessage);
    }

    setUserValuesOnAllRows() {
        for (let row of this.messages) {
            this.setUserValues(row);
        }
    }

    setUserValues(row: RowMessage) {
        row.userValues = {};
        for (let column of this.columns) {
            if (column.isUserDefined) {
                if (column.jsonPath.startsWith('metadata.')) {
                    row.userValues[column.name] = row[column.jsonPath.replace(/^metadata./, '')];
                } else if (column.jsonPath.startsWith('headers.') && row.headers && row.headers.length) {
                    let header = row.headers.find(x => x[0] == column.jsonPath.replace(/^headers./, ''));
                    row.userValues[column.name] = header? header[1] : '';
                } else {
                    row.userValues[column.name] = this.extractColumnValue(row, column);
                }
            }
        }
    }

    humanFileSize(bytes: number): string {
        let thresh = 1024;
        if(Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }
        let units = ['kB','MB','GB','TB','PB','EB','ZB','YB'];
        let u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while (Math.abs(bytes) >= thresh && u < units.length - 1);
        return bytes.toFixed(1)+' '+units[u];
    }

    isNewMessage(message: RowMessage) {
        return new Date(message.timestamp).valueOf() + 60000 > (new Date().valueOf()) && message.type === 'message';
    }

    viewJSON(message) {
        message.json = JSON.parse(message.completePayload);
    }

    viewFormatted(message) {
        message.formattedJson = JSON.stringify(JSON.parse(message.completePayload), null, 2);
    }

    extractColumnValue(message: RowMessage, column: Column) {
        try {
            return jsonPath.query(message.parsedJson, column.jsonPath);
        } catch (e) {
            return '';
        }
    }

    toggleColumn(column: Column) {
        column.isEnabled = !column.isEnabled;
    }

    copyToClipboard(message) {
        const tempTextArea = document.createElement('textarea');
        tempTextArea.style.position = 'fixed';
        tempTextArea.style.left = '0';
        tempTextArea.style.top = '0';
        tempTextArea.style.opacity = '0';
        tempTextArea.value = message.formattedJson;
        document.body.appendChild(tempTextArea);
        tempTextArea.focus();
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
        this.showCopyMessage = true;
        setTimeout(() => {
            this.showCopyMessage = false;
        }, 10000);
    }
}
