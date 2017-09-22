'use strict'
angular.module('magApp').controller('processRunsCtrl',
                                    ['$scope', '$location', '$state', 'Collection', 'Process', '$http', '$q',
                                    function($scope, $location, $state, Collection, Process, $http, $q) {

    $scope.graphId = $state.params.graph_id;
    var graph = $scope.graph = new dagreD3.graphlib.Graph().setGraph({});
    var allNodes = {};
    var aggregationMap = $scope.aggregationMap = {};
    var aggregationsByLength = {};
    var reverseAggregationMap = {};  // nodeIdx -> aggregated node.s
    var aggregationCounter = 0;

    var processId = $location.search().processId;
    $scope.loadingShown = false;
    $scope.tipShown = false;
    $scope.processRuns = new Collection('/api/graphs/' + $scope.graphId + '/process_runs/');
    $scope.processRuns.filter({'processId': processId});

    var labelForNode = function(node) {
        if (!node.name && node.index) {
            return node.label + ' #' + node.index;
        }
        return node.label;
    }

    var addAggregation = function(node, aggregation) {
        aggregationMap[node.id] = aggregation;
        var byLength = aggregationsByLength[aggregation.length] || [];
        byLength.push(node.id);
        aggregationsByLength[aggregation.length] = byLength;
        aggregation.forEach(function(n) {
            reverseAggregationMap[n.id] = node;
        });
    };

    var removeAggregation = function(node) {
        var aggregation = aggregationMap[node.id];
        delete aggregationMap[node.id];

        aggregation.forEach(function(node) {
            delete reverseAggregationMap[node.id];
        });
        var byLength = aggregationsByLength[aggregation.length];
        var idx = byLength.indexOf(node.id);
        if (idx > -1) {
            byLength[idx] = byLength[byLength.length - 1];
            byLength.pop();
        };
    };

    var groupArtifacts = function(nodesIds, collection) {
        var deferred = $q.defer();
        var groups = [];
        $http.post('/api/graphs/' + $scope.graphId + '/artifacts/', {nodes: nodesIds})
        .then(function(response){
            for (var key in response.data) {
                var runsAggregate = {};
                var data = response.data[key];
                if (!allNodes[data.id]) {
                    allNodes[data.id] = data;
                } else {
                    var that = allNodes[data.id];
                    that.inputs = data.inputs;
                    that.outputs = data.outputs;
                    if (reverseAggregationMap[that.id]) continue;

                    data = that;
                }
                data.outputs.forEach(function(element) {
                    var label = 'artifact';
                    if (element.type == 'process_run') label = element.label;
                    if (!runsAggregate[label]) runsAggregate[label] = 0;
                    ++runsAggregate[label];
                });
                var match = false;
                var rightKeys = Object.keys(runsAggregate);

                for (var idx in groups) {
                    var group = groups[idx];
                    var leftKeys = Object.keys(group.key);
                    var matchesLeft = leftKeys
                    .map(function(key) { return group.key[key] == runsAggregate[key]; })
                    .indexOf(true);

                    var matchesRight = rightKeys
                    .map(function(key) { return group.key[key] == runsAggregate[key]; })
                    .indexOf(true);

                    if (matchesLeft >= 0 && matchesRight >= 0 || (leftKeys.length == rightKeys.length && rightKeys.length == 0)) {
                        match = true;
                        group.objects.push(data);
                    }
                }

                if (!match) {
                    groups.push({
                        key: runsAggregate,
                        objects: [data],
                    })
                }
            }
            groups.forEach(function(group) {
                var valueObj = {};
                group.objects.forEach(function(el) {
                    valueObj[el.id] = el;
                });
                var found = false;
                var byLength = (aggregationsByLength[group.objects.length] || []);
                for (var i in byLength) {
                    var id = byLength[i];
                    var aggregation = aggregationMap[id];
                    var ok = true;
                    for (var j in aggregation) {
                        var jValue = aggregation[j];
                        var otherObj = valueObj[jValue.id];
                        if (otherObj === undefined) {
                            ok = false;
                            break;
                        };
                    };
                    if (ok) {
                        found = true;
                        collection.push({
                            id: id,
                            label: allNodes[id].label,
                            type: 'artifact',
                        });
                        break;
                    }
                };
                if (found) return;
                if (group.objects.length > 1) {
                    collection.push({
                        id: 'aggregate' + ++aggregationCounter,
                        label: 'Artifacts aggregate #' + aggregationCounter + ' (' + group.objects.length + ' nodes)',
                        type: 'artifact',
                        name: 'Artifacts aggregate #' + aggregationCounter,
                        isAggregate: true,
                        shape: 'aggregate',
                        paddingRight: 22,
                        paddingTop: 22,
                    });
                } else {
                    collection.push(group.objects[0]);
                };
                if (group.objects.length != 1) {
                    addAggregation(collection[collection.length - 1], group.objects);
                };
            });
            deferred.resolve(groups);
        });
        return deferred.promise;
    }
    var fetchAndProcess = function(url, nodesIds, rootId) {
        $scope.loadingShown = true;
        $http.post(url, {nodes: nodesIds})
        .then(function(response) {
            var outputsMap = {};
            var outputs = [];
            var outputArtifacts = [];
            var inputs = [];
            var inputsMap = {};
            var inputArtifacts = [];
            if (allNodes[rootId] && allNodes[rootId].added) {
                return;
            }

            for (var key in response.data) {
                var data = response.data[key];
                if (data.index !== null) {
                    data.name = data.label;
                    data.label += ' #' + data.index;
                }
                if (!allNodes[data.id]) {
                    allNodes[data.id] = data;
                } else {
                    var that = allNodes[data.id];
                    that.inputs = data.inputs;
                    that.outputs = data.outputs;
                    data = that;
                }
                var node = data;
                if (rootId == node.id) {
                    graph.setNode(node.id, node);
                    reverseAggregationMap[node.id] = node;
                };

                node = allNodes[rootId];
                if (!node) {
                    allNodes[rootId] = node = {label: rootId, type: data.type};
                    graph.setNode(rootId, node);
                    reverseAggregationMap[data.id] = node;
                };
                node.added = true;
                node.style = 'fill: green';
                (aggregationMap[node.id] || []).forEach(function(node) {
                    node = allNodes[node.id];
                    node.added = true;
                    node.style = 'fill: green';
                });

                data.inputs.forEach(function(input) {
                    if (input.type == 'artifact') {
                        inputArtifacts.push(input.id);
                    } else {
                        if (reverseAggregationMap[input.id]) {
                            inputs.push(reverseAggregationMap[input.id]);
                            return;
                        };

                        if (!inputsMap[input.label]) {
                            inputsMap[input.label] = [];
                        };
                        inputsMap[input.label].push(input);
                    }
                });


                data.outputs.forEach(function(output) {
                    if (output.type == 'artifact') {
                        outputArtifacts.push(output.id);
                    } else {
                        if (reverseAggregationMap[output.id]) {
                            outputs.push(reverseAggregationMap[output.id]);
                            return;
                        };

                        if (!outputsMap[output.label]) {
                            outputsMap[output.label] = [];
                        };
                        outputsMap[output.label].push(output);
                    }
                });
            }

            var aggregateMap = function(map, collection) {
                for (var key in map) {
                    var value = map[key];
                    var valueObj = {};
                    value.forEach(function(el) {
                        valueObj[el.id] = el;
                    });
                    value = Object.keys(valueObj).map(function(key) {
                        return valueObj[key];
                    });
                    var found = false;
                    var byLength = (aggregationsByLength[value.length] || []);
                    for (var i in byLength) {
                        var id = byLength[i];
                        var aggregation = aggregationMap[id];
                        var ok = true;
                        for (var j in aggregation) {
                            var jValue = aggregation[j];
                            var otherObj = valueObj[jValue.id];
                            if (otherObj === undefined) {
                                ok = false;
                                break;
                            };
                        };
                        if (ok) {
                            found = true;
                            collection.push({
                                id: id,
                                label: allNodes[id].label,
                            });
                            break;
                        }
                    };
                    if (found) continue;
                    if (value.length > 1) {
                        collection.push({
                            id: 'aggregate' + ++aggregationCounter,
                            label: value[0].label + ' aggregate #' + aggregationCounter + ' (' + value.length + ' nodes)',
                            isAggregate: true,
                            shape: 'aggregate',
                            name: value[0].label + ' aggregate #' + aggregationCounter,
                            paddingRight: 22,
                            paddingTop: 22,
                        });
                        value.sort(function(a, b) { return a.index - b.index; });
                    } else {
                        collection.push(value[0]);
                    };

                    addAggregation(collection[collection.length - 1], value);
                };
            };
            aggregateMap(inputsMap, inputs);
            aggregateMap(outputsMap, outputs);

            var flat = function(obj) {
                var values = Object.keys(obj).map(function(key) { return obj[key]; });
                var result = [];
                return result.concat.apply(result, values).map(function(el) { return el.id; });
            }
            var ns = flat(inputsMap).concat(flat(outputsMap));
            return $http.post('/api/graphs/' + $scope.graphId + '/process_runs/', {nodes: ns})
            .then(function(response) {
                for (var key in response.data) {
                    var node = response.data[key];
                    if (!allNodes[node.id]) {
                        allNodes[node.id] = node;
                    } else {
                        var thatNode = allNodes[node.id];
                        thatNode.inputs = node.inputs;
                        thatNode.outputs = node.outputs;
                    };
                };
            })
            .then(function() { return groupArtifacts(inputArtifacts, inputs); })
            .then(function() { return groupArtifacts(outputArtifacts, outputs); })
            .then(function() {
                var processInputOutput = function (reverseEdge) {
                    return function(item) {
                        if (!allNodes[item.id]) {
                            allNodes[item.id] = item;
                        } else {
                            item = allNodes[item.id];
                        }

                        if (!item.name && item.index) {
                            item.name = item.label;
                            item.label += ' #' + item.index;
                        }

                        if (reverseEdge) {
                            var source = rootId;
                            var target = item.id;
                        } else {
                            var source = item.id;
                            var target = rootId;
                        }

                        if (!graph.node(item.id)) {
                            graph.setNode(item.id, item);
                            if (item.id)
                                reverseAggregationMap[item.id] = item;
                            else {
                                (aggregationMap[item.id] || []).forEach(function(node) {
                                    reverseAggregationMap[node.id] = item;
                                });
                            };
                        };

                        graph.setEdge(source, target, {minlen: 2});
                    };
                };

                inputs.forEach(processInputOutput(false));
                outputs.forEach(processInputOutput(true));

                $scope.processRunsGraphAccessor.render(graph);
                if ($scope.selectedNode) {
                    $scope.selectedNode.elem.classList.add('selected');
                };
            });
        })
        .then(function() { $scope.loadingShown = false; });
    };
    $scope.selectedNodeName = null;
    $scope.selectedNode = null;
    $scope.processRunsGraphAccessor = {
        nodeClicked: function(nodeId) {
            if ($scope.selectedNode && nodeId == $scope.selectedNode.id) {
                var node = allNodes[nodeId];
                if (node && node.type == 'artifact') {
                    var ids = (aggregationMap[nodeId] || [node]).map(function(node) {
                        return node.id;
                    });
                    fetchAndProcess(
                        '/api/graphs/' + $scope.graphId + '/artifacts/',
                        ids,
                        nodeId
                    );
                } else if (node) {
                    var ids = (aggregationMap[nodeId] || [node]).map(function(node) {
                        return node.id;
                    });
                    fetchAndProcess(
                        '/api/graphs/' + $scope.graphId + '/process_runs/',
                        ids,
                        nodeId
                    );
                }
            } else {
                if ($scope.selectedNode) {
                    $scope.selectedNode.elem.classList.remove('selected');
                }
                var node = allNodes[nodeId];
                $scope.selectedNode = node;
                node.elem.classList.add('selected');
            }
        },
    };
    $scope.selectedProcessRun = null;
    $scope.selectProcessRun = function(processRun) {
        $scope.tipShown = false;
        if (processRun.added) return;

        fetchAndProcess(
            '/api/graphs/' + $scope.graphId + '/process_runs/',
            [processRun.id],
            processRun.id
        );
    };

    $scope.splitNode = function(nodeToSplit, aggregationNode, render, cascade) {
        $scope.loadingShown = true;
        splitNode(nodeToSplit, aggregationNode, render, cascade);
        $scope.loadingShown = false;
    };

    var splitNode = function(nodeToSplit, aggregationNode, render, cascade) {
        render = render == true || render == undefined;
        cascade = cascade == true || cascade == undefined;
        if (render) $scope.loadingShown = true;
        var idx = -1;
        var aggregation = aggregationMap[aggregationNode.id];
        if (!aggregation) return;

        // Remove node from aggregation list.
        for (idx in aggregation) {
            if (aggregation[idx].id == nodeToSplit.id) break;
        };

        if (idx > -1) {
            removeAggregation(aggregationNode);
            aggregation.splice(idx, 1);
            delete allNodes[aggregationNode.id];

            if (aggregation.length) {
                addAggregation(aggregationNode, aggregation);
                aggregationNode.label = aggregationNode.name + ' (' + aggregation.length + ' nodes)';
                allNodes[aggregationNode.id] = aggregationNode;

                if (aggregation.length == 1) {
                    splitNode(aggregation[0], aggregationNode, false, cascade);
                }
            } else {
                graph.removeNode(aggregationNode.id);
                if ($scope.selectedNode == aggregationNode)
                    $scope.selectedNode = null;
            }
        }

        if (!nodeToSplit.name && nodeToSplit.index) {
            nodeToSplit.name = nodeToSplit.label;
            nodeToSplit.label += ' #' + nodeToSplit.index;
        };

        if (graph.node(nodeToSplit.id))
            return;

        var node = allNodes[nodeToSplit.id];
        if (!node) {
            node = allNodes[nodeToSplit.id] = nodeToSplit;
        } else {
            node.label = nodeToSplit.label;
            node.added = aggregationNode.added;
            if (node.added) node.style = 'fill: green';
        }
        reverseAggregationMap[node.id] = node;
        graph.setNode(node.id, node);

        node.inputs.forEach(function(input) {
            if (!reverseAggregationMap[input.id]) return;
            input = allNodes[input.id] || {id: input.id};
            if (node.added || (input.added && cascade)) {
                splitNode(input, reverseAggregationMap[input.id], false, false)
                input = allNodes[input.id];
                graph.setEdge(input.id, node.id, {minlen: 2});
            };
        });
        node.outputs.forEach(function(output) {
            if (!reverseAggregationMap[output.id]) return;
            output = allNodes[output.id] || {id: output.id};
            if (node.added || (output.added && cascade)) {
                splitNode(output, reverseAggregationMap[output.id], false, false)
                output = allNodes[output.id];
                graph.setEdge(node.id, output.id, {minlen: 2});
            };
        });

        if (render) {
            $scope.processRunsGraphAccessor.render(graph);
            if ($scope.selectedNode) {
                $scope.selectedNode.elem.classList.add('selected');
            };
        };
    };

    $scope
    .processRuns
    .fetch()
    .then(function() {
        if ($scope.processRuns.objects.length === 1) {
            $scope.selectProcessRun($scope.processRuns.objects[0]);
        } else {
            $scope.tipShown = true;
        }
    });

    $scope.searchRuns = _.debounce(function(query) {
        $scope.processRuns.filter({'q': query});
        $scope.processRuns.fetch();
    }, 300);
}]);
