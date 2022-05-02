import { protect } from './internal';

export class KWatError extends Error {
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, KWatError.prototype);
    }
}

export class UnsupportedExtensionError extends KWatError {
    public readonly extension!: string;
    public constructor(extension: string) {
        super('Use of an unsupported extensions detected: ' + extension + '')
        protect(this, 'extension', extension);
    }
}