

(function(){

  var _CMTREE = function(options) {
    this._opts = options;

    this.tree = d3.layout.tree()
      .size([360, this._opts.diameter / 2 - 120])
      .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

    this.diagonal = d3.svg.diagonal.radial()
      .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });


  };

  function toggle(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
  }

  function toggleAll(d) {
    if (d.children) {
      d.children.forEach(toggleAll);
      toggle(d);
    }
  }

  _CMTREE.prototype.draw = function() {
    var self = this;
    self.svg = d3.select(self._opts.targetID)
      .append('svg')
      .attr('width', self._opts.diameter)
      .attr('height', self._opts.diameter)
      .append('g')
      .attr("transform", "translate(" + self._opts.diameter / 2 + "," + self._opts.diameter / 2 + ")");

    d3.json(self._opts.dataFile, function (e, root){
      self.data = root
      root.children.forEach(toggleAll)

      self.nodeColorScale = d3.scale.linear()
        //.domain([0, self._opts.tclosure(root)])
        .domain([0, 3517])
        .range(['white', 'black'])

      update.call(self, root);


    })
  };

  function update(source) {

    var self = this;

    var dataNodes = self.tree.nodes(self.data)

    var n = self.svg.selectAll('g.node').data(dataNodes, self._opts.keyFn)

    function transformNode(d) {
      return "rotate(" + ((d.x || 0) - 90) + ")translate(" + d.y  + ")";
    }

    function drillNode(d){
      console.log(d)
      toggle(d);
      update.call(self, d)
    }

    n.transition().duration(500).attr("transform", transformNode)

    ne = n.enter()
      .append('g')
      .attr('class', 'node')
      .attr('text', function(d) { return d.name})
      .attr("transform", transformNode)


    ne.append('circle')
      .attr('r', 4.5)
      .style('fill', function(d){
        return self.nodeColorScale(self._opts.tclosure(d))
      })
      .on('click', drillNode);

    ne.append("text")
      .attr("dy", ".31em")
      .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
      .text(function(d){
        if (self._opts.labelFn) {
          return self._opts.labelFn(d)
        } else {
          return d.name
        }
      })
      .on('click', drillNode);

    n.exit().remove()


    var dataLinks = self.tree.links(dataNodes)

    var l = self.svg.selectAll('path.link')
      .data(dataLinks, function(d) { return d.target.id; })

    l.transition()
      .duration(500)
      .attr("d", self.diagonal);

    l.enter()
      .insert('svg:path', 'g')
      .attr('class', 'link')
      .attr('d', function(d){
        var o = {x: source.x, y: source.y};
        return self.diagonal({source: o, target: o});
      })
      .transition()
      .duration(500)
      .attr("d", self.diagonal);

    l.exit().transition()
      .duration(100)
      .attr("d", function() {

        var o = {x: source.x || 0, y: source.y};
        return self.diagonal({source: o, target: o});
      })
      .remove();

  }

  window.CMTree = _CMTREE
})();