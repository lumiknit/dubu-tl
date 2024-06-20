import { rotateScaleRaw2D, subPos } from "@/common";
import {
	GestureEventContext,
	createGestureEventContext,
} from "@/common/gesture-handler";
import {
	PaintState,
	handleDrawEnd,
	handleDrawStart,
	invertDisplayTransform,
	moveRealCursorPos,
	restoreDisplayTransform,
	rotateScaleDisplayByCenter,
	saveDisplayTransform,
	transformOverDisplay,
	updateAllCursorPos,
	updateRealCursorPos,
} from ".";

export const createPaintGestureContext = (
	z: PaintState,
): GestureEventContext => {
	const gestureCtx = createGestureEventContext({
		captureRef: z.rootRef!,
		onPointerDown(e) {},
		onPointerMove(e) {
			if (e.type !== "T") {
				const p = invertDisplayTransform(z, e.pos);
				updateRealCursorPos(z, p);
			}
		},
		onPointerUp(e) {},
		onPointerCancel(e) {},

		onDragStart(e) {
			const ptr = e.pointers.get(e.id)!;
			const action =
				z.config()[ptr.type === "T" ? "canvasTouchAction" : "canvasPenAction"];
			if (action === "draw") {
				updateAllCursorPos(z, invertDisplayTransform(z, ptr.dragStartPos));
				handleDrawStart(z);
			} else {
			}
		},
		onDragMove(e) {
			const ptr = e.pointers.get(e.id)!;
			const action =
				z.config()[ptr.type === "T" ? "canvasTouchAction" : "canvasPenAction"];
			if (action === "draw") {
			} else {
				moveRealCursorPos(
					z,
					rotateScaleRaw2D(
						z.angle().cos,
						-z.angle().sin,
						1 / z.zoom(),
						ptr.delta,
					),
				);
			}
		},
		onDragEnd(e) {
			const ptr = e.pointers.get(e.id)!;
			const action =
				z.config()[ptr.type === "T" ? "canvasTouchAction" : "canvasPenAction"];
			if (action === "draw") {
				handleDrawEnd(z);
			} else {
			}
		},

		// Pinch is only used for transform
		onPinchStart() {
			// Save the last display state
			saveDisplayTransform(z);
		},
		onPinchMove(e) {
			// Update the display state based on the pinch gesture
			// Translate should be invert transformed and re-transformed
			restoreDisplayTransform(z);
			transformOverDisplay(z, e.scale, e.rotate, e.translate);
		},
		onWheel(e) {
			e.preventDefault();
			const center = invertDisplayTransform(z, { x: e.clientX, y: e.clientY });
			if (e.ctrlKey || e.metaKey) {
				// Zoom
				rotateScaleDisplayByCenter(z, 0, 1 - e.deltaY * 0.01, center);
			} else if (e.altKey) {
				// Rotate
				rotateScaleDisplayByCenter(z, e.deltaY * 0.01, 1, center);
			} else {
				// Translate
				z.setScroll(s => subPos(s, { x: e.deltaX, y: e.deltaY }));
			}
		},
	});
	return gestureCtx;
};
