import { CDialog } from "../../src/dialogs/CDialog.js";
import { CWidget } from "../../src/widgets/CWidget.js";
import { CRect } from "../../src/geometry/CRect.js";
import { CDefaultStyle } from "../../src/gui/CDefaultStyle.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CStyleOptionPushButton } from "../../src/gui/CStyleOptionPushButton.js";
import { CStyleOptionCheckBox } from "../../src/gui/CStyleOptionCheckBox.js";
import { CStyleOptionRadioButton } from "../../src/gui/CStyleOptionRadioButton.js";
import { CStyleOptionToolButton } from "../../src/gui/CStyleOptionToolButton.js";
import { CStyleOptionToolBoxButton } from "../../src/gui/CStyleOptionToolBoxButton.js";
import { CToolButtonStyle } from "../../src/gui/CToolButtonStyle.js";
import { createTestWindow } from "../helpers/createTestWindow.js";
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";

import { CApplication } from "../../src/core/CApplication.js";
import {
	CMouseButton,
	CMouseEvent
} from "../../src/events/CMouseEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CPushButton } from "../../src/widgets/CPushButton.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { CPainter } from "../../src/painting/CPainter";
import { TestPaintDevice } from "../helpers/createTestPaintEngine";
import { CColor } from "../../src/gui/CColor.js";
import { CPalette, CPaletteColorRole} from "../../src/gui/CPalette.js";

class TestPushButton extends CPushButton {
	mousePress(event: CMouseEvent): void {
		this.mousePressEvent(event);
	}

	mouseRelease(event: CMouseEvent): void {
		this.mouseReleaseEvent(event);
	}

	paint(painter: CPainter): void {
		this.paintEvent(painter);
	}

	mouseEnter(event: CMouseEvent): void {
		this.mouseEnterEvent(event);
	}

	mouseLeave(event: CMouseEvent): void {
		this.mouseLeaveEvent(event);
	}
}

