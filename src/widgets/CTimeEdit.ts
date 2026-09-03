import { CSignal } from "../core/CSignal.js";
import { CSize } from "../geometry/CSize.js";
import type { CLineEditSection } from "./CSectionLineEdit.js";
import { CSectionLineEdit } from "./CSectionLineEdit.js";
import { CToolButton } from "./CToolButton.js";
import { CWidget } from "./CWidget.js";
import { CFocusPolicy } from "../gui/CFocusPolicy.js";

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


export class CTimeEdit extends CWidget
{
	static readonly ButtonWidth = 28;

	readonly timeChanged = new CSignal<[Date]>();

	#m_time: Date;
	#m_minimumTime: Date;
	#m_maximumTime: Date;

	#m_displayFormat = "HH:mm";

	#m_lineEdit: CSectionLineEdit;
	#m_upButton: CToolButton;
	#m_downButton: CToolButton;

	#m_sections: CTimeSectionInfo[] = [];

	constructor(parent: CWidget | null = null)
	{
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

		this.resize(
			this.sizeHint().width(),
			this.sizeHint().height()
		);

		this.#updateText();
		this.#updateGeometry();
        this.#m_lineEdit.setFocusPolicy(CFocusPolicy.StrongFocus);
        this.#m_upButton.setFocusPolicy(CFocusPolicy.ClickFocus);
        this.#m_downButton.setFocusPolicy(CFocusPolicy.ClickFocus);
	}

	time(): Date
	{
		return new Date(this.#m_time);
	}

	setTime(time: Date): void
	{
		if (!this.#validDate(time))
			return;

		time = this.#normalizedTime(time);

		if (this.#timeValue(time) <
			this.#timeValue(this.#m_minimumTime))
			time = new Date(this.#m_minimumTime);

		if (this.#timeValue(time) >
			this.#timeValue(this.#m_maximumTime))
			time = new Date(this.#m_maximumTime);

		if (this.#sameTime(time, this.#m_time))
			return;

		this.#m_time = new Date(time);

		this.#updateText();

		this.timeChanged.emit(new Date(this.#m_time));
		this.update();
	}

	minimumTime(): Date
	{
		return new Date(this.#m_minimumTime);
	}

	setMinimumTime(time: Date): void
	{
		if (!this.#validDate(time))
			return;

		time = this.#normalizedTime(time);

		if (this.#timeValue(time) >
			this.#timeValue(this.#m_maximumTime))
			return;

		if (this.#sameTime(time, this.#m_minimumTime))
			return;

		this.#m_minimumTime = new Date(time);

		if (this.#timeValue(this.#m_time) <
			this.#timeValue(this.#m_minimumTime))
			this.setTime(this.#m_minimumTime);
	}

	maximumTime(): Date
	{
		return new Date(this.#m_maximumTime);
	}

	setMaximumTime(time: Date): void
	{
		if (!this.#validDate(time))
			return;

		time = this.#normalizedTime(time);

		if (this.#timeValue(time) <
			this.#timeValue(this.#m_minimumTime))
			return;

		if (this.#sameTime(time, this.#m_maximumTime))
			return;

		this.#m_maximumTime = new Date(time);

		if (this.#timeValue(this.#m_time) >
			this.#timeValue(this.#m_maximumTime))
			this.setTime(this.#m_maximumTime);
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
		this.update();
	}

	lineEdit(): CSectionLineEdit
	{
		return this.#m_lineEdit;
	}

	stepUp(): void
	{
		this.#stepSection(
			this.#m_lineEdit.currentSection(),
			1
		);
        this.#m_lineEdit.setFocus();
	}

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

		for (const token of tokens) {
			let value = token;
			let type: CTimeSection | null = null;

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
		if (section < 0 || section >= this.#m_sections.length)
			return;

		const type = this.#m_sections[section]!.type;

		let hour = this.#m_time.getHours();
		let minute = this.#m_time.getMinutes();
		let second = this.#m_time.getSeconds();

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