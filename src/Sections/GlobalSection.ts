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

import { protect } from '../internal';
import { Section, SectionTypes } from './Section';
import { Expression } from '../Instructions';
import { GlobalType, ValueType } from '../Types';
import type { Module, WasmOptions } from '../Module';
import type { IEncoder, IDecoder, IEncodable } from '../Encoding';

/** A global variable definition, part of a {@link GlobalSection} */
export class GlobalVariable implements IEncodable<[Module, WasmOptions]> {
    /** The variable type description */
    public readonly variable!: GlobalType;
    /** The expression which initialize the global variable */
    public readonly initialization!: Expression;
    /** A reference name for the current variable */
    public reference: string;

    /** whether this variable is a reference to an external variable */
    public get isReference(): boolean { return this.variable === -1 as any && !!this.reference && !this.initialization; }

    /** Creates a new global variable
     * @param {ValueType} type the type of the variable
     * @param {Expression} init the expression which initialize the variable 
     * @param {boolean} [constant=false] the mutability of the variable
     * @param {string} [reference] a reference name
     */
    constructor(type: ValueType, init: Expression, constant: boolean = false, reference?: string) {
        protect(this, 'variable', new GlobalType(type, constant), true);
        protect(this, 'initialization', init, true);
        this.reference = reference || '';
    }

    /** Check if this variable is currently the target of reference of another value.
     * @param {(GlobalVariable|string)} other the reference value to check
     * @return {boolean} whether the other value is the target of reference of the current variable
    */
    public referred(other: GlobalVariable | string): boolean {
        if (other instanceof GlobalVariable) { return other.isReference && this.reference === other.reference; }
        return this.reference === other;
    }
    /** Check if this variable currently refer the same as another variable 
     * @param {(GlobalVariable|string)} other the referenced value
     * @returns {boolean} whether this variable refer the other value
     */
    public refer(other: GlobalVariable | string): boolean {
        return this.isReference && (other instanceof GlobalVariable ? other.reference : other) === other;
    }

    public encode(encoder: IEncoder, mod: Module, opts: WasmOptions) {
        encoder.encode(this.variable, opts).encode(this.initialization, mod, opts);
    }
    
    /**Decode this object through a decoder
     * @param {IDecodder} decoder the decoder target of the reading
     * @param {Module} mod the module that holdds the global section
     * @return {GlobalVariable} the read global variable
    */
    public static decode(decoder: IDecoder, mod: Module): GlobalVariable {
        let type = decoder.decode(GlobalType);
        return new GlobalVariable(
            type.type,
            decoder.decode(Expression, mod),
            type.constant
        );
    }

    /** Creates a global variable which is a reference
     * to another named global variable 
     * @param {string} name the name to refer
     * @returns {GlobalVariable} the constructed global variable reference
     */
    public static refer(name: string): GlobalVariable {
        return new GlobalVariable(-1, null as any, false, name);
    }
}

/** A section containing all the global variable definitions of the module */
export class GlobalSection extends Section<SectionTypes.global> {
    /** All the defined global variables */
    public readonly globals!: GlobalVariable[];

    /** Create a new empty global section */
    constructor() {
        super(SectionTypes.global);
        protect(this, 'globals', [], true);
    }

    /** Retrieve the index of a global variable present in this section
     * also by checking the reference equality
     * @param {GlobalVariable} variable the variable to search
     * @returns {number} the index of the variable, `-1` if not found
     */
    public indexOf(variable: GlobalVariable): number {
        if (variable.isReference) { return this.globals.findIndex(g => g === variable || variable.refer(g)); }
        return this.globals.indexOf(variable);
    }

    /** Add a new global variable to the section.
     * Note that is not possible to add a reference variable
     * as it is not a real declaration
     * @param {GlobalVariable} variable the variable to be added
     * @returns {boolean} the success of the operation
     */
    public add(variable: GlobalVariable): boolean {
        if (!variable.isReference && this.globals.indexOf(variable) === -1) {
            this.globals.push(variable);
            return true;
        }
        return false;
    }
    
    public override contentEncode(encoder: IEncoder, mod: Module, opts: WasmOptions): void {
        if (!this.globals.length) { return; }
        encoder.vector(this.globals, mod, opts);
    }


    public override decode(decoder: IDecoder, mod: Module) {
        this.globals.length = 0;
        this.globals.push(...decoder.vector(GlobalVariable, mod));
    }
}
