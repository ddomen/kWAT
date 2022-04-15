import { TableInstruction } from "./TableInstruction";
import { OpCodes, OpCodesExt1 } from "../../OpCodes";
import type { ElementSegment } from "../../Sections";
import type { ExpressionDecodeContext, ExpressionEncodeContext } from "../Instruction";
import type { IDecoder, IEncoder } from "../../Encoding";

export class ElementDropInstruction extends TableInstruction<OpCodesExt1.elem_drop> {
    public Element: ElementSegment;
    public constructor(element: ElementSegment) {
        super(OpCodesExt1.elem_drop, null as any);
        this.Element = element;
    }
    public getElementIndex(context: ExpressionEncodeContext, pass?: boolean): number {
        let index = context.module.ElementSection.Elements.indexOf(this.Element);
        if(!pass && index < 0) { throw new Error('Table Init Instruction invalid element reference'); }
        return index;
    }
    public override encode(encoder: IEncoder, context: ExpressionEncodeContext): void {
        if (!context.options.bulkMemory) { throw new Error('Bulk memory instruction detected'); }
        let elem = this.getElementIndex(context);
        super.encode(encoder, context);
        encoder.uint32(elem);
    }
    public static override decode(decoder: IDecoder, context: ExpressionDecodeContext): ElementDropInstruction {
        let elem = decoder.uint32();
        if (!context.module.ElementSection.Elements[elem]) { throw new Error('Element Drop Instruction invalid element reference'); }
        return new ElementDropInstruction(context.module.ElementSection.Elements[elem]!);
    }
}
ElementDropInstruction.registerInstruction(OpCodes.op_extension_1, OpCodesExt1.elem_drop);