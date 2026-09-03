import { BaseComponent, getDomSibling } from '../component';
import {
	COMPONENT_DIRTY,
	COMPONENT_FORCE,
	COMPONENT_PENDING_ERROR,
	COMPONENT_PROCESSING_EXCEPTION,
	EMPTY_ARR,
	EMPTY_OBJ,
	FORCE_PROPS_REVALIDATE,
	MATHML_TOKEN_ELEMENTS,
	MATH_NAMESPACE,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	NULL,
	RESET_MODE,
	SVG_NAMESPACE,
	UNDEFINED,
	XHTML_NAMESPACE
} from '../constants';
import { Fragment } from '../create-element';
import options from '../options';
import { assign, isArray, removeNode, slice } from '../util';
import { diffChildren } from './children';
import { setProperty } from './props';

export function diff(
	parentDom,
	newVNode,
	oldVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating,
	refQueue
) {
	let tmp,
		newType = newVNode.type;

	if (newVNode.constructor !== UNDEFINED) return NULL;

	if (
		oldVNode._flags & MODE_SUSPENDED &&
		(isHydrating = oldVNode._flags & MODE_HYDRATE) &&
		(tmp = oldVNode._component._excess)
	) {
		newVNode._flags |= MODE_HYDRATE;
		excessDomChildren = [];
		if (tmp.nodeType == 8) {
			for (
				let depth = 1, node = tmp.nextSibling;
				node;
				node = node.nextSibling
			) {
				if (node.nodeType == 8) {
					if (node.data.startsWith('$s')) depth++;
					else if (node.data.startsWith('/$s') && !--depth) break;
				}
				excessDomChildren.push(node);
			}
		} else {
			excessDomChildren.push(tmp);
		}
		oldDom = excessDomChildren[0];
		oldVNode._component._excess = NULL;
	}

	if ((tmp = options._diff)) tmp(newVNode);

	outer: if (typeof newType == 'function') {
		let oldCommitQueueLength = commitQueue.length;
		try {
			let c,
				oldProps,
				oldState,
				snapshot,
				newProps = newVNode.props;
			const isClassComponent = (tmp = newType.prototype) && tmp.render;

			tmp = newType.contextType;
			const provider = tmp && globalContext[tmp._id];
			const componentContext = tmp
				? provider
					? provider.props.value
					: tmp._defaultValue
				: globalContext;

			if (oldVNode._component) {
				c = newVNode._component = oldVNode._component;
				if (c._bits & COMPONENT_PENDING_ERROR) {
					c._bits |= COMPONENT_PROCESSING_EXCEPTION;
				}
			} else {
				if (isClassComponent) {
					newVNode._component = c = new newType(newProps, componentContext);
				} else {
					newVNode._component = c = new BaseComponent(
						newProps,
						componentContext
					);

					c.constructor = newType;
					c.render = doRender;
				}
				if (provider) provider.sub(c);

				if (!c.state) c.state = {};
				c._globalContext = globalContext;
				c._bits |= COMPONENT_DIRTY;
				c._renderCallbacks = [];
				c._stateCallbacks = [];
			}

			if (isClassComponent) {
				if (!c._nextState) c._nextState = c.state;

				if (newType.getDerivedStateFromProps) {
					if (c._nextState == c.state) {
						c._nextState = assign({}, c._nextState);
					}

					assign(
						c._nextState,
						newType.getDerivedStateFromProps(newProps, c._nextState)
					);
				}
			}

			oldProps = c.props;
			oldState = c.state;
			c._vnode = newVNode;

			if (!oldVNode._component) {
				if (
					isClassComponent &&
					!newType.getDerivedStateFromProps &&
					c.componentWillMount
				) {
					c.componentWillMount();
				}

				if (isClassComponent && c.componentDidMount) {
					c._renderCallbacks.push(c.componentDidMount);
				}
			} else {
				if (
					isClassComponent &&
					!newType.getDerivedStateFromProps &&
					newProps !== oldProps &&
					c.componentWillReceiveProps
				) {
					c.componentWillReceiveProps(newProps, componentContext);
				}

				if (
					(newVNode._original == oldVNode._original &&
						!(c._bits & COMPONENT_DIRTY)) ||
					(!(c._bits & COMPONENT_FORCE) &&
						c.shouldComponentUpdate &&
						c.shouldComponentUpdate(
							newProps,
							c._nextState,
							componentContext
						) === false)
				) {
					if (newVNode._original != oldVNode._original) {
						c.props = newProps;
						c.state = c._nextState;
						c._bits &= ~COMPONENT_DIRTY;
					}

					newVNode._dom = oldVNode._dom;
					newVNode._children = oldVNode._children;
					newVNode._children.some(vnode => {
						if (vnode) vnode._parent = newVNode;
					});

					EMPTY_ARR.push.apply(c._renderCallbacks, c._stateCallbacks);
					c._stateCallbacks = [];

					if (c._renderCallbacks.length) {
						commitQueue.push(c);
					}

					oldDom = getDomSibling(oldVNode);

					break outer;
				}

				if (c.componentWillUpdate) {
					c.componentWillUpdate(newProps, c._nextState, componentContext);
				}

				if (isClassComponent && c.componentDidUpdate) {
					c._renderCallbacks.push(() => {
						c.componentDidUpdate(oldProps, oldState, snapshot);
					});
				}
			}

			c.context = componentContext;
			c.props = newProps;
			c._parentDom = parentDom;
			c._bits &= ~COMPONENT_FORCE;

			let renderHook = options._render,
				count = 0;
			if (isClassComponent) {
				c.state = c._nextState;
				c._bits &= ~COMPONENT_DIRTY;

				if (renderHook) renderHook(newVNode);

				tmp = c.render(c.props, c.state, c.context);

				EMPTY_ARR.push.apply(c._renderCallbacks, c._stateCallbacks);
				c._stateCallbacks = [];
			} else {
				do {
					c._bits &= ~COMPONENT_DIRTY;
					if (renderHook) renderHook(newVNode);

					tmp = c.render(c.props, c.state, c.context);

					c.state = c._nextState;
				} while (c._bits & COMPONENT_DIRTY && ++count < 25);
			}

			c.state = c._nextState;

			if (c.getChildContext) {
				globalContext = assign({}, globalContext, c.getChildContext());
			}

			if (
				isClassComponent &&
				oldVNode._component &&
				c.getSnapshotBeforeUpdate
			) {
				snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			const renderResult =
				tmp && tmp.type === Fragment && tmp.key == NULL
					? cloneNode(tmp.props.children)
					: tmp;

			if (newProps._parentDom) {
				tmp = oldDom;
				parentDom = newProps._parentDom;
				namespace = parentDom.namespaceURI;

				if (oldVNode.props && oldVNode.props._parentDom != parentDom) {
					oldVNode._children.some(child => {
						if (child) unmount(child, child);
					});
					oldVNode._children = NULL;
				}

				oldDom = oldVNode._children ? getDomSibling(oldVNode, 0) : NULL;
			}

			oldDom = diffChildren(
				parentDom,
				isArray(renderResult) ? renderResult : [renderResult],
				newVNode,
				oldVNode,
				globalContext,
				namespace,
				excessDomChildren,
				commitQueue,
				oldDom,
				isHydrating,
				refQueue
			);

			if (newProps._parentDom) {
				newVNode._dom = NULL;
				oldDom = tmp;
			}

			newVNode._flags &= RESET_MODE;

			if (c._renderCallbacks.length) {
				commitQueue.push(c);
			}

			if (c._bits & COMPONENT_PROCESSING_EXCEPTION) {
				c._bits &= ~(COMPONENT_PROCESSING_EXCEPTION | COMPONENT_PENDING_ERROR);
			}
		} catch (e) {
			commitQueue.length = oldCommitQueueLength;
			newVNode._original = NULL;
			if (isHydrating || excessDomChildren) {
				if (e.then) {
					let commentMarkersToFind = 0,
						startMarker;

					newVNode._flags |= isHydrating
						? MODE_HYDRATE | MODE_SUSPENDED
						: MODE_SUSPENDED;

					if (excessDomChildren) {
						for (let i = 0; i < excessDomChildren.length; i++) {
							let child = excessDomChildren[i];
							if (!child) continue;

							if (child.nodeType == 8) {
								excessDomChildren[i] = NULL;
								if (child.data.startsWith('$s')) {
									if (!commentMarkersToFind++) startMarker = child;
								} else if (
									child.data.startsWith('/$s') &&
									!--commentMarkersToFind
								) {
									oldDom = child;
									break;
								}
							} else if (commentMarkersToFind) {
								excessDomChildren[i] = NULL;
							}
						}
					}

					if (!startMarker) {
						while (oldDom && oldDom.nodeType == 8 && oldDom.nextSibling) {
							oldDom = oldDom.nextSibling;
						}

						if (excessDomChildren) {
							excessDomChildren[excessDomChildren.indexOf(oldDom)] = NULL;
						}
						startMarker = oldDom;
					}
					newVNode._component._excess = startMarker;
					newVNode._dom = oldDom;
				} else if (excessDomChildren) {
					excessDomChildren.some(removeNode);
				}
			} else {
				newVNode._dom = oldVNode._dom;
			}

			if (!newVNode._children) {
				newVNode._children = oldVNode._children || [];
			}

			if (!e.then) markAsForce(newVNode);
			options._catchError(e, newVNode, oldVNode);
		}
	} else {
		oldDom = newVNode._dom = diffElementNodes(
			oldVNode._dom,
			newVNode,
			oldVNode,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			isHydrating,
			refQueue,
			parentDom
		);
	}

	if ((tmp = options.diffed)) tmp(newVNode);

	return newVNode._flags & MODE_SUSPENDED ? UNDEFINED : oldDom;
}

function markAsForce(vnode) {
	if (vnode) {
		if (vnode._component) vnode._component._bits |= COMPONENT_FORCE;
		if (vnode._children) vnode._children.some(markAsForce);
	}
}

export function commitRoot(commitQueue, root, refQueue) {
	for (let i = 0; i < refQueue.length; ) {
		applyRef(refQueue[i++], refQueue[i++], refQueue[i++]);
	}

	if (options._commit) options._commit(root, commitQueue);

	commitQueue.some(c => {
		try {
			commitQueue = c._renderCallbacks;
			c._renderCallbacks = [];
			commitQueue.some(cb => {
				cb.call(c);
			});
		} catch (e) {
			options._catchError(e, c._vnode);
		}
	});
}

function cloneNode(node) {
	if (typeof node != 'object' || node == NULL || node._depth) {
		return node;
	}

	if (isArray(node)) {
		return node.map(cloneNode);
	}

	if (node.constructor !== UNDEFINED) return NULL;

	return assign({ constructor: UNDEFINED }, node);
}

function diffElementNodes(
	dom,
	newVNode,
	oldVNode,
	globalContext,
	namespace,
	excessDomChildren,
	commitQueue,
	isHydrating,
	refQueue,
	parentDom
) {
	let oldProps = oldVNode.props || EMPTY_OBJ;
	const newProps = newVNode.props;
	const nodeType = newVNode.type;
	let i;
	let newHtml;
	let oldHtml;
	let newChildren;
	let value;
	let inputValue;
	let checked;

	if (nodeType == 'svg') namespace = SVG_NAMESPACE;
	else if (nodeType == 'math') namespace = MATH_NAMESPACE;
	else if (!namespace) namespace = XHTML_NAMESPACE;

	if (excessDomChildren) {
		for (i = 0; i < excessDomChildren.length; i++) {
			value = excessDomChildren[i];

			if (
				value &&
				(nodeType ? value.localName == nodeType : value.nodeType == 3)
			) {
				dom = value;
				excessDomChildren[i] = NULL;
				break;
			}
		}
	}

	if (!dom) {
		const doc = parentDom.ownerDocument;
		if (!nodeType) {
			return doc.createTextNode(newProps);
		}

		dom = doc.createElementNS(namespace, nodeType, newProps.is && newProps);

		if (isHydrating) {
			if (options._hydrationMismatch)
				options._hydrationMismatch(newVNode, excessDomChildren);
			isHydrating = false;
		}
		excessDomChildren = NULL;
	}

	if (!nodeType) {
		if (oldProps !== newProps && (!isHydrating || dom.data != newProps)) {
			dom.data = newProps;
		}
	} else {
		parentDom = nodeType == 'template' ? dom.content : dom;

		excessDomChildren =
			nodeType == 'textarea' && newProps.defaultValue != NULL
				? NULL
				: excessDomChildren && slice.call(parentDom.childNodes);

		if (!isHydrating && excessDomChildren) {
			oldProps = {};
			for (i = 0; i < dom.attributes.length; i++) {
				value = dom.attributes[i];
				oldProps[value.name] = value.value;
			}
		}

		for (i in oldProps) {
			value = oldProps[i];
			if (i == 'dangerouslySetInnerHTML') {
				oldHtml = value;
			} else if (
				i != 'children' &&
				!(i in newProps) &&
				!(i == 'value' && 'defaultValue' in newProps) &&
				!(i == 'checked' && 'defaultChecked' in newProps)
			) {
				setProperty(dom, i, NULL, value, namespace);
			}
		}

		const shouldRevalidateProps = oldVNode._flags & FORCE_PROPS_REVALIDATE;
		for (i in newProps) {
			value = newProps[i];
			if (i == 'children') {
				newChildren = value;
			} else if (i == 'dangerouslySetInnerHTML') {
				newHtml = value;
			} else if (i == 'value') {
				inputValue = value;
			} else if (i == 'checked') {
				checked = value;
			} else if (
				(!isHydrating || typeof value == 'function') &&
				(oldProps[i] !== value || (shouldRevalidateProps && value != NULL))
			) {
				setProperty(dom, i, value, oldProps[i], namespace);
			}
		}

		if (newHtml) {
			if (
				!isHydrating &&
				(!oldHtml ||
					(newHtml.__html != oldHtml.__html && newHtml.__html != dom.innerHTML))
			) {
				dom.innerHTML = newHtml.__html;
			}

			newVNode._children = [];
		} else {
			if (oldHtml) dom.textContent = '';

			if (
				nodeType == 'foreignObject' ||
				(namespace == MATH_NAMESPACE && MATHML_TOKEN_ELEMENTS.test(nodeType))
			) {
				namespace = XHTML_NAMESPACE;
			}

			diffChildren(
				parentDom,
				isArray(newChildren) ? newChildren : [newChildren],
				newVNode,
				oldVNode,
				globalContext,
				namespace,
				excessDomChildren,
				commitQueue,
				excessDomChildren
					? excessDomChildren[0]
					: oldVNode._children && getDomSibling(oldVNode, 0),
				isHydrating,
				refQueue
			);

			if (excessDomChildren) excessDomChildren.some(removeNode);
		}

		if (!isHydrating || nodeType == 'textarea') {
			i = 'value';
			if (nodeType == 'progress' && inputValue == NULL) {
				dom.removeAttribute(i);
			} else if (
				inputValue != UNDEFINED &&
				(inputValue !== dom[i] || (nodeType == 'progress' && !inputValue))
			) {
				setProperty(dom, i, inputValue, oldProps[i], namespace);
			}

			i = 'checked';
			if (checked != UNDEFINED && checked != dom[i]) {
				setProperty(dom, i, checked, oldProps[i], namespace);
			}
		}
	}

	return dom;
}

export function applyRef(ref, value, vnode) {
	try {
		if (typeof ref == 'function') {
			if (typeof ref._unmount == 'function') {
				ref._unmount();
			}

			if (typeof ref._unmount != 'function' || value) {
				ref._unmount = ref(value);
			}
		} else ref.current = value;
	} catch (e) {
		options._catchError(e, vnode);
	}
}

export function unmount(vnode, parentVNode, skipRemove) {
	let r;
	if (options.unmount) options.unmount(vnode);

	if ((r = vnode.ref) && (!r.current || r.current == vnode._dom)) {
		applyRef(r, NULL, parentVNode);
	}

	if ((r = vnode._component)) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			} catch (e) {
				options._catchError(e, parentVNode);
			}
		}

		r._parentDom = r._globalContext = NULL;
	}

	if ((r = vnode._children)) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) {
				unmount(
					r[i],
					parentVNode,
					typeof vnode.type == 'function'
						? skipRemove && !vnode.props._parentDom
						: true
				);
			}
		}
	}

	if ((r = vnode._dom)) {
		if (!skipRemove) removeNode(r);
		if (r._listeners) r._listeners = NULL;
	}

	vnode._dom = vnode._component = vnode._parent = NULL;
}

function doRender(props, state, context) {
	return this.constructor(props, context);
}
