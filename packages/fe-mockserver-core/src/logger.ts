import type { ILogger } from '@ui5/logger';
import process from 'node:process';

class Logger implements ILogger {
    constructor(private loggerName: string, private debug: boolean) {}

    error(message: string | Error): void {
        process.stderr.write('error ' + this.loggerName + ' :: ' + message.toString() + '\n');
    }

    info(message: string): void {
        if (this.debug) {
            process.stdout.write('info ' + this.loggerName + ' :: ' + message + '\n');
        }
    }
}

export function getLogger(loggerName: string, debug: boolean): ILogger {
    return new Logger(loggerName, debug);
}
