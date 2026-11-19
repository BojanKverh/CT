/** @module Widgets/CButtonGroup */
import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CAbstractButton } from "./CAbstractButton.js";

type CButtonConnections = {
	clickedSlot: () => void;
	toggledSlot: (checked: boolean) => void;
};

/** Coordinates button membership and exclusive check state and forwards group activation signals. */
export class CButtonGroup extends CObject {
	#m_buttons = new Map<CAbstractButton, CButtonConnections>();
	#m_exclusive = true;
	#m_updating = false;

    /**
    * Emitted with the group id of the button that was activated.
    * @group Signals
    */
    readonly buttonClicked = new CSignal<[CAbstractButton]>();
    /**
    * Emitted with the button group id and its new checked state.
    * @group Signals
    */
    readonly buttonToggled = new CSignal<[CAbstractButton, boolean]>();

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CObject | null = null) {
		super(parent);
	}

    /** Adds button. */
    addButton(button: CAbstractButton): void {
		if (this.#m_buttons.has(button))
			return;

		const clickedSlot = () => {
			this.buttonClicked.emit(button);
		};

		const toggledSlot = (checked: boolean) => {
			this.#buttonToggled(button, checked);
		};

		button.clicked.connect(clickedSlot);
		button.toggled.connect(toggledSlot);

		this.#m_buttons.set(button, { clickedSlot, toggledSlot });

		if (this.#m_exclusive && button.isChecked())
			this.#uncheckOthers(button);
	}

    /** Removes button. */
    removeButton(button: CAbstractButton): void {
		const connections = this.#m_buttons.get(button);

		if (connections === undefined)
			return;

		button.clicked.disconnect(connections.clickedSlot);
		button.toggled.disconnect(connections.toggledSlot);

		this.#m_buttons.delete(button);
	}

    /**
    * Returns the registered button collection.
    */
    buttons(): CAbstractButton[] {
		return [...this.#m_buttons.keys()];
	}

    /**
    * Whether checking one member clears the other checked members.
    * The initial value is `true`.
    */
    isExclusive(): boolean {
		return this.#m_exclusive;
	}

    /**
    * Controls whether checking a member unchecks other group members.
    */
    setExclusive(exclusive: boolean): void {
		if (this.#m_exclusive === exclusive)
			return;

		this.#m_exclusive = exclusive;

		if (exclusive) {
			const checked = this.checkedButton();

			if (checked !== null)
				this.#uncheckOthers(checked);
		}
	}

    /**
    * Returns a currently checked group member or null.
    */
    checkedButton(): CAbstractButton | null {
		for (const button of this.#m_buttons.keys()) {
			if (button.isChecked())
				return button;
		}

		return null;
	}

	#buttonToggled(button: CAbstractButton, checked: boolean): void {
		if (this.#m_updating)
			return;

		if (this.#m_exclusive && checked)
			this.#uncheckOthers(button);

		this.buttonToggled.emit(button, checked);
	}

	#uncheckOthers(checkedButton: CAbstractButton): void {
		this.#m_updating = true;

		try {
			for (const button of this.#m_buttons.keys()) {
				if (button !== checkedButton && button.isChecked())
					button.setChecked(false);
			}
		} finally {
			this.#m_updating = false;
		}
	}
}
