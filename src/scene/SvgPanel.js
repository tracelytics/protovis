pv.SvgScene.panel = function(scenes) {
  var g = scenes.$g, e = g && g.firstChild;
  var complete = false;
  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];

    /* visible */
    if (!s.visible) continue;

    /* svg */
    if (!scenes.parent) {
      s.canvas.style.display = "inline-block";
      if (g && (g.parentNode != s.canvas)) {
        g = s.canvas.firstChild;
        e = g && g.firstChild;
      }
      if (!g) {
        g = this.create("svg");
        g.setAttribute("font-size", "10px");
        g.setAttribute("font-family", "sans-serif");
        g.setAttribute("fill", "none");
        g.setAttribute("stroke", "none");
        g.setAttribute("stroke-width", 1.5);

        if (pv.renderer() == "svgweb") { // SVGWeb requires a separate mechanism for setting event listeners.
            // width/height can't be set on the fragment
            g.setAttribute("width", s.width + s.left + s.right);
            g.setAttribute("height", s.height + s.top + s.bottom);

            var frag = document.createDocumentFragment(true);

            g.addEventListener('SVGLoad', function() {
                /**
                 * This hack was based off a suggestion by Idearat <scott.shattuck@gmail.com>
                 * on the protovis mailing list to work around the SVGWeb
                 * SVGLoad event being called prior to the scene graph being
                 * completed, and causing errors when listeners executed. As
                 * described by him:
                 *
                        So I've been running into a consistent issue with protovis + svgweb
                        integration where I get an empty (white screen) as many folks have
                        previously reported.

                        The section of that code with the if (pv.renderer() == "svgweb") block
                        follows the advice for SVGWeb integration which says to a)
                        addEventListener('SVGLoad', ...) and to use svgweb.appendChild(). The
                        problem is that the svgweb.appendChild call immediately turns around
                        and invokes any event listeners on the newly appended nodes...and the
                        "frag" can still be empty at that point. This can be confirmed in a
                        debugger's stack trace.

                        This new version effectively says run the (now embedded in func)
                        handler logic immediately if complete, otherwise try again shortly
                        via setTimeout every 100ms until we've completed the scene graph.

                        I've run this through a number of graphs within a complex application
                        with PHP, JQuery, YUI and other libs in the mix and it consistently
                        draws the graphs with no more white/blank display.

                * Until a better solution comes along, lets use this.
                */
                var me = this;
                var callback = function () {
                    if (complete) {
                        complete = false;
                        me.appendChild(frag);
                        for (var j = 0; j < pv.Scene.events.length; j++) {
                          me.addEventListener(pv.Scene.events[j], pv.SvgScene.dispatch, false);
                        }
                        scenes.$g = me;
                    } else {
                        setTimeout(callback, 10);
                    }
                }
                callback();

            }, false);

            svgweb.appendChild (g, s.canvas);
            g = frag;
        } else {
            for (var j = 0; j < this.events.length; j++) {
              g.addEventListener(this.events[j], this.dispatch, false);
            }
            g = s.canvas.appendChild(g);
        }

        e = g.firstChild;
      }
      scenes.$g = g;
      if (pv.renderer() != 'svgweb') {
        g.setAttribute("width", s.width + s.left + s.right);
        g.setAttribute("height", s.height + s.top + s.bottom);
      }
    }

    /* clip (nest children) */
    if (s.overflow == "hidden") {
      var id = pv.id().toString(36),
          c = this.expect(e, "g", {"clip-path": "url(#" + id + ")"});
      if (!c.parentNode) g.appendChild(c);
      scenes.$g = g = c;
      e = c.firstChild;

      e = this.expect(e, "clipPath", {"id": id});
      var r = e.firstChild || e.appendChild(this.create("rect"));
      r.setAttribute("x", s.left);
      r.setAttribute("y", s.top);
      r.setAttribute("width", s.width);
      r.setAttribute("height", s.height);
      if (!e.parentNode) g.appendChild(e);
      e = e.nextSibling;
    }

    /* fill */
    e = this.fill(e, scenes, i);

    /* transform (push) */
    var k = this.scale,
        t = s.transform,
        x = s.left + t.x,
        y = s.top + t.y;
    this.scale *= t.k;

    /* children */
    for (var j = 0; j < s.children.length; j++) {
      s.children[j].$g = e = this.expect(e, "g", {
          "transform": "translate(" + x + "," + y + ")"
              + (t.k != 1 ? " scale(" + t.k + ")" : "")
        });
      this.updateAll(s.children[j]);
      if (!e.parentNode) g.appendChild(e);
      e = e.nextSibling;
    }

    /* transform (pop) */
    this.scale = k;

    /* stroke */
    e = this.stroke(e, scenes, i);

    /* clip (restore group) */
    if (s.overflow == "hidden") {
      scenes.$g = g = c.parentNode;
      e = c.nextSibling;
    }
  }
  complete = true;
  return e;
};

pv.SvgScene.fill = function(e, scenes, i) {
  var s = scenes[i], fill = s.fillStyle;
  if (fill.opacity || s.events == "all") {
    e = this.expect(e, "rect", {
        "shape-rendering": s.antialias ? null : "crispEdges",
        "pointer-events": s.events,
        "cursor": s.cursor,
        "x": s.left,
        "y": s.top,
        "width": s.width,
        "height": s.height,
        "fill": fill.color,
        "fill-opacity": fill.opacity,
        "stroke": null
      });
    e = this.append(e, scenes, i);
  }
  return e;
};

pv.SvgScene.stroke = function(e, scenes, i) {
  var s = scenes[i], stroke = s.strokeStyle;
  if (stroke.opacity || s.events == "all") {
    e = this.expect(e, "rect", {
        "shape-rendering": s.antialias ? null : "crispEdges",
        "pointer-events": s.events == "all" ? "stroke" : s.events,
        "cursor": s.cursor,
        "x": s.left,
        "y": s.top,
        "width": Math.max(1E-10, s.width),
        "height": Math.max(1E-10, s.height),
        "fill": null,
        "stroke": stroke.color,
        "stroke-opacity": stroke.opacity,
        "stroke-width": s.lineWidth / this.scale
      });
    e = this.append(e, scenes, i);
  }
  return e;
};
