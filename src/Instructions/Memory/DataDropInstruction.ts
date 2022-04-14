import { protect } from '../../internal';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { DataSegment } from '../../Sections';
import type { ExpressionContext } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';

export class DataDropInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public readonly OperationCode!: OpCodesExt1.data_drop;
    public Data: DataSegment;
    public constructor(data: DataSegment) {
        super(OpCodes.op_extension_1);
        protect(this, 'OperationCode', OpCodesExt1.data_drop, true);
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
        encoder.uint32(this.OperationCode).uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): DataDropInstruction {
        let index = decoder.uint32();
        if (!context.module.DataSection.Datas[index]) { throw new Error('Memory Init Instruction invalid data reference'); }
        return new DataDropInstruction(context.module.DataSection.Datas[index]!)
    }
}
DataDropInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.data_drop);