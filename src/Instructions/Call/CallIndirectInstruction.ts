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

import { OpCodes } from '../../OpCodes';
import { KWatError } from '../../errors';
import { AbstractCallInstruction } from './AbstractCallInstruction';
import * as Types from '../../Types';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';

export class CallIndirectInstruction extends AbstractCallInstruction<OpCodes.call_indirect> {
    public override get stack(): StackEdit {
        return [
            this.type.parameters.slice().concat([ Types.Type.i32 ]),
            this.type.results.slice()
        ];
    }
    public type: Types.FunctionType;
    public table: Types.TableType;
    public constructor(fn: Types.FunctionType, table: Types.TableType) {
        super(OpCodes.call_indirect);
        this.type = fn;
        this.table = table;
    }
    public getTypeIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.typeSection.indexOf(this.type);
        if(!pass && index < 0) { throw new KWatError('Call Indirect Instruction invalid type reference'); }
        return index;
    }
    public getTableIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.indexOf(this.table);
        if(!pass && index < 0) { throw new KWatError('Call Indirect Instruction invalid table reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        let tid = this.getTypeIndex(context),
            xid = this.getTableIndex(context);
        super.encode(encoder, context);
        encoder.uint32(tid).uint32(xid);
    }
    public static override decode(decoder: IDecoder, context: ExpressionEncodeContext): CallIndirectInstruction {
        let type = decoder.uint32();
        if (!context.module.typeSection.types[type]) { throw new KWatError('Call Indirect Instruction invalid type reference'); }
        let table = decoder.uint32();
        if (!context.module.tableSection.tables[table]) { throw new KWatError('Call Indirect Instruction invalid table reference'); }
        return new CallIndirectInstruction(
            context.module.typeSection.types[type]!,
            context.module.tableSection.tables[table]!
        );
    }
}
CallIndirectInstruction.registerInstruction(OpCodes.call_indirect);