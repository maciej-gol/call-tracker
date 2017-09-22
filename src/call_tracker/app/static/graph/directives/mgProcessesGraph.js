'use strict'
angular.module('magApp').directive('mgProcessesGraph',
                                   ['$http', '$state',
                                   function($http, $state) {

    var render_processes_graph = function(data, scope, element, attrs) {
      var data = processNodes(data);
      var graph = data.graph;

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
      renderColorLegend(svg, defs, data);

      graph.nodes().forEach(function(node) {
        node = graph.node(node);
        node.elem.addEventListener('click', function() {
          scope.accessor.processClicked(node.label);
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
      var margin = 0.9;
      var scaleX = (svgWidth * margin) / maxX;
      var scaleY = (svgHeight * margin) / maxY;
      var scale = Math.min(scaleX, scaleY);

      // Perform translation and scaling.
      var centerX = (svgWidth / 2) - (maxX - minX) / 2 * scale;
      var centerY = (svgHeight / 2) - (maxY - minY) / 2 * scale;
      zoom.translate([centerX, centerY]);
      zoom.scale(scale);
      zoom.event(svg);

      var selectedProcess = null;
      scope.accessor.selectProcess = function(processName) {
        var node = graph.node(processName);
        if (!node) return;

        if (selectedProcess) selectedProcess.classList.remove('selected');
        node.elem.classList.add('selected');
        selectedProcess = node.elem;
      };
    };

    var renderColorLegend = function(svg, defs, data) {
      var colorDomains = data.colorDomains;
      var colorRanges = data.colorRanges;
      var median = data.median;
      // var median = 0.5;
      var minRuns = data.minRuns;
      var maxRuns = data.maxRuns;

      // Insert the process runs color legend.
      var colorLegendGradient = defs.append('linearGradient')
                                    .attr('id', 'colorLegendGradient')
                                    .attr('x1', '0%')
                                    .attr('y1', '0%')
                                    .attr('x2', '0%')
                                    .attr('y2', '100%');

      colorDomains.forEach(function(domain, idx) {
        colorLegendGradient.append('stop').attr('offset', domain * 100 + '%')
                                          .attr('style', 'stop-opacity: 1; stop-color: ' + colorRanges[idx]);
      });

      if (minRuns != maxRuns) {
        var legendContainer = svg.append("g").attr('transform', 'translate(10,10)');
        legendContainer.append("rect")
                       .attr('class', 'color-legend')
                       .attr('height', '100')
                       .attr('width', '90');

        legendContainer.append('text')
                       .text('Number of runs:')
                       .attr('transform', 'translate(2,12)')
                       .attr('fill', 'gray')
                       .attr('font-size', '10');

        legendContainer.append('rect')
                       .attr('x', '4')
                       .attr('y', '16')
                       .attr('fill', 'url(#colorLegendGradient)')
                       .attr('stroke', '#333')
                       .attr('stroke-width', '0.5')
                       .attr('height', '80')
                       .attr('width', '10');

        legendContainer.append('text')
                       .text(minRuns)
                       .attr('transform', 'translate(16,21)')
                       .attr('fill', 'gray')
                       .attr('font-size', '10')

        legendContainer.append('text')
                       .text(Math.round(minRuns + median * (maxRuns - minRuns)))
                       .attr('transform', 'translate(16,' + (21 + 75 * median) + ')')
                       .attr('fill', 'gray')
                       .attr('font-size', '10')

        legendContainer.append('text')
                       .text(maxRuns)
                       .attr('transform', 'translate(16,96)')
                       .attr('fill', 'gray')
                       .attr('font-size', '10')
      };
    }

    var processNodes = function(data) {
      var g = new dagreD3.graphlib.Graph().setGraph({});
      var median = data.median;
      // var median = 0.5;
      var min_median_range = Math.max(0, median - 0.1);
      var max_median_range = Math.min(1, median + 0.1);
      var minRuns = Infinity;
      var maxRuns = 0;
      var domains = [];
      var ranges = [];

      // Build the min_median_range scale. If the median is not 0, there will be some
      // values below it.
      if (min_median_range != 0) {
        domains.push(0);
        ranges.push('lawngreen');
      }

      domains.push(min_median_range);
      ranges.push('white');
      domains.push(max_median_range);
      ranges.push('white');

      // If the median is not the highest value, insert the save val.
      if (max_median_range != 1) {
        domains.push(1);
        ranges.push('red');
      }

      var weight_color_scale = d3.scale.linear().domain(domains).range(ranges);
      // Process each node and paint it accordingly to it's process runs.
      // Also compute the minimum and maximum number of runs of processes so
      // that we can scale the legend properly.
      d3.values(data.processes).forEach(function(node) {
        var n = g.node(node.label) || {};
        n.label = node.label;
        n.style = 'fill: ' + weight_color_scale(node.weight);
        g.setNode(node.label, n);
        minRuns = Math.min(minRuns, node.runs);
        maxRuns = Math.max(maxRuns, node.runs);

        node.outputs.forEach(function(output) {
          var t = g.node(output) || {};
          t.label = output;
          g.setNode(t.label, t);
          g.setEdge(node.label, output, {minlen: 2});
        });
      });

      return {
        'minRuns': minRuns,
        'maxRuns': maxRuns,
        'median': median,
        'graph': g,
        'colorDomains': domains,
        'colorRanges': ranges,
      }
    };

    return {
        restrict: 'E',
        replace: true,
        scope: {
          'accessor': '=',
          'graphId': '=',
        },
        link: function(scope, element, attrs) {
            scope.accessor.selectProcess = function(processName) {};

            $http.get('/api/graphs/' + scope.graphId + '/')
                 .then(function(response) {
                    render_processes_graph(response.data, scope, element);
                 });
        },
    };
}]);
