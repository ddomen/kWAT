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
import { OpCodes, OpCodesExt1 } from '../../OpCodes';
import { KWatError, UnsupportedExtensionError } from '../../errors';
import { AbstractMemoryInstruction } from './AbstractMemoryInstruction';
import type { DataSegment } from '../../Sections';
import type { ExpressionEncodeContext } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';

export class DataDropInstruction extends AbstractMemoryInstruction<OpCodes.op_extension_1> {
    public readonly operationCode!: OpCodesExt1.data_drop;
    public data: DataSegment;
    public constructor(data: DataSegment) {
        super(OpCodes.op_extension_1);
        protect(this, 'operationCode', OpCodesExt1.data_drop, true);
        this.data = data;
    }
    public getDataIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.dataSection.segments.indexOf(this.data);
        if (!pass && index < 0) { throw new KWatError('Memory Init Instruction invalid data reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.bulkMemory) { throw new UnsupportedExtensionError('bulk memory'); }
        let index = this.getDataIndex(context);
        super.encode(encoder, context);
        encoder.uint32(this.operationCode).uint32(index);
    }
    public static override decode(decoder: IDecoder, context: ExpressionEncodeContext): DataDropInstruction {
        let index = decoder.uint32();
        if (!context.module.dataSection.segments[index]) { throw new KWatError('Memory Init Instruction invalid data reference'); }
        return new DataDropInstruction(context.module.dataSection.segments[index]!)
    }
}
DataDropInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.data_drop);