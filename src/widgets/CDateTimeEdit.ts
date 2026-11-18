import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import { CCalendarWidget } from "./CCalendarWidget.js";
import { CDateEdit } from "./CDateEdit.js";
import { CSectionLineEdit } from "./CSectionLineEdit.js";
import { CTimeEdit } from "./CTimeEdit.js";
import { CWidget } from "./CWidget.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";


/** Implements the date time edit widget. */
export class CDateTimeEdit extends CWidget
{
	/** Signal emitted when date time changes. */
	readonly dateTimeChanged = new CSignal<[Date]>();
	/** Signal emitted when date changes. */
	readonly dateChanged = new CSignal<[Date]>();
	/** Signal emitted when time changes. */
	readonly timeChanged = new CSignal<[Date]>();

	#m_dateTime: Date;
	#m_minimumDateTime: Date;
	#m_maximumDateTime: Date;

	#m_dateEdit: CDateEdit;
	#m_timeEdit: CTimeEdit;

	#m_updating = false;

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
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
			/** Provides if behavior. */
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
			/** Provides if behavior. */
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

	/**
	 * Reports logical focus in either the date or time editor.
	 * @returns `true` if the date time edit has focus, otherwise `false`.
	 */
	override hasFocus(): boolean
	{
		return super.hasFocus() || this.#m_timeEdit.hasFocus();
	}

	/**
	 * Applies the focus policy to both embedded editors.
	 * @param policy Policy.
	 */
	override setFocusPolicy(policy: CFocusPolicy): void
	{
		super.setFocusPolicy(policy);
		this.#m_timeEdit.setFocusPolicy(policy);
	}

