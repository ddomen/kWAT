import { protect } from '../internal';
import { Expression, Instruction } from './Expression';
import { IEncoder, IDecoder, IEncodable } from './Encoder';
import * as Types from './Types';
import type { Module, WasmOptions } from './Module';

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

export abstract class Section<S extends SectionTypes=SectionTypes> implements IEncodable<[Module, WasmOptions]> {

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

    public encode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        let content = encoder.spawn();
        this.contentEncode(content, mod, opts);
        if (content.size) { encoder.uint8(this.Type).uint32(content.size).append(content); }
    }

    public abstract decode(decoder: IDecoder, mod: Module): void;

    protected abstract contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void;
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

    
    public import(type: Types.FunctionType): boolean {
        return this.add(type);
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

    public getIndices(mod: Module, pass?: boolean): number[] {
        let indices = this.Functions.map(f => mod.TypeSection.indexOf(f));
        let wrong;
        if (!pass && indices.some(i => (wrong = i, i < 0))) { throw new Error('Invalid function definition index (at: ' + wrong + ')'); }
        return indices;
    }

    public indexOf(fn: Types.FunctionType): number { return this.Functions.findIndex(f => f.equals(fn)); }

    public add(fn: Types.FunctionType): boolean {
        if (this.Functions.indexOf(fn) === -1) { this.Functions.push(fn); return true; }
        return false;
    }

    public import(fn: Types.FunctionType): boolean {
        return this.add(fn);
    }

    protected override contentEncode(encoder: IEncoder, mod: Module): void {
        let idxs = this.getIndices(mod);
        if (!idxs.length) { return; }
        encoder.vector(idxs, 'uint32');
    }

    public override decode(decoder: IDecoder, mod: Module) {
        let idxs = decoder.vector('uint32'), wrong;
        if (idxs.some(id => (wrong = id, !mod.TypeSection.Types[id]))) {
            throw new Error('Invalid index in type section: ' + wrong)
        }
        this.Functions.length = 0;
        this.Functions.push(...idxs.map(id => mod.TypeSection.Types[id]!.clone()));
    }
}

export class TableSection extends Section<SectionTypes.table> {
    public readonly Tables!: Types.TableType[];

    public constructor() {
        super(SectionTypes.table);
        protect(this, 'Tables', [], true);
    }
    
    public import(table: Types.TableType): boolean {
        if (this.Tables.indexOf(table) == -1){
            this.Tables.unshift(table);
            return true;
        }
        return false;
    }

    public override contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (!this.Tables.length) { return; }
        if (!opts.multipleTables) {
            let tabs = this.Tables;
            tabs.push(
                ...mod.ImportSection.Imports
                    .map(i => i.isTable() ? i.Description : null!)
                    .filter(x => !!x)    
            );
            if (tabs.length > 1) { throw new Error('Multiple table declaration detected'); }
        }
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

    public add(memory: Types.MemoryType): boolean {
        if (this.Memories.indexOf(memory) == -1) {
            this.Memories.unshift(memory);
            return true;
        }
        return false;
    }

    public import(memory: Types.MemoryType): boolean {
        return this.add(memory);
    }

    public override contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (!this.Memories.length) { return; }
        if (!opts.multipleMemory) {
            let mem = this.Memories;
            mem.push(
                ...mod.ImportSection.Imports
                    .map(i => i.isMemory() ? i.Description : null!)
                    .filter(x => !!x)
            );
            if (mem.length > 1) { throw new Error('Multiple memory declaration detected'); }
        }
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
    public Reference: string;

    public get isReference(): boolean { return this.Variable === -1 as any && !!this.Reference && !this.Initialization; }

    constructor(type: Types.ValueType, init: Expression, constant: boolean = false, reference?: string) {
        protect(this, 'Variable', new Types.GlobalType(type, constant), true);
        protect(this, 'Initialization', init, true);
        this.Reference = reference || '';
    }

    public referred(other: GlobalVariable | string): boolean {
        if (other instanceof GlobalVariable) { return other.isReference && this.Reference === other.Reference; }
        return this.Reference === other;
    }
    public refer(other: GlobalVariable | string): boolean {
        return this.isReference && (other instanceof GlobalVariable ? other.Reference : other) === other;
    }

