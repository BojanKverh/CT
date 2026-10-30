import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import type { CLineEditSection } from "./CSectionLineEdit.js";
import { CSectionLineEdit } from "./CSectionLineEdit.js";
import { CToolButton } from "./CToolButton.js";
import { CWidget } from "./CWidget.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";
import { CEventType } from "../events/CEvent.js";
import { CKeyEvent } from "../events/CKeyEvent.js";

type CTimeSection =
	"hour" |
	"minute" |
	"second" |
	"ampm";


type CTimeSectionInfo = {
	type: CTimeSection;
	start: number;
	length: number;
};


/** Implements the time edit widget. */
export class CTimeEdit extends CWidget
{
	static readonly ButtonWidth = 28;

	/** Signal emitted when time changes. */
	readonly timeChanged = new CSignal<[Date]>();

	#m_time: Date;
	#m_minimumTime: Date;
	#m_maximumTime: Date;

	#m_displayFormat = "HH:mm";

	#m_lineEdit: CSectionLineEdit;
	#m_upButton: CToolButton;
	#m_downButton: CToolButton;

	#m_sections: CTimeSectionInfo[] = [];
	#m_inputSection = -1;
	#m_inputDigits = "";

	/** Creates a new instance. */
	constructor(parent: CWidget | null = null)
	{
		/** Provides super behavior. */
		super(parent);

		const now = new Date();

		this.#m_time = this.#normalizedTime(now);
		this.#m_minimumTime = this.#makeTime(0, 0, 0);
		this.#m_maximumTime = this.#makeTime(23, 59, 59);

		this.#m_lineEdit = new CSectionLineEdit(this);

		this.#m_upButton = new CToolButton(this);
		this.#m_upButton.setText("▲");
		this.#m_upButton.setAutoRepeat(400, 100);

		this.#m_downButton = new CToolButton(this);
		this.#m_downButton.setText("▼");
		this.#m_downButton.setAutoRepeat(400, 100);

		this.#m_upButton.clicked.connect(() =>
		{
			this.stepUp();
		});

