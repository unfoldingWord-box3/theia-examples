import { CommandContribution, CommandRegistry, MessageService } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';

export const MyCommand = {
    id: "MyID",
    label: "Say Hello"
}

@injectable()
// Add contribution interface to be implemented, e.g. "EmptyContribution implements CommandContribution"
export class EmptyContribution implements CommandContribution {
    constructor(@inject(MessageService) private readonly messageService: MessageService) {

    }

    registerCommands(commandRegistry: CommandRegistry): void {
        commandRegistry.registerCommand(MyCommand, {
            execute: () => this.messageService.info("Hello World")
        })
    }

}