    public encode(encoder: IEncoder, mod: Module) {
        encoder.encode(this.Variable).encode(this.Initialization, mod);
    }
    
    public static decode(decoder: IDecoder, mod: Module): GlobalVariable {
        let type = decoder.decode(Types.GlobalType);
        return new GlobalVariable(
            type.Type,
            decoder.decode(Expression, mod),
            type.Constant
        );
    }

    public static refer(name: string): GlobalVariable {
        return new GlobalVariable(-1, null as any, false, name);
    }
}

export class GlobalSection extends Section<SectionTypes.global> {

    public readonly Globals!: GlobalVariable[];

    constructor() {
        super(SectionTypes.global);
        protect(this, 'Globals', [], true);
    }

    public indexOf(variable: GlobalVariable): number {
        if (variable.isReference) { return this.Globals.findIndex(g => g === variable || variable.refer(g)); }
        return this.Globals.indexOf(variable);
    }

    public add(variable: GlobalVariable): boolean {
        if (!variable.isReference && this.Globals.indexOf(variable) === -1) {
            this.Globals.push(variable);
            return true;
        }
        return false;
    }

    public import(variable: GlobalVariable): boolean {
        if (!variable.isReference && this.Globals.indexOf(variable) === -1) {
            this.Globals.unshift(variable);
            return true;
        }
        return false;
    }

    public override contentEncode(encoder: IEncoder, mod: Module): void {
        if (!this.Globals.length) { return; }
        encoder.vector(this.Globals, mod);
    }


    public override decode(decoder: IDecoder, mod: Module) {
        this.Globals.length = 0;
        this.Globals.push(...decoder.vector(GlobalVariable, mod));
    }
}

export class StartSection extends Section<SectionTypes.start> {

    public Target: Types.FunctionType | null;

    constructor() {
        super(SectionTypes.start);
        this.Target = null;
    }

    public getStartIndex(mod: Module, pass?: boolean): number {
        if (!pass && !this.Target) { throw new Error('Invalid starting function index'); }
        if (!this.Target) { return -1; }
        let index = mod.TypeSection.indexOf(this.Target);
        if (!pass && index < 0) { throw new Error('Invalid starting function index'); }
        return index;
    }

    public override contentEncode(encoder: IEncoder, mod: Module): void {
        if (!this.Target) { return; }
        encoder.uint32(this.getStartIndex(mod));
    }
    public override decode(decoder: IDecoder, mod: Module) {
        let index = decoder.uint32();
        if (!mod.TypeSection.Types[index]) {
            throw new Error('Start Section invalid function reference');
        }
        this.Target = mod.TypeSection.Types[index]!;
    }
}

type ExchangeNarrower<R extends ImportDescription> = { Description: R };

