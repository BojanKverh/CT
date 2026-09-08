import { beforeEach, afterEach, describe, expect, test } from "vitest";

import { CIcon } from "../../src/gui/CIcon.js";
import { CStyleOptionToolButton } from "../../src/gui/CStyleOptionToolButton.js";
import { CToolButtonStyle} from "../../src/gui/CToolButtonStyle.js";
import { CPixmap } from "../../src/painting/CPixmap.js";
import { CEvent, CEventType } from "../../src/events/CEvent.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CToolButton } from "../../src/widgets/CToolButton.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CApplication } from "../../src/core/CApplication.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionToolButton", () => {
    beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});

	test("has default values", () => {
		const option = new CStyleOptionToolButton();

		expect(option.text).toBe("");
		expect(option.icon).toBeNull();
		expect(option.iconSize.width()).toBe(16);
		expect(option.iconSize.height()).toBe(16);
		expect(option.toolButtonStyle).toBe(
			CToolButtonStyle.IconOnly
		);
	});

	test("inherits style option state", () => {
		const option = new CStyleOptionToolButton();
		option.state = CStyleState.Enabled |
			CStyleState.MouseOver;

		expect(option.state & CStyleState.Enabled).not.toBe(0);
		expect(option.state & CStyleState.MouseOver).not.toBe(0);
	});

	test("copies text", () => {
		const source = new CStyleOptionToolButton();
		source.text = "Open";

		const copy = new CStyleOptionToolButton(source);

		expect(copy.text).toBe("Open");
	});

	test("copies icon reference", () => {
		const pixmap = new CPixmap({} as CanvasImageSource, 16, 16);
		const icon = new CIcon(pixmap);

		const source = new CStyleOptionToolButton();
		source.icon = icon;

		const copy = new CStyleOptionToolButton(source);

		expect(copy.icon).toBe(icon);
	});

	test("copies icon size", () => {
		const source = new CStyleOptionToolButton();
		source.iconSize.resize(24, 32);

		const copy = new CStyleOptionToolButton(source);

		expect(copy.iconSize.width()).toBe(24);
		expect(copy.iconSize.height()).toBe(32);
		expect(copy.iconSize).not.toBe(source.iconSize);
	});

	test("copied icon size is independent", () => {
		const source = new CStyleOptionToolButton();
		source.iconSize.resize(24, 32);

		const copy = new CStyleOptionToolButton(source);
		copy.iconSize.resize(48, copy.iconSize.height());

		expect(source.iconSize.width()).toBe(24);
		expect(copy.iconSize.width()).toBe(48);
	});

	test("copies tool button style", () => {
		const source = new CStyleOptionToolButton();
		source.toolButtonStyle = CToolButtonStyle.TextBesideIcon;

		const copy = new CStyleOptionToolButton(source);

		expect(copy.toolButtonStyle).toBe(
			CToolButtonStyle.TextBesideIcon
		);
	});

	test("copies base style option data", () => {
		const source = new CStyleOptionToolButton();
		source.state = CStyleState.Enabled |
			CStyleState.Sunken;
		source.rect.setGeometry(10, 20, 100, 40);

		const copy = new CStyleOptionToolButton(source);

		expect(copy.state).toBe(source.state);
		expect(copy.rect.equals(source.rect)).toBe(true);
		expect(copy.rect).not.toBe(source.rect);
	});

	test("initializes tool button properties", () => {
		const button = new CToolButton();
		const icon = new CIcon(
			new CPixmap({} as CanvasImageSource, 32, 32)
		);

		button.setText("Save");
		button.setIcon(icon);
		button.setIconSize(new CSize(24, 24));
		button.setToolButtonStyle(CToolButtonStyle.TextBesideIcon);
		button.setAutoRaise(true);

		const option = new CStyleOptionToolButton();
		option.initFromToolButton(button);

		expect(option.text).toBe("Save");
		expect(option.icon).toBe(icon);
		expect(option.iconSize.width()).toBe(24);
		expect(option.iconSize.height()).toBe(24);
		expect(option.toolButtonStyle).toBe(
			CToolButtonStyle.TextBesideIcon
		);
		expect(option.autoRaise).toBe(true);
	});

	test("initializes checked state", () => {
		const button = new CToolButton();
		button.setCheckable(true);
		button.setChecked(true);

		const option = new CStyleOptionToolButton();
		option.initFromToolButton(button);

		expect(option.state & CStyleState.On).not.toBe(0);
	});

	test("initializes unchecked state", () => {
		const button = new CToolButton();
		button.setCheckable(true);

		const option = new CStyleOptionToolButton();
		option.initFromToolButton(button);

		expect(option.state & CStyleState.On).toBe(0);
	});

	test("initializes hover state", () => {
		const button = new CToolButton();

		button.event(new CEvent(CEventType.MouseEnter));

		const option = new CStyleOptionToolButton();
		option.initFromToolButton(button);

		expect(option.state & CStyleState.MouseOver).not.toBe(0);
	});

	test("inherits enabled state", () => {
		const button = new CToolButton();

		const option = new CStyleOptionToolButton();
		option.initFromToolButton(button);

		expect(option.state & CStyleState.Enabled).not.toBe(0);

		button.setEnabled(false);
		option.initFromToolButton(button);

		expect(option.state & CStyleState.Enabled).toBe(0);
	});
});