/*
 * Copyright (C) 2022 Daniele Domenichelli
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

import { protect } from '../internal';
import { Section, SectionTypes } from './Section';
import { FunctionType, Type, ValueType } from '../Types';
import { Expression, Instruction } from '../Instructions';
import type { Module, WasmOptions } from '../Module';
import type { IEncoder, IDecoder, IEncodable } from '../Encoding';

type CodeSegmentContext = {
    module: Module,
    options: WasmOptions,
    index: number
}

/** A segment of the code section containing the body
 * of a function defined in the module
 */
export class CodeSegment implements IEncodable<[Module, WasmOptions]> {
    /** The signature of the holding function */
    public Signature: FunctionType;
    /** The body of the function */
    public readonly Body!: Expression;
    /** The local variables instantiated by the function */
    public readonly Locals!: ValueType[];

    /** Create a new function body definition 
     * @param {FunctionType} signature the signature of the holding function
     * @param {Instruction[]} [body] the instructions contained in the body
     * @param {ValueType[]} [locals] local variables instantiated in the function
     */
    public constructor(signature: FunctionType, body: Instruction[] = [], locals: ValueType[] = []) {
        this.Signature = signature;
        protect(this, 'Body', new Expression(body), true);
        protect(this, 'Locals', locals.slice(), true);
    }

    public encode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        let e = encoder.spawn();
        let l = this.Locals.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), { } as { [key: number]: number });
        e.uint32(Object.keys(l).length);
        for (let k in l) { e.uint32(l[k]!).uint8(parseInt(k)); }
        e.encode(this.Body, mod, opts);
        encoder.uint32(e.size).append(e);
    }

    /**Decode this object through a decoder
     * @param {IDecodder} decoder the decoder target of the reading
     * @param {{ module: Module, index: number }} context
     *      a context object containing the module and the index of the
     *      holding function in the function section
     * @return {CodeSegment} the read code segment
    */
    public static decode(decoder: IDecoder, context: CodeSegmentContext): CodeSegment {
        if (!context.module.FunctionSection.Functions[context.index]) {
            throw new Error('Invalid Code Segment function reference');
        }
        const len = decoder.uint32();
        const curr = decoder.remaining;
        let nLocals = decoder.uint32();
        let locals: Type[] = [], n, l;
        for (let i = 0; i < nLocals; ++i) {
            n = decoder.uint32();
            for (let j = 0; j < n; ++j) {
                l = decoder.uint8();
                if (!(l in Type)) { throw new Error('Invalid Code Segment Local Type'); }
                locals.push(l);
            }
        }
        let body = decoder.decode(Expression, context.module, context.options);
        if (curr - decoder.remaining !== len) { throw new Error('Invalid Code Segment length'); }
        return new CodeSegment(
            context.module.FunctionSection.Functions[context.index++]!,
            body.Instructions, locals as any[]
        );
    }
}

/** A section containing the function body for the function defined in a module */
export class CodeSection extends Section<SectionTypes.code> {
    /** All the fnuction bodies defined in the module */
    public readonly Codes!: CodeSegment[];
    
    /** Create a new empty code section */
    public constructor() {
        super(SectionTypes.code);
        protect(this, 'Codes', [], true);
    }

    /** Add a new code segment to the section, if not present,
     * also by checking the equality of the segments by signature.
     * @param {CodeSegment} segment the body code segment
     * @returns {boolean} the success of the operation
     */
    public add(segment: CodeSegment): boolean;
    /** Add a new code segment to the section, if not present,
     * also by checking the equality of the segments by signature.
     * @param {FunctionType} signature the function signature
     * @param {Instruction[]} [body] the instructions contained in the body
     * @param {ValueType[]} [locals] local variables instantiated in the function
     * @returns {boolean} the success of the operation
     */
    public add(signature: FunctionType, body?: Instruction[], locals?: ValueType[]): boolean
    public add(segment: FunctionType | CodeSegment, body: Instruction[]=[], locals: ValueType[]=[]): boolean {
        if (segment instanceof FunctionType) { segment = new CodeSegment(segment, body, locals); }
        if (!(segment instanceof CodeSegment)) { throw new Error('Invalid Code Segment pushed'); }
        if (this.Codes.some(cs => cs.Signature === (segment as CodeSegment).Signature)) { return false; }
        this.Codes.push(segment);
        return true;
    }
    
    public contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (
            this.Codes.length != mod.FunctionSection.Functions.length ||
            this.Codes.some((cs, i) => !cs.Signature.equals(mod.FunctionSection.Functions[i]))
        ) { throw new Error('Code Section does not correspond to Function Section!'); }
        encoder.vector(this.Codes, mod, opts);
    }

    public decode(decoder: IDecoder, mod: Module): void {
        this.Codes.length = 0;
        this.Codes.push(...decoder.vector(CodeSegment, { index: 0, module: mod }))
    }
}