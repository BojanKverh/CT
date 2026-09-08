import { beforeEach, afterEach, describe, expect, test } from "vitest";
import { CApplication } from "../../src/core/CApplication.js";
import {
	CStyleOptionComboBox
} from "../../src/gui/CStyleOptionComboBox.js";
import { CStyleState } from "../../src/gui/CStyleOption.js";
import { CComboBox } from "../../src/widgets/CComboBox.js";
import { CMouseButton, CMouseEvent } from "../../src/events/CMouseEvent.js";
import { CEventType } from "../../src/events/CEvent.js";
import { createTestCanvas } from "../helpers/createTestCanvas.js";

describe("CStyleOptionComboBox", () => {
	beforeEach(() => {
		new CApplication(createTestCanvas());
	});

	afterEach(() => {
		if (CApplication.exists())
			CApplication.instance().destroy();
	});
    
    test("has default values", () => {
		const option = new CStyleOptionComboBox();

		expect(option.arrowHovered).toBe(false);
	});

	test("copy constructor copies values", () => {
		const option = new CStyleOptionComboBox();
		option.arrowHovered = true;

		const copy = new CStyleOptionComboBox(option);

		expect(copy.arrowHovered).toBe(true);
	});

	test("initFromComboBox initializes base option", () => {
		const comboBox = new CComboBox();
		comboBox.setGeometry(10, 20, 150, 30);

		const option = new CStyleOptionComboBox();
		option.initFromComboBox(comboBox);

		expect(option.rect).toEqual(comboBox.rect());
		expect(option.palette).toEqual(comboBox.palette());
		expect(
			(option.state & CStyleState.Enabled) !== 0
		).toBe(true);
	});

	test("initFromComboBox initializes arrow hover state", () => {
		const comboBox = new CComboBox();
		comboBox.resize(120, 30);

		const event = new CMouseEvent(
			CEventType.MouseMove, 115, 15, CMouseButton.NoButton
		);
		comboBox.event(event);

		const option = new CStyleOptionComboBox();
		option.initFromComboBox(comboBox);

		expect(option.arrowHovered).toBe(true);
	});

	test("initFromComboBox clears arrow hover state", () => {
		const comboBox = new CComboBox();
		comboBox.resize(120, 30);

		comboBox.event(new CMouseEvent(
			CEventType.MouseMove, 115, 15, CMouseButton.NoButton
		));

		comboBox.event(new CMouseEvent(
			CEventType.MouseMove, 20, 15, CMouseButton.NoButton
		));

		const option = new CStyleOptionComboBox();
		option.initFromComboBox(comboBox);

		expect(option.arrowHovered).toBe(false);
	});

	test("initFromComboBox sets Sunken when combo box is down", () => {
		const comboBox = new CComboBox();
		comboBox.resize(120, 30);

		comboBox.event(new CMouseEvent(
			CEventType.MousePress, 115, 15, CMouseButton.LeftButton
		));

		const option = new CStyleOptionComboBox();
		option.initFromComboBox(comboBox);

		expect(
			(option.state & CStyleState.Sunken) !== 0
		).toBe(true);
	});

	test("initFromComboBox does not set Sunken when not down", () => {
		const comboBox = new CComboBox();

		const option = new CStyleOptionComboBox();
		option.initFromComboBox(comboBox);

		expect(
			(option.state & CStyleState.Sunken) !== 0
		).toBe(false);
	});

	test("initFromComboBox clears previous combo box state", () => {
		const comboBox = new CComboBox();
		const option = new CStyleOptionComboBox();

		option.state |= CStyleState.Sunken;
		option.arrowHovered = true;

		option.initFromComboBox(comboBox);

		expect(
			(option.state & CStyleState.Sunken) !== 0
		).toBe(false);
		expect(option.arrowHovered).toBe(false);
	});
});