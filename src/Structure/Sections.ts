import { protect } from '../internal';
import { Expression, Instruction } from './Expression';
import { IEncoder, IDecoder, IEncodable } from './Encoder';
import * as Types from './Types';
import type { Module } from './Module';

export enum SectionTypes {
    custom           = 0x0,
    type             = 0x1,
    import           = 0x2,
    function         = 0x3,
    table            = 0x4,
    memory           = 0x5,
    global           = 0x6,
    export           = 0x7,
    start            = 0x8,
    element          = 0x9,
    code             = 0xa,
    data             = 0xb,
    dataCount        = 0xc,
}

export abstract class Section<S extends SectionTypes=SectionTypes> implements IEncodable<Module> {

    protected _precedence!: number;
    public readonly Type!: S;

    public get precedence(): number { return this._precedence; }

    protected constructor(type: S) {
        protect(this, 'Type', type, true);
        if (this.Type !== SectionTypes.custom) {
            let prec: SectionTypes = this.Type
            if (prec === SectionTypes.data) { prec = SectionTypes.dataCount; }
            else if (prec === SectionTypes.dataCount) { prec = SectionTypes.data; }
            protect(this, '_precedence' as any, prec, false);
        }
        else { this._precedence = SectionTypes.dataCount + 1; }
    }

    public encode(encoder: IEncoder, context: Module): void {
        let content = encoder.spawn();
        this.contentEncode(content, context);
        if (content.size) { encoder.uint8(this.Type).uint32(content.size).append(content); }
    }

    public abstract decode(decoder: IDecoder, context: Module): void;

    protected abstract contentEncode(encoder: IEncoder, context: Module): void;
}

export class TypeSection extends Section<SectionTypes.type> {

    public readonly Types!: Types.FunctionType[];

    public constructor() {
        super(SectionTypes.type);
        protect(this, 'Types', [], true);
    }

    public indexOf(type: Types.FunctionType): number {
        return this.Types.findIndex(f => f.equals(type));
    }

    public add(type: Types.FunctionType): boolean {
        if (!this.Types.some(t => t.equals(type))) {
            this.Types.push(type.clone())
            return true;
        }
        return false;
    }

    protected override contentEncode(encoder: IEncoder): void {
        if (!this.Types.length) { return; }
        encoder.vector(this.Types);
    }

    public decode(decoder: IDecoder): void {
        this.Types.length = 0;
        this.Types.push(...decoder.vector(Types.FunctionType));
    }
    
}

export class FunctionSection extends Section<SectionTypes.function> {

    public readonly Functions!: Types.FunctionType[];

    public constructor() {
        super(SectionTypes.function);
        protect(this, 'Functions', [], true);
    }

    public getIndices(context: Module, pass?: boolean): number[] {
        let indices = this.Functions.map(f => context.TypeSection.indexOf(f));
        let wrong;
        if (!pass && indices.some(i => (wrong = i, i < 0))) { throw new Error('Invalid function definition index (at: ' + wrong + ')'); }
        return indices;
    }

    public add(fn: Types.FunctionType): boolean {
        if (this.Functions.indexOf(fn) === -1) {
            this.Functions.push(fn);
            return true;
        }
        return false;
    }

    protected override contentEncode(encoder: IEncoder, context: Module): void {
        let idxs = this.getIndices(context);
        if (!idxs.length) { return; }
        encoder.vector(idxs, 'uint32');
    }

    public override decode(decoder: IDecoder, context: Module) {
        let idxs = decoder.vector('uint32'), wrong;
        if (idxs.some(id => (wrong = id, !context.TypeSection.Types[id]))) {
            throw new Error('Invalid index in type section: ' + wrong)
        }
        this.Functions.length = 0;
        this.Functions.push(...idxs.map(id => context.TypeSection.Types[id]!.clone()));
    }
}

export class TableSection extends Section<SectionTypes.table> {
    public readonly Tables!: Types.TableType[];

    public constructor() {
        super(SectionTypes.table);
        protect(this, 'Tables', [], true);
    }

