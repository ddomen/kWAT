/** Enumerations for express way to encode a number on buffers */
export enum Relaxations {
    /** Write numbers with compression algorithms */
    Canonical = 'Canonical',
    /** Write numbers as full size */
    Full      = 'Full',
    /** Write numbers as their original size */
    None      = 'None',
}
/** String keys available to express a way to encode a number on buffers */
export type RelaxationKeys = keyof typeof Relaxations;
/** Way to express the number encoding on buffers */
export type Relaxation = Relaxations | RelaxationKeys;

/** Possible types for encoding */
export type EncodeType = 'uint8' | 'uint32' | 'uint64' | 'int32' | 'float32' | 'float64';
/** A generic numeric array-like accessible object */
export type NumericArray = { [key: number]: number, length: number };