/** @module Widgets/CDateEdit */
import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import { CCalendarWidget } from "./CCalendarWidget.js";
import type { CLineEditSection } from "./CSectionLineEdit.js";
import { CSectionLineEdit } from "./CSectionLineEdit.js";
import { CPopupWidget } from "./CPopupWidget.js";
import { CToolButton } from "./CToolButton.js";
import { CWidget } from "./CWidget.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import type { CFocusEvent } from "../events/CFocusEvent.js";
import { CEventType } from "../events/CEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";

type CDateSection = "day" | "month" | "year";

interface CDateSectionInfo
{
	type: CDateSection;
	start: number;
	length: number;
}

/** Section-based date input with validation and an optional calendar popup. */
export class CDateEdit extends CWidget
{
    /**
    * Logical pixel width reserved for the calendar popup button.
    */
    static readonly ButtonWidth = 28;

    /**
    * Emitted with an independent Date containing the updated local calendar date.
    * @group Signals
    */
    readonly dateChanged = new CSignal<[Date]>();

	#m_date: Date;
	#m_minimumDate: Date;
	#m_maximumDate: Date;

	#m_displayFormat = "dd.MM.yyyy";
	#m_calendarPopup = true;

	#m_lineEdit: CSectionLineEdit;
	#m_button: CToolButton;
	#m_popup: CPopupWidget;
	#m_calendar: CCalendarWidget;

