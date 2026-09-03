// constants.js

export const // Vnode._flags
MODE_HYDRATE           = 1 << 5,
MODE_SUSPENDED         = 1 << 7,
INSERT_VNODE           = 1 << 2,
MATCHED                = 1 << 1,
FORCE_PROPS_REVALIDATE = 1 << 0;

export const // component._bits
COMPONENT_PROCESSING_EXCEPTION = 1 << 0,
COMPONENT_PENDING_ERROR        = 1 << 1,
COMPONENT_FORCE                = 1 << 2,
COMPONENT_DIRTY                = 1 << 3;

export const 
RESET_MODE = ~(MODE_HYDRATE | MODE_SUSPENDED);

export const 
  SVG_NAMESPACE = 'http://www.w3.org/2000/svg',
XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml',
 MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

export const 
NULL      = null,
UNDEFINED = undefined,
EMPTY_OBJ = {},
EMPTY_ARR = [];

export const 
MATHML_TOKEN_ELEMENTS = /^m(i|n|o|s|text|space)$/;

export const
HAS_MOVE_BEFORE_SUPPORT = typeof Element < 'u' && 'moveBefore' in Element.prototype;     