    public override contentEncode(encoder: IEncoder): void {
        if (!this.Tables.length) { return; }
        encoder.vector(this.Tables);
    }

    public override decode(decoder: IDecoder) {
        this.Tables.length = 0;
        this.Tables.push(...decoder.vector(Types.TableType));
    }
}

export class MemorySection extends Section<SectionTypes.memory> {
    public readonly Memories!: Types.MemoryType[];

    public constructor() {
        super(SectionTypes.memory);
        protect(this, 'Memories', [], true);
    }

    public override contentEncode(encoder: IEncoder): void {
        if (!this.Memories.length) { return; }
        encoder.vector(this.Memories);
    }

    public override decode(decoder: IDecoder) {
        this.Memories.length = 0;
        this.Memories.push(...decoder.vector(Types.MemoryType));
    }
}

export class GlobalVariable implements IEncodable<Module> {
    public readonly Variable!: Types.GlobalType;
    public readonly Initialization!: Expression;

    constructor(type: Types.ValueType, init: Expression, constant: boolean = false) {
        protect(this, 'Variable', new Types.GlobalType(type, constant), true);
        protect(this, 'Initialization', init, true);
    }

    public encode(encoder: IEncoder, context: Module) {
        encoder.encode(this.Variable).encode(this.Initialization, context);
    }
    
    public static decode(decoder: IDecoder, context: Module): GlobalVariable {
        let type = decoder.decode(Types.GlobalType);
        return new GlobalVariable(
            type.Type,
            decoder.decode(Expression, context),
            type.Constant
        );
    }
}

export class GlobalSection extends Section<SectionTypes.global> {

    public readonly Globals!: GlobalVariable[];

    constructor() {
        super(SectionTypes.global);
        protect(this, 'Globals', [], true);
    }

    public override contentEncode(encoder: IEncoder, context: Module): void {
        if (!this.Globals.length) { return; }
        encoder.vector(this.Globals, context);
    }

    public override decode(decoder: IDecoder, context: Module) {
        this.Globals.length = 0;
        this.Globals.push(...decoder.vector(GlobalVariable, context));
    }
}

export class StartSection extends Section<SectionTypes.start> {

    public Target: Types.FunctionType | null;

    constructor() {
        super(SectionTypes.start);
        this.Target = null;
    }

    public getStartIndex(context: Module, pass?: boolean): number {
        if (!pass && !this.Target) { throw new Error('Invalid starting function index'); }
        if (!this.Target) { return -1; }
        let index = context.TypeSection.indexOf(this.Target);
        if (!pass && index < 0) { throw new Error('Invalid starting function index'); }
        return index;
    }

    public override contentEncode(encoder: IEncoder, context: Module): void {
        if (!this.Target) { return; }
        encoder.uint32(this.getStartIndex(context));
    }
    public override decode(decoder: IDecoder, context: Module) {
        let index = decoder.uint32();
        if (!context.TypeSection.Types[index]) {
            throw new Error('Start Section invalid function reference');
        }
        this.Target = context.TypeSection.Types[index]!;
    }
}

type ExchangeNarrower<R extends ImportDescription> = { Description: R };

export enum ExchangeDescriptionCode {
    type    = 0x00,
    table   = 0x01,
    memory  = 0x02,
    global  = 0x03
}
export type ImportDescription = Types.FunctionType | Types.TableType | Types.MemoryType | Types.GlobalType;
export class ImportSegment implements IEncodable<Types.FunctionType[]> {
    public Module: string;
    public Name: string;
    public Description: ImportDescription;

    public isFunction(): this is ExchangeNarrower<Types.FunctionType> {
        return this.Description instanceof Types.FunctionType;
    }
    public isTable(): this is ExchangeNarrower<Types.TableType> {
        return this.Description instanceof Types.TableType;
    }
    public isMemory(): this is ExchangeNarrower<Types.MemoryType> {
        return this.Description instanceof Types.LimitType;
    }
    public isGlobal(): this is ExchangeNarrower<Types.GlobalType> {
        return this.Description instanceof Types.GlobalType;
    }
    public get code(): ExchangeDescriptionCode {
        if (this.isTable()) { return ExchangeDescriptionCode.table}
        else if (this.isMemory()) { return ExchangeDescriptionCode.memory; }
        else if (this.isGlobal()) { return ExchangeDescriptionCode.global; }
        else if (this.isFunction()) { return ExchangeDescriptionCode.type; }
        return -1;
    }

