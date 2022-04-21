import { Type } from '../Types';
import { Reader, ReaderEvent } from './Reader';
import { ExchangeDescriptionCode, SectionTypes } from '../Sections';
import type { IDecoder } from '../Encoding';

const sep = '$$$'

function printIndex(value: number, digits: number = 8, offset: number = 0): string {
    let r = Math.max(value + offset, 0).toString(16);
    while (r.length < digits) { r = '0' + r; }
    return r;
}
function printArray(array: Record<number, number> & { length: number }, sep: number = 2, max: number = -1): string {
    let result = '';
    for (let i = 0, j = 0; i < array.length; ++i) {
        if (i && !(i % sep)) {
            j++;
            if (max >= 0 && j && !(j % max)) { result += '\n         '; }
            result += ' ';
        }
        result += printIndex(array[i]!, 2);
    }
    if (result.endsWith('\n          ')) {
        result = result.substring(0, result.length - 10);
    }
    return result;
}

function printRead(evt: ReaderEvent): string {
    if (evt.composite) { return '; ' + evt.type + ' - end\n'; }
    let result = printIndex(evt.index) + ': ' + printArray(evt.data, 2, 8) + sep + '; ' + evt.type;
    switch (typeof(evt.value)) {
        case 'object': break;
        case 'string': result += ' ("' + evt.value + '")'; break;
        case 'number': {
            let val: any = evt.value;
            let holder: Record<number, string> | null = null;
            switch (evt.type) {
                case 'section.types.code':
                case 'section.types.function.result':
                case 'section.types.function.param': holder = Type; break;
                case 'section.code': holder = SectionTypes; break;
                case 'section.exports.export.code':
                case 'section.imports.import.code': holder = ExchangeDescriptionCode; break;
            }
            holder && (val += ':' + holder[val]);
            result += ' (' + val + ')';
            break;
        }
        default: result += ' (' + evt.value + ')'; break;
    }
    return result + '\n';
}

/** Creates a dump string representation from a Wasm module
 * in a binary form by reading its sections.
 * @param {Uint8Array} buffer the Wasm module in binary form
 * @returns {string} the Wasm module dump representation
 */
export function dump(buffer: Uint8Array | ArrayBuffer | IDecoder): string {
    let result = '; START\n';
    new Reader(buffer)
    .on('all', evt => result += printRead(evt))
    .read();
    result += ';END';
    let lines = result.split('\n').map(l => l.split(sep, 2));
    const maxLineLen = Math.max(...lines.map(l => (l[0] || '').length))
    return lines.map(l => l.join(' '.repeat(maxLineLen - (l[0] || '').length + 5))).join('\n');
}