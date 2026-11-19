/** @module Utilities/CNumberExpression */
/** Characters accepted while a numeric expression is being edited. */
export function isNumberExpressionInput(text: string): boolean {
    return /^[0-9 .,()+*/-]*$/.test(text);
}

/**
 * Evaluates decimal arithmetic without executing JavaScript.
 * Supports +, -, *, /, parentheses and unary signs. Decimal separators may
 * be either a dot or a comma. Throws for incomplete or non-finite results.
 */
export function evaluateNumberExpression(text: string): number {
    if (!isNumberExpressionInput(text))
        throw new SyntaxError("Only numbers, spaces and + - * / ( ) . , are allowed.");

    let position = 0;
    let depth = 0;
    const skipSpaces = (): void => {
        while (text[position] === " ") ++position;
    };
    const finite = (value: number): number => {
        if (!Number.isFinite(value))
            throw new RangeError("The result must be a finite number.");
        return value;
    };
    const factor = (): number => {
        skipSpaces();
        let sign = 1;
        while (text[position] === "+" || text[position] === "-") {
            if (text[position++] === "-") sign = -sign;
            skipSpaces();
        }
        if (text[position] === "(") {
            if (++depth > 128)
                throw new RangeError("Too many nested parentheses.");
            ++position;
            const value = sum();
            skipSpaces();
            if (text[position] !== ")")
                throw new SyntaxError("A closing parenthesis is missing.");
            ++position;
            --depth;
            return sign * value;
        }
        const start = position;
        let digits = 0;
        while (isDigit(text[position])) { ++position; ++digits; }
        if (text[position] === "." || text[position] === ",") {
            ++position;
            while (isDigit(text[position])) { ++position; ++digits; }
        }
        if (digits === 0)
            throw new SyntaxError("A number or a parenthesized expression is required.");
        return finite(sign * Number(text.slice(start, position).replace(",", ".")));
    };
    const product = (): number => {
        let value = factor();
        for (;;) {
            skipSpaces();
            const operator = text[position];
            if (operator !== "*" && operator !== "/") return value;
            ++position;
            const right = factor();
            if (operator === "/" && right === 0)
                throw new RangeError("Division by zero is not allowed.");
            value = finite(operator === "*" ? value * right : value / right);
        }
    };
    const sum = (): number => {
        let value = product();
        for (;;) {
            skipSpaces();
            const operator = text[position];
            if (operator !== "+" && operator !== "-") return value;
            ++position;
            const right = product();
            value = finite(operator === "+" ? value + right : value - right);
        }
    };
    const result = sum();
    skipSpaces();
    if (position !== text.length)
        throw new SyntaxError("An operator is missing or the expression is incomplete.");
    return result === 0 ? 0 : result;
}

function isDigit(character: string | undefined): boolean {
    return character !== undefined && character >= "0" && character <= "9";
}
