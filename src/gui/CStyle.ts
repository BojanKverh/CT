/** @module GUI/CStyle */
import type { CStyleOptionCategoryButton } from "./CStyleOptionCategoryButton.js";
import type { CStyleOptionToggleSwitch } from "./CStyleOptionToggleSwitch.js";
import type { CStyleOptionTagEdit } from "./CStyleOptionTagEdit.js";
import type { CStyleOptionBusyIndicator } from "./CStyleOptionBusyIndicator.js";
import type { CStyleOptionRatingWidget } from "./CStyleOptionRatingWidget.js";
import type { CStyleOptionNavigationPath } from "./CStyleOptionNavigationPath.js";
import type { CStyleOptionSplitButton } from "./CStyleOptionSplitButton.js";
import { CStyleState } from "./CStyleOption.js";
import { CPaletteColorRole } from "./CPalette.js";
import { CRect } from "../geometry/CRect.js";
import { CSize } from "../geometry/CSize.js";
import { CFontMetrics } from "./CFontMetrics.js";
import { CIconMode, CIconState } from "./CIcon.js";
import type { CPainter } from "../painting/CPainter.js";
import type { CStyleOptionToolButton } from "./CStyleOptionToolButton.js";
import { CStyleOptionPushButton } from "./CStyleOptionPushButton.js";
import type { CStyleOptionCheckBox } from "./CStyleOptionCheckBox.js";
import type { CStyleOptionRadioButton } from "./CStyleOptionRadioButton.js";
import type { CStyleOptionComboBox } from "./CStyleOptionComboBox.js";
import type { CStyleOptionLineEdit } from "../gui/CStyleOptionLineEdit.js";
import type { CStyleOptionSlider } from "./CStyleOptionSlider.js";
import type { CStyleOptionScrollBar } from "./CStyleOptionScrollBar.js"
import type { CStyleOptionProgressBar } from "./CStyleOptionProgressBar.js";
import type { CStyleOptionToolBar } from "./CStyleOptionToolBar.js";
import type { CStyleOptionSizeGrip } from "./CStyleOptionSizeGrip.js";
import type { CStyleOptionFrame } from "./CStyleOptionFrame.js";
import type { CStyleOptionGroupBox } from "./CStyleOptionGroupBox.js";
import type { CStyleOptionToolBoxButton } from "./CStyleOptionToolBoxButton.js";
import type { CStyleOptionSplitterHandle } from "./CStyleOptionSplitterHandle.js";
import type { CStyleOptionKeySequenceEdit } from "./CStyleOptionKeySequenceEdit.js";
import type { CStyleOptionTabWidget } from "./CStyleOptionTabWidget.js";
import type { CStyleOptionLabel } from "./CStyleOptionLabel.js";
import type { CStyleOptionToolTipWidget } from "../gui/CStyleOptionToolTipWidget.js";

/**
 * Defines the abstract interface used to render Canvas Toolkit widgets.
 */
