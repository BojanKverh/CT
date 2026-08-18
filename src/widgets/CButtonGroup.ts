import { CObject } from "../core/CObject.js";
import { CSignal } from "../core/CSignal.js";
import { CAbstractButton } from "./CAbstractButton.js";

type CButtonConnections = {
	clickedSlot: () => void;
	toggledSlot: (checked: boolean) => void;
};

export class CButtonGroup extends CObject {
	#m_buttons = new Map<CAbstractButton, CButtonConnections>();
	#m_exclusive = true;
	#m_updating = false;

	readonly buttonClicked = new CSignal<[CAbstractButton]>();
	readonly buttonToggled = new CSignal<[CAbstractButton, boolean]>();

	constructor(parent: CObject | null = null) {
		super(parent);
	}

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

	removeButton(button: CAbstractButton): void {
		const connections = this.#m_buttons.get(button);

		if (connections === undefined)
			return;

		button.clicked.disconnect(connections.clickedSlot);
		button.toggled.disconnect(connections.toggledSlot);

		this.#m_buttons.delete(button);
	}

	buttons(): CAbstractButton[] {
		return [...this.#m_buttons.keys()];
	}

	isExclusive(): boolean {
		return this.#m_exclusive;
	}

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
