// create-element.js

import { assign, slice }   from './util.js';
import options             from './options.js';
import { NULL, UNDEFINED } from './constants.js';

let vnodeId = 0;

function createElement (type, props, children) {
	let normalizedProps = {};
	let i, key, ref;
	let length = arguments.length;
  
	for (i in props) {
		if (i == 'key') key = props[i];
		else if (i == 'ref' && typeof type != 'function') ref = props[i];
		else normalizedProps[i] = props[i];
	}

	if (length > 2) {
		normalizedProps.children = length > 3 ? slice.call(arguments, 2) : children;
	}

	return createVNode(type, normalizedProps, key, ref, NULL);
}

function cloneElement (vnode, props, children) {
	let normalizedProps = assign({}, vnode.props);
  let i, key, ref;
	let length = arguments.length;

	for (i in props) {
		if (i == 'key') key = props[i];
		else if (i == 'ref' && typeof vnode.type != 'function') ref = props[i];
		else normalizedProps[i] = props[i];
	}

	if (length > 2) {
		normalizedProps.children = length > 3 ? slice.call(arguments, 2) : children;
	}

	return createVNode(
		vnode.type,
		normalizedProps,
		key !== UNDEFINED ? key : vnode.key,
		ref !== UNDEFINED ? ref : vnode.ref,
		NULL
	);
}

function createVNode (type, props, key, ref, original) {
	const vnode = {
		type,
		props,
		key,
		ref,
		_children: NULL,
		_parent: NULL,
		_depth: 0,
		_dom: NULL,
		_component: NULL,
		constructor: UNDEFINED,
		_original: original || ++vnodeId,
		_index: -1,
		_flags: 0
	};

	// Only invoke the vnode hook if this was *not* a direct copy:
	if (!original && options.vnode) options.vnode(vnode);

	return vnode;
}

const createRef      = ()      => ({ current: NULL });
const Fragment       = (props) => props.children;
const isValidElement = vnode   => vnode != NULL && vnode.constructor === UNDEFINED;

export {
  cloneElement,
  createElement,
  createRef,
  createVNode,
  Fragment,
  isValidElement,
}
