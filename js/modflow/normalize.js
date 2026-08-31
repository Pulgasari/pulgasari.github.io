// normalize.js

import {
  ModflowDefinitionError,
} from './errors.js';

const FLOWS = new Set([
  'eager',
  'idle',
  'lazy',
  'interaction',
]);

const isObject = value =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value);

export function normalizeDefinition(name, input) {

  const options = typeof input === 'string'
    ? { url: input }
    : input;

  if (!isObject(options)) {
    throw new ModflowDefinitionError(
      `Invalid definition for module "${name}".`
    );
  }

  if (!options.url || typeof options.url !== 'string') {
    throw new ModflowDefinitionError(
      `Module "${name}" requires a string "url".`
    );
  }

  const flow = options.flow ?? 'lazy';

  const validFlow =
    typeof flow === 'number' ||
    FLOWS.has(flow);

  if (!validFlow) {
    throw new ModflowDefinitionError(
      `Invalid flow "${String(flow)}" for module "${name}".`
    );
  }

  const deps = options.deps ?? [];

  if (!Array.isArray(deps)) {
    throw new ModflowDefinitionError(
      `Dependencies for module "${name}" must be an array.`
    );
  }

  return {
    name,

    url         : options.url,
    flow,

    deps,
    preload    : options.preload ?? false,
    prefetch   : options.prefetch ?? false,

    retry      : options.retry ?? 0,
    retryDelay : options.retryDelay ?? 250,

    timeout    : options.timeout ?? 0,

    // useful for diagnostics
    metadata   : options.metadata ?? null,
  };
}
