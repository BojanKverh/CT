import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CAction } from "../../src/core/CAction.js";
import { CApplication } from "../../src/core/CApplication.js";
import { CKeyEvent } from "../../src/events/CKeyEvent.js";
import { CKeyboardModifier, CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CPixmap } from "../../src/painting/CPixmap.js";
import {CToolButton} from "../../src/widgets/CToolButton.js";
import { CToolButtonStyle } from "../../src/gui/CToolButtonStyle.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";
import { CEventType } from "../../src/index.js";
import { CSize } from "../../src/index.js";
import { CIcon, CIconMode, CIconState } from "../../src/gui/CIcon.js";
import { CPainter } from "../../src/painting/CPainter.js";
import { TestPaintDevice } from "../helpers/createTestPaintEngine.js";

class TestToolButton extends CToolButton {
	paint(painter: CPainter): void {
		this.paintEvent(painter);
	}
}

describe("CToolButton", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("uses IconOnly style by default", () => {
		const button = new CToolButton();

		expect(button.toolButtonStyle()).toBe(
			CToolButtonStyle.IconOnly
		);
	});

	test("does not auto raise by default", () => {
		const button = new CToolButton();

		expect(button.autoRaise()).toBe(false);
	});

	test("has no icon or default action by default", () => {
		const button = new CToolButton();

		expect(button.icon()).toBeNull();
		expect(button.defaultAction()).toBeNull();
	});

	test("setText switches to TextOnly style", () => {
		const button = new CToolButton();

		button.setText("Save");

		expect(button.text()).toBe("Save");
		expect(button.toolButtonStyle()).toBe(
			CToolButtonStyle.TextOnly
		);
	});

	test("setIcon switches to IconOnly style", () => {
		const button = new CToolButton();
		const image = {} as CanvasImageSource;
		const pixmap = new CPixmap(image, 24, 24);
		const icon = new CIcon(pixmap);
		
		button.setText("Save");
		button.setIcon(icon);

		expect(button.icon()).toBe(icon);
		expect(button.toolButtonStyle()).toBe(
			CToolButtonStyle.IconOnly
		);
	});

	test("setTextAndIcon switches to TextUnderIcon style", () => {
		const button = new CToolButton();
		const image = {} as CanvasImageSource;
		const pixmap = new CPixmap(image, 16, 16);
		const icon = new CIcon(pixmap);

		button.setTextAndIcon("Save", icon);

		expect(button.text()).toBe("Save");
		expect(button.icon()).toBe(icon);
		expect(button.toolButtonStyle()).toBe(
			CToolButtonStyle.TextUnderIcon
		);
	});

	test("sets auto raise and tool button style", () => {
		const button = new CToolButton();

		button.setAutoRaise(true);
		button.setToolButtonStyle(
			CToolButtonStyle.TextBesideIcon
		);

		expect(button.autoRaise()).toBe(true);
		expect(button.toolButtonStyle()).toBe(
			CToolButtonStyle.TextBesideIcon
		);
	});

	test("TextOnly size hint includes text", () => {
		const button = new CToolButton();

		button.setText("Long tool button text");

		const hint = button.sizeHint();

		expect(hint.width()).toBeGreaterThan(28);
		expect(hint.height()).toBeGreaterThanOrEqual(28);
	});

	test("IconOnly size hint includes icon", () => {
		const button = new CToolButton();
		const image = {} as CanvasImageSource;
		const pixmap = new CPixmap(image, 16, 16);
		const icon = new CIcon(pixmap);

		button.setIcon(icon);

		const hint = button.sizeHint();

		expect(hint.width()).toBe(28);
		expect(hint.height()).toBe(28);
	});

	test("custom icon size affects size hint", () => {
		const button = new CToolButton();
		const image = {} as CanvasImageSource;
		const pixmap = new CPixmap(image, 16, 16);
		const icon = new CIcon(pixmap);
		button.setIcon(icon);
		button.setIconSize(new CSize(32, 24));

		const hint = button.sizeHint();
		expect(hint.width()).toBe(44);
		expect(hint.height()).toBe(36);
	});

	test("TextUnderIcon size hint includes text and icon", () => {
		const button = new CToolButton();
		const image = {} as CanvasImageSource;
		
		const pixmap = new CPixmap(image, 16, 16);
		const icon = new CIcon(pixmap);

		button.setTextAndIcon("Save", icon);

		const hint = button.sizeHint();

		expect(hint.width()).toBeGreaterThanOrEqual(36);
		expect(hint.height()).toBeGreaterThan(42);
	});

	test("mouse click emits clicked", () => {
		class TestToolButton extends CToolButton {
			press(event: CMouseEvent): void {
				this.mousePressEvent(event);
			}

			release(event: CMouseEvent): void {
				this.mouseReleaseEvent(event);
			}
		}

		const button = new TestToolButton();
		button.resize(60, 40);

		const clicked = vi.fn();
		button.clicked.connect(clicked);

		button.press(new CMouseEvent(CEventType.MousePress, 10, 10, CMouseButton.LeftButton));
		button.release(new CMouseEvent(CEventType.MouseRelease, 10, 10, CMouseButton.LeftButton));

		expect(button.isDown()).toBe(false);
		expect(clicked).toHaveBeenCalledOnce();
	});

	test("mouse release outside does not emit clicked", () => {
		class TestToolButton extends CToolButton {
			press(event: CMouseEvent): void {
				this.mousePressEvent(event);
			}

			release(event: CMouseEvent): void {
				this.mouseReleaseEvent(event);
			}
		}

		const button = new TestToolButton();
		button.resize(60, 40);

		const clicked = vi.fn();
		button.clicked.connect(clicked);
		button.press(new CMouseEvent(CEventType.MousePress, 10, 10, CMouseButton.LeftButton));
		button.release(new CMouseEvent(CEventType.MouseRelease, 100, 100, CMouseButton.LeftButton));
		expect(clicked).not.toHaveBeenCalled();
	});

	test("mouse enter and leave update hovered state", () => {
		class TestToolButton extends CToolButton {
			enter(event: CMouseEvent): void {
				this.mouseEnterEvent(event);
			}

			leave(event: CMouseEvent): void {
				this.mouseLeaveEvent(event);
			}
		}

		const button = new TestToolButton();

		button.enter(new CMouseEvent(CEventType.MouseMove, 0, 0, CMouseButton.NoButton));
		expect(button.isHovered()).toBe(true);
		button.leave(new CMouseEvent(CEventType.MouseMove, 0, 0, CMouseButton.NoButton));
		expect(button.isHovered()).toBe(false);
	});

	test("Space key presses and releases button", () => {
		class TestToolButton extends CToolButton {
			keyDown(event: CKeyEvent): void {
				this.keyPressEvent(event);
			}

			keyUp(event: CKeyEvent): void {
				this.keyReleaseEvent(event);
			}
		}

		const button = new TestToolButton();
		const clicked = vi.fn();
		button.clicked.connect(clicked);

		button.keyDown(new CKeyEvent(CEventType.KeyPress, " "));
		expect(button.isDown()).toBe(true);

		button.keyUp(new CKeyEvent(CEventType.KeyRelease, " "));

		expect(button.isDown()).toBe(false);
		expect(clicked).toHaveBeenCalledOnce();
	});

	test("Enter triggers button immediately", () => {
		class TestToolButton extends CToolButton {
			keyDown(event: CKeyEvent): void {
				this.keyPressEvent(event);
			}
		}

		const button = new TestToolButton();
		const clicked = vi.fn();
		button.clicked.connect(clicked);

		button.keyDown(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(clicked).toHaveBeenCalledOnce();
	});

	test("checkable button toggles when triggered", () => {
		class TestToolButton extends CToolButton {
			keyDown(event: CKeyEvent): void {
				this.keyPressEvent(event);
			}
		}

		const button = new TestToolButton();
		button.setCheckable(true);

		button.keyDown(new CKeyEvent(CEventType.KeyPress, "Enter"));
		expect(button.isChecked()).toBe(true);

		button.keyDown(new CKeyEvent(CEventType.KeyRelease, "Enter"));
		expect(button.isChecked()).toBe(false);
	});

	test("default action is synchronized when assigned", () => {
		const action = new CAction("Save");
		action.setEnabled(false);
		action.setCheckable(true);
		action.setChecked(true);

		const button = new CToolButton();
		button.setDefaultAction(action);

		expect(button.defaultAction()).toBe(action);
		expect(button.text()).toBe("Save");
		expect(button.isEnabled()).toBe(false);
		expect(button.isCheckable()).toBe(true);
		expect(button.isChecked()).toBe(true);
	});

	test("default action sync does not overwrite style", () => {
		const action = new CAction("Save");
		const button = new CToolButton();

		button.setDefaultAction(action);
		button.setToolButtonStyle(CToolButtonStyle.TextUnderIcon);
		action.setText("Save As");
		expect(button.toolButtonStyle()).toBe(CToolButtonStyle.TextUnderIcon);
	});

	test("changes to default action are synchronized", () => {
		const action = new CAction("Save");
		const button = new CToolButton();

		button.setDefaultAction(action);

		action.setText("Save As");
		action.setEnabled(false);
		action.setCheckable(true);
		action.setChecked(true);

		expect(button.text()).toBe("Save As");
		expect(button.isEnabled()).toBe(false);
		expect(button.isCheckable()).toBe(true);
		expect(button.isChecked()).toBe(true);
	});

	test("triggering button triggers default action", () => {
		class TestToolButton extends CToolButton {
			keyDown(event: CKeyEvent): void {
				this.keyPressEvent(event);
			}
		}

		const action = new CAction("Save");
		const button = new TestToolButton();
		const triggered = vi.fn();

		action.triggered.connect(triggered);
		button.setDefaultAction(action);

		button.keyDown(new CKeyEvent(CEventType.KeyPress, "Enter"));

		expect(triggered).toHaveBeenCalledOnce();
	});

	test("replacing default action ignores old action changes", () => {
		const oldAction = new CAction("Old");
		const newAction = new CAction("New");
		const button = new CToolButton();

		button.setDefaultAction(oldAction);
		button.setDefaultAction(newAction);

		oldAction.setText("Changed old");

		expect(button.text()).toBe("New");
	});

	test("uses normal icon pixmap when enabled", () => {
		const normalPixmap = new CPixmap({} as CanvasImageSource, 16, 16);
		const disabledPixmap = new CPixmap({} as CanvasImageSource, 16, 16);
		const icon = new CIcon();

		icon.addPixmap(normalPixmap, CIconMode.Normal, CIconState.Off);
		icon.addPixmap(disabledPixmap, CIconMode.Disabled, CIconState.Off);

		const button = new TestToolButton();
		button.setIcon(icon);
		button.resize(28, 28);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.drawPixmap).toHaveBeenCalledWith(
			normalPixmap, 6, 6, 16, 16);
	});

	test("uses disabled icon pixmap when disabled", () => {
		const normalPixmap = new CPixmap({} as CanvasImageSource, 16, 16);
		const disabledPixmap = new CPixmap({} as CanvasImageSource, 16, 16);
		const icon = new CIcon();

		icon.addPixmap(normalPixmap, CIconMode.Normal, CIconState.Off);
		icon.addPixmap(disabledPixmap, CIconMode.Disabled, CIconState.Off);

		const button = new TestToolButton();
		button.setIcon(icon);
		button.setEnabled(false);
		button.resize(28, 28);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.drawPixmap).toHaveBeenCalledWith(
			disabledPixmap, 6, 6, 16, 16);
	});

	test("uses active icon pixmap when hovered", () => {
		const normalPixmap = new CPixmap({} as CanvasImageSource, 16, 16);
		const activePixmap = new CPixmap({} as CanvasImageSource, 16, 16);
		const icon = new CIcon();

		icon.addPixmap(normalPixmap, CIconMode.Normal, CIconState.Off);
		icon.addPixmap(activePixmap, CIconMode.Active, CIconState.Off);

		const button = new TestToolButton();
		button.setIcon(icon);
		button.resize(28, 28);

		button.event(new CMouseEvent(CEventType.MouseMove, 10, 10,
			CMouseButton.NoButton));

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.drawPixmap).toHaveBeenCalledWith(
			activePixmap, 6, 6, 16, 16);
	});

	test("uses on icon pixmap when checked", () => {
		const offPixmap = new CPixmap({} as CanvasImageSource, 16, 16);
		const onPixmap = new CPixmap({} as CanvasImageSource, 16, 16);
		const icon = new CIcon();

		icon.addPixmap(offPixmap, CIconMode.Normal, CIconState.Off);
		icon.addPixmap(onPixmap, CIconMode.Normal, CIconState.On);

		const button = new TestToolButton();
		button.setIcon(icon);
		button.setCheckable(true);
		button.setChecked(true);
		button.resize(28, 28);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.drawPixmap).toHaveBeenCalledWith(
			onPixmap, 6, 6, 16, 16);
	});

	test("uses disabled on icon pixmap when disabled and checked", () => {
		const normalOff = new CPixmap({} as CanvasImageSource, 16, 16);
		const disabledOn = new CPixmap({} as CanvasImageSource, 16, 16);
		const icon = new CIcon();

		icon.addPixmap(normalOff, CIconMode.Normal, CIconState.Off);
		icon.addPixmap(disabledOn, CIconMode.Disabled, CIconState.On);

		const button = new TestToolButton();
		button.setIcon(icon);
		button.setCheckable(true);
		button.setChecked(true);
		button.setEnabled(false);
		button.resize(28, 28);

		const device = new TestPaintDevice();
		const painter = new CPainter(device);

		button.paint(painter);

		expect(device.engine.drawPixmap).toHaveBeenCalledWith(
			disabledOn, 6, 6, 16, 16);
	});
});
