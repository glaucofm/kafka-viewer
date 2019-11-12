import {Injectable} from "@angular/core";
import {EventService} from "./event.service";
import {ApplicationEvent} from "../model/types";
import {StorageService} from "./storage.service";

@Injectable()
export class ConfigurationService {

    public theme = 'light';

    public config = {
        numberOfMessagesPerTopic: 100,
        numberOfMessagesOnScreen: 500
    };

    private currentConfigForComparison = JSON.stringify(this.config);

    constructor() {
        this.setTheme();
        this.loadConfiguration();
        setInterval(() => this.saveConfiguration(), 5000);
    }

    loadConfiguration() {
        let config = StorageService.get('config');
        if (!config) {
            config = this.config;
            StorageService.save('config', config);
        } else {
            this.config = config;
        }
    }

    saveConfiguration() {
        if (JSON.stringify(this.config) !== this.currentConfigForComparison) {
            StorageService.save('config', this.config);
            this.currentConfigForComparison = JSON.stringify(this.config);
        }
    }

    setTheme(theme?: { name: 'light' | 'dark' }) {
        if (!theme) {
            theme = StorageService.get('theme');
            if (!theme) {
                theme = { name: 'light' };
            }
        }
        StorageService.save('theme', theme);
        this.theme = theme.name;
        document.getElementsByTagName("body")[0].className = theme.name + '-theme';
    }

}

