export function countParams(target: Function): number {
    if (typeof(target) !== 'function') { return 0; }
    let s = target.toString();
    s = s.slice(s.indexOf('(') + 1, s.indexOf(')'));
    return Math.max(s.split(',').filter(x => !!x).length, target.length);
}