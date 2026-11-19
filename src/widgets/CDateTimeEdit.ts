/** @module Widgets/CDateTimeEdit */
import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import { CCalendarWidget } from "./CCalendarWidget.js";
import { CDateEdit } from "./CDateEdit.js";
import { CSectionLineEdit } from "./CSectionLineEdit.js";
import { CTimeEdit } from "./CTimeEdit.js";
import { CWidget } from "./CWidget.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

/** Composite date and time editor sharing a single bounded value. */
export class CDateTimeEdit extends CWidget
{
    /**
    * Emitted with an independent Date containing the updated local date and time.
    * @group Signals
    */
    readonly dateTimeChanged = new CSignal<[Date]>();
    /**
    * Emitted with an independent Date containing the updated local calendar date.
    * @group Signals
    */
    readonly dateChanged = new CSignal<[Date]>();
    /**
    * Emitted with an independent Date representing the new local time of day.
    * @group Signals
    */
    readonly timeChanged = new CSignal<[Date]>();

	#m_dateTime: Date;
	#m_minimumDateTime: Date;
	#m_maximumDateTime: Date;

	#m_dateEdit: CDateEdit;
	#m_timeEdit: CTimeEdit;

	#m_updating = false;

    /**
    * Initializes the control and its internal children in the supplied ownership hierarchy.
    * @param parent Owner of this object. Widget parents manage child lifetime and inherited state. Omit to use `null`.
    */
    constructor(parent: CWidget | null = null)
	{
		super(parent);

		this.#m_minimumDateTime =
			new Date(1752, 8, 14, 0, 0, 0);

		this.#m_maximumDateTime =
			new Date(9999, 11, 31, 23, 59, 59);

		this.#m_dateTime =
			this.#normalizedDateTime(new Date());

		this.#m_dateEdit = new CDateEdit(this);
		this.#m_timeEdit = new CTimeEdit(this);

		this.setFocusPolicy(CFocusPolicy.StrongFocus);
		this.setFocusProxy(this.#m_dateEdit);

		this.#m_dateEdit.dateChanged.connect(date =>
		{
			if (this.#m_updating)
				return;

			this.setDateTime(
				new Date(
					date.getFullYear(),
					date.getMonth(),
					date.getDate(),
					this.#m_dateTime.getHours(),
					this.#m_dateTime.getMinutes(),
					this.#m_dateTime.getSeconds()
				)
			);
		});

		this.#m_timeEdit.timeChanged.connect(time =>
		{
			if (this.#m_updating)
				return;

			this.setDateTime(
				new Date(
					this.#m_dateTime.getFullYear(),
					this.#m_dateTime.getMonth(),
					this.#m_dateTime.getDate(),
					time.getHours(),
					time.getMinutes(),
					time.getSeconds()
				)
			);
		});

		this.#connectSectionNavigation();

		this.#syncEditors();

		this.resize(
			this.sizeHint().width(),
			this.sizeHint().height()
		);

		this.#updateGeometry();
	}

    /** Reports logical focus in either the date or time editor. */
    override hasFocus(): boolean
	{
		return super.hasFocus() || this.#m_timeEdit.hasFocus();
	}

    /** Applies the focus policy to both embedded editors. */
    override setFocusPolicy(policy: CFocusPolicy): void
	{
		super.setFocusPolicy(policy);
		this.#m_timeEdit.setFocusPolicy(policy);
	}

    /**
    * Independent copy of the combined local date and time.
    */
    dateTime(): Date
	{
		return new Date(this.#m_dateTime);
	}

    /**
    * Validates, normalizes and clamps the date/time. Updates embedded editors and emits date, time and combined signals for the portions that changed.
    */
    setDateTime(dateTime: Date): void
	{
		if (!this.#validDate(dateTime))
			return;

		dateTime = this.#normalizedDateTime(dateTime);

		if (dateTime < this.#m_minimumDateTime)
			dateTime = new Date(this.#m_minimumDateTime);

		if (dateTime > this.#m_maximumDateTime)
			dateTime = new Date(this.#m_maximumDateTime);

		const dateChanged =
			!this.#sameDate(dateTime, this.#m_dateTime);

		const timeChanged =
			!this.#sameTime(dateTime, this.#m_dateTime);

		if (!dateChanged && !timeChanged) {
			this.#syncEditors();
			return;
		}

		this.#m_dateTime = new Date(dateTime);

		this.#syncEditors();

		if (dateChanged)
			this.dateChanged.emit(this.date());

		if (timeChanged)
			this.timeChanged.emit(this.time());

		this.dateTimeChanged.emit(
			new Date(this.#m_dateTime)
		);

		this.update();
	}

    /**
    * Local-calendar date as a new Date at midnight.
    */
    date(): Date
	{
		return new Date(
			this.#m_dateTime.getFullYear(),
			this.#m_dateTime.getMonth(),
			this.#m_dateTime.getDate()
		);
	}

    /**
    * Changes the local date while retaining the current time, then applies combined date/time bounds.
    */
    setDate(date: Date): void
	{
		if (!this.#validDate(date))
			return;

		this.setDateTime(
			new Date(
				date.getFullYear(),
				date.getMonth(),
				date.getDate(),
				this.#m_dateTime.getHours(),
				this.#m_dateTime.getMinutes(),
				this.#m_dateTime.getSeconds()
			)
		);
	}

    /**
    * Local time-of-day as a new Date; its calendar date is not the selected date.
    */
    time(): Date
	{
		return this.#makeTime(
			this.#m_dateTime.getHours(),
			this.#m_dateTime.getMinutes(),
			this.#m_dateTime.getSeconds()
		);
	}

    /**
    * Changes local time while retaining the current date, then applies combined date/time bounds.
    */
    setTime(time: Date): void
	{
		if (!this.#validDate(time))
			return;

		this.setDateTime(
			new Date(
				this.#m_dateTime.getFullYear(),
				this.#m_dateTime.getMonth(),
				this.#m_dateTime.getDate(),
				time.getHours(),
				time.getMinutes(),
				time.getSeconds()
			)
		);
	}

    /**
    * Returns an independent copy of the earliest permitted date/time.
    */
    minimumDateTime(): Date
	{
		return new Date(this.#m_minimumDateTime);
	}

    /**
    * Changes the lower combined bound. Invalid dates or a bound beyond the maximum are ignored.
    */
    setMinimumDateTime(dateTime: Date): void
	{
		if (!this.#validDate(dateTime))
			return;

		dateTime = this.#normalizedDateTime(dateTime);

		if (dateTime > this.#m_maximumDateTime)
			return;

		if (
			this.#sameDateTime(
				dateTime,
				this.#m_minimumDateTime
			)
		)
			return;

		this.#m_minimumDateTime = new Date(dateTime);

		if (this.#m_dateTime < this.#m_minimumDateTime)
			this.setDateTime(this.#m_minimumDateTime);
		else
			this.#syncEditors();
	}

    /**
    * Returns an independent copy of the latest permitted date/time.
    */
    maximumDateTime(): Date
	{
		return new Date(this.#m_maximumDateTime);
	}

    /**
    * Changes the upper combined bound. Invalid dates or a bound below the minimum are ignored.
    */
    setMaximumDateTime(dateTime: Date): void
	{
		if (!this.#validDate(dateTime))
			return;

		dateTime = this.#normalizedDateTime(dateTime);

		if (dateTime < this.#m_minimumDateTime)
			return;

		if (
			this.#sameDateTime(
				dateTime,
				this.#m_maximumDateTime
			)
		)
			return;

		this.#m_maximumDateTime = new Date(dateTime);

		if (this.#m_dateTime > this.#m_maximumDateTime)
			this.setDateTime(this.#m_maximumDateTime);
		else
			this.#syncEditors();
	}

    /**
    * Formatting pattern used by the embedded date editor.
    */
    dateDisplayFormat(): string
	{
		return this.#m_dateEdit.displayFormat();
	}

    /**
    * Changes the date-section formatting of the embedded editor.
    */
    setDateDisplayFormat(format: string): void
	{
		this.#m_dateEdit.setDisplayFormat(format);
		this.#updateGeometry();
	}

    /**
    * Formatting pattern used by the embedded time editor.
    */
    timeDisplayFormat(): string
	{
		return this.#m_timeEdit.displayFormat();
	}

    /**
    * Changes the time-section formatting of the embedded editor.
    */
    setTimeDisplayFormat(format: string): void
	{
		this.#m_timeEdit.setDisplayFormat(format);
		this.#updateGeometry();
	}

    /**
    * Whether the date editor provides its calendar popup button.
    */
    calendarPopup(): boolean
	{
		return this.#m_dateEdit.calendarPopup();
	}

    /**
    * Controls the calendar affordance on the date portion.
    */
    setCalendarPopup(enabled: boolean): void
	{
		this.#m_dateEdit.setCalendarPopup(enabled);
		this.#updateGeometry();
	}

    /**
    * Opens the date portion's calendar popup.
    */
    showPopup(): void
	{
		this.#m_dateEdit.showPopup();
	}

    /**
    * Closes the date portion's calendar popup.
    */
    hidePopup(): void
	{
		this.#m_dateEdit.hidePopup();
	}

    /**
    * Owned popup calendar belonging to the date editor.
    */
    calendarWidget(): CCalendarWidget
	{
		return this.#m_dateEdit.calendarWidget();
	}

    /**
    * Owned date control displaying the calendar portion.
    */
    dateEdit(): CDateEdit
	{
		return this.#m_dateEdit;
	}

    /**
    * Owned time control displaying the time-of-day portion.
    */
    timeEdit(): CTimeEdit
	{
		return this.#m_timeEdit;
	}

    /**
    * Owned section editor within the date control.
    */
    dateLineEdit(): CSectionLineEdit
	{
		return this.#m_dateEdit.lineEdit();
	}

    /**
    * Owned section editor within the time control.
    */
    timeLineEdit(): CSectionLineEdit
	{
		return this.#m_timeEdit.lineEdit();
	}

	override sizeHint(): CSize
	{
		const dateSize = this.#m_dateEdit.sizeHint();
		const timeSize = this.#m_timeEdit.sizeHint();

		return new CSize(
			dateSize.width() + timeSize.width(),
			Math.max(
				dateSize.height(),
				timeSize.height()
			)
		);
	}

	override setGeometry(
		x: number,
		y: number,
		width: number,
		height: number
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

	#connectSectionNavigation(): void
	{
		const dateLineEdit = this.#m_dateEdit.lineEdit();
		const timeLineEdit = this.#m_timeEdit.lineEdit();

		dateLineEdit.nextSectionRequested.connect(
			(previous, current) =>
			{
				if (current >= previous)
					return;

				this.#selectFirstSection(timeLineEdit);
			}
		);

		dateLineEdit.previousSectionRequested.connect(
			(previous, current) =>
			{
				if (current <= previous)
					return;

				this.#selectLastSection(timeLineEdit);
			}
		);

		timeLineEdit.nextSectionRequested.connect(
			(previous, current) =>
			{
				if (current >= previous)
					return;

				this.#selectFirstSection(dateLineEdit);
			}
		);

		timeLineEdit.previousSectionRequested.connect(
			(previous, current) =>
			{
				if (current <= previous)
					return;

				this.#selectLastSection(dateLineEdit);
			}
		);
	}

	#selectFirstSection(lineEdit: CSectionLineEdit): void
	{
		if (lineEdit.sections().length === 0)
			return;

		lineEdit.setFocus();
		lineEdit.setCurrentSection(0);
	}

	#selectLastSection(lineEdit: CSectionLineEdit): void
	{
		const count = lineEdit.sections().length;

		if (count === 0)
			return;

		lineEdit.setFocus();
		lineEdit.setCurrentSection(count - 1);
	}

	#syncEditors(): void
	{
		this.#m_updating = true;

		this.#syncDateBounds();
		this.#syncTimeBounds();

		this.#m_dateEdit.setDate(this.#m_dateTime);
		this.#m_timeEdit.setTime(this.#m_dateTime);

		this.#m_updating = false;
	}

	#syncDateBounds(): void
	{
		this.#m_dateEdit.setMinimumDate(
			this.#m_minimumDateTime
		);

		this.#m_dateEdit.setMaximumDate(
			this.#m_maximumDateTime
		);
	}

	#syncTimeBounds(): void
	{
		let minimum =
			this.#makeTime(0, 0, 0);

		let maximum =
			this.#makeTime(23, 59, 59);

		if (
			this.#sameDate(
				this.#m_dateTime,
				this.#m_minimumDateTime
			)
		) {
			minimum = this.#makeTime(
				this.#m_minimumDateTime.getHours(),
				this.#m_minimumDateTime.getMinutes(),
				this.#m_minimumDateTime.getSeconds()
			);
		}

		if (
			this.#sameDate(
				this.#m_dateTime,
				this.#m_maximumDateTime
			)
		) {
			maximum = this.#makeTime(
				this.#m_maximumDateTime.getHours(),
				this.#m_maximumDateTime.getMinutes(),
				this.#m_maximumDateTime.getSeconds()
			);
		}

		/*
		 * Reset both ends before applying edge restrictions.
		 * This also avoids an old restricted minimum/maximum
		 * preventing the opposite bound from being changed.
		 */
		this.#m_timeEdit.setMinimumTime(
			this.#makeTime(0, 0, 0)
		);

		this.#m_timeEdit.setMaximumTime(
			this.#makeTime(23, 59, 59)
		);

		this.#m_timeEdit.setMinimumTime(minimum);
		this.#m_timeEdit.setMaximumTime(maximum);
	}

	#updateGeometry(): void
	{
		const dateHint = this.#m_dateEdit.sizeHint();
		const timeHint = this.#m_timeEdit.sizeHint();

		const hintWidth =
			dateHint.width() + timeHint.width();

		let dateWidth = dateHint.width();

		if (hintWidth > 0) {
			dateWidth = Math.round(
				this.width() *
				dateHint.width() /
				hintWidth
			);
		}

		dateWidth = Math.max(
			0,
			Math.min(dateWidth, this.width())
		);

		const timeWidth =
			Math.max(0, this.width() - dateWidth);

		this.#m_dateEdit.setGeometry(
			0,
			0,
			dateWidth,
			this.height()
		);

		this.#m_timeEdit.setGeometry(
			dateWidth,
			0,
			timeWidth,
			this.height()
		);
	}

	#normalizedDateTime(dateTime: Date): Date
	{
		return new Date(
			dateTime.getFullYear(),
			dateTime.getMonth(),
			dateTime.getDate(),
			dateTime.getHours(),
			dateTime.getMinutes(),
			dateTime.getSeconds()
		);
	}

	#makeTime(
		hour: number,
		minute: number,
		second: number
	): Date
	{
		return new Date(
			2000,
			0,
			1,
			hour,
			minute,
			second
		);
	}

	#validDate(dateTime: Date): boolean
	{
		return !Number.isNaN(dateTime.getTime());
	}

	#sameDateTime(a: Date, b: Date): boolean
	{
		return this.#sameDate(a, b) &&
			this.#sameTime(a, b);
	}

	#sameDate(a: Date, b: Date): boolean
	{
		return a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate();
	}

	#sameTime(a: Date, b: Date): boolean
	{
		return a.getHours() === b.getHours() &&
			a.getMinutes() === b.getMinutes() &&
			a.getSeconds() === b.getSeconds();
	}
}