describe("CPushButton", () => {
	beforeEach(() => {
        if (CApplication.exists())
		    CApplication.instance().destroy();
		new CApplication(createTestCanvas());
	});
	afterEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
		vi.useRealTimers();
	});

	test("is not down by default", () => {
		const button = new CPushButton();

		expect(button.isDown()).toBe(false);
	});

	test("goes down on left mouse press", () => {
		const button = new TestPushButton();

		const event = new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.LeftButton
		);

		button.mousePress(event);

		expect(button.isDown()).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("ignores non-left mouse press", () => {
		const button = new TestPushButton();

		const event = new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.RightButton
		);

		button.mousePress(event);

		expect(button.isDown()).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("emits clicked on release inside the button", () => {
		const button = new TestPushButton();
		button.resize(100, 50);

		const clicked = vi.fn();
		button.clicked.connect(clicked);

		button.mousePress(new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.LeftButton
		));

		button.mouseRelease(new CMouseEvent(
			CEventType.MouseRelease, 20, 20, CMouseButton.LeftButton
		));

		expect(button.isDown()).toBe(false);
		expect(clicked).toHaveBeenCalledOnce();
	});

	test("does not emit clicked on release outside the button", () => {
		const button = new TestPushButton();
		button.resize(100, 50);

		const clicked = vi.fn();
		button.clicked.connect(clicked);

		button.mousePress(new CMouseEvent(
			CEventType.MousePress, 10, 10, CMouseButton.LeftButton
		));

		button.mouseRelease(new CMouseEvent(
			CEventType.MouseRelease, 150, 20, CMouseButton.LeftButton
		));

		expect(button.isDown()).toBe(false);
		expect(clicked).not.toHaveBeenCalled();
	});

    test("releases outside after press without emitting clicked", () => {
		const app = CApplication.instance();
		const canvas = app.canvas();

		const button = new CPushButton();
		button.setGeometry(100, 100, 120, 50);

		const clicked = vi.fn();
		button.clicked.connect(clicked);

		canvas.dispatchEvent({
			type: "pointerdown",
			clientX: 120,
			clientY: 120,
			button: 0
		} as PointerEvent);

		expect(button.isDown()).toBe(true);
		expect(app.mouseGrabber()).toBe(button);

		canvas.dispatchEvent({
			type: "pointerup",
			clientX: 400,
			clientY: 300,
			button: 0
		} as PointerEvent);

		expect(button.isDown()).toBe(false);
		expect(clicked).not.toHaveBeenCalled();
		expect(app.mouseGrabber()).toBeNull();
	});

	test("has empty text by default", () => {
		const button = new CPushButton();

		expect(button.text()).toBe("");
	});

	test("sets button text", () => {
		const button = new CPushButton();

		button.setText("Hello");

		expect(button.text()).toBe("Hello");
	});

	test("draws button text centered in the button", () => {
		const button = new TestPushButton();
		button.resize(120, 50);
		button.setText("Click me");

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.setFont).toHaveBeenCalledWith(
			"14px sans-serif"
		);
		expect(device.engine.setTextAlign).toHaveBeenCalledWith(
			"center"
		);
		expect(device.engine.setTextBaseline).toHaveBeenCalledWith(
			"middle"
		);
		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Click me", 60, 25
		);
	});
    
	test("is not hovered by default", () => {
		const button = new CPushButton();

		expect(button.isHovered()).toBe(false);
	});

	test("becomes hovered on mouse enter", () => {
		const button = new TestPushButton();

		const event = new CMouseEvent(
			CEventType.MouseEnter, 10, 10,
			CMouseButton.NoButton
		);

		button.mouseEnter(event);

		expect(button.isHovered()).toBe(true);
		expect(event.isAccepted()).toBe(true);
	});

	test("stops being hovered on mouse leave", () => {
		const button = new TestPushButton();

		button.mouseEnter(new CMouseEvent(
			CEventType.MouseEnter, 10, 10,
			CMouseButton.NoButton
		));

		const event = new CMouseEvent(
			CEventType.MouseLeave, 150, 10,
			CMouseButton.NoButton
		);

		button.mouseLeave(event);

		expect(button.isHovered()).toBe(false);
		expect(event.isAccepted()).toBe(true);
	});

	test("uses hover background when hovered", () => {
		const button = new TestPushButton();

		button.mouseEnter(new CMouseEvent(
			CEventType.MouseEnter, 10, 10,
			CMouseButton.NoButton
		));

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.setFillStyle).toHaveBeenCalledWith(
			"rgba(224, 238, 249, 1)"
		);
	});

	test("pressed background has priority over hover background", () => {
		const button = new TestPushButton();

		button.mouseEnter(new CMouseEvent(
			CEventType.MouseEnter, 10, 10,
			CMouseButton.NoButton
		));

		button.mousePress(new CMouseEvent(
			CEventType.MousePress, 10, 10,
			CMouseButton.LeftButton
		));

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.setFillStyle).toHaveBeenCalledWith(
			"rgba(0, 120, 215, 1)",
		);
	});

	test("uses disabled background when disabled", () => {
		const button = new TestPushButton();
		button.setEnabled(false);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.setFillStyle).toHaveBeenCalledWith(
			"rgba(224, 224, 224, 1)"
		);
	});

	test("uses disabled text color when disabled", () => {
		const button = new TestPushButton();
		button.setEnabled(false);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.setStrokeStyle).toHaveBeenCalledWith(
			"rgba(128, 128, 128, 1)"
		);
	});

	test("disabled button does not go down on mouse press", () => {
		const button = new TestPushButton();
		button.setEnabled(false);

		const event = new CMouseEvent(
			CEventType.MousePress, 10, 10,
			CMouseButton.LeftButton
		);

		button.event(event);

		expect(button.isDown()).toBe(false);
		expect(event.isAccepted()).toBe(false);
	});

	test("disabled button does not emit clicked", () => {
		const button = new TestPushButton();
		button.resize(100, 50);
		button.setEnabled(false);

		const clicked = vi.fn();
		button.clicked.connect(clicked);

		button.event(new CMouseEvent(
			CEventType.MousePress, 10, 10,
			CMouseButton.LeftButton
		));

		button.event(new CMouseEvent(
			CEventType.MouseRelease, 10, 10,
			CMouseButton.LeftButton
		));

		expect(clicked).not.toHaveBeenCalled();
	});

    test("uses widget palette when painting", () => {
	    const button = new TestPushButton();
	    const palette = new CPalette();
	    palette.setColor(CPaletteColorRole.Button, new CColor(10, 20, 30));
	    palette.setColor(CPaletteColorRole.ButtonText, new CColor(200, 210, 220));

	    button.setPalette(palette);

	    const device = new TestPaintDevice();
	    const painter = new CPainter(device);

	    button.paint(painter);

	    expect(device.engine.setFillStyle).toHaveBeenCalledWith(
		    "rgba(10, 20, 30, 1)"
    	);
	  	expect(device.engine.setStrokeStyle).toHaveBeenCalledWith(
			"rgba(200, 210, 220, 1)"
		);
    });

    test("uses disabled text role from palette", () => {
	    const button = new TestPushButton();
    	const palette = new CPalette();
	    palette.setColor(CPaletteColorRole.DisabledText, new CColor(90, 100, 110));
	    button.setPalette(palette);
	    button.setEnabled(false);
	    const device = new TestPaintDevice();
	    const painter = new CPainter(device);
	    button.paint(painter);

		expect(device.engine.setStrokeStyle).toHaveBeenCalledWith("rgba(90, 100, 110, 1)");
    });

	test("auto repeat is disabled by default", () => {
		const button = new CPushButton();
		expect(button.isAutoRepeat()).toBe(false);
	});

	test("enables auto repeat", () => {
		const button = new CPushButton();
		button.setAutoRepeat(400, 60);
		expect(button.isAutoRepeat()).toBe(true);
	});

	test("resetAutoRepeat disables auto repeat", () => {
		const button = new CPushButton();
		button.setAutoRepeat(400, 60);
		button.resetAutoRepeat();
		expect(button.isAutoRepeat()).toBe(false);
	});

	test("auto repeat starts after delay", () => {
		vi.useFakeTimers();
		const button = new CPushButton();
		button.resize(100, 30);
		button.setAutoRepeat(400, 60);
		const slot = vi.fn();
		button.clicked.connect(slot);
		button.event(new CMouseEvent(CEventType.MousePress, 50, 15, CMouseButton.LeftButton));

		vi.advanceTimersByTime(399);
		expect(slot).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(slot).toHaveBeenCalledOnce();
		vi.useRealTimers();
	});

	test("auto repeat repeats at configured interval", () => {
		vi.useFakeTimers();

		const button = new CPushButton();
		button.resize(100, 30);
		button.setAutoRepeat(400, 60);

		const slot = vi.fn();
		button.clicked.connect(slot);

		button.event(new CMouseEvent(CEventType.MousePress, 50, 15, CMouseButton.LeftButton));

		vi.advanceTimersByTime(400);
		expect(slot).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(60);
		expect(slot).toHaveBeenCalledTimes(2);
		vi.advanceTimersByTime(120);
		expect(slot).toHaveBeenCalledTimes(4);
		vi.useRealTimers();
	});

	test("mouse release stops auto repeat", () => {
		vi.useFakeTimers();

		const button = new CPushButton();
		button.resize(100, 30);
		button.setAutoRepeat(400, 60);

		const slot = vi.fn();
		button.clicked.connect(slot);
		button.event(new CMouseEvent(CEventType.MousePress, 50, 15, CMouseButton.LeftButton));
		vi.advanceTimersByTime(400);
		expect(slot).toHaveBeenCalledTimes(1);
		button.event(new CMouseEvent(CEventType.MouseRelease, 50, 15, CMouseButton.LeftButton));

		const callsAfterRelease = slot.mock.calls.length;
		vi.advanceTimersByTime(500);
		expect(slot).toHaveBeenCalledTimes(callsAfterRelease);
		vi.useRealTimers();
	});

	test("resetAutoRepeat stops running timers", () => {
		vi.useFakeTimers();

		const button = new CPushButton();
		button.resize(100, 30);
		button.setAutoRepeat(400, 60);

		const slot = vi.fn();
		button.clicked.connect(slot);

		button.event(new CMouseEvent(CEventType.MousePress, 50, 15, CMouseButton.LeftButton));

		vi.advanceTimersByTime(400);
		expect(slot).toHaveBeenCalledTimes(1);
		button.resetAutoRepeat();
		vi.advanceTimersByTime(500);

		expect(slot).toHaveBeenCalledTimes(1);
		expect(button.isAutoRepeat()).toBe(false);

		vi.useRealTimers();
	});

	test("auto repeat does not accumulate timeout connections", () => {
		vi.useFakeTimers();

		const button = new CPushButton();
		button.resize(100, 30);
		button.setAutoRepeat(400, 60);

		const slot = vi.fn();
		button.clicked.connect(slot);

		button.event(new CMouseEvent(
			CEventType.MousePress, 50, 15, CMouseButton.LeftButton
		));

		vi.advanceTimersByTime(400);
		expect(slot).toHaveBeenCalledTimes(1);

		button.event(new CMouseEvent(
			CEventType.MouseRelease, 150, 15, CMouseButton.LeftButton
		));

		expect(slot).toHaveBeenCalledTimes(1);

		button.event(new CMouseEvent(
			CEventType.MousePress, 50, 15, CMouseButton.LeftButton
		));

		vi.advanceTimersByTime(400);
		expect(slot).toHaveBeenCalledTimes(2);

		vi.advanceTimersByTime(120);
		expect(slot).toHaveBeenCalledTimes(4);

		button.event(new CMouseEvent(
			CEventType.MouseRelease, 150, 15, CMouseButton.LeftButton
		));

		vi.useRealTimers();
	});
});
function recordPainting() {
    let fill = "";
    const fills: Array<{ rect: CRect; color: string }> = [];
    const stack: string[] = [];
    const painter = {
        setBrush: vi.fn((color: string) => { fill = color; }),
        setFillStyle: vi.fn((color: string) => { fill = color; }),
        fillRect: vi.fn((rect: CRect) => { fills.push({ rect, color: fill }); }),
        setPen: vi.fn(), setStrokeStyle: vi.fn(), setFont: vi.fn(),
        setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn(),
        drawRoundedRect: vi.fn(), strokeRect: vi.fn(), drawLine: vi.fn(),
        drawEllipse: vi.fn(), fillEllipse: vi.fn(), drawPixmap: vi.fn(),
        clipRect: vi.fn(), setLineWidth: vi.fn(),
        save: vi.fn(() => { stack.push(fill); }),
        restore: vi.fn(() => { fill = stack.pop()!; })
    };
    return {
        painter, paint: painter as unknown as CPainter,
        dots: () => fills.filter(item => item.rect.width() === 1 && item.rect.height() === 1)
    };
}

