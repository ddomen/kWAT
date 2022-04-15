import { Type } from '../Types'
import { Decoder } from '../Encoding';
import { OpCodes } from '../OpCodes';
import { SectionTypes, ExchangeDescriptionCode, CustomSections } from '../Sections';

const sep = '$$$'

function printIndex(value: Decoder | number, base: number = 8, offset: number = 0): string {
    if (value instanceof Decoder) {
        const v = (value as any as { _view: DataView, _offset: number }) ;
        value = v._view.byteOffset + v._offset;
    }
    let r = Math.max(value + offset, 0).toString(16);
    while (r.length < base) { r = '0' + r; }
    return r;
}

function printPart(decoder: Decoder, size: number, sep: number = 2): string {
    let result = '';
    let i = 0;
    while (i < size) {
        result += (i && !(i % sep) ? ' ' : '') + printIndex(decoder.uint8(), 2);
        i++;
    }
    return result;
}

function printArray(array: number[], sep: number = 2): string {
    let result = '';
    for (let i = 0; i < array.length; ++i) {
        result += (i && !(i % sep) ? ' ' : '') + printIndex(array[i]!, 2);
    }
    return result;
}

function read<T>(decoder: Decoder, fn: (d: Decoder) => T, sep: number = 2): {
    result: T,
    amount: number,
    value: string
} {
    const _d = decoder as any as { _offset: number };
    const offset = decoder.offset;
    const result = fn(decoder);
    const amount = decoder.offset - offset;
    _d._offset = offset;
    const value = printPart(decoder, amount, sep);
    return { result, amount, value };
}

function parseMagic(decoder: Decoder): string {
    const magic = [...decoder.read(4)];
    if (String.fromCharCode(...magic) !== '\0asm') {
        throw new Error('Invalid wasm binary magic: ' + printArray(magic));
    }
    return '00000000: 0061 736d' + sep + '; WASM_BINARY_MAGIC ("\\0asm")\n';
}

function parseVersion(decoder: Decoder): string {
    if (decoder.remaining < 4) { throw new Error('Invalid wasm module'); }
    let result = printIndex(decoder) + ': ';
    const v = read(decoder, d => d.read(4));
    result += v.value + sep + '; WASM_BINARY_VERSION (' + v.result.join('.') + ')\n';
    return result;
}

function parseUnknown(decoder: Decoder, message: string = ''): string {
    if (!decoder.remaining) { return '' }
    return printIndex(decoder) + ': ' + printPart(decoder, decoder.remaining, 2)
            + sep + '; ' + (message || '???') + '\n';
}

function parseSectionUnknown(decoder: Decoder): string {
    return parseUnknown(decoder, 'unknown section data');
}

function parseTypeFunc(decoder: Decoder): string {
    let result = printIndex(decoder) + ': ';
    const params = read(decoder, d => d.uint32());
    result += params.value + sep + '; num params (' + params.result + ')\n';
    for (let p = 0; p < params.result; ++p) {
        result += printIndex(decoder) + ': ';
        const q = decoder.uint8();
        result += printIndex(q, 2) + sep + '; ' + (Type[q] || 'unknown') + '\n';
    }
    result += printIndex(decoder) + ': ';
    const results = read(decoder, d => d.uint32());
    result += results.value + sep + '; num results (' + results.result + ')\n';
    for (let r = 0; r < results.result; ++r) {
        result += printIndex(decoder) + ': ';
        const p = decoder.uint8();
        result += printIndex(p, 2) + sep + '; ' + (Type[p] || 'unknown') + '\n';
    }
    return result;
}

function parseTypeUnknown(_: Decoder): string {
    return '';
}

function parseType(decoder: Decoder, index: number): string {
    const code = read(decoder, d => d.uint8());
    const type = Type[code.result] || 'unknown'
    let result = '; ' + type + ' type ' + index + '\n' +
                    printIndex(decoder, 8, -code.amount) + ': ' + code.value +
                    sep + '; type: ' + type + '\n';

    switch (code.result) {
        case Type.func: result += parseTypeFunc(decoder);
        default: result += parseTypeUnknown(decoder);
    }

    return result;
}

function parseSectionType(decoder: Decoder): string {
    let result = printIndex(decoder) + ': ';
    const types = read(decoder, d => d.uint32());
    result += types.value + sep + '; num types (' + types.result + ')\n';
    for (let i = 0; i < types.result; ++i) {
        result +=  parseType(decoder, i);
    }
    return result;
}

