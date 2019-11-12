import {Component, enableProdMode} from '@angular/core';

enableProdMode();
// setTheme();

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
    public title = 'kafka-viewer';
}

