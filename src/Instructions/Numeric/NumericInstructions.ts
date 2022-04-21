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

import * as Binary from './Binary';
import * as Bits from './Bits';
import * as Compare from './Compare';
import * as Conv from './Conversion';
import * as Unary from './Unary'
import * as Ext1 from '../Extension1'

export const NumericInstructions = {
    I32: {
        EqualZero: Compare.I32EqualZeroInstruction.instance,
        Equal: Compare.I32EqualInstruction.instance,
        NotEqual: Compare.I32NotEqualInstruction.instance,
        TrailingBits: Bits.I32TrailingBitsUnsigendInstruction.instance,
        LeadingBits: Bits.I32LeadingBitsUnsigendInstruction.instance,
        OnesCount: Bits.I32OnesCountInstruction.instance,
        Add: Binary.I32AddInstruction.instance,
        Sub: Binary.I32SubtractInstruction.instance,
        Mul: Binary.I32MultiplyInstruction.instance,
        And: Binary.I32AndInstruction.instance,
        Or: Binary.I32OrInstruction.instance,
        XOr: Binary.I32XOrInstruction.instance,
        BitShiftLeft: Bits.I32BitShifLeftInstruction.instance,
        BitRotationLeft: Bits.I32BitRotationLeftInstruction.instance,
        BitRotationRight: Bits.I32BitRotationRightInstruction.instance,
        WrapI64: Conv.I32WrapI64Instruction.instance,
        Extend8: Conv.I32Extend8SignedInstruction.instance,
        Extend16: Conv.I32Extend16SignedInstruction.instance,
        ReinterpretF32: Conv.I32ReinterpretF32Instruction.instance,
        Signed: {
            Lesser: Compare.I32LesserSignedInstruction.instance,
            Greater: Compare.I32GreaterSignedInstruction.instance,
            LesserEqual: Compare.I32LesserEqualSignedInstruction.instance,
            GreaterEqual: Compare.I32GreaterEqualSignedInstruction.instance,
            Divide: Binary.I32DivideSignedInstruction.instance,
            Remainder: Binary.I32RemainderSignedInstruction.instance,
            BitShiftRight: Bits.I32BitShifRightSignedInstruction.instance,
            Truncate: {
                F32: Conv.I32TruncateF32SignedInstruction.instance,
                F64: Conv.I32TruncateF64SignedInstruction.instance,
                SatF32: Ext1.I32TruncateSaturationF32SignedInstruction,
                SatF64: Ext1.I32TruncateSaturationF64SignedInstruction,
            }
        },
        Unsigned: {
            Lesser: Compare.I32LesserUnsignedInstruction.instance,
            Greater: Compare.I32GreaterUnsignedInstruction.instance,
            LesserEqual: Compare.I32LesserEqualUnsignedInstruction.instance,
            GreaterEqual: Compare.I32GreaterEqualUnsignedInstruction.instance,
            Divide: Binary.I32DivideUnsignedInstruction.instance,
            Remainder: Binary.I32RemainderUnsignedInstruction.instance,
            BitShiftRight: Bits.I32BitShifRightUnsignedInstruction.instance,
            Truncate: {
                F32: Conv.I32TruncateF32UnsignedInstruction.instance,
                F64: Conv.I32TruncateF64UnsignedInstruction.instance,
                SatF32: Ext1.I32TruncateSaturationF32UnsignedInstruction,
                SatF64: Ext1.I32TruncateSaturationF64UnsignedInstruction,
            }
        }
    },
    I64: {
        EqualZero: Compare.I64EqualZeroInstruction.instance,
        Equal: Compare.I64EqualInstruction.instance,
        NotEqual: Compare.I64NotEqualInstruction.instance,
        TrailingBits: Bits.I64TrailingBitsUnsigendInstruction.instance,
        LeadingBits: Bits.I64LeadingBitsUnsigendInstruction.instance,
        OnesCount: Bits.I64OnesCountInstruction.instance,
        Add: Binary.I64AddInstruction.instance,
        Sub: Binary.I64SubtractInstruction.instance,
        Mul: Binary.I64MultiplyInstruction.instance,
        And: Binary.I64AndInstruction.instance,
        Or: Binary.I64OrInstruction.instance,
        XOr: Binary.I64XOrInstruction.instance,
        BitShiftLeft: Bits.I64BitShifLeftInstruction.instance,
        BitRotationLeft: Bits.I64BitRotationLeftInstruction.instance,
        BitRotationRight: Bits.I64BitRotationRightInstruction.instance,
        Extend8: Conv.I64Extend8SignedInstruction.instance,
        Extend16: Conv.I64Extend16SignedInstruction.instance,
        Extend32: Conv.I64Extend32SignedInstruction.instance,
        ReinterpretF64: Conv.I64ReinterpretF64Instruction.instance,
        Signed: {
            Lesser: Compare.I64LesserSignedInstruction.instance,
            Greater: Compare.I64GreaterSignedInstruction.instance,
            LesserEqual: Compare.I64LesserEqualSignedInstruction.instance,
            GreaterEqual: Compare.I64GreaterEqualSignedInstruction.instance,
            Divide: Binary.I64DivideSignedInstruction.instance,
            Remainder: Binary.I64RemainderSignedInstruction.instance,
            BitShiftRight: Bits.I64BitShifRightSignedInstruction.instance,
            TruncateF32: Conv.I64TruncateF32SignedInstruction.instance,
            TruncateF64: Conv.I64TruncateF64SignedInstruction.instance,
            ExtendI32: Conv.I64ExtendI32SignedInstruction.instance,
            Truncate: {
                F32: Conv.I64TruncateF32SignedInstruction.instance,
                F64: Conv.I64TruncateF64SignedInstruction.instance,
                SatF32: Ext1.I64TruncateSaturationF32SignedInstruction,
                SatF64: Ext1.I64TruncateSaturationF64SignedInstruction,
            }
        },
        Unsigned: {
            Lesser: Compare.I64LesserUnsignedInstruction.instance,
            Greater: Compare.I64GreaterUnsignedInstruction.instance,
            LesserEqual: Compare.I64LesserEqualUnsignedInstruction.instance,
            GreaterEqual: Compare.I64GreaterEqualUnsignedInstruction.instance,
            Divide: Binary.I64DivideUnsignedInstruction.instance,
            Remainder: Binary.I64RemainderUnsignedInstruction.instance,
            BitShiftRight: Bits.I64BitShifRightUnsignedInstruction.instance,
            ExtendI32: Conv.I64ExtendI32UnsignedInstruction.instance,
            Truncate: {
                F32: Conv.I64TruncateF32UnsignedInstruction.instance,
                F64: Conv.I64TruncateF64UnsignedInstruction.instance,
                SatF32: Ext1.I64TruncateSaturationF32UnsignedInstruction,
                SatF64: Ext1.I64TruncateSaturationF64UnsignedInstruction,
            }
        },
    },
    F32: {
        Equal: Compare.F32EqualInstruction.instance,
        NotEqual: Compare.F32NotEqualInstruction.instance,
        Lesser: Compare.F32LesserInstruction.instance,
        LesserEqual: Compare.F32LesserEqualInstruction.instance,
        Greater: Compare.F32GreaterInstruction.instance,
        GreaterEqual: Compare.F32GreaterEqualInstruction.instance,
        Absolute: Unary.F32AbsoluteInstruction.instance,
        Negative: Unary.F32NegativeInstruction.instance,
        Ceil: Unary.F32CeilInstruction.instance,
        Floor: Unary.F32FloorInstruction.instance,
        Truncate: Unary.F32TruncateInstruction.instance,
        Nearest: Unary.F32NearestInstruction.instance,
        SquareRoot: Unary.F32SquareRootInstruction.instance,
        Add: Binary.F32AddInstruction.instance,
        Sub: Binary.F32SubtractInstruction.instance,
        Mul: Binary.F32MultiplyInstruction.instance,
        Div: Binary.F32DivideInstruction.instance,
        Min: Binary.F32MinInstruction.instance,
        Max: Binary.F32MaxInstruction.instance,
        CopySign: Binary.F32CopySignInstruction.instance,
        Demote: Conv.F32DemoteF64Instruction.instance,
        ReinterpretI32: Conv.F32ReinterpretI32Instruction.instance,
        Convert: {
            I32: Conv.F32ConvertI32SignedInstruction.instance,
            UI32: Conv.F32ConvertI32UnsignedInstruction.instance,
            I64: Conv.F32ConvertI64SignedInstruction.instance,
            UI64: Conv.F32ConvertI64UnsignedInstruction.instance,
        }
    },
    F64: {
        Equal: Compare.F64EqualInstruction.instance,
        NotEqual: Compare.F64NotEqualInstruction.instance,
        Lesser: Compare.F64LesserInstruction.instance,
        LesserEqual: Compare.F64LesserEqualInstruction.instance,
        Greater: Compare.F64GreaterInstruction.instance,
        GreaterEqual: Compare.F64GreaterEqualInstruction.instance,
        Absolute: Unary.F64AbsoluteInstruction.instance,
        Negative: Unary.F64NegativeInstruction.instance,
        Ceil: Unary.F64CeilInstruction.instance,
        Floor: Unary.F64FloorInstruction.instance,
        Truncate: Unary.F64TruncateInstruction.instance,
        Nearest: Unary.F64NearestInstruction.instance,
        SquareRoot: Unary.F64SquareRootInstruction.instance,
        Add: Binary.F64AddInstruction.instance,
        Sub: Binary.F64SubtractInstruction.instance,
        Mul: Binary.F64MultiplyInstruction.instance,
        Div: Binary.F64DivideInstruction.instance,
        Min: Binary.F64MinInstruction.instance,
        Max: Binary.F64MaxInstruction.instance,
        CopySign: Binary.F64CopySignInstruction.instance,
        Promote: Conv.F64PromoteF32Instruction.instance,
        ReinterpretI64: Conv.F64ReinterpretI64Instruction.instance,
        Convert: {
            I32: Conv.F64ConvertI32SignedInstruction.instance,
            UI32: Conv.F64ConvertI32UnsignedInstruction.instance,
            I64: Conv.F64ConvertI64SignedInstruction.instance,
            UI64: Conv.F64ConvertI64UnsignedInstruction.instance,
        }
    }
}