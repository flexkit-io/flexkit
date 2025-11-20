'use strict';

var ssr = require('@flexkit/core/ssr');



Object.keys(ssr).forEach(function (k) {
	if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function () { return ssr[k]; }
	});
});
//# sourceMappingURL=ssr.cjs.map
//# sourceMappingURL=ssr.cjs.map