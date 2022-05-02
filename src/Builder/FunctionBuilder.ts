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

import { KWatError } from '../errors';
import { ExpressionBuilder } from './ExpressionBuilder';
import * as Types from '../Types'
import * as Expression from '../Instructions'
import type { ModuleBuilder } from './ModuleBuilder';
import type { BuildingCallback, IBuilder } from './index';

type Exprimible<I extends Expression.Instruction=Expression.Instruction> = I | { instance: I };

/** An object that describes how to delcare a function */
export type FunctionDefinition = {
    /** The generated function signature */
    type: Types.FunctionType,
    /** The generated function body */
    body: Expression.Instruction[],
    /** The generated function local variables name map */
    locals: Record<string, Types.ValueType>,
    /** The generated function references to other functions */
    references: string[],
    /** The name of exportation (if any) */
    exported: string,
    /** The local name the function */
    name: string 
};

/** Allow to build functions with ease, by preserving
 * function informations
*/
export class FunctionBuilder implements IBuilder<FunctionDefinition> {
    /** @internal function parameters */
    private _parameters: Types.ResultType = [];
    /** @internal function results */
    private _results: Types.ResultType = [];
    /** @internal function body instructions */
    private _body: Expression.Instruction[] = [];
    /** @internal references to external functions */
    private _references: string[] = []
    /** @internal local variables name map */
    private _locals: Record<string, Types.ValueType> = {};
    /** @internal exported name */
    private _exported: string = '';
    /** @internal local name of the function */
    private _name: string = '';
    /** @internal the owner module builder */
    private _module: ModuleBuilder;
    
    /** The actual exported name */
    public get exportName(): string | null { return this._exported || null; }
    /** The actual status of exportation (will this function be exported from the module?) */
    public get isExported(): boolean { return !!this._exported; }
    /** The actual module local name */
    public get name(): string { return this._name; }
    /** The module owner of the function generation */
    public get module(): ModuleBuilder { return this._module; }

    /** Create a new void function */
    public constructor(module: ModuleBuilder) { this._module = module; }

    /** Set the local name of the function 
     * @param {string} name local name
     * @return {this} the builder itself (chainable method)
     */
    public useName(name: string): this { this._name = name; return this; }
    /** Set the export name of the function 
     * @param {(string|null)} exported local name
     * @return {this} the builder itself (chainable method)
     */
    public exportAs(exported: string | null): this { this._exported = exported || ''; return this; }
    /** Remove the exportation of this function from the module
     * @return {this} the builder itself (chainable method)
     */
    public removeExport(): this { this._exported = ''; return this; }

    /** Add one or more parameters to the function inputs 
     * @param {(Types.ValueType | Types.ValueTypeKey)} type type of the (first) parameter
     * @param {...(Types.ValueType | Types.ValueTypeKey)[]} [types] type of the (other) parameters
     * @return {this} the builder itself (chainable method)
     */
    public parameter(type: Types.ValueType | Types.ValueTypeKey, ...types: (Types.ValueType | Types.ValueTypeKey)[]): this {
        types.unshift(type)
        types.forEach(t => {
            if (typeof(t) === 'string') { t = Types.Type[t] || t; }
            if (!Types.validValue(t)) { throw new KWatError('Invalid parameter Type: ' + t); }
            this._parameters.push(t);
        });
        return this;
    }
    /** Add one or more results to the function outputs.
     * *Note that multiple result output is not supported from the Wasm v1 standard.*
     * @param {(Types.ValueType | Types.ValueTypeKey)} type type of the (first) result
     * @param {...(Types.ValueType | Types.ValueTypeKey)[]} [types] type of the (other) results
     * @return {this} the builder itself (chainable method)
     */
    public result(type: Types.ValueType | Types.ValueTypeKey): this {
        if (typeof(type) === 'string') { type = Types.Type[type] || type; }
        if (!Types.validValue(type)) { throw new KWatError('Invalid result Type: ' + type); }
        this._results.push(type);
        return this;
    }

