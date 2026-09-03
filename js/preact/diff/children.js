// diff/children.js

import { diff, unmount, applyRef } from './index';
import { createVNode, Fragment } from '../create-element';
import {
	EMPTY_OBJ,
	EMPTY_ARR,
	INSERT_VNODE,
	MATCHED,
	UNDEFINED,
	NULL,
	HAS_MOVE_BEFORE_SUPPORT
} from '../constants';
import { isArray } from '../util';
import { getDomSibling } from '../component';

export function diffChildren(
	parentDom,
	renderResult,
	newParentVNode,
	oldParentVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating,
	refQueue
) {
	let i, oldVNode, childVNode, newDom, firstChildDom;
	let oldChildren       = oldParentVNode._children || EMPTY_ARR;
	let newChildrenLength = renderResult.length;

	oldDom = constructNewChildrenArray(
		newParentVNode,
		renderResult,
		oldChildren,
		oldDom,
		newChildrenLength
	);

	for (i = 0; i < newChildrenLength; i++) {
		childVNode = newParentVNode._children[i]; if (childVNode == NULL) continue;
		  oldVNode = (~childVNode._index && oldChildren[childVNode._index]) || EMPTY_OBJ;

		childVNode._index = i;

		let result = diff(
			parentDom,
			childVNode,
			oldVNode,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating,
			refQueue
		);

		newDom = childVNode._dom;
		if (childVNode.ref && oldVNode.ref != childVNode.ref) {
			if (oldVNode.ref) {
				applyRef(oldVNode.ref, NULL, childVNode);
			}
			refQueue.push(
				childVNode.ref,
				childVNode._component || newDom,
				childVNode
			);
		}

		firstChildDom = firstChildDom || newDom;

		if (childVNode._flags & INSERT_VNODE) {
			oldDom = insert(childVNode, oldDom, parentDom, !oldVNode._original);

			if (oldVNode._dom) {
				oldVNode._dom = NULL;
			}
		} else if (typeof childVNode.type == 'function' && result !== UNDEFINED) {
			oldDom = result;
		} else if (newDom) {
			oldDom = newDom.nextSibling;
		}

		childVNode._flags &= ~(INSERT_VNODE | MATCHED);
	}

	newParentVNode._dom = firstChildDom;

	return oldDom;
}

function constructNewChildrenArray(
	newParentVNode,
	renderResult,
	oldChildren,
	oldDom,
	newChildrenLength
) {
	let i;
	let childVNode;
	let oldVNode;
	let oldChildrenLength    = oldChildren.length;
	let remainingOldChildren = oldChildrenLength;
	let skew  = 0;
	let moved = false;
	let newChildren = (newParentVNode._children = Array(newChildrenLength));
  
	for (i = 0; i < newChildrenLength; i++) {
		childVNode = renderResult[i];

		if       (childVNode == NULL 
    || typeof childVNode == 'boolean'
    || typeof childVNode == 'function'
		){
			newChildren[i] = NULL;
			continue;
		} else if (
			typeof childVNode != 'object' ||
			childVNode.constructor == String
		) {
			childVNode = newChildren[i] = createVNode(NULL, childVNode);
		} else if (isArray(childVNode)) {
			childVNode = newChildren[i] = createVNode(Fragment, {
				children: childVNode
			});
		} else if (childVNode.constructor === UNDEFINED && childVNode._depth) {
			childVNode = newChildren[i] = createVNode(
				childVNode.type,
				childVNode.props,
				childVNode.key,
				childVNode.ref,
				childVNode._original
			);
		} else {
			newChildren[i] = childVNode;
		}

		const skewedIndex = i + skew;
		childVNode._parent = newParentVNode;
		childVNode._depth  = newParentVNode._depth + 1;

		const matchingIndex = (childVNode._index = findMatchingIndex(
			childVNode,
			oldChildren,
			skewedIndex,
			remainingOldChildren
		));

		oldVNode = NULL;
		if (~matchingIndex) {
			oldVNode = oldChildren[matchingIndex];
			remainingOldChildren--;
			if (oldVNode) {
				oldVNode._flags |= MATCHED;
			}
		}

		if (!oldVNode || !oldVNode._original) {
			if (!~matchingIndex) {
				if (newChildrenLength > oldChildrenLength) {
					skew--;
				} else if (newChildrenLength < oldChildrenLength) {
					skew++;
				}
			}

			if (typeof childVNode.type != 'function') {
				childVNode._flags |= INSERT_VNODE;
			}
		} else {
			childVNode._flags |= MATCHED;

			if (matchingIndex == skewedIndex - 1) {
				skew--;
			} else if (matchingIndex == skewedIndex + 1) {
				skew++;
			} else if (matchingIndex != skewedIndex) {
				if (matchingIndex > skewedIndex) {
					skew--;
				} else {
					skew++;
				}

				moved = true;
			}
		}
	}

	if (moved) {
		let tails = [];
		let lisLengths = [];
		for (i = 0; i < newChildrenLength; i++) {
			childVNode = newChildren[i];
			if (childVNode && childVNode._flags & MATCHED) {
				let lo = 0,
					hi = tails.length;
				while (lo < hi) {
					const mid = (lo + hi) >> 1;
					if (tails[mid] < childVNode._index) {
						lo = mid + 1;
					} else {
						hi = mid;
					}
				}
				tails[lo] = childVNode._index;
				lisLengths[i] = lo + 1;
			}
		}

		skew = tails.length;
		while (i--) {
			if (lisLengths[i]) {
				if (lisLengths[i] == skew) {
					skew--;
				} else {
					newChildren[i]._flags |= INSERT_VNODE;
				}
			}
		}
	}

	if (remainingOldChildren) {
		for (i = 0; i < oldChildrenLength; i++) {
			oldVNode = oldChildren[i];
			if (oldVNode && !(oldVNode._flags & MATCHED)) {
				if (oldVNode._dom == oldDom) {
					oldDom = getDomSibling(oldVNode);
				}

				unmount(oldVNode, oldVNode);
			}
		}
	}

	return oldDom;
}

