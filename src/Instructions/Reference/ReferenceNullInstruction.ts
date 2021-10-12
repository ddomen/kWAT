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
import { ReferenceInstruction } from './ReferenceInstruction';
import * as Types from '../../Types'
import type { ExpressionDecodeContext, ExpressionEncodeContext } from '../Instruction';
import type { IDecoder, IEncoder } from '../../Encoding';

export class ReferenceNullInstruction extends ReferenceInstruction<OpCodes.ref_null> {
    public type: Types.ReferenceType;
    public constructor(type: Types.ReferenceType) { super(OpCodes.ref_null); this.type = type; }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        super.encode(encoder, context);
        encoder.uint8(this.type);
    }
    public static override decode(decoder: IDecoder, _?: ExpressionDecodeContext): ReferenceNullInstruction {
        return new ReferenceNullInstruction(decoder.uint8());
    }
    public static readonly FunctionRef = new ReferenceNullInstruction(Types.Type.funcref); 
    public static readonly ExternalRef = new ReferenceNullInstruction(Types.Type.externref); 
}
ReferenceNullInstruction.registerInstruction(OpCodes.ref_null);