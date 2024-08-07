import { RGB } from "solid-tiny-color";

/**
 * Canvas background configuration.
 * The background of canvas will be rendered as checkerboard pattern.
 * Each color represents the color of each square, and the size is the size of each square in pixels.
 */
export type PaintConfigCanvasBackground = {
	/**
	 * Color 1 of checkerboard.
	 */
	color1: RGB;

	/**
	 * Color 2 of checkerboard.
	 */
	color2: RGB;

	/**
	 * Size of each square in pixels.
	 * This should be a positive integer.
	 */
	size: number;
};

/**
 * Paint configuration.
 */
export type PaintConfig = {
	/**
	 * Action for canvas click & drag.
	 * - "moveTouchOnly": If touch event, work as "move" (Default)
	 * - "draw": Draw (brush / shape / etc.)
	 * - "move": Move cursor by dragging
	 */
	canvasClickAction?: "draw" | "move" | "moveTouchOnly";

	/**
	 * Brush stabilization.
	 * - 0: Disabled (Default)
	 * - 1-20: Stabilization level
	 */
	brushStabilization?: number;

	/**
	 * Max history size.
	 * Default is 100, min is 8.
	 */
	maxHistory?: number;

	/**
	 * Background Checkboard Config
	 */
	bgCheckerboard?: PaintConfigCanvasBackground;
};

/**
 * Compiled paint configuration.
 * It guarantees that all values cannot be undefined, and some values are pre-calculated for performance.
 */
export type CompiledPaintConfig = PaintConfig & {
	/** Canvas Pen Action */
	canvasPenAction: "draw" | "move";

	/** Canvas Touch Action */
	canvasTouchAction: "draw" | "move";

	/** Brush stabilization factor. (0, 1] */
	brushFollowFactor: number;

	/** Max history size */
	maxHistory: number;

	/** Background Checkboard Config */
	bgCheckerboard: PaintConfigCanvasBackground;
};

/**
 * Compile paint configuration.
 * It'll fill default values and pre-calculate some values for performance.
 */
export const compilePaintConfig = (
	config: PaintConfig,
): CompiledPaintConfig => {
	return {
		...config,
		canvasPenAction: config.canvasClickAction === "move" ? "move" : "draw",
		canvasTouchAction: config.canvasClickAction === "draw" ? "draw" : "move",
		brushFollowFactor: Math.pow(0.99, config.brushStabilization || 0),
		maxHistory: Math.max(config.maxHistory || 100, 8),
		bgCheckerboard: config.bgCheckerboard || {
			color1: [112, 112, 112],
			color2: [156, 156, 156],
			size: 32,
		},
	};
};
