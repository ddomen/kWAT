import { Module } from '../Module';
import { IParser, IParserCtor, SExpressionParser } from './parser';
import { Decoder, Encoder, IDecoder, IDecoderCtor, IEncoder, IEncoderCtor } from '../Encoding';

export type CompilationOptions = {
    encoder?: IEncoder | IEncoderCtor,
    parser?: IParser | IParserCtor
}

export function compile(target: Module | string, options?: CompilationOptions): Uint8Array {
    options = Object.assign({}, options);

    if (typeof(target) === 'string') {
        if (!options.parser) { options.parser = new SExpressionParser(); }
        else if (typeof(options.parser) === 'function') { options.parser = new options.parser(); }
        target = options.parser.parse(target);
    }

    if (!options.encoder) { options.encoder = new Encoder(); }
    else if (typeof(options.encoder) === 'function') { options.encoder = new options.encoder(); }

    target.encode(options.encoder);
    
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