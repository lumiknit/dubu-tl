import { Accessor, Setter, batch, createSignal } from "solid-js";

import { CanvasCtx2D, Size, emptyCanvasContext } from "@/common";

import {
	Layer,
	createEmptyLayer,
	drawLayerToCanvas
} from "..";

export type WithImageInfo = {
	/** Getter for Size */
	size: Accessor<Size>;

	/** Setter for Size */
	setSize: Setter<Size>;

	/** Layers */
	layers: Accessor<Layer[]>;

	/** Set layers */
	setLayers: Setter<Layer[]>;

	/** Current focused layer */
	focusedLayer: Accessor<number>;

	/** Set focused layer */
	setFocusedLayer: Setter<number>;
};

export const installImageInfo =
	<T extends object>(w: number, h: number) =>
	(target: T): T & WithImageInfo => {
		const [size, setSize] = createSignal({ w, h });
		const [layers, setLayers] = createSignal(
			[createEmptyLayer("Layer 1", w, h)],
			{
				equals: false,
			},
		);
		const [focusedLayer, setFocusedLayer] = createSignal(0);
		return Object.assign(target, {
			size,
			setSize,
			layers,
			setLayers,
			focusedLayer,
			setFocusedLayer,
		});
	};

/**
 * Merge all layers and return the new canvas context.
 * This can be used to export image.
 */
export const mergeLayersWithNewCtx = (
	z: WithImageInfo,
	scale: number,
): CanvasCtx2D => {
	const size = z.size();

	// Flush focused layer to the layer

	// Merge layers
	const ectx = emptyCanvasContext(size.w, size.h);
	for (let i = 0; i < z.layers().length; i++) {
		drawLayerToCanvas(ectx, z.layers()[i], 0, 0);
	}
	scale = Math.min(1, Math.floor(scale));
	if (scale <= 1) return ectx;

	// Scale-up the merged image
	const ctx = emptyCanvasContext(size.w * scale, size.h * scale);
	ctx.scale(scale, scale);
	ctx.imageSmoothingEnabled = false;
	ctx.imageSmoothingQuality = "low";
	ctx.drawImage(ectx.canvas, 0, 0);

	return ctx;
};

/**
 * Render non-focused layers to each canvas context.
 * The background color will be render under the below layers.
 *
 * @param z State
 * @param bgConfig Background (checkerboard) configuration
 * @param below Below layer canvas context
 * @param above Above layer canvas context
 */
export const renderBlurredLayer = (
	z: WithImageInfo,
	below: CanvasCtx2D,
	above: CanvasCtx2D,
) => {
	const size = z.size();

	// Render below layers
	below.clearRect(0, 0, size.w, size.h);
	below.globalCompositeOperation = "source-over";

	// Then, draw layers below the focused layer
	const ls = z.layers();
	const fl = z.focusedLayer();
	for (let i = 0; i < fl; i++) {
		console.log("Render below", i, ls[i]);
		drawLayerToCanvas(below, ls[i], 0, 0);
	}

	// Render for the top layer
	above.clearRect(0, 0, size.w, size.h);
	above.globalCompositeOperation = "source-over";
	for (let i = fl + 1; i < ls.length; i++) {
		console.log("Render above", i);
		drawLayerToCanvas(above, ls[i], 0, 0);
	}
};

/**
 * Update the focused layer with the given canvas context.
 *
 * @param z State
 * @param ctx Canvas context which have data
 */
export const updateFocusedLayerDataWith = (
	z: WithImageInfo,
	ctx: CanvasCtx2D,
) => {
	const size = z.size();
	const target = z.layers()[z.focusedLayer()].data;
	target.clearRect(0, 0, size.w, size.h);
	target.drawImage(ctx.canvas, 0, 0);
};

/**
 * Create a new layer over the focused layer.
 */
export const insertNewLayer = (
	z: WithImageInfo,
	name: string,
	index: number,
): number => {
	batch(() => {
		const ls = z.layers();
		if (index < 0 || index >= ls.length) {
			index = ls.length;
		}
		const newLayer = createEmptyLayer(name, 1, 1);
		ls.splice(index, 0, newLayer);
		z.setLayers(ls);
	});
	return index;
};
