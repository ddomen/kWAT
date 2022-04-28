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

import { Type } from '../../../Types';
import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';
import type { IEncoder } from '../../../Encoding';
import type { ExpressionEncodeContext, StackEdit } from '../../Instruction';

export class I64Extend8SignedInstruction extends AbstractNumericInstruction<OpCodes.i64_extend8_s> {
    public override get stack(): StackEdit { return [ [ Type.i64 ], [ Type.i64 ] ] }
    private constructor() { super(OpCodes.i64_extend8_s); }
    public override encode(encoder: IEncoder, ctx: ExpressionEncodeContext): void {
        if (!ctx.options.signExtension) { throw new Error('Sign extension instruction detected'); }
        super.encode(encoder, ctx);
    }
    public static readonly instance = new I64Extend8SignedInstruction();
}
I64Extend8SignedInstruction.registerInstruction(OpCodes.i64_extend8_s);