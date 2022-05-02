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
import { MemoryType, Type } from '../../Types';
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { UnsupportedExtensionError } from '../../errors';
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
        if (!context.options.bulkMemory) { throw new UnsupportedExtensionError('bulk memory'); }
        super.encode(encoder, context);
        encoder.uint32(this.OperationCode)
                .uint32(this._memoryIndex(this.Source, context))
                .uint8(this._memoryIndex(this.Destination, context));
    }
    public static readonly instance = new MemoryCopyInstruction();
}
MemoryCopyInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.memory_copy);