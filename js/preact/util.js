// util.js

import { EMPTY_ARR } from './constants.js';

export const 
isArray    = Array.isArray,
slice      = EMPTY_ARR.slice,
assign     = Object.assign,
removeNode = (node) => (node && node.parentNode) && node.remove();
