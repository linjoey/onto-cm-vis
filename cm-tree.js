

(function(){

  function _CMTREE (options) {
    this._opts = options;

    this.tree = d3.layout.tree()
      .size([360, this._opts.diameter / 2 - 120])
      .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; })


    this.diagonal = d3.svg.diagonal.radial()
      .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

    this.tooltip = d3.tip().attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d){
        return d.name
      })



  };

  function toggle(d) {
    if (d.children) {
      d.expanded = false;
      d._children = d.children;
      d.children = null;
    } else {
      d.expanded = true;
      d.children = d._children;
      d._children = null;
    }
  }

  _CMTREE.prototype.initData = function(d) {

    if (d === undefined) { return }
    var self = this;
    d['expanded'] = false;

    if (d && d.children) {
      d.children.sort(function(a,b) {
        return b[self._opts.tclosure] - a[self._opts.tclosure]
      });

      d.children.forEach(function(d){
        self.initData.call(self, d)
      });
      toggle(d);
    }
  };

  _CMTREE.prototype.draw = function() {
    var self = this;
    self.svg = d3.select(self._opts.targetID)
      .append('svg')
      .attr('width', self._opts.diameter)
      .attr('height', self._opts.diameter)
      .append('g')
      .attr("transform", "translate(" + self._opts.diameter / 2 + "," + self._opts.diameter / 2 + ")");

    self.svg.call(self.tooltip)

    d3.json(self._opts.dataFile, function (e, root){
      self.data = root;

      self.initData(root)

      self.nodeColorScale = d3.scale.linear()
        //TODO remove hardcode
        //.domain([0, self._opts.tclosure(root)])
        .domain([0, 3517])
        .range(['white', 'steelblue'])

      update.call(self, root);

    });
  };

  //source is the node clicked
  function update(source) {

    var self = this;

    //only show 8
    if (source.children && source.children.length > 8) {
      var fh = source.children.slice(0, 8);
      var sh = source.children.slice(8, source.children.length);

      var an = {
        name: '[...](' + sh.length + ')',
        _children: sh,
        children: null,
        expanded: false,
        id: source.id + 'rem'
      };

      fh.push(an);
      source.children = fh
    }

    var dataNodes = self.tree.nodes(self.data)

    var n = self.svg.selectAll('g.node').data(dataNodes, self._opts.keyFn);

    function transformNode(d) {
      return "rotate(" + ((d.x || 0) - 90) + ")translate(" + d.y  + ")";
    }

    function unclutterText(src, reverse) {

      if (src.parent) {

        var p = src.parent

        var nhide = p.children.filter(function(v) {
          return v.id !== src.id
        });
        var selNodes = d3.selectAll('g.node').data(nhide, self._opts.keyFn)
          .select('text')

        if(!reverse) {
          selNodes.style('visibility', 'hidden')
        } else {
          selNodes.style('visibility', 'visible')
        }
      }
    }

    function drillNode(d) {

      console.log(d)

      if (d.id == self.data.id) {
        self.initData(d)
      }

      toggle(d);
      update.call(self, d)

      d3.select("[targetid='"+ d.id+"']").style('stroke', function(d) { return d.target.expanded ? 'red' : '#ccc'})
        .style('opacity', '0.5')

      if (d.depth > 1) {
        if(d.expanded) {
          unclutterText(d, false)
          unclutterText(d.parent, false)
        } else {
          unclutterText(d, true)
        }
      } else {
        unclutterText(d, true)
      }
    }

    n.transition().duration(500).attr("transform", transformNode);

    var ne = n.enter()
      .append('g')
      .attr('class', 'node')
      .attr("transform", transformNode)


    ne.append('circle')
      .attr('r', function(d){
        return d[self._opts.tclosure] > 0 ? 6 : 1
      })
      .style('fill', function(d) {
        return self.nodeColorScale(d[self._opts.tclosure])
      })
      .on('click', drillNode)
      .on('mouseover', self.tooltip.show)
      .on('mouseout', self.tooltip.hide)

    ne.append("text")
      .attr("dy", ".31em")
      .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
      .text(function(d){

        if (d.id !== self.data.id) {
          if (self._opts.labelFn) {
            return self._opts.labelFn(d)
          } else {
            return d.name
          }

        }
      })
      .on('click', drillNode);

    n.exit().remove();

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
      .attr('targetid', function(d){
        return d.target.id
      })
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