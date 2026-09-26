function toElements (target) {
  if (isNullish  (target)) return [document.documentElement];
  if (isString   (target)) return [...document.querySelectorAll(target)];
  if (isElement  (target)) return [target]; // target instanceof Element
  if (isIterable (target)) return [...target].filter(isElement);
  return [];
}


function toElements (target) {
  return shift (target) ({
    isNullish  : () => [document.documentElement],
    isString   : () => [...document.querySelectorAll(target)],
    isElement  : () => [target],
    isIterable : () => [...target].filter(isElement),
    fallback   : () => [],
  });
}

const toElements = (target) => shift ({
  isNullish  : () => [document.documentElement],
  isString   : () => [...document.querySelectorAll(target)],
  isElement  : () => [target],
  isIterable : () => [...target].filter(isElement),
  fallback   : () => [],
});


