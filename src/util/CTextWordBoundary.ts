/** Internal word navigation in UTF-16 editor offsets. */
function positionInText(text: string, position: number): number {
    let pos = Number.isFinite(position)
        ? Math.max(0, Math.min(text.length, Math.trunc(position))) : 0;
    if (pos > 0 && pos < text.length
        && /[\uDC00-\uDFFF]/u.test(text[pos]!)
        && /[\uD800-\uDBFF]/u.test(text[pos - 1]!))
        --pos;
    return pos;
}

function previousCharacter(text: string, position: number): number {
    return positionInText(text, position - 1);
}

function category(character: string): number {
    return /\s/u.test(character) ? 1
        : /[\p{L}\p{N}\p{M}_]/u.test(character) ? 0 : 2;
}

function characterAt(text: string, position: number): string {
    return String.fromCodePoint(text.codePointAt(position)!);
}

/** Skips preceding whitespace, then moves to the beginning of the preceding token. */
export function previousWordPosition(text: string, position: number): number {
    let pos = positionInText(text, position);
    while (pos > 0 && category(characterAt(text, previousCharacter(text, pos))) === 1)
        pos = previousCharacter(text, pos);
    if (pos === 0) return 0;
    const kind = category(characterAt(text, previousCharacter(text, pos)));
    while (pos > 0 && category(characterAt(text, previousCharacter(text, pos))) === kind)
        pos = previousCharacter(text, pos);
    return pos;
}

/** Skips the current token and following whitespace, stopping at the next token. */
export function nextWordPosition(text: string, position: number): number {
    let pos = positionInText(text, position);
    if (pos === text.length) return pos;
    const kind = category(characterAt(text, pos));
    if (kind !== 1) {
        while (pos < text.length && category(characterAt(text, pos)) === kind)
            pos += characterAt(text, pos).length;
    }
    while (pos < text.length && category(characterAt(text, pos)) === 1)
        pos += characterAt(text, pos).length;
    return pos;
}

const graphemes = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

/** Moves to the next grapheme boundary, using UTF-16 offsets. */
export function nextGraphemePosition(text: string, position: number): number {
    if (position >= text.length) return text.length;
    const segment = graphemes?.segment(text).containing(position);
    if (segment !== undefined) return segment.index + segment.segment.length;
    const start = positionInText(text, position);
    return start + characterAt(text, start).length;
}

/** Moves to the previous grapheme boundary, using UTF-16 offsets. */
export function previousGraphemePosition(text: string, position: number): number {
    return graphemes?.segment(text).containing(position - 1)?.index
        ?? previousCharacter(text, position);
}
