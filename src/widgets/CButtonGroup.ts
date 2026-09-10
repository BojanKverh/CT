import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CAbstractButton } from "./CAbstractButton.js";

type CButtonConnections = {
	clickedSlot: () => void;
	toggledSlot: (checked: boolean) => void;
};

/** Implements the button group widget. */
export class CButtonGroup extends CObject {
	#m_buttons = new Map<CAbstractButton, CButtonConnections>();
	#m_exclusive = true;
	#m_updating = false;

	/** Public button clicked member. */
	readonly buttonClicked = new CSignal<[CAbstractButton]>();
	/** Public button toggled member. */
	readonly buttonToggled = new CSignal<[CAbstractButton, boolean]>();

	/** Creates a new instance. */
	constructor(parent: CObject | null = null) {
		/** Provides super behavior. */
		super(parent);
	}

	/** Adds button. */
	addButton(button: CAbstractButton): void {
		/** Provides if behavior. */
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

		/** Provides if behavior. */
		if (this.#m_exclusive && button.isChecked())
			this.#uncheckOthers(button);
	}

	/** Removes button. */
	removeButton(button: CAbstractButton): void {
		const connections = this.#m_buttons.get(button);

		/** Provides if behavior. */
		if (connections === undefined)
			return;

		button.clicked.disconnect(connections.clickedSlot);
		button.toggled.disconnect(connections.toggledSlot);

		this.#m_buttons.delete(button);
	}

	/** Provides buttons behavior. */
	buttons(): CAbstractButton[] {
		return [...this.#m_buttons.keys()];
	}

	/** Returns whether the exclusive condition is active. */
	isExclusive(): boolean {
		return this.#m_exclusive;
	}

	/** Sets the exclusive. */
	setExclusive(exclusive: boolean): void {
		/** Provides if behavior. */
		if (this.#m_exclusive === exclusive)
			return;

		this.#m_exclusive = exclusive;

		/** Provides if behavior. */
		if (exclusive) {
			const checked = this.checkedButton();

			/** Provides if behavior. */
			if (checked !== null)
				this.#uncheckOthers(checked);
		}
	}

	/** Provides checked button behavior. */
	checkedButton(): CAbstractButton | null {
		/** Provides for behavior. */
		for (const button of this.#m_buttons.keys()) {
			/** Provides if behavior. */
			if (button.isChecked())
				return button;
		}

		return null;
	}

	#buttonToggled(button: CAbstractButton, checked: boolean): void {
		/** Provides if behavior. */
		if (this.#m_updating)
			return;

		/** Provides if behavior. */
		if (this.#m_exclusive && checked)
			this.#uncheckOthers(button);

		this.buttonToggled.emit(button, checked);
	}

	#uncheckOthers(checkedButton: CAbstractButton): void {
		this.#m_updating = true;

		try {
			/** Provides for behavior. */
			for (const button of this.#m_buttons.keys()) {
				/** Provides if behavior. */
				if (button !== checkedButton && button.isChecked())
					button.setChecked(false);
			}
		} finally {
			this.#m_updating = false;
		}
	}
}
