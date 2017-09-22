'use strict'
angular.module('magApp').directive('mgDirectedGraph',
                                   ['$http',
                                   function($http) {

    var render_graph = function(graph, scope, element, attrs) {
      // Set up an SVG group so that we can translate the final graph.
      var svg = d3.select(element[0]).append("svg").attr('height', '700').attr('width', '100%'),
          defs = svg.append('defs'),
          inner = svg.append('g');

      // Set up zoom support
      var zoom = d3.behavior.zoom().on("zoom", function() {
          inner.attr("transform", "translate(" + d3.event.translate + ")" +
                                      "scale(" + d3.event.scale + ")");
        });
      svg.call(zoom);

      var render = new dagreD3.render();
      render(inner, graph);

      graph.nodes().forEach(function(node) {
        node = graph.node(node);
        node.elem.addEventListener('click', function() {
          scope.$apply(function() {
            scope.accessor.nodeClicked(node.id);
          });
        });
      });

      // Calculate proper boundaries for graph centering on screen.
      var maxX = 0, maxY = 0;
      var minX = Infinity, minY = Infinity;
      graph.nodes().forEach(function(node) {
        node = graph.node(node);
        var width = node.elem.children[0].width.baseVal.value;
        var height = node.elem.children[0].height.baseVal.value;
        maxX = Math.max(node.x + width, maxX);
        minX = Math.min(node.x, minX);
        maxY = Math.max(node.y + height, maxY);
        minY = Math.min(node.y, minY);
      });

      // Calculate graph scaling factor.
      var boundingRect = svg[0][0].getBoundingClientRect();
      var svgHeight = boundingRect.height;
      var svgWidth = boundingRect.width;
      var fits = maxX < svgWidth && maxY < svgHeight;
      var scale = 1.0;

      if (!fits) {
        var margin = 0.8;
        var scaleX = (svgWidth * margin) / (maxX - minY);
        var scaleY = (svgHeight * margin) / (maxY - minY);
        if (scaleX < scaleY) {
          scale = scaleX;
        } else {
          scale = scaleY;
        }
      }

      // Perform translation and scaling.
      var centerX = (svgWidth / 2) - (maxX + minX) / 2 * scale;
      var centerY = (svgHeight / 2) - (maxY + minY) / 2 * scale;
      if (isFinite(centerX) && isFinite(centerY)) {
        zoom.translate([centerX, centerY]);
      };
      zoom.scale(scale);
      zoom.event(svg);

      var selectedProcess = null;
      scope.accessor.selectNode = function(nodeName) {
        var node = graph.node(nodeName);
        if (!node) return;

        if (selectedNode) selectedNode.classList.remove('selected');
        node.elem.classList.add('selected');
        selectedNode = node.elem;
      };
    };

    return {
        restrict: 'E',
        replace: true,
        scope: {
          'accessor': '=',
          'graph': '='
        },
        link: function(scope, element, attrs) {
            scope.accessor.selectNode = function(nodeName) {};
            scope.accessor.render = function(graph) {
              element.html('');
              render_graph(graph, scope, element, attrs);
            };
            scope.accessor.render(scope.graph);
        },
    };
}]);
