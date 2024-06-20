import {
	CanvasCtx2D,
	EMPTY_BOUNDARY,
	ORIGIN,
	Pos,
	extendBoundaryByPixel,
} from "@/common";

import { emptyCanvasContext, putContextToContext } from "@/common";

/** Layer information without pixel/vector data */
export type LayerInfo = {
	/** Name of the layer */
	name: string;

	/** Layer x/y offset */
	off: Pos;

	/** Visibility */
	visible: boolean;

	/** Opacity */
	opacity: number;
};

/** Layer Information with pixel data */
export type Layer = LayerInfo & {
	/** Image data */
	data: CanvasCtx2D;
};

/**
 * Detach layer information from the layer.
 *
 * @param withLayerInfo An object extends LayerInfo
 */
export const detachLayerInfo = (withLayerInfo: LayerInfo): LayerInfo =>
	Object.fromEntries(
		(["name", "off", "opacity"] as (keyof LayerInfo)[]).map(key => [
			key,
			withLayerInfo[key],
		]),
	) as LayerInfo;

/**
 * Create an empty layer.
 */
export const createEmptyLayer = (name: string, w: number, h: number): Layer => {
	return {
		name,
		off: { ...ORIGIN },
		visible: true,
		opacity: 1,
		data: emptyCanvasContext(w, h),
	};
};

/**
 * Clone a layer.
 */
export const cloneLayer = (layer: Layer): Layer => {
	const data = emptyCanvasContext(
		layer.data.canvas.width,
		layer.data.canvas.height,
	);
	data.drawImage(layer.data.canvas, 0, 0);
	return {
		...layer,
		data,
	};
};

/**
 * Optimize layer size.
 * Find the smallest rectangle that contains all the pixels.
 *
 * @param layer The layer where the optimized canvas is put.
 * @param ctx The canvas context to optimize.
 */
export const putOptimizedLayer = (layer: Layer, ctx: CanvasCtx2D) => {
	const data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
	let bd = { ...EMPTY_BOUNDARY };
	for (let y = 0; y < data.height; y++) {
		for (let x = 0; x < data.width; x++) {
			const i = (y * data.width + x) * 4;
			if (data.data[i + 3] > 0) {
				extendBoundaryByPixel(bd, x, y);
			}
		}
	}
	if (bd.l >= bd.r || bd.t >= bd.b) {
		// No pixel. Just set as a single pixel.
		layer.off = { ...ORIGIN };
		layer.data = emptyCanvasContext(1, 1);
	} else {
		// Update offset
		layer.off = {
			x: bd.l,
			y: bd.t,
		};
		// Update image data
		layer.data = emptyCanvasContext(bd.r - bd.l, bd.b - bd.t);
		layer.data.drawImage(ctx.canvas, -bd.l, -bd.t);
	}
};

/**
 * Resize a layer.
 * If some pixels are cropped, the cropped pixels are lost.
 * If the layer is enlarged, the new pixels are transparent.
 */
export const resizeLayer = (
	layer: Layer,
	width: number,
	height: number,
	dx: number,
	dy: number,
): Layer => {
	const data = emptyCanvasContext(width, height);
	putContextToContext(data, layer.data, dx, dy);
	return {
		...layer,
		off: {
			x: layer.off.x + dx,
			y: layer.off.y + dy,
		},
		data,
	};
};

/**
 * Draw the given layer into the CanvasCtx2D.
 *
 * @param ctx The canvas context where the layer is drawn.
 * @param layer The layer to draw.
 * @param offX The x offset where the layer is drawn.
 * @param offY The y offset where the layer is drawn.
 * @param overrideCtx If given, instead layer.data, this context is used. Also, off will be ignored.
 */
export const drawLayerToCanvas = (
	ctx: CanvasCtx2D,
	layer: Layer,
	offX: number,
	offY: number,
	overrideCtx?: CanvasCtx2D,
) => {
	if (!layer.visible || layer.opacity <= 0) return;
	let x = 0,
		y = 0;
	if (!overrideCtx) {
		x = layer.off.x;
		y = layer.off.y;
	}
	ctx.save();
	ctx.globalAlpha = layer.opacity;
	ctx.drawImage((overrideCtx || layer.data).canvas, x + offX, y + offY);
	ctx.restore();
};
