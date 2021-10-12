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
import { KWatError, UnsupportedExtensionError } from '../../errors';
import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { DataSegment } from '../../Sections';
import type { IDecoder, IEncoder } from '../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../Instruction';

export class MemoryInitInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public override get stack(): StackEdit { return [ [ Type.i32, Type.i32, Type.i32 ], [] ]; }
    public readonly operationCode!: OpCodesExt1.memory_init;
    public data: DataSegment;
    public memory: MemoryType | null;
    public constructor(data: DataSegment, memory?: MemoryType) {
        super(OpCodes.op_extension_1);
        protect(this, 'operationCode', OpCodesExt1.memory_init, true);
        this.data = data;
        this.memory = memory || null;
    }
    public getDataIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.dataSection.segments.indexOf(this.data);
        if (!pass && index < 0) { throw new KWatError('Memory Init Instruction invalid data reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.bulkMemory) { throw new UnsupportedExtensionError('bulk memory'); }
        let index = this.getDataIndex(context);
        let mem = 0;
        if (this.memory) {
            mem = context.module.indexOf(this.memory);
            if (mem === -1) { throw new KWatError('Memory index not found: ' + this.memory); }
        }
        if (mem && !context.options.multipleMemory) { throw new UnsupportedExtensionError('multiple memory'); }
        super.encode(encoder, context);
        encoder.uint32(this.operationCode)
                .uint32(index)
                .uint32(mem);
    }

    public static override decode(decoder: IDecoder, context: ExpressionEncodeContext): MemoryInitInstruction {
        let index = decoder.uint32();
        if (!context.module.dataSection.segments[index]) { throw new KWatError('Memory Init Instruction invalid data reference'); }
        let b;
        if ((b = decoder.uint8()) !== 0x00) { throw new KWatError('Memory Init Instruction unexpected closing byte: 0x' + Number(b).toString(16)); }
        return new MemoryInitInstruction(context.module.dataSection.segments[index]!)
    }
}
MemoryInitInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.memory_init);