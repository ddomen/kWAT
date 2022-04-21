/*
 * Copyright (C) 2022 Daniele Domenichelli
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

import { OpCodes } from '../../../OpCodes';
import { AbstractNumericInstruction } from '../AbstractNumericInstruction';

export type NumericConstInstructionCodes = OpCodes.i32_const | OpCodes.i64_const | OpCodes.f32_const | OpCodes.f64_const;
export abstract class NumericConstInstruction<O extends NumericConstInstructionCodes=NumericConstInstructionCodes> extends AbstractNumericInstruction<O> {
    public Value: number;
    protected constructor(code: O, value: number) { super(code); this.Value = value; }
}