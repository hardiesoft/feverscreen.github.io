
const path = require('path').join(__dirname, 'cptv_player_bg.wasm');
const bytes = require('fs').readFileSync(path);
let imports = {};
imports['./cptv_player.js'] = require('./cptv_player.js');

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
module.exports = wasmInstance.exports;
