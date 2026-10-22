import { CWidget } from "../../src/widgets/CWidget.js";
import { CFocusPolicy } from "../../src/gui/CFocusPolicy.js";
import { CStyleOptionLabel } from "../../src/gui/CStyleOptionLabel.js";
import { CEventType } from "../../src/events/CEvent.js";
import { CMouseEvent, CMouseButton } from "../../src/events/CMouseEvent.js";
import {vi, afterEach, beforeEach, describe, expect, test } from "vitest";
import { CAlignment } from "../../src/core/CAlignment.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CPainter } from "../../src/painting/CPainter.js";
import { CLabel } from "../../src/widgets/CLabel.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { TestPaintDevice } from "../helpers/createTestPaintEngine.js";
import { CColor } from "../../src/gui/CColor.js";
import { CPalette, CPaletteColorRole} from "../../src/gui/CPalette.js";
import { CPixmap } from "../../src/painting/CPixmap.js";
import { CFrame } from "../../src/index.js";
import { CFont } from "../../src/gui/CFont.js";

class TestLabel extends CLabel {
	paint(painter: CPainter): void {
		this.paintEvent(painter);
	}
}

describe("CLabel", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		CApplication.instance().destroy();
	});

	test("has empty text by default", () => {
		const label = new CLabel();

		expect(label.text()).toBe("");
	});

	test("sets text", () => {
		const label = new CLabel();

		label.setText("Hello");

		expect(label.text()).toBe("Hello");
	});

	test("uses left and vertical center alignment by default", () => {
		const label = new TestLabel();
		label.resize(200, 40);
		label.setText("Hello");

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(label.alignment()).toBe(
			CAlignment.Left | CAlignment.VCenter
		);
		expect(device.engine.setTextAlign).toHaveBeenCalledWith("left");
		expect(device.engine.setTextBaseline).toHaveBeenCalledWith(
			"middle"
		);
		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Hello", 0, 20
		);
	});

	test("sets alignment", () => {
		const label = new CLabel();

		label.setAlignment(
			CAlignment.Right | CAlignment.Bottom
		);

		expect(label.alignment()).toBe(
			CAlignment.Right | CAlignment.Bottom
		);
	});

	test("draws text left and top aligned", () => {
		const label = new TestLabel();
		label.resize(200, 40);
		label.setText("Hello");
		label.setAlignment(CAlignment.Left | CAlignment.Top);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.setTextAlign).toHaveBeenCalledWith("left");
		expect(device.engine.setTextBaseline).toHaveBeenCalledWith("top");
		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Hello", 0, 0
		);
	});

	test("draws text centered", () => {
		const label = new TestLabel();
		label.resize(200, 40);
		label.setText("Hello");
		label.setAlignment(CAlignment.Center);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.setTextAlign).toHaveBeenCalledWith(
			"center"
		);
		expect(device.engine.setTextBaseline).toHaveBeenCalledWith(
			"middle"
		);
		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Hello", 100, 20
		);
	});

	test("draws text right and bottom aligned", () => {
		const label = new TestLabel();
		label.resize(200, 40);
		label.setText("Hello");
		label.setAlignment(
			CAlignment.Right | CAlignment.Bottom
		);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.setTextAlign).toHaveBeenCalledWith("right");
		expect(device.engine.setTextBaseline).toHaveBeenCalledWith(
			"bottom"
		);
		expect(device.engine.drawText).toHaveBeenCalledWith(
			"Hello", 200, 40
		);
	});

	test("draws text using widget font", () => {
		const label = new TestLabel();
		label.resize(200, 40);
		label.setText("Hello");
		label.setFont(new CFont("serif", 18));

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.setFont).toHaveBeenCalledWith(
			"18px serif"
		);
	});

    test("uses widget palette when painting", () => {
	    const label = new TestLabel();
	    label.resize(200, 40);
	    label.setText("Hello");

	    const palette = new CPalette();
	    palette.setColor(CPaletteColorRole.Base, new CColor(10, 20, 30) );
	    palette.setColor(CPaletteColorRole.Text, new CColor(200, 210, 220));

	    label.setPalette(palette);
	    const device = new TestPaintDevice();
	    const painter = new CPainter(device);
    	label.paint(painter);

	    expect(device.engine.setFillStyle).toHaveBeenCalledWith(
		    "rgba(10, 20, 30, 1)"
	    );
		expect(device.engine.setStrokeStyle).toHaveBeenCalledWith(
			"rgba(200, 210, 220, 1)");
    });

	test("stores pixmap", () => {
		const label = new CLabel();
		const pixmap = new CPixmap({} as CanvasImageSource, 48, 48);
		label.setPixmap(pixmap);
		expect(label.pixmap()).toBe(pixmap);
	});

	test("pixmap is null by default", () => {
		const label = new CLabel();
		expect(label.pixmap()).toBeNull();
	});

	test("pixmap can be cleared", () => {
		const label = new CLabel();
		const pixmap = new CPixmap({} as CanvasImageSource, 48, 48);
		label.setPixmap(pixmap);
		label.setPixmap(null);
		expect(label.pixmap()).toBeNull();
	});

	test("draws pixmap centered", () => {
		const label = new TestLabel();
		label.resize(200, 100);

		const image = {} as CanvasImageSource;
		const pixmap = new CPixmap(image, 48, 48);

		label.setPixmap(pixmap);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.drawPixmap).toHaveBeenCalledWith(image, 76, 26, 48, 48 );
	});

	test("scales larger pixmap down preserving aspect ratio", () => {
		const label = new TestLabel();
		label.resize(100, 100);

		const image = {} as CanvasImageSource;
		const pixmap = new CPixmap(image, 200, 100);

		label.setPixmap(pixmap);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		label.paint(painter);

		expect(device.engine.drawPixmap).toHaveBeenCalledWith(pixmap, 3, 26.5, 94, 47);
	});

	test("inherits CFrame", () => {
		const label = new CLabel();

		expect(label).toBeInstanceOf(CFrame);
	});
});

