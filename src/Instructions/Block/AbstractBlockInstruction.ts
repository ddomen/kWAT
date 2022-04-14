import { OpCodes } from '../../OpCodes';
import { protect } from '../../internal';
import { GlobalVariableInstruction } from '../Variable';
import { FunctionType, Type, ValueType } from '../../Types';
import { ControlInstruction } from '../Control/ControlInstruction';
import { ExpressionContext, Instruction, InstructionCtor } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';
import type * as Sections from '../../Sections';
import type { AbstractBranchInstruction } from '../Branch';

export const EmptyBlock = 0x40;

export type BlockType = null | ValueType | FunctionType;
export type BlockInstructionCodes = OpCodes.block | OpCodes.loop | OpCodes.if;


export abstract class AbstractBlockInstruction<O extends BlockInstructionCodes=BlockInstructionCodes> extends ControlInstruction<O> {
    public Type: BlockType;
    public readonly Block!: Instruction[];

    protected constructor(code: O, block?: BlockType, instructions: Instruction[]=[]) {
        super(code);
        this.Type = block || null;
        protect(this, 'Block', instructions.slice(), true);
    }

    public getDefinedTypes(): FunctionType[] {
        let result = this.Block
                        .filter(i => i instanceof AbstractBlockInstruction)
                        .map(b => (b as AbstractBlockInstruction).getDefinedTypes())
                        .reduce((a, v) => (a.push(...v), a), []);
        if (this.Type instanceof FunctionType) { result.unshift(this.Type); }
        return result;
    }
    public getDefinedGlobals(): Sections.GlobalVariable[] {
        let r = this.Block
                    .filter(i => i instanceof GlobalVariableInstruction)
                    .map(g => (g as GlobalVariableInstruction).Variable);
        r.push(
            ...this.Block
                    .filter(i => i instanceof AbstractBlockInstruction)
                    .map(i => (i as AbstractBlockInstruction).getDefinedGlobals())
                    .reduce((a, v) => (a.push(...v), a), [])
        );
        return r;
    }

    public getLabel(relative: AbstractBranchInstruction, pass?: boolean) {
        let children: AbstractBlockInstruction<BlockInstructionCodes>[] = [];
        if (this.Block.find(i => (i instanceof AbstractBlockInstruction && children.push(i), i === relative))) {
            return 0;
        }
        let l: number = -1;
        if (children.find(c => (l = c.getLabel(relative, true), l != -1))) { return l + 1; }
        if (!pass) { throw new Error('Branch Instruction is not part of this Block Instruction'); }
        return -1;
    }

    protected encodeOpen(encoder: IEncoder, context: ExpressionContext): void {
        super.encode(encoder, context);
        if (!this.Type) { encoder.uint8(EmptyBlock); }
        else if (this.Type instanceof FunctionType) {
            let index = context.module.TypeSection.indexOf(this.Type);
            if (index < 0) { throw new Error('Invalid Block Type type reference'); }
            encoder.int32(index);
        }
        else { encoder.uint8(this.Type); }
    }
    protected encodeBlock(encoder: IEncoder, context: ExpressionContext): void {
        encoder.array(this.Block, context);
    }
    protected encodeClose(encoder: IEncoder, _: ExpressionContext): void {
        encoder.uint8(OpCodes.end);
    }

    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        context.blocks.unshift(this);
        this.encodeOpen(encoder, context);
        this.encodeBlock(encoder, context);
        this.encodeClose(encoder, context);
        if (context.blocks.shift() !== this) { throw new Error('Unexpected block on the context stack'); }
    }

    protected decodeType(decoder: IDecoder, context: ExpressionContext): BlockType {
        let header = decoder.peek(), block;
        if (header === EmptyBlock) { block = null; decoder.uint8(); }
        else if (header in Type) { block = header; decoder.uint8(); }
        else {
            let index = decoder.int32();
            if (!context.module.TypeSection.Types[index]) {
                throw new Error('Invalid Block Type type reference');
            }
            block = context.module.TypeSection.Types[index]!;
        }
        return block;
    }
    protected decodeBlock(decoder: IDecoder, context: ExpressionContext): Instruction[] {
        let instructions = [];
        let c = decoder.peek();
        while (c != OpCodes.end && c != OpCodes.else) {
            instructions.push(decoder.decode(Instruction, context));
            c = decoder.peek();
        }
        return instructions;
    }
    public decode(decoder: IDecoder, context: ExpressionContext): void {
        context.blocks.unshift(this);
        let type = this.decodeType(decoder, context);
        let block = this.decodeBlock(decoder, context);
        decoder.uint8();
        if (context.blocks.shift() !== this) { throw new Error('Unexpected block on the context stack'); }
        this.Type = type;
        this.Block.length = 0;
        this.Block.push(...block);
    }

    public static override decode<O extends BlockInstructionCodes>(
        this: InstructionCtor<AbstractBlockInstruction<O>>,
        decoder: IDecoder,
        context: ExpressionContext
    ): AbstractBlockInstruction<O> {
        let block = new this();
        block.decode(decoder, context);
        return block;
    }
    public static readonly EmptyBlock = EmptyBlock;
}