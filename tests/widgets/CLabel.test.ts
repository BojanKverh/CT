import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CCursorShape } from "../../src/gui/CCursorShape.js";
import { CFormLayout } from "../../src/layouts/CFormLayout.js";
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


describe("CLabel height for width and word wrapping", () => {

    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });

    test("word wrapping is optional", () => {
        const label = new CLabel(); label.setText("Hello world");
        expect(label.wordWrap()).toBe(false);
        expect(label.hasHeightForWidth()).toBe(false);
        expect(label.heightForWidth(20)).toBe(-1);
        label.setWordWrap(true);
        expect(label.wordWrap()).toBe(true);
        expect(label.sizePolicy().hasHeightForWidth()).toBe(true);
        label.setWordWrap(false);
        expect(label.hasHeightForWidth()).toBe(false);
    });
    test("narrow text needs more lines and wide text returns to one line", () => {
        const label = new CLabel(); label.setText("Hello world"); label.setWordWrap(true);
        const width = label.fontMetrics().textWidth("Hello") + 12;
        expect(label.heightForWidth(width)).toBe(2 * label.fontMetrics().height() + 8);
        expect(label.heightForWidth(1000)).toBe(label.fontMetrics().height() + 6);
    });
    test("explicit newlines including empty lines contribute to height", () => {
        const label = new CLabel(); label.setText("One\n\nTwo"); label.setWordWrap(true);
        expect(label.heightForWidth(1000)).toBe(3 * label.fontMetrics().height() + 10);
    });
    test("zero width terminates and preserves complete Unicode characters", () => {
        const label = new CLabel(); label.setText("😀č"); label.setWordWrap(true);
        expect(label.heightForWidth(0)).toBe(2 * label.fontMetrics().height() + 8);
    });
    test("mnemonic markers are not measured as visible characters", () => {
        const label = new CLabel(); label.setBuddy(new CWidget()); label.setText("&Hello world"); label.setWordWrap(true);
        const width = label.fontMetrics().textWidth("Hello") + 12;
        expect(label.heightForWidth(width)).toBe(2 * label.fontMetrics().height() + 8);
    });
    test("empty text still reserves one text line", () => {
        const label = new CLabel(); label.setWordWrap(true);
        expect(label.heightForWidth(100)).toBe(label.fontMetrics().height() + 6);
    });
    test("wrapped painting uses the same lines as height measurement", () => {
        const label = new TestLabel(); label.setText("Hello world"); label.setWordWrap(true);
        label.resize(label.fontMetrics().textWidth("Hello") + 12, label.heightForWidth(label.fontMetrics().textWidth("Hello") + 12));
        const draw = vi.spyOn(label.style(), "drawLabel");
        const painter = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), clipRect: vi.fn() };
        // Observe style options without relying on a particular platform style.
        draw.mockImplementation(() => {});
        label.paint(painter as unknown as CPainter);
        const texts = draw.mock.calls.map(call => call[1].text);
        expect(texts).toEqual(["", "Hello", "world"]);
        const [first, second] = painter.translate.mock.calls;
        expect(second![1] - first![1]).toBe(label.fontMetrics().height() + 2);
        draw.mockRestore();
    });
});

describe("CLabel wrapping geometry updates", () => {
    beforeEach(() => { new CApplication(createTestCanvas()); });
    afterEach(() => { if (CApplication.exists()) CApplication.instance().destroy(); });
    test("changing text updates enclosing form rows immediately", () => {
        const root = new CWidget(); root.resize(80, 400);
        const layout = new CFormLayout(); layout.setContentsMargins(0,0,0,0); layout.setSpacing(0);
        const label = new CLabel(); label.setWordWrap(true); label.setText("Hi");
        const next = new CLabel(); next.setText("Next");
        layout.addRow(label); layout.addRow(next); root.setLayout(layout);
        const oldY = next.y(); label.setText("A longer sentence that needs several lines");
        expect(next.y()).toBeGreaterThan(oldY);
        expect(label.height()).toBe(label.heightForWidth(label.width()));
        label.setText("Hi"); expect(next.y()).toBe(oldY);
    });
    test("changing font updates the measured height", () => {
        const label = new CLabel();
        label.setText("Hello world");
        label.setWordWrap(true);

        vi.spyOn(label.fontMetrics(), "height").mockReturnValue(10);
        vi.spyOn(label.fontMetrics(), "textWidth").mockImplementation(text => text.length * 5);

        expect(label.heightForWidth(1000)).toBe(16);

        const geometryChanged = vi.spyOn(label, "updateGeometry");
        const font = new CFont(label.font());
        font.setPixelSize(30);
        label.setFont(font);

        expect(label.font().pixelSize()).toBe(30);
        expect(geometryChanged).toHaveBeenCalledOnce();

        vi.spyOn(label.fontMetrics(), "height").mockReturnValue(30);
        vi.spyOn(label.fontMetrics(), "textWidth").mockImplementation(text => text.length * 15);

        expect(label.heightForWidth(1000)).toBe(36);
    });
    test("pixmap display disables width-dependent text height", () => {
        const label = new CLabel(); label.setWordWrap(true);
        label.setPixmap(new CPixmap({} as CanvasImageSource, 20, 20));
        expect(label.hasHeightForWidth()).toBe(false);
        expect(label.heightForWidth(100)).toBe(-1);
        label.setPixmap(null); expect(label.hasHeightForWidth()).toBe(true);
    });
});

