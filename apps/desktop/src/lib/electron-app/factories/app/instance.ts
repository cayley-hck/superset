import { app } from "electron";
import { PROTOCOL_SCHEME } from "shared/constants";

export function makeAppWithSingleInstanceLock(fn: () => void) {
	const isPrimaryInstance = app.requestSingleInstanceLock({
		workspace: PROTOCOL_SCHEME,
	});
	!isPrimaryInstance ? app.quit() : fn();
}
