import { Module } from '../Module';
import { OpCodes } from '../OpCodes';
import { protect } from '../internal';
import { Instruction } from './Instruction';
import { AbstractBlockInstruction } from './Block';
import { GlobalVariableInstruction } from './Variable';
import * as Types from '../Types';
import * as Sections from '../Sections';
import type { IDecoder, IEncodable, IEncoder } from '../Encoding';

export type Passable<T extends boolean | undefined, R> = R | (T extends false | undefined ? never : null);

export class Expression implements IEncodable<Module> {

    public readonly Instructions!: Instruction[];
    
    public constructor(instructions: Instruction[]=[]) {
        protect(this, 'Instructions', instructions.slice(), true);
    }

    public getDefinedTypes(): Types.FunctionType[] {
        return this.Instructions
                    .filter(i => i instanceof AbstractBlockInstruction)
                    .map(i => (i as AbstractBlockInstruction).getDefinedTypes())
                    .reduce((a, v) => (a.push(...v), a), []);
    }

    public getDefinedGlobals(): Sections.GlobalVariable[] {
        let r = this.Instructions
                    .filter(i => i instanceof GlobalVariableInstruction)
                    .map(g => (g as GlobalVariableInstruction).Variable);
        r.push(
            ...this.Instructions
                    .filter(i => i instanceof AbstractBlockInstruction)
                    .map(i => (i as AbstractBlockInstruction).getDefinedGlobals())
                    .reduce((a, v) => (a.push(...v), a), [])
        );
        return r;
    }

    public encode(encoder: IEncoder, context: Module): void {
        encoder
            .array(this.Instructions, { module: context, blocks: [] })
            .uint8(OpCodes.end);
    }

    public evaluate(params: Types.ResultType): Passable<undefined, Types.ResultType>;
    public evaluate<B extends boolean>(params: Types.ResultType, pass: B): Passable<B, Types.ResultType>;
    public evaluate(params: Types.ResultType, pass?: boolean): Passable<typeof pass, Types.ResultType>;
    public evaluate(params: Types.ResultType, pass?: boolean): Passable<typeof pass, Types.ResultType> {
        return Instruction.resolveStack(this.Instructions, params, pass);
    }
    
    public static decode(decoder: IDecoder, context: Module): Expression {
        let exp = new Expression();
        while (decoder.peek() != OpCodes.end) {
            exp.Instructions.push(Instruction.decode(decoder, { module: context, blocks: [] }));
        }
        decoder.uint8();
        return exp;
    }
}