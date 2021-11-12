import {EventEmitter, Injectable} from '@angular/core';
import {ApplicationEvent, EventType, OffsetsEvent, TopicsEvent} from "../model/types";
import {EventService} from "./event.service";

@Injectable({ providedIn: 'root' })
export class IpcService {

    constructor() {
        setInterval(this.getEvents, 100);
    }

    async getEvents() {
        let events: ApplicationEvent[] = await (await fetch('http://localhost:32876')).json();
        for (let event of events) {
            if (event.type == EventType.CONNECTED) {
                console.log(EventType.CONNECTED, event.data);
                EventService.emitter.emit({ type: EventType.CONNECTED });
            } else if (event.type == EventType.TOPICS) {
                console.log(EventType.TOPICS, event.data);
                EventService.emitter.emit({ type: EventType.TOPICS, data: event.data });
            } else if (event.type == EventType.OFFSETS) {
                console.log(EventType.OFFSETS, event.data);
                EventService.emitter.emit({ type: EventType.OFFSETS, data: event.data });
            } else if (event.type == EventType.MESSAGES) {
                console.log(EventType.MESSAGES, event.data);
                EventService.emitter.emit({ type: EventType.MESSAGES, data: event.data });
            }
        }
    }

    public send(type: EventType, data: any) {
        let event = { type, data };
        fetch('http://localhost:32876', { method: 'POST', body: JSON.stringify(event) });
    }

}