function parseImport(decoder: Decoder): string {
    let result = printIndex(decoder) + ': ';
    const lMod = read(decoder, d => d.uint32());
    result += lMod.value + sep + '; module name length (' + lMod.result + ')\n' + printIndex(decoder) + ': ';
    const mod = read(decoder, d => d.string(lMod.result));
    result += mod.value + sep + '; module name ("' + mod.result + '")\n' + printIndex(decoder) + ': ';
    const lNam = read(decoder, d => d.uint32());
    result += lNam.value + sep + '; field name length (' + lNam.result + ')\n' + printIndex(decoder) + ': ';
    const nam = read(decoder, d => d.string(lNam.result));
    result += nam.value + sep + '; field name ("' + nam.result + '")\n' + printIndex(decoder) + ': ';
    const kind = read(decoder, d => d.uint8());
    result += kind.value + sep + '; import kind (' + (ExchangeDescriptionCode[kind.result] || 'unknown') + ')\n' + printIndex(decoder) + ': ';
    const sign = read(decoder, d => d.uint32());
    result += sign.value + sep + '; import signature index (' + sign.result + ')\n';
    return result;
}

function parseSectionImport(decoder: Decoder): string {
    let result = printIndex(decoder) + ': ';
    const imports = read(decoder, d => d.uint32());
    result += imports.value + sep + '; num imports (' + imports.result + ')\n';
    for (let i = 0; i < imports.result; ++i) {
        result += '; import haeder ' + i + '\n' + parseImport(decoder);
    }
    return result
}

function parseSectionFunction(decoder: Decoder): string {
    let result = printIndex(decoder) + ': ';
    const fnNum = read(decoder, d => d.uint32());
    result += fnNum.value + sep + '; num functions (' + fnNum.result + ')\n'
    for (let i = 0; i < fnNum.result; ++i) {
        result += printIndex(decoder) + ': ';
        const c = read(decoder, d => d.uint32());
        result += c.value + sep + '; function signature index (' + c.result + ')\n';
    }
    return result;
}

function parseExport(decoder: Decoder): string {
    let result = printIndex(decoder) + ': ';
    const l = read(decoder, d => d.uint32());
    result += l.value + sep + '; export name length (' + l.result + ')\n';
    result += printIndex(decoder) + ': ';
    const c = read(decoder, d => d.string(l.result));
    result += c.value + sep + '; export name ("' + c.result + '")\n';
    result += printIndex(decoder) + ': ';
    const k = read(decoder, d => d.uint8());
    result += k.value + sep + '; export kind (' + (ExchangeDescriptionCode[k.result] || 'unknown') + ')\n';
    result += printIndex(decoder) + ': ';
    const sign = read(decoder, d => d.uint32());
    result += sign.value + sep + '; export func index (' + sign.result + ')\n';
    return result;
}

function parseSectionExport(decoder: Decoder): string {
    let result = printIndex(decoder) + ': ';
    const exp = read(decoder, d => d.uint32());
    result += exp.value + sep + '; num exports (' + exp.result + ')\n'
    for (let i = 0; i < exp.result; ++i) {
        result += parseExport(decoder);
    }

    return result;
}

function parseCode(decoder: Decoder, code: OpCodes, index: { _: number }): string {
    let result = '';

    const next_i32 = (d: Decoder, m: string, i: { _: number }) => {
        let r = printIndex(d) + ': ';
        const i32 = read(d, x => x.uint32());
        r += i32.value + sep + '; ' + m + ' (' + i32.result + ')\n';
        i._ += i32.amount;
        return r;
    }

    switch (code) {
        case OpCodes.local_get: result += next_i32(decoder, 'local index', index); break;
        case OpCodes.i32_const: result += next_i32(decoder, 'i32 literal', index); break;
        case OpCodes.call: result += next_i32(decoder, 'function index', index); break;

        default: break;
    }
    return result;
}

function parseFunctionBody(decoder: Decoder, index: number): string {
    let result = '; function body ' + index + '\n' + printIndex(decoder) + ': ';
    const size = read(decoder, d => d.uint32())
    result += size.value + sep + '; code size (' + size.result + ')\n';
    result += printIndex(decoder) + ': ';
    const locals = read(decoder, d => d.uint32());
    result += locals.value + sep + '; local declaration count (' + locals.result + ')\n';

    for (let i =  { _: locals.amount }; i._ < size.result;) {
        result += printIndex(decoder) + ': ';
        const op = read(decoder, d => d.uint8());
        i._ += op.amount;
        result += op.value + sep + '; ' + (OpCodes[op.result] || 'unknown') + '\n';
        result += parseCode(decoder, op.result, i);
    }
    return result;
}

function parseSectionCode(decoder: Decoder): string {
    let result = printIndex(decoder) + ': ';
    const n = read(decoder, d => d.uint8());
    result += n.value + sep + '; num functions (' + n.result + ')\n';
    for (let i = 0; i < n.result; ++i) {
        result += parseFunctionBody(decoder, i);
    }
    return result;
}

