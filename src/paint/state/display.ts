import { Accessor, Setter, batch, createSignal } from "solid-js";

import {
	ORIGIN,
	Pos,
	addPos,
	rotateScale2D,
	rotateScaleRaw2D,
	subPos,
} from "@/common";
import { WithImageInfo } from ".";

type Angle = {
	/** Angle in radian */
	rad: number;

	/** Cached cos */
	cos: number;

	/** Cached sin */
	sin: number;
};

/** An object contains display information */
export type WithDisplaySignal = {
	/** Scroll in pixels */
	scroll: Accessor<Pos>;
	setScroll: Setter<Pos>;

	/** Zoom scale */
	zoom: Accessor<number>;
	setZoom: Setter<number>;

	/** Angle in radian */
	angle: Accessor<Angle>;
	setAngle: Setter<Angle>;

	/** Saved transform */
	savedScroll: Pos;
	savedZoom: number;
	savedAngle: Angle;
};

export const installDisplaySignal = <T extends object>(
	target: T,
): T & WithDisplaySignal => {
	const [scroll, setScroll] = createSignal<Pos>({ ...ORIGIN });
	const [zoom, setZoom] = createSignal(8);
	const [angle, setAngle] = createSignal({
		rad: 0,
		cos: 1,
		sin: 0,
	});
	return Object.assign(target, {
		scroll,
		setScroll,
		zoom,
		setZoom,
		angle,
		setAngle,
		savedScroll: scroll(),
		savedZoom: zoom(),
		savedAngle: angle(),
	});
};

/**
 * Rotate and scale the display by the center.
 */
export const updateAngle = (z: WithDisplaySignal, rad: number) => {
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	z.setAngle({ rad, cos, sin });
};

/**
 * Calculate the invert transform position
 *
 * @param z State
 * @param p Pos
 */
export const invertDisplayTransform = (z: WithDisplaySignal, p: Pos): Pos => {
	const angle = z.angle();
	return rotateScaleRaw2D(
		angle.cos,
		-angle.sin,
		1 / z.zoom(),
		subPos(p, z.scroll()),
	);
};

export const fitDisplayTo = (
	z: WithImageInfo & WithDisplaySignal,
	w: number,
	h: number,
) => {
	const canvasSize = z.size();

	// Calculate the zoom
	const zoom = Math.min(w / canvasSize.w, h / canvasSize.h) * 0.95;

	// Calculate the scroll
	const x = (w - zoom * canvasSize.w) / 2;
	const y = (h - zoom * canvasSize.h) / 2;

	// Set the values
	batch(() => {
		z.setZoom(zoom);
		z.setScroll({ x, y });
	});
};

export const saveDisplayTransform = (z: WithDisplaySignal) => {
	z.savedScroll = { ...z.scroll() };
	z.savedZoom = z.zoom();
	z.savedAngle = { ...z.angle() };
};

export const restoreDisplayTransform = (z: WithDisplaySignal) => {
	batch(() => {
		z.setScroll(z.savedScroll);
		z.setZoom(z.savedZoom);
		z.setAngle(z.savedAngle);
	});
};

/**
 * Transform the display.
 */
export const transformOverDisplay = (
	z: WithDisplaySignal,
	scale: number,
	angle: number,
	translate: Pos,
): void => {
	if (scale <= 0) scale = 1;
	batch(() => {
		z.setAngle(a => {
			const rad = a.rad + angle;
			return {
				rad,
				cos: Math.cos(rad),
				sin: Math.sin(rad),
			};
		});
		z.setZoom(z => z * scale);
		z.setScroll(s => addPos(translate, rotateScale2D(angle, scale, s)));
	});
};
