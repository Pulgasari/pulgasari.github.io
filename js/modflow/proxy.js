// proxy.js

export function createModuleProxy(modflow) {

  return new Proxy(modflow, {

    get(target, property, receiver) {

      // symbols / inspect / native internals
      if (typeof property === 'symbol') {
        return Reflect.get(target, property, receiver);
      }

      // public Modflow API:
      // mod.define(...)
      // mod.load(...)
      // mod.preload(...)
      // mod.state(...)
      if (property in target) {
        return Reflect.get(target, property, receiver);
      }

      // unknown module
      if (!target.has(property)) {
        return undefined;
      }

      return createModuleStub(
        target,
        property
      );
    }
  });
}


function createModuleStub(modflow, name) {

  const load = () =>
    modflow.load(name);

  return new Proxy(function () {}, {

    get(_, property) {

      /*
       * Promise assimilation:
       *
       * await mod.foo
       *
       * JavaScript asks for `.then`.
       */
      if (property === 'then') {
        return (resolve, reject) =>
          load().then(resolve, reject);
      }

      /*
       * Useful debugging.
       */
      if (property === 'toString') {
        return () =>
          `[Modflow module: ${name}]`;
      }

      /*
       * Direct properties:
       *
       * mod.foo.bar(...)
       */
      return (...args) =>
        load().then(module => {

          const value =
            module?.[property] ??
            module?.default ??
            module;

          if (typeof value !== 'function') {
            return value;
          }

          return value.apply(module, args);
        });
    },

    apply(_, __, args) {

      /*
       * mod.foo(...)
       */
      return load().then(module => {

        const callable =
          typeof module === 'function'
            ? module
            : module?.default;

        if (typeof callable !== 'function') {
          throw new TypeError(
            `Module "${name}" is not callable.`
          );
        }

        return callable(...args);
      });
    }
  });
          }
