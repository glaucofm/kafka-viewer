
export interface KafkaConnection {
    name: string;
    brokers: string;
    topics?: Topic[];
    isConnected?: boolean
}

export interface Topic {
    name: string;
    isSelected: boolean;
    connectionName?: string
}

export interface ApplicationEvent {
    type: 'message' | 'end-messages' | 'remove-topic' | 'disconnect' | 'columns' | 'columns-modified' | 'subscribed-to-topic' | 'messages-to-fetch' | 'theme',
    data?: any
}

export interface kafkaMessage {
    payload: string,
    size: number,
    key: string,
    topic: string,
    offset: number,
    partition: number,
    timestamp: string,
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

export interface RowMessage extends kafkaMessage {
    connection?: string,
    formattedSize?: string,
    formattedTimestamp?: number,
    json?: any,
    formattedJson?: string,
    completePayload?: string,
    parsedJson?: any,
    type?: string,
    userValues?: {
        [key: string]: any;
    },
}
