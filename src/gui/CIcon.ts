import { CSize } from "../geometry/CSize.js";
import { CPixmap } from "../painting/CPixmap.js";

/**
 * Defines the visual mode in which an icon is requested.
 */
export enum CIconMode {
		/**
	 * Normal appearance.
	 */
Normal,
		/**
	 * Disabled appearance.
	 */
Disabled,
		/**
	 * The widget is active.
	 */
Active,
		/**
	 * Selected appearance.
	 */
Selected
}

/**
 * Defines the on/off state of an icon.
 */
export enum CIconState {
		/**
	 * Off state.
	 */
Off,
		/**
	 * The control is in the on state.
	 */
On
}

type CIconPixmap = {
		/**
	 * Returns the best matching pixmap for the requested size, mode, and state.
	 */
pixmap: CPixmap;
		/**
	 * The mode value.
	 */
mode: CIconMode;
		/**
	 * The state value.
	 */
state: CIconState;
};

/**
 * Stores pixmaps used to represent an icon in different modes and states.
 */
export class CIcon {
	#m_pixmaps: CIconPixmap[] = [];

		/**
	 * Creates a new CIcon instance.
	 *
	 * @param pixmap Pixmap.
	 */
constructor(pixmap: CPixmap | null = null) {
		if (pixmap !== null)
			this.addPixmap(pixmap);
	}

		/**
 * Checks whether the icon has any raster variants.
 * @returns `true` if no pixmaps are registered.
 */
isNull(): boolean {
		return this.#m_pixmaps.length === 0;
	}

		/**
 * Registers a pixmap as a candidate for the specified mode and state.
 * @param pixmap Image to register.
 * @param mode Visual mode. Defaults to Normal.
 * @param state On or Off state. Defaults to Off.
 */
addPixmap(pixmap: CPixmap, mode = CIconMode.Normal,
		state = CIconState.Off): void {
		this.#m_pixmaps.push({
			pixmap,
			mode,
			state
		});
	}

		/**
 * Selects the nearest-sized pixmap from the first matching mode/state group, penalizing upscaling more than downscaling.
 * @param size Requested image width and height.
 * @param mode Preferred visual mode. Defaults to Normal, which is also tried as a fallback.
 * @param state Preferred icon state. Defaults to Off, which is also tried as a fallback.
 * @returns The selected original pixmap, or `null` when no variant matches the fallback chain.
 */
pixmap(size: CSize, mode = CIconMode.Normal,
		state = CIconState.Off): CPixmap | null {
		const candidates = this.#candidates(mode, state);

		if (candidates.length === 0)
			return null;

		let best = candidates[0]!;
		let bestScore = this.#sizeScore(best.pixmap, size);

		for (let i = 1; i < candidates.length; ++i) {
			const candidate = candidates[i]!;
			const score = this.#sizeScore(candidate.pixmap, size);

			if (score < bestScore) {
				best = candidate;
				bestScore = score;
			}
		}

		return best.pixmap;
	}

		/**
 * Lists the sizes in the first available group in the mode/state fallback chain.
 * @param mode Preferred visual mode, defaulting to Normal.
 * @param state Preferred icon state, defaulting to Off.
 * @returns A new array of candidate dimensions in registration order, or an empty array if no group matches.
 */
availableSizes(mode = CIconMode.Normal,
		state = CIconState.Off): CSize[] {
		return this.#candidates(mode, state).map(entry =>
			new CSize(entry.pixmap.width(), entry.pixmap.height()));
	}

	#candidates(mode: CIconMode, state: CIconState): CIconPixmap[] {
		let result = this.#m_pixmaps.filter(entry =>
			entry.mode === mode && entry.state === state);

		if (result.length > 0)
			return result;

		result = this.#m_pixmaps.filter(entry =>
			entry.mode === CIconMode.Normal && entry.state === state);

		if (result.length > 0)
			return result;

		result = this.#m_pixmaps.filter(entry =>
			entry.mode === mode && entry.state === CIconState.Off);

		if (result.length > 0)
			return result;

		result = this.#m_pixmaps.filter(entry =>
			entry.mode === CIconMode.Normal
			&& entry.state === CIconState.Off);

		return result;
	}

	#sizeScore(pixmap: CPixmap, size: CSize): number {
		const widthDifference = pixmap.width() - size.width();
		const heightDifference = pixmap.height() - size.height();

		const upscalePenalty =
			(widthDifference < 0 ? -widthDifference * 2 : widthDifference)
			+ (heightDifference < 0
				? -heightDifference * 2
				: heightDifference);

		return upscalePenalty;
	}
}