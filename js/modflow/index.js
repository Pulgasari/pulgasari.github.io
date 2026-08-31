// index.js

import { Modflow } from './Modflow.js';

const modflow = new Modflow;
const mod     = modflow.proxy();

export       { mod, Modflow };
export default mod;
