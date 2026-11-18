import { CSignal } from "../core/CSignal.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton } from "../events/CMouseEvent.js";
import type { CMouseEvent } from "../events/CMouseEvent.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CLineEdit } from "./CLineEdit.js";
import { CWidget } from "./CWidget.js";


/** Defines the public cline edit section API. */
export type CLineEditSection = {
	start: number;
	length: number;
};


/** Implements the section line edit widget. */
export class CSectionLineEdit extends CLineEdit
{
	/** Signal emitted when section changes. */
	readonly sectionChanged = new CSignal<[number]>();
	/** Public step requested member. */
	readonly stepRequested = new CSignal<[number, number]>();
	/** Emitted when a numeric digit is entered for the active section. */
	readonly digitEntered = new CSignal<[number, number]>();
    /** Public previous section requested member. */
    readonly previousSectionRequested = new CSignal<[number, number]>();
    /** Public next section requested member. */
    readonly nextSectionRequested = new CSignal<[number, number]>();

	#m_sections: CLineEditSection[] = [];
	#m_currentSection = -1;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);

		this.setReadOnly(true);
	}

	/**
	 * Reads the sections of the section line edit.
	 * @returns The sections.
	 */
	sections(): readonly CLineEditSection[]
	{
		return this.#m_sections.map(section => ({
			start: section.start,
			length: section.length
		}));
	}

	/**
	 * Sets the sections.
	 * @param sections Sections.
	 */
	setSections(sections: CLineEditSection[]): void
	{
		this.#m_sections = sections.map(section => ({
			start: section.start,
			length: section.length
		}));

		/** Provides if behavior. */
		if (this.#m_sections.length === 0) {
			this.#m_currentSection = -1;
			this.clearSelection();
			this.update();
			return;
		}

		this.#updateSelection();
	}

	/**
	 * Returns the current section.
	 * @returns The current section.
	 */
	currentSection(): number
	{
		return this.#m_currentSection;
	}

	/**
	 * Sets the current section.
	 * @param section Section.
	 */
	setCurrentSection(section: number): void
	{
        /** Provides if behavior. */
        if (section < 0 || section >= this.#m_sections.length)
			return;

		/** Provides if behavior. */
		if (section === this.#m_currentSection) {
			this.#updateSelection();
			return;
		}

		this.#m_currentSection = section;

		this.#updateSelection();
		this.sectionChanged.emit(section);
	}

    /**
     * Responds to focus exit for the section line edit. May accept the event.
     * @param event Event for focus exit.
     */
    protected override focusOutEvent(event: CFocusEvent): void {
        this.clearSelection();
        event.accept();
    }

	/**
	 * Responds to a pointer button press for the section line edit. May request focus and accept or ignore the event depending on the input.
	 * @param event Event for a pointer button press.
	 */
	protected override mousePressEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const section = this.#sectionAt(event.x());

		/** Provides if behavior. */
		if (section === -1) {
			event.ignore();
			return;
		}

		this.setCurrentSection(section);
		this.setFocus();

		event.accept();
	}

	/**
	 * Responds to pointer movement for the section line edit. May mark the event ignored.
	 * @param event Event for pointer movement.
	 */
	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		event.ignore();
	}

	/**
	 * Responds to a pointer button release for the section line edit. May accept or ignore the event depending on the input.
	 * @param event Event for a pointer button release.
	 */
	protected override mouseReleaseEvent(event: CMouseEvent): void
	{
		/** Provides if behavior. */
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		event.accept();
	}

	/**
	 * Responds to a key press for the section line edit. May accept or ignore the event depending on the input. May emit `digitEntered`, `stepRequested`.
	 * @param event Event for a key press.
	 */
	protected override keyPressEvent(event: CKeyEvent): void
	{
		/** Provides if behavior. */
		if (this.#m_sections.length === 0) {
			event.ignore();
			return;
		}

		if (/^[0-9]$/.test(event.key())) {
			this.digitEntered.emit(
				this.#m_currentSection,
				Number(event.key())
			);
			event.accept();
			return;
		}

		/** Provides switch behavior. */
		switch (event.key()) {
			case "ArrowLeft":
				this.#previousSection();
				event.accept();
				return;

			case "ArrowRight":
				this.#nextSection();
				event.accept();
				return;

			case "ArrowUp":
				this.stepRequested.emit(
					this.#m_currentSection,
					1
				);
				event.accept();
				return;

			case "ArrowDown":
				this.stepRequested.emit(
					this.#m_currentSection,
					-1
				);
				event.accept();
				return;
		}

		super.keyPressEvent(event);
	}

	#previousSection(): void
	{
        const prev = this.#m_currentSection;
        this.setCurrentSection(
			(
				this.#m_currentSection -
				1 +
				this.#m_sections.length
			) % this.#m_sections.length
		);
        this.previousSectionRequested.emit(prev, this.#m_currentSection);
	}

	#nextSection(): void
	{
		const prev = this.#m_currentSection;
        this.setCurrentSection(
			(this.#m_currentSection + 1) %
				this.#m_sections.length
		);
        this.nextSectionRequested.emit(prev, this.#m_currentSection);
	}

	#sectionAt(x: number): number
	{
		const metrics = new CFontMetrics(this.font());
		const textX = x - 5;

		/** Provides for behavior. */
		for (let i = 0; i < this.#m_sections.length; ++i) {
			const section = this.#m_sections[i]!;

			const before = this.text().slice(
				0,
				section.start
			);

			const selected = this.text().slice(
				section.start,
				section.start + section.length
			);

			const left = metrics.textWidth(before);
			const right =
				left + metrics.textWidth(selected);

			/** Provides if behavior. */
			if (textX >= left && textX <= right)
				return i;
		}

		return -1;
	}

	#updateSelection(): void
	{
		/** Provides if behavior. */
		if (
			this.#m_currentSection < 0 ||
			this.#m_currentSection >= this.#m_sections.length
		) {
			this.clearSelection();
			this.update();
			return;
		}

		const section =
			this.#m_sections[this.#m_currentSection]!;

		this.setSelection(
			section.start,
			section.start + section.length
		);
	}
}
