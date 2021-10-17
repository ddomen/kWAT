// import { isSpace, Throw } from './internal';
import type { Module } from './Structure';


export interface IParser { parse(text: string): Module }
export type IParserCtor = new() => IParser;

type SExpression = (string | SExpression)[];

const Throw = {
    ParserError(message: string, state?: State): Error {
        return new Error(message + (state ? (' (' + state.line + ', ' + state.column + ')') : ''));
    },
    Character(given: string, expected: string, state?: State): never {
        throw this.ParserError(
            'Invalid character \'' + given + '\', expected \'' + expected + '\'',
            state
        );
    },
    EOF(): never { throw this.ParserError('Unexpected input end'); },
    EmptyExpression(state?: State): never { throw this.ParserError('Empty Expression', state); },
    InvalidExpression(state?: State): never { throw this.ParserError('Invalid Expression', state); },
    InvalidArgument(message: string, name?: string): never { throw new Error(message + (name ? '(arg: ' + name + ')' : '')); }
}

function isSpace(char: string): boolean { return !!char.match(/\s/); }

class State {

    private readonly _text: string;
    private _offset: number;
    private _line: number;
    private _column: number;
    private _lastColumn: number;
    private _length: number;

    public get line(): number { return this._line; }
    public get column(): number { return this._column; }
    public get length(): number { return this._length; }

    public constructor(text: string) {
        this._text = text;
        this._length = this._text.length;
        this._offset = 0;
        this._line = 0;
        this._column = 0;
        this._lastColumn = 0;
    }

    public checkCharacter(char: string, raise: boolean) {
        return this._text[this._offset]! == char ?
            this.next() :
            (raise ? Throw.Character(this._text[this._offset]!, char, this) : '');
    }

    public isSpace(): boolean { return isSpace(this._text[this._offset]!); }

    public skipWhites(): number {
        let start = this._offset;
        while (this.isSpace() && this.next());
        return this._offset - start;
    }

    public prev(checked?: boolean | string): string {
        if (this._offset - 1 < 0) { return checked ? Throw.EOF() : ''; }
        if (typeof(checked) === 'string') { this.checkCharacter(checked, true); }
        if (this._text[this._offset] == '\n') {
            this._line--;
            this._column = this._lastColumn;
        }
        else { this._column--; }
        return this._text[this._offset--]!;
    }

    public next(checked?: boolean | string): string {
        if (this._offset + 1 > this._length) { return checked ? Throw.EOF() : ''; }
        if (typeof(checked) === 'string') { this.checkCharacter(checked, true); }
        if (this._text[this._offset] == '\n') {
            this._line++;
            this._lastColumn = this._column;
            this._column = 0;
        }
        else { this._column++; }
        return this._text[this._offset++]!;
    }

    public hasNext() { return this._offset < this._length; }

}

export class SExpressionParser implements IParser {
    private _sexpression(state: State): SExpression {
        state.skipWhites();
        state.checkCharacter('(', true);
        var exp = [], c = state.next(true), v = '', s = false;
        while (state.hasNext() && c != ')') {
            if (c == '(') {
                if (!exp.length || !s) { Throw.InvalidExpression(state); }
                s = false;
                state.prev();
                exp.push(this._sexpression(state));
            }
            else if (isSpace(c)) {
                s = true;
                state.skipWhites();
                v && exp.push(v);
                v = '';
            }
            else {
                s = false;
                v += c;
            }
            c = state.next(true);
        }
        v && exp.push(v);
        if (!exp.length) { Throw.EmptyExpression(state); }
        return exp;
    }

    public parse(text: string): Module {
        if (typeof(text) !== 'string') { Throw.InvalidArgument('Parse first argument must be a string', 'text'); }
        let state = new State(text);
        let sexp = this._sexpression(state);
        return sexp as any;
    }
}

export { SExpressionParser as Parser };