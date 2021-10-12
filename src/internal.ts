type State = { line: number, column: number };
type SExpression = (string | SExpression)[];

export const Throw = {
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


    CompilerError(message: string, sexp: SExpression): Error {
        return new Error(message + ' { [' + sexp[0] + '] -> (' + sexp.slice(1).join(', ') + ')');
    },
    UnexpectedExpressionType(expected: string, sexp: SExpression): never {
        throw this.CompilerError(
            'Unexpected expression type \'' + sexp[0] + '\', expected \'' + expected + '\'',
            sexp
        );
    },

    InvalidArgument(message: string, name?: string): never { throw new Error(message + (name ? '(arg: ' + name + ')' : '')); }
}

export function isSpace(char: string): boolean { return !!char.match(/\s/); }

type IArray<T> = { [key: number]: T, length: number };
export function insert<T>(target: T[], ...args: IArray<T>[]): T[] {
    let d: IArray<T>;
    for (var i = 1; i < args.length; ++i) {
        d = args[i]!;
        for (var j = 0; j < (d.length || 0); ++j) { target.push(d[j]!); }
    }
    return target;
}

export function protect<T, K extends keyof T>(target: T, key: K, value: T[K], enumerable: boolean = true) {
    Object.defineProperty(target, key, {
        value, configurable: false,
        writable: false, enumerable
    });
}