    public constructor(moduleName: string, name: string, description: ImportDescription) {
        this.Module = moduleName;
        this.Name = name;
        this.Description = description;
    }
    
    public getIndex(context: Types.FunctionType[], pass?: boolean): number {
        if (!this.isFunction()) { throw new Error('Can not get index from a non-function reference!'); }
        let index = context.indexOf(this.Description);
        if (!pass && index < 0) { throw new Error('Invalid function definition index!') }
        return index;
    }

    public encode(encoder: IEncoder, context: Types.FunctionType[]) {
        if (this.isFunction()) {
            let index = this.getIndex(context);
            encoder
                .vector(this.Module)
                .vector(this.Name)
                .uint8(ExchangeDescriptionCode.type)
                .uint32(index)
            ;
        }
        else {
            let code = this.code;
            if (code < 0) { throw new Error('Invalid import description!'); }
            encoder
                .vector(this.Module)
                .vector(this.Name)
                .uint8(code)
                .encode(this.Description)
            ;
        }
    }

    public static decode(decoder: IDecoder, context: Module): ImportSegment {
        let mod = decoder.vector('utf8'),
            name = decoder.vector('utf8'),
            type = decoder.uint8(),
            desc;
        switch (type) {
            case ExchangeDescriptionCode.type: {
                let index = decoder.uint32();
                if (!context.TypeSection.Types[index]) {
                    throw new Error('Invalid Import Segment function reference');
                }
                desc = context.TypeSection.Types[index]!;
                break;
            }
            case ExchangeDescriptionCode.global:
                desc = decoder.decode(Types.GlobalType);
                break;
            case ExchangeDescriptionCode.memory:
                desc = decoder.decode(Types.LimitType);
                break;
            case ExchangeDescriptionCode.table:
                desc = decoder.decode(Types.TableType);
                break;
            default: throw new Error('Invalid Import Segment type: ' + type);
        }
        return new ImportSegment(mod, name, desc)
    }
}

export class ImportSection extends Section<SectionTypes.import> {

    public readonly Imports!: ImportSegment[];

    public constructor() {
        super(SectionTypes.import);
        protect(this, 'Imports', [], true);
    }

    protected contentEncode(encoder: IEncoder, context: Module): void {
        if (!this.Imports.length) { return; }
        if (this.Imports.filter(i => i.isFunction()).some(i => i.getIndex(context.TypeSection.Types) < 0 || i.code < 0)) {
            throw new Error('Invalid function definition index');
        }
        encoder.vector(this.Imports, context.TypeSection.Types);
    }

    public override decode(decoder: IDecoder, context: Module) {
        this.Imports.length = 0;
        this.Imports.push(...decoder.vector(ImportSegment, context));
    }

}

export type ExportDescription = Types.FunctionType | Types.TableType | Types.MemoryType | Types.GlobalType;
export class ExportSegment implements IEncodable<Module> {
    public Name: string;
    public Description: ExportDescription;

    public isFunction(): this is ExchangeNarrower<Types.FunctionType> {
        return this.Description instanceof Types.FunctionType;
    }
    public isTable(): this is ExchangeNarrower<Types.TableType> {
        return this.Description instanceof Types.TableType;
    }
    public isMemory(): this is ExchangeNarrower<Types.MemoryType> {
        return this.Description instanceof Types.LimitType;
    }
    public isGlobal(): this is ExchangeNarrower<Types.GlobalType> {
        return this.Description instanceof Types.GlobalType;
    }
    public get code(): ExchangeDescriptionCode {
        if (this.isTable()) { return ExchangeDescriptionCode.table}
        else if (this.isMemory()) { return ExchangeDescriptionCode.memory; }
        else if (this.isGlobal()) { return ExchangeDescriptionCode.global; }
        else if (this.isFunction()) { return ExchangeDescriptionCode.type; }
        return -1;
    }

