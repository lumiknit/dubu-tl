import { Component, onMount, onCleanup, JSX, createMemo } from "solid-js";

import { PaintState, initPaintState, stepForPaintState } from ".";
import Cursor from "./Cursor";
import { addGestureListeners } from "@/common/gesture-handler";

import "./index.scss";
import { createPaintGestureContext } from "./state/gesture";

type Props = {
	z: PaintState;
};

const Canvas: Component<Props> = props => {
	// Set main loop

	let removeGestureEvents: undefined | (() => void) = undefined;
	let mainLoop: number = 0;
	onMount(() => {
		initPaintState(props.z);

		const gestureCtx = createPaintGestureContext(props.z);
		removeGestureEvents = addGestureListeners(props.z.rootRef!, gestureCtx);

		mainLoop = setInterval(
			() => stepForPaintState(props.z),
			1000 / (props.z.config().fps || 60),
		);
	});
	onCleanup(() => {
		removeGestureEvents?.();
		clearTimeout(mainLoop);
	});

	const canvasStyle = (
		zIndex: number,
		x: number,
		y: number,
	): JSX.CSSProperties => {
		const zoom = props.z.zoom();
		const size = props.z.size();
		return {
			"z-index": `${zIndex}`,
			top: `${x}px`,
			left: `${y}px`,
			width: `${size.w * zoom}px`,
			height: `${size.h * zoom}px`,
		};
	};

	const canvasTransform = createMemo(() => {
		const d = props.z.scroll();
		return `translate(${d.x}px, ${d.y}px) rotate(${props.z.angle().rad}rad)`;
	});

	return (
		<div ref={props.z.rootRef} class="cv-root">
			<div
				tabIndex={-1}
				class="cv-view"
				style={
					// DO NOT USE scale in tranform, because the canvas looks blurry in safari.
					{
						transform: canvasTransform(),
						"transform-origin": "0 0",
						width: `${props.z.size().w * props.z.zoom()}px`,
						height: `${props.z.size().h * props.z.zoom()}px`,
					}
				}>
				<Cursor z={props.z} />
				<canvas
					ref={props.z.tempLayerRef}
					class="cv-pix"
					style={canvasStyle(6, 0, 0)}
					width={props.z.size().w}
					height={props.z.size().h}
				/>
				<canvas
					ref={props.z.focusedLayerRef}
					class="cv-pix"
					style={{
						...canvasStyle(5, 0, 0),
						visibility: props.z.showFocusedLayer() ? "visible" : "hidden",
					}}
					width={props.z.size().w}
					height={props.z.size().h}
				/>
				<canvas
					ref={props.z.belowLayerRef}
					class="cv-pix"
					style={canvasStyle(4, 0, 0)}
					width={props.z.size().w}
					height={props.z.size().h}
				/>
				<canvas
					ref={props.z.aboveLayerRef}
					class="cv-pix"
					style={canvasStyle(9, 0, 0)}
					width={props.z.size().w}
					height={props.z.size().h}
				/>
			</div>
		</div>
	);
};

export default Canvas;
