export class KWatError extends Error {
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, KWatError.prototype);
    }
}