    public constructor(name: string, description: ExportDescription) {
        this.Name = name;
        this.Description = description;
    }
    
    public getIndex(context: Module, pass?: boolean): number {
        let target;
        if (this.isFunction()) { target = context.TypeSection; }
        else if (this.isGlobal()) { target = context.GlobalSection.Globals; }
        else if (this.isMemory()) { target = context.MemorySection.Memories; }
        else if (this.isTable()) { target = context.TableSection.Tables; }
        else { throw new Error('Invalid Description type'); }
        let index = target.indexOf(this.Description as any);
        if (!pass && index < 0) { throw new Error('Invalid function definition index!') }
        return index;
    }

    public encode(encoder: IEncoder, context: Module) {
        let code = this.code;
        if (code < 0) { throw new Error('Invalid export description!'); }
        let index = this.getIndex(context);
        encoder
            .vector(this.Name)
            .uint8(code)
            .uint32(index);
    }

    public static decode(decoder: IDecoder, context: Module): ExportSegment {
        let name = decoder.vector('utf8'),
            code = decoder.uint8(),
            index = decoder.uint32(),
            target;
        switch (code) {
            case ExchangeDescriptionCode.type:
                target = context.TypeSection.Types;
                break;
            case ExchangeDescriptionCode.global:
                target = context.GlobalSection.Globals.map(g => g.Variable);
                break;
            case ExchangeDescriptionCode.memory:
                target = context.MemorySection.Memories;
                break;
            case ExchangeDescriptionCode.table:
                target = context.TableSection.Tables;
                break;
            default: throw new Error('Export Segment invalid description code');
        }
        if (!target[index]) { throw new Error('Export Segment invalid reference'); }
        return new ExportSegment(name, target[index]!)
    }
}

export class ExportSection extends Section<SectionTypes.export> {

    public readonly Exports!: ExportSegment[];

    public constructor() {
        super(SectionTypes.export);
        protect(this, 'Exports', [], true);
    }

    public add(segment: ExportSegment) {
        if (this.Exports.some(e => e.Name == segment.Name)) {
            return false;
        }
        this.Exports.push(segment);
        return true;
    }

    protected contentEncode(encoder: IEncoder, context: Module) {
        if (!this.Exports.length) { return; }
        if (this.Exports.some(i => i.getIndex(context) < 0)) {
            throw new Error('Invalid function definition index');
        }
        encoder.vector(this.Exports, context);
    }

    public override decode(decoder: IDecoder, context: Module) {
        this.Exports.length = 0;
        this.Exports.push(...decoder.vector(ExportSegment, context));
    }

}

export enum ElementTypes {
    ActiveKind                  = 0x00,
    DeclarativeKind             = 0x01,
    ActiveKindTable             = 0x02,
    PassiveKind                 = 0x03,
    ActiveType                  = 0x04,
    DeclarativeType             = 0x05,
    ActiveTypeTable             = 0x06,
    PassiveType                 = 0x07,

    Max = PassiveType
}

export enum ElementKinds {
    funcref     = 0x00
} 

export class ElementSegment implements IEncodable<Module> {
    public Type: ElementTypes;
    public Kind: ElementKinds | null;

    public Table: Types.TableType | null;
    public Expression: Expression | null;
    public Reference: Types.ReferenceType | null;
    public readonly Functions!: Types.FunctionType[];
    public readonly Initialization!: Expression[];

    public constructor() {
        this.Type = ElementTypes.ActiveKind;
        this.Kind = null;
        this.Table = null;
        this.Expression = null;
        this.Reference = null;
        protect(this, 'Functions', [], true)
        protect(this, 'Initialization', [], true)
    }

    public get isActive(): boolean { return !(this.Type & 0x01); }
    public set isActive(value: boolean) { value ? (this.Type &= 0x06) : (this.Type |= 0x01); }
    