		this.#m_downButton.clicked.connect(() =>
		{
			this.stepDown();
		});

		this.#m_lineEdit.stepRequested.connect(
			(section, direction) =>
			{
				this.#stepSection(section, direction);
			}
		);
		this.#m_lineEdit.digitEntered.connect((section, digit) => {
			this.#enterDigit(section, digit);
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
        this.#m_upButton.setFocusPolicy(CFocusPolicy.ClickFocus);
        this.#m_downButton.setFocusPolicy(CFocusPolicy.ClickFocus);
	}

	/** Provides time behavior. */
	time(): Date
	{
		return new Date(this.#m_time);
	}

	/** Sets the time. */
	setTime(time: Date): void
	{
		/** Provides if behavior. */
		if (!this.#validDate(time))
			return;

		time = this.#normalizedTime(time);

		/** Provides if behavior. */
		if (this.#timeValue(time) <
			this.#timeValue(this.#m_minimumTime))
			time = new Date(this.#m_minimumTime);

		/** Provides if behavior. */
		if (this.#timeValue(time) >
			this.#timeValue(this.#m_maximumTime))
			time = new Date(this.#m_maximumTime);

		/** Provides if behavior. */
		if (this.#sameTime(time, this.#m_time))
			return;

		this.#m_time = new Date(time);

		this.#updateText();

		this.timeChanged.emit(new Date(this.#m_time));
		this.update();
	}

	/** Returns the minimum time. */
	minimumTime(): Date
	{
		return new Date(this.#m_minimumTime);
	}

	/** Sets the minimum time. */
	setMinimumTime(time: Date): void
	{
		/** Provides if behavior. */
		if (!this.#validDate(time))
			return;

		time = this.#normalizedTime(time);

		/** Provides if behavior. */
		if (this.#timeValue(time) >
			this.#timeValue(this.#m_maximumTime))
			return;

		/** Provides if behavior. */
		if (this.#sameTime(time, this.#m_minimumTime))
			return;

		this.#m_minimumTime = new Date(time);

		/** Provides if behavior. */
		if (this.#timeValue(this.#m_time) <
			this.#timeValue(this.#m_minimumTime))
			this.setTime(this.#m_minimumTime);
	}

	/** Returns the maximum time. */
	maximumTime(): Date
	{
		return new Date(this.#m_maximumTime);
	}

	/** Sets the maximum time. */
	setMaximumTime(time: Date): void
	{
		/** Provides if behavior. */
		if (!this.#validDate(time))
			return;

		time = this.#normalizedTime(time);

		/** Provides if behavior. */
		if (this.#timeValue(time) <
			this.#timeValue(this.#m_minimumTime))
			return;

		/** Provides if behavior. */
		if (this.#sameTime(time, this.#m_maximumTime))
			return;

		this.#m_maximumTime = new Date(time);

		/** Provides if behavior. */
		if (this.#timeValue(this.#m_time) >
			this.#timeValue(this.#m_maximumTime))
			this.setTime(this.#m_maximumTime);
	}

	/** Provides display format behavior. */
	displayFormat(): string
	{
		return this.#m_displayFormat;
	}

	/** Sets the display format. */
	setDisplayFormat(format: string): void
	{
		/** Provides if behavior. */
		if (this.#m_displayFormat === format)
			return;

		this.#m_displayFormat = format;

		this.#updateText();
		this.update();
	}

	/** Provides line edit behavior. */
	lineEdit(): CSectionLineEdit
	{
		return this.#m_lineEdit;
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

	/** Sets the geometry. */
	override setGeometry(
		x: number, y: number, width: number, height: number
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

	/** Returns the preferred size of the widget. */
	override sizeHint(): CSize
	{
		return new CSize(100, 30);
	}

	#updateGeometry(): void
	{
		const buttonWidth = Math.min(
			CTimeEdit.ButtonWidth,
			this.width()
		);

		const buttonHeight = Math.floor(this.height() / 2);

		this.#m_lineEdit.setGeometry(
			0,
			0,
			Math.max(0, this.width() - buttonWidth),
			this.height()
		);

		this.#m_upButton.setGeometry(
			this.width() - buttonWidth,
			0,
			buttonWidth,
			buttonHeight
		);

		this.#m_downButton.setGeometry(
			this.width() - buttonWidth,
			buttonHeight,
			buttonWidth,
			this.height() - buttonHeight
		);
	}

	#updateText(): void
	{
		const formatted = this.#formatTime(this.#m_time);

		this.#m_sections = formatted.sections;

		this.#m_lineEdit.setText(formatted.text);

		const sections: CLineEditSection[] =
			this.#m_sections.map(section => ({
				start: section.start,
				length: section.length
			}));

		this.#m_lineEdit.setSections(sections);
	}

	#formatTime(
		time: Date
	): {
		text: string;
		sections: CTimeSectionInfo[];
	}
	{
		const hour24 = time.getHours();
		const hour12 = hour24 % 12 || 12;
		const minute = time.getMinutes();
		const second = time.getSeconds();

		const sections: CTimeSectionInfo[] = [];
		let text = "";
		let index = 0;

		const tokens =
			this.#m_displayFormat.match(
				/HH|H|hh|h|mm|m|ss|s|AP|ap|./g
			) ?? [];

		/** Provides for behavior. */
		for (const token of tokens) {
			let value = token;
			let type: CTimeSection | null = null;

			/** Provides switch behavior. */
			switch (token) {
				case "HH":
					value = hour24
						.toString()
						.padStart(2, "0");
					type = "hour";
					break;

				case "H":
					value = hour24.toString();
					type = "hour";
					break;

				case "hh":
					value = hour12
						.toString()
						.padStart(2, "0");
					type = "hour";
					break;

				case "h":
					value = hour12.toString();
					type = "hour";
					break;

				case "mm":
					value = minute
						.toString()
						.padStart(2, "0");
					type = "minute";
					break;

				case "m":
					value = minute.toString();
					type = "minute";
					break;

				case "ss":
					value = second
						.toString()
						.padStart(2, "0");
					type = "second";
					break;

				case "s":
					value = second.toString();
					type = "second";
					break;

				case "AP":
					value = hour24 < 12 ? "AM" : "PM";
					type = "ampm";
					break;

				case "ap":
					value = hour24 < 12 ? "am" : "pm";
					type = "ampm";
					break;
			}

			/** Provides if behavior. */
			if (type !== null) {
				sections.push({
					type,
					start: index,
					length: value.length
				});
			}

			text += value;
			index += value.length;
		}

		return {
			text,
			sections
		};
	}

	#stepSection(section: number, direction: number): void
	{
		/** Provides if behavior. */
		if (section < 0 || section >= this.#m_sections.length)
			return;

		const type = this.#m_sections[section]!.type;

		let hour = this.#m_time.getHours();
		let minute = this.#m_time.getMinutes();
		let second = this.#m_time.getSeconds();

		/** Provides switch behavior. */
		switch (type) {
			case "hour":
				hour = (
					hour +
					direction +
					24
				) % 24;
				break;

			case "minute":
				minute = (
					minute +
					direction +
					60
				) % 60;
				break;

			case "second":
				second = (
					second +
					direction +
					60
				) % 60;
				break;

			case "ampm":
				hour = (hour + 12) % 24;
				break;
		}

		const time = this.#makeTime(
			hour,
			minute,
			second
		);

		/** Provides if behavior. */
		if (
			this.#timeValue(time) <
				this.#timeValue(this.#m_minimumTime) ||
			this.#timeValue(time) >
				this.#timeValue(this.#m_maximumTime)
		)
			return;

		this.setTime(time);

		this.#m_lineEdit.setCurrentSection(section);
	}

	#enterDigit(index: number, digit: number): void
	{
		const section = this.#m_sections[index];
		if (section === undefined || section.type === "ampm")
			return;

		if (index !== this.#m_inputSection) {
			this.#m_inputSection = index;
			this.#m_inputDigits = "";
		}

		const twelveHour = this.#m_displayFormat.includes("h");
		const maximum = section.type === "hour"
			? twelveHour ? 12 : 23
			: 59;
		let digits = `${this.#m_inputDigits}${digit}`;
		let value = Number(digits);

		if (digits.length > 2 || value > maximum) {
			digits = String(digit);
			value = digit;
		}

		this.#m_inputDigits = digits;

		let hour = this.#m_time.getHours();
		let minute = this.#m_time.getMinutes();
		let second = this.#m_time.getSeconds();

		if (section.type === "hour") {
			if (twelveHour) {
				const afternoon = hour >= 12;
				hour = value % 12 + (afternoon ? 12 : 0);
			} else
				hour = value;
		} else if (section.type === "minute")
			minute = value;
		else
			second = value;

		this.setTime(this.#makeTime(hour, minute, second));
		this.#m_lineEdit.setCurrentSection(index);

		if (digits.length >= 2 || value * 10 > maximum) {
			this.#m_inputDigits = "";
			this.#m_inputSection = -1;
			this.#m_lineEdit.event(new CKeyEvent(
				CEventType.KeyPress,
				"ArrowRight"
			));
		}
	}

	#normalizedTime(time: Date): Date
	{
		return this.#makeTime(
			time.getHours(),
			time.getMinutes(),
			time.getSeconds()
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

	#timeValue(time: Date): number
	{
		return time.getHours() * 3600 +
			time.getMinutes() * 60 +
			time.getSeconds();
	}

	#validDate(time: Date): boolean
	{
		return !Number.isNaN(time.getTime());
	}

	#sameTime(a: Date, b: Date): boolean
	{
		return a.getHours() === b.getHours() &&
			a.getMinutes() === b.getMinutes() &&
			a.getSeconds() === b.getSeconds();
	}
}
