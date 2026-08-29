// arr.js

// :::::: CORE

export const dropByCriteria = (array, criteria = {}) => {
  return array.filter(item =>
    !Object.keys(criteria).every(
      key => item[key] === criteria[key]
    )
  );
};

export const dropByAnyCriteria = (array, criteria = {}) => {
  return array.filter(item =>
    !Object.keys(criteria).some(
      key => item[key] === criteria[key]
    )
  );
};

export const filterByCriteria = (array, criteria = {}) => {
  return array.filter(item =>
    Object.keys(criteria).every(
      key => item[key] === criteria[key]
    )
  );
};

export const filterByAnyCriteria = (array, criteria = {}) => {
  return array.filter(item =>
    Object.keys(criteria).some(
      key => item[key] === criteria[key]
    )
  );
};

export const 
mapBy     = (array, key) => array.map(item => item[key]),
mapValues = (array, fn)  => array.map(fn);

export const
sortByKey = (array, key, mode ='asc') = {

};

export const sortBy = (array, sort) => {
  const rules = typeof sort === 'string'
    ? { [sort]: 'asc' }
    : Array.isArray(sort)
      ? Object.fromEntries(sort.map(key => [key, 'asc']))
      : sort;

  return [...array].sort((a, b) => {
    for (const [key, direction] of Object.entries(rules)) {
      const left  = a[key];
      const right = b[key];

      if (left === right) continue;

      const result = left < right ? -1 : 1;

      return direction === 'desc' ? -result : result;
    }

    return 0;
  });
};


// :::::: ARRAY SUGAR

const methods = {
  dropByCriteria,
  dropByAnyCriteria,
  filterByCriteria,
  filterByAnyCriteria,
  mapBy,
  mapValues,
  sortBy,
};

export const arr = array => new Proxy({}, {
  get (_, method) {
    const fn = methods[method];

    return fn
      ? (...args) => fn(array, ...args)
      : array?.[method];
  }
});

export default arr;
