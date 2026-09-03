import {
	COMPONENT_DIRTY,
	COMPONENT_FORCE,
	MODE_HYDRATE,
	NULL,
	UNDEFINED
} from './constants';
import { Fragment } from './create-element';
import { commitRoot, diff } from './diff/index';
import options from './options';
import { assign } from './util';

/**
 * Base Component class. Provides `setState()` and `forceUpdate()`, which
 * trigger rendering
 * @param {object} props The initial component props
 * @param {object} context The initial context from parent components'
 * getChildContext
 */
export function BaseComponent (props, context) {
	this.props   = props;
	this.context = context;
	this._bits   = 0;
}

/**
 * Update component state and schedule a re-render.
 * @this {import('./internal').Component}
 * @param {object | ((s: object, p: object) => object)} update A hash of state
 * properties to update with new values or a function that given the current
 * state and props returns a new partial state
 * @param {() => void} [callback] A function to be called once component state is
 * updated
 */
BaseComponent.prototype.setState = function (update, callback) {
	// only clone state when copying to nextState the first time.
	let s = this._nextState;
	if (!s || s == this.state) {
		s = this._nextState = assign({}, this.state);
	}

	if (typeof update == 'function') {
		// Some libraries like `immer` mark the current state as readonly,
		// preventing us from mutating it, so we need to clone it. See #2716
		update = update(assign({}, s), this.props);
	}

	if (update) {
		assign(s, update);
	} else {
		return;
	}

	if (this._vnode) {
		if (callback) this._stateCallbacks.push(callback);
		enqueueRender(this);
	}
};

BaseComponent.prototype.forceUpdate = function (callback) {
	if (this._vnode) {
		this._bits |= COMPONENT_FORCE;
		if (callback) this._renderCallbacks.push(callback);
		enqueueRender(this);
	}
};

BaseComponent.prototype.render = Fragment;

export function getDomSibling (vnode, childIndex) {
	if (childIndex == NULL) {
		return vnode._parent
			? getDomSibling(vnode._parent, vnode._index + 1)
			: NULL;
	}

	let sibling;
	for (; childIndex < vnode._children.length; childIndex++) {
		sibling = vnode._children[childIndex];

		if (sibling && sibling._dom) {
			return sibling._dom;
		}
	}

	return typeof vnode.type == 'function' && !vnode.props._parentDom
		? getDomSibling(vnode)
		: NULL;
}

function renderComponent (component) {
	const
  oldVNode    = component._vnode,
	oldDom      = oldVNode._dom,
	commitQueue = [],
	refQueue    = [];

	const parentDom = component._parentDom;
	if (parentDom) {
		const newVNode = assign({ constructor: UNDEFINED }, oldVNode);
		newVNode._original = oldVNode._original + 1;
		if (options.vnode) options.vnode(newVNode);

		diff(
			parentDom,
			newVNode,
			oldVNode,
			component._globalContext,
			parentDom.namespaceURI,
			oldVNode._flags & MODE_HYDRATE ? [oldDom] : NULL,
			commitQueue,
			oldDom || getDomSibling(oldVNode),
			oldVNode._flags & MODE_HYDRATE,
			refQueue
		);

		newVNode._original = oldVNode._original;
		newVNode._parent._children[newVNode._index] = newVNode;
		commitRoot(commitQueue, newVNode, refQueue);
		oldVNode._parent = oldVNode._dom = NULL;

		if (newVNode._dom != oldDom) {
			updateParentDomPointers(newVNode);
		}
	}
}

/**
 * @param {import('./internal').VNode} vnode
 */
function updateParentDomPointers (vnode) {
	// Stop at root boundaries (_parentDom)
	if ((vnode = vnode._parent) && vnode._component && !vnode.props._parentDom) {
		// _dom starts nulled, so re-assigning a null child._dom is a no-op and
		// the first truthy _dom stops the walk.
		vnode._dom = NULL;
		vnode._children.some(child => child && (vnode._dom = child._dom));

		return updateParentDomPointers(vnode);
	}
}

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
 */
const rerenderQueue = [];
let prevDebounce, rerenderCount = 0;

export function resetRenderCount() {
	rerenderCount = 0;
}

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
export function enqueueRender(c) {
	if (
		(!(c._bits & COMPONENT_DIRTY) &&
			(c._bits |= COMPONENT_DIRTY) &&
			rerenderQueue.push(c) &&
			!rerenderCount++) ||
		prevDebounce != options.debounceRendering
	) {
		prevDebounce = options.debounceRendering;
		(prevDebounce || queueMicrotask)(process);
	}
}

/**
 * @param {import('./internal').Component} a
 * @param {import('./internal').Component} b
 */
const depthSort = (a, b) => a._vnode._depth - b._vnode._depth;

/** Flush the render queue by rerendering all queued components */
function process() {
	try {
		let c,
			l = 1;

		// Don't update `renderCount` yet. Keep its value non-zero to prevent unnecessary
		// process() calls from getting scheduled while `queue` is still being consumed.
		while (rerenderQueue.length) {
			// Keep the rerender queue sorted by (depth, insertion order). The queue
			// will initially be sorted on the first iteration only if it has more than 1 item.
			//
			// New items can be added to the queue e.g. when rerendering a provider, so we want to
			// keep the order from top to bottom with those new items so we can handle them in a
			// single pass
			if (rerenderQueue.length > l) {
				rerenderQueue.sort(depthSort);
			}

			c = rerenderQueue.shift();
			l = rerenderQueue.length;

			if (c._bits & COMPONENT_DIRTY) {
				renderComponent(c);
			}
		}
	} finally {
		rerenderQueue.length = rerenderCount = 0;
	}
}
