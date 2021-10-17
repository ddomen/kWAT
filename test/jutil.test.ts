import 'jasmine';
import * as JU from './jutils'

describe('JUtils', ()=> {

    it('does not work with non-function objects', () => {
        expect(JU.countParams(3 as any)).toBe(0)
        expect(JU.countParams({} as any)).toBe(0)
        expect(JU.countParams('string' as any)).toBe(0)
        expect(JU.countParams(BigInt(0) as any)).toBe(0)
    })

    it('works with unnamed functions', () => {
        expect(JU.countParams(function () { })).toBe(0);
        expect(JU.countParams(function (a: number, b: number) { return a + b })).toBe(2);
        expect(JU.countParams(function (a: number, b: number, c: number=3) { return a + b + c })).toBe(3);
    })

    it('works with named functions', () => {
        expect(JU.countParams(function ju_test_1() { })).toBe(0);
        expect(JU.countParams(function ju_test_2 (a: number, b: number) { return a + b; })).toBe(2);
        expect(JU.countParams(function ju_test_3  (a: number, b: number, c: number=3) { return a + b + c; })).toBe(3);
    })

    it('works with async functions', () => {
        expect(JU.countParams(async function ju_test_1() { })).toBe(0);
        expect(JU.countParams(async function ju_test_2 (a: number, b: number) { return a + b })).toBe(2);
        expect(JU.countParams(async function ju_test_3  (a: number, b: number, c: number=3) { return a + b + c; })).toBe(3);
    })

    it('works with lambda functions', () => {
        expect(JU.countParams(() => { })).toBe(0);
        expect(JU.countParams((a: number, b: number) => a + b)).toBe(2);
        expect(JU.countParams((a: number, b: number, c: number=3) => a + b + c)).toBe(3);
        expect(JU.countParams((a: number, b: number) => { return  a + b })).toBe(2);
        expect(JU.countParams((a: number, b: number, c: number=3) => { return a + b + c })).toBe(3);
    })

    it('works with class constructors', () => {
        expect(JU.countParams(class { })).toBe(0);
        expect(JU.countParams(class A { })).toBe(0);
        expect(JU.countParams(class B { constructor() { } })).toBe(0);
        expect(JU.countParams(class C { constructor(a: number, b: number) { a + b; } })).toBe(2);
        expect(JU.countParams(class D { constructor(a: number, b: number, c: number=0) { a+b+c } })).toBe(3);
        expect(JU.countParams(class E { getx(){ return 3; } constructor() { } })).toBe(0);
        expect(JU.countParams(class E { getx(){ return 3; } constructor(a: number, b: number) { a+b } })).toBe(2);
        expect(JU.countParams(class E { getx(){ return 3; } constructor(a: number, b: number, c: number=2) { a+b+c } })).toBe(3);
    })
})