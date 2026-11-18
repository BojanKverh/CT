/** Raster image together with its logical dimensions. */
export class CPixmap {
	#m_image: CanvasImageSource;
	#m_width: number;
	#m_height: number;

	/**
	 * Creates a pixmap from an existing canvas image source.
	 *
	 * @param image Underlying image source.
	 * @param width Pixmap width in pixels.
	 * @param height Pixmap height in pixels.
	 */
	constructor(
		image: CanvasImageSource,
		width: number,
		height: number
	) {
		this.#m_image = image;
		this.#m_width = width;
		this.#m_height = height;
	}

	/**
	 * Exposes the source used by canvas image drawing.
	 * @returns The original canvas-compatible image source.
	 */
	image(): CanvasImageSource {
		return this.#m_image;
	}

	/**
	 * Reads the stored source width.
	 * @returns Pixmap width in pixels.
	 */
	width(): number {
		return this.#m_width;
	}

	/**
	 * Reads the stored source height.
	 * @returns Pixmap height in pixels.
	 */
	height(): number {
		return this.#m_height;
	}

	/**
	 * Checks whether the pixmap has usable dimensions.
	 * @returns `true` if either dimension is zero or negative.
	 */
	isNull(): boolean {
		return this.#m_width <= 0 || this.#m_height <= 0;
	}

    /**
     * Loads an image through the browser and wraps it at its natural dimensions.
     * @param url Image URL that the browser can load.
     * @returns A promise resolving to a pixmap, or rejecting if the image fails to load.
     */
    static async fromUrl(url: string): Promise<CPixmap> {
	    const image = new Image();
	    await new Promise<void>((resolve, reject) => {
		    image.onload = () => resolve();
		    image.onerror = () =>
			    reject(new Error(`Failed to load image: ${url}`));

    		image.src = url;
	    });

	    return new CPixmap(image, image.naturalWidth, image.naturalHeight);
    }
}