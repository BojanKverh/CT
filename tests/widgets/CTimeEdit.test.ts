import { CWidget } from "../../src/widgets/CWidget.js";
import { CLineEdit } from "../../src/widgets/CLineEdit.js";
import { CLabel } from "../../src/widgets/CLabel.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CTimeEdit } from "../../src/widgets/CTimeEdit.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";


function makeTime(
	hour: number,
	minute: number,
	second: number = 0
): Date
{
	return new Date(
		2026,
		8,
		2,
		hour,
		minute,
		second
	);
}


describe("CTimeEdit", () =>
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

	test("has default size hint", () =>
	{
		const edit = new CTimeEdit();

		expect(edit.sizeHint().width()).toBe(100);
		expect(edit.sizeHint().height()).toBe(30);
	});

	test("default format is HH:mm", () =>
	{
		const edit = new CTimeEdit();

		expect(edit.displayFormat()).toBe("HH:mm");
	});

	test("line edit is read only", () =>
	{
		const edit = new CTimeEdit();

		expect(edit.lineEdit().isReadOnly()).toBe(true);
	});

	test("setTime updates time", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(14, 23, 51));

		expect(edit.time().getHours()).toBe(14);
		expect(edit.time().getMinutes()).toBe(23);
		expect(edit.time().getSeconds()).toBe(51);
	});

	test("time ignores date portion", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(
			new Date(1980, 2, 15, 14, 23, 51)
		);

		const time = edit.time();

		expect(time.getHours()).toBe(14);
		expect(time.getMinutes()).toBe(23);
		expect(time.getSeconds()).toBe(51);
	});

	test("time returns a copy", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(14, 23, 51));

		const time = edit.time();

		time.setHours(1);

		expect(edit.time().getHours()).toBe(14);
	});

	test("invalid time is ignored", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(14, 23));

		edit.setTime(new Date(NaN));

		expect(edit.time().getHours()).toBe(14);
		expect(edit.time().getMinutes()).toBe(23);
	});

	test("setTime updates displayed text", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 5, 42));

		expect(edit.lineEdit().text()).toBe("08:05");
	});

	test("HH:mm:ss format displays seconds", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 5, 42));
		edit.setDisplayFormat("HH:mm:ss");

		expect(edit.lineEdit().text()).toBe("08:05:42");
	});

	test("H:m:s format does not pad values", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 5, 4));
		edit.setDisplayFormat("H:m:s");

		expect(edit.lineEdit().text()).toBe("8:5:4");
	});

	test("h:mm AP displays 12 hour time", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(20, 23));
		edit.setDisplayFormat("h:mm AP");

		expect(edit.lineEdit().text()).toBe("8:23 PM");
	});

	test("h:mm ap displays lowercase am pm", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 23));
		edit.setDisplayFormat("h:mm ap");

		expect(edit.lineEdit().text()).toBe("8:23 am");
	});

	test("midnight displays as 12 AM", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(0, 5));
		edit.setDisplayFormat("h:mm AP");

		expect(edit.lineEdit().text()).toBe("12:05 AM");
	});

	test("noon displays as 12 PM", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(12, 5));
		edit.setDisplayFormat("h:mm AP");

		expect(edit.lineEdit().text()).toBe("12:05 PM");
	});

	test("format without seconds preserves seconds", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 23, 42));
		edit.setDisplayFormat("HH:mm");

		expect(edit.lineEdit().text()).toBe("08:23");

		edit.setDisplayFormat("HH:mm:ss");

		expect(edit.lineEdit().text()).toBe("08:23:42");
	});

	test("timeChanged is emitted when time changes", () =>
	{
		const edit = new CTimeEdit();
		const changed = vi.fn();

		edit.timeChanged.connect(changed);

		edit.setTime(makeTime(14, 23, 51));

		expect(changed).toHaveBeenCalledTimes(1);
	});

	test("timeChanged is not emitted for same time", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(14, 23, 51));

		const changed = vi.fn();
		edit.timeChanged.connect(changed);

		edit.setTime(
			new Date(1990, 3, 4, 14, 23, 51)
		);

		expect(changed).not.toHaveBeenCalled();
	});

	test("timeChanged emits a copy", () =>
	{
		const edit = new CTimeEdit();
		let emitted: Date | null = null;

		edit.timeChanged.connect(time =>
		{
			emitted = time;
		});

		edit.setTime(makeTime(14, 23, 51));

		expect(emitted).not.toBeNull();

		emitted!.setHours(1);

		expect(edit.time().getHours()).toBe(14);
	});

	test("default minimum time is midnight", () =>
	{
		const edit = new CTimeEdit();
		const minimum = edit.minimumTime();

		expect(minimum.getHours()).toBe(0);
		expect(minimum.getMinutes()).toBe(0);
		expect(minimum.getSeconds()).toBe(0);
	});

	test("default maximum time is end of day", () =>
	{
		const edit = new CTimeEdit();
		const maximum = edit.maximumTime();

		expect(maximum.getHours()).toBe(23);
		expect(maximum.getMinutes()).toBe(59);
		expect(maximum.getSeconds()).toBe(59);
	});

	test("minimumTime returns a copy", () =>
	{
		const edit = new CTimeEdit();

		edit.setMinimumTime(makeTime(8, 0));

		const minimum = edit.minimumTime();
		minimum.setHours(1);

		expect(edit.minimumTime().getHours()).toBe(8);
	});

	test("maximumTime returns a copy", () =>
	{
		const edit = new CTimeEdit();

		edit.setMaximumTime(makeTime(18, 0));

		const maximum = edit.maximumTime();
		maximum.setHours(20);

		expect(edit.maximumTime().getHours()).toBe(18);
	});

	test("setTime clamps to minimum", () =>
	{
		const edit = new CTimeEdit();

		edit.setMinimumTime(makeTime(8, 30));
		edit.setTime(makeTime(7, 0));

		expect(edit.time().getHours()).toBe(8);
		expect(edit.time().getMinutes()).toBe(30);
	});

	test("setTime clamps to maximum", () =>
	{
		const edit = new CTimeEdit();

		edit.setMaximumTime(makeTime(18, 30));
		edit.setTime(makeTime(20, 0));

		expect(edit.time().getHours()).toBe(18);
		expect(edit.time().getMinutes()).toBe(30);
	});

	test("raising minimum clamps current time", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 0));
		edit.setMinimumTime(makeTime(10, 30));

		expect(edit.time().getHours()).toBe(10);
		expect(edit.time().getMinutes()).toBe(30);
	});

	test("lowering maximum clamps current time", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(18, 0));
		edit.setMaximumTime(makeTime(16, 30));

		expect(edit.time().getHours()).toBe(16);
		expect(edit.time().getMinutes()).toBe(30);
	});

	test("minimum above maximum is ignored", () =>
	{
		const edit = new CTimeEdit();

		edit.setMaximumTime(makeTime(18, 0));
		edit.setMinimumTime(makeTime(20, 0));

		expect(edit.minimumTime().getHours()).toBe(0);
	});

	test("maximum below minimum is ignored", () =>
	{
		const edit = new CTimeEdit();

		edit.setMinimumTime(makeTime(8, 0));
		edit.setMaximumTime(makeTime(7, 0));

		expect(edit.maximumTime().getHours()).toBe(23);
		expect(edit.maximumTime().getMinutes()).toBe(59);
	});

	test("stepUp increments hour section", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 23, 42));

        edit.lineEdit().setCurrentSection(0);
		edit.stepUp();

		expect(edit.time().getHours()).toBe(9);
		expect(edit.time().getMinutes()).toBe(23);
		expect(edit.time().getSeconds()).toBe(42);
	});

	test("stepDown decrements hour section", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 23, 42));
        edit.lineEdit().setCurrentSection(0);
		edit.stepDown();

		expect(edit.time().getHours()).toBe(7);
	});

	test("hour section wraps from 23 to 0", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(23, 23));
        edit.lineEdit().setCurrentSection(0);
		edit.stepUp();

		expect(edit.time().getHours()).toBe(0);
	});

	test("hour section wraps from 0 to 23", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(0, 23));
        edit.lineEdit().setCurrentSection(0);
		edit.stepDown();

		expect(edit.time().getHours()).toBe(23);
	});

	test("minute section increments independently", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 23, 42));
		edit.lineEdit().setCurrentSection(1);

		edit.stepUp();

		expect(edit.time().getHours()).toBe(8);
		expect(edit.time().getMinutes()).toBe(24);
		expect(edit.time().getSeconds()).toBe(42);
	});

	test("minute section wraps without changing hour", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 59, 42));
		edit.lineEdit().setCurrentSection(1);

		edit.stepUp();

		expect(edit.time().getHours()).toBe(8);
		expect(edit.time().getMinutes()).toBe(0);
	});

	test("second section wraps independently", () =>
	{
		const edit = new CTimeEdit();

		edit.setDisplayFormat("HH:mm:ss");
		edit.setTime(makeTime(8, 23, 59));
		edit.lineEdit().setCurrentSection(2);

		edit.stepUp();

		expect(edit.time().getHours()).toBe(8);
		expect(edit.time().getMinutes()).toBe(23);
		expect(edit.time().getSeconds()).toBe(0);
	});

	test("ampm section toggles by twelve hours", () =>
	{
		const edit = new CTimeEdit();

		edit.setDisplayFormat("h:mm AP");
		edit.setTime(makeTime(8, 23));

		edit.lineEdit().setCurrentSection(2);
		edit.stepUp();

		expect(edit.time().getHours()).toBe(20);
		expect(edit.lineEdit().text()).toBe("8:23 PM");
	});

	test("ArrowRight changes active section", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 23));
        edit.lineEdit().setCurrentSection(0);
		edit.lineEdit().event(new CKeyEvent(CEventType.KeyPress, "ArrowRight", false, false, false, false));

		expect(edit.lineEdit().currentSection()).toBe(1);
	});

    test("ArrowRight changes active section", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 23));
        edit.lineEdit().setCurrentSection(1);
		edit.lineEdit().event(new CKeyEvent(CEventType.KeyPress, "ArrowLeft", false, false, false, false));

		expect(edit.lineEdit().currentSection()).toBe(0);
	});

	test("ArrowUp changes currently selected section", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 23));
		edit.lineEdit().setCurrentSection(1);

		edit.lineEdit().event(new CKeyEvent(CEventType.KeyPress, "ArrowUp", false, false, false, false));

		expect(edit.time().getHours()).toBe(8);
		expect(edit.time().getMinutes()).toBe(24);
	});

	test("stepping cannot move outside minimum", () =>
	{
		const edit = new CTimeEdit();

		edit.setMinimumTime(makeTime(8, 30));
		edit.setTime(makeTime(8, 30));

		edit.lineEdit().setCurrentSection(1);
		edit.stepDown();

		expect(edit.time().getHours()).toBe(8);
		expect(edit.time().getMinutes()).toBe(30);
	});

	test("stepping cannot move outside maximum", () =>
	{
		const edit = new CTimeEdit();

		edit.setMaximumTime(makeTime(18, 30));
		edit.setTime(makeTime(18, 30));

		edit.lineEdit().setCurrentSection(1);
		edit.stepUp();

		expect(edit.time().getHours()).toBe(18);
		expect(edit.time().getMinutes()).toBe(30);
	});

	test("display format updates sections", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(8, 23, 42));
		edit.setDisplayFormat("HH:mm:ss");

		expect(edit.lineEdit().sections()).toEqual([
			{ start: 0, length: 2 },
			{ start: 3, length: 2 },
			{ start: 6, length: 2 }
		]);
	});

	test("12 hour format creates ampm section", () =>
	{
		const edit = new CTimeEdit();

		edit.setTime(makeTime(20, 23));
		edit.setDisplayFormat("h:mm AP");

		expect(edit.lineEdit().sections()).toEqual([
			{ start: 0, length: 1 },
			{ start: 2, length: 2 },
			{ start: 5, length: 2 }
		]);
	});

	test("numeric keys enter an hour and advance to minutes", () => {
		const edit = new CTimeEdit();
		edit.setTime(makeTime(8, 23, 42));
		edit.lineEdit().setCurrentSection(0);

		edit.lineEdit().event(new CKeyEvent(CEventType.KeyPress, "1"));
		edit.lineEdit().event(new CKeyEvent(CEventType.KeyPress, "4"));

		expect(edit.time().getHours()).toBe(14);
		expect(edit.time().getMinutes()).toBe(23);
		expect(edit.lineEdit().currentSection()).toBe(1);
	});

	test("numeric keys enter minutes and seconds", () => {
		const edit = new CTimeEdit();
		edit.setDisplayFormat("HH:mm:ss");
		edit.setTime(makeTime(8, 23, 42));
		edit.lineEdit().setCurrentSection(1);

		for (const key of ["4", "5", "0", "9"])
			edit.lineEdit().event(new CKeyEvent(CEventType.KeyPress, key));

		expect(edit.time().getHours()).toBe(8);
		expect(edit.time().getMinutes()).toBe(45);
		expect(edit.time().getSeconds()).toBe(9);
		expect(edit.lineEdit().currentSection()).toBe(0);
	});
});


 describe("CTimeEdit focus proxy", () => {
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
   const edit = new CTimeEdit(); edit.setFocus();
   expect(edit.focusProxy()).toBe(edit.lineEdit());
   expect(CApplication.instance().focusWidget()).toBe(edit.lineEdit());
   expect(edit.hasFocus()).toBe(true);
  });
  test("direct editor focus gives the owner logical focus", () => {
   const edit = new CTimeEdit(); edit.lineEdit().setFocus(); expect(edit.hasFocus()).toBe(true);
   edit.clearFocus(); expect(CApplication.instance().focusWidget()).toBeNull();
  });
  test("moving focus to another widget clears logical focus", () => {
   const edit = new CTimeEdit(); const other = new CLineEdit();
   edit.setFocus(); other.setFocus(); expect(edit.hasFocus()).toBe(false);
  });
  test("focus policy propagates and NoFocus clears editor focus", () => {
   const edit = new CTimeEdit(); edit.setFocus(); edit.setFocusPolicy(CFocusPolicy.NoFocus);
   expect(edit.lineEdit().focusPolicy()).toBe(CFocusPolicy.NoFocus);
   expect(CApplication.instance().focusWidget()).toBeNull();
   edit.setFocusPolicy(CFocusPolicy.StrongFocus); edit.setFocus(); expect(edit.lineEdit().hasFocus()).toBe(true);
  });
  test("hidden and disabled owners cannot take editor focus", () => {
   const edit = new CTimeEdit(); const other = new CLineEdit(); other.setFocus();
   edit.hide(); edit.setFocus(); expect(other.hasFocus()).toBe(true);
   edit.show(); edit.setEnabled(false); edit.setFocus(); expect(other.hasFocus()).toBe(true);
   edit.setEnabled(true); edit.setFocus(); expect(edit.lineEdit().hasFocus()).toBe(true);
  });
  test("Tab and Shift+Tab visit each embedded input once and skip buttons", () => {
   const root = new CWidget(); const first = new CLineEdit(root);
   const edit = new CTimeEdit(root); const last = new CLineEdit(root);
   const app = CApplication.instance(); first.setFocus();
   for (const target of [edit.lineEdit(), last, first]) {
    expect(app.focusNextWidget()).toBe(true); expect(app.focusWidget()).toBe(target);
   }
   for (const target of [last, edit.lineEdit(), first]) {
    expect(app.focusNextWidget(false)).toBe(true); expect(app.focusWidget()).toBe(target);
   }
  });
  test("custom Tab order moves the owner and its proxy together", () => {
   const root = new CWidget(); const first = new CLineEdit(root);
   const edit = new CTimeEdit(root); const last = new CLineEdit(root);
   CWidget.setTabOrder(first, last); CWidget.setTabOrder(last, edit);
   const app = CApplication.instance(); first.setFocus(); app.focusNextWidget();
   expect(app.focusWidget()).toBe(last); app.focusNextWidget(); expect(app.focusWidget()).toBe(edit.lineEdit());
  });
  test("a buddy label focuses the section editor", () => {
   const root = new CWidget(); const edit = new CTimeEdit(root); const label = new CLabel(root);
   label.setText("&Value"); label.setBuddy(edit); expect(label.activateBuddy()).toBe(true);
   expect(CApplication.instance().focusWidget()).toBe(edit.lineEdit());
  });
  test("reparenting preserves the proxy chain", () => {
   const edit = new CTimeEdit(); const root = new CWidget(); edit.setParent(root); edit.setFocus();
   expect(edit.focusProxy()).toBe(edit.lineEdit()); expect(edit.lineEdit().hasFocus()).toBe(true);
  });
  test("destroying a focused editor clears application focus", () => {
   const edit = new CTimeEdit(); edit.setFocus(); edit.destroy();
   expect(CApplication.instance().focusWidget()).toBeNull();
  });
 });