describe("button focus indicators", () => {
    let oldWindow: PropertyDescriptor | undefined;
    let style: CDefaultStyle;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
        Object.defineProperty(globalThis, "window", {
            value: createTestWindow(), configurable: true, writable: true
        });
        new CApplication(createTestCanvas());
        style = new CDefaultStyle();
    });
    afterEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
        else Reflect.deleteProperty(globalThis, "window");
    });

    const variants = [
        { name: "push button", make: () => new CStyleOptionPushButton(),
            draw: (p: CPainter, o: CStyleOptionPushButton) => style.drawPushButton(p, o) },
        { name: "check box", make: () => new CStyleOptionCheckBox(),
            draw: (p: CPainter, o: CStyleOptionCheckBox) => style.drawCheckBox(p, o) },
        { name: "radio button", make: () => new CStyleOptionRadioButton(),
            draw: (p: CPainter, o: CStyleOptionRadioButton) => style.drawRadioButton(p, o) },
        ...[
            CToolButtonStyle.TextOnly, CToolButtonStyle.IconOnly,
            CToolButtonStyle.TextUnderIcon, CToolButtonStyle.TextBesideIcon
        ].map(mode => ({ name: `tool button mode ${mode}`, make: () => {
            const option = new CStyleOptionToolButton();
            option.toolButtonStyle = mode;
            option.icon = null;
            return option;
        }, draw: (p: CPainter, o: CStyleOptionToolButton) => style.drawToolButton(p, o) })),
        { name: "tool box button", make: () => new CStyleOptionToolBoxButton(),
            draw: (p: CPainter, o: CStyleOptionToolBoxButton) => style.drawToolBoxButton(p, o) }
    ];

    for (const variant of variants) {
        // Keep each factory and matching draw method paired despite the union above.
        const exercise = (state: CStyleState, small = false) => {
            const option = variant.make();
            option.text = "Button";
            option.rect = new CRect(0, 0, small ? 6 : 100, small ? 6 : 30);
            option.state = state;
            const result = recordPainting();
            // The factory/draw pairing is guaranteed by the variant definitions.
            (variant.draw as (p: CPainter, o: typeof option) => void)(result.paint, option);
            return { ...result, option };
        };
        test(`${variant.name}: keyboard focus draws an interior dotted outline`, () => {
            const result = exercise(CStyleState.Enabled | CStyleState.HasFocus);
            expect(result.dots().length).toBeGreaterThan(0);
            for (const { rect } of result.dots()) {
                expect(rect.x()).toBeGreaterThanOrEqual(4);
                expect(rect.y()).toBeGreaterThanOrEqual(4);
                expect(rect.x() + rect.width()).toBeLessThanOrEqual(96);
                expect(rect.y() + rect.height()).toBeLessThanOrEqual(26);
            }
            // Tool box headers save once for their chevron/text and once for focus.
            const expectedSaves = variant.name === "tool box button" ? 2 : 1;
            expect(result.painter.save).toHaveBeenCalledTimes(expectedSaves);
            expect(result.painter.restore).toHaveBeenCalledTimes(expectedSaves);
        });
        test(`${variant.name}: no outline without focus or when disabled`, () => {
            expect(exercise(CStyleState.Enabled).dots()).toHaveLength(0);
            expect(exercise(CStyleState.HasFocus).dots()).toHaveLength(0);
        });
        test(`${variant.name}: tiny controls do not draw invalid focus geometry`, () => {
            expect(exercise(CStyleState.Enabled | CStyleState.HasFocus, true).dots()).toHaveLength(0);
        });
    }

    test("checkbox label focus excludes the indicator and follows text width", () => {
        const option = new CStyleOptionCheckBox();
        option.rect = new CRect(0, 0, 300, 30);
        option.state = CStyleState.Enabled | CStyleState.HasFocus;
        const rightEdges: number[] = [];
        for (const text of ["A", "A much longer label"]) {
            option.text = text;
            const result = recordPainting();
            style.drawCheckBox(result.paint, option);
            expect(result.dots().length).toBeGreaterThan(0);
            expect(result.dots().every(dot => dot.rect.x() >= 20)).toBe(true);
            rightEdges.push(Math.max(...result.dots().map(dot => dot.rect.x())));
        }
        expect(rightEdges[1]!).toBeGreaterThan(rightEdges[0]!);
        expect(rightEdges[1]!).toBeLessThan(299);
    });

    test("unlabeled checkbox draws focus inside its indicator", () => {
        const option = new CStyleOptionCheckBox();
        option.rect = new CRect(0, 0, 100, 30);
        option.text = "";
        option.state = CStyleState.Enabled | CStyleState.HasFocus;
        const result = recordPainting();
        style.drawCheckBox(result.paint, option);
        expect(result.dots().length).toBeGreaterThan(0);
        expect(result.dots().every(({ rect }) => rect.x() >= 1
            && rect.x() + 1 <= 15 && rect.y() >= 8 && rect.y() + 1 <= 22)).toBe(true);
    });

    test("radio button label focus excludes the indicator and follows text width", () => {
        const option = new CStyleOptionRadioButton();
        option.rect = new CRect(0, 0, 300, 30);
        option.state = CStyleState.Enabled | CStyleState.HasFocus;
        const rightEdges: number[] = [];
        for (const text of ["A", "A much longer label"]) {
            option.text = text;
            const result = recordPainting();
            style.drawRadioButton(result.paint, option);
            expect(result.dots().length).toBeGreaterThan(0);
            expect(result.dots().every(dot => dot.rect.x() >= 20)).toBe(true);
            rightEdges.push(Math.max(...result.dots().map(dot => dot.rect.x())));
        }
        expect(rightEdges[1]!).toBeGreaterThan(rightEdges[0]!);
        expect(rightEdges[1]!).toBeLessThan(299);
    });

    test("unlabeled radio button draws focus inside its indicator", () => {
        const option = new CStyleOptionRadioButton();
        option.rect = new CRect(0, 0, 100, 30);
        option.text = "";
        option.state = CStyleState.Enabled | CStyleState.HasFocus;
        const result = recordPainting();
        style.drawRadioButton(result.paint, option);
        expect(result.dots().length).toBeGreaterThan(0);
        expect(result.dots().every(({ rect }) => rect.x() >= 3
            && rect.x() + 1 <= 15 && rect.y() >= 9 && rect.y() + 1 <= 21)).toBe(true);
    });

    test("pressed push buttons use highlighted text color for the outline", () => {
        const option = new CStyleOptionPushButton();
        option.rect = new CRect(0, 0, 100, 30);
        option.state = CStyleState.Enabled | CStyleState.HasFocus | CStyleState.Sunken;
        const result = recordPainting();
        style.drawPushButton(result.paint, option);
        expect(result.dots().length).toBeGreaterThan(0);
        expect(result.dots().every(dot => dot.color ===
            option.palette.color(CPaletteColorRole.HighlightedText).toCss())).toBe(true);
    });

    test("focus follows the focused button through its style option", () => {
        const first = new CPushButton();
        const second = new CPushButton();
        try {
            first.setFocus();
            const firstOption = new CStyleOptionPushButton();
            const secondOption = new CStyleOptionPushButton();
            firstOption.initFromPushButton(first);
            secondOption.initFromPushButton(second);
            expect(firstOption.state & CStyleState.HasFocus).not.toBe(0);
            expect(secondOption.state & CStyleState.HasFocus).toBe(0);
            second.setFocus();
            firstOption.initFromPushButton(first);
            secondOption.initFromPushButton(second);
            expect(firstOption.state & CStyleState.HasFocus).toBe(0);
            expect(secondOption.state & CStyleState.HasFocus).not.toBe(0);
            const copy = new CStyleOptionPushButton(secondOption);
            expect(copy.state & CStyleState.HasFocus).not.toBe(0);
        } finally { first.destroy(); second.destroy(); }
    });
});

