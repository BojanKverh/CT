/** @module Widgets/CKeySequenceEdit */
import { CSignal } from "../core/CSignal.js";
import { CWidget } from "./CWidget.js";
import { CKeyEvent } from "../events/CKeyEvent.js";
import { CFocusEvent } from "../events/CFocusEvent.js";
import type { CPainter } from "../painting/CPainter.js";
import { CSize } from "../geometry/CSize.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CMouseButton, CMouseEvent } from "../events/CMouseEvent.js";
import { CStyleOptionKeySequenceEdit } from "../gui/CStyleOptionKeySequenceEdit.js";

/** Captures a keyboard shortcut and formats its key sequence for display.
 *
 * @example
 * With an existing application and parent widget, use the recorded sequence to configure a shortcut owned by that parent. An empty sequence disables matching.
 * ```ts
 * import { CWidget, CKeySequenceEdit, CShortcut } from "canvas-toolkit-lib";
 *
 * function createShortcutRecorder(parent: CWidget) {
 *     const shortcut = new CShortcut("Ctrl+K", parent);
 *     shortcut.activated.connect(() => console.log("Open search"));
 *     const recorder = new CKeySequenceEdit(parent);
 *     recorder.setKeySequence(shortcut.key());
 *     recorder.keySequenceChanged.connect(sequence => shortcut.setKey(sequence));
 *     return recorder;
 * }
 * ```
 */
export class CKeySequenceEdit extends CWidget {
    /** Allows recording a combination without activating application shortcuts. */
    capturesShortcuts(): boolean { return true; }
    /**
    * Emitted with the formatted shortcut after the recorded key combination changes.
    * @group Signals
    */
    readonly keySequenceChanged = new CSignal<[string]>();
    /**
    * Emitted when the editor finishes an editing interaction.
    * @group Signals
    */
    readonly editingFinished = new CSignal<[]>();

	#m_keySequence = "";

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null) {
		super(parent);

		this.setFocusPolicy(CFocusPolicy.StrongFocus);
	}

    /**
    * Returns the captured shortcut formatted as a key-sequence string.
    */
    keySequence(): string {
		return this.#m_keySequence;
	}

    /**
    * Replaces the shortcut sequence displayed by the editor.
    */
    setKeySequence(sequence: string): void {
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

	override sizeHint(): CSize {
		return new CSize(160, 28);
	}

	protected override paintEvent(painter: CPainter): void {
		const option = new CStyleOptionKeySequenceEdit();
		option.initFromKeySequenceEdit(this);

		this.style().drawKeySequenceEdit(painter, option);
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
