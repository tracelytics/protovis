pv.SvgScene.label = function(scenes) {
  var e = scenes.$g.firstChild;
  for (var i = 0; i < scenes.length; i++) {
    var s = scenes[i];

    /* visible */
    if (!s.visible) continue;
    var fill = s.textStyle;
    if (!fill.opacity || !s.text) continue;

    /* text-baseline, text-align */
    var x = 0, y = 0, dy = 0, anchor = "start";
    switch (s.textBaseline) {
      case "middle":
          if (pv.renderer() == 'svgweb')
              y = 3; // flex doesn't seem to use dy, so this moves it to be 'about right'
          else
              dy = ".35em";
          break;
      case "top":
          if (pv.renderer() == 'svgweb') {
              y = 9 + s.textMargin; // flex doesn't seem to use dy, so this moves it to be 'about right'
          } else {
              dy = ".71em"; y = s.textMargin;
          }
        break;
      case "bottom": y = "-" + s.textMargin; break;
    }
    switch (s.textAlign) {
      case "right": anchor = "end"; x = "-" + s.textMargin; break;
      case "center": anchor = "middle"; break;
      case "left": x = s.textMargin; break;
    }

    e = this.expect(e, "text", {
        "pointer-events": s.events,
        "cursor": s.cursor,
        "x": x,
        "y": y,
        "dy": dy,
        "transform": "translate(" + s.left + "," + s.top + ")"
            + (s.textAngle ? " rotate(" + 180 * s.textAngle / Math.PI + ")" : "")
            + (this.scale != 1 ? " scale(" + 1 / this.scale + ")" : ""),
        "fill": fill.color,
        "fill-opacity": fill.opacity || null,
        "text-anchor": anchor
      }, {
        "font": s.font,
        "text-shadow": s.textShadow,
        "text-decoration": s.textDecoration
      });
    if (e.firstChild) e.firstChild.nodeValue = s.text;
    else {
        if (pv.renderer() == "svgweb") { // SVGWeb needs an extra 'true' to create SVG text nodes properly in IE.
            e.appendChild(document.createTextNode(s.text, true));
        } else {
            e.appendChild(document.createTextNode(s.text));
        }
    }

    e = this.append(e, scenes, i);
  }
  return e;
};
