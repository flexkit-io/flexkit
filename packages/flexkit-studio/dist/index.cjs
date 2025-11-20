'use strict';

var core = require('@flexkit/core');
var assetManager = require('@flexkit/asset-manager');
var desk = require('@flexkit/desk');
var explorer = require('@flexkit/explorer');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var core__namespace = /*#__PURE__*/_interopNamespace(core);
var assetManager__namespace = /*#__PURE__*/_interopNamespace(assetManager);
var desk__namespace = /*#__PURE__*/_interopNamespace(desk);
var explorer__namespace = /*#__PURE__*/_interopNamespace(explorer);



exports.core = core__namespace;
exports.assetManager = assetManager__namespace;
exports.desk = desk__namespace;
exports.explorer = explorer__namespace;
Object.keys(core).forEach(function (k) {
  if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
    enumerable: true,
    get: function () { return core[k]; }
  });
});
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map