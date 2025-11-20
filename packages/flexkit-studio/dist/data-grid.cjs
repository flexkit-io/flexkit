'use strict';

var dataGrid = require('@flexkit/core/data-grid');



Object.keys(dataGrid).forEach(function (k) {
	if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
		enumerable: true,
		get: function () { return dataGrid[k]; }
	});
});
//# sourceMappingURL=data-grid.cjs.map
//# sourceMappingURL=data-grid.cjs.map