export abstract class CStyle {
    /** Connected segments share a border and retain one keyboard focus indicator. */
    drawCategoryButton(painter: CPainter, option: CStyleOptionCategoryButton): void {
        if (option.rect.width() <= 0 || option.rect.height() <= 0) return;
        const groupEnabled = (option.state & CStyleState.Enabled) !== 0;
        painter.save();
        try {
            painter.clipRect(option.rect); painter.setLineWidth(1);
            for (let index = 0; index < option.segments.length; ++index) {
                const item = option.segments[index]!, r = item.rect;
                if (r.width() < 3 || r.height() < 3) continue;
                const enabled = groupEnabled && item.enabled, selected = index === option.currentIndex;
                const background = enabled && selected ? CPaletteColorRole.Highlight
                    : enabled && (index === option.hoveredIndex || index === option.pressedIndex)
                        ? CPaletteColorRole.Hover : CPaletteColorRole.Button;
                const foreground = !enabled ? CPaletteColorRole.DisabledText
                    : selected ? CPaletteColorRole.HighlightedText : CPaletteColorRole.ButtonText;
                const color = (role: CPaletteColorRole): string => option.palette.color(role).toCss();
                painter.save();
                try {
                    painter.clipRect(r); painter.setBrush(color(background)); painter.setPen(color(CPaletteColorRole.Mid));
                    const radius = Math.min(4, (r.width() - 2) / 2, (r.height() - 2) / 2);
                    const first = index === 0, last = index === option.segments.length - 1;
                    // Extend inner sides by a pixel so adjacent segments share their edge.
                    painter.drawRoundedRect(r.x() - (first ? 0 : 1), r.y(), r.width() + (first ? 0 : 1) + (last ? 0 : 1), r.height(),
                        [first ? radius : 0, last ? radius : 0, last ? radius : 0, first ? radius : 0]);
                    if (!last) painter.drawLine(r.x() + r.width() - 0.5, r.y() + 1, r.x() + r.width() - 0.5, r.y() + r.height() - 1);
                    const hasIcon = item.icon !== null && !item.icon.isNull();
                    const fm = new CFontMetrics(option.font), textWidth = fm.textWidth(item.text);
                    const iconSize = Math.max(0, Math.min(16, r.height() - 8, r.width() - 16));
                    const gap = hasIcon && item.text ? 6 : 0;
                    let x = r.x() + Math.max(8, (r.width() - textWidth - (hasIcon ? iconSize + gap : 0)) / 2);
                    const y = r.y() + r.height() / 2;
                    if (hasIcon && iconSize > 0) {
                        const pixmap = item.icon!.pixmap(new CSize(iconSize, iconSize), !enabled ? CIconMode.Disabled
                            : selected ? CIconMode.Selected : CIconMode.Normal, selected ? CIconState.On : CIconState.Off);
                        if (pixmap !== null && pixmap.width() > 0 && pixmap.height() > 0) {
                            const scale = Math.min(iconSize / pixmap.width(), iconSize / pixmap.height());
                            const width = pixmap.width() * scale, height = pixmap.height() * scale;
                            painter.drawPixmap(pixmap, x + (iconSize - width) / 2, y - height / 2, width, height);
                        }
                        x += iconSize + gap;
                    }
                    painter.setFont(option.font); painter.setPen(color(foreground));
                    painter.setTextAlign("left"); painter.setTextBaseline("middle");
                    painter.drawText(item.text, x, y);
                    if (enabled && selected && (option.state & CStyleState.HasFocus) !== 0 && r.width() >= 8 && r.height() >= 8) {
                        painter.setBrush(color(foreground));
                        for (let dx = 4; dx < r.width() - 4; dx += 2) {
                            painter.fillRect(new CRect(r.x() + dx, r.y() + 3, 1, 1));
                            painter.fillRect(new CRect(r.x() + dx, r.y() + r.height() - 4, 1, 1));
                        }
                        for (let dy = 5; dy < r.height() - 5; dy += 2) {
                            painter.fillRect(new CRect(r.x() + 3, r.y() + dy, 1, 1));
                            painter.fillRect(new CRect(r.x() + r.width() - 4, r.y() + dy, 1, 1));
                        }
                    }
                } finally { painter.restore(); }
            }
        } finally { painter.restore(); }
    }