    public get isPassive(): boolean { return !!(this.Type & 0x03); }
    public set isPassive(value: boolean) {
        if (value) { this.Type |= 0x03; }
        else if (this.isDeclarative) { this.Type &= 0x05; }
    }

    public get isDeclarative(): boolean { return !!(this.Type & 0x01) && !(this.Type & 0x02); }
    public set isDeclarative(value: boolean) { 
        if (value) { this.Type |= 0x01; this.Type &= 0x05; }
        else if (this.isPassive) { this.Type |= 0x02; }
    }

    public get hasExplicitTable(): boolean { return this.isActive && !!(this.Type & 0x02) }
    public get usesElementKind(): boolean { return !this.usesElementType; }
    public get usesElementType(): boolean { return !!(this.Type & 0x04); }

    public getFunctionIndices(context: Module, pass?: boolean): number[] {
        let idxs = this.Functions.map(f => context.FunctionSection.Functions.indexOf(f));
        let wrong;
        if (!pass && idxs.some(i => (wrong = i, i < 0))) { throw new Error('Invalid function definition index (at: ' + wrong + ')') }
        return idxs;
    }
    public getTableIndex(context: Module, pass?: boolean): number {
        if (!pass && !this.Table) { throw new Error('Invalid ElementSegment Table reference'); }
        if (!this.Table) { return -1; }
        let idx = context.TableSection.Tables.indexOf(this.Table);
        if (!pass && idx < 0) { throw new Error('Invalid ElementSegment Table reference'); }
        return idx;
    }

    public encode(encoder: IEncoder, context: Module): void {
        if (this.Type > ElementTypes.Max || this.Type < 0) {
            throw new Error('Invalid Element Segment type [0x00, 0x07]: ' + this.Type);
        }
        encoder.uint8(this.Type);
        let idxs, tid;
        switch (this.Type) {
            case ElementTypes.ActiveKind:
                if (!this.Expression || !this.Functions.length) { throw new Error('Invalid ElementSegment[ActiveKind]'); }
                idxs = this.getFunctionIndices(context);
                encoder
                    .encode(this.Expression, context)
                    .vector(idxs, 'uint32');
                break;
            case ElementTypes.DeclarativeKind:
                if (this.Kind === null || !this.Functions.length) { throw new Error('Invalid ElementSegment[DeclarativeKind]'); }
                idxs = this.getFunctionIndices(context);
                encoder
                    .uint8(this.Kind)
                    .vector(idxs, 'uint32');
                break;
            case ElementTypes.ActiveKindTable:
                if (!this.Expression || !this.Table || this.Kind === null || !this.Functions.length) { throw new Error('Invalid ElementSegment[ActiveKindTable]'); }
                tid = this.getTableIndex(context)
                idxs = this.getFunctionIndices(context);
                encoder
                    .uint32(tid)
                    .encode(this.Expression, context)
                    .uint8(this.Kind)
                    .vector(idxs, 'uint32')
                ;
                break;
            case ElementTypes.PassiveKind:
                if (this.Kind === null || !this.Functions.length) { throw new Error('Invalid ElementSegment[PassiveKind]'); }
                idxs = this.getFunctionIndices(context);
                encoder.uint8(this.Kind).vector(idxs, 'uint32');
                break;
            case ElementTypes.ActiveType:
                if (!this.Expression || !this.Initialization.length) { throw new Error('Invalid ElementSegment[ActiveType]'); }
                encoder.encode(this.Expression, context).vector(this.Initialization, context);
                break;
            case ElementTypes.DeclarativeType:
                if (!this.Reference || !this.Initialization.length) { throw new Error('Invalid ElementSegment[DeclarativeType]'); }
                encoder.uint8(this.Reference).vector(this.Initialization, context);
                break;
            case ElementTypes.ActiveTypeTable:
                if (!this.Table || !this.Expression || !this.Reference || !this.Initialization.length) { throw new Error('Invalid ElementSegment[ActiveTypeTable]'); }
                tid = this.getTableIndex(context);
                encoder
                    .uint32(tid)
                    .encode(this.Expression, context)
                    .uint8(this.Reference)
                    .vector(this.Initialization, context)
                ;
                break;
            case ElementTypes.PassiveType:
                if (!this.Reference || !this.Initialization.length) { throw new Error('Invalid ElementSegment[PassiveType]'); }
                encoder.uint8(this.Reference).vector(this.Initialization, context);
                break;
            default: throw new Error('Invalid ElementSegment Type: ' + this.Type)
        }
    }

