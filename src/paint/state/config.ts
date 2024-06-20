import { Accessor, Setter, createSignal } from "solid-js";

import { rgbToStyle, styleBgCheckerboard } from "solid-tiny-color";
import { CompiledPaintConfig, PaintConfig, compilePaintConfig } from "..";

/** An object contains signal of config */
export type WithConfigSignal = {
	originalConfig: PaintConfig;

	config: Accessor<CompiledPaintConfig>;

	setConfig: Setter<CompiledPaintConfig>;
};

/** Install WithPaletteSignal to the object. */
export const installConfigSignal =
	<T extends object>(cfg: PaintConfig) =>
	(target: T): T & WithConfigSignal => {
		const originalConfig = { ...cfg };
		const [config, setConfig] = createSignal<CompiledPaintConfig>(
			compilePaintConfig(cfg),
		);
		return Object.assign(target, {
			originalConfig,
			config,
			setConfig,
		});
	};

/**
 * Make a style string
 */
export const checkerBoardStyle = (z: WithConfigSignal) => {
	const cfg = z.config().bgCheckerboard;
	return styleBgCheckerboard(
		rgbToStyle(cfg.color1),
		rgbToStyle(cfg.color2),
		cfg.size,
	);
};
