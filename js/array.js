// @aufbau/utils/fp/array.js

// data-last array transformers, ready to drop into pipe().
// hand-written closures instead of curry(), one less rest-spread per call on a hot path.

export const

// :::::: TRANSFORM

filter  = (fn)          => list => list.filter  (fn),
flat    = (depth = 1)   => list => list.flat    (depth),
flatMap = (fn)          => list => list.flatMap (fn),
map     = (fn)          => list => list.map     (fn),
reduce  = (fn, initial) => list => list.reduce  (fn, initial),

// :::::: QUERY
  
every = fn => list => list.every (fn),
find  = fn => list => list.find  (fn),
some  = fn => list => list.some  (fn),

// :::::: ORDER & SHAPE
// sort and reverse copy first, the native methods mutate in place
  
drop    = count   => list => list.slice(count),
join    = (separator = '') => (list) => list.join(separator),
reverse = list    => [...list].reverse(),
sort    = compare => list => [...list].sort(compare),
take    = count   => list => list.slice(0, count),
uniq    = list    => [...new Set(list)],

// :::::: SEQUENCE OPS (arrays AND strings)

at       = (index)      => sequence => sequence.at       (index),
concat   = (...values)  => sequence => sequence.concat   (...values),
includes = (search)     => sequence => sequence.includes (search),
indexOf  = (search)     => sequence => sequence.indexOf  (search),
slice    = (start, end) => sequence => sequence.slice    (start, end);

/*

// return the first object matching the specified key-value pair
const findByKeyValue = (array, key, value) => {
  return array.find(item => item && item[key] === value);
};

// return the first object matching all key-value pairs in criteria
const findByCriteria = (array, criteria) => {
  return array.find(item => 
    item && Object.entries(criteria).every(([key, value]) => item[key] === value)
  );
};

// return the first object matching at least one key-value pair in criteria
const findByAnyCriteria = (array, criteria) => {
  return array.find(item => 
    item && Object.entries(criteria).some(([key, value]) => item[key] === value)
  );
};

// return all objects matching all key-value pairs in criteria
const filterByCriteria = (array, criteria) => {
  return array.filter(item => 
    item && Object.entries(criteria).every(([key, value]) => item[key] === value)
  );
};

// return all objects matching at least one key-value pair in criteria
const filterByAnyCriteria = (array, criteria) => {
  return array.filter(item => 
    item && Object.entries(criteria).some(([key, value]) => item[key] === value)
  );
};

*/
