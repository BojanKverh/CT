import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CIconMode, CIconState, type CIcon } from "../gui/CIcon.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CWidget } from "./CWidget.js";

export enum CListViewMode { ListMode, IconMode }

/** Internal shared geometry and caption painting for the two list implementations. */
export class CListViewHelper {
    mode = CListViewMode.ListMode;
    #gridSize = new CSize(112, 112);
    #iconSize = new CSize(48, 48);
    #spacing = 8;
    constructor(readonly itemHeight: number) {}
    /**
     * Reads the grid size of the list view helper.
     * @returns A new `CSize`.
     */
    gridSize(): CSize { return new CSize(this.#gridSize.width(), this.#gridSize.height()); }
    /**
     * Reads the icon size of the list view helper.
     * @returns A new `CSize`.
     */
    iconSize(): CSize { return new CSize(this.#iconSize.width(), this.#iconSize.height()); }
    /**
     * Reads the spacing.
     * @returns The spacing.
     */
    spacing(): number { return this.#spacing; }
    /**
     * Changes the preferred size of an icon grid cell for valid dimensions.
     * @param size Requested cell width and height in logical pixels.
     */
    setGridSize(size: CSize): void {
        if (this.#validSize(size)) this.#gridSize = new CSize(Math.floor(size.width()), Math.floor(size.height()));
    }
    /**
     * Changes the preferred icon dimensions for valid sizes.
     * @param size Requested icon width and height in logical pixels.
     */
    setIconSize(size: CSize): void {
        if (this.#validSize(size)) this.#iconSize = new CSize(Math.floor(size.width()), Math.floor(size.height()));
    }
    /**
     * Sets the spacing. The implementation checks whether `spacing` is finite.
     * @param spacing Spacing.
     */
    setSpacing(spacing: number): void {
        if (Number.isFinite(spacing) && spacing >= 0) this.#spacing = Math.floor(spacing);
    }
    #validSize(size: CSize): boolean {
        return Number.isFinite(size.width()) && Number.isFinite(size.height()) && size.width() >= 1 && size.height() >= 1;
    }
    /**
     * Computes the number of icon cells that fit across the available width, including spacing.
     * @param width Available content width in logical pixels.
     * @returns Column count, with a minimum of one.
     */
    columns(width: number): number { return Math.max(1, Math.floor((width + this.#spacing) / (this.#gridSize.width() + this.#spacing))); }
    /**
     * Computes the item rectangle in the current list or icon layout.
     * @param row Zero-based item row.
     * @param width Available content width in logical pixels.
     * @returns Item rectangle in content coordinates.
     */
    rect(row: number, width: number): CRect {
        if (this.mode === CListViewMode.ListMode) return new CRect(0, row * this.itemHeight, width, this.itemHeight);
        const columns = this.columns(width);
        return new CRect((row % columns) * (this.#gridSize.width() + this.#spacing),
            Math.floor(row / columns) * (this.#gridSize.height() + this.#spacing), this.#gridSize.width(), this.#gridSize.height());
    }
    /**
     * Returns the item index range intersecting the vertical viewport.
     * @param count Number of items.
     * @param width Width.
     * @param top Top.
     * @param height Height.
     * @returns The visible range.
     */
    visibleRange(count: number, width: number, top: number, height: number): [number, number] {
        if (height <= 0) return [0, 0];
        const iconMode = this.mode === CListViewMode.IconMode;
        const columns = iconMode ? this.columns(width) : 1;
        const gap = iconMode ? this.#spacing : 0;
        const step = iconMode ? this.#gridSize.height() + gap : this.itemHeight;

        // When the viewport starts in a gap, skip the row immediately above it.
        const first = Math.floor((top + gap) / step) * columns;
        const end = Math.ceil((top + height) / step) * columns;
        return [Math.min(count, first), Math.min(count, end)];
    }

    /**
     * Hit-tests the list or icon layout, rejecting positions outside content or in grid gaps.
     * @param x Horizontal coordinate in list content.
     * @param y Vertical coordinate in list content.
     * @param width Available content width in logical pixels.
     * @param count Total number of items.
     * @returns Zero-based hit row, or `-1` if no item is hit.
     */
    rowAt(x: number, y: number, width: number, count: number): number {
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= width) return -1;
        if (this.mode === CListViewMode.ListMode) {
            const row = Math.floor(y / this.itemHeight); return row < count ? row : -1;
        }
        const stepX = this.#gridSize.width() + this.#spacing, stepY = this.#gridSize.height() + this.#spacing;
        const column = Math.floor(x / stepX), line = Math.floor(y / stepY);
        if (column >= this.columns(width) || x % stepX >= this.#gridSize.width() || y % stepY >= this.#gridSize.height()) return -1;
        const row = line * this.columns(width) + column;
        return row < count ? row : -1;
    }
    /**
     * Computes the height needed for all items, including gaps between icon rows.
     * @param count Total number of items.
     * @param width Available content width in logical pixels.
     * @returns Total item layout height in logical pixels.
     */
    height(count: number, width: number): number {
        if (this.mode === CListViewMode.ListMode) return count * this.itemHeight;
        const rows = Math.ceil(count / this.columns(width));
        return rows === 0 ? 0 : rows * (this.#gridSize.height() + this.#spacing) - this.#spacing;
    }
    /**
     * Start from the full viewport so obsolete scrollbars never lock in fewer columns.
     * @param count Number of items.
     * @param fullWidth Full width.
     * @param fullHeight Full height.
     * @param extent Extent.
     * @returns A new `CSize`.
     */
    contentSize(count: number, fullWidth: number, fullHeight: number, extent: number): CSize {
        let vertical = false, horizontal = false;
        for (let i = 0; i < 3; ++i) {
            const width = Math.max(0, fullWidth - (vertical ? extent : 0));
            const height = Math.max(0, fullHeight - (horizontal ? extent : 0));
            horizontal ||= count > 0 && this.#gridSize.width() > width;
            vertical ||= this.height(count, width) > height;
        }
        const width = Math.max(0, fullWidth - (vertical ? extent : 0));
        return new CSize(Math.max(width, count > 0 ? this.#gridSize.width() : 0), this.height(count, width));
    }
    /**
     * Resolves keyboard navigation for the current list or icon grid.
     * @param row Current zero-based item row.
     * @param key Keyboard key name to handle.
     * @param count Total number of items.
     * @param width Available content width in logical pixels.
     * @param viewportHeight Visible content height in logical pixels, used for page navigation.
     * @returns Destination row, the original row at a navigation boundary, or `null` for an unsupported key.
     */
    navigate(row: number, key: string, count: number, width: number, viewportHeight: number): number | null {
        const columns = this.columns(width);
        if (key === "Home") return 0;
        if (key === "End") return count - 1;
        const page = Math.max(1, Math.floor((viewportHeight + this.#spacing) / (this.#gridSize.height() + this.#spacing))) * columns;
        if (key === "PageUp") return Math.max(0, row - page);
        if (key === "PageDown") return Math.min(count - 1, row + page);
        if (key === "ArrowLeft") return row % columns === 0 ? row : row - 1;
        if (key === "ArrowRight") return row % columns === columns - 1 || row + 1 >= count ? row : row + 1;
        if (key === "ArrowUp") return row - columns >= 0 ? row - columns : row;
        if (key === "ArrowDown") return row + columns < count ? row + columns : row;
        return null;
    }
    /**
     * Draws an optional icon and centered caption within the supplied item bounds. The caption uses up to two lines.
     * @param painter Painter in owner content coordinates.
     * @param owner Widget supplying palette and font metrics.
     * @param rect Item rectangle available for the icon and caption.
     * @param text Caption text to draw below the icon area.
     * @param icon Optional icon, or `null` to omit the image.
     * @param enabled Whether to use enabled styling. Defaults to `true`.
     */
    paintContents(painter: CPainter, owner: CWidget, rect: CRect, text: string, icon: CIcon | null, enabled = true): void {
        const padding = 6, lineHeight = owner.fontMetrics().height();
        const captionHeight = Math.min(2 * lineHeight, Math.max(0, rect.height() - 2 * padding));
        const iconHeight = Math.max(0, Math.min(this.#iconSize.height(), rect.height() - captionHeight - 3 * padding));
        const iconWidth = Math.max(0, Math.min(this.#iconSize.width(), rect.width() - 2 * padding));
        painter.save(); painter.clipRect(rect);
        if (icon && iconWidth > 0 && iconHeight > 0) {
            const pixmap = icon.pixmap(new CSize(iconWidth, iconHeight), enabled ? CIconMode.Normal : CIconMode.Disabled, CIconState.Off);
            if (pixmap && pixmap.width() > 0 && pixmap.height() > 0) {
                const scale = Math.min(iconWidth / pixmap.width(), iconHeight / pixmap.height(), 1);
                const w = pixmap.width() * scale, h = pixmap.height() * scale;
                painter.drawPixmap(pixmap, rect.x() + (rect.width() - w) / 2, rect.y() + padding + (iconHeight - h) / 2, w, h);
            }
        }
        const maxWidth = Math.max(0, rect.width() - 2 * padding);
        const lines: string[] = [];
        let rest = text.replace(/\s+/gu, " ").trim();
        for (let line = 0; line < 2 && rest.length > 0; ++line) {
            let end = 0;
            for (const character of rest) {
                const next = end + character.length;
                if (owner.fontMetrics().textWidth(rest.slice(0, next)) > maxWidth) break;
                end = next;
            }
            if (end === rest.length) { lines.push(rest); break; }
            if (line === 1) {
                let caption = rest.slice(0, end);
                while (caption && owner.fontMetrics().textWidth(caption + "…") > maxWidth) caption = Array.from(caption).slice(0, -1).join("");
                lines.push(owner.fontMetrics().textWidth(caption + "…") <= maxWidth ? caption + "…" : "");
            } else {
                const space = rest.slice(0, end).lastIndexOf(" ");
                if (space > 0) end = space;
                if (end === 0) { lines.push(""); break; }
                lines.push(rest.slice(0, end)); rest = rest.slice(end).trimStart();
            }
        }
        painter.setTextAlign("center"); painter.setTextBaseline("top");
        for (let i = 0; i < lines.length; ++i) painter.drawText(lines[i]!, rect.x() + rect.width() / 2,
            rect.y() + padding + iconHeight + padding + i * lineHeight);
        painter.restore();
    }
}
