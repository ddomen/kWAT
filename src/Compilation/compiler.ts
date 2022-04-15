import { Module, WasmOptions } from '../Module';
import { IParser, IParserCtor, SExpressionParser } from './parser';
import { Decoder, Encoder, IDecoder, IDecoderCtor, IEncoder, IEncoderCtor } from '../Encoding';

export type CompilationOptions = {
    encoder?: IEncoder | IEncoderCtor,
    wasm?: Partial<WasmOptions>
}

export function compile(target: Module, options?: CompilationOptions): Uint8Array;
export function compile(target: string, parser: IParser | IParserCtor, options?: CompilationOptions): Uint8Array;
export function compile(target: Module | string, parser?: IParser | IParserCtor | CompilationOptions, options?: CompilationOptions): Uint8Array {
    options = Object.assign({}, options);

    if (typeof(target) === 'string') {
        if (!parser) { parser = new SExpressionParser(); }
        else if (typeof(parser) === 'function') { parser = new parser(); }
        if (!('parse' in parser)) { throw new Error('Invalid parser: ' + parser); }
        target = parser.parse(target);
    }
    else { options = Object.assign({}, parser as CompilationOptions); }

    if (!options.encoder) { options.encoder = new Encoder(); }
    else if (typeof(options.encoder) === 'function') { options.encoder = new options.encoder(); }

    target.encode(options.encoder, options.wasm);
    
    return options.encoder.getBuffer();
}

export type DecompilationOptions = {
    decoder?: IDecoder | IDecoderCtor
}

export function decompile(buffer: Uint8Array, options?: DecompilationOptions): Module {
    options = Object.assign({}, options);
    
    if (!options.decoder) { options.decoder = new Decoder(buffer.buffer, buffer.byteOffset, buffer.byteLength); }
    else if (typeof(options.decoder) === 'function') { options.decoder = new options.decoder(); }

    return Module.decode(options.decoder);
}