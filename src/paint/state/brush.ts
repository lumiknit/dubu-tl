import { Accessor, Setter, createSignal } from "solid-js";


import { ToolType } from "..";
import { Polygon, ellipsePolygon, rectanglePolygon } from "../polygon";

/** Current bursh shape & size information */
export type Brush = {
	/** Brush shape */
	shape: Polygon;

	/** Size */
	size: number;

	/** Roundness */
	round: boolean;

	// --- Spoid

	/** (Only for spoid) use only local layer */
	spoidLocal?: boolean;

	// --- Text

	/** (Only for text) font height */
	fontSize: number;

	/** (Only for text) */
	text: string;
};

/** Map for tool and brush set */
export type BrushSet = Map<ToolType, Brush>;

/** An object contains signal of brush set */
export type WithBrushSetSignal = {
	/** Getter for BrushSet */
	brushSet: Accessor<BrushSet>;

	/** Setter for BrushSet */
	setBrushSet: Setter<BrushSet>;
};

/** Install WithBrushSetSignal to the object. */
export const installBrushSetSignal = <T extends object>(
	target: T,
): T & WithBrushSetSignal => {
	const [brushSet, setBrushSet] = createSignal(new Map<ToolType, Brush>(), {
		equals: false,
	});
	return Object.assign(target, { brushSet, setBrushSet });
};

/**
 * Change brush shape
 */
export const setBrushShape = (
	z: WithBrushSetSignal,
	tool: ToolType,
	size: number,
	round: boolean,
): Brush => {
	const off = Math.floor(size / 2);
	const shape = round
		? ellipsePolygon(-off, -off, size, size)
		: rectanglePolygon(-off, -off, size, size);
	let newBrush;
	z.setBrushSet(b => {
		const old = b.get(tool)!;
		newBrush = { ...old, shape, size, round };
		return b.set(tool, newBrush);
	});
	return newBrush!;
};

/**
 * Set spoid local
 */
export const setSpoidLocal = (
	z: WithBrushSetSignal,
	tool: ToolType,
	value: boolean,
) => {
	z.setBrushSet(b => {
		const old = b.get(tool)!;
		return b.set(tool, { ...old, spoidLocal: value });
	});
};

export const setBrushTextOptions = (
	z: WithBrushSetSignal,
	tool: ToolType,
	text?: string,
	fontSize?: number,
) => {
	z.setBrushSet(b => {
		const old = b.get(tool)!;
		return b.set(tool, {
			...old,
			text: text ?? old.text,
			fontSize: fontSize ?? old.fontSize,
		});
	});
};
