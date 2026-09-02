import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import { CCalendarWidget } from "./CCalendarWidget.js";
import { CLineEdit } from "./CLineEdit.js";
import { CPopupWidget } from "./CPopupWidget.js";
import { CToolButton } from "./CToolButton.js";
import { CWidget } from "./CWidget.js";


export class CDateEdit extends CWidget
{
	static readonly ButtonWidth = 28;

	readonly dateChanged = new CSignal<[Date]>();

	#m_date: Date;
	#m_minimumDate: Date;
	#m_maximumDate: Date;

	#m_displayFormat = "dd.MM.yyyy";
	#m_calendarPopup = true;

	#m_lineEdit: CLineEdit;
	#m_button: CToolButton;
	#m_popup: CPopupWidget;
	#m_calendar: CCalendarWidget;

	constructor(parent: CWidget | null = null)
	{
		super(parent);

		const today = this.#normalizedDate(new Date());

		this.#m_date = today;
		this.#m_minimumDate = new Date(1752, 8, 14);
		this.#m_maximumDate = new Date(9999, 11, 31);

		this.#m_lineEdit = new CLineEdit(this);
		this.#m_lineEdit.setReadOnly(true);

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
	}

	date(): Date
	{
		return new Date(this.#m_date);
	}

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

	minimumDate(): Date
	{
		return new Date(this.#m_minimumDate);
	}

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

	maximumDate(): Date
	{
		return new Date(this.#m_maximumDate);
	}

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

	displayFormat(): string
	{
		return this.#m_displayFormat;
	}

	setDisplayFormat(format: string): void
	{
		if (this.#m_displayFormat === format)
			return;

		this.#m_displayFormat = format;
		this.#updateText();
	}

	calendarPopup(): boolean
	{
		return this.#m_calendarPopup;
	}

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

	calendarWidget(): CCalendarWidget
	{
		return this.#m_calendar;
	}

	lineEdit(): CLineEdit
	{
		return this.#m_lineEdit;
	}

	showPopup(): void
	{
		if (!this.#m_calendarPopup)
			return;

		this.#m_calendar.setSelectedDate(this.#m_date);
		this.#updatePopupGeometry();

		this.#m_popup.open();
	}

	hidePopup(): void
	{
		this.#m_popup.close();
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
		this.#m_lineEdit.setText(
			this.#formatDate(this.#m_date)
		);
	}

	#formatDate(date: Date): string
	{
		const day = date.getDate();
		const month = date.getMonth() + 1;
		const year = date.getFullYear();

		return this.#m_displayFormat.replace(
			/yyyy|yy|MM|M|dd|d/g,
			token =>
			{
				switch (token) {
					case "yyyy":
						return year.toString().padStart(4, "0");

					case "yy":
						return (year % 100)
							.toString()
							.padStart(2, "0");

					case "MM":
						return month.toString().padStart(2, "0");

					case "M":
						return month.toString();

					case "dd":
						return day.toString().padStart(2, "0");

					case "d":
						return day.toString();
				}

				return token;
			}
		);
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