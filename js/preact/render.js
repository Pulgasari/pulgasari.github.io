// render.js

import { EMPTY_OBJ, MODE_HYDRATE, NULL } from './constants.js';
import { commitRoot, diff }        from './diff/index.js';
import { createElement, Fragment } from './create-element.js';
import options   from './options.js';
import { slice } from './util.js';

function render (vnode, parentDom) {
	if (options._root) options._root(vnode, parentDom);

	// https://github.com/preactjs/preact/issues/3794
	// https://github.com/preactjs/preact/issues/5118
	if (parentDom.nodeType == 9) {
		parentDom = parentDom.documentElement;
	}

	let isHydrating = vnode && vnode._flags & MODE_HYDRATE;
	let oldVNode    = isHydrating ? NULL : parentDom._children;

	parentDom._children = createElement(Fragment, NULL, [vnode]);

	// List of effects that need to be called after diffing.
	let commitQueue = [];
	let refQueue    = [];

	diff(
		parentDom,
		// Determine the new vnode tree and store it on the DOM element on
		// our custom `_children` property.
		parentDom._children,
		oldVNode || EMPTY_OBJ,
		EMPTY_OBJ,
		parentDom.namespaceURI,
		oldVNode
			? NULL
			: parentDom.firstChild
				? slice.call(parentDom.childNodes)
				: NULL,
		commitQueue,
		oldVNode ? oldVNode._dom : parentDom.firstChild,
		isHydrating,
		refQueue
	);

	// Flush all queued effects
	commitRoot(commitQueue, parentDom._children, refQueue);

	// The live children are tracked on _children after diffing.
	parentDom._children.props.children = NULL;
}

function hydrate (vnode, parentDom) {
	vnode._flags |= MODE_HYDRATE;
	render(vnode, parentDom);
}

export { hydrate, render };
