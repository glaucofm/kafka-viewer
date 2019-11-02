import {EventEmitter} from "@angular/core";
import {ApplicationEvent} from "../model/types";

export class EventService {

    public static emitter = new EventEmitter<ApplicationEvent>();

}
