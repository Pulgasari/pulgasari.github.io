// errors.js

export class ModflowError extends Error {

  constructor(message, { code = 'MODFLOW_ERROR', cause } = {}) {
    super(message, { cause });
    this.name = 'ModflowError';
    this.code = code;
  }

}

export class ModflowDefinitionError extends ModflowError {

  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: 'MODFLOW_DEFINITION'
    });

    this.name = 'ModflowDefinitionError';
  }

}

export class ModflowUnknownModuleError extends ModflowError {

  constructor(name) {
    super(`Module "${name}" was not defined in modflow.`, {
      code: 'MODFLOW_UNKNOWN_MODULE'
    });

    this.name   = 'ModflowUnknownModuleError';
    this.module = name;
  }

}
