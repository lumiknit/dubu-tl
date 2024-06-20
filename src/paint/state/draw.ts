/**
 * @module draw
 * @description Draw helpers for PaintState
 */

import {
	EMPTY_BOUNDARY,
	Pos,
	RGBA,
	boundaryToRect,
	emptyCanvasContext,
	extendBoundaryByPixel,
	extendBoundaryByRect,
} from "@/common";

import {
	drawLineWithCallbacksV2,
	ellipsePolygon,
	polygonToPath2D,
} from "../polygon";

import {
	PaintState,
	clearTempLayer,
	contextUseToolStyle,
	getBrush,
	getFocusedLayerCtx,
	getTempLayerCtx,
	useColorRGBA,
} from ".";
import { ERASER_TYPE_TOOLS, ToolType, drawLayerToCanvas } from "..";

export type DrawState = {
	/** Step */
	step: (z: PaintState, force?: boolean) => void;

	/** Start position */
	start: Pos;

	/** Last position */
	last: Pos;

	/** Brush Color */
	color: RGBA;

	/** Brush Color when draw started */
	initColor: RGBA;

	/** Tool Type */
	tool: ToolType;
};

/**
 * Clear the temporary area, and reset temp BD.
 */
const clearTempArea = (z: PaintState) => {
	const bd = z.tempBd;
	clearTempLayer(z, boundaryToRect(bd));
	z.tempBd = { ...EMPTY_BOUNDARY };
};

const drawBrushLine = (
	z: PaintState,
	ctx: CanvasRenderingContext2D,
	sx: number,
	sy: number,
	ex: number,
	ey: number,
) => {
	const brush = getBrush(z);

	drawLineWithCallbacksV2(
		sx,
		sy,
		ex,
		ey,
		brush.size,
		brush.round ? "round" : "square",
		(x, y, w, h) => {
			ctx.fillRect(x, y, w, h);
			extendBoundaryByRect(z.tempBd, { x, y, w, h });
		},
	);
};

/**
 * Draw a middle of freedraw lines.
 */
const drawFree = (z: PaintState, x: number, y: number, force?: boolean) => {
	const ds = z.drawState()!;
	const ctx = getTempLayerCtx(z);

	const lastX = Math.floor(ds.last.x),
		lastY = Math.floor(ds.last.y);

	const dx = x - lastX - 0.5;
	const dy = y - lastY - 0.5;

	if (!force && dx * dx + dy * dy < 1.4) return;

	ds.last = { x, y };

	ctx.save();
	contextUseToolStyle(z, ctx);
	drawBrushLine(z, ctx, lastX, lastY, x, y);
	ctx.restore();
};

const drawRect = (
	z: PaintState,
	pos: Pos,
	fill?: boolean,
	ellipse?: boolean,
) => {
	const ds = z.drawState()!;

	const start = ds.start;
	const last = ds.last;

	const sx = Math.floor(start.x),
		sy = Math.floor(start.y);
	const lx = Math.floor(last.x),
		ly = Math.floor(last.y);
	const px = Math.floor(pos.x),
		py = Math.floor(pos.y);

	if (px === lx && py === ly) return;

	// Clear the previous rectangle
	const ctx = getTempLayerCtx(z);
	clearTempArea(z);

	// Draw the new rectangle
	ctx.save();
	contextUseToolStyle(z, ctx);

	const bd = z.tempBd;
	extendBoundaryByPixel(bd, sx, sy);
	extendBoundaryByPixel(bd, px, py);
	if (fill) {
		if (ellipse) {
			// Clip
			const poly = ellipsePolygon(bd.l, bd.t, bd.r - bd.l, bd.b - bd.t);
			ctx.clip(polygonToPath2D(poly));
		}
		ctx.fillRect(bd.l, bd.t, bd.r - bd.l, bd.b - bd.t);
	} else {
		const brush = getBrush(z),
			lw = brush.size;
		ctx.lineWidth = lw;
		const off = lw / 2 - Math.floor(lw / 2);
		ctx.strokeRect(bd.l + off, bd.t + off, bd.r - bd.l - 1, bd.b - bd.t - 1);
		bd.l -= lw;
		bd.r += lw;
		bd.t -= lw;
		bd.b += lw;
	}
	ctx.restore();

	ds.last = { ...pos };
};

const drawLine = (z: PaintState, pos: Pos) => {
	const ds = z.drawState()!;

	const start = ds.start;
	const last = ds.last;

	const lx = Math.round(last.x * 2),
		ly = Math.round(last.y * 2);
	const px = Math.round(pos.x * 2),
		py = Math.round(pos.y * 2);

	if (px === lx && py === ly) return;

	// Clear the previous line
	clearTempArea(z);

	// Draw the new line
	const ctx = getTempLayerCtx(z);
	ctx.save();
	contextUseToolStyle(z, ctx);
	drawBrushLine(z, ctx, start.x, start.y, pos.x, pos.y);
	ctx.restore();

	ds.last = { ...pos };
};

