import { protect } from '../../internal';
import { MemoryType, Type } from '../../Types';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';
import type { IEncoder } from '../../Encoding';

export class MemoryCopyInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32, Type.i32 ], [] ]; }
    public readonly OperationCode!: OpCodesExt1.memory_copy;
    public Source: MemoryType | null;
    public Destination: MemoryType | null;
    public constructor(source?: MemoryType, destination?: MemoryType) {
        super(OpCodes.op_extension_1);
        protect(this, 'OperationCode', OpCodesExt1.memory_copy, true);
        this.Source = source || null;
        this.Destination = destination || null;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.bulkMemory) { throw new Error('Bulk memory instruction detected'); }
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode)
                .uint32(this._memoryIndex(this.Source, context))
                .uint8(this._memoryIndex(this.Destination, context));
    }
    public static readonly instance = new MemoryCopyInstruction();
}
MemoryCopyInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.memory_copy);