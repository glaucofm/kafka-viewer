import {Component, QueryList, ViewChildren} from '@angular/core';
import {KafkaService} from '../service/kafka.service';
import {ApplicationEvent, Column, EventType, KafkaConnection, KafkaMessage, RowMessage, Topic} from '../model/types';
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
    private offsetsOfLoadMore = [];

    @ViewChildren(NgxJsonViewerComponent) components: QueryList<NgxJsonViewerComponent>;

    constructor(kafkaService: KafkaService, configurationService: ConfigurationService) {
        this.kafkaService = kafkaService;
        this.configurationService = configurationService;

        if (StorageService.get('columns')) {
            this.columns = StorageService.get('columns');
        }

        EventService.emitter.subscribe((event: ApplicationEvent) => {
            if (event.type === EventType.MESSAGE) {
                for (let topic of [...new Set(event.data.messages.map(x => x.topic))]) {
                    this.updateNotification(event.data.connection, topic.toString());
                }
                for (const message of event.data.messages) {
                    this.insertMessage(event.data.connection, message);
                }
                this.messages.sort((a, b) =>
                    a.timestamp == b.timestamp? (a.offset > b.offset? 1 : -1) : a.timestamp > b.timestamp? 1 : -1).reverse();
                if (this.messages.length > this.configurationService.config.numberOfMessagesOnScreen) {
                    this.messages = this.messages.slice(0, this.configurationService.config.numberOfMessagesOnScreen);
                }
            } else if (event.type === EventType.REMOVE_TOPIC) {
                this.messages = this.messages.filter(x => x.topic !== event.data);
            } else if (event.type === EventType.DISCONNECT) {
                this.messages = this.messages.filter(x => x.connection != event.data.name);
            } else if (event.type === EventType.COLUMNS_MODIFIED) {
                this.columns = event.data;
                this.setUserValuesOnAllRows();
            } else if (event.type === EventType.SUBSCRIBED_TO_TOPIC || event.type === EventType.MESSAGES_TO_FETCH) {
                this.removeNotifications(event.data.topic.connectionName, [ event.data.topic.name ]);
                this.messages.unshift(this.getNotificationMessage(event.type, event.data));
                if (event.type == EventType.MESSAGES_TO_FETCH) {
                    if (event.data.quantity == 0) {
                        setTimeout(() => {
                            this.removeNotifications(event.data.topic.connectionName, [event.data.topic.name]);
                        }, 10000);
                    }
                    if (event.data.isLoadMore) {
                        this.offsetsOfLoadMore.push(event.data);
                    }
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
    }

    removeNotifications(connection: string, topics: any[]) {
        for (const topic of topics) {
            this.messages = this.messages.filter(x => !(x.connection === connection && x.topic === topic && x.type !== 'message'));
        }
    }

    updateNotification(connection: KafkaConnection, topic: string) {
        let notification = this.messages.find(x => x.type == EventType.MESSAGES_TO_FETCH && x.connection == connection.name && x.topic == topic);
        if (notification.userValues.fetching) {
            notification.userValues.fetching = false;
            notification.userValues.numOfMessages = 0;
            if (notification.userValues.numOfMessagesMore <= 0) {
                this.removeNotifications(connection.name, [ topic ]);
            }
        }
    }

    getNotificationMessage(type, data): RowMessage {
        return {
            connection: data.topic.connectionName,
            topic: data.topic.name,
            timestamp: moment(new Date(), 'UTC').add(7, 'days').format("YYYY-MM-DD HH:mm.ss"),
            timestampAdded: moment(new Date(), 'UTC').add(7, 'days'),
            type: type,
            userValues: {
                numOfMessages: data.quantity,
                numOfMessagesMore: data.quantityMore,
                offsets: data.offsets,
                fetching: true,
                isMore: false
            },
            payload: '',
            size: 0,
            key: '',
            offset: 0,
            partition: 0,
        }
    }

    loadMoreMessages(notification: RowMessage) {
        notification.userValues.numOfMessages = Math.min(this.configurationService.config.numberOfMessagesPerTopic, notification.userValues.numOfMessagesMore);
        notification.userValues.fetching = true;
        notification.userValues.numOfMessagesMore -= notification.userValues.numOfMessages;
        this.kafkaService.subscribeFromOffsets(notification.connection, notification.topic, notification.userValues.offsets, true);
    }

    dismiss(notification: RowMessage) {
        this.removeNotifications(notification.connection, [ notification.topic ]);
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
        if (this.offsetsOfLoadMore.find(x => x.topic.connectionName == connection.name && x.topic.name == message.topic &&
            x.offsetsLoadedMore.find(y => message.partition == y.partition && y.start <= message.offset && y.end >= message.offset))) {
            rowMessage.timestampAdded = new Date().valueOf();
        }
        if (!this.messages.find(x => x.connection == rowMessage.connection && x.topic == rowMessage.topic && x.partition == rowMessage.partition && x.offset == rowMessage.offset)) {
            this.messages.push(rowMessage);
        }
    }

    setUserValuesOnAllRows() {
        for (let row of this.messages) {
            this.setUserValues(row);
        }
    }

    setUserValues(row: RowMessage) {
        row.userValues = {};
        for (let column of this.columns) {
            if (column.isUserDefined && column.jsonPath) {
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
        return message.type === 'message' && new Date(message.timestamp).valueOf() + 60000 > new Date().valueOf();
    }

    isNewAddedMoreMessage(message: RowMessage) {
        return message.type === 'message' && !this.isNewMessage(message) && new Date(message.timestampAdded).valueOf() + 30000 > new Date().valueOf();
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