    /** Check if the function has the given index in the local variable set 
     * @param {(number|string)} index the given index or local name of the local variable
     * @return {boolean} whether the local is present or not
     */
    public hasLocal(index: number | string): boolean {
        if (typeof(index) === 'string') { return index in this._locals; }
        return index >= 0 && index < Object.keys(this._locals).length + this._parameters.length;
    }

    /** Check if the function has the given index in the local variable set ,
     * otherwhise throws an error.
     * @param {(number|string)} index the given index or local name of the local variable
     * @return {number} the index of the local variable
     */
    public checkLocal(index: number | string): number {
        if (!this.hasLocal(index)) { throw new KWatError('Undefined local variable: \'' + index + '\''); }
        return typeof(index) === 'string' ? this.local(index) : index;
    }

    /** Retrieve the index of the given local variable
     * @param {string} name the given local name of the local variable
     * @param {boolean} [pass] don't throw errors if the operation fails
     * @return {number} the index of the local variable, `-1` if not found
     */
    public local(name: string, pass?: boolean): number;
    /** Add a local variable to the set
     * @param {string} name the local name of the local variable
     * @param {(Types.ValueType | Types.ValueTypeKey)} type the type of the local variable
     * @return {this} the builder itself (chainable method)
     */
    public local(name: string, type: Types.ValueType | Types.ValueTypeKey): this;
    public local(name: string, type?: Types.ValueType | Types.ValueTypeKey | boolean): this | number {
        if (typeof(type) === 'undefined' || typeof(type) === 'boolean') {
            const i = Object.keys(this._locals).indexOf(name);
            if (i === -1 && !type) { throw new KWatError('Undefined local variable: \'' + name + '\''); }
            return i;
        }
        if (typeof(type) === 'string') { type = Types.Type[type] || type; }
        if (!Types.validValue(type)) { throw new KWatError('Invalid local Type: ' + type); }
        name = '' + name;
        if (name in this._locals) { throw new KWatError('Function Builder local variable \'' + name + '\' already defined')}
        this._locals[name] = type;
        return this;
    }

    /**Define the function body
     * @param {BuildingCallback<ExpressionBuilder>} expression
     *  a callback used to generate the function body through a builder
     * @return {this} the builder itself (chainable method)
     */
    public bodyExpression(expression: BuildingCallback<ExpressionBuilder>): this;
    /**Define the function body
     * @param {...Exprimible[]} expressions
     *  the instructions used to define the body of the function
     * @return {this} the builder itself (chainable method)
     */
    public bodyExpression(...expressions: Exprimible[]): this;
    public bodyExpression(expression: BuildingCallback<ExpressionBuilder> | Exprimible, ...instructions: Exprimible[]): this {
        if (typeof(expression) === 'function') {
            let exp = expression(new ExpressionBuilder(this)).build();
            this.addInstruction(...exp.Instructions);
        }
        else { this.addInstruction(expression, ...instructions); }
        return this;
    }
    
    /**Add instructions to the function body
     * @param {...Exprimible[]} instructions
     *  the instructions that will be added to the body of the function
     * @return {this} the builder itself (chainable method)
     */
    public addInstruction(...instructions: Exprimible[]): this {
        instructions.forEach(i => {
            if (!(i instanceof Expression.Instruction)) {
                if ('instance' in i && i.instance instanceof Expression.Instruction) { i = i.instance; }
                else { throw new KWatError('Invalid body expression: ' + i); }
            }
            this._body.push(i);
        })
        return this;
    }

    public build(): FunctionDefinition {
        return {
            type: new Types.FunctionType(this._parameters, this._results),
            body: this._body.slice(),
            locals: Object.assign({}, this._locals),
            references: this._references.slice(),
            exported: this._exported,
            name: this._name
        };
    }
}