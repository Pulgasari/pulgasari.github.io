const MODULES = Object.fromEntries(
  manifest.modules.flatMap(
    module => (module.declarations ?? [])
      . filter (declaration => declaration.tagName)
      . map    (declaration => [declaration.tagName, module.path])
  )
);

const MODULES = Object.fromEntries(
  manifest.modules.flatMap(
    module => (module.declarations ?? [])
      . filter :: declaration => declaration.tagName
      . map    :: declaration => [declaration.tagName, module.path]
  )
);

const MODULES = Object.fromEntries(
  manifest.modules.flatMap :: =>
    (.declarations ?? [])
      |> filter :: => .tagName
      |> map    :: => [.tagName, .path]
);

const MODULES = manifest.modules.flatMap(
  module => module.declarations
            |? decl => decl.tagName
            |* decl => [decl.tagName, module.path]
) |> Object.fromEntries;


const flatModules = manifest.modules.flatMap();
const transformedModules = flatModules.map(
  module => (module.declarations ?? [])
            . filter (declaration => declaration.tagName)
            . map    (declaration => [declaration.tagName, module.path])
);
