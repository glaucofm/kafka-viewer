import {Component, OnInit, Input, Output, OnChanges, EventEmitter, HostListener} from '@angular/core';
import {trigger, state, style, animate, transition } from '@angular/animations';

@Component({
    selector: 'app-modal',
    templateUrl: 'modal.component.html',
    styleUrls: ['modal.component.css'],
    animations: [
        trigger('modal', [
            transition('void => *', [
                style({opacity: 0}),
                animate(200, style({opacity: 1}))
            ]),
            transition('* => void', [
                style({opacity: 1}),
                animate(150, style({opacity: 0}))
            ])
        ])
    ]
})
export class ModalComponent implements OnInit {
    @Input() visible: true;
    @Input() margin: string = 'auto';
    @Input() width: string = '600px';

    @Output() closeModal = new EventEmitter();

    constructor() { }
    ngOnInit() { }

    close() {
        this.closeModal.emit();
    }

    stopBubbling(event: Event) {
        event.stopPropagation();
    }

    @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(event: KeyboardEvent) {
        this.close();
    }
}
