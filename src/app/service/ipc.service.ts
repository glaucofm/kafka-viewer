import {EventEmitter, Injectable} from '@angular/core';
import {ApplicationEvent, EventType, OffsetsEvent, TopicsEvent} from "../model/types";
import {EventService} from "./event.service";

const electron = (<any>window).require('electron');

@Injectable({ providedIn: 'root' })
export class IpcService {

    constructor() {
        electron.ipcRenderer.on(EventType.CONNECTED, (event, data) => {
            console.log(EventType.CONNECTED, data);
            EventService.emitter.emit({ type: EventType.CONNECTED });
        });
        electron.ipcRenderer.on(EventType.TOPICS, (event, data: TopicsEvent) => {
            console.log(EventType.TOPICS, data);
            EventService.emitter.emit({ type: EventType.TOPICS, data });
        });
        electron.ipcRenderer.on(EventType.OFFSETS, (event, data: OffsetsEvent) => {
            console.log(EventType.OFFSETS, data);
            EventService.emitter.emit({ type: EventType.OFFSETS, data });
        });
        electron.ipcRenderer.on(EventType.MESSAGES, (event, data: OffsetsEvent) => {
            console.log(EventType.MESSAGES, data);
            EventService.emitter.emit({ type: EventType.MESSAGES, data });
        });
    }

    public send(type: EventType, data: any) {
        electron.ipcRenderer.send(type, data);
    }

}