function parseSectionCustomName(decoder: Decoder): string {
    let result = '';
    while (decoder.remaining) {
        result += printIndex(decoder) + ': ';
        const k = read(decoder, d => d.uint8());
        result += k.value + sep + '; ' + (CustomSections.NameSubSections[k.result] || 'unknown') + ' name subsection\n';
        result += printIndex(decoder) + ': ';
        const size = read(decoder, d => d.uint32());
        result += size.value + sep + '; subsection size (' + size.result + ')\n';
        const dec = decoder.slice(size.result) as Decoder;
        switch (k.result) {
            case CustomSections.NameSubSections.module: {
                result += printIndex(dec) + ': ';
                const nLen = read(dec, d => d.uint32());
                result += nLen.value + sep + '; module name length (' + nLen.result + ')\n';
                result += printIndex(dec) + ': ';
                const mod = read(dec, d => d.string(nLen.result));
                result += mod.value + sep + '; module name ("' + mod.result + '")\n';
                break;
            }
            case CustomSections.NameSubSections.function: {
                result += printIndex(dec) + ': ';
                const nFns = read(dec, d => d.uint32());
                result += nFns.value + sep + '; function names count (' + nFns.result + ')\n';
                for (let i = 0; i < nFns.result; ++i) {
                    result += printIndex(dec) + ': ';
                    const fni = read(dec, d => d.uint32());
                    result += fni.value + sep + '; function index (' + fni.result + ')\n';
                    result += printIndex(dec) + ': ';
                    const fnl = read(dec, d => d.uint32());
                    result += fnl.value + sep + '; function name length (' + fnl.result + ')\n';
                    result += printIndex(dec) + ': ';
                    const fnn = read(dec, d => d.string(fnl.result));
                    result += fnn.value + sep + '; function name ("' + fnn.result + '")\n';
                }
                break;
            }
            case CustomSections.NameSubSections.local: {
                result += printIndex(dec) + ': ';
                const nFns = read(dec, d => d.uint32());
                result += nFns.value + sep + '; local functions count (' + nFns.result + ')\n';
                for (let i = 0; i < nFns.result; ++i) {
                    result += printIndex(dec) + ': ';
                    const fni = read(dec, d => d.uint32());
                    result += fni.value + sep + '; local function index (' + fni.result + ')\n';
                    result += printIndex(dec) + ': ';
                    const ll = read(dec, d => d.uint32());
                    result += ll.value + sep + '; local count (' + ll.result + ')\n';
                    for (let j = 0; j < ll.result; ++j) {
                        result += printIndex(dec) + ': ';
                        const lli = read(dec, d => d.uint32());
                        result += lli.value + sep + '; local index (' + i + ' | ' + lli.result + ')\n';
                        result += printIndex(dec) + ': ';
                        const lnl = read(dec, d => d.uint32());
                        result += lnl.value + sep + '; local name length (' + lnl.result + ')\n';
                        result += printIndex(dec) + ': ';
                        const lnn = read(dec, d => d.string(lnl.result));
                        result += lnn.value + sep + '; local name ("' + lnn.result + '" | ' + i + ' | ' + j + ')\n';
                    }

                }
                break;
            }
        }
    }
    return result;
}

function parseSectionCustom(decoder: Decoder): string {
    let result = printIndex(decoder) + ': ';
    const lenName = read(decoder, d => d.uint32());
    result += lenName.value + sep + '; custom section name length (' + lenName.result + ')\n';
    result += printIndex(decoder) + ': ';
    const name = read(decoder, d => d.string(lenName.result));
    result += name.value + sep + '; custom section name  ("' + name.result + '")\n';
    switch (name.result) {
        case 'name': result += parseSectionCustomName(decoder); break;
    }
    return result;
}

function parseSection(decoder: Decoder): string {
    const code = read(decoder, d => d.uint8());
    let result = '; section "' + (SectionTypes[code.result] || 'Unknown') + '" (' + code.value + ')\n';
    result += printIndex(decoder, 8, -code.amount) + ': ' + code.value + sep + '; section code\n' +
                printIndex(decoder) + ': ';
    const size = read(decoder, d => d.uint32());
    result += size.value + sep + '; section size (' + size.result + ')\n';
    const slice = decoder.slice(size.result) as Decoder;
    switch (code.result) {
        case SectionTypes.type: result += parseSectionType(slice); break;
        case SectionTypes.import: result += parseSectionImport(slice); break;
        case SectionTypes.function: result += parseSectionFunction(slice); break;
        case SectionTypes.export: result += parseSectionExport(slice); break;
        case SectionTypes.code: result += parseSectionCode(slice); break;
        case SectionTypes.custom: result += parseSectionCustom(slice); break;
        default: result += parseSectionUnknown(slice); break;
    }
    result += parseUnknown(slice);
    return result;
}

/** Creates a dump string representation from a Wasm module
 * in a binary form by reading its sections.
 * @param {Uint8Array} buffer the Wasm module in binary form
 * @returns {string} the Wasm module dump representation
 */
export function dump(buffer: Uint8Array): string {
    let result = '; START\n';
    const dec = new Decoder(buffer.buffer);
    result += parseMagic(dec);
    result += parseVersion(dec);
    while (dec.remaining) { result += parseSection(dec); }
    result += ';END';
    let lines = result.split('\n').map(l => l.split(sep, 2));
    const maxLineLen = Math.max(...lines.map(l => (l[0] || '').length))
    return lines.map(l => l.join(' '.repeat(maxLineLen - (l[0] || '').length + 5))).join('\n');
}