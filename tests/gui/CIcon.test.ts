import { describe, expect, test } from "vitest";
import {
	CIcon,
	CIconMode,
	CIconState
} from "../../src/gui/CIcon.js";
import { CSize } from "../../src/geometry/CSize.js";
import { CPixmap } from "../../src/painting/CPixmap.js";

describe("CIcon", () => {
	function createPixmap(width: number, height: number): CPixmap {
		const image = {} as CanvasImageSource;

		return new CPixmap(image, width, height);
	}

	test("is null by default", () => {
		const icon = new CIcon();

		expect(icon.isNull()).toBe(true);
	});

	test("is not null when constructed with pixmap", () => {
		const icon = new CIcon(createPixmap(16, 16));

		expect(icon.isNull()).toBe(false);
	});

	test("is not null after adding pixmap", () => {
		const icon = new CIcon();

		icon.addPixmap(createPixmap(16, 16));

		expect(icon.isNull()).toBe(false);
	});

	test("returns pixmap passed to constructor", () => {
		const pixmap = createPixmap(16, 16);
		const icon = new CIcon(pixmap);

		expect(icon.pixmap(new CSize(16, 16))).toBe(pixmap);
	});

	test("returns null when icon is null", () => {
		const icon = new CIcon();

		expect(icon.pixmap(new CSize(16, 16))).toBeNull();
	});

	test("selects exact pixmap size", () => {
		const pixmap16 = createPixmap(16, 16);
		const pixmap24 = createPixmap(24, 24);
		const pixmap32 = createPixmap(32, 32);
		const icon = new CIcon();

		icon.addPixmap(pixmap16);
		icon.addPixmap(pixmap24);
		icon.addPixmap(pixmap32);

		expect(icon.pixmap(new CSize(24, 24))).toBe(pixmap24);
	});

	test("prefers larger pixmap when sizes are equally distant", () => {
		const pixmap16 = createPixmap(16, 16);
		const pixmap32 = createPixmap(32, 32);
		const icon = new CIcon();

		icon.addPixmap(pixmap16);
		icon.addPixmap(pixmap32);

		expect(icon.pixmap(new CSize(24, 24))).toBe(pixmap32);
	});

	test("selects closest larger pixmap", () => {
		const pixmap32 = createPixmap(32, 32);
		const pixmap64 = createPixmap(64, 64);
		const icon = new CIcon();

		icon.addPixmap(pixmap32);
		icon.addPixmap(pixmap64);

		expect(icon.pixmap(new CSize(24, 24))).toBe(pixmap32);
	});

	test("selects closest smaller pixmap when no larger one exists", () => {
		const pixmap16 = createPixmap(16, 16);
		const pixmap32 = createPixmap(32, 32);
		const icon = new CIcon();

		icon.addPixmap(pixmap16);
		icon.addPixmap(pixmap32);

		expect(icon.pixmap(new CSize(48, 48))).toBe(pixmap32);
	});

	test("selects pixmap for requested mode", () => {
		const normal = createPixmap(16, 16);
		const disabled = createPixmap(16, 16);
		const icon = new CIcon();

		icon.addPixmap(normal, CIconMode.Normal);
		icon.addPixmap(disabled, CIconMode.Disabled);

		expect(icon.pixmap(
			new CSize(16, 16), CIconMode.Disabled
		)).toBe(disabled);
	});

	test("falls back to normal mode", () => {
		const normal = createPixmap(16, 16);
		const icon = new CIcon();

		icon.addPixmap(normal);

		expect(icon.pixmap(
			new CSize(16, 16), CIconMode.Disabled
		)).toBe(normal);
	});

	test("selects pixmap for requested state", () => {
		const off = createPixmap(16, 16);
		const on = createPixmap(16, 16);
		const icon = new CIcon();

		icon.addPixmap(off, CIconMode.Normal, CIconState.Off);
		icon.addPixmap(on, CIconMode.Normal, CIconState.On);

		expect(icon.pixmap(
			new CSize(16, 16),
			CIconMode.Normal,
			CIconState.On
		)).toBe(on);
	});

	test("falls back from on to off state", () => {
		const off = createPixmap(16, 16);
		const icon = new CIcon();

		icon.addPixmap(off, CIconMode.Normal, CIconState.Off);

		expect(icon.pixmap(
			new CSize(16, 16),
			CIconMode.Normal,
			CIconState.On
		)).toBe(off);
	});

	test("prefers matching state with normal mode", () => {
		const normalOff = createPixmap(16, 16);
		const normalOn = createPixmap(16, 16);
		const icon = new CIcon();

		icon.addPixmap(
			normalOff,
			CIconMode.Normal,
			CIconState.Off
		);

		icon.addPixmap(
			normalOn,
			CIconMode.Normal,
			CIconState.On
		);

		expect(icon.pixmap(
			new CSize(16, 16),
			CIconMode.Disabled,
			CIconState.On
		)).toBe(normalOn);
	});

	test("returns available sizes for mode and state", () => {
		const icon = new CIcon();

		icon.addPixmap(createPixmap(16, 16));
		icon.addPixmap(createPixmap(32, 32));
		icon.addPixmap(
			createPixmap(24, 24),
			CIconMode.Disabled
		);

		const sizes = icon.availableSizes();

		expect(sizes).toHaveLength(2);
		expect(sizes[0]!.width()).toBe(16);
		expect(sizes[0]!.height()).toBe(16);
		expect(sizes[1]!.width()).toBe(32);
		expect(sizes[1]!.height()).toBe(32);
	});

	test("returns available sizes for requested mode", () => {
		const icon = new CIcon();

		icon.addPixmap(createPixmap(16, 16));
		icon.addPixmap(
			createPixmap(24, 24),
			CIconMode.Disabled
		);

		const sizes = icon.availableSizes(CIconMode.Disabled);

		expect(sizes).toHaveLength(1);
		expect(sizes[0]!.width()).toBe(24);
		expect(sizes[0]!.height()).toBe(24);
	});
});