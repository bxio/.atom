'use strict';

module.exports = {
    set: function (v) {
        this.setProperty('-webkit-transform', v);
    },
    get: function () {
        return this.getPropertyValue('-webkit-transform');
    },
    enumerable: true
};