export const floodFill = (z: PaintState, pos: Pos, threshold: number) => {
	const ds = z.drawState()!;

	const tool = z.toolType();
	if (ds.last.x < 0) {
		// Already handled.
		return;
	}
	const stack = [Math.floor(pos.x), Math.floor(pos.y)];
	if (
		stack[0] < 0 ||
		stack[0] >= z.size().w ||
		stack[1] < 0 ||
		stack[1] >= z.size().h
	)
		return;

	// Color reference ctx
	const refCtx = ERASER_TYPE_TOOLS.has(tool)
		? getTempLayerCtx(z)
		: getFocusedLayerCtx(z);
	const refData = refCtx.getImageData(0, 0, z.size().w, z.size().h);
	const refWidth = refData.width;
	const refHeight = refData.height;

	// Create mask image data
	const maskData = new Uint8Array(refWidth * refHeight);

	const colorMatch = (data: Uint8ClampedArray, color: Uint8ClampedArray) => {
		// Calculate distance
		let dist =
			[0, 1, 2, 3].reduce((acc, i) => acc + (data[i] - color[i]) ** 2, 0) / 4;
		return dist <= threshold;
	};

	// Fill the mask with 1 if the pixel is the same color as the start pixel
	const startColor = refCtx.getImageData(pos.x, pos.y, 1, 1).data;

	let bd = { ...EMPTY_BOUNDARY };

	while (stack.length > 0) {
		const y = stack.pop()!;
		const x = stack.pop()!;
		const idx = (y * refWidth + x) * 4;
		if (
			x < 0 ||
			x >= refWidth ||
			y < 0 ||
			y >= refHeight ||
			maskData[y * refWidth + x] > 0
		)
			continue;
		if (!colorMatch(refData.data.slice(idx, idx + 4), startColor)) {
			maskData[y * refWidth + x] = 1;
			continue;
		}
		maskData[y * refWidth + x] = 255;
		extendBoundaryByPixel(bd, x, y);
		stack.push(x - 1, y);
		stack.push(x + 1, y);
		stack.push(x, y - 1);
		stack.push(x, y + 1);
	}

	// Apply mask to the temp layer
	const tempCtx = getTempLayerCtx(z);
	tempCtx.save();
	contextUseToolStyle(z, tempCtx);
	for (let y = 0; y < refHeight; y++) {
		for (let x = 0; x < refWidth; x++) {
			if (maskData[y * refWidth + x] > 127) {
				tempCtx.fillRect(x, y, 1, 1);
			}
		}
	}
	tempCtx.restore();

	z.tempBd = bd;

	// Set last to -1 to prevent further flood fill
	ds.last = { x: -1, y: -1 };
};

/**
 * Draw the shape based on the current state.
 * This function is a callback for brush / eraser tool.
 */
export const stepDrawShape = (z: PaintState, force?: boolean) => {
	const pos = z.cursor().brush;

	const shape = z.drawShape();

	switch (shape) {
		case "free":
			drawFree(z, pos.x, pos.y, force);
			break;
		case "rect":
			drawRect(z, pos);
			break;
		case "fillRect":
			drawRect(z, pos, true);
			break;
		case "fillEllipse":
			drawRect(z, pos, true, true);
			break;
		case "line":
			drawLine(z, pos);
			break;
		case "fill":
			floodFill(z, pos, 1);
			break;
	}
};

/**
 * Draw callback for spoid.
 * It'll pick the color of the current pixel.
 */
export const stepSpoid = (z: PaintState, force?: boolean) => {
	const ds = z.drawState()!;

	const pos = z.cursor().real;
	const lastPos = ds.last;

	const px = Math.floor(pos.x),
		py = Math.floor(pos.y);
	const lx = Math.floor(lastPos.x),
		ly = Math.floor(lastPos.y);
	if (!force && px === lx && py === ly) return;

	const brush = getBrush(z);

	let data: Uint8ClampedArray;

	if (brush.spoidLocal) {
		// Just extract the color from focused layer
		const ctx = getFocusedLayerCtx(z);
		data = ctx.getImageData(px, py, 1, 1).data;
	} else {
		// Merge all layers, then extract the color
		const ectx = emptyCanvasContext(1, 1);
		const fl = z.focusedLayer();
		z.layers().forEach((layer, idx) => {
			let d = idx === fl ? getFocusedLayerCtx(z) : layer.data;
			drawLayerToCanvas(ectx, layer, -px, -py, d);
		});
		data = ectx.getImageData(0, 0, 1, 1).data;
	}

	ds.color = data;

	// Set the color to the palette
	if (force) useColorRGBA(z, data);
};

const FONT_HEIGHT_MAP = new Map<number, string>([
	[8, "Galmuri7"],
	[10, "Galmuri9"],
	[11, "Galmuri10"],
]);

const findProperFontSize = (heightPx: number) => {
	if (FONT_HEIGHT_MAP.has(heightPx)) {
		return FONT_HEIGHT_MAP.get(heightPx)!;
	}
};

/**
 * Draw callback for text tool.
 */
export const stepText = (z: PaintState, force?: boolean) => {
	const ds = z.drawState()!;

	const pos = z.cursor().real;
	const px = Math.floor(pos.x),
		py = Math.floor(pos.y);
	const lx = ds.last.x,
		ly = ds.last.y;

	if (!force && px === lx && py === ly) return;
	clearTempArea(z);

	const brush = getBrush(z);
	const height = brush.fontSize ?? 10;
	const font = findProperFontSize(height) || "Galmuri9";

	const ctx = getTempLayerCtx(z);
	ctx.save();
	contextUseToolStyle(z, ctx);
	ctx.font = `${height}px ${font}`;
	const measure = ctx.measureText(brush.text);
	ctx.fillText(brush.text, px, py);
	ctx.restore();

	z.tempBd = {
		l: px,
		t:
			py - (measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent),
		r: px + measure.width,
		b: py + 1,
	};
};