	/**
	 * Reads the date time of the date time edit.
	 * @returns A new `Date`.
	 */
	dateTime(): Date
	{
		return new Date(this.#m_dateTime);
	}

	/**
	 * Sets the date time.
	 * @param dateTime Date time.
	 */
	setDateTime(dateTime: Date): void
	{
		/** Provides if behavior. */
		if (!this.#validDate(dateTime))
			return;

		dateTime = this.#normalizedDateTime(dateTime);

		/** Provides if behavior. */
		if (dateTime < this.#m_minimumDateTime)
			dateTime = new Date(this.#m_minimumDateTime);

		/** Provides if behavior. */
		if (dateTime > this.#m_maximumDateTime)
			dateTime = new Date(this.#m_maximumDateTime);

		const dateChanged =
			!this.#sameDate(dateTime, this.#m_dateTime);

		const timeChanged =
			!this.#sameTime(dateTime, this.#m_dateTime);

		/** Provides if behavior. */
		if (!dateChanged && !timeChanged) {
			this.#syncEditors();
			return;
		}

		this.#m_dateTime = new Date(dateTime);

		this.#syncEditors();

		/** Provides if behavior. */
		if (dateChanged)
			this.dateChanged.emit(this.date());

		/** Provides if behavior. */
		if (timeChanged)
			this.timeChanged.emit(this.time());

		this.dateTimeChanged.emit(
			new Date(this.#m_dateTime)
		);

		this.update();
	}

	/**
	 * Reads the date of the date time edit.
	 * @returns A new `Date`.
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
	 * Sets the date.
	 * @param date Date.
	 */
	setDate(date: Date): void
	{
		/** Provides if behavior. */
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
	 * Reads the time of the date time edit.
	 * @returns The time.
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
	 * Sets the time.
	 * @param time Time.
	 */
	setTime(time: Date): void
	{
		/** Provides if behavior. */
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
	 * Returns the minimum date time.
	 * @returns A new `Date`.
	 */
	minimumDateTime(): Date
	{
		return new Date(this.#m_minimumDateTime);
	}

	/**
	 * Sets the minimum date time.
	 * @param dateTime Date time.
	 */
	setMinimumDateTime(dateTime: Date): void
	{
		/** Provides if behavior. */
		if (!this.#validDate(dateTime))
			return;

		dateTime = this.#normalizedDateTime(dateTime);

		/** Provides if behavior. */
		if (dateTime > this.#m_maximumDateTime)
			return;

		/** Provides if behavior. */
		if (
			this.#sameDateTime(
				dateTime,
				this.#m_minimumDateTime
			)
		)
			return;

		this.#m_minimumDateTime = new Date(dateTime);

		/** Provides if behavior. */
		if (this.#m_dateTime < this.#m_minimumDateTime)
			this.setDateTime(this.#m_minimumDateTime);
		else
			this.#syncEditors();
	}

	/**
	 * Returns the maximum date time.
	 * @returns A new `Date`.
	 */
	maximumDateTime(): Date
	{
		return new Date(this.#m_maximumDateTime);
	}

	/**
	 * Sets the maximum date time.
	 * @param dateTime Date time.
	 */
	setMaximumDateTime(dateTime: Date): void
	{
		/** Provides if behavior. */
		if (!this.#validDate(dateTime))
			return;

		dateTime = this.#normalizedDateTime(dateTime);

		/** Provides if behavior. */
		if (dateTime < this.#m_minimumDateTime)
			return;

		/** Provides if behavior. */
		if (
			this.#sameDateTime(
				dateTime,
				this.#m_maximumDateTime
			)
		)
			return;

		this.#m_maximumDateTime = new Date(dateTime);

		/** Provides if behavior. */
		if (this.#m_dateTime > this.#m_maximumDateTime)
			this.setDateTime(this.#m_maximumDateTime);
		else
			this.#syncEditors();
	}

	/**
	 * Reads the date display format of the date time edit.
	 * @returns The date display format.
	 */
	dateDisplayFormat(): string
	{
		return this.#m_dateEdit.displayFormat();
	}

	/**
	 * Sets the date display format.
	 * @param format Format.
	 */
	setDateDisplayFormat(format: string): void
	{
		this.#m_dateEdit.setDisplayFormat(format);
		this.#updateGeometry();
	}

	/**
	 * Reads the time display format of the date time edit.
	 * @returns The time display format.
	 */
	timeDisplayFormat(): string
	{
		return this.#m_timeEdit.displayFormat();
	}

	/**
	 * Sets the time display format.
	 * @param format Format.
	 */
	setTimeDisplayFormat(format: string): void
	{
		this.#m_timeEdit.setDisplayFormat(format);
		this.#updateGeometry();
	}

	/**
	 * Queries the embedded date editor's calendar picker setting.
	 * @returns `true` if calendar popup mode is enabled for the date portion.
	 */
	calendarPopup(): boolean
	{
		return this.#m_dateEdit.calendarPopup();
	}

	/**
	 * Sets the calendar popup.
	 * @param enabled Whether to enable the feature.
	 */
	setCalendarPopup(enabled: boolean): void
	{
		this.#m_dateEdit.setCalendarPopup(enabled);
		this.#updateGeometry();
	}

	/** Shows popup. */
	showPopup(): void
	{
		this.#m_dateEdit.showPopup();
	}

	/** Hides popup. */
	hidePopup(): void
	{
		this.#m_dateEdit.hidePopup();
	}

	/**
	 * Reads the calendar widget of the date time edit.
	 * @returns The calendar widget.
	 */
	calendarWidget(): CCalendarWidget
	{
		return this.#m_dateEdit.calendarWidget();
	}

	/**
	 * Reads the date edit.
	 * @returns The date edit.
	 */
	dateEdit(): CDateEdit
	{
		return this.#m_dateEdit;
	}

	/**
	 * Reads the time edit.
	 * @returns The time edit.
	 */
	timeEdit(): CTimeEdit
	{
		return this.#m_timeEdit;
	}

	/**
	 * Reads the date line edit of the date time edit.
	 * @returns The date line edit.
	 */
	dateLineEdit(): CSectionLineEdit
	{
		return this.#m_dateEdit.lineEdit();
	}

	/**
	 * Reads the time line edit of the date time edit.
	 * @returns The time line edit.
	 */
	timeLineEdit(): CSectionLineEdit
	{
		return this.#m_timeEdit.lineEdit();
	}

	/**
	 * Returns the preferred size of the widget.
	 * @returns A new `CSize`.
	 */
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

	/**
	 * Sets the geometry.
	 * @param x Horizontal position in parent coordinates.
	 * @param y Vertical position in parent coordinates.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
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

	/**
	 * Resizes the width.
	 * @param width Width in logical pixels.
	 * @param height Height in logical pixels.
	 */
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
				/** Provides if behavior. */
				if (current >= previous)
					return;

				this.#selectFirstSection(timeLineEdit);
			}
		);

		dateLineEdit.previousSectionRequested.connect(
			(previous, current) =>
			{
				/** Provides if behavior. */
				if (current <= previous)
					return;

				this.#selectLastSection(timeLineEdit);
			}
		);

		timeLineEdit.nextSectionRequested.connect(
			(previous, current) =>
			{
				/** Provides if behavior. */
				if (current >= previous)
					return;

				this.#selectFirstSection(dateLineEdit);
			}
		);

		timeLineEdit.previousSectionRequested.connect(
			(previous, current) =>
			{
				/** Provides if behavior. */
				if (current <= previous)
					return;

				this.#selectLastSection(dateLineEdit);
			}
		);
	}

	#selectFirstSection(lineEdit: CSectionLineEdit): void
	{
		/** Provides if behavior. */
		if (lineEdit.sections().length === 0)
			return;

		lineEdit.setFocus();
		lineEdit.setCurrentSection(0);
	}

	#selectLastSection(lineEdit: CSectionLineEdit): void
	{
		const count = lineEdit.sections().length;

		/** Provides if behavior. */
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

		/** Provides if behavior. */
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

		/** Provides if behavior. */
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

		/** Provides if behavior. */
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