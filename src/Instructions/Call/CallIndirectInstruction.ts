import { OpCodes } from '../../OpCodes';
import { AbstractCallInstruction } from './AbstractCallInstruction';
import * as Types from '../../Types';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionContext, StackEdit } from '../Instruction';

export class CallIndirectInstruction extends AbstractCallInstruction<OpCodes.call_indirect> {
    public override get stack(): StackEdit {
        return [
            this.Type.Parameters.slice().concat([ Types.Type.i32 ]),
            this.Type.Results.slice()
        ];
    }
    public Type: Types.FunctionType;
    public Table: Types.TableType;
    public constructor(fn: Types.FunctionType, table: Types.TableType) {
        super(OpCodes.call_indirect);
        this.Type = fn;
        this.Table = table;
    }
    public getTypeIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.TypeSection.indexOf(this.Type);
        if(!pass && index < 0) { throw new Error('Call Indirect Instruction invalid type reference'); }
        return index;
    }
    public getTableIndex(context: ExpressionContext, pass?: boolean): number {
        let index = context.module.TableSection.Tables.indexOf(this.Table);
        if(!pass && index < 0) { throw new Error('Call Indirect Instruction invalid table reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionContext): void {
        let tid = this.getTypeIndex(context),
            xid = this.getTableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(tid).uint32(xid);
    }
    public static override decode(decoder: IDecoder, context: ExpressionContext): CallIndirectInstruction {
        let type = decoder.uint32();
        if (!context.module.TypeSection.Types[type]) { throw new Error('Call Indirect Instruction invalid type reference'); }
        let table = decoder.uint32();
        if (!context.module.TableSection.Tables[table]) { throw new Error('Call Indirect Instruction invalid table reference'); }
        return new CallIndirectInstruction(
            context.module.TypeSection.Types[type]!,
            context.module.TableSection.Tables[table]!
        );
    }
}
CallIndirectInstruction.registerInstruction(OpCodes.call_indirect);