    public static decode(decoder: IDecoder, context: Module): ElementSegment {
        let type = decoder.uint8();
        let idxs, tid;
        let segment = new ElementSegment();
        switch (type) {
            case ElementTypes.ActiveKind:
                segment.Expression = decoder.decode(Expression, context);
                idxs = decoder.vector('uint32');
                segment.Functions.push(...idxs.map(id => context.FunctionSection.Functions[id]!));
                if (segment.Functions.some(f => !f)) {
                    throw new Error('Invalid Element Segment function reference');
                }
                break;
            case ElementTypes.DeclarativeKind:
                segment.Kind = decoder.uint8();
                idxs = decoder.vector('uint32');
                segment.Functions.push(...idxs.map(id => context.FunctionSection.Functions[id]!));
                if (segment.Functions.some(f => !f)) {
                    throw new Error('Invalid Element Segment function reference');
                }
                break;
            case ElementTypes.ActiveKindTable:
                tid = decoder.uint32();
                segment.Expression = decoder.decode(Expression, context);
                segment.Kind = decoder.uint8();
                idxs = decoder.vector('uint32');
                if (!context.TableSection.Tables[tid]) {
                    throw new Error('Invalid Element Segment table reference');
                }
                segment.Table = context.TableSection.Tables[tid]!;
                segment.Functions.push(...idxs.map(id => context.FunctionSection.Functions[id]!));
                if (segment.Functions.some(f => !f)) {
                    throw new Error('Invalid Element Segment function reference');
                }
                break;
            case ElementTypes.PassiveKind:
                segment.Kind = decoder.uint8();
                idxs = decoder.vector('uint32');
                segment.Functions.push(...idxs.map(id => context.FunctionSection.Functions[id]!));
                if (segment.Functions.some(f => !f)) {
                    throw new Error('Invalid Element Segment function reference');
                }
                break;
            case ElementTypes.ActiveType:
                segment.Expression = decoder.decode(Expression, context);
                segment.Initialization.push(...decoder.vector(Expression, context));
                break;
            case ElementTypes.DeclarativeType:
                segment.Reference = decoder.uint8();
                segment.Initialization.push(...decoder.vector(Expression, context));
                break;
            case ElementTypes.ActiveTypeTable:
                tid = decoder.uint32();
                if (!context.TableSection.Tables[tid]) {
                    throw new Error('Invalid Element Segment table reference');
                }
                segment.Table = context.TableSection.Tables[tid]!;
                segment.Expression = decoder.decode(Expression, context);
                segment.Reference = decoder.uint8();
                segment.Initialization.push(...decoder.vector(Expression, context));
                break;
            case ElementTypes.PassiveType:
                segment.Reference = decoder.uint8();
                segment.Initialization.push(...decoder.vector(Expression, context));
                break;
            default: throw new Error('Invalid ElementSegment Type: ' + type)
        }
        return segment;
    }
}

export class ElementSection extends Section<SectionTypes.element> {

    public readonly Elements!: ElementSegment[];

    public constructor() {
        super(SectionTypes.element);
        protect(this, 'Elements', [], true);
    }

    public override contentEncode(encoder: IEncoder, context: Module): void {
        if (!this.Elements.length) { return; }
        encoder.vector(this.Elements, context);
    }

    public decode(decoder: IDecoder, context: Module): void {
        this.Elements.length = 0;
        this.Elements.push(...decoder.vector(ElementSegment, context));
    }
}

export enum DataSegmentKind {
    active          = 0x00,
    passive         = 0x01,
    activeExplicit  = 0x02
}
export class DataSegment implements IEncodable<Module> {

