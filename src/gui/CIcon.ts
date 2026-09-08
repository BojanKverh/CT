import { CSize } from "../geometry/CSize.js";
import { CPixmap } from "../painting/CPixmap.js";

export enum CIconMode {
	Normal,
	Disabled,
	Active,
	Selected
}

export enum CIconState {
	Off,
	On
}

type CIconPixmap = {
	pixmap: CPixmap;
	mode: CIconMode;
	state: CIconState;
};

export class CIcon {
	#m_pixmaps: CIconPixmap[] = [];

	constructor(pixmap: CPixmap | null = null) {
		if (pixmap !== null)
			this.addPixmap(pixmap);
	}

	isNull(): boolean {
		return this.#m_pixmaps.length === 0;
	}

	addPixmap(pixmap: CPixmap, mode = CIconMode.Normal,
		state = CIconState.Off): void {
		this.#m_pixmaps.push({
			pixmap,
			mode,
			state
		});
	}

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