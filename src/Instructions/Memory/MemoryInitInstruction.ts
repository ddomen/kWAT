import { Type } from '../../Types';
import { protect } from '../../internal';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { DataSegment } from '../../Sections';
import type { ExpressionContext, StackEdit } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';

export class MemoryInitInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32, Type.i32 ], [] ]; }
    public readonly OperationCode!: OpCodesExt1.memory_init;
    public Data: DataSegment;
    public constructor(data: DataSegment) {
        super(OpCodes.op_extension_1);
        protect(this, 'OperationCode', OpCodesExt1.memory_init, true);
        this.Data = data;
    }
    public getDataIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.DataSection.Datas.indexOf(this.Data);
        if (!pass && index < 0) { throw new Error('Memory Init Instruction invalid data reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let index = this.getDataIndex(context);
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode).uint32(index).uint8(0x00);
    }

    public static override decode(decoder: IDecoder, context: ExpressionContext): MemoryInitInstruction {
        let index = decoder.uint32();
        if (!context.module.DataSection.Datas[index]) { throw new Error('Memory Init Instruction invalid data reference'); }
        let b;
        if ((b = decoder.uint8()) !== 0x00) { throw new Error('Memory Init Instruction unexpected closing byte: 0x' + Number(b).toString(16)); }
        return new MemoryInitInstruction(context.module.DataSection.Datas[index]!)
    }
}
MemoryInitInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.memory_init);