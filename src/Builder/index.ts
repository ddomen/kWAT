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

/** Interface that exposes a build method */
export interface IBuilder<T> {
    /** Build the current object after
     * imposed the construction in a declarative way
     * @return {T} the built object
    */
    build(): T;
}
export type BuildingCallback<B extends IBuilder<any>> = (builder: Omit<B, 'build'>) => B;

export * from './ExpressionBuilder'
export * from './FunctionBuilder'
export * from './FunctionImporterBuilder'
export * from './ModuleBuilder'