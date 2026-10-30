import { CWidget } from "../../src/widgets/CWidget.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CLabel } from "../../src/widgets/CLabel.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CDateTimeEdit } from "../../src/widgets/CDateTimeEdit.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";


describe("CDateTimeEdit", () =>
{
	beforeEach(() =>
	{
		new CApplication(createTestCanvas());
	});

	afterEach(() =>
	{
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("creates date and time editors", () =>
	{
		const edit = new CDateTimeEdit();

		expect(edit.dateEdit()).toBeDefined();
		expect(edit.timeEdit()).toBeDefined();
		expect(edit.dateLineEdit()).toBe(
			edit.dateEdit().lineEdit()
		);
		expect(edit.timeLineEdit()).toBe(
			edit.timeEdit().lineEdit()
		);
	});

	test("sizeHint combines date and time editors", () =>
	{
		const edit = new CDateTimeEdit();

		expect(edit.sizeHint().width()).toBe(
			edit.dateEdit().sizeHint().width() +
			edit.timeEdit().sizeHint().width()
		);

		expect(edit.sizeHint().height()).toBe(
			Math.max(
				edit.dateEdit().sizeHint().height(),
				edit.timeEdit().sizeHint().height()
			)
		);
	});

	test("dateTime returns a copy", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 8, 2, 14, 35, 20)
		);

		const dateTime = edit.dateTime();

		dateTime.setFullYear(2030);

		expect(edit.dateTime().getFullYear()).toBe(2026);
	});

	test("setDateTime normalizes milliseconds", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 8, 2, 14, 35, 20, 500)
		);

		expect(edit.dateTime().getMilliseconds()).toBe(0);
	});

	test("setDateTime synchronizes date editor", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		const date = edit.dateEdit().date();

		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(4);
		expect(date.getDate()).toBe(14);
	});

	test("setDateTime synchronizes time editor", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		const time = edit.timeEdit().time();

		expect(time.getHours()).toBe(12);
		expect(time.getMinutes()).toBe(30);
		expect(time.getSeconds()).toBe(15);
	});

	test("date returns date at midnight", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		const date = edit.date();

		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(4);
		expect(date.getDate()).toBe(14);
		expect(date.getHours()).toBe(0);
		expect(date.getMinutes()).toBe(0);
		expect(date.getSeconds()).toBe(0);
	});

	test("date returns a copy", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		const date = edit.date();

		date.setDate(20);

		expect(edit.date().getDate()).toBe(14);
	});

	test("time uses neutral date", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		const time = edit.time();

		expect(time.getFullYear()).toBe(2000);
		expect(time.getMonth()).toBe(0);
		expect(time.getDate()).toBe(1);
		expect(time.getHours()).toBe(12);
		expect(time.getMinutes()).toBe(30);
		expect(time.getSeconds()).toBe(15);
	});

	test("setDate preserves time", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.setDate(new Date(2027, 6, 20));

		const dateTime = edit.dateTime();

		expect(dateTime.getFullYear()).toBe(2027);
		expect(dateTime.getMonth()).toBe(6);
		expect(dateTime.getDate()).toBe(20);
		expect(dateTime.getHours()).toBe(12);
		expect(dateTime.getMinutes()).toBe(30);
		expect(dateTime.getSeconds()).toBe(15);
	});

	test("setTime preserves date", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.setTime(
			new Date(2000, 0, 1, 20, 45, 30)
		);

		const dateTime = edit.dateTime();

		expect(dateTime.getFullYear()).toBe(2026);
		expect(dateTime.getMonth()).toBe(4);
		expect(dateTime.getDate()).toBe(14);
		expect(dateTime.getHours()).toBe(20);
		expect(dateTime.getMinutes()).toBe(45);
		expect(dateTime.getSeconds()).toBe(30);
	});

	test("invalid dateTime is ignored", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.setDateTime(new Date(NaN));

		expect(edit.dateTime().getTime()).toBe(
			new Date(2026, 4, 14, 12, 30, 15).getTime()
		);
	});

	test("dateTimeChanged is emitted once", () =>
	{
		const edit = new CDateTimeEdit();
		const callback = vi.fn();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.dateTimeChanged.connect(callback);

		edit.setDateTime(
			new Date(2027, 5, 20, 13, 45, 10)
		);

		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("dateTimeChanged is not emitted for same value", () =>
	{
		const edit = new CDateTimeEdit();
		const callback = vi.fn();
		const dateTime =
			new Date(2026, 4, 14, 12, 30, 15);

		edit.setDateTime(dateTime);
		edit.dateTimeChanged.connect(callback);

		edit.setDateTime(new Date(dateTime));

		expect(callback).not.toHaveBeenCalled();
	});

	test("dateTimeChanged emits a copy", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.dateTimeChanged.connect(dateTime =>
		{
			dateTime.setFullYear(2030);
		});

		edit.setDateTime(
			new Date(2027, 4, 14, 12, 30, 15)
		);

		expect(edit.dateTime().getFullYear()).toBe(2027);
	});

	test("dateChanged is emitted when date changes", () =>
	{
		const edit = new CDateTimeEdit();
		const callback = vi.fn();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.dateChanged.connect(callback);

		edit.setDate(
			new Date(2026, 4, 15)
		);

		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("dateChanged is not emitted when only time changes", () =>
	{
		const edit = new CDateTimeEdit();
		const callback = vi.fn();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.dateChanged.connect(callback);

		edit.setTime(
			new Date(2000, 0, 1, 13, 30, 15)
		);

		expect(callback).not.toHaveBeenCalled();
	});

	test("timeChanged is emitted when time changes", () =>
	{
		const edit = new CDateTimeEdit();
		const callback = vi.fn();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.timeChanged.connect(callback);

		edit.setTime(
			new Date(2000, 0, 1, 13, 45, 20)
		);

		expect(callback).toHaveBeenCalledTimes(1);
	});

	test("timeChanged is not emitted when only date changes", () =>
	{
		const edit = new CDateTimeEdit();
		const callback = vi.fn();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.timeChanged.connect(callback);

		edit.setDate(
			new Date(2026, 4, 15)
		);

		expect(callback).not.toHaveBeenCalled();
	});

	test("minimumDateTime returns a copy", () =>
	{
		const edit = new CDateTimeEdit();
		const minimum = edit.minimumDateTime();

		minimum.setFullYear(2000);

		expect(
			edit.minimumDateTime().getFullYear()
		).toBe(1752);
	});

	test("maximumDateTime returns a copy", () =>
	{
		const edit = new CDateTimeEdit();
		const maximum = edit.maximumDateTime();

		maximum.setFullYear(2000);

		expect(
			edit.maximumDateTime().getFullYear()
		).toBe(9999);
	});

	test("setDateTime clamps to minimum", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setMinimumDateTime(
			new Date(2026, 4, 14, 12, 30, 0)
		);

		edit.setDateTime(
			new Date(2026, 4, 14, 10, 0, 0)
		);

		expect(edit.dateTime().getTime()).toBe(
			new Date(2026, 4, 14, 12, 30, 0).getTime()
		);
	});

	test("setDateTime clamps to maximum", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setMaximumDateTime(
			new Date(2026, 4, 14, 18, 30, 0)
		);

		edit.setDateTime(
			new Date(2026, 4, 14, 20, 0, 0)
		);

		expect(edit.dateTime().getTime()).toBe(
			new Date(2026, 4, 14, 18, 30, 0).getTime()
		);
	});

	test("minimum after maximum is ignored", () =>
	{
		const edit = new CDateTimeEdit();
		const minimum = edit.minimumDateTime();

		edit.setMinimumDateTime(
			new Date(10000, 0, 1)
		);

		expect(edit.minimumDateTime().getTime()).toBe(
			minimum.getTime()
		);
	});

	test("maximum before minimum is ignored", () =>
	{
		const edit = new CDateTimeEdit();
		const maximum = edit.maximumDateTime();

		edit.setMaximumDateTime(
			new Date(1700, 0, 1)
		);

		expect(edit.maximumDateTime().getTime()).toBe(
			maximum.getTime()
		);
	});

	test("minimum clamps current dateTime", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 10, 0, 0)
		);

		edit.setMinimumDateTime(
			new Date(2026, 4, 14, 12, 0, 0)
		);

		expect(edit.dateTime().getTime()).toBe(
			new Date(2026, 4, 14, 12, 0, 0).getTime()
		);
	});

	test("maximum clamps current dateTime", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 20, 0, 0)
		);

		edit.setMaximumDateTime(
			new Date(2026, 4, 14, 18, 0, 0)
		);

		expect(edit.dateTime().getTime()).toBe(
			new Date(2026, 4, 14, 18, 0, 0).getTime()
		);
	});

	test("minimum time is applied on minimum date", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setMinimumDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.setDateTime(
			new Date(2026, 4, 14, 14, 0, 0)
		);

		const minimum = edit.timeEdit().minimumTime();

		expect(minimum.getHours()).toBe(12);
		expect(minimum.getMinutes()).toBe(30);
		expect(minimum.getSeconds()).toBe(15);
	});

	test("minimum time resets after leaving minimum date", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setMinimumDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.setDateTime(
			new Date(2026, 4, 15, 14, 0, 0)
		);

		const minimum = edit.timeEdit().minimumTime();

		expect(minimum.getHours()).toBe(0);
		expect(minimum.getMinutes()).toBe(0);
		expect(minimum.getSeconds()).toBe(0);
	});

	test("maximum time is applied on maximum date", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setMaximumDateTime(
			new Date(2026, 4, 14, 18, 30, 15)
		);

		edit.setDateTime(
			new Date(2026, 4, 14, 14, 0, 0)
		);

		const maximum = edit.timeEdit().maximumTime();

		expect(maximum.getHours()).toBe(18);
		expect(maximum.getMinutes()).toBe(30);
		expect(maximum.getSeconds()).toBe(15);
	});

	test("maximum time resets before maximum date", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setMaximumDateTime(
			new Date(2026, 4, 15, 18, 30, 15)
		);

		edit.setDateTime(
			new Date(2026, 4, 14, 14, 0, 0)
		);

		const maximum = edit.timeEdit().maximumTime();

		expect(maximum.getHours()).toBe(23);
		expect(maximum.getMinutes()).toBe(59);
		expect(maximum.getSeconds()).toBe(59);
	});

	test("changing child date preserves time", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.dateEdit().setDate(
			new Date(2026, 4, 20)
		);

		const dateTime = edit.dateTime();

		expect(dateTime.getDate()).toBe(20);
		expect(dateTime.getHours()).toBe(12);
		expect(dateTime.getMinutes()).toBe(30);
		expect(dateTime.getSeconds()).toBe(15);
	});

	test("changing child time preserves date", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateTime(
			new Date(2026, 4, 14, 12, 30, 15)
		);

		edit.timeEdit().setTime(
			new Date(2000, 0, 1, 18, 45, 30)
		);

		const dateTime = edit.dateTime();

		expect(dateTime.getFullYear()).toBe(2026);
		expect(dateTime.getMonth()).toBe(4);
		expect(dateTime.getDate()).toBe(14);
		expect(dateTime.getHours()).toBe(18);
		expect(dateTime.getMinutes()).toBe(45);
		expect(dateTime.getSeconds()).toBe(30);
	});

	test("date display format is delegated", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setDateDisplayFormat("yyyy-MM-dd");

		expect(edit.dateDisplayFormat()).toBe(
			"yyyy-MM-dd"
		);
		expect(edit.dateEdit().displayFormat()).toBe(
			"yyyy-MM-dd"
		);
	});

	test("time display format is delegated", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setTimeDisplayFormat("HH:mm:ss");

		expect(edit.timeDisplayFormat()).toBe(
			"HH:mm:ss"
		);
		expect(edit.timeEdit().displayFormat()).toBe(
			"HH:mm:ss"
		);
	});

	test("calendar popup setting is delegated", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setCalendarPopup(false);

		expect(edit.calendarPopup()).toBe(false);
		expect(edit.dateEdit().calendarPopup()).toBe(false);
	});

	test("calendarWidget returns date editor calendar", () =>
	{
		const edit = new CDateTimeEdit();

		expect(edit.calendarWidget()).toBe(
			edit.dateEdit().calendarWidget()
		);
	});

	test("right from last date section moves to first time section", () =>
	{
		const edit = new CDateTimeEdit();
		const dateLineEdit = edit.dateLineEdit();
		const timeLineEdit = edit.timeLineEdit();

		dateLineEdit.setCurrentSection(
			dateLineEdit.sections().length - 1
		);

		dateLineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"ArrowRight",
				false,
				false,
				false,
				false
			)
		);

		expect(timeLineEdit.currentSection()).toBe(0);
	});

	test("left from first time section moves to last date section", () =>
	{
		const edit = new CDateTimeEdit();
		const dateLineEdit = edit.dateLineEdit();
		const timeLineEdit = edit.timeLineEdit();

		timeLineEdit.setCurrentSection(0);

		timeLineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"ArrowLeft",
				false,
				false,
				false,
				false
			)
		);

		expect(dateLineEdit.currentSection()).toBe(
			dateLineEdit.sections().length - 1
		);
	});

	test("left from first date section moves to last time section", () =>
	{
		const edit = new CDateTimeEdit();
		const dateLineEdit = edit.dateLineEdit();
		const timeLineEdit = edit.timeLineEdit();

		dateLineEdit.setCurrentSection(0);

		dateLineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"ArrowLeft",
				false,
				false,
				false,
				false
			)
		);

		expect(timeLineEdit.currentSection()).toBe(
			timeLineEdit.sections().length - 1
		);
	});

	test("right from last time section moves to first date section", () =>
	{
		const edit = new CDateTimeEdit();
		const dateLineEdit = edit.dateLineEdit();
		const timeLineEdit = edit.timeLineEdit();

		timeLineEdit.setCurrentSection(
			timeLineEdit.sections().length - 1
		);

		timeLineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"ArrowRight",
				false,
				false,
				false,
				false
			)
		);

		expect(dateLineEdit.currentSection()).toBe(0);
	});

	test("right inside date editor stays in date editor", () =>
	{
		const edit = new CDateTimeEdit();
		const dateLineEdit = edit.dateLineEdit();

		dateLineEdit.setCurrentSection(0);

		dateLineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"ArrowRight",
				false,
				false,
				false,
				false
			)
		);

		expect(dateLineEdit.currentSection()).toBe(1);
	});

	test("right inside time editor stays in time editor", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setTimeDisplayFormat("HH:mm:ss");

		const timeLineEdit = edit.timeLineEdit();

		timeLineEdit.setCurrentSection(0);

		timeLineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"ArrowRight",
				false,
				false,
				false,
				false
			)
		);

		expect(timeLineEdit.currentSection()).toBe(1);
	});

	test("date left wraps to seconds when seconds are displayed", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setTimeDisplayFormat("HH:mm:ss");

		const dateLineEdit = edit.dateLineEdit();
		const timeLineEdit = edit.timeLineEdit();

		dateLineEdit.setCurrentSection(0);

		dateLineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"ArrowLeft",
				false,
				false,
				false,
				false
			)
		);

		expect(timeLineEdit.currentSection()).toBe(2);
	});

	test("date left wraps to AP section in 12 hour format", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setTimeDisplayFormat("hh:mm AP");

		const dateLineEdit = edit.dateLineEdit();
		const timeLineEdit = edit.timeLineEdit();

		dateLineEdit.setCurrentSection(0);

		dateLineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"ArrowLeft",
				false,
				false,
				false,
				false
			)
		);

		expect(timeLineEdit.currentSection()).toBe(
			timeLineEdit.sections().length - 1
		);
		expect(timeLineEdit.currentSection()).toBe(2);
	});

	test("time AP right wraps to first date section", () =>
	{
		const edit = new CDateTimeEdit();

		edit.setTimeDisplayFormat("hh:mm AP");

		const dateLineEdit = edit.dateLineEdit();
		const timeLineEdit = edit.timeLineEdit();

		timeLineEdit.setCurrentSection(2);

		timeLineEdit.event(
			new CKeyEvent(
				CEventType.KeyPress,
				"ArrowRight",
				false,
				false,
				false,
				false
			)
		);

		expect(dateLineEdit.currentSection()).toBe(0);
	});

	test("typing a complete date continues in the time editor", () => {
		const edit = new CDateTimeEdit();
		edit.setDateTime(new Date(2026, 9, 16, 8, 30, 0));
		edit.dateLineEdit().setCurrentSection(0);

		for (const key of ["2", "5", "1", "2", "2", "0", "3", "1"])
			edit.dateLineEdit().event(new CKeyEvent(CEventType.KeyPress, key));

		expect(edit.dateTime().getFullYear()).toBe(2031);
		expect(edit.dateTime().getMonth()).toBe(11);
		expect(edit.dateTime().getDate()).toBe(25);
		expect(edit.timeLineEdit().currentSection()).toBe(0);
		expect(edit.timeLineEdit().hasFocus()).toBe(true);
	});

	test("typing a complete time continues in the date editor", () => {
		const edit = new CDateTimeEdit();
		edit.setTimeDisplayFormat("HH:mm:ss");
		edit.setDateTime(new Date(2026, 9, 16, 8, 30, 0));
		edit.timeLineEdit().setCurrentSection(0);

		for (const key of ["1", "4", "4", "5", "0", "9"])
			edit.timeLineEdit().event(new CKeyEvent(CEventType.KeyPress, key));

		expect(edit.dateTime().getHours()).toBe(14);
		expect(edit.dateTime().getMinutes()).toBe(45);
		expect(edit.dateTime().getSeconds()).toBe(9);
		expect(edit.dateLineEdit().currentSection()).toBe(0);
		expect(edit.dateLineEdit().hasFocus()).toBe(true);
	});

	test("typed time respects the minimum date-time", () => {
		const edit = new CDateTimeEdit();
		const minimum = new Date(2026, 9, 16, 10, 30, 0);
		edit.setMinimumDateTime(minimum);
		edit.setDateTime(minimum);
		edit.timeLineEdit().setCurrentSection(0);

		edit.timeLineEdit().event(new CKeyEvent(CEventType.KeyPress, "0"));
		edit.timeLineEdit().event(new CKeyEvent(CEventType.KeyPress, "9"));

		expect(edit.dateTime().getTime()).toBe(minimum.getTime());
	});
});


 describe("CDateTimeEdit focus proxy", () => {
  let previousWindow: PropertyDescriptor | undefined;
  beforeEach(() => {
   previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
   Object.defineProperty(globalThis, "window", { value: createTestWindow(), writable: true, configurable: true });
   new CApplication(createTestCanvas());
  });
  afterEach(() => {
   if (CApplication.exists()) CApplication.instance().destroy();
   if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
   else Reflect.deleteProperty(globalThis, "window");
  });
  test("setFocus resolves to the embedded section editor", () => {
   const edit = new CDateTimeEdit(); edit.setFocus();
   expect(edit.focusProxy()).toBe(edit.dateEdit());
   expect(CApplication.instance().focusWidget()).toBe(edit.dateLineEdit());
   expect(edit.hasFocus()).toBe(true);
  });
  test("direct editor focus gives the owner logical focus", () => {
   const edit = new CDateTimeEdit(); edit.dateLineEdit().setFocus(); expect(edit.hasFocus()).toBe(true);
   edit.clearFocus(); expect(CApplication.instance().focusWidget()).toBeNull();
  });
  test("moving focus to another widget clears logical focus", () => {
   const edit = new CDateTimeEdit(); const other = new CLineEdit();
   edit.setFocus(); other.setFocus(); expect(edit.hasFocus()).toBe(false);
  });
  test("focus policy propagates and NoFocus clears editor focus", () => {
   const edit = new CDateTimeEdit(); edit.setFocus(); edit.setFocusPolicy(CFocusPolicy.NoFocus);
   expect(edit.dateLineEdit().focusPolicy()).toBe(CFocusPolicy.NoFocus);
   expect(CApplication.instance().focusWidget()).toBeNull();
   edit.setFocusPolicy(CFocusPolicy.StrongFocus); edit.setFocus(); expect(edit.dateLineEdit().hasFocus()).toBe(true);
  });
  test("hidden and disabled owners cannot take editor focus", () => {
   const edit = new CDateTimeEdit(); const other = new CLineEdit(); other.setFocus();
   edit.hide(); edit.setFocus(); expect(other.hasFocus()).toBe(true);
   edit.show(); edit.setEnabled(false); edit.setFocus(); expect(other.hasFocus()).toBe(true);
   edit.setEnabled(true); edit.setFocus(); expect(edit.dateLineEdit().hasFocus()).toBe(true);
  });
  test("Tab and Shift+Tab visit each embedded input once and skip buttons", () => {
   const root = new CWidget(); const first = new CLineEdit(root);
   const edit = new CDateTimeEdit(root); const last = new CLineEdit(root);
   const app = CApplication.instance(); first.setFocus();
   for (const target of [edit.dateLineEdit(), edit.timeLineEdit(), last, first]) {
    expect(app.focusNextWidget()).toBe(true); expect(app.focusWidget()).toBe(target);
   }
   for (const target of [last, edit.timeLineEdit(), edit.dateLineEdit(), first]) {
    expect(app.focusNextWidget(false)).toBe(true); expect(app.focusWidget()).toBe(target);
   }
  });
  test("custom Tab order moves the owner and its proxy together", () => {
   const root = new CWidget(); const first = new CLineEdit(root);
   const edit = new CDateTimeEdit(root); const last = new CLineEdit(root);
   CWidget.setTabOrder(first, last); CWidget.setTabOrder(last, edit);
   const app = CApplication.instance(); first.setFocus(); app.focusNextWidget();
   expect(app.focusWidget()).toBe(last); app.focusNextWidget(); expect(app.focusWidget()).toBe(edit.dateLineEdit());
  });
  test("a buddy label focuses the section editor", () => {
   const root = new CWidget(); const edit = new CDateTimeEdit(root); const label = new CLabel(root);
   label.setText("&Value"); label.setBuddy(edit); expect(label.activateBuddy()).toBe(true);
   expect(CApplication.instance().focusWidget()).toBe(edit.dateLineEdit());
  });
  test("reparenting preserves the proxy chain", () => {
   const edit = new CDateTimeEdit(); const root = new CWidget(); edit.setParent(root); edit.setFocus();
   expect(edit.focusProxy()).toBe(edit.dateEdit()); expect(edit.dateLineEdit().hasFocus()).toBe(true);
  });
  test("destroying a focused editor clears application focus", () => {
   const edit = new CDateTimeEdit(); edit.setFocus(); edit.destroy();
   expect(CApplication.instance().focusWidget()).toBeNull();
  });

  test("time focus is logical focus of the complete date-time editor", () => {
   const edit = new CDateTimeEdit(); edit.timeLineEdit().setFocus();
   expect(edit.hasFocus()).toBe(true); edit.clearFocus();
   expect(CApplication.instance().focusWidget()).toBeNull();
  });
  test("NoFocus also clears focused time and removes both inputs from Tab order", () => {
   const root = new CWidget(); const first = new CLineEdit(root);
   const edit = new CDateTimeEdit(root); const last = new CLineEdit(root);
   edit.timeLineEdit().setFocus(); edit.setFocusPolicy(CFocusPolicy.NoFocus);
   expect(CApplication.instance().focusWidget()).toBeNull();
   expect(edit.timeLineEdit().focusPolicy()).toBe(CFocusPolicy.NoFocus);
   first.setFocus(); CApplication.instance().focusNextWidget(); expect(last.hasFocus()).toBe(true);
  });
 });
