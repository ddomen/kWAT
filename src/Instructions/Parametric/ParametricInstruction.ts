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

import { Instruction } from '../Instruction';
import type { OpCodes } from '../../OpCodes';

export type ParametricInstructionCodes = OpCodes.drop | OpCodes.select | OpCodes.select_t;
export abstract class ParametricInstruction<O extends ParametricInstructionCodes=ParametricInstructionCodes> extends Instruction<O> { }