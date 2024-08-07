/**
 * @module paint/actions
 * @description The module contains available actions, and types for edit history.
 */

import { CanvasCtx2D, Rect, Size } from "@/common";

import { Layer } from ".";

// -- Painting actions

/** Update the part of image of the focused layer. */
export type UpdateImgAction = {
	type: "updateImg";
	/** Where the image data was updated */
	rect: Rect;
	/** Image data for revert */
	oldImg: CanvasCtx2D;
	/** New image data */
	newImg?: CanvasCtx2D;
};

// -- Layer control

/** New layer */
export type NewLayerAction = {
	type: "newLayer";
	index: number;
	name: string;
};

/** Update the layer information */
export type UpdateLayerInfoAction = {
	type: "updateLayerInfo";
	index: number;

	oldOpt: any;
	opt: any;
};

/** Delete the given layer */
export type DeleteLayerAction = {
	type: "deleteLayer";
	index: number;
	/** Layer to revert */
	layer?: Layer;
	focusChanged?: boolean;
	createdEmpty?: boolean;
};

/** Delete the given layer */
export type FocusLayerAction = {
	type: "focusLayer";
	index: number;
	oldIndex?: number;
};

/** Merge the image data of an imaeg to other image */
export type MergeLayerAction = {
	type: "mergeLayer";
	dest: number;
	src: number;
	srcLayer: Layer;
	destOldImage: ImageData;
};

/** Change the size of canvas */
export type ChangeCanvasSizeAction = {
	type: "changeCanvasSize";
	prev?: Size;
	next: Size;
	oldLayers?: Layer[];
	newLayers?: Layer[];
};

export type Action =
	| UpdateImgAction
	| NewLayerAction
	| UpdateLayerInfoAction
	| DeleteLayerAction
	| FocusLayerAction
	| MergeLayerAction
	| ChangeCanvasSizeAction;
