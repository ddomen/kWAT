/**
  * @license kwat 0.1.0 Copyright (C) 2022 Daniele Domenichelli
  * 
  * This program is free software: you can redistribute it and/or modify
  * it under the terms of the GNU General Public License as published by
  * the Free Software Foundation, either version 3 of the License, or
  * (at your option) any later version.
  * 
  * This program is distributed in the hope that it will be useful,
  * but WITHOUT ANY WARRANTY; without even the implied warranty of
  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  * GNU General Public License for more details.
  * 
  * You should have received a copy of the GNU General Public License
  * along with this program.  If not, see <https://www.gnu.org/licenses/>.
  */

import { Module, WasmOptions } from '../Module';
import { IParser, IParserCtor, SExpressionParser } from './parser';
import { Decoder, Encoder, IDecoder, IDecoderCtor, IEncoder, IEncoderCtor } from '../Encoding';

/** Options for the compilation */
export type CompilationOptions = {
    /** An encoder to be used, if different from the default */
    encoder?: IEncoder | IEncoderCtor,
    /** Wasm options to consider during the bytecode emission */
    wasm?: Partial<WasmOptions>
}

/**Compile a module to a bytecode array
 * @param {Module} target the target module to be compiled
 * @param {CompilationOptions} [options] Wasm options to consider during the bytecode emission
 */
export function compile(target: Module, options?: CompilationOptions): Uint8Array;
/**Compile a module to a bytecode array
 * @param {string} target a string to be parsed into a module and then compiled
 * @param {(IParser|IParserCtor)} parser the parser used to convert the string into a module
 * @param {CompilationOptions} [options] options to consider during the compilation
 */
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

/** Options for the decompilation */
export type DecompilationOptions = {
    /** A decoder to be used, if different from the default */
    decoder?: IDecoder | IDecoderCtor
}

/** Converts a bytecode buffer into a module object
 * @param {Uint8Array} buffer the buffer to decompile
 * @param {DecompilationOptions} [options] options to consider during the decompilation
 * @returns 
 */
export function decompile(buffer: Uint8Array, options?: DecompilationOptions): Module {
    options = Object.assign({}, options);
    
    if (!options.decoder) { options.decoder = new Decoder(buffer.buffer, buffer.byteOffset, buffer.byteLength); }
    else if (typeof(options.decoder) === 'function') { options.decoder = new options.decoder(); }

    return Module.decode(options.decoder);
}