    public Kind: DataSegmentKind;
    public Memory: Types.MemoryType | null;
    public Expression: Expression | null;
    public readonly Bytes!: number[];

    public get isActive(): boolean { return !(this.Kind & 0x01); }
    public get isExplicit(): boolean { return !!(this.Kind & 0x02); }

    constructor(kind: DataSegmentKind) {
        this.Kind = kind;
        this.Memory = null;
        this.Expression = null;
        protect(this, 'Bytes', [], true);
    }

    public getMemoryIndex(context: Module, pass?: boolean): number {
        if (!pass && !this.Memory) { throw new Error('Invalid DataSegment Memory reference'); }
        if (!this.Memory) { return -1; }
        let idx = context.MemorySection.Memories.indexOf(this.Memory);
        if (!pass && idx < 0) { throw new Error('Invalid DataSegment Memory reference'); }
        return idx;
    }

    public encode(encoder: IEncoder, context: Module): void {
        if (this.Kind < 0 || this.Kind > DataSegmentKind.activeExplicit) {
            throw new Error('Invalid DataSegment kind: ' + this.Kind);
        }
        let idx;
        if (!this.Bytes) { throw new Error('Invalid DataSegment: missing data')}
        encoder.uint8(this.Kind);
        switch (this.Kind) {
            case DataSegmentKind.active:
                if (!this.Expression) { throw new Error('Invalid DataSegment[Active]'); }
                encoder.encode(this.Expression, context);
                break;
            case DataSegmentKind.passive: break;
            case DataSegmentKind.activeExplicit:
                if (!this.Memory || !this.Expression) { throw new Error('Invalid DataSegment[ActiveExplicit]'); }
                idx = this.getMemoryIndex(context)
                encoder.uint32(idx).encode(this.Expression, context);
                break;
            default: throw new Error('Invalid DataSegment kind: ' + this.Kind);
        }
        encoder.append(this.Bytes);
    }

    public static decode(decoder: IDecoder, context: Module): DataSegment {
        let kind = decoder.uint8();
        let segment = new DataSegment(kind);
        switch (kind) {
            case DataSegmentKind.active:
                segment.Expression = decoder.decode(Expression, context);
                break;
            case DataSegmentKind.passive: break;
            case DataSegmentKind.activeExplicit: {
                let idx = decoder.uint32();
                if (!context.MemorySection.Memories[idx]) {
                    throw new Error('Invalid Data Segment memory reference');
                }
                segment.Memory = context.MemorySection.Memories[idx]!;
                segment.Expression = decoder.decode(Expression, context);
                break;
            }
            default: throw new Error('Invalid DataSegment kind: ' + kind);
        }
        segment.Bytes.push(...decoder.read(decoder.remaining));
        return segment;
    }
}

export class DataSection extends Section<SectionTypes.data> {

    public readonly Datas!: DataSegment[];

    public constructor() {
        super(SectionTypes.data);
        protect(this, 'Datas', [], true);
    }

    protected contentEncode(encoder: IEncoder, context: Module): void {
        if (!this.Datas.length) { return; }
        encoder.vector(this.Datas, context);
    }

    public decode(decoder: IDecoder, context: Module): void {
        this.Datas.length = 0;
        this.Datas.push(...decoder.vector(DataSegment, context));
    }
}

export class DataCountSection extends Section<SectionTypes.dataCount> {

    public constructor() { super(SectionTypes.dataCount); }

    protected contentEncode(encoder: IEncoder, context: Module): void {
        if (!context.DataSection.Datas.length) { return; }
        encoder.uint32(context.DataSection.Datas.length);
    }
    public override decode(): void { }
}

export class CustomSection extends Section<SectionTypes.custom> {
    public Name: string;
    public readonly Bytes!: number[];

    public override set precedence(value: number) { this._precedence = value; }

    public constructor() {
        super(SectionTypes.custom);
        this.Name = '';
        protect(this, 'Bytes', [], true);
    }

