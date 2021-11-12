import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {TopbarComponent} from './topbar/topbar.component';
import {ButtonComponent} from './button/button.component';
import {ModalComponent} from './modal/modal.component';
import {FormsModule} from '@angular/forms';
import {KafkaService} from './service/kafka.service';
import {MessageBoxComponent} from './messagebox/message-box.component';
import {MomentModule} from 'ngx-moment';
import {NgxJsonViewerModule} from 'ngx-json-viewer';
import {ConfigurationService} from "./service/configuration.service";
import {IpcService} from "./service/ipc.service";
import { NgxElectronModule } from 'ngx-electron';


@NgModule({
    declarations: [
        AppComponent,
        TopbarComponent,
        ButtonComponent,
        ModalComponent,
        MessageBoxComponent
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        FormsModule,
        MomentModule,
        NgxJsonViewerModule,
        NgxElectronModule
    ],
    providers: [
        KafkaService,
        ConfigurationService,
        IpcService
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
