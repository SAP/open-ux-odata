import { ILogger, getLogger as _getLogger } from '@ui5/logger';

class Logger implements ILogger {
    logger: ILogger;

    constructor(loggerName: string, private debug: boolean) {
        this.logger = _getLogger(loggerName);
    }

    error(message: string | Error): void {
        this.logger.error(message);
    }

    info(message: string): void {
        if (this.debug) {
            this.logger.error(message);
        }
    }
}

export function getLogger(loggerName: string, debug: boolean): ILogger {
    return new Logger(loggerName, debug);
}