    public after(type: SectionTypes | Section<any>): this {
        return this.like(type, 0.1);
    }
    public before(type: SectionTypes | Section<any>): this {
        return this.like(type, -0.1);
    }
    public like(type: SectionTypes | Section<any>, offset: number = 0): this {
        if (typeof(type) === 'number') {
            if (type === SectionTypes.data) { type = SectionTypes.dataCount; }
            else if (type === SectionTypes.dataCount) { type = SectionTypes.dataCount; }
            this._precedence = type + offset;
        }
        else { this._precedence = type.precedence + offset; }
        return this;
    }

    protected contentEncode(encoder: IEncoder): void {
        if (typeof(this.Name) !== 'string' || !this.Name) { throw new Error('Invalid Custom Section name: \'' + this.Name + '\'')}
        encoder
            .vector(this.Name)
            .append(this.Bytes);
    }

    public decode(decoder: IDecoder): void {
        this.Name = decoder.vector('utf8');
        this.Bytes.length = 0;
        this.Bytes.push(...decoder.read(decoder.remaining));
    }

}


export class CodeSegment implements IEncodable<Module> {

    public Signature: Types.FunctionType;
    public readonly Body!: Expression;
    public readonly Locals!: Types.ValueType[];

    public constructor(signature: Types.FunctionType, body: Instruction[]=[], locals: Types.ValueType[] = []) {
        this.Signature = signature;
        protect(this, 'Body', new Expression(body), true);
        protect(this, 'Locals', locals.slice(), true);
    }

    public encode(encoder: IEncoder, context: Module): void {
        let e = encoder.spawn();
        let l = this.Locals.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), { } as { [key: number]: number });
        e.uint32(Object.keys(l).length);
        for (let k in l) { e.uint32(l[k]!).uint8(parseInt(k)); }
        e.encode(this.Body, context);
        encoder.uint32(e.size).append(e);
    }

    public static decode(decoder: IDecoder, context: { module: Module, index: number }): CodeSegment {
        if (!context.module.FunctionSection.Functions[context.index]) {
            throw new Error('Invalid Code Segment function reference');
        }
        if (decoder.uint32() != decoder.remaining) {
            throw new Error('Invalid Code Segment body length');
        }
        let nLocals = decoder.uint32();
        let locals: Types.Type[] = [], n, l;
        for (let i = 0; i < nLocals; ++i) {
            n = decoder.uint32();
            for (let j = 0; j < n; ++j) {
                l = decoder.uint8();
                if (!(l in Types.Type)) { throw new Error('Invalid Code Segment Local Type'); }
                locals.push(l);
            }
        }
        let body = decoder.decode(Expression, context.module);
        return new CodeSegment(
            context.module.FunctionSection.Functions[context.index++]!,
            body.Instructions, locals as any[]
        );
    }
}

export class CodeSection extends Section<SectionTypes.code> {
    public readonly Codes!: CodeSegment[];
    public constructor() {
        super(SectionTypes.code);
        protect(this, 'Codes', [], true);
    }

    public add(segment: CodeSegment): boolean;
    public add(signature: Types.FunctionType, body?: Instruction[], locals?: Types.ValueType[]): boolean
    public add(segment: Types.FunctionType | CodeSegment, body: Instruction[]=[], locals: Types.ValueType[]=[]): boolean {
        if (segment instanceof Types.FunctionType) { segment = new CodeSegment(segment, body, locals); }
        if (!(segment instanceof CodeSegment)) { throw new Error('Invalid Code Segment pushed'); }
        if (this.Codes.some(cs => cs.Signature === (segment as CodeSegment).Signature)) { return false; }
        this.Codes.push(segment);
        return true;
    }
    
    public contentEncode(encoder: IEncoder, context: Module): void {
        if (
            this.Codes.length != context.FunctionSection.Functions.length ||
            this.Codes.some((cs, i) => cs.Signature != context.FunctionSection.Functions[i])
        ) { throw new Error('Code Section does not correspond to Function Section!'); }
        encoder.vector(this.Codes, context);
    }

    public decode(decoder: IDecoder, context: Module): void {
        this.Codes.length = 0;
        this.Codes.push(...decoder.vector(CodeSegment, { index: 0, module: context }))
    }
}