describe("CLabel hyperlinks", () => {
    let label: TestLabel;
    let opened: ReturnType<typeof vi.fn>;
    beforeEach(() => {
        if (CApplication.exists()) CApplication.instance().destroy();
        opened = vi.fn();
        vi.stubGlobal("window", { open: opened, addEventListener: vi.fn(), removeEventListener: vi.fn(), devicePixelRatio: 1 });
        vi.stubGlobal("document", { baseURI: "http://localhost/" });
        new CApplication(createTestCanvas()); label = new TestLabel(); label.resize(300, 60);
        label.setAlignment(CAlignment.Left | CAlignment.Top);
        vi.spyOn(label.fontMetrics(), "textWidth").mockImplementation(text => text.length * 8);
        vi.spyOn(label.fontMetrics(), "height").mockImplementation(() => 16);
    });
    afterEach(() => {
        try { label?.destroy(); }
        finally {
            try { if (CApplication.exists()) CApplication.instance().destroy(); }
            finally { vi.unstubAllGlobals(); }
        }
    });
    function links(): void { label.setText('Visit <a href="https://example.com/">Example</a> or <a href="app:partner/42">Partner</a>.'); }
    function click(x = 55, y = 8): void {
        label.event(new CMouseEvent(CEventType.MousePress, x, y, CMouseButton.LeftButton));
        label.event(new CMouseEvent(CEventType.MouseRelease, x, y, CMouseButton.LeftButton));
    }
    function key(name: string): void { label.event(new CKeyEvent(CEventType.KeyPress, name)); }
    function painter() {
        const p = { save: vi.fn(), restore: vi.fn(), clipRect: vi.fn(), setBrush: vi.fn(), fillRect: vi.fn(), setPen: vi.fn(),
            setLineWidth: vi.fn(), setFont: vi.fn(), setTextAlign: vi.fn(), setTextBaseline: vi.fn(), drawText: vi.fn(), drawLine: vi.fn(), strokeRect: vi.fn() };
        return { p, paint: p as unknown as CPainter };
    }
    test("external opening is opt-in", () => { expect(label.openExternalLinks()).toBe(false); label.setOpenExternalLinks(true); expect(label.openExternalLinks()).toBe(true); });
    test("anchor markup is hidden from display and measurement", () => {
        links(); expect(label.displayText()).toBe("Visit Example or Partner."); expect(label.sizeHint().width()).toBe(25 * 8 + 12);
    });
    test("recognizes single quoted, unquoted and uppercase hrefs", () => {
        label.setText("<A HREF='https://example.com'>One</A> <a href=app:two>Two</a>");
        expect(label.displayText()).toBe("One Two"); expect(label.linkAt(4, 8)).toBe("https://example.com"); expect(label.linkAt(36, 8)).toBe("app:two");
    });
    test("decodes entities in link captions and addresses", () => {
        label.setText('<a href="https://example.com/?a=1&amp;b=2">A &amp; B &#x1f600;</a>');
        expect(label.displayText()).toBe("A & B 😀"); expect(label.linkAt(4, 8)).toBe("https://example.com/?a=1&b=2");
    });
    test("plain text and buddy mnemonics remain unchanged", () => {
        const buddy = new CWidget(); buddy.setFocusPolicy(CFocusPolicy.StrongFocus); label.setBuddy(buddy); label.setText("&Name && surname");
        expect(label.displayText()).toBe("Name & surname"); expect(label.mnemonic()).toBe("N"); buddy.destroy();
    });
    test("click emits the URL without opening by default", () => {
        links(); const activated = vi.fn(); label.linkActivated.connect(activated); click(); expect(activated).toHaveBeenCalledWith("https://example.com/"); expect(opened).not.toHaveBeenCalled();
    });
    test("external opening uses a protected new browser tab", () => {
        links(); label.setOpenExternalLinks(true); click(); expect(opened).toHaveBeenCalledWith("https://example.com/", "_blank", "noopener,noreferrer");
    });
    test("executable and data URLs are never automatically opened", () => {
        label.setOpenExternalLinks(true); const activated = vi.fn(); label.linkActivated.connect(activated);
        for (const url of ["javascript:alert(1)", "data:text/html,test", "vbscript:msgbox(1)", "app:partner/42"]) {
            label.setText(`<a href="${url}">Open</a>`); click(4); expect(label.linkAt(4, 8)).toBe(url);
        }
        expect(opened).not.toHaveBeenCalled(); expect(activated).toHaveBeenCalledTimes(4);
    });
    test("mailto links can be opened", () => {
        label.setText('<a href="mailto:info@example.com">Mail</a>'); label.setOpenExternalLinks(true); click(4);
        expect(opened).toHaveBeenCalledWith("mailto:info@example.com", "_blank", "noopener,noreferrer");
    });
    test("nonlink text and blank label areas do not activate", () => { links(); const f = vi.fn(); label.linkActivated.connect(f); click(4); click(290); click(55, 40); expect(f).not.toHaveBeenCalled(); });
    test("press and release must stay on the same link", () => {
        links(); const f = vi.fn(); label.linkActivated.connect(f);
        label.event(new CMouseEvent(CEventType.MousePress, 55, 8, CMouseButton.LeftButton));
        label.event(new CMouseEvent(CEventType.MouseRelease, 150, 8, CMouseButton.LeftButton)); expect(f).not.toHaveBeenCalled();
    });
    test("right click and release without press do not activate", () => {
        links(); const f = vi.fn(); label.linkActivated.connect(f);
        label.event(new CMouseEvent(CEventType.MousePress, 55, 8, CMouseButton.RightButton));
        label.event(new CMouseEvent(CEventType.MouseRelease, 55, 8, CMouseButton.RightButton));
        label.event(new CMouseEvent(CEventType.MouseRelease, 55, 8, CMouseButton.LeftButton)); expect(f).not.toHaveBeenCalled();
    });
    test("links take keyboard focus and Enter activates the first", () => {
        links(); expect(label.focusPolicy()).toBe(CFocusPolicy.StrongFocus); label.setFocus(); const f = vi.fn(); label.linkActivated.connect(f); key("Enter"); expect(f).toHaveBeenCalledWith("https://example.com/");
    });
    test("arrows and Home/End navigate multiple links", () => {
        links(); const f = vi.fn(); label.linkActivated.connect(f); key("ArrowRight"); key("Return"); expect(f).toHaveBeenCalledWith("app:partner/42");
        key("Home"); key("Enter"); expect(f).toHaveBeenCalledWith("https://example.com/"); key("End"); key("Enter"); expect(f).toHaveBeenCalledTimes(3);
    });
    test("removing links restores the previous focus policy", () => { links(); label.setText("Plain"); expect(label.focusPolicy()).toBe(CFocusPolicy.NoFocus); });
    test("pixmap display disables links and restores them on clearing", () => {
        links(); label.setPixmap(new CPixmap({} as CanvasImageSource, 20, 20)); expect(label.linkAt(55, 8)).toBeNull(); expect(label.focusPolicy()).toBe(CFocusPolicy.NoFocus);
        label.setPixmap(null); expect(label.linkAt(55, 8)).toBe("https://example.com/"); expect(label.focusPolicy()).toBe(CFocusPolicy.StrongFocus);
    });
    test("disabled label cannot activate links", () => { links(); const f = vi.fn(); label.linkActivated.connect(f); label.setEnabled(false); click(); key("Enter"); expect(f).not.toHaveBeenCalled(); });
    test("hover uses a pointing hand only over a link", () => {
        links(); const normal = label.cursor(); label.event(new CMouseEvent(CEventType.MouseMove, 55, 8, CMouseButton.NoButton)); expect(label.cursor()).toBe(CCursorShape.PointingHand);
        label.event(new CMouseEvent(CEventType.MouseMove, 2, 8, CMouseButton.NoButton)); expect(label.cursor()).toBe(normal);
    });
    test("right and bottom alignment share painting and hit geometry", () => {
        label.setText('<a href="app:test">Test</a>'); label.setAlignment(CAlignment.Right | CAlignment.Bottom);
        expect(label.linkAt(299, 59)).toBe("app:test"); expect(label.linkAt(4, 8)).toBeNull();
    });
    test("wrapped links remain clickable on successive lines", () => {
        label.setText('<a href="app:test">abcdefghij</a>'); label.setWordWrap(true); label.resize(52, 80);
        expect(label.heightForWidth(52)).toBe(40); expect(label.linkAt(10, 8)).toBe("app:test"); expect(label.linkAt(10, 24)).toBe("app:test");
    });
    test("text changes cancel a pending click", () => {
        links(); const f = vi.fn(); label.linkActivated.connect(f); label.event(new CMouseEvent(CEventType.MousePress, 55, 8, CMouseButton.LeftButton));
        label.setText('<a href="app:other">Other link</a>'); label.event(new CMouseEvent(CEventType.MouseRelease, 55, 8, CMouseButton.LeftButton)); expect(f).not.toHaveBeenCalled();
    });
    test("paint uses Link color and underlines hyperlink runs", () => {
        links(); const r = painter(); label.paint(r.paint); expect(r.p.setPen).toHaveBeenCalledWith(label.palette().color(CPaletteColorRole.Link).toCss());
        expect(r.p.drawLine).toHaveBeenCalledTimes(2); expect(r.p.save.mock.calls.length).toBe(r.p.restore.mock.calls.length);
    });
    test("disabled hyperlink paint uses DisabledText", () => {
        links(); label.setEnabled(false); const r = painter(); label.paint(r.paint); expect(r.p.setPen).toHaveBeenCalledWith(label.palette().color(CPaletteColorRole.DisabledText).toCss());
    });
    test("focused link has a visible focus rectangle", () => { links(); label.setFocus(); const r = painter(); label.paint(r.paint); expect(r.p.strokeRect).toHaveBeenCalledOnce(); });
});
