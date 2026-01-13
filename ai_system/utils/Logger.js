// utils/Logger.js
// Structured logging with aggregation and silent mode

export class Logger {
    // Static registry for collecting all logs across all modules
    static globalBuffer = [];
    static silentMode = false;
    static aggregateOutput = true; // NEW: Toggle for aggregated output

    constructor(moduleName) {
        this.moduleName = moduleName;
        this.logBuffer = [];
    }

    info(message, data = null) {
        this.log('INFO', message, data);
    }

    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    error(message, error = null) {
        this.log('ERROR', message, error);
    }

    data(message, data) {
        this.log('DATA', message, data);
    }

    log(level, message, data) {
        const entry = {
            timestamp: Date.now(),
            level,
            module: this.moduleName,
            message,
            data
        };
        
        // Buffer locally
        this.logBuffer.push(entry);
        
        // Buffer globally
        Logger.globalBuffer.push(entry);
        
        // Console output (respects aggregateOutput setting)
        if (!Logger.aggregateOutput) {
            // Original behavior: log each line
            const prefix = `[${level}][${this.moduleName}]`;
            if (data) {
                console.log(prefix, message, data);
            } else {
                console.log(prefix, message);
            }
        }
    }

    /**
     * Get aggregated log trace for this module
     */
    getTrace() {
        return this.logBuffer;
    }

    clear() {
        this.logBuffer = [];
    }

    /**
     * Static method: Output all buffered logs as single JSON
     */
    static flushGlobalLogs() {
        if (Logger.globalBuffer.length === 0) return;

        console.log('%c=== AI EXECUTION TRACE ===', 'color: #4fc3f7; font-weight: bold; font-size: 14px;');
        console.log(JSON.stringify({
            executionId: Date.now(),
            totalLogs: Logger.globalBuffer.length,
            logs: Logger.globalBuffer
        }, null, 2));
        console.log('%c=== END TRACE ===', 'color: #4fc3f7; font-weight: bold;');
    }

    /**
     * Static method: Clear global buffer
     */
    static clearGlobalLogs() {
        Logger.globalBuffer = [];
    }

    /**
     * Static method: Set output mode
     */
    static setAggregateOutput(enabled) {
        Logger.aggregateOutput = enabled;
    }
}