export enum ExchangeDescriptionCode {
    function    = 0x00,
    table   = 0x01,
    memory  = 0x02,
    global  = 0x03
}
export type ImportDescription = Types.FunctionType | Types.TableType | Types.MemoryType | Types.GlobalType;
export class ImportSegment implements IEncodable<[Types.FunctionType[]]> {
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
        if (this.isTable()) { return ExchangeDescriptionCode.table; }
        else if (this.isMemory()) { return ExchangeDescriptionCode.memory; }
        else if (this.isGlobal()) { return ExchangeDescriptionCode.global; }
        else if (this.isFunction()) { return ExchangeDescriptionCode.function; }
        return -1;
    }

    public constructor(moduleName: string, name: string, description: ImportDescription) {
        this.Module = moduleName;
        this.Name = name;
        this.Description = description;
    }
    
    public getIndex(context: Types.FunctionType[], pass?: boolean): number {
        if (!this.isFunction()) { throw new Error('Can not get index from a non-function reference!'); }
        let index = context.findIndex(x => x.equals(this.Description as Types.FunctionType));
        if (!pass && index < 0) { throw new Error('Invalid function definition index!') }
        return index;
    }

    public equals(other: ImportSegment): boolean {
        return this.Name == other.Name &&
                this.Module == other.Module &&
                this.Description.equals(other.Description)
    }

    public clone(): ImportSegment { return new ImportSegment(this.Module, this.Name, this.Description); }

    public encode(encoder: IEncoder, context: Types.FunctionType[]) {
        if (this.isFunction()) {
            let index = this.getIndex(context);
            encoder
                .vector(this.Module)
                .vector(this.Name)
                .uint8(ExchangeDescriptionCode.function)
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

    public static decode(decoder: IDecoder, mod: Module): ImportSegment {
        let ns = decoder.vector('utf8'),
            name = decoder.vector('utf8'),
            type = decoder.uint8(),
            desc;
        switch (type) {
            case ExchangeDescriptionCode.function: {
                let index = decoder.uint32();
                if (!mod.TypeSection.Types[index]) {
                    throw new Error('Invalid Import Segment function reference');
                }
                desc = mod.TypeSection.Types[index]!;
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
        return new ImportSegment(ns, name, desc)
    }
}

export class ImportSection extends Section<SectionTypes.import> {

    public readonly Imports!: ImportSegment[];

    public constructor() {
        super(SectionTypes.import);
        protect(this, 'Imports', [], true);
    }

    public indexOf(target: Types.FunctionType): number {
        return this.Imports.findIndex(i => i.isFunction() && i.Description.equals(target))
    }

    protected contentEncode(encoder: IEncoder, mod: Module): void {
        if (!this.Imports.length) { return; }
        if (this.Imports.filter(i => i.isFunction()).some(i => mod.TypeSection.indexOf(i.Description as Types.FunctionType) < 0 || i.code < 0)) {
            throw new Error('Invalid function definition index');
        }
        encoder.vector(this.Imports, mod.TypeSection.Types);
    }

    public add(segment: ImportSegment, context?: Module): boolean {
        if (this.Imports.find(s => s.equals(segment))) {
            return false;
        }
        this.Imports.push(segment.clone());
        if (context) {
            let target;
            switch (segment.code) {
                case ExchangeDescriptionCode.function: target = context.TypeSection; break
                case ExchangeDescriptionCode.global: target = context.GlobalSection; break
                case ExchangeDescriptionCode.memory: target = context.MemorySection; break
                case ExchangeDescriptionCode.table: target = context.TableSection; break
            }
            target.import(segment.Description as any);
        }
        return true;
    }

    public override decode(decoder: IDecoder, mod: Module) {
        this.Imports.length = 0;
        this.Imports.push(...decoder.vector(ImportSegment, mod));
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
        else if (this.isFunction()) { return ExchangeDescriptionCode.function; }
        return -1;
    }

    public constructor(name: string, description: ExportDescription) {
        this.Name = name;
        this.Description = description;
    }
    
    public getIndex(mod: Module, pass?: boolean): number {
        let target;
        if (this.isFunction()) { target = mod.TypeSection; }
        else if (this.isGlobal()) { target = mod.GlobalSection.Globals; }
        else if (this.isMemory()) { target = mod.MemorySection.Memories; }
        else if (this.isTable()) { target = mod.TableSection.Tables; }
        else { throw new Error('Invalid Description type'); }
        let index = target.indexOf(this.Description as any);
        if (!pass && index < 0) { throw new Error('Invalid function definition index!') }
        return index;
    }

    public encode(encoder: IEncoder, mod: Module) {
        let code = this.code;
        if (code < 0) { throw new Error('Invalid export description!'); }
        let index = this.getIndex(mod);
        encoder
            .vector(this.Name)
            .uint8(code)
            .uint32(index);
    }

    public static decode(decoder: IDecoder, mod: Module): ExportSegment {
        let name = decoder.vector('utf8'),
            code = decoder.uint8(),
            index = decoder.uint32(),
            target;
        switch (code) {
            case ExchangeDescriptionCode.function:
                target = mod.TypeSection.Types;
                break;
            case ExchangeDescriptionCode.global:
                target = mod.GlobalSection.Globals.map(g => g.Variable);
                break;
            case ExchangeDescriptionCode.memory:
                target = mod.MemorySection.Memories;
                break;
            case ExchangeDescriptionCode.table:
                target = mod.TableSection.Tables;
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

    public add(segment: ExportSegment): boolean {
        if (this.Exports.some(e => e.Name == segment.Name)) {
            return false;
        }
        this.Exports.push(segment);
        return true;
    }

    protected contentEncode(encoder: IEncoder, mod: Module) {
        if (!this.Exports.length) { return; }
        if (this.Exports.some(i => i.getIndex(mod) < 0)) {
            throw new Error('Invalid function definition index');
        }
        encoder.vector(this.Exports, mod);
    }

    public override decode(decoder: IDecoder, mod: Module) {
        this.Exports.length = 0;
        this.Exports.push(...decoder.vector(ExportSegment, mod));
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

    public getFunctionIndices(mod: Module, pass?: boolean): number[] {
        let idxs = this.Functions.map(f => mod.FunctionSection.indexOf(f));
        let wrong;
        if (!pass && idxs.some(i => (wrong = i, i < 0))) { throw new Error('Invalid function definition index (at: ' + wrong + ')') }
        return idxs;
    }
    public getTableIndex(mod: Module, pass?: boolean): number {
        if (!pass && !this.Table) { throw new Error('Invalid ElementSegment Table reference'); }
        if (!this.Table) { return -1; }
        let idx = mod.TableSection.Tables.indexOf(this.Table);
        if (!pass && idx < 0) { throw new Error('Invalid ElementSegment Table reference'); }
        return idx;
    }

    public encode(encoder: IEncoder, mod: Module): void {
        if (this.Type > ElementTypes.Max || this.Type < 0) {
            throw new Error('Invalid Element Segment type [0x00, 0x07]: ' + this.Type);
        }
        encoder.uint8(this.Type);
        let idxs, tid;
        switch (this.Type) {
            case ElementTypes.ActiveKind:
                if (!this.Expression || !this.Functions.length) { throw new Error('Invalid ElementSegment[ActiveKind]'); }
                idxs = this.getFunctionIndices(mod);
                encoder
                    .encode(this.Expression, mod)
                    .vector(idxs, 'uint32');
                break;
            case ElementTypes.DeclarativeKind:
                if (this.Kind === null || !this.Functions.length) { throw new Error('Invalid ElementSegment[DeclarativeKind]'); }
                idxs = this.getFunctionIndices(mod);
                encoder
                    .uint8(this.Kind)
                    .vector(idxs, 'uint32');
                break;
            case ElementTypes.ActiveKindTable:
                if (!this.Expression || !this.Table || this.Kind === null || !this.Functions.length) { throw new Error('Invalid ElementSegment[ActiveKindTable]'); }
                tid = this.getTableIndex(mod)
                idxs = this.getFunctionIndices(mod);
                encoder
                    .uint32(tid)
                    .encode(this.Expression, mod)
                    .uint8(this.Kind)
                    .vector(idxs, 'uint32')
                ;
                break;
            case ElementTypes.PassiveKind:
                if (this.Kind === null || !this.Functions.length) { throw new Error('Invalid ElementSegment[PassiveKind]'); }
                idxs = this.getFunctionIndices(mod);
                encoder.uint8(this.Kind).vector(idxs, 'uint32');
                break;
            case ElementTypes.ActiveType:
                if (!this.Expression || !this.Initialization.length) { throw new Error('Invalid ElementSegment[ActiveType]'); }
                encoder.encode(this.Expression, mod).vector(this.Initialization, mod);
                break;
            case ElementTypes.DeclarativeType:
                if (!this.Reference || !this.Initialization.length) { throw new Error('Invalid ElementSegment[DeclarativeType]'); }
                encoder.uint8(this.Reference).vector(this.Initialization, mod);
                break;
            case ElementTypes.ActiveTypeTable:
                if (!this.Table || !this.Expression || !this.Reference || !this.Initialization.length) { throw new Error('Invalid ElementSegment[ActiveTypeTable]'); }
                tid = this.getTableIndex(mod);
                encoder
                    .uint32(tid)
                    .encode(this.Expression, mod)
                    .uint8(this.Reference)
                    .vector(this.Initialization, mod)
                ;
                break;
            case ElementTypes.PassiveType:
                if (!this.Reference || !this.Initialization.length) { throw new Error('Invalid ElementSegment[PassiveType]'); }
                encoder.uint8(this.Reference).vector(this.Initialization, mod);
                break;
            default: throw new Error('Invalid ElementSegment Type: ' + this.Type)
        }
    }

    public static decode(decoder: IDecoder, mod: Module): ElementSegment {
        let type = decoder.uint8();
        let idxs, tid;
        let segment = new ElementSegment();
        switch (type) {
            case ElementTypes.ActiveKind:
                segment.Expression = decoder.decode(Expression, mod);
                idxs = decoder.vector('uint32');
                segment.Functions.push(...idxs.map(id => mod.FunctionSection.Functions[id]!));
                if (segment.Functions.some(f => !f)) {
                    throw new Error('Invalid Element Segment function reference');
                }
                break;
            case ElementTypes.DeclarativeKind:
                segment.Kind = decoder.uint8();
                idxs = decoder.vector('uint32');
                segment.Functions.push(...idxs.map(id => mod.FunctionSection.Functions[id]!));
                if (segment.Functions.some(f => !f)) {
                    throw new Error('Invalid Element Segment function reference');
                }
                break;
            case ElementTypes.ActiveKindTable:
                tid = decoder.uint32();
                segment.Expression = decoder.decode(Expression, mod);
                segment.Kind = decoder.uint8();
                idxs = decoder.vector('uint32');
                if (!mod.TableSection.Tables[tid]) {
                    throw new Error('Invalid Element Segment table reference');
                }
                segment.Table = mod.TableSection.Tables[tid]!;
                segment.Functions.push(...idxs.map(id => mod.FunctionSection.Functions[id]!));
                if (segment.Functions.some(f => !f)) {
                    throw new Error('Invalid Element Segment function reference');
                }
                break;
            case ElementTypes.PassiveKind:
                segment.Kind = decoder.uint8();
                idxs = decoder.vector('uint32');
                segment.Functions.push(...idxs.map(id => mod.FunctionSection.Functions[id]!));
                if (segment.Functions.some(f => !f)) {
                    throw new Error('Invalid Element Segment function reference');
                }
                break;
            case ElementTypes.ActiveType:
                segment.Expression = decoder.decode(Expression, mod);
                segment.Initialization.push(...decoder.vector(Expression, mod));
                break;
            case ElementTypes.DeclarativeType:
                segment.Reference = decoder.uint8();
                segment.Initialization.push(...decoder.vector(Expression, mod));
                break;
            case ElementTypes.ActiveTypeTable:
                tid = decoder.uint32();
                if (!mod.TableSection.Tables[tid]) {
                    throw new Error('Invalid Element Segment table reference');
                }
                segment.Table = mod.TableSection.Tables[tid]!;
                segment.Expression = decoder.decode(Expression, mod);
                segment.Reference = decoder.uint8();
                segment.Initialization.push(...decoder.vector(Expression, mod));
                break;
            case ElementTypes.PassiveType:
                segment.Reference = decoder.uint8();
                segment.Initialization.push(...decoder.vector(Expression, mod));
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

    public override contentEncode(encoder: IEncoder, mod: Module): void {
        if (!this.Elements.length) { return; }
        encoder.vector(this.Elements, mod);
    }

    public decode(decoder: IDecoder, mod: Module): void {
        this.Elements.length = 0;
        this.Elements.push(...decoder.vector(ElementSegment, mod));
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

    public getMemoryIndex(mod: Module, pass?: boolean): number {
        if (!pass && !this.Memory) { throw new Error('Invalid DataSegment Memory reference'); }
        if (!this.Memory) { return -1; }
        let idx = mod.MemorySection.Memories.indexOf(this.Memory);
        if (!pass && idx < 0) { throw new Error('Invalid DataSegment Memory reference'); }
        return idx;
    }

    public encode(encoder: IEncoder, mod: Module): void {
        if (this.Kind < 0 || this.Kind > DataSegmentKind.activeExplicit) {
            throw new Error('Invalid DataSegment kind: ' + this.Kind);
        }
        let idx;
        if (!this.Bytes) { throw new Error('Invalid DataSegment: missing data')}
        encoder.uint8(this.Kind);
        switch (this.Kind) {
            case DataSegmentKind.active:
                if (!this.Expression) { throw new Error('Invalid DataSegment[Active]'); }
                encoder.encode(this.Expression, mod);
                break;
            case DataSegmentKind.passive: break;
            case DataSegmentKind.activeExplicit:
                if (!this.Memory || !this.Expression) { throw new Error('Invalid DataSegment[ActiveExplicit]'); }
                idx = this.getMemoryIndex(mod)
                encoder.uint32(idx).encode(this.Expression, mod);
                break;
            default: throw new Error('Invalid DataSegment kind: ' + this.Kind);
        }
        encoder.append(this.Bytes);
    }

    public static decode(decoder: IDecoder, mod: Module): DataSegment {
        let kind = decoder.uint8();
        let segment = new DataSegment(kind);
        switch (kind) {
            case DataSegmentKind.active:
                segment.Expression = decoder.decode(Expression, mod);
                break;
            case DataSegmentKind.passive: break;
            case DataSegmentKind.activeExplicit: {
                let idx = decoder.uint32();
                if (!mod.MemorySection.Memories[idx]) {
                    throw new Error('Invalid Data Segment memory reference');
                }
                segment.Memory = mod.MemorySection.Memories[idx]!;
                segment.Expression = decoder.decode(Expression, mod);
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

    public add(segment: DataSegment): boolean { 
        if (this.Datas.indexOf(segment) === -1) {
            this.Datas.push(segment);
            return true;
        }
        return false;
    }

    protected contentEncode(encoder: IEncoder, mod: Module): void {
        if (!this.Datas.length) { return; }
        encoder.vector(this.Datas, mod);
    }

    public decode(decoder: IDecoder, mod: Module): void {
        this.Datas.length = 0;
        this.Datas.push(...decoder.vector(DataSegment, mod));
    }
}

export class DataCountSection extends Section<SectionTypes.dataCount> {

    public constructor() { super(SectionTypes.dataCount); }

    protected contentEncode(encoder: IEncoder, mod: Module): void {
        if (!mod.DataSection.Datas.length) { return; }
        encoder.uint32(mod.DataSection.Datas.length);
    }
    public override decode(): void { }
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

    public encode(encoder: IEncoder, mod: Module): void {
        let e = encoder.spawn();
        let l = this.Locals.reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), { } as { [key: number]: number });
        e.uint32(Object.keys(l).length);
        for (let k in l) { e.uint32(l[k]!).uint8(parseInt(k)); }
        e.encode(this.Body, mod);
        encoder.uint32(e.size).append(e);
    }

    public static decode(decoder: IDecoder, context: { module: Module, index: number }): CodeSegment {
        if (!context.module.FunctionSection.Functions[context.index]) {
            throw new Error('Invalid Code Segment function reference');
        }
        const len = decoder.uint32();
        const curr = decoder.remaining;
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
        if (curr - decoder.remaining !== len) { throw new Error('Invalid Code Segment length'); }
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
    
    public contentEncode(encoder: IEncoder, mod: Module): void {
        if (
            this.Codes.length != mod.FunctionSection.Functions.length ||
            this.Codes.some((cs, i) => !cs.Signature.equals(mod.FunctionSection.Functions[i]))
        ) { throw new Error('Code Section does not correspond to Function Section!'); }
        encoder.vector(this.Codes, mod);
    }

    public decode(decoder: IDecoder, mod: Module): void {
        this.Codes.length = 0;
        this.Codes.push(...decoder.vector(CodeSegment, { index: 0, module: mod }))
    }
}

type CustomSectionCtor = { new(name: string): CustomSection };
export abstract class CustomSection extends Section<SectionTypes.custom> {
    public readonly Name!: string;

    public override set precedence(value: number) { this._precedence = value; }

    protected constructor(name?: string, readonly: boolean=true) {
        super(SectionTypes.custom);
        if (readonly) { protect(this, 'Name', (name || '') + '', true); }
        else { this.Name = name || ''; }
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
        encoder.vector(this.Name);
        this.encodeBytes(encoder);
    }
        
    public decode(decoder: IDecoder): void {
        this.decodeBytes(decoder);
    }
    
    protected abstract encodeBytes(encoder: IEncoder): void;
    protected abstract decodeBytes(decoder: IDecoder): void;

    public static decode(decoder: IDecoder): CustomSection {
        let name = decoder.vector('utf8');
        let type =  CustomSection._customTypes[('' + name).toLowerCase()];
        if (type) { return new type(name); }
        return new UnkownCustomSection(name);
    }

    private static readonly _customTypes: { [key: string]: CustomSectionCtor } = { };

    public static registerCustomType(this: CustomSectionCtor, name: string): void;
    public static registerCustomType(this: typeof CustomSection, name: string, type: CustomSectionCtor): void;
    public static registerCustomType(name: string, type?: CustomSectionCtor): void {
        if (this === CustomSection && !type) { throw new TypeError('Missing second argument (type)'); }
        CustomSection._customTypes[(''+ name).toLowerCase()] = (type || this) as any;
    }
}

export class NameReference implements IEncodable {
    public Index: number;
    public Name: string;
    public constructor(index: number, name: string) {
        this.Index = index;
        this.Name = name;
    }
    public encode(encoder: IEncoder): any {
        encoder.uint32(this.Index);
        encoder.string(this.Name);
    }
    public static decode(decoder: IDecoder): NameReference {
        return new NameReference(
            decoder.uint32(),
            decoder.vector('utf8')
        );
    }
    
}

export enum NameSubSections {
    module    = 0x00,
    function  = 0x01,
    local     = 0x02
}
export class NameCustomSection extends CustomSection {
    public Module: string | null;
    public readonly Functions!: NameReference[];
    public readonly Locals!: { [key: number]: NameReference[] };
    public constructor() {
        super('name', false);
        this.Module = null;
        protect(this, 'Functions', []);
        protect(this, 'Locals', {});
    }

    public module(name: string): this {
        this.Module = name;
        return this;
    }
    public function(value: NameReference): boolean {
        let rv = this.Functions.find(m => m.Index === value.Index);
        if (rv) { return false; }
        this.Functions.push(value);
        return true;
    }
    public local(fnIndex: number, value: NameReference): boolean {
        if (!this.Locals[fnIndex]) { this.Locals[fnIndex] = []; }
        let rv = this.Locals[fnIndex]!.find(m => m.Index === value.Index);
        if (rv) { return false; }
        this.Locals[fnIndex]!.push(value);
        return true;
    }
    protected override encodeBytes(encoder: IEncoder): void {
        if (this.Module !== null) {
            const e = encoder.spawn();
            e.string(this.Module);
            encoder.uint8(NameSubSections.module).uint32(e.size).append(e);
        }
        if (this.Functions.length) {
            const e = encoder.spawn();
            e.vector(this.Functions);
            encoder.uint8(NameSubSections.function).uint32(e.size).append(e);
        }
        const locFns = Object.keys(this.Locals);
        if (locFns.length) {
            const e = encoder.spawn();
            e.uint32(locFns.length);
            for (let k in this.Locals) {
                e.uint32(parseInt(k)).vector(this.Locals[k]!);
            }
            encoder.uint8(NameSubSections.local).uint32(e.size).append(e);
        }
    }
    protected override decodeBytes(decoder: IDecoder): void {
        this.Module = null;
        this.Functions.length = 0;
        for (const k in this.Locals) { delete this.Locals[k]; }

        while (decoder.remaining) {
            const type = decoder.uint8();
            const size = decoder.uint32();
            const d = decoder.slice(size);
            switch (type) {
                case NameSubSections.module:
                    this.Module = d.vector('utf8'); break;
                case NameSubSections.function:
                    this.Functions.push(...d.vector(NameReference)); break;
                case NameSubSections.local: {
                    const n = d.uint32();
                    for (let i = 0; i < n; ++i) {
                        const k = d.uint32();
                        this.Locals[k] = this.Locals[k] || [];
                        this.Locals[k]!.push(...d.vector(NameReference));
                    }
                    break;
                }
                default: throw new Error('Unrecognized subsection');
            }
        }
    }
}
NameCustomSection.registerCustomType('name');

export class UnkownCustomSection extends CustomSection {
    public override Name!: string;
    public readonly Bytes!: number[];
    public constructor(name: string) {
        super(name, false);
        protect(this, 'Bytes', [], true);
    }

    protected override encodeBytes(encoder: IEncoder): void { encoder.append(this.Bytes); }
    protected override decodeBytes(decoder: IDecoder): void {
        this.Bytes.length = 0;
        this.Bytes.push(...decoder.read(decoder.remaining));
    }
}

export class SourceMapSection extends CustomSection {
    public SourceMapUrl: string;
    public constructor(url: string='') { super('sourceMappingURL'); this.SourceMapUrl = url; }
    protected override encodeBytes(encoder: IEncoder): void { encoder.vector(this.SourceMapUrl); }
    protected override decodeBytes(decoder: IDecoder): void { this.SourceMapUrl = decoder.vector('utf8'); }
}
SourceMapSection.registerCustomType('sourceMappingURL');