describe("CPushButton default button", () => {
    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    test("is not default initially and can be enabled and cleared", () => {
        const button = new CPushButton(); expect(button.isDefault()).toBe(false);
        button.setDefault(); expect(button.isDefault()).toBe(true);
        button.setDefault(false); expect(button.isDefault()).toBe(false);
    });
    test("only one button in a dialog remains default", () => {
        const dialog = new CDialog(); const group = new CWidget(dialog);
        const a = new CPushButton(dialog), b = new CPushButton(group);
        a.setDefault(true); b.setDefault(true);
        expect(a.isDefault()).toBe(false); expect(b.isDefault()).toBe(true);
        expect(dialog.defaultButton()).toBe(b);
        b.setDefault(false); expect(dialog.defaultButton()).toBeNull();
    });
    test("nested dialogs have independent defaults", () => {
        const outer = new CDialog(); const inner = new CDialog(outer);
        const a = new CPushButton(outer), b = new CPushButton(inner);
        a.setDefault(true); b.setDefault(true);
        expect(a.isDefault()).toBe(true); expect(b.isDefault()).toBe(true);
        expect(outer.defaultButton()).toBe(a); expect(inner.defaultButton()).toBe(b);
    });
    test("a default assigned before parenting replaces the destination default", () => {
        const dialog = new CDialog(); const previous = new CPushButton(dialog); previous.setDefault(true);
        const moved = new CPushButton(); moved.setDefault(true); moved.setParent(dialog);
        expect(previous.isDefault()).toBe(false); expect(dialog.defaultButton()).toBe(moved);
    });
    test("reparenting and destroying a default leave no stale dialog reference", () => {
        const first = new CDialog(), second = new CDialog();
        const button = new CPushButton(first); button.setDefault(true); button.setParent(second);
        expect(first.defaultButton()).toBeNull(); expect(second.defaultButton()).toBe(button);
        button.destroy(); expect(second.defaultButton()).toBeNull();
    });
    test("setting the same default twice does not move focus or click", () => {
        const dialog = new CDialog(); const button = new CPushButton(dialog); const clicked = vi.fn();
        button.clicked.connect(clicked); button.setDefault(true); button.setDefault(true);
        expect(clicked).not.toHaveBeenCalled(); expect(button.hasFocus()).toBe(false);
    });
    test("style options initialize and copy the default flag and radius", () => {
        const button = new CPushButton(); button.setDefault(true); button.setRadius(7);
        const option = new CStyleOptionPushButton(); option.initFromPushButton(button);
        const copy = new CStyleOptionPushButton(option);
        expect(option.defaultButton).toBe(true); expect(copy.defaultButton).toBe(true);
        expect(copy.radius).toBe(7); expect(new CStyleOptionPushButton().defaultButton).toBe(false);
        button.setDefault(false); option.initFromPushButton(button); expect(option.defaultButton).toBe(false);
    });
    test("default buttons draw an inset ButtonText border without keyboard focus", () => {
        const option = new CStyleOptionPushButton(); option.rect = new CRect(0, 0, 100, 30);
        option.defaultButton = true; option.state = CStyleState.Enabled;
        let currentPen = "";
        const borders: string[] = [];
        const painter = {
            setBrush: vi.fn(), setPen: vi.fn((color: string) => { currentPen = color; }),
            drawRoundedRect: vi.fn(() => { borders.push(currentPen); }),
            setFont: vi.fn(), setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn(),
            save: vi.fn(), restore: vi.fn(), setLineWidth: vi.fn()
        };
        new CDefaultStyle().drawPushButton(painter as unknown as CPainter, option);
        expect(borders).toEqual([option.palette.color(CPaletteColorRole.ButtonText).toCss()]);
        expect(painter.setBrush).toHaveBeenCalledWith(option.palette.color(CPaletteColorRole.Button).toCss());
        expect(painter.setLineWidth).toHaveBeenCalledWith(2);
        expect(painter.drawRoundedRect).toHaveBeenCalledWith(1, 1, 98, 28, option.radius);
        expect(painter.save).toHaveBeenCalledOnce(); expect(painter.restore).toHaveBeenCalledOnce();
    });
    test("disabled defaults use the normal border", () => {
        const option = new CStyleOptionPushButton(); option.rect = new CRect(0, 0, 100, 30);
        option.defaultButton = true; option.state = CStyleState.None;
        const painter = {
            setBrush: vi.fn(), setPen: vi.fn(), drawRoundedRect: vi.fn(),
            setFont: vi.fn(), setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn(),
            save: vi.fn(), restore: vi.fn(), setLineWidth: vi.fn()
        };
        new CDefaultStyle().drawPushButton(painter as unknown as CPainter, option);
        expect(painter.setLineWidth).not.toHaveBeenCalled();
        expect(painter.drawRoundedRect).toHaveBeenCalledWith(0, 0, 100, 30, option.radius);
    });
});
