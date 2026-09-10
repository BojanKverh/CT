import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusEvent } from "../events/CFocusEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CStyleOptionKeySequenceEdit } from "../gui/CStyleOptionKeySequenceEdit.js";

/** Implements the key sequence edit widget. */
export class CKeySequenceEdit extends CWidget {
	/** Signal emitted when key sequence changes. */
	readonly keySequenceChanged = new CSignal<[string]>();
	/** Public editing finished member. */
	readonly editingFinished = new CSignal<[]>();

	#m_keySequence = "";

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null) {
		/** Provides super behavior. */
		super(parent);

		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

	/** Provides key sequence behavior. */
	keySequence(): string {
		return this.#m_keySequence;
	}

	/** Sets the key sequence. */
	setKeySequence(sequence: string): void {
		/** Provides if behavior. */
		if (this.#m_keySequence === sequence)
			return;

		this.#m_keySequence = sequence;
		this.keySequenceChanged.emit(this.#m_keySequence);
		this.update();
	}

	/** Clears the current contents. */
	clear(): void {
		this.setKeySequence("");
	}

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize {
		return new CSize(160, 28);
	}

	/** Handles the paint event. */
	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionKeySequenceEdit();
		option.initFromKeySequenceEdit(this);

		this.style().drawKeySequenceEdit(painter, option);
	}

	/** Handles the key press event. */
	protected override keyPressEvent(event: CKeyEvent): void {
		const key = event.key();

		/** Provides if behavior. */
		if (key === "Backspace" || key === "Delete") {
			this.clear();
			event.accept();
			return;
		}

		/** Provides if behavior. */
		if (this.#isModifierKey(key)) {
			event.accept();
			return;
		}

		this.setKeySequence(this.#sequenceFromEvent(event));
		event.accept();
	}

	/** Handles the mouse press event. */
	protected override mousePressEvent(event: CMouseEvent): void {
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		event.accept();
	}

	/** Handles the focus out event. */
	protected override focusOutEvent(event: CFocusEvent): void {
		this.editingFinished.emit();
		super.focusOutEvent(event);
	}

	#sequenceFromEvent(event: CKeyEvent): string {
		const parts: string[] = [];
        const altGraph = event.altGraph();

		/** Provides if behavior. */
		if (event.ctrl() || altGraph)
			parts.push("Ctrl");

		/** Provides if behavior. */
		if (event.alt() || altGraph)
			parts.push("Alt");

		/** Provides if behavior. */
		if (event.shift())
			parts.push("Shift");

		/** Provides if behavior. */
		if (event.meta())
			parts.push("Meta");

		parts.push(this.#keyName(event));
		return parts.join("+");
	}

    #keyName(event: CKeyEvent): string {
	    const code = event.code();
	    const key = event.key();

	    /** Provides if behavior. */
	    if (code.startsWith("Key"))
		    return code.slice(3);

	    /** Provides if behavior. */
	    if (code.startsWith("Digit"))
		    return code.slice(5);

	    /** Provides if behavior. */
	    if (key === " ")
		    return "Space";

	    /** Provides switch behavior. */
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

	    /** Provides if behavior. */
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