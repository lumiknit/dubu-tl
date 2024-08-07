import { Component } from "solid-js";

import { Canvas, createPaintState } from "@/paint";
import { PaintConfig } from "@/paint/config";

import ToolPanel from "./BottomToolPanel";
import Modals, { createModalSwitches } from "./modal/Modals";

import "./styles.scss";

type Props = {};

const EditView: Component<Props> = () => {
	const config: PaintConfig = {
		brushStabilization: 5,
	};
	let state = createPaintState(config, 128, 128);
	let modalSwitches = createModalSwitches();
	return (
		<div class="p-edit-view">
			<div class="p-paint-area">
				<Canvas z={state} />
			</div>
			<ToolPanel z={state} sw={modalSwitches} />
			<Modals switches={modalSwitches} z={state} />
		</div>
	);
};

export default EditView;