	#m_sections: CDateSectionInfo[] = [];
	#m_inputSection = -1;
	#m_inputDigits = "";

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null)
	{
		super(parent);

		const today = this.#normalizedDate(new Date());

		this.#m_date = today;
		this.#m_minimumDate = new Date(1752, 8, 14);
		this.#m_maximumDate = new Date(9999, 11, 31);

		this.#m_lineEdit = new CSectionLineEdit(this);

		this.#m_lineEdit.stepRequested.connect(
			(section, direction) =>
			{
				this.#stepSection(section, direction);
			}
		);
		this.#m_lineEdit.digitEntered.connect((section, digit) => {
			this.#enterDigit(section, digit);
		});

		this.#m_button = new CToolButton(this);
		this.#m_button.setText("▼");

		this.#m_popup = new CPopupWidget();
		this.#m_calendar = new CCalendarWidget(this.#m_popup);

		this.#m_calendar.setMinimumDate(this.#m_minimumDate);
		this.#m_calendar.setMaximumDate(this.#m_maximumDate);
		this.#m_calendar.setSelectedDate(this.#m_date);

		this.#m_button.clicked.connect(() =>
		{
			if (!this.#m_calendarPopup)
				return;

			if (this.#m_popup.isOpen())
				this.hidePopup();
			else
				this.showPopup();
		});

		this.#m_calendar.clicked.connect(date =>
		{
			this.setDate(date);
			this.hidePopup();
		});

		this.resize(
			this.sizeHint().width(),
			this.sizeHint().height()
		);

		this.#updateText();
		this.#updateGeometry();
        this.#m_lineEdit.setFocusPolicy(CFocusPolicy.StrongFocus);
		this.setFocusPolicy(CFocusPolicy.StrongFocus);
		this.setFocusProxy(this.#m_lineEdit);
        this.#m_button.setFocusPolicy(CFocusPolicy.ClickFocus);
	}

    /**
    * Independent copy of the selected local-calendar date.
    */
    date(): Date
	{
		return new Date(this.#m_date);
	}

    /**
    * Updates the selected local-calendar date using validation and configured bounds.
    */
    setDate(date: Date): void
	{
		if (!this.#validDate(date))
			return;

		date = this.#normalizedDate(date);

		if (date < this.#m_minimumDate)
			date = new Date(this.#m_minimumDate);

		if (date > this.#m_maximumDate)
			date = new Date(this.#m_maximumDate);

		if (this.#sameDate(date, this.#m_date))
			return;

		this.#m_date = new Date(date);

		this.#m_calendar.setSelectedDate(this.#m_date);
		this.#updateText();

		this.dateChanged.emit(new Date(this.#m_date));
		this.update();
	}

    /**
    * Returns the lower date bound as an independent Date value.
    */
    minimumDate(): Date
	{
		return new Date(this.#m_minimumDate);
	}

    /**
    * Changes the earliest permitted date and re-clamps the current value when needed.
    */
    setMinimumDate(date: Date): void
	{
		if (!this.#validDate(date))
			return;

		date = this.#normalizedDate(date);

		if (date > this.#m_maximumDate)
			return;

		if (this.#sameDate(date, this.#m_minimumDate))
			return;

		this.#m_minimumDate = new Date(date);
		this.#m_calendar.setMinimumDate(date);

		if (this.#m_date < this.#m_minimumDate)
			this.setDate(this.#m_minimumDate);
	}

    /**
    * Returns the upper date bound as an independent Date value.
    */
    maximumDate(): Date
	{
		return new Date(this.#m_maximumDate);
	}

    /**
    * Changes the latest permitted date and re-clamps the current value when needed.
    */
    setMaximumDate(date: Date): void
	{
		if (!this.#validDate(date))
			return;

		date = this.#normalizedDate(date);

		if (date < this.#m_minimumDate)
			return;

		if (this.#sameDate(date, this.#m_maximumDate))
			return;

		this.#m_maximumDate = new Date(date);
		this.#m_calendar.setMaximumDate(date);

		if (this.#m_date > this.#m_maximumDate)
			this.setDate(this.#m_maximumDate);
	}

    /**
    * Pattern controlling the displayed date or time sections.
    * The initial value is `"dd.MM.yyyy"`.
    */
    displayFormat(): string
	{
		return this.#m_displayFormat;
	}

    /**
    * Changes the section pattern used to format and edit the date.
    */
    setDisplayFormat(format: string): void
	{
		if (this.#m_displayFormat === format)
			return;

		this.#m_displayFormat = format;
		this.#updateText();
	}

    /**
    * Whether the date editor can open a calendar popup.
    * The initial value is `true`.
    */
    calendarPopup(): boolean
	{
		return this.#m_calendarPopup;
	}

    /**
    * Controls whether the calendar drop-down affordance is available.
    */
    setCalendarPopup(enabled: boolean): void
	{
		if (this.#m_calendarPopup === enabled)
			return;

		this.#m_calendarPopup = enabled;
		this.#m_button.setVisible(enabled);

		if (!enabled)
			this.hidePopup();

		this.#updateGeometry();
	}

    /**
    * Owned calendar used by the popup; customize its appearance or calendar behavior here.
    */
    calendarWidget(): CCalendarWidget
	{
		return this.#m_calendar;
	}

    /**
    * Owned section editor displaying the formatted date.
    */
    lineEdit(): CSectionLineEdit
	{
		return this.#m_lineEdit;
	}

    /**
    * Opens the associated calendar popup.
    */
    showPopup(): void
	{
		if (!this.#m_calendarPopup)
			return;

		this.#m_calendar.setSelectedDate(this.#m_date);
		this.#updatePopupGeometry();

		this.#m_popup.open();
	}

    /**
    * Closes the associated calendar popup.
    */
    hidePopup(): void
	{
		this.#m_popup.close();
	}

    /** Performs step up. */
    stepUp(): void
	{
		this.#stepSection(
			this.#m_lineEdit.currentSection(),
			1
		);

		this.#m_lineEdit.setFocus();
	}

    /** Performs step down. */
    stepDown(): void
	{
		this.#stepSection(
			this.#m_lineEdit.currentSection(),
			-1
		);

		this.#m_lineEdit.setFocus();
	}

	override setGeometry(
		x: number, y: number, width: number, height: number
	): void
	{
		super.setGeometry(x, y, width, height);

		this.#updateGeometry();
	}

	override resize(width: number, height: number): void
	{
		super.resize(width, height);

		this.#updateGeometry();
	}

	override sizeHint(): CSize
	{
		return new CSize(120, 30);
	}

    /** Releases resources owned by the widget. */
    override destroy(): void
	{
		this.#m_popup.close();
		this.#m_popup.destroy();

		super.destroy();
	}

    #updateGeometry(): void
	{
		const buttonWidth = this.#m_calendarPopup
			? Math.min(CDateEdit.ButtonWidth, this.width())
			: 0;

		this.#m_lineEdit.setGeometry(
			0,
			0,
			Math.max(0, this.width() - buttonWidth),
			this.height()
		);

		if (this.#m_calendarPopup) {
			this.#m_button.setGeometry(
				this.width() - buttonWidth,
				0,
				buttonWidth,
				this.height()
			);
		}

		this.#updatePopupGeometry();
	}

	#updatePopupGeometry(): void
	{
		const size = this.#m_calendar.sizeHint();
		const pos = this.mapToCanvas(0, this.height());

		this.#m_popup.setGeometry(
			pos.x(),
			pos.y(),
			size.width(),
			size.height()
		);

		this.#m_calendar.setGeometry(
			0,
			0,
			size.width(),
			size.height()
		);
	}

	#updateText(): void
	{
		const result = this.#formatDate(this.#m_date);

		this.#m_sections = result.sections;

		this.#m_lineEdit.setText(result.text);

		const sections: CLineEditSection[] =
			this.#m_sections.map(section => ({
				start: section.start,
				length: section.length
			}));

		this.#m_lineEdit.setSections(sections);
	}

	#formatDate(date: Date): {
		text: string;
		sections: CDateSectionInfo[];
	}
	{
		const day = date.getDate();
		const month = date.getMonth() + 1;
		const year = date.getFullYear();

		let text = "";
		const sections: CDateSectionInfo[] = [];

		const tokens = this.#m_displayFormat.match(
			/yyyy|yy|MM|M|dd|d|./g
		) ?? [];

		for (const token of tokens) {
			const start = text.length;
			let value: string;
			let type: CDateSection | null = null;

			switch (token) {
				case "yyyy":
					value = year.toString().padStart(4, "0");
					type = "year";
					break;

				case "yy":
					value = (year % 100)
						.toString()
						.padStart(2, "0");
					type = "year";
					break;

				case "MM":
					value = month.toString().padStart(2, "0");
					type = "month";
					break;

				case "M":
					value = month.toString();
					type = "month";
					break;

				case "dd":
					value = day.toString().padStart(2, "0");
					type = "day";
					break;

				case "d":
					value = day.toString();
					type = "day";
					break;

				default:
					value = token;
					break;
			}

			text += value;

			if (type !== null) {
				sections.push({
					type,
					start,
					length: value.length
				});
			}
		}

		return {
			text,
			sections
		};
	}

	#stepSection(index: number, direction: number): void
	{
		if (index < 0 || index >= this.#m_sections.length)
			return;

		const section = this.#m_sections[index];

		if (section === undefined)
			return;

		const year = this.#m_date.getFullYear();
		const month = this.#m_date.getMonth();
		const day = this.#m_date.getDate();

		let date: Date;

		switch (section.type) {
			case "day":
				date = this.#stepDay(
					year,
					month,
					day,
					direction
				);
				break;

			case "month":
				date = this.#stepMonth(
					year,
					month,
					day,
					direction
				);
				break;

			case "year":
				date = this.#stepYear(
					year,
					month,
					day,
					direction
				);
				break;
		}

		if (
			date < this.#m_minimumDate ||
			date > this.#m_maximumDate
		)
			return;

		this.setDate(date);
		this.#m_lineEdit.setCurrentSection(index);
	}

	#enterDigit(index: number, digit: number): void
	{
		const section = this.#m_sections[index];
		if (section === undefined)
			return;

		if (index !== this.#m_inputSection) {
			this.#m_inputSection = index;
			this.#m_inputDigits = "";
		}

		const maximum = section.type === "day"
			? this.#daysInMonth(this.#m_date.getFullYear(), this.#m_date.getMonth())
			: section.type === "month" ? 12 : 9999;
		const maximumDigits = section.type === "year"
			? Math.max(2, section.length)
			: 2;
		let digits = `${this.#m_inputDigits}${digit}`;
		let value = Number(digits);

		if (digits.length > maximumDigits || value > maximum) {
			digits = String(digit);
			value = digit;
		}

		this.#m_inputDigits = digits;

		if (value > 0 && (section.type !== "year"
			|| digits.length === maximumDigits)) {
			let year = this.#m_date.getFullYear();
			let month = this.#m_date.getMonth();
			let day = this.#m_date.getDate();

			if (section.type === "day")
				day = value;
			else if (section.type === "month") {
				month = value - 1;
				day = Math.min(day, this.#daysInMonth(year, month));
			} else {
				year = maximumDigits === 2
					? Math.floor(year / 100) * 100 + value
					: value;
				day = Math.min(day, this.#daysInMonth(year, month));
			}

			const date = new Date(this.#m_date);
			date.setDate(1);
			date.setFullYear(year);
			date.setMonth(month);
			date.setDate(day);
			date.setHours(0, 0, 0, 0);
			this.setDate(date);
			this.#m_lineEdit.setCurrentSection(index);
		}

		if (digits.length >= maximumDigits
			|| (value > 0 && value * 10 > maximum)) {
			this.#m_inputDigits = "";
			this.#m_inputSection = -1;
			this.#m_lineEdit.event(new CKeyEvent(
				CEventType.KeyPress,
				"ArrowRight"
			));
		}
	}

	#stepDay(
		year: number,
		month: number,
		day: number,
		direction: number
	): Date
	{
		const days = this.#daysInMonth(year, month);

		let targetDay = day + direction;

		if (targetDay > days)
			targetDay = 1;
		else if (targetDay < 1)
			targetDay = days;

		return new Date(
			year,
			month,
			targetDay
		);
	}

	#stepMonth(
		year: number,
		month: number,
		day: number,
		direction: number
	): Date
	{
		const wasLastDay =
			day === this.#daysInMonth(year, month);

		let targetMonth = month + direction;

		if (targetMonth > 11)
			targetMonth = 0;
		else if (targetMonth < 0)
			targetMonth = 11;

		const targetLastDay =
			this.#daysInMonth(year, targetMonth);

		const targetDay = wasLastDay
			? targetLastDay
			: Math.min(day, targetLastDay);

		return new Date(
			year,
			targetMonth,
			targetDay
		);
	}

	#stepYear(
		year: number,
		month: number,
		day: number,
		direction: number
	): Date
	{
		const targetYear = year + direction;
		const targetLastDay =
			this.#daysInMonth(targetYear, month);

		return new Date(
			targetYear,
			month,
			Math.min(day, targetLastDay)
		);
	}

	#daysInMonth(year: number, month: number): number
	{
		return new Date(
			year,
			month + 1,
			0
		).getDate();
	}

	#normalizedDate(date: Date): Date
	{
		return new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate()
		);
	}

	#validDate(date: Date): boolean
	{
		return !Number.isNaN(date.getTime());
	}

	#sameDate(a: Date, b: Date): boolean
	{
		return a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate();
	}
}
