import { CValidator, CValidatorState } from "./CValidator.js";

type Node = { type: "empty" } | { type: "char"; source: string }
    | { type: "sequence"; children: Node[] } | { type: "choice"; children: Node[] }
    | { type: "repeat"; child: Node; min: number; max: number };
type State = { empty: number[]; edges: { test: (char: string) => boolean; to: number }[] };
type Program = { states: State[]; start: number; end: number; reachable: Set<number> };

/** Parser for the regular subset of JavaScript RegExp, without assertions/backreferences. */
class PatternParser {
    #source: string;
    #at = 0;
    #depth = 0;
    constructor(source: string) {
        // Full-value validation already supplies these two boundary anchors.
        if (source.startsWith("^")) source = source.slice(1);
        if (source.endsWith("$")) {
            let slashes = 0;
            for (let i = source.length - 2; i >= 0 && source[i] === "\\"; --i) ++slashes;
            if (slashes % 2 === 0) source = source.slice(0, -1);
        }
        this.#source = source;
    }
    parse(): Node {
        const result = this.#choice();
        if (this.#at !== this.#source.length) throw new SyntaxError("Unsupported regular expression syntax.");
        return result;
    }
    #choice(): Node {
        const children: Node[] = [this.#sequence()];
        while (this.#source[this.#at] === "|") { ++this.#at; children.push(this.#sequence()); }
        return children.length === 1 ? children[0]! : { type: "choice", children };
    }
    #sequence(): Node {
        const children: Node[] = [];
        while (this.#at < this.#source.length && !"|)".includes(this.#source[this.#at]!)) children.push(this.#repeated());
        return children.length === 0 ? { type: "empty" } : children.length === 1 ? children[0]! : { type: "sequence", children };
    }
    #repeated(): Node {
        const child = this.#atom();
        let min = 1, max = 1, repeated = true;
        const next = this.#source[this.#at];
        if (next === "?") { min = 0; max = 1; ++this.#at; }
        else if (next === "*") { min = 0; max = Infinity; ++this.#at; }
        else if (next === "+") { min = 1; max = Infinity; ++this.#at; }
        else {
            const match = /^\{(\d+)(?:,(\d*))?\}/.exec(this.#source.slice(this.#at));
            if (match === null) repeated = false;
            else {
                min = Number(match[1]); max = match[2] === undefined ? min : match[2] === "" ? Infinity : Number(match[2]);
                if (min > 1024 || (max !== Infinity && max > 1024)) throw new RangeError("Bounded repetition may not exceed 1024.");
                this.#at += match[0].length;
            }
        }
        // Greedy and lazy quantifiers describe the same language.
        if (repeated && this.#source[this.#at] === "?") ++this.#at;
        return repeated ? { type: "repeat", child, min, max } : child;
    }
    #atom(): Node {
        const start = this.#at, char = this.#source[this.#at++]!;
        if (char === "(") {
            if (++this.#depth > 64) throw new RangeError("Regular expression nesting may not exceed 64 groups.");
            if (this.#source[this.#at] === "?") {
                if (this.#source.startsWith("?:", this.#at)) this.#at += 2;
                else throw new SyntaxError("Lookarounds, named groups and inline modifiers are not supported.");
            }
            const child = this.#choice();
            if (this.#source[this.#at++] !== ")") throw new SyntaxError("Unclosed group.");
            --this.#depth; return child;
        }
        if (char === "^") throw new SyntaxError("Only an outer starting ^ anchor is supported.");
        if (char === "$") throw new SyntaxError("Only an outer ending $ anchor is supported.");
        if (char === "[") {
            let closed = false;
            while (this.#at < this.#source.length) {
                const item = this.#source[this.#at++];
                if (item === "\\") ++this.#at;
                else if (item === "]") { closed = true; break; }
            }
            if (!closed) throw new SyntaxError("Unclosed character class.");
        } else if (char === "\\") {
            const escaped = this.#source[this.#at++];
            if (escaped === undefined) throw new SyntaxError("Incomplete escape.");
            if (/[1-9bB]/.test(escaped)) throw new SyntaxError("Backreferences and word-boundary assertions are not supported.");
            if (escaped === "0" && /[0-9]/.test(this.#source[this.#at] ?? "")) throw new SyntaxError("Octal escapes are not supported.");
            if (escaped === "x" || escaped === "u") {
                const length = escaped === "x" ? 2 : 4;
                const digits = this.#source.slice(this.#at, this.#at + length);
                if (digits.length !== length || !/^[0-9a-f]+$/i.test(digits)) throw new SyntaxError("Use complete hexadecimal escapes.");
                this.#at += length;
            } else if (escaped === "c") {
                if (!/[a-z]/i.test(this.#source[this.#at] ?? "")) throw new SyntaxError("Invalid control escape.");
                ++this.#at;
            } else if (/[a-z]/i.test(escaped) && !"dDsSwWfnrtv".includes(escaped)) {
                throw new SyntaxError("Unsupported identity or Unicode property escape.");
            }
        }
        return { type: "char", source: this.#source.slice(start, this.#at) };
    }
}

function compile(expression: RegExp): Program {
    if (expression.unicode || expression.flags.includes("v"))
        throw new SyntaxError("Unicode flags u/v are not supported by partial validation.");
    const root = new PatternParser(expression.source).parse();
    const states: State[] = [];
    const tests = new Map<string, ((char: string) => boolean) | null>();
    const state = (): number => {
        if (states.length >= 4096) throw new RangeError("Regular expression exceeds the 4096-state limit.");
        states.push({ empty: [], edges: [] }); return states.length - 1;
    };
    const link = (from: number, to: number): void => { states[from]!.empty.push(to); };
    const predicate = (source: string): ((char: string) => boolean) | null => {
        if (tests.has(source)) return tests.get(source)!;
        const flags = (expression.ignoreCase ? "i" : "") + (expression.dotAll ? "s" : "");
        const matcher = new RegExp(`^(?:${source})$`, flags);
        const test = (char: string): boolean => matcher.test(char);
        // Exact non-emptiness over JavaScript's non-Unicode UTF-16 alphabet.
        // Common witnesses avoid a full scan for ordinary classes and literals.
        let viable = false;
        for (const char of "aAzZ09_- \n\r\tčžé中\0") if (test(char)) { viable = true; break; }
        if (!viable) for (let unit = 0; unit <= 0xffff; ++unit)
            if (test(String.fromCharCode(unit))) { viable = true; break; }
        const result = viable ? test : null; tests.set(source, result); return result;
    };
    const build = (node: Node): [number, number] => {
        const start = state(), end = state();
        if (node.type === "empty") link(start, end);
        else if (node.type === "char") {
            const test = predicate(node.source);
            if (test !== null) states[start]!.edges.push({ test, to: end });
        } else if (node.type === "choice") {
            for (const child of node.children) { const [a, b] = build(child); link(start, a); link(b, end); }
        } else if (node.type === "sequence") {
            let tail = start;
            for (const child of node.children) { const [a, b] = build(child); link(tail, a); tail = b; }
            link(tail, end);
        } else {
            let tail = start;
            for (let i = 0; i < node.min; ++i) { const [a, b] = build(node.child); link(tail, a); tail = b; }
            if (node.max === Infinity) {
                const [a, b] = build(node.child); link(tail, end); link(tail, a); link(b, tail);
            } else {
                for (let i = node.min; i < node.max; ++i) {
                    const [a, b] = build(node.child); link(tail, end); link(tail, a); tail = b;
                }
                link(tail, end);
            }
        }
        return [start, end];
    };
    const [start, end] = build(root);
    const predecessors = states.map(() => [] as number[]);
    states.forEach((value, from) => {
        for (const to of value.empty) predecessors[to]!.push(from);
        for (const edge of value.edges) predecessors[edge.to]!.push(from);
    });
    const reachable = new Set<number>([end]), pending = [end];
    while (pending.length > 0) for (const from of predecessors[pending.pop()!]!)
        if (!reachable.has(from)) { reachable.add(from); pending.push(from); }
    return { states, start, end, reachable };
}
function closure(program: Program, seeds: Iterable<number>): Set<number> {
    const result = new Set(seeds), pending = [...result];
    while (pending.length > 0) for (const to of program.states[pending.pop()!]!.empty)
        if (!result.has(to)) { result.add(to); pending.push(to); }
    return result;
}

/**
 * Full-value JavaScript RegExp validation with exact append-prefix Intermediate.
 * Supports literals, dot, classes, ordinary/noncapturing groups, alternatives,
 * greedy/lazy ?, *, + and {m,n}, and optional outer ^/$ anchors.
 * Uses UTF-16 matching (without u/v). Flags i/s work normally; d/g/m/y do not
 * change full-value matching. Lookarounds, backreferences, boundary assertions,
 * named groups, scoped modifiers and legacy identity/octal escapes are rejected.
 * Compilation is bounded to 4096 states, 64 nested groups and repeat counts 1024.
 */
export class CRegularExpressionValidator extends CValidator {
    #expression: RegExp;
    #program: Program;
    constructor(expression = /[\s\S]*/) {
        super();
        if (!(expression instanceof RegExp)) throw new TypeError("A RegExp is required.");
        const snapshot = new RegExp(expression.source, expression.flags);
        this.#program = compile(snapshot); this.#expression = snapshot;
    }
    /** Returns an independent copy; lastIndex never participates in validation. */
    regularExpression(): RegExp { return new RegExp(this.#expression.source, this.#expression.flags); }
    /** Compiles before committing so invalid/unsupported patterns leave the old validator intact. */
    setRegularExpression(expression: RegExp): void {
        if (!(expression instanceof RegExp)) throw new TypeError("A RegExp is required.");
        const snapshot = new RegExp(expression.source, expression.flags), program = compile(snapshot);
        this.#expression = snapshot; this.#program = program;
    }
    override validate(input: string): CValidatorState {
        const program = this.#program;
        let active = closure(program, [program.start]);
        // Intentionally iterate UTF-16 units, matching JavaScript without u/v.
        for (let i = 0; i < input.length; ++i) {
            const next = new Set<number>();
            for (const from of active) for (const edge of program.states[from]!.edges)
                if (edge.test(input[i]!)) next.add(edge.to);
            if (next.size === 0) return CValidatorState.Invalid;
            active = closure(program, next);
        }
        if (active.has(program.end)) return CValidatorState.Acceptable;
        for (const from of active) if (program.reachable.has(from)) return CValidatorState.Intermediate;
        return CValidatorState.Invalid;
    }
}
