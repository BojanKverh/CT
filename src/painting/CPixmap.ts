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

	/** Returns the underlying canvas image source. */
	image(): CanvasImageSource {
		return this.#m_image;
	}

	/** Returns the pixmap width in pixels. */
	width(): number {
		return this.#m_width;
	}

	/** Returns the pixmap height in pixels. */
	height(): number {
		return this.#m_height;
	}

	/** Returns whether the pixmap has non-positive dimensions. */
	isNull(): boolean {
		return this.#m_width <= 0 || this.#m_height <= 0;
	}

    /**
     * Loads an image URL and creates a pixmap using its natural dimensions.
     *
     * @param url Image URL to load.
     * @returns A promise resolving to the loaded pixmap.
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