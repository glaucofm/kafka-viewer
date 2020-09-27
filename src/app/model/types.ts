
export interface KafkaConnection {
    name: string;
    brokers: string;
    topics?: Topic[];
    isConnected?: boolean;
    useJavaProxy: boolean;
}

export interface Topic {
    name: string;
    isSelected: boolean;
    connectionName?: string
}

export enum EventType {
    MESSAGE = 'message',
    MESSAGES = 'messages',
    REMOVE_TOPIC = 'remove-topic',
    DISCONNECT = 'disconnect',
    COLUMNS = 'columns',
    COLUMNS_MODIFIED = 'columns-modified',
    SUBSCRIBED_TO_TOPIC = 'subscribed-to-topic',
    MESSAGES_TO_FETCH = 'messages-to-fetch',
    THEME = 'theme',
    TOPICS = 'topics',
    GET_OFFSETS = 'get-offsets',
    OFFSETS = 'offsets',
    SUBSCRIBE = 'subscribe',
    UNSUBSCRIBE = 'unsubscribe',
    PUBLISH = 'publish',
    CONNECT = 'connect',
    CONNECTED = 'connected'
}

export interface ApplicationEvent {
    type: EventType;
    data?: any;
}

export interface KafkaMessage {
    payload: string,
    size: number,
    key: string,
    topic: string,
    offset: number,
    partition: number,
    timestamp: number,
    timestampAdded: number,
    headers?: string[][]
}

export interface Column {
    name: string,
    jsonPath?: string,
    isEnabled: boolean,
    isUserDefined: boolean,
    isResizable?: boolean,
    naturalWidth?: number,
    width?: number,
}

export interface RowMessage extends KafkaMessage {
    connection?: string,
    formattedSize?: string,
    formattedTimestamp?: number,
    json?: any,
    formattedJson?: string,
    completePayload?: string,
    parsedJson?: any,
    type?: string,
    metadataOpen?: boolean;
    userValues?: {
        [key: string]: any;
    },
}

export interface TopicsEvent {
    name: string,
    topics: string[]
}

export interface OffsetsEvent {
    name: string;
    topic: string;
    offsets: Offset[];
}

export interface Offset {
    partition: number,
    start: number,
    end: number
}
