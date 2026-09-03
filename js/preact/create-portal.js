// create-portal.js

import { createElement } from './create-element.js';

function Portal (props) {
	return props.children;
}

export function createPortal (vnode, container) {
	return createElement(Portal, { _parentDom: container }, vnode);
}
