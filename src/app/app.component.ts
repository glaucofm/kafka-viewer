import {Component, enableProdMode} from '@angular/core';
import {ElectronService, NgxElectronModule} from 'ngx-electron';


enableProdMode();
// setTheme();

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
    public title = 'kafka-viewer';

    constructor(private electronModule: ElectronService) {
    }

    ngOnInit() {
        this.electronModule.isElectronApp? this.title = 'Electron' : 'not electron';
    }
}

