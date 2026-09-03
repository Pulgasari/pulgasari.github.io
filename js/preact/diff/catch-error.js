// catch-error.js

import { resetRenderCount } from '../component.js';
import {
	COMPONENT_DIRTY,
	COMPONENT_PENDING_ERROR,
	COMPONENT_PROCESSING_EXCEPTION,
	COMPONENT_FORCE
} from '../constants.js';

export function _catchError (error, vnode, oldVNode, errorInfo) {
	let component, ctor, handled;

	for (; (vnode = vnode._parent); ) {
		if (
			(component = vnode._component) &&
			!(component._bits & COMPONENT_PROCESSING_EXCEPTION)
		) {
			component._bits |= COMPONENT_FORCE;
			try {
				ctor = component.constructor;

				if (ctor && ctor.getDerivedStateFromError) {
					component.setState(ctor.getDerivedStateFromError(error));
					handled = component._bits & COMPONENT_DIRTY;
				}

				if (component.componentDidCatch) {
					component.componentDidCatch(error, errorInfo || {});
					handled = component._bits & COMPONENT_DIRTY;
				}

				// This is an error boundary. Mark it as having bailed out, and whether it was mid-hydration.
				if (handled) {
					component._bits |= COMPONENT_PENDING_ERROR;
					return;
				}
			} catch (e) {
				error = e;
			}
		}
	}

	// Reset rerender count to 0, so that the next render will not be skipped
	// when we leverage prefresh
	resetRenderCount();
	throw error;
}
