'use strict'
angular.module('magApp').factory('Collection',
                                 ['$http',
                                  function($http) {
    var ctor = function(url) {
        this.url = url;
        this.pageURL = url;
        this.nextPageURL = null;
        this.prevPageURL = null;
        this.objects = [];
        this.count = 0;
        this.skip = 0;
        this.limit = 15;
        this.filters = {};
        this.page = 1;
        this.totalPages = 1;
        this.byLabel = {};
    };

    ctor.prototype.hasNext = function() {
        return !!this.nextPageURL;
    };

    ctor.prototype.hasPrev = function() {
        return !!this.prevPageURL;
    };

    ctor.prototype.prepareParams = function() {
        var params = {
            format: 'json',
            page: this.page,
        };

        for (var key in this.filters) {
            params[key] = this.filters[key];
        }

        return params
    };

    ctor.prototype.nextPage = function() {
        if (this.nextPageURL) {
            this.page += 1;
        }
        return this.fetch();
    };

    ctor.prototype.prevPage = function() {
        if (this.prevPageURL) {
            this.page -= 1;
        }
        return this.fetch();
    };

    ctor.prototype.filter = function(filters) {
        if (!filters) {
            filters = {};
        };

        for (var key in filters) {
            this.filters[key] = filters[key];
        };
    };

    ctor.prototype.fetch = function() {
        var self = this;
        var params = self.prepareParams();

        return $http.get(self.pageURL, {params: params})
                    .then(function(response) {
                        self.objects = response.data.results;
                        self.count = response.data.count;
                        self.prevPageURL = response.data.previous;
                        self.nextPageURL = response.data.next;
                        self.totalPages = Math.ceil(self.count / self.limit);
                        self.byLabel = {};
                        self.objects.forEach(function(obj) {
                            self.byLabel[obj.label] = obj;
                        });
                    });
    };

    return ctor;
}]);
