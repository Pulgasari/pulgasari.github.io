// diff/props.js

import { NULL, SVG_NAMESPACE } from '../constants';
import options from '../options';

let EVENT_DISPATCHED = Symbol();
let EVENT_ATTACHED   = Symbol();

function setStyle (style, key, value) {
	if (value == NULL) value = '';
	if (key[0] == '-') {
		style.setProperty(key, value);
	} else {
		style[key] = value;
	}
}

const CAPTURE_REGEX = /(PointerCapture)$|Capture$/i;

let eventClock = 0;

export function setProperty (dom, name, value, oldValue, namespace) {
	let useCapture;

	o: if (name == 'style') {
		if (typeof value == 'string') {
			dom.style.cssText = value;
		} else {
			if (typeof oldValue == 'string') {
				dom.style.cssText = oldValue = '';
			}

			if (oldValue) for (name in oldValue) {
				if (!(value && name in value)) {
					setStyle(dom.style, name, '');
				}
			}

			if (value) for (name in value) {
				if (!oldValue || value[name] != oldValue[name]) {
					setStyle(dom.style, name, value[name]);
				}
			}
			
		}
	}
	else if (name[0] == 'o' && name[1] == 'n') {
		useCapture = name != (name = name.replace(CAPTURE_REGEX, '$1'));

		name = name.slice(2).toLowerCase();

		(dom._listeners || (dom._listeners = {}))[name + useCapture] = value;

		if (value) {
			if (!oldValue) {
				value[EVENT_ATTACHED] = eventClock;
				dom.addEventListener(
					name,
					useCapture ? eventProxyCapture : eventProxy,
					useCapture
				);
			} else {
				value[EVENT_ATTACHED] = oldValue[EVENT_ATTACHED];
			}
		} else {
			dom.removeEventListener(
				name,
				useCapture ? eventProxyCapture : eventProxy,
				useCapture
			);
		}
	} else {
		if (namespace == SVG_NAMESPACE) {
			name = name.replace(/xlink(H|:h)/, 'h').replace(/sName$/, 's');
		} else if (
			name != 'width' &&
			name != 'height' &&
			name != 'href' &&
			name != 'list' &&
			name != 'form' &&
			name != 'tabIndex' &&
			name != 'download' &&
			name != 'rowSpan' &&
			name != 'colSpan' &&
			name != 'role' &&
			name != 'popover' &&
			name in dom
		) {
			try {
				dom[name] = value == NULL ? '' : value;
				break o;
			} catch (e) {}
		}

		if (typeof value == 'function') {
		} else if (value != NULL && (value !== false || name[4] == '-')) {
			dom.setAttribute(name, name == 'popover' && value == true ? '' : value);
		} else {
			dom.removeAttribute(name);
		}
	}
}

function createEventProxy (useCapture) {
	return function (event) {
		if (this._listeners) {
			const eventHandler = this._listeners[event.type + useCapture];
			if (event[EVENT_DISPATCHED] == NULL) {
				event[EVENT_DISPATCHED] = eventClock++;
			} else if (event[EVENT_DISPATCHED] < eventHandler[EVENT_ATTACHED]) {
				return;
			}
			return eventHandler(options.event ? options.event(event) : event);
		}
	};
}

const eventProxy        = createEventProxy (false);
const eventProxyCapture = createEventProxy (true);
