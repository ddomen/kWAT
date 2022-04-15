import { TableInstruction } from './TableInstruction';
import type { TableType } from '../../Types';
import type { OpCodesExt1 } from '../../OpCodes';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionDecodeContext, ExpressionEncodeContext, InstructionCtor } from '../Instruction';

export type TableOpInstructionCodes = OpCodesExt1.table_grow | OpCodesExt1.table_size | OpCodesExt1.table_fill;
export abstract class TableOperationInstruction<O extends TableOpInstructionCodes=TableOpInstructionCodes> extends TableInstruction<O> {
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        let index = this.getTableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(index);
    }
    public static override decode(
        this: InstructionCtor<TableOperationInstruction, [ TableType ]>,
        decoder: IDecoder,
        context: ExpressionDecodeContext
    ): TableOperationInstruction {
        let index = decoder.uint32();
        if (!context.module.TableSection.Tables[index]) { throw new Error('Table Operation Instruction invalid table reference'); }
        return new this(context.module.TableSection.Tables[index]!);
    }
}