describe("CLabel buddies and mnemonics", () => {
    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    function setup(text = "&Name") {
        const root = new CWidget();
        const label = new TestLabel(root);
        const buddy = new CWidget(root);
        buddy.setFocusPolicy(CFocusPolicy.StrongFocus);
        label.setText(text);
        label.setBuddy(buddy);
        return { root, label, buddy };
    }
    test("buddy is null by default and ampersands remain literal", () => {
        const label = new CLabel(); label.setText("&Name && Co");
        expect(label.buddy()).toBeNull();
        expect(label.displayText()).toBe("&Name && Co");
        expect(label.mnemonic()).toBe("");
        expect(label.mnemonicIndex()).toBe(-1);
    });
    test("stores a buddy without moving focus", () => {
        const { label, buddy } = setup();
        expect(label.buddy()).toBe(buddy);
        expect(buddy.hasFocus()).toBe(false);
        expect(label.text()).toBe("&Name");
        expect(label.displayText()).toBe("Name");
        expect(label.mnemonic()).toBe("N");
        expect(label.mnemonicIndex()).toBe(0);
    });
    test("escaped ampersands and later markers preserve the first mnemonic", () => {
        const { label } = setup("Rock && &Roll &Music");
        expect(label.displayText()).toBe("Rock & Roll Music");
        expect(label.mnemonic()).toBe("R");
        expect(label.mnemonicIndex()).toBe(7);
    });
    test("escaped ampersands alone do not create a mnemonic", () => {
        const { label } = setup("A && B");
        expect(label.displayText()).toBe("A & B");
        expect(label.mnemonic()).toBe("");
    });
    test("a trailing ampersand is literal", () => {
        const { label } = setup("Name&");
        expect(label.displayText()).toBe("Name&");
        expect(label.mnemonicIndex()).toBe(-1);
    });
    test("Unicode mnemonic indices use UTF-16 text offsets", () => {
        const { label } = setup("😀 &Čas");
        expect(label.displayText()).toBe("😀 Čas");
        expect(label.mnemonicIndex()).toBe(3);
        expect(label.mnemonic()).toBe("Č");
    });
    test("changing text immediately updates the mnemonic", () => {
        const { label } = setup(); label.setText("A&ge");
        expect(label.mnemonic()).toBe("g");
        expect(label.mnemonicIndex()).toBe(1);
    });
    test("clearing the buddy restores literal text", () => {
        const { label } = setup(); label.setBuddy(null);
        expect(label.buddy()).toBeNull();
        expect(label.displayText()).toBe("&Name");
        expect(label.activateBuddy()).toBe(false);
    });
    test("clicking a label focuses its buddy without requiring a mnemonic", () => {
        const { label, buddy } = setup("Name");
        const event = new CMouseEvent(CEventType.MousePress, 4, 4, CMouseButton.LeftButton);
        label.event(event);
        expect(event.isAccepted()).toBe(true);
        expect(buddy.hasFocus()).toBe(true);
    });
    test("right clicks do not focus the buddy", () => {
        const { label, buddy } = setup();
        label.event(new CMouseEvent(CEventType.MousePress, 4, 4, CMouseButton.RightButton));
        expect(buddy.hasFocus()).toBe(false);
    });
    test("hidden and disabled buddies and their containers cannot receive focus", () => {
        const { root, label, buddy } = setup();
        buddy.hide(); expect(label.activateBuddy()).toBe(false);
        buddy.show(); buddy.setEnabled(false); expect(label.activateBuddy()).toBe(false);
        buddy.setEnabled(true); root.hide(); expect(label.activateBuddy()).toBe(false);
        root.show(); root.setEnabled(false); expect(label.activateBuddy()).toBe(false);
        root.setEnabled(true); expect(label.activateBuddy()).toBe(true);
    });
    test("hidden and disabled labels cannot activate buddies", () => {
        const { label } = setup();
        label.hide(); expect(label.activateBuddy()).toBe(false);
        label.show(); label.setEnabled(false); expect(label.activateBuddy()).toBe(false);
    });
    test("clicking a NoFocus composite buddy focuses its internal input", () => {
        const { label, buddy } = setup();
        buddy.setFocusPolicy(CFocusPolicy.NoFocus);
        const input = new CWidget(buddy);
        input.setFocusPolicy(CFocusPolicy.StrongFocus);
        label.event(new CMouseEvent(CEventType.MousePress, 4, 4, CMouseButton.LeftButton));
        expect(input.hasFocus()).toBe(true);
        expect(buddy.hasFocus()).toBe(false);
    });
    test("composite buddy traversal skips unavailable children", () => {
        const { label, buddy } = setup(); buddy.setFocusPolicy(CFocusPolicy.NoFocus);
        const hidden = new CWidget(buddy); hidden.setFocusPolicy(CFocusPolicy.StrongFocus); hidden.hide();
        const disabled = new CWidget(buddy); disabled.setFocusPolicy(CFocusPolicy.StrongFocus); disabled.setEnabled(false);
        const group = new CWidget(buddy);
        const input = new CWidget(group); input.setFocusPolicy(CFocusPolicy.StrongFocus);
        expect(label.activateBuddy()).toBe(true); expect(input.hasFocus()).toBe(true);
        input.clearFocus(); group.hide(); expect(label.activateBuddy()).toBe(false);
    });
    test("a NoFocus or destroyed buddy cannot receive focus", () => {
        const { label, buddy } = setup();
        buddy.setFocusPolicy(CFocusPolicy.NoFocus); expect(label.activateBuddy()).toBe(false);
        buddy.setFocusPolicy(CFocusPolicy.StrongFocus); buddy.destroy();
        expect(label.activateBuddy()).toBe(false);
    });
    test("a buddy in another window is not activated", () => {
        const { label } = setup(); const other = new CWidget();
        other.setFocusPolicy(CFocusPolicy.StrongFocus); label.setBuddy(other);
        expect(label.activateBuddy()).toBe(false);
    });
    test("replacing the buddy changes the focus target", () => {
        const { root, label, buddy } = setup(); const replacement = new CWidget(root);
        replacement.setFocusPolicy(CFocusPolicy.StrongFocus); label.setBuddy(replacement);
        expect(label.activateBuddy()).toBe(true);
        expect(replacement.hasFocus()).toBe(true); expect(buddy.hasFocus()).toBe(false);
    });
    test("pixmap labels suppress mnemonic text and activation until cleared", () => {
        const { label } = setup(); label.setPixmap(new CPixmap({} as CanvasImageSource, 10, 10));
        expect(label.mnemonic()).toBe(""); expect(label.mnemonicIndex()).toBe(-1);
        expect(label.activateBuddy()).toBe(false);
        label.setPixmap(null); expect(label.mnemonic()).toBe("N");
    });
    test("size hint measures visible text without the marker", () => {
        const { label } = setup();
        const plain = new CLabel(); plain.setText("Name");
        expect(label.sizeHint().width()).toBe(plain.sizeHint().width());
    });
    test("style options carry and copy visible text and the underline index", () => {
        const { label } = setup("A&ge");
        const option = new CStyleOptionLabel(); option.initFromLabel(label);
        const copy = new CStyleOptionLabel(option);
        expect(option.text).toBe("Age"); expect(option.mnemonicIndex).toBe(1);
        expect(copy.text).toBe("Age"); expect(copy.mnemonicIndex).toBe(1);
        expect(new CStyleOptionLabel().mnemonicIndex).toBe(-1);
    });
    for (const alignment of [CAlignment.Left | CAlignment.Top,
        CAlignment.HCenter | CAlignment.VCenter, CAlignment.Right | CAlignment.Bottom]) {
        test(`paints a mnemonic underline under the correct character (${alignment})`, () => {
            const { label } = setup("A&ge"); label.resize(200, 40); label.setAlignment(alignment);
            const lines: number[][] = [];
            const painter = {
                setBrush: vi.fn(), fillRect: vi.fn(), setPen: vi.fn(), setFont: vi.fn(),
                setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn(),
                save: vi.fn(), restore: vi.fn(), setLineWidth: vi.fn(),
                drawLine: (...coordinates: number[]) => { lines.push(coordinates); }
            };
            label.paint(painter as unknown as CPainter);
            const metrics = label.fontMetrics();
            const left = (alignment & CAlignment.Right) ? 200 - metrics.textWidth("Age")
                : (alignment & CAlignment.HCenter) ? 100 - metrics.textWidth("Age") / 2 : 0;
            const y = (alignment & CAlignment.Bottom) ? 39
                : (alignment & CAlignment.VCenter) ? 20 + metrics.height() / 2 - 1 : metrics.height() - 1;
            expect(lines).toHaveLength(1);
            expect(lines[0]![0]).toBeCloseTo(left + metrics.textWidth("A"));
            expect(lines[0]![1]).toBeCloseTo(y);
            expect(lines[0]![2]).toBeCloseTo(left + metrics.textWidth("Ag"));
            expect(lines[0]![3]).toBeCloseTo(y);
            expect(painter.drawText).toHaveBeenCalledWith("Age",
                (alignment & CAlignment.Right) ? 200 : (alignment & CAlignment.HCenter) ? 100 : 0,
                (alignment & CAlignment.Bottom) ? 40 : (alignment & CAlignment.VCenter) ? 20 : 0);
        });
    }
});
