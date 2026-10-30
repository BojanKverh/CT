import { CSignal } from "../core/CSignal.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CRect } from "../geometry/CRect.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CStyleOptionLineEdit } from "../gui/CStyleOptionLineEdit.js";
import type { CPainter } from "../painting/CPainter.js";
import { evaluateNumberExpression, isNumberExpressionInput } from "../util/CNumberExpression.js";
import { CLineEdit } from "./CLineEdit.js";
import type { CWidget } from "./CWidget.js";

/**
 * An arithmetic line editor. The underlying text is always the expression,
 * so changing focus does not replace it or clear its undo history.
 * When unfocused, painting shows the committed value or a red ERR marker.
 */
export class CNumberEdit extends CLineEdit {
    readonly expressionChanged = new CSignal<[string]>();
    readonly valueChanged = new CSignal<[number]>();

    #m_value = 0;
    #m_decimals = 2;
    #m_error = "";

    constructor(parent: CWidget | null = null) {
        super(parent);
        super.setText("0");
        this.textEdited.connect(text => {
            this.#m_error = "";
            this.setValidationError(false);
            this.expressionChanged.emit(text);
        });
    }

    expression(): string { return this.text(); }
    value(): number { return this.#m_value; }
    decimals(): number { return this.#m_decimals; }
    errorString(): string { return this.#m_error; }

    /** Maximum displayed decimal places; trailing zeros are omitted. */
    setDecimals(decimals: number): void {
        if (!Number.isFinite(decimals))
            throw new RangeError("Decimal places must be finite.");
        this.#m_decimals = Math.max(0, Math.min(20, Math.trunc(decimals)));
        this.update();
    }

    /**
     * Sets and evaluates an expression. Forbidden characters reject the whole
     * assignment. Invalid arithmetic keeps the expression for correction and
     * leaves value() unchanged. Returns whether evaluation succeeded.
     */
    setExpression(expression: string): boolean {
        if (!isNumberExpressionInput(expression)) return false;
        const changed = expression !== this.expression();
        super.setText(expression);
        if (changed) this.expressionChanged.emit(expression);
        return this.commit();
    }

    override setText(text: string): void { this.setExpression(text); }

    /** Replaces the expression with a numeric literal. */
    setValue(value: number): void {
        if (!Number.isFinite(value))
            throw new RangeError("The value must be finite.");
        this.setExpression(decimalLiteral(value));
    }

    /** Text currently painted; text()/expression() always return the formula. */
    override displayText(): string {
        if (this.hasFocus()) return this.expression();
        if (this.hasValidationError()) return "ERR";
        const rounded = Number(this.#m_value.toFixed(this.#m_decimals));
        return rounded === 0 ? "0" : decimalLiteral(rounded);
    }

    /** Rejects an entire insertion/paste if any character is forbidden. */
    override insert(text: string): void {
        if (isNumberExpressionInput(text)) super.insert(text);
    }

    /** Commits a complete expression without rounding the stored value. */
    commit(): boolean {
        let value: number;
        try {
            value = evaluateNumberExpression(this.expression());
        } catch (error) {
            this.#m_error = error instanceof Error ? error.message : "Invalid expression.";
            this.setValidationError(true);
            return false;
        }
        this.#m_error = "";
        this.setValidationError(false);
        if (value !== this.#m_value) {
            this.#m_value = value;
            this.valueChanged.emit(value);
        }
        this.update();
        return true;
    }

    protected override keyPressEvent(event: CKeyEvent): void {
        if (event.key() === "Enter" || event.key() === "Return") {
            if (this.commit()) {
                this.returnPressed.emit();
            }
            const focused = this.hasFocus();
            this.clearFocus();
            // FocusOut emits editingFinished for a focused editor, including
            // invalid input whose unfocused representation is ERR.
            if (!focused) this.editingFinished.emit();
            event.accept();
            return;
        }
        if (event.key().length === 1 && !event.ctrl() && !event.alt()
            && !isNumberExpressionInput(event.key())) {
            event.accept();
            return;
        }
        super.keyPressEvent(event);
    }

    protected override focusInEvent(event: CFocusEvent): void {
        super.focusInEvent(event);
        this.update();
    }

    protected override focusOutEvent(event: CFocusEvent): void {
        this.commit();
        super.focusOutEvent(event);
        this.update();
    }

    protected override paintEvent(painter: CPainter): void {
        if (this.hasFocus()) {
            super.paintEvent(painter);
            return;
        }
        const option = new CStyleOptionLineEdit();
        option.initFromLineEdit(this);
        option.text = this.displayText();
        // Draw the error label explicitly in red after the styled background.
        if (this.hasValidationError()) option.text = "";
        option.cursorVisible = false;
        option.selectionStart = option.selectionEnd = 0;
        option.horizontalOffset = Math.max(0,
            new CFontMetrics(this.font()).textWidth(option.text) - Math.max(0, this.width() - 11));
        this.style().drawLineEdit(painter, option);
        if (this.hasValidationError()) {
            painter.save();
            painter.setStrokeStyle("#d32f2f");
            painter.setLineWidth(2);
            painter.strokeRect(new CRect(1, 1,
                Math.max(0, this.width() - 2), Math.max(0, this.height() - 2)));
            painter.clipRect(new CRect(5, 2,
                Math.max(0, this.width() - 10), Math.max(0, this.height() - 4)));
            painter.setFont(this.font());
            painter.setTextAlign("left");
            painter.setTextBaseline("middle");
            painter.setPen("#d32f2f");
            painter.drawText("ERR", 5, this.height() / 2);
            painter.restore();
        }
    }
}

/** Expands scientific notation so setValue() produces an editable expression. */
function decimalLiteral(value: number): string {
    const text = String(value);
    const [mantissa, exponentText] = text.toLowerCase().split("e");
    if (exponentText === undefined) return text;
    const negative = mantissa!.startsWith("-");
    const unsigned = negative ? mantissa!.slice(1) : mantissa!;
    const digits = unsigned.replace(".", "");
    const point = (unsigned.indexOf(".") < 0 ? unsigned.length : unsigned.indexOf("."))
        + Number(exponentText);
    const decimal = point <= 0 ? "0." + "0".repeat(-point) + digits
        : point >= digits.length ? digits + "0".repeat(point - digits.length)
        : digits.slice(0, point) + "." + digits.slice(point);
    return (negative ? "-" : "") + decimal;
}
