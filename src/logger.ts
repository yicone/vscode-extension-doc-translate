import * as vscode from 'vscode';

class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Doc Translate');
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private formatMessage(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] ${message}`;
    }

    public info(message: string): void {
        const formatted = this.formatMessage('INFO', message);
        this.outputChannel.appendLine(formatted);
        console.log(formatted);
    }

    public warn(message: string): void {
        const formatted = this.formatMessage('WARN', message);
        this.outputChannel.appendLine(formatted);
        console.warn(formatted);
    }

    public error(message: string, error?: any): void {
        const formatted = this.formatMessage('ERROR', message);
        this.outputChannel.appendLine(formatted);
        if (error) {
            this.outputChannel.appendLine(`  ${error.stack || error.message || error}`);
        }
        console.error(formatted, error);
    }

    public debug(message: string, data?: any): void {
        const formatted = this.formatMessage('DEBUG', message);
        this.outputChannel.appendLine(formatted);
        if (data) {
            this.outputChannel.appendLine(`  ${JSON.stringify(data, null, 2)}`);
        }
        console.log(formatted, data);
    }

    public show(): void {
        this.outputChannel.show();
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}

export const logger = Logger.getInstance();