function insert(parentVNode, oldDom, parentDom, isMounting) {
	if (typeof parentVNode.type == 'function') {
		if (parentVNode.props._parentDom) return oldDom;
		let children = parentVNode._children;
		if (children) {
			for (let i = 0; i < children.length; i++) {
				if (children[i]) {
					children[i]._parent = parentVNode;
					oldDom = insert(children[i], oldDom, parentDom, false);
				}
			}
		}

		return oldDom;
	} else if (parentVNode._dom != oldDom) {
		if (oldDom && parentVNode.type && !oldDom.parentNode) {
			oldDom = getDomSibling(parentVNode);
		}

		if (HAS_MOVE_BEFORE_SUPPORT && !isMounting) {
			parentDom.moveBefore(parentVNode._dom, oldDom);
		} else {
			parentDom.insertBefore(parentVNode._dom, oldDom || NULL);
		}
		oldDom = parentVNode._dom;
	}

	while ((oldDom = oldDom && oldDom.nextSibling) && oldDom.nodeType == 8);

	return oldDom;
}

export function toChildArray(children, out) {
	out = out || [];
	if (children != NULL && typeof children != 'boolean') {
		if (isArray(children)) {
			children.some(child => {
				toChildArray(child, out);
			});
		} else {
			out.push(children);
		}
	}
	return out;
}

function findMatchingIndex(
	childVNode,
	oldChildren,
	skewedIndex,
	remainingOldChildren
) {
	const key = childVNode.key;
	const type = childVNode.type;
	let oldVNode = oldChildren[skewedIndex];
	const matched = oldVNode && !(oldVNode._flags & MATCHED);

	let shouldSearch =
		remainingOldChildren > (matched ? 1 : 0);

	if (
		(oldVNode === NULL && key == NULL) ||
		(matched && key == oldVNode.key && type == oldVNode.type)
	) {
		return skewedIndex;
	} else if (shouldSearch) {
		let x = skewedIndex - 1;
		let y = skewedIndex + 1;
		while (x >= 0 || y < oldChildren.length) {
			const childIndex = x >= 0 ? x-- : y++;
			oldVNode = oldChildren[childIndex];
			if (
				oldVNode &&
				!(oldVNode._flags & MATCHED) &&
				key == oldVNode.key &&
				type == oldVNode.type
			) {
				return childIndex;
			}
		}
	}

	return -1;
}
