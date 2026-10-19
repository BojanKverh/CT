/**
 * Internal text-selection boundaries in UTF-16 offsets, matching editor indices.
 * Paragraph selections include the terminating newline, when present.
 */
export function textSelectionRange(
    text: string, position: number, paragraph = false
): [number, number] {
    const pos = Math.max(0, Math.min(text.length, Math.trunc(position)));
    if (paragraph) {
        const start = pos === 0 ? 0 : text.lastIndexOf("\n", pos - 1) + 1;
        const newline = text.indexOf("\n", pos);
        return [start, newline < 0 ? text.length : newline + 1];
    }
    if (text.length === 0) return [0, 0];
    const characters = Array.from(text);
    const offsets = [0];
    for (const character of characters)
        offsets.push(offsets[offsets.length - 1]! + character.length);
    let index = 0;
    while (index + 1 < characters.length && offsets[index + 1]! <= pos) ++index;
    const category = (character: string): number =>
        character === "\n" ? 3 : /[\p{L}\p{N}\p{M}_]/u.test(character) ? 0
            : /\s/u.test(character) ? 1 : 2;
    const kind = category(characters[index]!);
    let start = index, end = index + 1;
    if (kind !== 3) {
        while (start > 0 && category(characters[start - 1]!) === kind) --start;
        while (end < characters.length && category(characters[end]!) === kind) ++end;
    }
    return [offsets[start]!, offsets[end]!];
}
