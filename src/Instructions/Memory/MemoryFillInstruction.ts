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

import { protect } from '../../internal';
import { KWatError } from '../../errors';
import { MemoryType, Type } from '../../Types';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { MemoryManagementInstruction } from './MemoryManagementInstruction';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';
import type { IEncoder } from '../../Encoding';

export class MemoryFillInstruction extends MemoryManagementInstruction<OpCodes.op_extension_1> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32, Type.i32 ], [] ]; }
    public readonly operationCode!: OpCodesExt1.memory_fill;
    public constructor(memory?: MemoryType) {
        super(OpCodes.op_extension_1, memory);
        protect(this, 'operationCode', OpCodesExt1.memory_fill, true);
    }
    protected override encodeAlign(_: IEncoder, __: ExpressionEncodeContext): void { }
    protected override encodeCode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encodeCode(encoder, context);
        encoder.uint32(this.operationCode);
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.bulkMemory) { throw new KWatError('Bulk memory instruction detected'); }
        super.encode(encoder, context);
    }
    public static readonly instance = new MemoryFillInstruction();
}
MemoryFillInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.memory_fill);