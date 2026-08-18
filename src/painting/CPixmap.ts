export class CPixmap {
	#m_image: CanvasImageSource;
	#m_width: number;
	#m_height: number;

	constructor(
		image: CanvasImageSource,
		width: number,
		height: number
	) {
		this.#m_image = image;
		this.#m_width = width;
		this.#m_height = height;
	}

	image(): CanvasImageSource {
		return this.#m_image;
	}

	width(): number {
		return this.#m_width;
	}

	height(): number {
		return this.#m_height;
	}

	isNull(): boolean {
		return this.#m_width <= 0 || this.#m_height <= 0;
	}

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