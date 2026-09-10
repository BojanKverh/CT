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
	 * Returns whether the icon contains no pixmaps.
	 *
	 * @returns The resulting value.
	 */
isNull(): boolean {
		return this.#m_pixmaps.length === 0;
	}

		/**
	 * Adds a pixmap for the specified icon mode and state.
	 *
	 * @param pixmap Pixmap.
	 * @param mode Mode.
	 * @param state State.
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
	 * Returns the best matching pixmap for the requested size, mode, and state.
	 *
	 * @param size Size.
	 * @param mode Mode.
	 * @param state State.
	 *
	 * @returns The resulting value.
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
	 * Returns the sizes available for the specified icon mode and state.
	 *
	 * @param mode Mode.
	 * @param state State.
	 *
	 * @returns The resulting value.
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