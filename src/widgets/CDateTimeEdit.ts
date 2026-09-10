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

	/** Provides date time behavior. */
	dateTime(): Date
	{
		return new Date(this.#m_dateTime);
	}

	/** Sets the date time. */
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

	/** Provides date behavior. */
	date(): Date
	{
		return new Date(
			this.#m_dateTime.getFullYear(),
			this.#m_dateTime.getMonth(),
			this.#m_dateTime.getDate()
		);
	}

	/** Sets the date. */
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

	/** Provides time behavior. */
	time(): Date
	{
		return this.#makeTime(
			this.#m_dateTime.getHours(),
			this.#m_dateTime.getMinutes(),
			this.#m_dateTime.getSeconds()
		);
	}

	/** Sets the time. */
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

	/** Returns the minimum date time. */
	minimumDateTime(): Date
	{
		return new Date(this.#m_minimumDateTime);
	}

	/** Sets the minimum date time. */
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

	/** Returns the maximum date time. */
	maximumDateTime(): Date
	{
		return new Date(this.#m_maximumDateTime);
	}

	/** Sets the maximum date time. */
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

	/** Provides date display format behavior. */
	dateDisplayFormat(): string
	{
		return this.#m_dateEdit.displayFormat();
	}

	/** Sets the date display format. */
	setDateDisplayFormat(format: string): void
	{
		this.#m_dateEdit.setDisplayFormat(format);
		this.#updateGeometry();
	}

	/** Provides time display format behavior. */
	timeDisplayFormat(): string
	{
		return this.#m_timeEdit.displayFormat();
	}

	/** Sets the time display format. */
	setTimeDisplayFormat(format: string): void
	{
		this.#m_timeEdit.setDisplayFormat(format);
		this.#updateGeometry();
	}

	/** Provides calendar popup behavior. */
	calendarPopup(): boolean
	{
		return this.#m_dateEdit.calendarPopup();
	}

	/** Sets the calendar popup. */
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

	/** Provides calendar widget behavior. */
	calendarWidget(): CCalendarWidget
	{
		return this.#m_dateEdit.calendarWidget();
	}

	/** Provides date edit behavior. */
	dateEdit(): CDateEdit
	{
		return this.#m_dateEdit;
	}

	/** Provides time edit behavior. */
	timeEdit(): CTimeEdit
	{
		return this.#m_timeEdit;
	}

	/** Provides date line edit behavior. */
	dateLineEdit(): CSectionLineEdit
	{
		return this.#m_dateEdit.lineEdit();
	}

	/** Provides time line edit behavior. */
	timeLineEdit(): CSectionLineEdit
	{
		return this.#m_timeEdit.lineEdit();
	}

	/** Returns the preferred size of the widget. */
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

	/** Sets the geometry. */
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

	/** Provides resize behavior. */
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