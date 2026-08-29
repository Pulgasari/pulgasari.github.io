// arr.js

// :::::: CORE

const byCriteria = (item, criteria, mode = 'every') => {
  return Object.keys(criteria).[mode](
    key => item[key] === criteria[key]
  )
}

const byAllCriteria = (item, criteria) => {
  return Object.keys(criteria).every(
    key => item[key] === criteria[key]
  )
}
const byAnyCriteria = (item, criteria) => {
  return Object.keys(criteria).some(
    key => item[key] === criteria[key]
  )
}


export const
dropByCriteria = (array, criteria = {}) => {
  return array.filter(item => !byAllCriteria(item, criteria));
};

export const
dropByAnyCriteria = (array, criteria = {}) => {
  return array.filter(item => !byAnyCriteria(item, criteria));
};

export const 
filterByCriteria = (array, criteria = {}) => {
  return array.filter(item => byAllCriteria(item, criteria));
};

export const 
filterByAnyCriteria = (array, criteria = {}) => {
  return array.filter(item => byAnyCriteria(item, criteria));
};


export const
dropByCriteria = (array, criteria = {}) => {
  return array.filter(item =>
    !Object.keys(criteria).every(
      key => item[key] === criteria[key]
    )
  );
};

export const
dropByAnyCriteria = (array, criteria = {}) => {
  return array.filter(item =>
    !Object.keys(criteria).some(
      key => item[key] === criteria[key]
    )
  );
};

export const 
filterByCriteria = (array, criteria = {}) => {
  return array.filter(item =>
    Object.keys(criteria).every(
      key => item[key] === criteria[key]
    )
  );
};

export const 
filterByAnyCriteria = (array, criteria = {}) => {
  return array.filter(item =>
    Object.keys(criteria).some(
      key => item[key] === criteria[key]
    )
  );
};

export const 
mapBy     = (array, key) => array.map(item => item[key]),
mapValues = (array, fn)  => array.map(fn);

export const sortByKey = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const left  = a[key];
    const right = b[key];

    if (left === right) return 0;

    const result = left < right ? -1 : 1;

    return direction === 'desc' ? -result : result;
  });
};

export const sortByKeys = (array, keys) => {
  const rules = Array.isArray(keys)
    ? Object.fromEntries(keys.map(key => [key, 'asc']))
    : keys;

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

export const
sortBy = (array, sort) => (typeof sort === 'string') ? sortByKey(array, sort) : sortByKeys(array, sort);      

// :::::: ARRAY SUGAR

const methods = {
  dropByCriteria,
  dropByAnyCriteria,
  filterByCriteria,
  filterByAnyCriteria,
  mapBy,
  mapValues,
  sortBy,
  sortByKey,
  sortByKeys,
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
