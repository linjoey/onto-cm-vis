
(function() {
  "use strict";

  window.treemapvis = function(opt) {

    var last;

    var margin = {top: 20, right: 0, bottom: 20, left: 5},
      width = 450,
      height = 650 - margin.top - margin.bottom,
      formatNumber = d3.format(",d"),
      transitioning;

    var x = d3.scale.linear()
      .domain([0, width])
      .range([0, width]);

    var y = d3.scale.linear()
      .domain([0, height])
      .range([0, height]);

    var treemap = d3.layout.treemap()
      .children(function(d, depth) {

        if(depth) {
          return null
        } else {
          return d._children
        }
      })
      .sort(function(a, b) { return a.value - b.value; })
      .value(function(d) {
        return d.TotalChildren + 1
      })
      .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
      .round(false);


    var svg = d3.select(opt.targetID).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.bottom + margin.top)
      .style("margin-left", -margin.left + "px")
      .style("margin.right", -margin.right + "px")
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .style("shape-rendering", "crispEdges");

    var grandparent = svg.append("g")
      .attr("class", "grandparent");

    grandparent.append("rect")
      .attr("y", -margin.top)
      .attr("width", width)
      .attr("height", margin.top);


    grandparent.append("text")
      .attr("x", 6)
      .attr("y", 3 - margin.top)
      .attr("dy", "1em");

    d3.json("hpo.json", function(root) {
      var previousParent = root;

      initialize(root);
      accumulate(root);
      display(root);

      function initialize(root) {
        root.x = root.y = 0;
        root.dx = width;
        root.dy = height;
        root.depth = 0;
      }

      function accumulate(d) {
        d._children = d.children;
        return (d._children)
          ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
          : d.value;
      }

      function layout(d) {
        if (d._children) {
          treemap.nodes({_children: d._children});
          d._children.forEach(function(c) {
            c.x = d.x + c.x * d.dx;
            c.y = d.y + c.y * d.dy;
            c.dx *= d.dx;
            c.dy *= d.dy;
            c.parent = d;
            layout(c);
          });
        }
      }

      function display(d) {

        function computeRest(d) {

          var rest = d3.select('.rem-button')

          if(d._children.length > 7) {

            if (rest.empty()) {

              rest = svg.append('g')
                .classed('rem-button', true)
                .style('cursor','pointer');

              rest.append('rect')
                .attr('y', height)
                .attr('height', 50)
                .attr('width', width)
                .style('fill', '#ddd');

              rest.append('text')
                .text('REMAINING ...')
                .attr('y', height + 15)
                .attr('x', margin.left);

            }


            if(d.children === undefined) {
              d.children = d._children
            }

            d.children.sort(function(a,b) {
              return a['TotalChildren'] - b['TotalChildren']
            });

            var midIndex = d.children.length - 8;
            var restChildren = d.children.slice(0, midIndex);

            d._children = d.children.slice(midIndex, d.children.length)
            previousParent = d

            rest.on('click', function() {
              last = d;

              var pobj = {
                name: '...',
                TotalChildren: 1,
                children: restChildren,
                _children: d.children,
                parent: d

              };

              initialize(pobj)
              layout(pobj)
              transition(pobj)
            })

          } else {
            d3.select('.rem-button').remove()
          }
        }

        //last = d.parent
        last = d
        grandparent
          //.datum(d)
          .datum(d)
          .on("click", function(d) {
            //console.log('grandparent', d)
            computeRest(last)
            transition(last.parent)
            opt.cb(d.id, true)
          })
          .select("text")
          .text(name(d));

        computeRest(d);
        layout(d);

        var g1 = svg.insert("g", ".grandparent")
          .datum(d)
          .attr("class", "depth");

        var g = g1.selectAll("g")
          .data(d._children)
          .enter().append("g");

        g.filter(function(d) { return d._children; })
          .classed("children", true)
          .on("click", function(d){
            transition(d)
            opt.cb(d.id)
          });

        g.selectAll(".child")
          .data(function(d) { return d._children || [d]; })
          .enter().append("rect")
          .attr("class", "child")
          .call(rect);

        g.append("rect")
          .attr("class", "parent")
          .call(rect)
          .append("title")
          .text(function(d) { return d.name + ' ' + formatNumber(d.value); });

        g.append("text")
          .attr("dy", "1em")
          .text(function(d) {
            var prefix = 'Abnormality of '
            if (d.name.slice(0, prefix.length) == prefix) {
              var n = d.name.slice(prefix.length, d.name.length)
              return n.charAt(0).toUpperCase() + n.slice(1)
            }
            return d.name;
          })
          .call(text);

        function transition(d) {

          if (transitioning || !d) return;
          transitioning = true;

          var g2 = display(d),
            t1 = g1.transition().duration(350),
            t2 = g2.transition().duration(350);

          // Update the domain only after entering new elements.
          x.domain([d.x, d.x + d.dx]);
          y.domain([d.y, d.y + d.dy]);

          // Enable anti-aliasing during the transition.
          svg.style("shape-rendering", null);

          // Draw child nodes on top of parent nodes.
          svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

          // Fade-in entering text.
          g2.selectAll("text").style("fill-opacity", 0);

          // Transition to the new view.
          t1.selectAll("text").call(text).style("fill-opacity", 0);
          t2.selectAll("text").call(text).style("fill-opacity", 1);
          t1.selectAll("rect").call(rect);
          t2.selectAll("rect").call(rect);

          // Remove the old node when the transition is finished.
          t1.remove().each("end", function() {
            svg.style("shape-rendering", "crispEdges");
            transitioning = false;
          });
        }

        return g;
      }

      function text(text) {
        text.attr("x", function(d) { return x(d.x) + 6; })
          .attr("y", function(d) { return y(d.y) + 6; });
      }

      function rect(rect) {
        rect.attr("x", function(d) { return x(d.x); })
          .attr("y", function(d) { return y(d.y); })
          .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
          .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
      }

      function name(d) {
        if(d) {
          return ' < ' + d.name
        } else {
          return 'HPO'
        }
      }
    });
  }

})();