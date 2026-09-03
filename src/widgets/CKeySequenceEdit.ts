import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusEvent } from "../events/CFocusEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";

export class CKeySequenceEdit extends CWidget {
	readonly keySequenceChanged = new CSignal<[string]>();
	readonly editingFinished = new CSignal<[]>();

	#m_keySequence = "";

	constructor(parent: CWidget | null = null) {
		super(parent);

		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	keySequence(): string {
		return this.#m_keySequence;
	}

	setKeySequence(sequence: string): void {
		if (this.#m_keySequence === sequence)
			return;

		this.#m_keySequence = sequence;
		this.keySequenceChanged.emit(this.#m_keySequence);
		this.update();
	}

	clear(): void {
		this.setKeySequence("");
	}

	override sizeHint(): CSize {
		return new CSize(160, 28);
	}

	protected override paintEvent(painter: CPainter): void {
		this.style().drawKeySequenceEdit(painter, this);
	}

	protected override keyPressEvent(event: CKeyEvent): void {
		const key = event.key();

		if (key === "Backspace" || key === "Delete") {
			this.clear();
			event.accept();
			return;
		}

		if (this.#isModifierKey(key)) {
			event.accept();
			return;
		}

		this.setKeySequence(this.#sequenceFromEvent(event));
		event.accept();
	}

	protected override mousePressEvent(event: CMouseEvent): void {
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		event.accept();
	}

	protected override focusOutEvent(event: CFocusEvent): void {
		this.editingFinished.emit();
		super.focusOutEvent(event);
	}

	#sequenceFromEvent(event: CKeyEvent): string {
		const parts: string[] = [];
        const altGraph = event.altGraph();

		if (event.ctrl() || altGraph)
			parts.push("Ctrl");

		if (event.alt() || altGraph)
			parts.push("Alt");

		if (event.shift())
			parts.push("Shift");

		if (event.meta())
			parts.push("Meta");

		parts.push(this.#keyName(event));
		return parts.join("+");
	}

    #keyName(event: CKeyEvent): string {
	    const code = event.code();
	    const key = event.key();

	    if (code.startsWith("Key"))
		    return code.slice(3);

	    if (code.startsWith("Digit"))
		    return code.slice(5);

	    if (key === " ")
		    return "Space";

	    switch (key) {
	    case "ArrowLeft":
		    return "Left";
	    case "ArrowRight":
		    return "Right";
	    case "ArrowUp":
		    return "Up";
	    case "ArrowDown":
		    return "Down";
	    }

	    if (key.length === 1)
		    return key.toUpperCase();

	    return key;
    }

    #isModifierKey(key: string): boolean {
		return key === "Control"
			|| key === "Shift"
			|| key === "Alt"
			|| key === "Meta";
	}
}