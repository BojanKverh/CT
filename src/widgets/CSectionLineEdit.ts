/** @module Widgets/CSectionLineEdit */
import { CSignal } from "../core/CSignal.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import type { CKeyEvent } from "../events/CKeyEvent.js";
import { CMouseButton } from "../events/CMouseEvent.js";
import type { CMouseEvent } from "../events/CMouseEvent.js";
import { CFontMetrics } from "../gui/CFontMetrics.js";
import { CLineEdit } from "./CLineEdit.js";
import { CWidget } from "./CWidget.js";

/**
 * UTF-16 start offset and length of one independently navigable date or time section.
 */
export type CLineEditSection = {
	start: number;
	length: number;
};

/** Shared editing surface for structured date and time sections. */
export class CSectionLineEdit extends CLineEdit
{
    /**
    * Emitted with the zero-based active section index after structured-editor navigation.
    * @group Signals
    */
    readonly sectionChanged = new CSignal<[number]>();
    /**
    * Emitted with the active section index and signed step direction for Up or Down.
    * @group Signals
    */
    readonly stepRequested = new CSignal<[number, number]>();
    /**
    * Emitted when a numeric digit is entered for the active section.
    * @group Signals
    */
    readonly digitEntered = new CSignal<[number, number]>();
    /**
    * Emitted with the previous and resulting section indexes after leftward navigation.
    * @group Signals
    */
    readonly previousSectionRequested = new CSignal<[number, number]>();
    /**
    * Emitted with the previous and resulting section indexes after rightward navigation.
    * @group Signals
    */
    readonly nextSectionRequested = new CSignal<[number, number]>();

	#m_sections: CLineEditSection[] = [];
	#m_currentSection = -1;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null)
	{
		super(parent);

		this.setReadOnly(true);
	}

    /**
    * Copies the UTF-16 offsets and lengths of all navigable sections.
    */
    sections(): readonly CLineEditSection[]
	{
		return this.#m_sections.map(section => ({
			start: section.start,
			length: section.length
		}));
	}

    /**
    * Replaces the structured editable sections displayed within the line edit.
    */
    setSections(sections: CLineEditSection[]): void
	{
		this.#m_sections = sections.map(section => ({
			start: section.start,
			length: section.length
		}));

		if (this.#m_sections.length === 0) {
			this.#m_currentSection = -1;
			this.clearSelection();
			this.update();
			return;
		}

		this.#updateSelection();
	}

    /**
    * Returns the index of the section targeted by keyboard editing.
    */
    currentSection(): number
	{
		return this.#m_currentSection;
	}

    /**
    * Moves editing focus to a section of the structured input.
    */
    setCurrentSection(section: number): void
	{
        if (section < 0 || section >= this.#m_sections.length)
			return;

		if (section === this.#m_currentSection) {
			this.#updateSelection();
			return;
		}

		this.#m_currentSection = section;

		this.#updateSelection();
		this.sectionChanged.emit(section);
	}

    protected override focusOutEvent(event: CFocusEvent): void {
        this.clearSelection();
        event.accept();
    }

	protected override mousePressEvent(event: CMouseEvent): void
	{
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		const section = this.#sectionAt(event.x());

		if (section === -1) {
			event.ignore();
			return;
		}

		this.setCurrentSection(section);
		this.setFocus();

		event.accept();
	}

	protected override mouseMoveEvent(event: CMouseEvent): void
	{
		event.ignore();
	}

	protected override mouseReleaseEvent(event: CMouseEvent): void
	{
		if (event.button() !== CMouseButton.LeftButton) {
			event.ignore();
			return;
		}

		event.accept();
	}

	protected override keyPressEvent(event: CKeyEvent): void
	{
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

			if (textX >= left && textX <= right)
				return i;
		}

		return -1;
	}

	#updateSelection(): void
	{
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
