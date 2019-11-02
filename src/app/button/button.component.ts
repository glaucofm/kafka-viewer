import {Component, Input, OnInit, ViewEncapsulation} from '@angular/core';

@Component({
    selector: 'app-button',
    templateUrl: './button.component.html',
    styleUrls: ['./button.component.css']
})
export class ButtonComponent implements OnInit {

    @Input() text: string;
    @Input() class: string;
    @Input() type: 'Save' | 'New' | 'Cancel' | 'Delete' | 'Edit';
    @Input() onClick: any;
    @Input() disabled: boolean;
    @Input() loading: string;
    @Input() outline: boolean;

    constructor() {
    }

    ngOnInit() {
        if (this.type === 'New' || this.type === 'Cancel' || this.type === 'Delete' || this.type === 'Edit') {
            this.outline = true;
        }
    }

    getButtonClass() {
        return this.class;
    }

    getIconClass() {
        if (this.type === 'Save') {
            return 'far fa-save';
        } else if (this.type === 'New') {
            return 'far fa-file';
        } else if (this.type === 'Edit' ) {
            return 'fas fa-edit';
        } else if (this.type === 'Delete' ) {
            return 'fas fa-trash';
        }
    }

    isLoading(): boolean {
        return false;
    }

    myclick(): any {
        this.onClick();
    }

}