    /** Palette-aware track and animated thumb; no changes required in derived styles. */
    drawToggleSwitch(painter: CPainter, option: CStyleOptionToggleSwitch): void {
        const r = option.rect;
        if (r.width() <= 0 || r.height() <= 0) return;
        const enabled = (option.state & CStyleState.Enabled) !== 0;
        const checked = (option.state & CStyleState.On) !== 0;
        const color = (role: CPaletteColorRole): string => option.palette.color(role).toCss();
        const scale = Math.max(0, Math.min(1, (r.width() - 8) / 44, (r.height() - 8) / 24));
        const w = 44 * scale, h = 24 * scale, x = r.x() + 4, y = r.y() + (r.height() - h) / 2;
        painter.save();
        try {
            painter.clipRect(r); painter.setLineWidth(1);
            if (w >= 4 && h >= 4) {
                const track = !enabled ? CPaletteColorRole.Mid : checked ? CPaletteColorRole.Highlight
                    : (option.state & CStyleState.MouseOver) !== 0 ? CPaletteColorRole.Hover : CPaletteColorRole.Button;
                painter.setBrush(color(track)); painter.setPen(color(enabled ? CPaletteColorRole.Mid : CPaletteColorRole.DisabledText));
                painter.drawRoundedRect(x, y, w, h, Math.max(0, h / 2 - 1));
                const inset = 3 * scale, diameter = h - 2 * inset;
                const position = Math.max(0, Math.min(1, option.position));
                painter.setBrush(color(!enabled ? CPaletteColorRole.DisabledText : checked
                    ? CPaletteColorRole.HighlightedText : CPaletteColorRole.ButtonText));
                // CPainter follows Canvas ellipse semantics: center coordinates and radii.
                const radius = diameter / 2;
                painter.fillEllipse(x + inset + radius + (w - diameter - 2 * inset) * position,
                    y + h / 2 + ((option.state & CStyleState.Sunken) !== 0 ? scale : 0), radius, radius);
            }
            if (option.text && r.width() > 62) {
                painter.setFont(option.font); painter.setPen(color(enabled ? CPaletteColorRole.Text : CPaletteColorRole.DisabledText));
                painter.setTextAlign("left"); painter.setTextBaseline("middle");
                painter.drawText(option.text, r.x() + 62, r.y() + r.height() / 2);
            }
            if (enabled && (option.state & CStyleState.HasFocus) !== 0 && r.width() >= 6 && r.height() >= 6) {
                painter.setBrush(color(CPaletteColorRole.Text));
                for (let dx = 2; dx < r.width() - 2; dx += 2) {
                    painter.fillRect(new CRect(r.x() + dx, r.y() + 2, 1, 1));
                    painter.fillRect(new CRect(r.x() + dx, r.y() + r.height() - 3, 1, 1));
                }
                for (let dy = 4; dy < r.height() - 4; dy += 2) {
                    painter.fillRect(new CRect(r.x() + 2, r.y() + dy, 1, 1));
                    painter.fillRect(new CRect(r.x() + r.width() - 3, r.y() + dy, 1, 1));
                }
            }
        } finally { painter.restore(); }
    }

    /** Draws a tag and its optional trailing remove button. */
    drawTag(painter: CPainter, option: CStyleOptionTagEdit): void {
        const r = option.rect;
        if (r.width() <= 0 || r.height() <= 0) return;
        const enabled = (option.state & CStyleState.Enabled) !== 0;
        const removeWidth = option.readOnly ? 0 : Math.min(24, r.width());
        painter.save();
        try {
            painter.clipRect(r);
            painter.setBrush(option.palette.color(CPaletteColorRole.Button).toCss());
            painter.setPen(option.palette.color(CPaletteColorRole.Mid).toCss());
            painter.drawRoundedRect(r.x() + 0.5, r.y() + 0.5, Math.max(0, r.width() - 1), Math.max(0, r.height() - 1), 5);
            const textRole = enabled ? CPaletteColorRole.ButtonText : CPaletteColorRole.DisabledText;
            painter.setFont(option.font); painter.setTextAlign("left"); painter.setTextBaseline("middle");
            painter.setPen(option.palette.color(textRole).toCss());
            painter.save();
            try {
                painter.clipRect(new CRect(r.x() + 8, r.y(), Math.max(0, r.width() - removeWidth - 12), r.height()));
                painter.drawText(option.text, r.x() + 8, r.y() + r.height() / 2);
            } finally { painter.restore(); }
            if (!option.readOnly) {
                const x = r.right() - removeWidth;
                if (enabled && (option.removeHovered || option.removePressed)) {
                    painter.setBrush(option.palette.color(option.removePressed ? CPaletteColorRole.Highlight : CPaletteColorRole.Hover).toCss());
                    painter.fillRect(new CRect(x + 1, r.y() + 2, Math.max(0, removeWidth - 3), Math.max(0, r.height() - 4)));
                }
                painter.setPen(option.palette.color(enabled && option.removePressed ? CPaletteColorRole.HighlightedText : textRole).toCss());
                painter.setLineWidth(1);
                const cx = x + removeWidth / 2, cy = r.y() + r.height() / 2;
                const d = Math.max(0, Math.min(3, (removeWidth - 6) / 2, (r.height() - 6) / 2));
                if (d > 0) {
                    painter.drawLine(cx - d, cy - d, cx + d, cy + d);
                    painter.drawLine(cx + d, cy - d, cx - d, cy + d);
                }
            }
        } finally { painter.restore(); }
    }

