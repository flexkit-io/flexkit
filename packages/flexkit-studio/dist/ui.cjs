'use strict';

var ui = require('@flexkit/core/ui');



Object.keys(ui).forEach(function (k) {
	if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function () { return ui[k]; }
	});
});
//# sourceMappingURL=ui.cjs.map
//# sourceMappingURL=ui.cjs.map