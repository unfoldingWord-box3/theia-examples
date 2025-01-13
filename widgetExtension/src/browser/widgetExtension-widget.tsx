import * as React from 'react';
import { injectable, postConstruct, inject } from '@theia/core/shared/inversify';
import { AlertMessage } from '@theia/core/lib/browser/widgets/alert-message';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import {Emitter, Event, MessageService} from '@theia/core';
import {Message, Saveable} from '@theia/core/lib/browser';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';

@injectable()
export class WidgetExtensionWidget extends ReactWidget implements Saveable {
    public readonly onContentChangedEmitter = new Emitter<void>();
    onContentChanged: Event<void> = this.onContentChangedEmitter.event;
    revert?(options?: Saveable.RevertOptions): Promise<void> {
        throw new Error('Method not implemented.');
    }
    createSnapshot?(): Saveable.Snapshot {
        throw new Error('Method not implemented.');
    }
    applySnapshot?(snapshot: object): void {
        throw new Error('Method not implemented.');
    }
    serialize?(): Promise<BinaryBuffer> {
        throw new Error('Method not implemented.');
    }

    static readonly ID = 'widgetExtension:widget';
    dirty: boolean= false;
    static readonly LABEL = 'WidgetExtension Label';
    public readonly onDirtyChangedEmitter = new Emitter<void>();
    onDirtyChanged: Event<void> = this.onDirtyChangedEmitter.event
    autoSave: "off";

    save(): import ("@theia/core").MaybePromise<void> {
        //Save your content 
        this.dirty=false;
        this.onDirtyChangedEmitter.fire(undefined);
    }

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    @postConstruct()
    protected init(): void {
        this.doInit()
    }

    protected async doInit(): Promise <void> {
        this.id = WidgetExtensionWidget.ID;
        this.title.label = WidgetExtensionWidget.LABEL;
        this.title.caption = `Caption ${WidgetExtensionWidget.LABEL}`;
        this.title.closable = true;
        this.title.iconClass = 'fa fa-window-maximize'; // example widget icon.
        this.update();
    }

    render(): React.ReactElement {
        const header = `WidgetExtension widget which simply calls the messageService
        in order to display an info message to end users.`;
        return <div id='widget-container'>
            <AlertMessage type='INFO' header={header} />
            <button id='displayMessageButton' className='theia-button secondary' title='WidgetExtension Message' onClick={_a => this.displayMessage()}>WidgetExtension Message</button>
        </div>
    }

    protected displayMessage(): void {
        this.dirty=true;
        this.onDirtyChangedEmitter.fire(undefined);
        this.messageService.info('Congratulations: WidgetExtension Widget Successfully Created!');
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        const htmlElement = document.getElementById('displayMessageButton');
        if (htmlElement) {
            htmlElement.focus();
        }
    }

}