    /** Twelve fading spokes, centered in the available rectangle. */
    drawBusyIndicator(painter: CPainter, option: CStyleOptionBusyIndicator): void {
        if (!option.running || option.rect.width() <= 0 || option.rect.height() <= 0) return;
        const r = option.rect, radius = Math.min(r.width(), r.height()) / 2 - 2;
        if (radius <= 0) return;
        const cx = r.x() + r.width() / 2, cy = r.y() + r.height() / 2;
        const enabled = (option.state & CStyleState.Enabled) !== 0;
        painter.save();
        try {
            painter.clipRect(r); painter.setLineWidth(Math.max(1, radius * 0.18));
            for (let i = 0; i < 12; ++i) {
                const angle = (option.angle + i * 30 - 90) * Math.PI / 180;
                const color = option.palette.color(enabled ? CPaletteColorRole.Highlight : CPaletteColorRole.DisabledText);
                color.setAlpha(Math.round(color.alpha() * (0.2 + 0.8 * i / 11)));
                painter.setPen(color.toCss());
                painter.drawLine(cx + Math.cos(angle) * radius * 0.48, cy + Math.sin(angle) * radius * 0.48,
                    cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
            }
        } finally { painter.restore(); }
    }

    /** Draws geometric stars using palette colors, independently of installed fonts. */
    drawRatingWidget(painter: CPainter, option: CStyleOptionRatingWidget): void {
        if (option.rect.width() <= 0 || option.rect.height() <= 0) return;
        const enabled = (option.state & CStyleState.Enabled) !== 0;
        painter.save();
        try {
            painter.clipRect(option.rect);
            painter.setLineWidth(1);
            for (let star = 0; star < option.starRects.length; ++star) {
                const r = option.starRects[star]!, radius = Math.min(r.width(), r.height()) / 2 - 1;
                if (radius <= 0) continue;
                const cx = r.x() + r.width() / 2, cy = r.y() + r.height() / 2;
                const points = Array.from({ length: 10 }, (_, i) => {
                    const angle = -Math.PI / 2 + i * Math.PI / 5, length = radius * (i % 2 === 0 ? 1 : 0.45);
                    return { x: cx + Math.cos(angle) * length, y: cy + Math.sin(angle) * length };
                });
                const filled = star < option.previewValue;
                const color = option.palette.color(!enabled ? CPaletteColorRole.DisabledText
                    : filled ? CPaletteColorRole.Highlight : CPaletteColorRole.Mid).toCss();
                painter.setBrush(filled ? color : option.palette.color(CPaletteColorRole.Base).toCss());
                // Fill the concave polygon by intersecting each horizontal scan line.
                // CPainter's rectangle and line primitives keep this engine-independent.
                for (let y = Math.floor(cy - radius); y < Math.ceil(cy + radius); ++y) {
                    const scan = y + 0.5, crossings: number[] = [];
                    for (let i = 0; i < points.length; ++i) {
                        const a = points[i]!, b = points[(i + 1) % points.length]!;
                        if ((a.y <= scan && b.y > scan) || (b.y <= scan && a.y > scan))
                            crossings.push(a.x + (scan - a.y) * (b.x - a.x) / (b.y - a.y));
                    }
                    crossings.sort((a, b) => a - b);
                    for (let i = 0; i + 1 < crossings.length; i += 2)
                        painter.fillRect(new CRect(crossings[i]!, y, crossings[i + 1]! - crossings[i]!, 1));
                }
                painter.setPen(color);
                for (let i = 0; i < points.length; ++i) {
                    const a = points[i]!, b = points[(i + 1) % points.length]!;
                    painter.drawLine(a.x, a.y, b.x, b.y);
                }
            }
            if (enabled && !option.readOnly && (option.state & CStyleState.HasFocus) !== 0
                && option.rect.width() > 4 && option.rect.height() > 4) {
                const r = option.rect;
                painter.setBrush(option.palette.color(CPaletteColorRole.Text).toCss());
                for (let x = r.x() + 1; x < r.right() - 1; x += 2) {
                    painter.fillRect(new CRect(x, r.y() + 1, 1, 1));
                    painter.fillRect(new CRect(x, r.bottom() - 2, 1, 1));
                }
                for (let y = r.y() + 3; y < r.bottom() - 2; y += 2) {
                    painter.fillRect(new CRect(r.x() + 1, y, 1, 1));
                    painter.fillRect(new CRect(r.right() - 2, y, 1, 1));
                }
            }
        } finally { painter.restore(); }
    }

    /** Default palette-aware renderer; custom styles can override this method. */
    drawNavigationPath(painter: CPainter, option: CStyleOptionNavigationPath): void {
        if (option.rect.width() <= 0 || option.rect.height() <= 0) return;
        const enabled = (option.state & CStyleState.Enabled) !== 0;
        painter.save();
        try {
            painter.clipRect(option.rect);
            painter.setBrush(option.palette.color(CPaletteColorRole.Window).toCss());
            painter.fillRect(option.rect);
            painter.setFont(option.font); painter.setTextAlign("left"); painter.setTextBaseline("middle");
            for (let i = 0; i < option.segments.length; ++i) {
                const segment = option.segments[i]!, r = segment.rect;
                if (r.width() <= 0 || r.height() <= 0) continue;
                const interactive = segment.index !== option.currentIndex;
                const down = enabled && interactive && segment.index === option.pressedIndex;
                const hovered = enabled && interactive && segment.index === option.hoveredIndex;
                const role = !enabled ? CPaletteColorRole.DisabledText
                    : down ? CPaletteColorRole.HighlightedText
                    : interactive ? CPaletteColorRole.Link : CPaletteColorRole.Text;
                if (down || hovered) {
                    painter.setBrush(option.palette.color(down ? CPaletteColorRole.Highlight : CPaletteColorRole.Hover).toCss());
                    painter.fillRect(r);
                }
                painter.save();
                try {
                    painter.clipRect(r);
                    painter.setPen(option.palette.color(role).toCss());
                    painter.drawText(segment.text, r.x() + 8, r.y() + r.height() / 2);
                    if (enabled && interactive && (option.state & CStyleState.HasFocus) !== 0
                        && option.focusedIndex === segment.index && r.width() > 6 && r.height() > 6) {
                        painter.setBrush(option.palette.color(role).toCss());
                        for (let x = r.x() + 3; x < r.right() - 3; x += 2) {
                            painter.fillRect(new CRect(x, r.y() + 3, 1, 1));
                            painter.fillRect(new CRect(x, r.bottom() - 4, 1, 1));
                        }
                        for (let y = r.y() + 5; y < r.bottom() - 4; y += 2) {
                            painter.fillRect(new CRect(r.x() + 3, y, 1, 1));
                            painter.fillRect(new CRect(r.right() - 4, y, 1, 1));
                        }
                    }
                } finally { painter.restore(); }
                if (i > 0) {
                    const previous = option.segments[i - 1]!.rect;
                    const cx = (previous.right() + r.x()) / 2, cy = r.y() + r.height() / 2;
                    const d = Math.min(3, Math.max(0, (r.x() - previous.right()) / 2 - 1), r.height() / 4);
                    painter.setPen(option.palette.color(enabled ? CPaletteColorRole.Mid : CPaletteColorRole.DisabledText).toCss());
                    painter.setLineWidth(1);
                    if (d > 0) {
                        painter.drawLine(cx - d / 2, cy - d, cx + d / 2, cy);
                        painter.drawLine(cx + d / 2, cy, cx - d / 2, cy + d);
                    }
                }
            }
        } finally { painter.restore(); }
    }

    /** Draws both parts using the style's push button renderer and palette. */
    drawSplitButton(painter: CPainter, option: CStyleOptionSplitButton): void {
        const r = option.rect;
        if (r.width() <= 0 || r.height() <= 0) return;
        const menuWidth = Math.min(r.width(), Math.max(0, option.menuWidth));
        const mainWidth = r.width() - menuWidth;
        const enabled = (option.state & CStyleState.Enabled) !== 0;
        const paintPart = (clip: CRect, down: boolean, hovered: boolean): void => {
            if (clip.width() <= 0) return;
            const part = new CStyleOptionPushButton(option);
            part.text = "";
            part.state &= ~(CStyleState.Sunken | CStyleState.MouseOver | CStyleState.HasFocus);
            if (down) part.state |= CStyleState.Sunken;
            if (hovered) part.state |= CStyleState.MouseOver;
            painter.save();
            try { painter.clipRect(clip); this.drawPushButton(painter, part); }
            finally { painter.restore(); }
        };
        paintPart(new CRect(r.x(), r.y(), mainWidth, r.height()), option.mainDown, option.mainHovered);
        paintPart(new CRect(r.x() + mainWidth, r.y(), menuWidth, r.height()), option.menuDown, option.menuHovered);
        const role = !enabled ? CPaletteColorRole.DisabledText
            : option.mainDown ? CPaletteColorRole.HighlightedText : CPaletteColorRole.ButtonText;
        painter.save();
        try {
            painter.clipRect(r);
            painter.setFont(option.font);
            painter.setTextAlign("center");
            painter.setTextBaseline("middle");
            painter.setPen(option.palette.color(role).toCss());
            if (mainWidth > 0) {
                painter.save();
                try {
                    painter.clipRect(new CRect(r.x(), r.y(), mainWidth, r.height()));
                    const pixmap = option.icon?.pixmap(new CSize(16, 16), enabled ? CIconMode.Normal : CIconMode.Disabled,
                        (option.state & CStyleState.On) !== 0 ? CIconState.On : CIconState.Off) ?? null;
                    let textX = r.x() + mainWidth / 2;
                    if (pixmap !== null && mainWidth > 24 && r.height() > 8) {
                        const side = Math.min(16, r.height() - 8);
                        const textWidth = new CFontMetrics(option.font).textWidth(option.text);
                        const left = r.x() + Math.max(4, (mainWidth - textWidth - side - 6) / 2);
                        painter.drawPixmap(pixmap, left, r.y() + (r.height() - side) / 2, side, side);
                        textX = left + side + 6 + textWidth / 2;
                    }
                    painter.drawText(option.text, textX, r.y() + r.height() / 2);
                } finally { painter.restore(); }
            }
            if (menuWidth > 0) {
                const x = r.x() + mainWidth;
                painter.setPen(option.palette.color(CPaletteColorRole.Mid).toCss());
                painter.setLineWidth(1);
                if (r.height() > 8) painter.drawLine(x, r.y() + 4, x, r.y() + r.height() - 4);
                const arrowRole = !enabled ? CPaletteColorRole.DisabledText
                    : option.menuDown ? CPaletteColorRole.HighlightedText : CPaletteColorRole.ButtonText;
                painter.setPen(option.palette.color(arrowRole).toCss());
                const cx = x + menuWidth / 2, cy = r.y() + r.height() / 2;
                const d = Math.min(3, Math.max(0, (menuWidth - 4) / 2), Math.max(0, (r.height() - 4) / 2));
                if (d > 0) {
                    painter.drawLine(cx - d, cy - d / 2, cx, cy + d / 2);
                    painter.drawLine(cx, cy + d / 2, cx + d, cy - d / 2);
                }
            }
            if (enabled && (option.state & CStyleState.HasFocus) !== 0 && r.width() > 8 && r.height() > 8) {
                painter.setBrush(option.palette.color(CPaletteColorRole.ButtonText).toCss());
                for (let x = r.x() + 4; x < r.right() - 4; x += 2) {
                    painter.fillRect(new CRect(x, r.y() + 4, 1, 1));
                    painter.fillRect(new CRect(x, r.bottom() - 5, 1, 1));
                }
                for (let y = r.y() + 6; y < r.bottom() - 5; y += 2) {
                    painter.fillRect(new CRect(r.x() + 4, y, 1, 1));
                    painter.fillRect(new CRect(r.right() - 5, y, 1, 1));
                }
            }
        } finally { painter.restore(); }
    }

    /**
    * Returns the slider handle size used by the style.
    *
    */
    abstract sliderHandleSize(): number;
    /**
    * Returns the tool tip horizontal padding used by the style.
    *
    */
    abstract toolTipHorizontalPadding(): number;
    /**
    * Returns the tool tip vertical padding used by the style.
    *
    */
    abstract toolTipVerticalPadding(): number;
    /**
    * Returns the combo box arrow width used by the style.
    *
    */
    abstract comboBoxArrowWidth(): number;
    /**
    * Returns the splitter handle width used by the style.
    *
    */
    abstract splitterHandleWidth(): number;

    /**
    * Draws the label using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawLabel(painter: CPainter, option: CStyleOptionLabel): void;
    /**
    * Draws the push button using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawPushButton(painter: CPainter, option: CStyleOptionPushButton): void;
    /**
    * Draws the tool button using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawToolButton(painter: CPainter, option: CStyleOptionToolButton): void;
    /**
    * Draws the check box using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawCheckBox(painter: CPainter, option: CStyleOptionCheckBox): void;
    /**
    * Draws the line edit using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawLineEdit(painter: CPainter, option: CStyleOptionLineEdit): void;
    /**
    * Draws the slider using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawSlider(painter: CPainter, option: CStyleOptionSlider): void;
    /**
    * Draws the dial using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawDial(painter: CPainter, option: CStyleOptionSlider): void;
    /**
    * Draws the progress bar using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawProgressBar(painter: CPainter, option: CStyleOptionProgressBar): void;
    /**
    * Draws the group box using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawGroupBox(painter: CPainter, option: CStyleOptionGroupBox): void;
    /**
    * Draws the scroll bar using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawScrollBar(painter: CPainter, option: CStyleOptionScrollBar): void;
    /**
    * Draws the radio button using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawRadioButton(painter: CPainter, option: CStyleOptionRadioButton): void
    /**
    * Draws the tab widget using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawTabWidget(painter: CPainter, option: CStyleOptionTabWidget): void
    /**
    * Draws the tool tip using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawToolTip(painter: CPainter, option: CStyleOptionToolTipWidget): void;
    /**
    * Draws the frame using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawFrame(painter: CPainter, option: CStyleOptionFrame): void;
    /**
    * Draws the combo box using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawComboBox(painter: CPainter, option: CStyleOptionComboBox): void;
    /**
    * Draws the tool bar using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawToolBar(painter: CPainter, option: CStyleOptionToolBar): void;
    /**
    * Draws the splitter handle using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawSplitterHandle(painter: CPainter, option: CStyleOptionSplitterHandle): void;
    /**
    * Draws the size grip using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawSizeGrip(painter: CPainter, option: CStyleOptionSizeGrip): void;
    /**
    * Draws the tool box button using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawToolBoxButton(painter: CPainter, option: CStyleOptionToolBoxButton): void;
    /**
    * Draws the key sequence edit using the supplied painter and style option.
    *
    * @param painter Painter.
    * @param option Option.
    */
    abstract drawKeySequenceEdit(painter: CPainter, option: CStyleOptionKeySequenceEdit): void;
}