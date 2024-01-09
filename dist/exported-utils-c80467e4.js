var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { group, max, min, bisector } from "d3-array";
import { RemoteFile as RemoteFile$1 } from "generic-filehandle";
import * as PIXI from "pixi.js";
import { color } from "d3-color";
import { Bezier } from "bezier-js";
import { scaleLinear } from "d3-scale";
import { isUndefined } from "lodash-es";
import { interpolateViridis, interpolateGreys, interpolateWarm, interpolateSpectral, interpolateCividis, interpolateBuPu, interpolateRdBu, interpolateYlOrBr, interpolateRdPu } from "d3-scale-chromatic";
const DEWFAULT_TITLE_PADDING_ON_TOP_AND_BOTTOM = 6;
const DEFAULT_TRACK_HEIGHT_LINEAR = 130;
const DEFAULT_TRACK_WIDTH_LINEAR = 600;
const DEFAULT_TRACK_SIZE_2D = 600;
const DEFAULT_VIEW_SPACING = 10;
const DEFAULT_INNER_RADIUS_PROP = 0.3;
const DEFAULT_CIRCULAR_VIEW_PADDING = 0;
const DEFAULT_BACKUP_COLOR = "gray";
const colorToHex = (colorStr) => {
  let c = color(colorStr);
  if (!c) {
    c = color(DEFAULT_BACKUP_COLOR);
  }
  const hex = PIXI.utils.rgb2hex([c.rgb().r / 255, c.rgb().g / 255, c.rgb().b / 255]);
  return hex;
};
const RADIAN_GAP = 0;
function valueToRadian(v, max2, sa, ea, g) {
  const safeVal = Math.max(Math.min(max2, v), 0);
  const gap = g != null ? g : RADIAN_GAP;
  const radExtent = (ea - sa) / 360 * Math.PI * 2 - gap * 2;
  const radStart = sa / 360 * Math.PI * 2;
  return -(radStart + safeVal / max2 * radExtent) - Math.PI / 2 - gap;
}
function cartesianToPolar(x, max2, r, cx, cy, sa, ea) {
  return {
    x: cx + r * Math.cos(valueToRadian(x, max2, sa, ea)),
    y: cy + r * Math.sin(valueToRadian(x, max2, sa, ea))
  };
}
function positionToRadian(x, y, cx, cy) {
  if (cx <= x) {
    return Math.atan((y - cy) / (x - cx));
  } else {
    return Math.atan((y - cy) / (x - cx)) - Math.PI;
  }
}
function pointsToDegree(x, y, cx, cy) {
  return (Math.atan2(-(y - cy), x - cx) / Math.PI * 180 + 270) % 360;
}
function drawPoint(track, g, model) {
  var _a, _b, _c, _d, _e;
  const spec = model.spec();
  if (!spec.width || !spec.height) {
    console.warn("Size of a track is not properly determined, so visual mark cannot be rendered");
    return;
  }
  const data2 = model.data();
  const [trackWidth, trackHeight] = track.dimensions;
  const zoomLevel = model.getChannelScale("x").invert(trackWidth) - model.getChannelScale("x").invert(0);
  const circular = spec.layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const tcx = trackWidth / 2;
  const tcy = trackHeight / 2;
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  rowCategories.forEach((rowCategory) => {
    const rowPosition = model.encodedValue("row", rowCategory);
    data2.filter(
      (d) => !getValueUsingChannel(d, spec.row) || getValueUsingChannel(d, spec.row) === rowCategory
    ).forEach((d) => {
      const cx = model.encodedPIXIProperty("x-center", d);
      const cy = model.encodedPIXIProperty("y-center", d);
      const color2 = model.encodedPIXIProperty("color", d);
      const radius = model.encodedPIXIProperty("p-size", d);
      const strokeWidth = model.encodedPIXIProperty("strokeWidth", d);
      const stroke = model.encodedPIXIProperty("stroke", d);
      const opacity = model.encodedPIXIProperty("opacity", d);
      const alphaTransition = model.markVisibility(d, { width: radius, zoomLevel });
      const actualOpacity = Math.min(alphaTransition, opacity);
      if (radius <= 0.1 || actualOpacity === 0 || cx + radius < 0 || cx - radius > trackWidth) {
        return;
      }
      g.lineStyle(
        strokeWidth,
        colorToHex(stroke),
        actualOpacity,
        // alpha
        1
        // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
      );
      if (circular) {
        const r = trackOuterRadius - (rowPosition + rowHeight - cy) / trackHeight * trackRingSize;
        const pos = cartesianToPolar(cx, trackWidth, r, tcx, tcy, startAngle, endAngle);
        g.beginFill(colorToHex(color2), actualOpacity);
        g.drawCircle(pos.x, pos.y, radius);
        model.getMouseEventModel().addPointBasedEvent(d, [pos.x, pos.y, radius]);
      } else {
        g.beginFill(colorToHex(color2), actualOpacity);
        g.drawCircle(cx, rowPosition + rowHeight - cy, radius);
        model.getMouseEventModel().addPointBasedEvent(d, [cx, rowPosition + rowHeight - cy, radius]);
      }
    });
  });
}
function pointProperty(model, propertyKey, datum) {
  const xe = model.visualPropertyByChannel("xe", datum);
  const x = model.visualPropertyByChannel("x", datum);
  const size = model.visualPropertyByChannel("size", datum);
  switch (propertyKey) {
    case "x-center":
      return xe ? (xe + x) / 2 : x;
    case "y-center": {
      const ye = model.visualPropertyByChannel("ye", datum);
      const y = model.visualPropertyByChannel("y", datum);
      return ye ? (ye + y) / 2 : y;
    }
    case "p-size":
      return xe && model.spec().stretch ? (xe - x) / 2 : size;
    default:
      return void 0;
  }
}
function drawLine(g, model, trackWidth, trackHeight) {
  var _a, _b, _c, _d, _e, _f;
  const spec = model.spec();
  if (!spec.width || !spec.height) {
    console.warn("Size of a track is not properly determined, so visual mark cannot be rendered");
    return;
  }
  const data2 = model.data();
  const circular = spec.layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const trackCenterX = trackWidth / 2;
  const trackCenterY = trackHeight / 2;
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  const colorCategories = (_f = model.getChannelDomainArray("color")) != null ? _f : ["___SINGLE_COLOR___"];
  rowCategories.forEach((rowCategory) => {
    const rowPosition = model.encodedValue("row", rowCategory);
    colorCategories.forEach((colorCategory) => {
      data2.filter(
        (d) => (!getValueUsingChannel(d, spec.row) || getValueUsingChannel(d, spec.row) === rowCategory) && (!getValueUsingChannel(d, spec.color) || getValueUsingChannel(d, spec.color) === colorCategory)
      ).sort(
        (d1, d2) => (
          // draw from the left to right
          getValueUsingChannel(d1, spec.x) - getValueUsingChannel(d2, spec.x)
        )
      ).forEach((d, i) => {
        const cx = model.encodedPIXIProperty("x", d);
        const y = model.encodedPIXIProperty("y", d);
        const size = model.encodedPIXIProperty("size", d);
        const color2 = model.encodedPIXIProperty("color", d);
        const opacity = model.encodedPIXIProperty("opacity", d);
        g.lineStyle(
          size,
          colorToHex(color2),
          opacity,
          0.5
          // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
        );
        if (circular) {
          const r = trackOuterRadius - (rowPosition + rowHeight - y) / trackHeight * trackRingSize;
          const pos = cartesianToPolar(
            cx,
            trackWidth,
            r,
            trackCenterX,
            trackCenterY,
            startAngle,
            endAngle
          );
          if (i === 0) {
            g.moveTo(pos.x, pos.y);
          } else {
            g.lineTo(pos.x, pos.y);
          }
          model.getMouseEventModel().addPointBasedEvent(d, [pos.x, pos.y, 1]);
        } else {
          if (i === 0) {
            g.moveTo(cx, rowPosition + rowHeight - y);
          } else {
            g.lineTo(cx, rowPosition + rowHeight - y);
          }
          model.getMouseEventModel().addPointBasedEvent(d, [cx, rowPosition + rowHeight - y, 1]);
        }
      });
    });
  });
}
function drawBar(track, tile, model) {
  var _a, _b, _c, _d, _e, _f, _g;
  const spec = model.spec();
  if (!spec.width || !spec.height) {
    console.warn("Size of a track is not properly determined, so visual mark cannot be rendered");
    return;
  }
  const data2 = model.data();
  const [trackWidth, trackHeight] = track.dimensions;
  const tileSize = track.tilesetInfo.tile_size;
  const zoomLevel = model.getChannelScale("x").invert(trackWidth) - model.getChannelScale("x").invert(0);
  const circular = spec.layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const cx = trackWidth / 2;
  const cy = trackHeight / 2;
  const xScale = model.getChannelScale("x");
  let tileUnitWidth;
  if (tile.tileData.tilePos) {
    const { tileX, tileWidth } = track.getTilePosAndDimensions(
      tile.tileData.zoomLevel,
      tile.tileData.tilePos,
      tileSize
    );
    tileUnitWidth = xScale(tileX + tileWidth / tileSize) - xScale(tileX);
  }
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  const clipRow = !IsChannelDeep(spec.row) || IsChannelDeep(spec.row) && typeof spec.row.clip === "undefined" || spec.row.clip;
  const baselineValue = IsChannelDeep(spec.y) ? (_f = spec.y) == null ? void 0 : _f.baseline : void 0;
  const staticBaseY = (_g = model.encodedValue("y", baselineValue)) != null ? _g : 0;
  const g = tile.graphics;
  if (IsStackedMark(spec)) {
    const genomicChannel = model.getGenomicChannel();
    if (!genomicChannel || !genomicChannel.field) {
      console.warn("Genomic field is not provided in the specification");
      return;
    }
    const pivotedData = group(data2, (d) => d[genomicChannel.field]);
    const xKeys = [...pivotedData.keys()];
    xKeys.forEach((k) => {
      var _a2;
      let prevYEnd = 0;
      (_a2 = pivotedData.get(k)) == null ? void 0 : _a2.forEach((d) => {
        const color2 = model.encodedPIXIProperty("color", d);
        const stroke = model.encodedPIXIProperty("stroke", d);
        const strokeWidth = model.encodedPIXIProperty("strokeWidth", d);
        const opacity = model.encodedPIXIProperty("opacity", d);
        const y = model.encodedPIXIProperty("y", d);
        const barWidth = model.encodedPIXIProperty("width", d, { tileUnitWidth });
        const xs = model.encodedPIXIProperty("x-start", d, { markWidth: barWidth });
        const xe = xs + barWidth;
        const alphaTransition = model.markVisibility(d, { width: barWidth, zoomLevel });
        const actualOpacity = Math.min(alphaTransition, opacity);
        if (actualOpacity === 0 || barWidth <= 0 || y <= 0) {
          return;
        }
        g.lineStyle(
          strokeWidth,
          colorToHex(stroke),
          actualOpacity,
          0
          // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
        );
        let polygonForMouseEvents = [];
        if (circular) {
          const farR = trackOuterRadius - (rowHeight - prevYEnd) / trackHeight * trackRingSize;
          const nearR = trackOuterRadius - (rowHeight - y - prevYEnd) / trackHeight * trackRingSize;
          const sPos = cartesianToPolar(xs, trackWidth, nearR, cx, cy, startAngle, endAngle);
          const startRad = valueToRadian(xs, trackWidth, startAngle, endAngle);
          const endRad = valueToRadian(xs + barWidth, trackWidth, startAngle, endAngle);
          g.beginFill(colorToHex(color2), color2 === "none" ? 0 : actualOpacity);
          g.moveTo(sPos.x, sPos.y);
          g.arc(cx, cy, nearR, startRad, endRad, true);
          g.arc(cx, cy, farR, endRad, startRad, false);
          polygonForMouseEvents = Array.from(g.currentPath.points);
          g.closePath();
        } else {
          g.beginFill(colorToHex(color2), color2 === "none" ? 0 : actualOpacity);
          g.drawRect(xs, rowHeight - y - prevYEnd, barWidth, y);
          const ys = rowHeight - y - prevYEnd;
          const ye = ys + y;
          polygonForMouseEvents = [xs, ys, xs, ye, xe, ye, xe, ys];
        }
        model.getMouseEventModel().addPolygonBasedEvent(d, polygonForMouseEvents);
        prevYEnd += y;
      });
    });
  } else {
    rowCategories.forEach((rowCategory) => {
      const rowPosition = model.encodedValue("row", rowCategory);
      data2.filter((d) => {
        const rowValue = getValueUsingChannel(d, spec.row);
        return !rowValue || rowValue === rowCategory;
      }).forEach((d) => {
        const color2 = model.encodedPIXIProperty("color", d);
        const stroke = model.encodedPIXIProperty("stroke", d);
        const strokeWidth = model.encodedPIXIProperty("strokeWidth", d);
        const opacity = model.encodedPIXIProperty("opacity");
        let y = model.encodedPIXIProperty("y", d);
        let ye = model.encodedPIXIProperty("ye", d);
        if (typeof ye !== "undefined" && y > ye) {
          [y, ye] = [ye, y];
        }
        const barWidth = model.encodedPIXIProperty("width", d, { tileUnitWidth });
        const xs = model.encodedPIXIProperty("x-start", d, { markWidth: barWidth });
        const xe = xs + barWidth;
        let ys;
        if (typeof ye === "undefined") {
          ys = rowPosition + rowHeight - staticBaseY - y;
          ye = rowPosition + rowHeight - staticBaseY;
          if (IsChannelDeep(spec.y) && spec.y.flip || spec.flipY) {
            ye = ys;
            ys = rowPosition;
          }
        } else {
          ys = rowPosition + rowHeight - ye;
          ye = rowPosition + rowHeight - y;
        }
        if (clipRow) {
          ys = Math.max(rowPosition, ys);
          ys = Math.min(ys, rowPosition + rowHeight);
          ye = Math.max(rowPosition, ye);
          ye = Math.min(ye, rowPosition + rowHeight);
        }
        const alphaTransition = model.markVisibility(d, { width: barWidth, zoomLevel });
        const actualOpacity = Math.min(alphaTransition, opacity);
        if (actualOpacity === 0 || barWidth === 0 || ye - ys === 0) {
          return;
        }
        g.lineStyle(
          strokeWidth,
          colorToHex(stroke),
          actualOpacity,
          0
          // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
        );
        let polygonForMouseEvents = [];
        if (circular) {
          const farR = trackOuterRadius - ys / trackHeight * trackRingSize;
          const nearR = trackOuterRadius - ye / trackHeight * trackRingSize;
          const sPos = cartesianToPolar(xs, trackWidth, nearR, cx, cy, startAngle, endAngle);
          const startRad = valueToRadian(xs, trackWidth, startAngle, endAngle);
          const endRad = valueToRadian(xs + barWidth, trackWidth, startAngle, endAngle);
          g.beginFill(colorToHex(color2), color2 === "none" ? 0 : actualOpacity);
          g.moveTo(sPos.x, sPos.y);
          g.arc(cx, cy, nearR, startRad, endRad, true);
          g.arc(cx, cy, farR, endRad, startRad, false);
          polygonForMouseEvents = Array.from(g.currentPath.points);
          g.closePath();
        } else {
          g.beginFill(colorToHex(color2), color2 === "none" ? 0 : actualOpacity);
          g.drawRect(xs, ys, barWidth, ye - ys);
          polygonForMouseEvents = [xs, ys, xs, ye, xe, ye, xe, ys];
        }
        model.getMouseEventModel().addPolygonBasedEvent(d, polygonForMouseEvents);
      });
    });
  }
}
function barProperty(gm, propertyKey, datum, additionalInfo) {
  const x = gm.visualPropertyByChannel("x", datum);
  const xe = gm.visualPropertyByChannel("xe", datum);
  const size = gm.visualPropertyByChannel("size", datum);
  switch (propertyKey) {
    case "width":
      return size != null ? size : xe ? xe - x : additionalInfo == null ? void 0 : additionalInfo.tileUnitWidth;
    case "x-start":
      if (!(additionalInfo == null ? void 0 : additionalInfo.markWidth)) {
        return void 0;
      }
      return xe ? (x + xe - (additionalInfo == null ? void 0 : additionalInfo.markWidth)) / 2 : x - (additionalInfo == null ? void 0 : additionalInfo.markWidth) / 2;
    default:
      return void 0;
  }
}
function drawArea(HGC, track, tile, model) {
  var _a, _b, _c, _d, _e, _f;
  const spec = model.spec();
  const data2 = model.data();
  const [trackWidth, trackHeight] = track.dimensions;
  const circular = spec.layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const trackCenterX = trackWidth / 2;
  const trackCenterY = trackHeight / 2;
  const xScale = track._xScale;
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  const colorCategories = (_f = model.getChannelDomainArray("color")) != null ? _f : ["___SINGLE_COLOR___"];
  const constantOpacity = model.encodedPIXIProperty("opacity");
  const constantStrokeWidth = model.encodedPIXIProperty("strokeWidth");
  const constantStroke = model.encodedPIXIProperty("stroke");
  const graphics = tile.graphics;
  if (IsStackedMark(spec)) {
    const genomicChannel = model.getGenomicChannel();
    if (!genomicChannel || !genomicChannel.field) {
      console.warn("Genomic field is not provided in the specification");
      return;
    }
    const pivotedData = group(data2, (d) => d[genomicChannel.field]);
    const genomicPosCategories = [...pivotedData.keys()];
    graphics.lineStyle(
      constantStrokeWidth,
      colorToHex(constantStroke),
      constantOpacity,
      1
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    const prevYEndByGPos = {};
    colorCategories.forEach((colorCategory) => {
      const areaPointsTop = [];
      const areaPointsBottom = [];
      genomicPosCategories.forEach((genomicPosCategory, i, array) => {
        var _a2, _b2;
        (_b2 = (_a2 = pivotedData.get(genomicPosCategory)) == null ? void 0 : _a2.filter((d) => getValueUsingChannel(d, spec.color) === colorCategory)) == null ? void 0 : _b2.forEach((d) => {
          const xValue = +genomicPosCategory;
          const cx = xScale(xValue);
          const cy = max([model.encodedPIXIProperty("y", d), 0]);
          if (typeof prevYEndByGPos[genomicPosCategory] === "undefined") {
            prevYEndByGPos[genomicPosCategory] = 0;
          }
          const ys = rowHeight - cy - prevYEndByGPos[genomicPosCategory];
          const ye = rowHeight - prevYEndByGPos[genomicPosCategory];
          if (circular) {
            if (i === 0) {
              const r = trackOuterRadius - rowHeight / trackHeight * trackRingSize;
              const pos = cartesianToPolar(
                cx,
                trackWidth,
                r,
                trackCenterX,
                trackCenterY,
                startAngle,
                endAngle
              );
              areaPointsTop.push([pos.x, pos.y]);
              areaPointsBottom.push([pos.x, pos.y]);
            }
            const rTop = trackOuterRadius - ys / trackHeight * trackRingSize;
            const posTop = cartesianToPolar(
              cx,
              trackWidth,
              rTop,
              trackCenterX,
              trackCenterY,
              startAngle,
              endAngle
            );
            areaPointsTop.push([posTop.x, posTop.y]);
            const rBot = trackOuterRadius - ye / trackHeight * trackRingSize;
            const posBot = cartesianToPolar(
              cx,
              trackWidth,
              rBot,
              trackCenterX,
              trackCenterY,
              startAngle,
              endAngle
            );
            areaPointsBottom.push([posBot.x, posBot.y]);
            if (i === array.length - 1) {
              const r = trackOuterRadius - rowHeight / trackHeight * trackRingSize;
              const pos = cartesianToPolar(
                cx,
                trackWidth,
                r,
                trackCenterX,
                trackCenterY,
                startAngle,
                endAngle
              );
              areaPointsTop.push([pos.x, pos.y]);
              areaPointsBottom.push([pos.x, pos.y]);
            }
            model.getMouseEventModel().addPointBasedEvent(d, [posBot.x, posBot.y, 1]);
          } else {
            if (i === 0) {
              areaPointsTop.push([cx, rowHeight]);
              areaPointsBottom.push([cx, rowHeight]);
            }
            areaPointsTop.push([cx, ys]);
            areaPointsBottom.push([cx, ye]);
            if (i === array.length - 1) {
              areaPointsTop.push([cx, rowHeight]);
              areaPointsBottom.push([cx, rowHeight]);
            }
            model.getMouseEventModel().addPointBasedEvent(d, [cx, ys, 1]);
          }
          prevYEndByGPos[genomicPosCategory] += cy;
        });
      });
      const color2 = model.encodedValue("color", colorCategory);
      graphics.beginFill(colorToHex(color2), constantOpacity);
      graphics.drawPolygon([
        ...areaPointsTop.reduce((a, b) => a.concat(b)),
        ...areaPointsBottom.reverse().reduce((a, b) => a.concat(b))
      ]);
      graphics.endFill();
    });
  } else {
    rowCategories.forEach((rowCategory) => {
      const rowPosition = model.encodedValue("row", rowCategory);
      graphics.lineStyle(
        constantStrokeWidth,
        colorToHex(constantStroke),
        constantOpacity,
        0
        // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
      );
      colorCategories.forEach((colorCategory) => {
        const baselinePoints = [];
        const areaPoints = [];
        const baselineR = trackOuterRadius - (rowPosition + rowHeight) / trackHeight * trackRingSize;
        let startX = 0;
        data2.filter(
          (d) => (typeof getValueUsingChannel(d, spec.row) === "undefined" || getValueUsingChannel(d, spec.row) === rowCategory) && (typeof getValueUsingChannel(d, spec.color) === "undefined" || getValueUsingChannel(d, spec.color) === colorCategory)
        ).sort(
          // should sort properly before visualizing it so that the path is correctly drawn
          (a, b) => model.encodedPIXIProperty("x", a) - model.encodedPIXIProperty("x", b)
        ).forEach((d, i, array) => {
          const cy = min([max([model.encodedPIXIProperty("y", d), 0]), rowHeight]);
          const cx = model.encodedPIXIProperty("x", d);
          if (circular) {
            const baselinePos = cartesianToPolar(
              cx,
              trackWidth,
              baselineR,
              trackCenterX,
              trackCenterY,
              startAngle,
              endAngle
            );
            baselinePoints.push([baselinePos.x, baselinePos.y]);
            if (i === 0) {
              areaPoints.push(baselinePos.x, baselinePos.y);
            }
            const r = trackOuterRadius - (rowPosition + rowHeight - cy) / trackHeight * trackRingSize;
            const pos = cartesianToPolar(
              cx,
              trackWidth,
              r,
              trackCenterX,
              trackCenterY,
              startAngle,
              endAngle
            );
            areaPoints.push(pos.x, pos.y);
            if (i === array.length - 1) {
              const startR = trackOuterRadius - (rowPosition + rowHeight) / trackHeight * trackRingSize;
              const curPos = cartesianToPolar(
                cx,
                trackWidth,
                startR,
                trackCenterX,
                trackCenterY,
                startAngle,
                endAngle
              );
              areaPoints.push(curPos.x, curPos.y);
            }
            model.getMouseEventModel().addPointBasedEvent(d, [pos.x, pos.y, 1]);
          } else {
            if (i === 0) {
              areaPoints.push(cx, rowPosition + rowHeight);
              startX = cx;
            }
            areaPoints.push(cx, rowPosition + rowHeight - cy);
            if (i === array.length - 1) {
              areaPoints.push(cx, rowPosition + rowHeight);
              areaPoints.push(startX, rowPosition + rowHeight);
            }
            model.getMouseEventModel().addPointBasedEvent(d, [cx, rowPosition + rowHeight - cy, 1]);
          }
        });
        if (circular && baselinePoints.length !== 0) {
          areaPoints.push(...baselinePoints.reverse().reduce((a, b) => a.concat(b)));
        }
        const color2 = model.encodedValue("color", colorCategory);
        graphics.beginFill(colorToHex(color2), constantOpacity);
        graphics.drawPolygon(areaPoints);
        graphics.endFill();
      });
    });
  }
}
function drawRect(HGC, track, tile, model) {
  var _a, _b, _c, _d, _e, _f;
  const spec = model.spec();
  const data2 = model.data();
  const [trackWidth, trackHeight] = track.dimensions;
  const circular = spec.layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const cx = trackWidth / 2;
  const cy = trackHeight / 2;
  const xScale = track._xScale;
  let tileUnitWidth;
  if (tile.tileData.tilePos) {
    const tileSize = track.tilesetInfo.tile_size;
    const { tileX, tileWidth } = track.getTilePosAndDimensions(
      tile.tileData.zoomLevel,
      tile.tileData.tilePos,
      // TODO: required parameter. Typing out `track` should address this issue.
      tileSize
    );
    tileUnitWidth = xScale(tileX + tileWidth / tileSize) - xScale(tileX);
  }
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  const RPAD = IsChannelDeep(spec.row) && spec.row.padding ? spec.row.padding : 0;
  const yCategories = (_f = model.getChannelDomainArray("y")) != null ? _f : ["___SINGLE_Y_POSITION___"];
  const cellHeight = rowHeight / yCategories.length - RPAD * 2;
  const g = tile.graphics;
  data2.forEach((d) => {
    var _a2;
    const rowPosition = model.encodedPIXIProperty("row", d) + RPAD;
    const x = model.encodedPIXIProperty("x", d);
    const color2 = model.encodedPIXIProperty("color", d);
    const stroke = model.encodedPIXIProperty("stroke", d);
    const strokeWidth = model.encodedPIXIProperty("strokeWidth", d);
    const opacity = model.encodedPIXIProperty("opacity", d);
    const rectWidth = model.encodedPIXIProperty("width", d, { markWidth: tileUnitWidth });
    const rectHeight = model.encodedPIXIProperty("height", d, { markHeight: cellHeight });
    const y = model.encodedPIXIProperty("y", d);
    const alphaTransition = model.markVisibility(d, {
      width: rectWidth,
      zoomLevel: track._xScale.invert(trackWidth) - track._xScale.invert(0)
    });
    const actualOpacity = Math.min(alphaTransition, opacity);
    if (actualOpacity === 0 || rectHeight === 0 || rectWidth <= 1e-4) {
      return;
    }
    const [xs, xe, ys, ye] = [
      x,
      x + rectWidth,
      rowPosition + rowHeight - y - rectHeight / 2,
      rowPosition + rowHeight - y + rectHeight / 2
    ];
    const absoluteHeight = (_a2 = model.visualPropertyByChannel("size", d)) != null ? _a2 : void 0;
    g.lineStyle(
      strokeWidth,
      colorToHex(stroke),
      actualOpacity,
      // alpha
      0.5
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    let polygonForMouseEvent = [];
    if (circular) {
      if (xe < 0 || trackWidth < xs) {
        return;
      }
      let farR = trackOuterRadius - ys / trackHeight * trackRingSize;
      let nearR = trackOuterRadius - ye / trackHeight * trackRingSize;
      if (absoluteHeight) {
        const midR = trackOuterRadius - (rowPosition + y) / trackHeight * trackRingSize;
        farR = midR - absoluteHeight / 2;
        nearR = midR + absoluteHeight / 2;
      }
      const sPos = cartesianToPolar(xs, trackWidth, nearR, cx, cy, startAngle, endAngle);
      const startRad = valueToRadian(xs, trackWidth, startAngle, endAngle);
      const endRad = valueToRadian(xe, trackWidth, startAngle, endAngle);
      g.beginFill(colorToHex(color2 === "none" ? "white" : color2), color2 === "none" ? 0 : actualOpacity);
      g.moveTo(sPos.x, sPos.y);
      g.arc(cx, cy, nearR, startRad, endRad, true);
      g.arc(cx, cy, farR, endRad, startRad, false);
      polygonForMouseEvent = Array.from(g.currentPath.points);
      g.closePath();
    } else {
      g.beginFill(colorToHex(color2 === "none" ? "white" : color2), color2 === "none" ? 0 : actualOpacity);
      g.drawRect(xs, ys, xe - xs, ye - ys);
      polygonForMouseEvent = [xs, ys, xs, ye, xe, ye, xe, ys];
    }
    model.getMouseEventModel().addPolygonBasedEvent(d, polygonForMouseEvent);
  });
}
function rectProperty(gm, propertyKey, datum, additionalInfo) {
  var _a;
  switch (propertyKey) {
    case "width":
      const width = (
        // (1) size
        gm.visualPropertyByChannel("xe", datum) ? gm.visualPropertyByChannel("xe", datum) - gm.visualPropertyByChannel("x", datum) : (
          // (2) unit mark height
          additionalInfo == null ? void 0 : additionalInfo.markWidth
        )
      );
      return width === 0 ? 0.1 : width;
    case "height":
      return (
        // (1) size
        (_a = gm.visualPropertyByChannel("size", datum)) != null ? _a : (
          // (2) unit mark height
          additionalInfo == null ? void 0 : additionalInfo.markHeight
        )
      );
    default:
      return void 0;
  }
}
function drawTriangle(g, model, trackWidth, trackHeight) {
  var _a, _b, _c, _d, _e, _f, _g;
  const spec = model.spec();
  if (!spec.width || !spec.height) {
    console.warn("Size of a track is not properly determined, so visual mark cannot be rendered");
    return;
  }
  const data2 = model.data();
  const zoomLevel = model.getChannelScale("x").invert(trackWidth) - model.getChannelScale("x").invert(0);
  const circular = spec.layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const cx = trackWidth / 2;
  const cy = trackHeight / 2;
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  const yCategories = (_f = model.getChannelDomainArray("y")) != null ? _f : ["___SINGLE_Y___"];
  const triHeight = (_g = model.encodedValue("size")) != null ? _g : circular ? trackRingSize / rowCategories.length / yCategories.length : rowHeight / yCategories.length;
  rowCategories.forEach((rowCategory) => {
    const rowPosition = model.encodedValue("row", rowCategory);
    data2.filter(
      (d) => !getValueUsingChannel(d, spec.row) || getValueUsingChannel(d, spec.row) === rowCategory
    ).forEach((d) => {
      var _a2, _b2, _c2;
      const x = model.encodedPIXIProperty("x", d);
      const xe = model.encodedPIXIProperty("xe", d);
      const markWidth = (_a2 = model.encodedPIXIProperty("size", d)) != null ? _a2 : xe === void 0 ? triHeight : xe - x;
      const y = model.encodedPIXIProperty("y", d);
      const strokeWidth = model.encodedPIXIProperty("strokeWidth", d);
      const stroke = model.encodedPIXIProperty("stroke", d);
      const color2 = model.encodedPIXIProperty("color", d);
      const opacity = model.encodedPIXIProperty("opacity", d);
      let polygon = [];
      if (circular) {
        let x0 = x ? x : xe - markWidth;
        let x1 = xe ? xe : x + markWidth;
        let xm = (x0 + x1) / 2;
        const rm = trackOuterRadius - (rowPosition + rowHeight - y) / trackHeight * trackRingSize;
        const r0 = rm - triHeight / 2;
        const r1 = rm + triHeight / 2;
        if (((_b2 = spec.style) == null ? void 0 : _b2.align) === "right" && !xe) {
          x0 -= markWidth;
          x1 -= markWidth;
          xm -= markWidth;
        }
        if (spec.mark === "triangleLeft") {
          const p0 = cartesianToPolar(x1, trackWidth, r0, cx, cy, startAngle, endAngle);
          const p1 = cartesianToPolar(x0, trackWidth, rm, cx, cy, startAngle, endAngle);
          const p2 = cartesianToPolar(x1, trackWidth, r1, cx, cy, startAngle, endAngle);
          const p3 = cartesianToPolar(x1, trackWidth, r0, cx, cy, startAngle, endAngle);
          polygon = [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y];
        } else if (spec.mark === "triangleRight") {
          const p0 = cartesianToPolar(x0, trackWidth, r0, cx, cy, startAngle, endAngle);
          const p1 = cartesianToPolar(x1, trackWidth, rm, cx, cy, startAngle, endAngle);
          const p2 = cartesianToPolar(x0, trackWidth, r1, cx, cy, startAngle, endAngle);
          const p3 = cartesianToPolar(x0, trackWidth, r0, cx, cy, startAngle, endAngle);
          polygon = [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y];
        } else if (spec.mark === "triangleBottom") {
          x0 = xm - markWidth / 2;
          x1 = xm + markWidth / 2;
          const p0 = cartesianToPolar(x0, trackWidth, r1, cx, cy, startAngle, endAngle);
          const p1 = cartesianToPolar(x1, trackWidth, r1, cx, cy, startAngle, endAngle);
          const p2 = cartesianToPolar(xm, trackWidth, r0, cx, cy, startAngle, endAngle);
          const p3 = cartesianToPolar(x0, trackWidth, r1, cx, cy, startAngle, endAngle);
          polygon = [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y];
        }
        const alphaTransition = model.markVisibility(d, { width: x1 - x0, zoomLevel });
        const actualOpacity = Math.min(alphaTransition, opacity);
        g.lineStyle(
          strokeWidth,
          colorToHex(stroke),
          // too narrow triangle's stroke is becoming too sharp
          x1 - x0 > 2 ? actualOpacity : 0,
          // alpha
          0
          // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
        );
        g.beginFill(colorToHex(color2), actualOpacity);
        g.drawPolygon(polygon);
        g.endFill();
      } else {
        let x0 = x ? x : xe - markWidth;
        let x1 = xe ? xe : x + markWidth;
        let xm = x0 + (x1 - x0) / 2;
        const ym = rowPosition + rowHeight - y;
        const y0 = rowPosition + rowHeight - y - triHeight / 2;
        const y1 = rowPosition + rowHeight - y + triHeight / 2;
        if (((_c2 = spec.style) == null ? void 0 : _c2.align) === "right" && !xe) {
          x0 -= markWidth;
          x1 -= markWidth;
          xm -= markWidth;
        }
        polygon = {
          triangleLeft: [x1, y0, x0, ym, x1, y1, x1, y0],
          triangleRight: [x0, y0, x1, ym, x0, y1, x0, y0],
          triangleBottom: [x0, y0, x1, y0, xm, y1, x0, y0]
        }[spec.mark];
        const alphaTransition = model.markVisibility(d, { width: x1 - x0, zoomLevel });
        const actualOpacity = Math.min(alphaTransition, opacity);
        g.lineStyle(
          strokeWidth,
          colorToHex(stroke),
          // too narrow triangle's stroke is becoming too sharp
          x1 - x0 > 2 ? actualOpacity : 0,
          // alpha
          0.5
          // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
        );
        g.beginFill(colorToHex(color2), actualOpacity);
        g.drawPolygon(polygon);
        g.endFill();
      }
      model.getMouseEventModel().addPolygonBasedEvent(d, polygon);
    });
  });
}
const TEXT_STYLE_GLOBAL = {
  fontSize: "12px",
  fontFamily: "sans-serif",
  // 'Arial',
  fontWeight: "normal",
  fill: "black",
  background: "white",
  lineJoin: "round",
  stroke: "#ffffff",
  strokeThickness: 0
};
function drawText(HGC, trackInfo, tile, model) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const spec = model.spec();
  const data2 = model.data();
  const [trackWidth, trackHeight] = trackInfo.dimensions;
  const circular = spec.layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const tcx = trackWidth / 2;
  const tcy = trackHeight / 2;
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  const dx = (_g = (_f = spec.style) == null ? void 0 : _f.dx) != null ? _g : 0;
  const dy = (_i = (_h = spec.style) == null ? void 0 : _h.dy) != null ? _i : 0;
  const textAnchor = !((_j = spec.style) == null ? void 0 : _j.textAnchor) ? "middle" : spec.style.textAnchor;
  if (IsStackedMark(spec)) {
    if (circular) {
      return;
    }
    const rowGraphics = tile.graphics;
    const genomicChannel = model.getGenomicChannel();
    if (!genomicChannel || !genomicChannel.field) {
      console.warn("Genomic field is not provided in the specification");
      return;
    }
    const pivotedData = group(data2, (d) => d[genomicChannel.field]);
    const xKeys = [...pivotedData.keys()];
    xKeys.forEach((k) => {
      var _a2;
      let prevYEnd = 0;
      (_a2 = pivotedData.get(k)) == null ? void 0 : _a2.forEach((d) => {
        var _a3, _b2, _c2, _d2, _e2, _f2, _g2, _h2;
        const text = model.encodedPIXIProperty("text", d);
        const color2 = model.encodedPIXIProperty("color", d);
        const x = model.encodedPIXIProperty("x", d) + dx;
        const xe = model.encodedPIXIProperty("xe", d) + dx;
        const cx = model.encodedPIXIProperty("x-center", d) + dx;
        const y = model.encodedPIXIProperty("y", d) + dy;
        const size = model.encodedPIXIProperty("size", d);
        const stroke = model.encodedPIXIProperty("stroke", d);
        const strokeWidth = model.encodedPIXIProperty("strokeWidth", d);
        const opacity = model.encodedPIXIProperty("opacity", d);
        if (cx < 0 || cx > trackWidth) {
          return;
        }
        if (trackInfo.textsBeingUsed > 1e3) {
          return;
        }
        const localTextStyle = {
          ...TEXT_STYLE_GLOBAL,
          fontSize: size != null ? size : ((_a3 = spec.style) == null ? void 0 : _a3.textFontSize) ? `${(_b2 = spec.style) == null ? void 0 : _b2.textFontSize}px` : TEXT_STYLE_GLOBAL.fontSize,
          stroke: (_d2 = stroke != null ? stroke : (_c2 = spec.style) == null ? void 0 : _c2.textStroke) != null ? _d2 : TEXT_STYLE_GLOBAL.stroke,
          strokeThickness: (_f2 = strokeWidth != null ? strokeWidth : (_e2 = spec.style) == null ? void 0 : _e2.textStrokeWidth) != null ? _f2 : TEXT_STYLE_GLOBAL.strokeThickness,
          fontWeight: (_h2 = (_g2 = spec.style) == null ? void 0 : _g2.textFontWeight) != null ? _h2 : TEXT_STYLE_GLOBAL.fontWeight
        };
        const textStyleObj = new HGC.libraries.PIXI.TextStyle(localTextStyle);
        let textGraphic;
        if (trackInfo.textGraphics.length > trackInfo.textsBeingUsed) {
          textGraphic = trackInfo.textGraphics[trackInfo.textsBeingUsed];
          textGraphic.style.fill = color2;
          textGraphic.visible = true;
          textGraphic.text = text;
          textGraphic.alpha = 1;
        } else {
          textGraphic = new HGC.libraries.PIXI.Text(text, {
            ...localTextStyle,
            fill: color2
          });
          trackInfo.textGraphics.push(textGraphic);
        }
        const metric = HGC.libraries.PIXI.TextMetrics.measureText(text, textStyleObj);
        trackInfo.textsBeingUsed++;
        const alphaTransition = model.markVisibility(d, {
          ...metric,
          zoomLevel: trackInfo._xScale.invert(trackWidth) - trackInfo._xScale.invert(0)
        });
        const actualOpacity = Math.min(alphaTransition, opacity);
        if (!text || actualOpacity === 0) {
          trackInfo.textsBeingUsed--;
          textGraphic.visible = false;
          return;
        }
        textGraphic.alpha = actualOpacity;
        textGraphic.resolution = 8;
        textGraphic.updateText();
        textGraphic.texture.baseTexture.scaleMode = HGC.libraries.PIXI.SCALE_MODES.LINEAR;
        const sprite = new HGC.libraries.PIXI.Sprite(textGraphic.texture);
        sprite.x = x;
        sprite.y = rowHeight - y - prevYEnd;
        sprite.width = xe - x;
        sprite.height = y;
        rowGraphics.addChild(sprite);
        prevYEnd += y;
      });
    });
  } else {
    rowCategories.forEach((rowCategory) => {
      const rowGraphics = tile.graphics;
      const rowPosition = model.encodedValue("row", rowCategory);
      data2.filter(
        (d) => !getValueUsingChannel(d, spec.row) || getValueUsingChannel(d, spec.row) === rowCategory
      ).forEach((d) => {
        var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2;
        const text = model.encodedPIXIProperty("text", d);
        const color2 = model.encodedPIXIProperty("color", d);
        const cx = model.encodedPIXIProperty("x-center", d) + dx;
        const y = model.encodedPIXIProperty("y", d) + dy;
        const size = model.encodedPIXIProperty("size", d);
        const stroke = model.encodedPIXIProperty("stroke", d);
        const strokeWidth = model.encodedPIXIProperty("strokeWidth", d);
        const opacity = model.encodedPIXIProperty("opacity", d);
        if (cx < 0 || cx > trackWidth) {
          return;
        }
        if (trackInfo.textsBeingUsed > 1e3) {
          return;
        }
        const localTextStyle = {
          ...TEXT_STYLE_GLOBAL,
          fontSize: size != null ? size : ((_a2 = spec.style) == null ? void 0 : _a2.textFontSize) ? `${(_b2 = spec.style) == null ? void 0 : _b2.textFontSize}px` : TEXT_STYLE_GLOBAL.fontSize,
          stroke: (_d2 = stroke != null ? stroke : (_c2 = spec.style) == null ? void 0 : _c2.textStroke) != null ? _d2 : TEXT_STYLE_GLOBAL.stroke,
          strokeThickness: (_f2 = strokeWidth != null ? strokeWidth : (_e2 = spec.style) == null ? void 0 : _e2.textStrokeWidth) != null ? _f2 : TEXT_STYLE_GLOBAL.strokeThickness,
          fontWeight: (_h2 = (_g2 = spec.style) == null ? void 0 : _g2.textFontWeight) != null ? _h2 : TEXT_STYLE_GLOBAL.fontWeight
        };
        const textStyleObj = new HGC.libraries.PIXI.TextStyle(localTextStyle);
        let textGraphic;
        if (trackInfo.textGraphics.length > trackInfo.textsBeingUsed) {
          textGraphic = trackInfo.textGraphics[trackInfo.textsBeingUsed];
          textGraphic.style.fill = color2;
          textGraphic.visible = true;
          textGraphic.text = text;
          textGraphic.alpha = 1;
        } else {
          textGraphic = new HGC.libraries.PIXI.Text(text, {
            ...localTextStyle,
            fill: color2
          });
          trackInfo.textGraphics.push(textGraphic);
        }
        const metric = HGC.libraries.PIXI.TextMetrics.measureText(text, textStyleObj);
        trackInfo.textsBeingUsed++;
        const alphaTransition = model.markVisibility(d, {
          ...metric,
          zoomLevel: trackInfo._xScale.invert(trackWidth) - trackInfo._xScale.invert(0)
        });
        const actualOpacity = Math.min(alphaTransition, opacity);
        if (!text || actualOpacity === 0) {
          trackInfo.textsBeingUsed--;
          textGraphic.visible = false;
          return;
        }
        textGraphic.alpha = actualOpacity;
        textGraphic.anchor.y = 0.5;
        textGraphic.anchor.x = textAnchor === "middle" ? 0.5 : textAnchor === "start" ? 0 : 1;
        let polygonForMouseEvents = [];
        if (circular) {
          const r = trackOuterRadius - (rowPosition + rowHeight - y) / trackHeight * trackRingSize;
          const centerPos = cartesianToPolar(cx, trackWidth, r, tcx, tcy, startAngle, endAngle);
          textGraphic.x = centerPos.x;
          textGraphic.y = centerPos.y;
          textGraphic.resolution = 4;
          const tw = metric.width / (2 * r * Math.PI) * trackWidth;
          let [minX, maxX] = [cx - tw / 2, cx + tw / 2];
          if (minX < 0) {
            const gap = -minX;
            minX = 0;
            maxX += gap;
          } else if (maxX > trackWidth) {
            const gap = maxX - trackWidth;
            maxX = trackWidth;
            minX -= gap;
          }
          const ropePoints = [];
          const eventPointsFar = [];
          const eventPointsNear = [];
          for (let i = maxX; i >= minX; i -= tw / 10) {
            const p = cartesianToPolar(i, trackWidth, r, tcx, tcy, startAngle, endAngle);
            ropePoints.push(new HGC.libraries.PIXI.Point(p.x, p.y));
            const pFar = cartesianToPolar(
              i,
              trackWidth,
              r + metric.height / 2,
              tcx,
              tcy,
              startAngle,
              endAngle
            );
            const pNear = cartesianToPolar(
              i,
              trackWidth,
              r - metric.height / 2,
              tcx,
              tcy,
              startAngle,
              endAngle
            );
            eventPointsFar.push(pFar.x, pFar.y);
            if (i === maxX) {
              eventPointsNear.push(pFar.y, pFar.x);
            }
            eventPointsNear.push(pNear.y, pNear.x);
          }
          textGraphic.updateText();
          const rope = new HGC.libraries.PIXI.SimpleRope(textGraphic.texture, ropePoints);
          rope.alpha = actualOpacity;
          rowGraphics.addChild(rope);
          eventPointsNear.reverse();
          polygonForMouseEvents = eventPointsFar.concat(eventPointsNear);
        } else {
          textGraphic.position.x = cx;
          textGraphic.position.y = rowPosition + rowHeight - y;
          rowGraphics.addChild(textGraphic);
          const { height: h, width: w } = metric;
          const ys = textGraphic.position.y - h / 2;
          const ye = ys + h;
          let xs = 0;
          let xe = 0;
          if (textAnchor === "start") {
            xs = cx;
            xe = cx + w;
          } else if (textAnchor === "middle") {
            xs = cx - w / 2;
            xe = cx + w / 2;
          } else {
            xs = cx - w;
            xe = cx;
          }
          polygonForMouseEvents = [xs, ys, xs, ye, xe, ye, xe, ys];
        }
        model.getMouseEventModel().addPolygonBasedEvent(d, polygonForMouseEvents);
      });
    });
  }
}
function drawRule(HGC, trackInfo, tile, model) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const spec = model.spec();
  const data2 = model.data();
  const [trackWidth, trackHeight] = trackInfo.dimensions;
  const circular = spec.layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const cx = trackWidth / 2;
  const cy = trackHeight / 2;
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  const dashed = (_f = spec.style) == null ? void 0 : _f.dashed;
  const linePattern = (_g = spec.style) == null ? void 0 : _g.linePattern;
  const curved = (_h = spec.style) == null ? void 0 : _h.curve;
  const g = tile.graphics;
  rowCategories.forEach((rowCategory) => {
    const rowPosition = model.encodedValue("row", rowCategory);
    data2.filter(
      (d) => !getValueUsingChannel(d, spec.row) || getValueUsingChannel(d, spec.row) === rowCategory
    ).forEach((d) => {
      const x = model.encodedPIXIProperty("x", d);
      const xe = model.encodedPIXIProperty("xe", d);
      const y = model.encodedPIXIProperty("y", d);
      const color2 = model.encodedPIXIProperty("color", d);
      const strokeWidth = model.encodedPIXIProperty("strokeWidth", d);
      const opacity = model.encodedPIXIProperty("opacity", d);
      const alphaTransition = model.markVisibility(d, {
        width: xe - x,
        zoomLevel: trackInfo._xScale.invert(trackWidth) - trackInfo._xScale.invert(0)
      });
      const actualOpacity = Math.min(alphaTransition, opacity);
      g.lineStyle(
        strokeWidth,
        colorToHex(color2),
        actualOpacity,
        // alpha
        0.5
        // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
      );
      if (!xe && (!spec.y || !("field" in spec.y))) {
        if (circular) {
          return;
        } else {
          if (dashed) {
            const [dashSize, gapSize] = dashed;
            let curPos = 0;
            do {
              g.moveTo(x, curPos);
              g.lineTo(x, curPos + dashSize);
              curPos += dashSize + gapSize;
            } while (curPos < trackHeight);
          } else {
            g.moveTo(x, 0);
            g.lineTo(x, trackHeight);
          }
        }
      } else if (!xe && y) {
        if (circular) {
          g.lineStyle(
            strokeWidth,
            colorToHex(color2),
            0,
            // alpha
            0.5
            // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
          );
          const midR = trackOuterRadius - (rowPosition + y) / trackHeight * trackRingSize;
          const farR = midR + strokeWidth / 2;
          const nearR = midR - strokeWidth / 2;
          const sPos = cartesianToPolar(0, trackWidth, nearR, cx, cy, startAngle, endAngle);
          const startRad = valueToRadian(0, trackWidth, startAngle, endAngle);
          const endRad = valueToRadian(trackWidth, trackWidth, startAngle, endAngle);
          g.beginFill(colorToHex(color2), actualOpacity);
          g.moveTo(sPos.x, sPos.y);
          g.arc(cx, cy, nearR, startRad, endRad, true);
          g.arc(cx, cy, farR, endRad, startRad, false);
          g.closePath();
        } else {
          if (dashed) {
            const [dashSize, gapSize] = dashed;
            let curPos = 0;
            do {
              g.moveTo(curPos, rowPosition + rowHeight - y);
              g.lineTo(curPos + dashSize, rowPosition + rowHeight - y);
              curPos += dashSize + gapSize;
            } while (curPos < trackWidth);
          } else {
            g.moveTo(0, rowPosition + rowHeight - y);
            g.lineTo(trackWidth, rowPosition + rowHeight - y);
          }
        }
      } else {
        if (circular) {
          if (strokeWidth === 0) {
            return;
          }
          g.lineStyle(
            strokeWidth,
            colorToHex(color2),
            0,
            // alpha
            0.5
            // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
          );
          const midR = trackOuterRadius - (rowPosition + rowHeight - y) / trackHeight * trackRingSize;
          const farR = midR + strokeWidth / 2;
          const nearR = midR - strokeWidth / 2;
          const sPos = cartesianToPolar(x, trackWidth, nearR, cx, cy, startAngle, endAngle);
          const startRad = valueToRadian(x, trackWidth, startAngle, endAngle);
          const endRad = valueToRadian(xe, trackWidth, startAngle, endAngle);
          g.beginFill(colorToHex(color2), actualOpacity);
          g.moveTo(sPos.x, sPos.y);
          g.arc(cx, cy, nearR, startRad, endRad, true);
          g.arc(cx, cy, farR, endRad, startRad, false);
          g.closePath();
        } else if (dashed) {
          const [dashSize, gapSize] = dashed;
          let curPos = x;
          do {
            g.moveTo(curPos, rowPosition + rowHeight - y);
            g.lineTo(curPos + dashSize, rowPosition + rowHeight - y);
            curPos += dashSize + gapSize;
          } while (curPos < xe);
        } else {
          if (curved === void 0) {
            g.moveTo(x, rowPosition + rowHeight - y);
            g.lineTo(xe, rowPosition + rowHeight - y);
          } else if (curved === "top") {
            const CURVE_HEIGHT = 2;
            const xm = x + (xe - x) / 2;
            g.moveTo(x, rowPosition + rowHeight - y + CURVE_HEIGHT / 2);
            g.lineTo(xm, rowPosition + rowHeight - y - CURVE_HEIGHT / 2);
            g.moveTo(xm, rowPosition + rowHeight - y - CURVE_HEIGHT / 2);
            g.lineTo(xe, rowPosition + rowHeight - y + CURVE_HEIGHT / 2);
          }
        }
        if (linePattern && curved === void 0 && !circular) {
          const { type: pType, size: pSize } = linePattern;
          let curPos = Math.max(x, 0);
          g.lineStyle(0);
          const PATTERN_GAP_SIZE = pSize * 2;
          let count = 0;
          while (curPos < Math.min(xe, trackWidth) && count < 100) {
            const x0 = curPos;
            const x1 = curPos + pSize;
            const ym = rowPosition + rowHeight - y;
            const y0 = ym - pSize / 2;
            const y1 = ym + pSize / 2;
            g.beginFill(colorToHex(color2), actualOpacity);
            g.drawPolygon(
              pType === "triangleLeft" ? [x1, y0, x0, ym, x1, y1, x1, y0] : [x0, y0, x1, ym, x0, y1, x0, y0]
            );
            g.endFill();
            curPos += pSize + PATTERN_GAP_SIZE;
            count++;
          }
        }
      }
    });
  });
}
function drawWithinLink(g, trackInfo, model) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const spec = model.spec();
  if (!spec.width || !spec.height) {
    console.warn("Size of a track is not properly determined, so visual mark cannot be rendered");
    return;
  }
  const data2 = model.data();
  const [trackWidth, trackHeight] = trackInfo.dimensions;
  const circular = spec.layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const tcx = trackWidth / 2;
  const tcy = trackHeight / 2;
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  const MIN_HEIGHT = (_g = (_f = spec.style) == null ? void 0 : _f.linkMinHeight) != null ? _g : 0.5;
  const NUM_STEPS = ((_h = spec.experimental) == null ? void 0 : _h.performanceMode) ? 10 : 50;
  const showVerticalLines = (_j = (_i = spec.style) == null ? void 0 : _i.withinLinkVerticalLines) != null ? _j : false;
  rowCategories.forEach((rowCategory) => {
    const rowPosition = model.encodedValue("row", rowCategory);
    data2.filter(
      (d) => !getValueUsingChannel(d, spec.row) || getValueUsingChannel(d, spec.row) === rowCategory
    ).forEach((d) => {
      var _a2, _b2, _c2, _d2, _e2;
      let x = model.encodedPIXIProperty("x", d);
      let xe = model.encodedPIXIProperty("xe", d);
      let x1 = model.encodedPIXIProperty("x1", d);
      let x1e = model.encodedPIXIProperty("x1e", d);
      const y = model.encodedPIXIProperty("y", d);
      const ye = model.encodedPIXIProperty("ye", d);
      const stroke = model.encodedPIXIProperty("stroke", d);
      const strokeWidth = model.encodedPIXIProperty("strokeWidth", d);
      const color2 = model.encodedPIXIProperty("color", d);
      const opacity = model.encodedPIXIProperty("opacity", d);
      if (typeof xe !== "undefined") {
        [x, xe] = [x, xe].sort((a, b) => a - b);
      }
      if (typeof x1 !== "undefined" && typeof x1e !== "undefined") {
        [x1, x1e] = [x1, x1e].sort((a, b) => a - b);
      }
      const isRibbon = typeof xe !== "undefined" && typeof x1 !== "undefined" && typeof x1e !== "undefined" && // This means the strokeWidth of a band is too small, so we just need to draw a line instead
      Math.abs(x - xe) > 0.1 && Math.abs(x1 - x1e) > 0.1;
      if (!isRibbon && xe === void 0 && !Is2DTrack(spec)) {
        if (x1 === void 0 && x1e === void 0) {
          return;
        }
        xe = x1 !== void 0 ? x1 : x1e;
      }
      if (!isRibbon && Math.abs(x - xe) <= 0.1 && Math.abs(x1 - x1e) <= 0.1) {
        x = (x + xe) / 2;
        xe = (x1 + x1e) / 2;
      }
      g.lineStyle(
        strokeWidth,
        colorToHex(stroke),
        opacity,
        // alpha
        0.5
        // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
      );
      const flipY = IsChannelDeep(spec.y) && spec.y.flip || spec.flipY;
      const baseY = (_a2 = spec.baselineY) != null ? _a2 : rowPosition + (flipY ? 0 : rowHeight);
      let pathForMouseEvent = [];
      if (isRibbon) {
        g.beginFill(color2 === "none" ? colorToHex("white") : colorToHex(color2), color2 === "none" ? 0 : opacity);
        let [_x1, _x2, _x3, _x4] = [x, xe, x1, x1e];
        [_x1, _x2, _x3, _x4] = [_x1, _x2, _x3, _x4].sort((a, b) => a - b);
        if (_x1 > trackWidth || _x4 < 0 || Math.abs(_x4 - _x1) < 0.5) {
          return;
        }
        if (circular) {
          if (_x1 < 0 || _x4 > trackWidth) {
            return;
          }
          const r = trackOuterRadius - rowPosition / trackHeight * trackRingSize;
          const posX = cartesianToPolar(_x1, trackWidth, r, tcx, tcy, startAngle, endAngle);
          const posXE = cartesianToPolar(_x2, trackWidth, r, tcx, tcy, startAngle, endAngle);
          const posX1 = cartesianToPolar(_x3, trackWidth, r, tcx, tcy, startAngle, endAngle);
          const posX1E = cartesianToPolar(_x4, trackWidth, r, tcx, tcy, startAngle, endAngle);
          g.moveTo(posX.x, posX.y);
          g.bezierCurveTo(tcx, tcy, tcx, tcy, posX1E.x, posX1E.y);
          g.arc(
            tcx,
            tcy,
            trackOuterRadius,
            positionToRadian(posX1E.x, posX1E.y, tcx, tcy),
            positionToRadian(posX1.x, posX1.y, tcx, tcy),
            false
          );
          g.bezierCurveTo(tcx, tcy, tcx, tcy, posXE.x, posXE.y);
          g.arc(
            tcx,
            tcy,
            trackOuterRadius,
            positionToRadian(posXE.x, posXE.y, tcx, tcy),
            positionToRadian(posX.x, posX.y, tcx, tcy),
            false
          );
          pathForMouseEvent = Array.from(g.currentPath.points);
          g.endFill();
        } else {
          g.moveTo(_x1, baseY);
          if (!((_b2 = spec.style) == null ? void 0 : _b2.linkStyle) || ((_c2 = spec.style) == null ? void 0 : _c2.linkStyle) === "circular") {
            g.arc(
              (_x1 + _x4) / 2,
              // cx
              baseY,
              // cy
              (_x4 - _x1) / 2,
              // radius
              -Math.PI,
              // start angle
              Math.PI,
              // end angle
              false
            );
            g.arc((_x2 + _x3) / 2, baseY, (_x3 - _x2) / 2, Math.PI, -Math.PI, true);
            pathForMouseEvent = Array.from(g.currentPath.points);
            g.closePath();
          } else {
            g.lineTo(_x3, rowPosition + rowHeight);
            g.bezierCurveTo(
              _x3 + (_x2 - _x3) / 3,
              // rowPosition + (x1 - x),
              rowPosition + rowHeight - (_x2 - _x3) / 2,
              //Math.min(rowHeight - (x1 - x), (xe - x1) / 2.0),
              _x3 + (_x2 - _x3) / 3 * 2,
              // rowPosition + (x1 - x),
              rowPosition + rowHeight - (_x2 - _x3) / 2,
              //Math.min(rowHeight - (x1 - x), (xe - x1) / 2.0),
              _x2,
              rowPosition + rowHeight
            );
            g.lineTo(_x4, rowPosition + rowHeight);
            g.bezierCurveTo(
              _x1 + (_x4 - _x1) / 3 * 2,
              // rowPosition,
              rowPosition + rowHeight - (_x4 - _x1) / 2,
              //Math.min(rowHeight, (x1e - x) / 2.0),
              _x1 + (_x4 - _x1) / 3,
              // rowPosition,
              rowPosition + rowHeight - (_x4 - _x1) / 2,
              //Math.min(rowHeight, (x1e - x) / 2.0),
              _x1,
              rowPosition + rowHeight
            );
            pathForMouseEvent = Array.from(g.currentPath.points);
            g.endFill();
          }
        }
        model.getMouseEventModel().addPolygonBasedEvent(d, pathForMouseEvent);
      } else {
        const midX = (x + xe) / 2;
        g.beginFill(colorToHex("white"), 0);
        if (circular) {
          if (x < 0 || xe > trackWidth) {
            return;
          }
          if (((_d2 = spec.style) == null ? void 0 : _d2.linkStyle) === "straight") {
            const r = trackOuterRadius - rowPosition / trackHeight * trackRingSize;
            const posS = cartesianToPolar(x, trackWidth, r, tcx, tcy, startAngle, endAngle);
            const posE = cartesianToPolar(xe, trackWidth, r, tcx, tcy, startAngle, endAngle);
            const x12 = posS.x;
            const y1 = posS.y;
            const x4 = posE.x;
            const y4 = posE.y;
            g.moveTo(x12, y1);
            g.lineTo(x4, y4);
            const length = 100;
            const eventPoints = Array.from({ length }, (d2, i) => {
              return {
                x: (x4 - x12) / (length - 1) * i + x12,
                y: (y4 - y1) / (length - 1) * i + y1
              };
            });
            pathForMouseEvent = eventPoints.flatMap((d2) => [d2.x, d2.y]);
          } else {
            const r = trackOuterRadius - rowPosition / trackHeight * trackRingSize;
            const posS = cartesianToPolar(x, trackWidth, r, tcx, tcy, startAngle, endAngle);
            const posE = cartesianToPolar(xe, trackWidth, r, tcx, tcy, startAngle, endAngle);
            const x12 = posS.x;
            const y1 = posS.y;
            const x2 = posS.x;
            const y2 = posS.y;
            const x3 = trackWidth / 2;
            const y3 = trackHeight / 2;
            const x4 = posE.x;
            const y4 = posE.y;
            g.moveTo(x12, y1);
            const bezier = new Bezier(x12, y1, x2, y2, x3, y3, x4, y4);
            const points = bezier.getLUT(14);
            points.forEach((d2) => g.lineTo(d2.x, d2.y));
            const morePoints = bezier.getLUT(1e3);
            pathForMouseEvent = morePoints.flatMap((d2) => [d2.x, d2.y]);
          }
        } else {
          if (((_e2 = spec.style) == null ? void 0 : _e2.linkStyle) === "elliptical") {
            if (!(0 <= x && x <= trackWidth) && !(0 <= xe && xe <= trackWidth)) {
              return;
            }
            const points = [];
            const isYSpecified = IsChannelDeep(spec.y);
            for (let step = 0; step <= NUM_STEPS; step++) {
              const theta = Math.PI * (step / NUM_STEPS);
              const mx = (xe - x) / 2 * Math.cos(theta) + (x + xe) / 2;
              let my = baseY - y * Math.sin(theta) * (isYSpecified ? 1 : Math.min(xe - x + trackWidth * MIN_HEIGHT, trackWidth) / trackWidth) * (flipY ? -1 : 1);
              if (typeof y !== "undefined" && typeof ye !== "undefined") {
                const linkHeight = Math.abs(ye - y);
                const flipShape = ye > y;
                my = y - linkHeight * Math.sin(theta) * (flipShape ? -1 : 1);
              }
              if (step === 0) {
                if (showVerticalLines) {
                  const _y = flipY ? baseY - trackHeight : baseY;
                  g.moveTo(mx, _y);
                  points.push({ x: mx, y: _y });
                  g.lineTo(mx, my);
                } else {
                  g.moveTo(mx, my);
                }
              } else {
                g.lineTo(mx, my);
              }
              points.push({ x: mx, y: my });
              if (step === NUM_STEPS && showVerticalLines) {
                const _y = flipY ? baseY - trackHeight : baseY;
                g.lineTo(mx, _y);
                points.push({ x: mx, y: _y });
              }
            }
            pathForMouseEvent = points.flatMap((d2) => [d2.x, d2.y]);
          } else {
            if (xe < 0 || x > trackWidth) {
              return;
            }
            g.arc(midX, baseY, (xe - x) / 2, -Math.PI, Math.PI);
            pathForMouseEvent = Array.from(g.currentPath.points);
            g.closePath();
          }
        }
        model.getMouseEventModel().addLineBasedEvent(d, pathForMouseEvent);
      }
    });
  });
}
function insertItemToArray(array, index, item) {
  return [...array.slice(0, index), item, ...array.slice(index)];
}
function flatArrayToPairArray(array) {
  const output = [];
  for (let i = 0; i < array.length; i += 2) {
    output.push([array[i], array[i + 1]]);
  }
  return output;
}
function isEvery(array, is) {
  return array.every(is);
}
function isNumberArray(array) {
  return isEvery(array, (x) => typeof x === "number");
}
function isStringArray(array) {
  return isEvery(array, (x) => typeof x === "string");
}
function drawGrid(trackInfo, tm, theme) {
  drawYGridQuantitative(trackInfo, tm, theme);
  drawRowGrid(trackInfo, tm, theme);
}
function drawRowGrid(trackInfo, tm, theme) {
  var _a, _b, _c, _d;
  const spec = tm.spec();
  if (!IsChannelDeep(spec.row) || spec.row.grid !== true) {
    return;
  }
  const [trackX, trackY] = trackInfo.position;
  const [trackWidth, trackHeight] = trackInfo.dimensions;
  const circular = tm.spec().layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const cx = trackWidth / 2;
  const cy = trackHeight / 2;
  const rowCategories = tm.getChannelDomainArray("row");
  if (!rowCategories) {
    return;
  }
  const rowHeight = trackHeight / rowCategories.length;
  if (circular && trackRingSize <= 20 || !circular && rowHeight <= 20) {
    return;
  }
  const graphics = trackInfo.pBackground;
  const strokeWidth = theme.axis.gridStrokeWidth;
  rowCategories.forEach((rowCategory) => {
    const rowPosition = tm.encodedValue("row", rowCategory);
    if (!circular) {
      graphics.lineStyle(
        strokeWidth,
        colorToHex(theme.axis.gridColor),
        1,
        // alpha
        0.5
        // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
      );
      const y = trackY + rowPosition + rowHeight / 2;
      graphics.moveTo(trackX, y);
      graphics.lineTo(trackX + trackWidth, y);
    } else {
      const y = rowPosition + rowHeight / 2;
      const midR = trackOuterRadius - y / trackHeight * trackRingSize;
      const farR = midR + strokeWidth / 2;
      const nearR = midR - strokeWidth / 2;
      const sPos = cartesianToPolar(0, trackWidth, nearR, cx, cy, startAngle, endAngle);
      const startRad = valueToRadian(0, trackWidth, startAngle, endAngle);
      const endRad = valueToRadian(trackWidth, trackWidth, startAngle, endAngle);
      graphics.lineStyle(
        strokeWidth,
        colorToHex("black"),
        0,
        // alpha
        0.5
        // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
      );
      graphics.beginFill(colorToHex(theme.axis.gridColor), 1);
      graphics.moveTo(trackX + sPos.x, trackY + sPos.y);
      graphics.arc(trackX + cx, trackY + cy, nearR, startRad, endRad, true);
      graphics.arc(trackX + cx, trackY + cy, farR, endRad, startRad, false);
      graphics.closePath();
    }
  });
}
function drawYGridQuantitative(trackInfo, tm, theme) {
  var _a, _b, _c, _d, _e;
  const spec = tm.spec();
  if (!IsChannelDeep(spec.y) || spec.y.grid !== true) {
    return;
  }
  const [trackX, trackY] = trackInfo.position;
  const [trackWidth, trackHeight] = trackInfo.dimensions;
  const startX = trackX;
  const endX = trackX + trackWidth;
  const circular = tm.spec().layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const cx = trackWidth / 2;
  const cy = trackHeight / 2;
  const rowCategories = (_e = tm.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  if (!isStringArray(rowCategories)) {
    return;
  }
  const scale = tm.getChannelScale("y");
  const domain = tm.getChannelDomainArray("y");
  if (!scale || !domain || !isNumberArray(domain)) {
    return;
  }
  if (circular && rowHeight / trackHeight * trackRingSize <= 20 || !circular && rowHeight <= 20) {
    return;
  }
  const graphics = trackInfo.pBackground;
  const strokeWidth = theme.axis.gridStrokeWidth;
  rowCategories.forEach((rowCategory) => {
    const rowPosition = tm.encodedValue("row", rowCategory);
    const assignedHeight = circular ? rowHeight / trackHeight * trackRingSize : rowHeight;
    const tickCount = Math.max(Math.ceil(assignedHeight / 40), 1);
    let ticks = scale.ticks(tickCount).filter((v) => domain[0] <= v && v <= domain[1]);
    if (ticks.length === 1) {
      ticks = scale.ticks(tickCount + 1).filter((v) => domain[0] <= v && v <= domain[1]);
    }
    if (!circular) {
      graphics.lineStyle(
        strokeWidth,
        colorToHex(theme.axis.gridColor),
        1,
        // alpha
        0.5
        // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
      );
      ticks.forEach((value) => {
        var _a2;
        const y = trackY + rowPosition + rowHeight - scale(value);
        if (theme.axis.gridStrokeType === "solid") {
          graphics.moveTo(startX, y);
          graphics.lineTo(endX, y);
        } else if (theme.axis.gridStrokeType === "dashed") {
          const [line, gap] = (_a2 = theme.axis.gridStrokeDash) != null ? _a2 : [1, 1];
          for (let i = startX; i < endX; i += line + gap) {
            graphics.moveTo(i, y);
            graphics.lineTo(i + line, y);
          }
        }
      });
    } else {
      ticks.forEach((value) => {
        const y = scale(value);
        const midR = trackOuterRadius - (rowPosition + rowHeight - y) / trackHeight * trackRingSize;
        const farR = midR + strokeWidth / 2;
        const nearR = midR - strokeWidth / 2;
        const sPos = cartesianToPolar(0, trackWidth, nearR, cx, cy, startAngle, endAngle);
        const startRad = valueToRadian(0, trackWidth, startAngle, endAngle);
        const endRad = valueToRadian(trackWidth, trackWidth, startAngle, endAngle);
        graphics.lineStyle(
          strokeWidth,
          colorToHex("black"),
          0,
          // alpha
          0.5
          // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
        );
        graphics.beginFill(colorToHex(theme.axis.gridColor), 1);
        graphics.moveTo(trackX + sPos.x, trackY + sPos.y);
        graphics.arc(trackX + cx, trackY + cy, nearR, startRad, endRad, true);
        graphics.arc(trackX + cx, trackY + cy, farR, endRad, startRad, false);
        graphics.closePath();
      });
    }
  });
}
const DEFAULT_TEXT_STYLE = {
  color: "black",
  size: 10,
  fontFamily: "Arial",
  fontWeight: "normal",
  stroke: "#ffffff",
  strokeThickness: 0
};
function getTextStyle(style = {}) {
  const merged = { ...DEFAULT_TEXT_STYLE, ...style };
  const pixiTextStyle = {
    fontSize: `${merged.size}px`,
    fontFamily: merged.fontFamily,
    fontWeight: merged.fontWeight === "light" ? "lighter" : merged.fontWeight,
    fill: merged.color,
    lineJoin: "round",
    stroke: merged.stroke,
    strokeThickness: merged.strokeThickness
  };
  return pixiTextStyle;
}
function drawCircularTitle(HGC, trackInfo, tile, model, theme) {
  var _a, _b, _c;
  const spec = model.spec();
  const { title: title2 } = spec;
  if (spec.layout !== "circular") {
    return;
  }
  if (!title2) {
    return;
  }
  const [tw, th] = trackInfo.dimensions;
  const trackOuterRadius = (_a = spec.outerRadius) != null ? _a : 300;
  const startAngle = (_b = spec.startAngle) != null ? _b : 0;
  const endAngle = (_c = spec.endAngle) != null ? _c : 360;
  const cx = tw / 2;
  const cy = th / 2;
  const g = tile.graphics;
  const titleR = trackOuterRadius - 1;
  const padding = 1;
  const pos = cartesianToPolar(padding, tw, titleR, cx, cy, startAngle, endAngle);
  const styleConfig = getTextStyle({
    color: theme.track.titleColor,
    size: 12,
    // `theme.track.titleFontSize` seems to use much larger fonts
    fontFamily: theme.axis.labelFontFamily,
    // TODO: support
    fontWeight: theme.axis.labelFontWeight
    // TODO: support
  });
  const textGraphic = new HGC.libraries.PIXI.Text(title2, styleConfig);
  textGraphic.anchor.x = 1;
  textGraphic.anchor.y = 0.5;
  textGraphic.position.x = pos.x;
  textGraphic.position.y = pos.y;
  textGraphic.resolution = 4;
  const txtStyle = new HGC.libraries.PIXI.TextStyle(styleConfig);
  const metric = HGC.libraries.PIXI.TextMetrics.measureText(textGraphic.text, txtStyle);
  const txtWidth = metric.width / (2 * titleR * Math.PI) * tw * 360 / (endAngle - startAngle);
  const scaledStartX = padding;
  const scaledEndX = padding + txtWidth;
  const ropePoints = [];
  for (let i = scaledEndX; i >= scaledStartX; i -= txtWidth / 10) {
    const p = cartesianToPolar(i, tw, titleR - metric.height / 2, cx, cy, startAngle, endAngle);
    ropePoints.push(new HGC.libraries.PIXI.Point(p.x, p.y));
  }
  const startRad = valueToRadian(scaledStartX, tw, startAngle, endAngle);
  const endRad = valueToRadian(scaledEndX + padding, tw, startAngle, endAngle);
  g.lineStyle(1, colorToHex("red"), 0, 0.5);
  g.beginFill(colorToHex(theme.track.titleBackground), 0.5);
  g.moveTo(pos.x, pos.y);
  g.arc(cx, cy, titleR - metric.height, startRad, endRad, true);
  g.arc(cx, cy, titleR, endRad, startRad, false);
  g.closePath();
  textGraphic.updateText();
  const rope = new HGC.libraries.PIXI.SimpleRope(textGraphic.texture, ropePoints);
  g.addChild(rope);
}
function drawChartOutlines(trackInfo, tm, theme) {
  var _a, _b, _c, _d;
  const g = trackInfo.pBorder;
  const [l, t] = trackInfo.position;
  const [w, h] = trackInfo.dimensions;
  g.lineStyle(
    (_b = (_a = tm.spec().style) == null ? void 0 : _a.outlineWidth) != null ? _b : 1,
    // TODO: outline not working
    colorToHex((_d = (_c = tm.spec().style) == null ? void 0 : _c.outline) != null ? _d : theme.track.outline),
    1,
    // alpha
    0.5
    // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
  );
  g.beginFill(colorToHex("white"), 0);
  g.drawRect(l, t, w, h);
  const x = tm.spec().x;
  g.lineStyle(
    1,
    colorToHex(theme.axis.baselineColor),
    1,
    // alpha
    0.5
    // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
  );
  if (IsChannelDeep(x) && x.axis === "top") {
    g.moveTo(l, t);
    g.lineTo(l + w, t);
  } else if (IsChannelDeep(x) && x.axis === "bottom") {
    g.moveTo(l, t + h);
    g.lineTo(l + w, t + h);
  }
}
function drawColorLegend(HGC, trackInfo, _tile, model, theme) {
  if (!trackInfo.gLegend) {
    return;
  }
  trackInfo.gLegend.selectAll(".brush").remove();
  const spec = model.spec();
  const offset = { offsetRight: 0 };
  if (IsChannelDeep(spec.color) && spec.color.legend) {
    switch (spec.color.type) {
      case "nominal":
        drawColorLegendCategories(HGC, trackInfo, _tile, model, theme);
        break;
      case "quantitative":
        drawColorLegendQuantitative(HGC, trackInfo, _tile, model, theme, "color", offset);
        break;
    }
  }
  if (IsChannelDeep(spec.stroke) && spec.stroke.legend) {
    switch (spec.stroke.type) {
      case "quantitative":
        drawColorLegendQuantitative(HGC, trackInfo, _tile, model, theme, "stroke", offset);
        break;
    }
  }
}
function drawColorLegendQuantitative(HGC, trackInfo, _tile, model, theme, channelKey, offset) {
  const spec = model.spec();
  const channel = spec[channelKey];
  if (!IsChannelDeep(channel) || channel.type !== "quantitative" || !channel.legend) {
    return;
  }
  const [trackX, trackY] = trackInfo.position;
  const [trackWidth, trackHeight] = trackInfo.dimensions;
  const legendWidth = 80;
  const legendHeight = trackHeight - 2 > 110 ? 110 : Math.max(trackHeight - 2, 40 - 2);
  const colorBarDim = {
    top: 10,
    left: 55,
    width: 20,
    height: legendHeight - 20
  };
  const legendX = trackX + trackWidth - legendWidth - 1 - offset.offsetRight;
  const legendY = trackY + 1;
  const colorScale = model.getChannelScale(channelKey);
  const colorDomain = model.getChannelDomainArray(channelKey);
  if (!colorScale || !colorDomain) {
    return;
  }
  const graphics = trackInfo.pBorder;
  graphics.beginFill(colorToHex(theme.legend.background), theme.legend.backgroundOpacity);
  graphics.lineStyle(
    1,
    colorToHex(theme.legend.backgroundStroke),
    theme.legend.backgroundOpacity,
    // alpha
    0
    // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
  );
  graphics.drawRect(legendX, legendY, legendWidth, legendHeight);
  if (channel.title) {
    const titleStr = channel.title;
    const labelTextStyle2 = getTextStyle({
      color: theme.legend.labelColor,
      size: theme.legend.labelFontSize,
      fontWeight: theme.legend.labelFontWeight,
      fontFamily: theme.legend.labelFontFamily
    });
    const textGraphic = new HGC.libraries.PIXI.Text(titleStr, {
      ...labelTextStyle2,
      fontWeight: "bold"
    });
    textGraphic.anchor.x = 0;
    textGraphic.anchor.y = 0;
    textGraphic.position.x = legendX + 10;
    textGraphic.position.y = legendY + 10;
    const textStyleObj = new HGC.libraries.PIXI.TextStyle({ ...labelTextStyle2, fontWeight: "bold" });
    const textMetrics = HGC.libraries.PIXI.TextMetrics.measureText(titleStr, textStyleObj);
    graphics.addChild(textGraphic);
    colorBarDim.top += textMetrics.height + 4;
    colorBarDim.height -= textMetrics.height + 4;
  }
  const [startValue, endValue] = colorDomain;
  const extent = endValue - startValue;
  const scaleOffset = IsChannelDeep(channel) && channel.scaleOffset ? channel.scaleOffset : [0, 1];
  [...Array(colorBarDim.height).keys()].forEach((y) => {
    let value;
    const scaleOffsetSorted = Array.from(scaleOffset).sort();
    if (y / colorBarDim.height >= scaleOffsetSorted[1]) {
      value = endValue;
    } else if (y / colorBarDim.height <= scaleOffsetSorted[0]) {
      value = startValue;
    } else {
      const s1 = scaleLinear().domain([colorBarDim.height * scaleOffsetSorted[0], colorBarDim.height * scaleOffsetSorted[1]]).range([0, colorBarDim.height]);
      const s2 = scaleLinear().domain([0, colorBarDim.height]).range([startValue, endValue]);
      value = s2(s1(y));
    }
    graphics.beginFill(
      colorToHex(colorScale(value)),
      1
      // alpha
    );
    graphics.lineStyle(
      1,
      colorToHex(theme.legend.backgroundStroke),
      0,
      // alpha
      0.5
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    graphics.drawRect(
      legendX + colorBarDim.left,
      legendY + colorBarDim.top + colorBarDim.height - y,
      colorBarDim.width,
      1
    );
  });
  const BRUSH_HEIGHT = 4;
  trackInfo.colorBrushes = trackInfo.gLegend.append("g").attr("class", channelKey).selectAll(`.brush`).data(
    scaleOffset.map((d, i) => {
      return { y: d, id: i };
    })
  ).enter().append("rect").attr("class", `brush`).attr("pointer-events", "all").attr("cursor", "ns-resize").attr(
    "transform",
    (d) => `translate(${legendX + colorBarDim.left}, ${legendY + colorBarDim.top - BRUSH_HEIGHT / 2 + colorBarDim.height - colorBarDim.height * d.y})`
  ).attr("width", `${colorBarDim.width}px`).attr("height", `${BRUSH_HEIGHT}px`).attr("fill", "lightgrey").attr("stroke", "black").attr("stroke-width", "0.5px").call(
    HGC.libraries.d3Drag.drag().on("start", (event) => {
      trackInfo.startEvent = event.sourceEvent;
    }).on("drag", (event, d) => {
      if (channel && channel.scaleOffset) {
        const endEvent = event.sourceEvent;
        const diffY = trackInfo.startEvent.clientY - endEvent.clientY;
        const newScaleOffset = [channel.scaleOffset[0], channel.scaleOffset[1]];
        if (d.id === 0) {
          newScaleOffset[0] += diffY / colorBarDim.height;
        } else {
          newScaleOffset[1] += diffY / colorBarDim.height;
        }
        newScaleOffset[0] = Math.min(1, Math.max(0, newScaleOffset[0]));
        newScaleOffset[1] = Math.min(1, Math.max(0, newScaleOffset[1]));
        trackInfo.updateScaleOffsetFromOriginalSpec(spec._renderingId, newScaleOffset, channelKey);
        trackInfo.shareScaleOffsetAcrossTracksAndTiles(newScaleOffset, channelKey);
        trackInfo.draw();
        trackInfo.startEvent = event.sourceEvent;
      }
    })
  );
  const tickCount = Math.max(Math.ceil(colorBarDim.height / 30), 2);
  let ticks = colorScale.ticks(tickCount).filter((v) => colorDomain[0] <= v && v <= colorDomain[1]);
  if (ticks.length === 1) {
    ticks = colorScale.ticks(tickCount + 1).filter((v) => colorDomain[0] <= v && v <= colorDomain[1]);
  }
  const TICK_STROKE_SIZE = 1;
  graphics.lineStyle(
    TICK_STROKE_SIZE,
    colorToHex(theme.legend.tickColor),
    1,
    // alpha
    0.5
    // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
  );
  const labelTextStyle = getTextStyle({
    color: theme.legend.labelColor,
    size: theme.legend.labelFontSize,
    fontWeight: theme.legend.labelFontWeight,
    fontFamily: theme.legend.labelFontFamily
  });
  const tickEnd = legendX + colorBarDim.left;
  ticks.forEach((value) => {
    let y = legendY + colorBarDim.top + colorBarDim.height - (value - startValue) / extent * colorBarDim.height;
    if (y === legendY + colorBarDim.top) {
      y += TICK_STROKE_SIZE / 2;
    } else if (y === legendY + colorBarDim.top + colorBarDim.height) {
      y -= TICK_STROKE_SIZE / 2;
    }
    graphics.moveTo(tickEnd - 3, y);
    graphics.lineTo(tickEnd, y);
    const textGraphic = new HGC.libraries.PIXI.Text(value, labelTextStyle);
    textGraphic.anchor.x = 1;
    textGraphic.anchor.y = 0.5;
    textGraphic.position.x = tickEnd - 6;
    textGraphic.position.y = y;
    graphics.addChild(textGraphic);
  });
  offset.offsetRight = trackWidth - legendX;
}
function drawColorLegendCategories(HGC, track, _tile, tm, theme) {
  var _a, _b, _c, _d, _e;
  const spec = tm.spec();
  if (!IsChannelDeep(spec.color) || spec.color.type !== "nominal" || !spec.color.legend) {
    return;
  }
  const colorCategories = (_a = tm.getChannelDomainArray("color")) != null ? _a : ["___SINGLE_COLOR___"];
  if (colorCategories.length === 0) {
    return;
  }
  const domain = spec.color.domain;
  const range = spec.color.range;
  const existingLegends = track.displayedLegends;
  const toStr = (_) => {
    return typeof _ === "string" ? _ : _.join();
  };
  if (existingLegends.find((d) => toStr(d.domain) === toStr(domain) && toStr(d.range) === toStr(range))) {
    return;
  } else {
    existingLegends.push({ domain, range });
  }
  const graphics = track.pBorder;
  const paddingX = 10;
  const paddingY = 4;
  let cumY = paddingY;
  let maxWidth = 0;
  const recipe = [];
  const labelTextStyle = getTextStyle({
    color: theme.legend.labelColor,
    size: theme.legend.labelFontSize,
    fontWeight: theme.legend.labelFontWeight,
    fontFamily: theme.legend.labelFontFamily
  });
  if ((_b = spec.style) == null ? void 0 : _b.inlineLegend) {
    colorCategories.map((d) => d).reverse().forEach((category) => {
      if (maxWidth > track.dimensions[0]) {
        return;
      }
      const color2 = tm.encodedValue("color", category);
      const textGraphic = new HGC.libraries.PIXI.Text(category, labelTextStyle);
      textGraphic.anchor.x = 1;
      textGraphic.anchor.y = 0;
      textGraphic.position.x = track.position[0] + track.dimensions[0] - maxWidth - paddingX;
      textGraphic.position.y = track.position[1] + paddingY;
      graphics.addChild(textGraphic);
      const textStyleObj = new HGC.libraries.PIXI.TextStyle(labelTextStyle);
      const textMetrics = HGC.libraries.PIXI.TextMetrics.measureText(category, textStyleObj);
      if (cumY < textMetrics.height + paddingY * 3) {
        cumY = textMetrics.height + paddingY * 3;
      }
      recipe.push({
        x: track.position[0] + track.dimensions[0] - textMetrics.width - maxWidth - paddingX * 2,
        y: track.position[1] + paddingY + textMetrics.height / 2,
        color: color2
      });
      maxWidth += textMetrics.width + paddingX * 3;
    });
  } else {
    if ((_c = spec.style) == null ? void 0 : _c.legendTitle) {
      const textGraphic = new HGC.libraries.PIXI.Text((_d = spec.style) == null ? void 0 : _d.legendTitle, {
        ...labelTextStyle,
        fontWeight: "bold"
      });
      textGraphic.anchor.x = 1;
      textGraphic.anchor.y = 0;
      textGraphic.position.x = track.position[0] + track.dimensions[0] - paddingX;
      textGraphic.position.y = track.position[1] + cumY;
      const textStyleObj = new HGC.libraries.PIXI.TextStyle({ ...labelTextStyle, fontWeight: "bold" });
      const textMetrics = HGC.libraries.PIXI.TextMetrics.measureText((_e = spec.style) == null ? void 0 : _e.legendTitle, textStyleObj);
      graphics.addChild(textGraphic);
      cumY += textMetrics.height + paddingY * 2;
    }
    colorCategories.forEach((category) => {
      if (cumY > track.dimensions[1]) {
        return;
      }
      const color2 = tm.encodedValue("color", category);
      const textGraphic = new HGC.libraries.PIXI.Text(category, labelTextStyle);
      textGraphic.anchor.x = 1;
      textGraphic.anchor.y = 0;
      textGraphic.position.x = track.position[0] + track.dimensions[0] - paddingX;
      textGraphic.position.y = track.position[1] + cumY;
      graphics.addChild(textGraphic);
      const textStyleObj = new HGC.libraries.PIXI.TextStyle(labelTextStyle);
      const textMetrics = HGC.libraries.PIXI.TextMetrics.measureText(category, textStyleObj);
      if (maxWidth < textMetrics.width + paddingX * 3) {
        maxWidth = textMetrics.width + paddingX * 3;
      }
      recipe.push({
        x: track.position[0] + track.dimensions[0] - textMetrics.width - paddingX * 2,
        y: track.position[1] + cumY + textMetrics.height / 2,
        color: color2
      });
      cumY += textMetrics.height + paddingY * 2;
    });
  }
  graphics.beginFill(colorToHex(theme.legend.background), theme.legend.backgroundOpacity);
  graphics.lineStyle(
    1,
    colorToHex(theme.legend.backgroundStroke),
    theme.legend.backgroundOpacity,
    // alpha
    0
    // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
  );
  graphics.drawRect(
    track.position[0] + track.dimensions[0] - maxWidth - 1,
    track.position[1] + 1,
    maxWidth,
    cumY - paddingY
  );
  recipe.forEach((r) => {
    graphics.lineStyle(
      1,
      colorToHex("black"),
      0,
      // alpha
      0
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    graphics.beginFill(colorToHex(r.color), 1);
    graphics.drawCircle(r.x, r.y, 4);
  });
}
function drawRowLegend(HGC, trackInfo, _tile, tm, theme) {
  var _a;
  const spec = tm.spec();
  if (!IsChannelDeep(spec.row) || spec.row.type !== "nominal" || !spec.row.legend) {
    return;
  }
  const rowCategories = (_a = tm.getChannelDomainArray("row")) != null ? _a : ["___SINGLE_ROW___"];
  if (rowCategories.length === 0) {
    return;
  }
  const graphics = trackInfo.pBorder;
  const paddingX = 4;
  const paddingY = 2;
  const labelTextStyle = getTextStyle({
    color: theme.legend.labelColor,
    size: theme.legend.labelFontSize,
    fontWeight: theme.legend.labelFontWeight,
    fontFamily: theme.legend.labelFontFamily
  });
  rowCategories.forEach((category) => {
    const rowPosition = tm.encodedValue("row", category);
    const textGraphic = new HGC.libraries.PIXI.Text(category, labelTextStyle);
    textGraphic.anchor.x = 0;
    textGraphic.anchor.y = 0;
    textGraphic.position.x = trackInfo.position[0] + paddingX;
    textGraphic.position.y = trackInfo.position[1] + rowPosition + paddingY;
    graphics.addChild(textGraphic);
    const textStyleObj = new HGC.libraries.PIXI.TextStyle(labelTextStyle);
    const textMetrics = HGC.libraries.PIXI.TextMetrics.measureText(category, textStyleObj);
    graphics.beginFill(colorToHex(theme.legend.background), theme.legend.backgroundOpacity);
    graphics.lineStyle(
      1,
      colorToHex(theme.legend.backgroundStroke),
      0,
      // alpha
      0
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    graphics.drawRect(
      trackInfo.position[0] + 1,
      trackInfo.position[1] + rowPosition + 1,
      textMetrics.width + paddingX * 2,
      textMetrics.height + paddingY * 2
    );
  });
}
const EXTENT_TICK_SIZE = 8;
const TICK_SIZE = 6;
function drawLinearYAxis(HGC, trackInfo, _tile, model, theme) {
  var _a;
  const spec = model.spec();
  const CIRCULAR = spec.layout === "circular";
  const yDomain = model.getChannelDomainArray("y");
  const yRange = model.getChannelRangeArray("y");
  if (CIRCULAR) {
    return;
  }
  if (!model.isShowYAxis() || !yDomain || !yRange) {
    return;
  }
  if (!isNumberArray(yDomain)) {
    return;
  }
  const [tw, th] = trackInfo.dimensions;
  const [tx, ty] = trackInfo.position;
  const rowCategories = (_a = model.getChannelDomainArray("row")) != null ? _a : ["___SINGLE_ROW___"];
  if (!isStringArray(rowCategories)) {
    return;
  }
  const rowHeight = th / rowCategories.length;
  if (rowHeight <= 20) {
    return;
  }
  const yChannel = model.spec().y;
  const isLeft = IsChannelDeep(yChannel) && "axis" in yChannel && yChannel.axis === "right" ? false : true;
  const yScale = scaleLinear().domain(yDomain).range(yRange);
  const graphics = trackInfo.pBorder;
  rowCategories.forEach((category) => {
    const rowPosition = model.encodedValue("row", category);
    const dx = isLeft ? tx : tx + tw;
    const dy = ty + rowPosition;
    graphics.lineStyle(
      1,
      colorToHex(theme.axis.baselineColor),
      1,
      // alpha
      0.5
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    graphics.moveTo(dx, dy);
    graphics.lineTo(dx, dy + rowHeight);
    const tickCount = Math.max(Math.ceil(rowHeight / 40), 1);
    let ticks = yScale.ticks(tickCount).filter((v) => yDomain[0] <= v && v <= yDomain[1]);
    if (ticks.length === 1) {
      ticks = yScale.ticks(tickCount + 1).filter((v) => yDomain[0] <= v && v <= yDomain[1]);
    }
    graphics.lineStyle(
      1,
      colorToHex(theme.axis.tickColor),
      1,
      // alpha
      0.5
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    let tickEnd = isLeft ? dx + TICK_SIZE : dx - TICK_SIZE;
    ticks.forEach((t) => {
      const y = yScale(t);
      graphics.moveTo(dx, dy + rowHeight - y);
      graphics.lineTo(tickEnd, dy + rowHeight - y);
    });
    tickEnd = isLeft ? dx + EXTENT_TICK_SIZE : dx - EXTENT_TICK_SIZE;
    graphics.moveTo(dx, dy);
    graphics.lineTo(tickEnd, dy);
    graphics.moveTo(dx, dy + rowHeight);
    graphics.lineTo(tickEnd, dy + rowHeight);
    const styleConfig = getTextStyle({
      color: theme.axis.labelColor,
      size: theme.axis.labelFontSize,
      fontFamily: theme.axis.labelFontFamily,
      fontWeight: theme.axis.labelFontWeight
    });
    ticks.forEach((t) => {
      const y = yScale(t);
      tickEnd = isLeft ? dx + TICK_SIZE * 2 : dx - TICK_SIZE * 2;
      const textGraphic = new HGC.libraries.PIXI.Text(t, styleConfig);
      textGraphic.anchor.x = isLeft ? 0 : 1;
      textGraphic.anchor.y = y === 0 ? 0.9 : 0.5;
      textGraphic.position.x = tickEnd;
      textGraphic.position.y = dy + rowHeight - y;
      if (spec.orientation === "vertical") {
        textGraphic.anchor.x = isLeft ? 1 : 0;
        textGraphic.scale.x *= -1;
      }
      graphics.addChild(textGraphic);
    });
  });
}
function drawCircularYAxis(HGC, trackInfo, tile, model, theme) {
  var _a, _b, _c, _d, _e;
  const spec = model.spec();
  const CIRCULAR = spec.layout === "circular";
  const yDomain = model.getChannelDomainArray("y");
  const yRange = model.getChannelRangeArray("y");
  if (!CIRCULAR) {
    return;
  }
  if (!model.isShowYAxis() || !yDomain || !yRange) {
    return;
  }
  if (!isNumberArray(yDomain)) {
    return;
  }
  const [tw, th] = trackInfo.dimensions;
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const cx = tw / 2;
  const cy = th / 2;
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = th / rowCategories.length;
  if (rowHeight / th * trackRingSize <= 20) {
    return;
  }
  const yChannel = model.spec().y;
  const isLeft = IsChannelDeep(yChannel) && "axis" in yChannel && yChannel.axis === "right" ? false : true;
  const yScale = scaleLinear().domain(yDomain).range(yRange);
  const graphics = tile.graphics;
  rowCategories.forEach((category) => {
    const rowPosition = model.encodedValue("row", category);
    const innerR = trackOuterRadius - (rowPosition + rowHeight) / th * trackRingSize;
    const outerR = trackOuterRadius - rowPosition / th * trackRingSize;
    const innerPos = cartesianToPolar(isLeft ? 0 : tw, tw, innerR, cx, cy, startAngle, endAngle);
    const outerPos = cartesianToPolar(isLeft ? 0 : tw, tw, outerR, cx, cy, startAngle, endAngle);
    graphics.lineStyle(
      1,
      colorToHex(theme.axis.baselineColor),
      1,
      // alpha
      0.5
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    graphics.moveTo(innerPos.x, innerPos.y);
    graphics.lineTo(outerPos.x, outerPos.y);
    const SCALED_TICK_SIZE = (r) => TICK_SIZE * tw / 2 / Math.PI / r;
    const SCALED_EXTENT_TICK_SIZE = (r) => EXTENT_TICK_SIZE * tw / 2 / Math.PI / r;
    const axisHeight = rowHeight / th * trackRingSize;
    const tickCount = Math.max(Math.ceil(axisHeight / 40), 1);
    let ticks = yScale.ticks(tickCount).filter((v) => yDomain[0] <= v && v <= yDomain[1]);
    if (ticks.length === 1) {
      ticks = yScale.ticks(tickCount + 1).filter((v) => yDomain[0] <= v && v <= yDomain[1]);
    }
    graphics.lineStyle(
      1,
      colorToHex(theme.axis.tickColor),
      1,
      // alpha
      0.5
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    ticks.forEach((t) => {
      const y = yScale(t);
      const currentR = trackOuterRadius - (rowPosition + rowHeight - y) / th * trackRingSize;
      const scaledStartX = isLeft ? 0 : tw - SCALED_TICK_SIZE(currentR);
      const scaledEndX = isLeft ? SCALED_TICK_SIZE(currentR) : tw;
      const pos = cartesianToPolar(scaledStartX, tw, currentR, cx, cy, startAngle, endAngle);
      const startRad = valueToRadian(scaledStartX, tw, startAngle, endAngle);
      const endRad = valueToRadian(scaledEndX, tw, startAngle, endAngle);
      graphics.moveTo(pos.x, pos.y);
      graphics.arc(cx, cy, currentR, startRad, endRad, true);
      graphics.arc(cx, cy, currentR, endRad, startRad, false);
      graphics.closePath();
    });
    {
      const scaledStartX = isLeft ? 0 : tw - SCALED_EXTENT_TICK_SIZE(trackInnerRadius);
      const scaledEndX = isLeft ? SCALED_EXTENT_TICK_SIZE(trackInnerRadius) : tw;
      const startRad = valueToRadian(scaledStartX, tw, startAngle, endAngle);
      const endRad = valueToRadian(scaledEndX, tw, startAngle, endAngle);
      graphics.moveTo(innerPos.x, innerPos.y);
      graphics.arc(cx, cy, trackInnerRadius, startRad, endRad, true);
      graphics.arc(cx, cy, trackInnerRadius, endRad, startRad, false);
      graphics.closePath();
    }
    {
      const scaledStartX = isLeft ? 0 : tw - SCALED_EXTENT_TICK_SIZE(trackOuterRadius);
      const scaledEndX = isLeft ? SCALED_EXTENT_TICK_SIZE(trackOuterRadius) : tw;
      const startRad = valueToRadian(scaledStartX, tw, startAngle, endAngle);
      const endRad = valueToRadian(scaledEndX, tw, startAngle, endAngle);
      graphics.moveTo(outerPos.x, outerPos.y);
      graphics.arc(cx, cy, trackOuterRadius, startRad, endRad, true);
      graphics.arc(cx, cy, trackOuterRadius, endRad, startRad, false);
      graphics.closePath();
    }
    ticks.forEach((t) => {
      const y = yScale(t);
      const currentR = trackOuterRadius - (rowPosition + rowHeight - y) / th * trackRingSize;
      const pos = cartesianToPolar(SCALED_TICK_SIZE(currentR) * 2, tw, currentR, cx, cy, startAngle, endAngle);
      const styleConfig = getTextStyle({
        color: theme.axis.labelColor,
        size: theme.axis.labelFontSize,
        fontFamily: theme.axis.labelFontFamily,
        fontWeight: theme.axis.labelFontWeight
      });
      const textGraphic = new HGC.libraries.PIXI.Text(t, styleConfig);
      textGraphic.anchor.x = isLeft ? 1 : 0;
      textGraphic.anchor.y = 0.5;
      textGraphic.position.x = pos.x;
      textGraphic.position.y = pos.y;
      textGraphic.resolution = 4;
      const txtStyle = new HGC.libraries.PIXI.TextStyle(styleConfig);
      const metric = HGC.libraries.PIXI.TextMetrics.measureText(textGraphic.text, txtStyle);
      const txtWidth = metric.width / (2 * currentR * Math.PI) * tw * 360 / (endAngle - startAngle);
      const scaledStartX = isLeft ? SCALED_TICK_SIZE(currentR) * 2 : tw - SCALED_TICK_SIZE(currentR) * 2 - txtWidth;
      const scaledEndX = isLeft ? SCALED_TICK_SIZE(currentR) * 2 + txtWidth : tw - SCALED_TICK_SIZE(currentR) * 2;
      const ropePoints = [];
      for (let i = scaledEndX; i >= scaledStartX; i -= txtWidth / 10) {
        const p = cartesianToPolar(i, tw, currentR, cx, cy, startAngle, endAngle);
        ropePoints.push(new HGC.libraries.PIXI.Point(p.x, p.y));
      }
      textGraphic.updateText();
      const rope = new HGC.libraries.PIXI.SimpleRope(textGraphic.texture, ropePoints);
      graphics.addChild(rope);
    });
  });
}
function drawCircularOutlines(trackInfo, tm, theme) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  const spec = tm.spec();
  const [l, t] = trackInfo.position;
  const [trackWidth, trackHeight] = trackInfo.dimensions;
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const cx = l + trackWidth / 2;
  const cy = t + trackHeight / 2;
  const posStartInner = cartesianToPolar(0, trackWidth, trackInnerRadius, cx, cy, startAngle, endAngle);
  const startRad = valueToRadian(0, trackWidth, startAngle, endAngle);
  const endRad = valueToRadian(trackWidth, trackWidth, startAngle, endAngle);
  const g = trackInfo.pBackground;
  if (!(spec.layout === "circular" && spec.mark === "withinLink")) {
    g.lineStyle(
      ((_e = spec.style) == null ? void 0 : _e.outlineWidth) ? ((_f = spec.style) == null ? void 0 : _f.outlineWidth) / 2.5 : 0,
      colorToHex((_h = (_g = spec.style) == null ? void 0 : _g.outline) != null ? _h : "#DBDBDB"),
      1,
      // 0.4, // alpha
      1
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    g.beginFill(
      colorToHex((_j = (_i = tm.spec().style) == null ? void 0 : _i.background) != null ? _j : theme.track.background),
      (_l = (_k = tm.spec().style) == null ? void 0 : _k.backgroundOpacity) != null ? _l : !theme.track.background || theme.track.background === "transparent" ? 0 : 1
    );
    g.moveTo(posStartInner.x, posStartInner.y);
    g.arc(cx, cy, trackInnerRadius, startRad, endRad, true);
    g.arc(cx, cy, trackOuterRadius, endRad, startRad, false);
    g.closePath();
  }
  if (IsChannelDeep(spec.x) && spec.x.axis === "top") {
    g.lineStyle(
      0.5,
      colorToHex("black"),
      0,
      // 1, // alpha
      0.5
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    g.beginFill(colorToHex("white"), 0);
    g.moveTo(posStartInner.x, posStartInner.y);
    g.arc(cx, cy, trackOuterRadius - 0.5, startRad, endRad, true);
    g.arc(cx, cy, trackOuterRadius, endRad, startRad, false);
    g.closePath();
  }
  g.lineStyle(
    0.5,
    colorToHex("black"),
    0,
    // alpha
    0.5
    // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
  );
  g.beginFill(colorToHex("white"), 0);
  g.moveTo(cx, cy);
  g.arc(cx, cy, trackOuterRadius + 3, startRad, endRad, false);
  g.closePath();
  g.lineStyle(
    1,
    colorToHex("#DBDBDB"),
    0,
    // alpha
    0
    // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
  );
  g.beginFill(colorToHex("white"), 0);
  g.drawCircle(cx, cy, trackInnerRadius - 1);
}
function drawBackground(trackInfo, tm, theme) {
  var _a, _b, _c, _d, _e, _f;
  const [l, t] = trackInfo.position;
  const [w, h] = trackInfo.dimensions;
  const g = trackInfo.pBackground;
  if (((_a = tm.spec().style) == null ? void 0 : _a.background) || theme.track.background && theme.track.background !== "transparent") {
    g.clear();
    const bg = (_c = (_b = tm.spec().style) == null ? void 0 : _b.background) != null ? _c : theme.track.background;
    const alpha = isUndefined((_d = tm.spec().style) == null ? void 0 : _d.backgroundOpacity) ? 1 : (_e = tm.spec().style) == null ? void 0 : _e.backgroundOpacity;
    g.lineStyle(
      1,
      colorToHex("white"),
      0,
      // alpha
      0
      // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
    );
    g.beginFill(colorToHex(bg), alpha);
    g.drawRect(l, t, w, h);
  }
  if (theme.track.alternatingBackground && theme.track.alternatingBackground !== "transparent") {
    const spec = tm.spec();
    if (!IsChannelDeep(spec.row) || spec.row.type !== "nominal") {
      return;
    }
    const rowCategories = (_f = tm.getChannelDomainArray("row")) != null ? _f : ["___SINGLE_ROW___"];
    if (rowCategories.length === 0) {
      return;
    }
    rowCategories.forEach((category, i) => {
      var _a2, _b2, _c2, _d2;
      if (i % 2 === 0) {
        return;
      }
      const rowPosition = tm.encodedValue("row", category);
      const bg = (_b2 = (_a2 = tm.spec().style) == null ? void 0 : _a2.background) != null ? _b2 : theme.track.alternatingBackground;
      const alpha = isUndefined((_c2 = tm.spec().style) == null ? void 0 : _c2.backgroundOpacity) ? 1 : (_d2 = tm.spec().style) == null ? void 0 : _d2.backgroundOpacity;
      g.lineStyle(
        1,
        colorToHex("white"),
        0,
        // alpha
        0
        // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
      );
      g.beginFill(colorToHex(bg), alpha);
      g.drawRect(trackInfo.position[0], trackInfo.position[1] + rowPosition, w, h / rowCategories.length);
    });
  }
}
function drawBetweenLink(g, trackInfo, model) {
  var _a, _b, _c, _d, _e;
  const spec = model.spec();
  if (!spec.width || !spec.height) {
    console.warn("Size of a track is not properly determined, so visual mark cannot be rendered");
    return;
  }
  const data2 = model.data();
  const [trackWidth, trackHeight] = trackInfo.dimensions;
  const circular = spec.layout === "circular";
  const trackInnerRadius = (_a = spec.innerRadius) != null ? _a : 220;
  const trackOuterRadius = (_b = spec.outerRadius) != null ? _b : 300;
  const startAngle = (_c = spec.startAngle) != null ? _c : 0;
  const endAngle = (_d = spec.endAngle) != null ? _d : 360;
  const trackRingSize = trackOuterRadius - trackInnerRadius;
  const tcx = trackWidth / 2;
  const tcy = trackHeight / 2;
  const rowCategories = (_e = model.getChannelDomainArray("row")) != null ? _e : ["___SINGLE_ROW___"];
  const rowHeight = trackHeight / rowCategories.length;
  rowCategories.forEach((rowCategory) => {
    const rowPosition = model.encodedValue("row", rowCategory);
    data2.filter(
      (d) => !getValueUsingChannel(d, spec.row) || getValueUsingChannel(d, spec.row) === rowCategory
    ).forEach((d) => {
      var _a2, _b2;
      let x = model.encodedPIXIProperty("x", d);
      let xe = model.encodedPIXIProperty("xe", d);
      let x1 = model.encodedPIXIProperty("x1", d);
      let x1e = model.encodedPIXIProperty("x1e", d);
      const y = model.encodedPIXIProperty("y", d);
      const stroke = model.encodedPIXIProperty("stroke", d);
      const strokeWidth = model.encodedPIXIProperty("strokeWidth", d);
      const color2 = model.encodedPIXIProperty("color", d);
      const opacity = model.encodedPIXIProperty("opacity", d);
      if (typeof xe !== "undefined") {
        [x, xe] = [x, xe].sort((a, b) => a - b);
      }
      if (typeof x1 !== "undefined" && typeof x1e !== "undefined") {
        [x1, x1e] = [x1, x1e].sort((a, b) => a - b);
      }
      const isRibon = typeof xe !== "undefined" && typeof x1 !== "undefined" && typeof x1e !== "undefined" && // This means the strokeWidth of a band is too small, so we just need to draw a line instead
      Math.abs(x - xe) > 0.1 && Math.abs(x1 - x1e) > 0.1;
      if (!isRibon && xe === void 0 && !Is2DTrack(spec)) {
        if (x1 === void 0 && x1e === void 0) {
          return;
        }
        xe = x1 !== void 0 ? x1 : x1e;
      }
      if (!isRibon && Math.abs(x - xe) <= 0.1 && Math.abs(x1 - x1e) <= 0.1) {
        x = (x + xe) / 2;
        xe = (x1 + x1e) / 2;
      }
      g.lineStyle(
        strokeWidth,
        colorToHex(stroke),
        opacity,
        // alpha
        0.5
        // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
      );
      if (isRibon) {
        g.beginFill(color2 === "none" ? colorToHex("white") : colorToHex(color2), color2 === "none" ? 0 : opacity);
        let [_x1, _x2, _x3, _x4] = [x, xe, x1, x1e];
        [_x1, _x2] = [_x1, _x2].sort((a, b) => a - b);
        [_x3, _x4] = [_x3, _x4].sort((a, b) => a - b);
        if (_x1 > trackWidth || _x4 < 0 || Math.abs(_x4 - _x1) < 0.5) {
          return;
        }
        if (circular) {
          if (_x1 < 0 || _x4 > trackWidth) {
            return;
          }
          const r = trackOuterRadius - rowPosition / trackHeight * trackRingSize;
          const posX = cartesianToPolar(_x1, trackWidth, r, tcx, tcy, startAngle, endAngle);
          const posXE = cartesianToPolar(_x2, trackWidth, r, tcx, tcy, startAngle, endAngle);
          const posX1 = cartesianToPolar(_x3, trackWidth, r, tcx, tcy, startAngle, endAngle);
          const posX1E = cartesianToPolar(_x4, trackWidth, r, tcx, tcy, startAngle, endAngle);
          g.moveTo(posX.x, posX.y);
          g.bezierCurveTo(tcx, tcy, tcx, tcy, posX1E.x, posX1E.y);
          g.arc(
            tcx,
            tcy,
            trackOuterRadius,
            positionToRadian(posX1E.x, posX1E.y, tcx, tcy),
            positionToRadian(posX1.x, posX1.y, tcx, tcy),
            false
          );
          g.bezierCurveTo(tcx, tcy, tcx, tcy, posXE.x, posXE.y);
          g.arc(
            tcx,
            tcy,
            trackOuterRadius,
            positionToRadian(posXE.x, posXE.y, tcx, tcy),
            positionToRadian(posX.x, posX.y, tcx, tcy),
            false
          );
          g.endFill();
        } else {
          g.moveTo(_x1, rowPosition);
          g.lineTo(_x2, rowPosition);
          g.lineTo(_x4, rowPosition + rowHeight);
          g.lineTo(_x3, rowPosition + rowHeight);
          g.lineTo(_x1, rowPosition);
          g.closePath();
        }
      } else {
        if (Is2DTrack(spec)) {
          if (((_a2 = spec.style) == null ? void 0 : _a2.linkConnectionType) === "curve") {
            g.moveTo(x, 0);
            g.bezierCurveTo(
              x / 5 * 4,
              (rowPosition + rowHeight - y) / 2,
              x / 2,
              (rowPosition + rowHeight - y) / 5 * 4,
              0,
              rowPosition + rowHeight - y
            );
          } else if (((_b2 = spec.style) == null ? void 0 : _b2.linkConnectionType) === "straight") {
            g.moveTo(x, 0);
            g.lineTo(0, rowPosition + rowHeight - y);
          } else {
            g.moveTo(x, 0);
            g.lineTo(x, rowPosition + rowHeight - y);
            g.lineTo(0, rowPosition + rowHeight - y);
          }
          return;
        }
        if (circular) {
          let prevX, prevY;
          for (let t = 0; t <= 1; t += 0.02) {
            const logodds = (t2) => Math.log(t2 / (1 - t2));
            const movingRadius = (t2) => trackOuterRadius - 1 / (1 + Math.exp(logodds(t2))) * trackRingSize + 3;
            const getRadian = (t2, s, e) => ((e - s) * t2 + s) / trackWidth;
            const _x = tcx + movingRadius(t) * Math.cos(-getRadian(t, x, xe) * 2 * Math.PI - Math.PI / 2);
            const _y = tcy + movingRadius(t) * Math.sin(-getRadian(t, x, xe) * 2 * Math.PI - Math.PI / 2);
            if (prevX && prevY) {
              g.lineStyle(
                strokeWidth,
                colorToHex(stroke),
                opacity,
                // alpha
                0.5
                // alignment of the line to draw, (0 = inner, 0.5 = middle, 1 = outter)
              );
              g.moveTo(prevX, prevY);
              g.lineTo(_x, _y);
            }
            prevX = _x;
            prevY = _y;
          }
          return;
        }
        g.moveTo(xe, rowPosition + rowHeight);
        g.lineTo(x, rowPosition);
      }
    });
  });
}
const SUPPORTED_CHANNELS = [
  "x",
  "xe",
  "x1",
  "x1e",
  "y",
  "ye",
  "y1",
  "y1e",
  "color",
  "size",
  "row",
  "stroke",
  "strokeWidth",
  "opacity",
  "text"
  // ...
];
function drawMark(HGC, trackInfo, tile, model) {
  if (!HGC || !trackInfo || !tile) {
    return;
  }
  if (model.spec().mark === "brush") {
    return;
  }
  ["x", "x1", "x1e", "xe"].forEach((d) => {
    model.setChannelScale(d, trackInfo._xScale);
  });
  if (Is2DTrack(model.spec()) || IsVerticalRule(model.spec())) {
    const yScale = trackInfo._yScale.copy();
    yScale.range([yScale.range()[1], yScale.range()[0]]);
    ["y", "y1", "y1e", "ye"].forEach((d) => {
      model.setChannelScale(d, yScale);
    });
  }
  const [trackWidth, trackHeight] = trackInfo.dimensions;
  switch (model.spec().mark) {
    case "point":
      drawPoint(trackInfo, tile.graphics, model);
      break;
    case "bar":
      drawBar(trackInfo, tile, model);
      break;
    case "line":
      drawLine(tile.graphics, model, trackWidth, trackHeight);
      break;
    case "area":
      drawArea(HGC, trackInfo, tile, model);
      break;
    case "rect":
      drawRect(HGC, trackInfo, tile, model);
      break;
    case "triangleLeft":
    case "triangleRight":
    case "triangleBottom":
      drawTriangle(tile.graphics, model, trackWidth, trackHeight);
      break;
    case "text":
      drawText(HGC, trackInfo, tile, model);
      break;
    case "rule":
      drawRule(HGC, trackInfo, tile, model);
      break;
    case "betweenLink":
      drawBetweenLink(tile.graphics, trackInfo, model);
      break;
    case "withinLink":
      drawWithinLink(tile.graphics, trackInfo, model);
      break;
    default:
      console.warn("Unsupported mark type");
      break;
  }
}
function drawPreEmbellishment(HGC, trackInfo, tile, model, theme) {
  if (!HGC || !trackInfo || !tile) {
    return;
  }
  if (model.spec().mark === "brush") {
    return;
  }
  ["x", "x1", "x1e", "xe"].forEach((d) => {
    model.setChannelScale(d, trackInfo._xScale);
  });
  const isCircular = model.spec().layout === "circular";
  if (isCircular) {
    drawCircularOutlines(trackInfo, model, theme);
  } else {
    drawBackground(trackInfo, model, theme);
    drawChartOutlines(trackInfo, model, theme);
  }
  drawGrid(trackInfo, model, theme);
}
function drawPostEmbellishment(HGC, trackInfo, tile, model, theme) {
  if (!HGC || !trackInfo || !tile) {
    return;
  }
  if (model.spec().mark === "brush") {
    return;
  }
  ["x", "x1", "x1e", "xe"].forEach((d) => {
    model.setChannelScale(d, trackInfo._xScale);
  });
  const isCircular = model.spec().layout === "circular";
  if (isCircular) {
    drawCircularYAxis(HGC, trackInfo, tile, model, theme);
    drawCircularTitle(HGC, trackInfo, tile, model, theme);
  } else {
    drawLinearYAxis(HGC, trackInfo, tile, model, theme);
    drawRowLegend(HGC, trackInfo, tile, model, theme);
  }
  drawColorLegend(HGC, trackInfo, tile, model, theme);
}
function resolveSuperposedTracks(track) {
  if (IsDataTrack(track) || IsDummyTrack(track)) {
    return [];
  }
  if (!IsOverlaidTrack(track)) {
    return [track];
  }
  if (track._overlay.length === 0) {
    return [{ ...track, superpose: void 0 }];
  }
  const { _overlay, ...base } = track;
  const resolved = [];
  track._overlay.forEach((subSpec, i) => {
    const spec = Object.assign({}, base, subSpec);
    if (spec.title && i !== 0) {
      delete spec.title;
    }
    resolved.push(spec);
  });
  let xAxisPosition = void 0;
  resolved.forEach((d) => {
    if (IsChannelDeep(d.x) && d.x.axis && !xAxisPosition) {
      xAxisPosition = d.x.axis;
    }
  });
  const corrected = resolved.map((d) => {
    return {
      ...d,
      x: { ...d.x, axis: xAxisPosition }
    };
  });
  return corrected;
}
function spreadTracksByData(tracks) {
  return [].concat(
    ...tracks.map((t) => {
      if (IsDataTrack(t) || !IsOverlaidTrack(t) || t._overlay.length <= 1) {
        return [t];
      }
      if (t._overlay.filter((s) => s.data).length === 0) {
        return [t];
      }
      if (isIdenticalDataSpec([t.data, ...t._overlay.map((s) => s.data)])) {
        return [t];
      }
      const base = { ...t, id: void 0, _overlay: void 0 };
      const spread = [];
      const original = JSON.parse(JSON.stringify(base));
      original._overlay = [];
      t._overlay.forEach((subSpec) => {
        if (!original.data) {
          original.data = subSpec.data;
        }
        if (!original.id) {
          original.id = subSpec.id;
        }
        if (!subSpec.data || isIdenticalDataSpec([original.data, subSpec.data])) {
          original._overlay.push(subSpec);
          return;
        }
        const spec = Object.assign(JSON.parse(JSON.stringify(base)), subSpec);
        spread.push(spec);
      });
      const output = original._overlay.length > 0 ? [original, ...spread] : spread;
      return output.map((track, i, arr) => {
        const overlayOnPreviousTrack = i !== 0;
        const y = IsSingleTrack(track) && IsChannelDeep(track.y) && !track.y.axis && overlayOnPreviousTrack ? { ...track.y, axis: i === 1 ? "right" : "none" } : IsSingleTrack(track) ? track.y : void 0;
        if (track.title && i !== arr.length - 1 && arr.length !== 1) {
          delete track.title;
        }
        return { ...track, overlayOnPreviousTrack, y };
      });
    })
  );
}
function isIdenticalDataSpec(specs) {
  if (specs.length === 0) {
    return false;
  }
  const definedSpecs = specs.filter((d) => d);
  if (definedSpecs.length !== specs.length) {
    return false;
  }
  const keys = Object.keys(definedSpecs[0]).sort();
  let isIdentical = true;
  keys.forEach((k) => {
    const uniqueProperties = Array.from(new Set(definedSpecs.map((d) => JSON.stringify(d[k]))));
    if (uniqueProperties.length !== 1) {
      isIdentical = false;
      return;
    }
  });
  return isIdentical;
}
const PREDEFINED_COLOR_STR_MAP = {
  viridis: interpolateViridis,
  grey: interpolateGreys,
  warm: interpolateWarm,
  spectral: interpolateSpectral,
  cividis: interpolateCividis,
  bupu: interpolateBuPu,
  rdbu: interpolateRdBu,
  hot: interpolateYlOrBr,
  pink: interpolateRdPu
};
function isObject(x) {
  return typeof x === "object" && x !== null;
}
function isTabularDataFetcher(dataFetcher) {
  return isObject(dataFetcher) && "getTabularData" in dataFetcher;
}
function hasDataTransform(spec, type2) {
  var _a;
  return ((_a = spec.dataTransform) != null ? _a : []).some((d) => d.type === type2);
}
function getHiGlassColorRange(colorStr = "viridis", step = 100) {
  var _a;
  const interpolate = (_a = PREDEFINED_COLOR_STR_MAP[colorStr]) != null ? _a : PREDEFINED_COLOR_STR_MAP["viridis"];
  return [...Array(step)].map((_, i) => interpolate(1 / step * i));
}
function IsFlatTracks(_) {
  return !("alignment" in _) && !_.tracks.find((d) => d.alignment === "overlay" || "tracks" in d);
}
function IsOverlaidTracks(_) {
  return "alignment" in _ && _.alignment === "overlay";
}
function IsStackedTracks(_) {
  return !IsFlatTracks(_) && !IsOverlaidTracks(_);
}
function IsDataTrack(_) {
  return !IsOverlaidTrack(_) && "data" in _ && !("mark" in _);
}
function IsDummyTrack(_) {
  return "type" in _ && _.type == "dummy-track";
}
function IsDataTemplate(_) {
  return !!("data" in _ && "overrideTemplate" in _ && _.overrideTemplate);
}
function IsDataDeep(data2) {
  return typeof data2 === "object";
}
function IsDomainChr(domain) {
  return "chromosome" in domain && !("interval" in domain);
}
function IsDomainInterval(domain) {
  return !("chromosome" in domain) && "interval" in domain;
}
function IsDomainChrInterval(domain) {
  return "chromosome" in domain && "interval" in domain;
}
function IsSingleTrack(track) {
  return !("_overlay" in track);
}
function IsOverlaidTrack(track) {
  return "_overlay" in track;
}
function IsTemplateTrack(track) {
  return "template" in track;
}
function IsVerticalRule(track) {
  return IsSingleTrack(track) && !IsChannelDeep(track.x) && IsChannelDeep(track.y) && track.y.type === "genomic";
}
function Is2DTrack(track) {
  const t = IsSingleTrack(track) ? track : resolveSuperposedTracks(track)[0];
  return IsChannelDeep(t.x) && t.x.type === "genomic" && IsChannelDeep(t.y) && t.y.type === "genomic";
}
function IsHiGlassMatrix(track) {
  return Is2DTrack(track) && track.data.type === "matrix" && (track.mark === "bar" || track.mark === "rect") && track.xe && track.ye;
}
function IsChannelValue(channel) {
  return channel !== null && typeof channel === "object" && "value" in channel;
}
function IsDataDeepTileset(_) {
  return _ !== void 0 && (_.type === "vector" || _.type === "beddb" || _.type === "multivec" || _.type === "bigwig" || _.type === "matrix" || _.type === "bam" || _.type === "vcf" || _.type === "gff" || _.type === "bed");
}
function IsChannelDeep(channel) {
  return isObject(channel) && !("value" in channel);
}
function IsOneOfFilter(_) {
  return "oneOf" in _;
}
function IsRangeFilter(_) {
  return "inRange" in _;
}
function IsIncludeFilter(_) {
  return "include" in _;
}
function IsDomainArray(domain) {
  return Array.isArray(domain);
}
function IsRangeArray(range) {
  return Array.isArray(range);
}
function IsStackedMark(track) {
  return (track.mark === "bar" || track.mark === "area" || track.mark === "text") && IsChannelDeep(track.color) && track.color.type === "nominal" && (!track.row || IsChannelValue(track.row)) && // TODO: determine whether to use stacked bar for nominal fields or not
  IsChannelDeep(track.y) && track.y.type === "quantitative" && !IsChannelDeep(track.ye);
}
function IsStackedChannel(track, channelKey) {
  const channel = track[channelKey];
  return IsStackedMark(track) && // only x or y channel can be stacked
  (channelKey === "x" || channelKey === "y") && // only quantitative channel can be stacked
  IsChannelDeep(channel) && channel.type === "quantitative";
}
function getValueUsingChannel(datum, channel) {
  if (IsChannelDeep(channel) && channel.field) {
    return datum[channel == null ? void 0 : channel.field];
  }
  return void 0;
}
function getChannelKeysByAggregateFnc(spec) {
  const keys = [];
  SUPPORTED_CHANNELS.forEach((k) => {
    const c = spec[k];
    if (IsChannelDeep(c) && "aggregate" in c) {
      keys.push(k);
    }
  });
  return keys;
}
function getChannelKeysByType(spec, t) {
  const keys = [];
  SUPPORTED_CHANNELS.forEach((k) => {
    const c = spec[k];
    if (IsChannelDeep(c) && c.type === t) {
      keys.push(k);
    }
  });
  return keys;
}
function IsXAxis(_) {
  if ((IsSingleTrack(_) || IsOverlaidTrack(_)) && IsChannelDeep(_.x) && _.x.axis && _.x.axis !== "none") {
    return true;
  } else if (IsOverlaidTrack(_)) {
    let isFound = false;
    _._overlay.forEach((t) => {
      if (isFound)
        return;
      if (IsChannelDeep(t.x) && t.x.axis && t.x.axis !== "none") {
        isFound = true;
      }
    });
    return isFound;
  }
  return false;
}
function IsYAxis(_) {
  if ((IsSingleTrack(_) || IsOverlaidTrack(_)) && IsChannelDeep(_.y) && _.y.axis && _.y.axis !== "none") {
    return true;
  } else if (IsOverlaidTrack(_)) {
    let isFound = false;
    _._overlay.forEach((t) => {
      if (isFound)
        return;
      if (IsChannelDeep(t.y) && t.y.axis && t.y.axis !== "none") {
        isFound = true;
      }
    });
    return isFound;
  }
  return false;
}
function IsMouseEventsDeep(_) {
  return typeof _ === "object";
}
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var uri_all = { exports: {} };
/** @license URI.js v4.4.1 (c) 2011 Gary Court. License: http://github.com/garycourt/uri-js */
(function(module, exports) {
  (function(global2, factory) {
    factory(exports);
  })(commonjsGlobal, function(exports2) {
    function merge() {
      for (var _len = arguments.length, sets = Array(_len), _key = 0; _key < _len; _key++) {
        sets[_key] = arguments[_key];
      }
      if (sets.length > 1) {
        sets[0] = sets[0].slice(0, -1);
        var xl = sets.length - 1;
        for (var x = 1; x < xl; ++x) {
          sets[x] = sets[x].slice(1, -1);
        }
        sets[xl] = sets[xl].slice(1);
        return sets.join("");
      } else {
        return sets[0];
      }
    }
    function subexp(str) {
      return "(?:" + str + ")";
    }
    function typeOf(o) {
      return o === void 0 ? "undefined" : o === null ? "null" : Object.prototype.toString.call(o).split(" ").pop().split("]").shift().toLowerCase();
    }
    function toUpperCase(str) {
      return str.toUpperCase();
    }
    function toArray(obj) {
      return obj !== void 0 && obj !== null ? obj instanceof Array ? obj : typeof obj.length !== "number" || obj.split || obj.setInterval || obj.call ? [obj] : Array.prototype.slice.call(obj) : [];
    }
    function assign(target, source) {
      var obj = target;
      if (source) {
        for (var key in source) {
          obj[key] = source[key];
        }
      }
      return obj;
    }
    function buildExps(isIRI) {
      var ALPHA$$ = "[A-Za-z]", DIGIT$$ = "[0-9]", HEXDIG$$2 = merge(DIGIT$$, "[A-Fa-f]"), PCT_ENCODED$2 = subexp(subexp("%[EFef]" + HEXDIG$$2 + "%" + HEXDIG$$2 + HEXDIG$$2 + "%" + HEXDIG$$2 + HEXDIG$$2) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$2 + "%" + HEXDIG$$2 + HEXDIG$$2) + "|" + subexp("%" + HEXDIG$$2 + HEXDIG$$2)), GEN_DELIMS$$ = "[\\:\\/\\?\\#\\[\\]\\@]", SUB_DELIMS$$ = "[\\!\\$\\&\\'\\(\\)\\*\\+\\,\\;\\=]", RESERVED$$ = merge(GEN_DELIMS$$, SUB_DELIMS$$), UCSCHAR$$ = isIRI ? "[\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]" : "[]", IPRIVATE$$ = isIRI ? "[\\uE000-\\uF8FF]" : "[]", UNRESERVED$$2 = merge(ALPHA$$, DIGIT$$, "[\\-\\.\\_\\~]", UCSCHAR$$);
      subexp(ALPHA$$ + merge(ALPHA$$, DIGIT$$, "[\\+\\-\\.]") + "*");
      subexp(subexp(PCT_ENCODED$2 + "|" + merge(UNRESERVED$$2, SUB_DELIMS$$, "[\\:]")) + "*");
      var DEC_OCTET_RELAXED$ = subexp(subexp("25[0-5]") + "|" + subexp("2[0-4]" + DIGIT$$) + "|" + subexp("1" + DIGIT$$ + DIGIT$$) + "|" + subexp("0?[1-9]" + DIGIT$$) + "|0?0?" + DIGIT$$), IPV4ADDRESS$ = subexp(DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$ + "\\." + DEC_OCTET_RELAXED$), H16$ = subexp(HEXDIG$$2 + "{1,4}"), LS32$ = subexp(subexp(H16$ + "\\:" + H16$) + "|" + IPV4ADDRESS$), IPV6ADDRESS1$ = subexp(subexp(H16$ + "\\:") + "{6}" + LS32$), IPV6ADDRESS2$ = subexp("\\:\\:" + subexp(H16$ + "\\:") + "{5}" + LS32$), IPV6ADDRESS3$ = subexp(subexp(H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{4}" + LS32$), IPV6ADDRESS4$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,1}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{3}" + LS32$), IPV6ADDRESS5$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,2}" + H16$) + "?\\:\\:" + subexp(H16$ + "\\:") + "{2}" + LS32$), IPV6ADDRESS6$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,3}" + H16$) + "?\\:\\:" + H16$ + "\\:" + LS32$), IPV6ADDRESS7$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,4}" + H16$) + "?\\:\\:" + LS32$), IPV6ADDRESS8$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,5}" + H16$) + "?\\:\\:" + H16$), IPV6ADDRESS9$ = subexp(subexp(subexp(H16$ + "\\:") + "{0,6}" + H16$) + "?\\:\\:"), IPV6ADDRESS$ = subexp([IPV6ADDRESS1$, IPV6ADDRESS2$, IPV6ADDRESS3$, IPV6ADDRESS4$, IPV6ADDRESS5$, IPV6ADDRESS6$, IPV6ADDRESS7$, IPV6ADDRESS8$, IPV6ADDRESS9$].join("|")), ZONEID$ = subexp(subexp(UNRESERVED$$2 + "|" + PCT_ENCODED$2) + "+");
      subexp("[vV]" + HEXDIG$$2 + "+\\." + merge(UNRESERVED$$2, SUB_DELIMS$$, "[\\:]") + "+");
      subexp(subexp(PCT_ENCODED$2 + "|" + merge(UNRESERVED$$2, SUB_DELIMS$$)) + "*");
      var PCHAR$ = subexp(PCT_ENCODED$2 + "|" + merge(UNRESERVED$$2, SUB_DELIMS$$, "[\\:\\@]"));
      subexp(subexp(PCT_ENCODED$2 + "|" + merge(UNRESERVED$$2, SUB_DELIMS$$, "[\\@]")) + "+");
      subexp(subexp(PCHAR$ + "|" + merge("[\\/\\?]", IPRIVATE$$)) + "*");
      return {
        NOT_SCHEME: new RegExp(merge("[^]", ALPHA$$, DIGIT$$, "[\\+\\-\\.]"), "g"),
        NOT_USERINFO: new RegExp(merge("[^\\%\\:]", UNRESERVED$$2, SUB_DELIMS$$), "g"),
        NOT_HOST: new RegExp(merge("[^\\%\\[\\]\\:]", UNRESERVED$$2, SUB_DELIMS$$), "g"),
        NOT_PATH: new RegExp(merge("[^\\%\\/\\:\\@]", UNRESERVED$$2, SUB_DELIMS$$), "g"),
        NOT_PATH_NOSCHEME: new RegExp(merge("[^\\%\\/\\@]", UNRESERVED$$2, SUB_DELIMS$$), "g"),
        NOT_QUERY: new RegExp(merge("[^\\%]", UNRESERVED$$2, SUB_DELIMS$$, "[\\:\\@\\/\\?]", IPRIVATE$$), "g"),
        NOT_FRAGMENT: new RegExp(merge("[^\\%]", UNRESERVED$$2, SUB_DELIMS$$, "[\\:\\@\\/\\?]"), "g"),
        ESCAPE: new RegExp(merge("[^]", UNRESERVED$$2, SUB_DELIMS$$), "g"),
        UNRESERVED: new RegExp(UNRESERVED$$2, "g"),
        OTHER_CHARS: new RegExp(merge("[^\\%]", UNRESERVED$$2, RESERVED$$), "g"),
        PCT_ENCODED: new RegExp(PCT_ENCODED$2, "g"),
        IPV4ADDRESS: new RegExp("^(" + IPV4ADDRESS$ + ")$"),
        IPV6ADDRESS: new RegExp("^\\[?(" + IPV6ADDRESS$ + ")" + subexp(subexp("\\%25|\\%(?!" + HEXDIG$$2 + "{2})") + "(" + ZONEID$ + ")") + "?\\]?$")
        //RFC 6874, with relaxed parsing rules
      };
    }
    var URI_PROTOCOL = buildExps(false);
    var IRI_PROTOCOL = buildExps(true);
    var slicedToArray = function() {
      function sliceIterator(arr, i) {
        var _arr = [];
        var _n = true;
        var _d = false;
        var _e = void 0;
        try {
          for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
            _arr.push(_s.value);
            if (i && _arr.length === i)
              break;
          }
        } catch (err) {
          _d = true;
          _e = err;
        } finally {
          try {
            if (!_n && _i["return"])
              _i["return"]();
          } finally {
            if (_d)
              throw _e;
          }
        }
        return _arr;
      }
      return function(arr, i) {
        if (Array.isArray(arr)) {
          return arr;
        } else if (Symbol.iterator in Object(arr)) {
          return sliceIterator(arr, i);
        } else {
          throw new TypeError("Invalid attempt to destructure non-iterable instance");
        }
      };
    }();
    var toConsumableArray = function(arr) {
      if (Array.isArray(arr)) {
        for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++)
          arr2[i] = arr[i];
        return arr2;
      } else {
        return Array.from(arr);
      }
    };
    var maxInt = 2147483647;
    var base = 36;
    var tMin = 1;
    var tMax = 26;
    var skew = 38;
    var damp = 700;
    var initialBias = 72;
    var initialN = 128;
    var delimiter = "-";
    var regexPunycode = /^xn--/;
    var regexNonASCII = /[^\0-\x7E]/;
    var regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g;
    var errors = {
      "overflow": "Overflow: input needs wider integers to process",
      "not-basic": "Illegal input >= 0x80 (not a basic code point)",
      "invalid-input": "Invalid input"
    };
    var baseMinusTMin = base - tMin;
    var floor = Math.floor;
    var stringFromCharCode = String.fromCharCode;
    function error$1(type2) {
      throw new RangeError(errors[type2]);
    }
    function map(array, fn) {
      var result = [];
      var length = array.length;
      while (length--) {
        result[length] = fn(array[length]);
      }
      return result;
    }
    function mapDomain(string, fn) {
      var parts = string.split("@");
      var result = "";
      if (parts.length > 1) {
        result = parts[0] + "@";
        string = parts[1];
      }
      string = string.replace(regexSeparators, ".");
      var labels = string.split(".");
      var encoded = map(labels, fn).join(".");
      return result + encoded;
    }
    function ucs2decode(string) {
      var output = [];
      var counter = 0;
      var length = string.length;
      while (counter < length) {
        var value = string.charCodeAt(counter++);
        if (value >= 55296 && value <= 56319 && counter < length) {
          var extra = string.charCodeAt(counter++);
          if ((extra & 64512) == 56320) {
            output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
          } else {
            output.push(value);
            counter--;
          }
        } else {
          output.push(value);
        }
      }
      return output;
    }
    var ucs2encode = function ucs2encode2(array) {
      return String.fromCodePoint.apply(String, toConsumableArray(array));
    };
    var basicToDigit = function basicToDigit2(codePoint) {
      if (codePoint - 48 < 10) {
        return codePoint - 22;
      }
      if (codePoint - 65 < 26) {
        return codePoint - 65;
      }
      if (codePoint - 97 < 26) {
        return codePoint - 97;
      }
      return base;
    };
    var digitToBasic = function digitToBasic2(digit, flag) {
      return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
    };
    var adapt = function adapt2(delta, numPoints, firstTime) {
      var k = 0;
      delta = firstTime ? floor(delta / damp) : delta >> 1;
      delta += floor(delta / numPoints);
      for (
        ;
        /* no initialization */
        delta > baseMinusTMin * tMax >> 1;
        k += base
      ) {
        delta = floor(delta / baseMinusTMin);
      }
      return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
    };
    var decode = function decode2(input) {
      var output = [];
      var inputLength = input.length;
      var i = 0;
      var n = initialN;
      var bias = initialBias;
      var basic = input.lastIndexOf(delimiter);
      if (basic < 0) {
        basic = 0;
      }
      for (var j = 0; j < basic; ++j) {
        if (input.charCodeAt(j) >= 128) {
          error$1("not-basic");
        }
        output.push(input.charCodeAt(j));
      }
      for (var index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
        var oldi = i;
        for (
          var w = 1, k = base;
          ;
          /* no condition */
          k += base
        ) {
          if (index >= inputLength) {
            error$1("invalid-input");
          }
          var digit = basicToDigit(input.charCodeAt(index++));
          if (digit >= base || digit > floor((maxInt - i) / w)) {
            error$1("overflow");
          }
          i += digit * w;
          var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
          if (digit < t) {
            break;
          }
          var baseMinusT = base - t;
          if (w > floor(maxInt / baseMinusT)) {
            error$1("overflow");
          }
          w *= baseMinusT;
        }
        var out = output.length + 1;
        bias = adapt(i - oldi, out, oldi == 0);
        if (floor(i / out) > maxInt - n) {
          error$1("overflow");
        }
        n += floor(i / out);
        i %= out;
        output.splice(i++, 0, n);
      }
      return String.fromCodePoint.apply(String, output);
    };
    var encode = function encode2(input) {
      var output = [];
      input = ucs2decode(input);
      var inputLength = input.length;
      var n = initialN;
      var delta = 0;
      var bias = initialBias;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = void 0;
      try {
        for (var _iterator = input[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _currentValue2 = _step.value;
          if (_currentValue2 < 128) {
            output.push(stringFromCharCode(_currentValue2));
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
      var basicLength = output.length;
      var handledCPCount = basicLength;
      if (basicLength) {
        output.push(delimiter);
      }
      while (handledCPCount < inputLength) {
        var m = maxInt;
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = void 0;
        try {
          for (var _iterator2 = input[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var currentValue = _step2.value;
            if (currentValue >= n && currentValue < m) {
              m = currentValue;
            }
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
        var handledCPCountPlusOne = handledCPCount + 1;
        if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
          error$1("overflow");
        }
        delta += (m - n) * handledCPCountPlusOne;
        n = m;
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = void 0;
        try {
          for (var _iterator3 = input[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var _currentValue = _step3.value;
            if (_currentValue < n && ++delta > maxInt) {
              error$1("overflow");
            }
            if (_currentValue == n) {
              var q = delta;
              for (
                var k = base;
                ;
                /* no condition */
                k += base
              ) {
                var t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
                if (q < t) {
                  break;
                }
                var qMinusT = q - t;
                var baseMinusT = base - t;
                output.push(stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)));
                q = floor(qMinusT / baseMinusT);
              }
              output.push(stringFromCharCode(digitToBasic(q, 0)));
              bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
              delta = 0;
              ++handledCPCount;
            }
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
        ++delta;
        ++n;
      }
      return output.join("");
    };
    var toUnicode = function toUnicode2(input) {
      return mapDomain(input, function(string) {
        return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
      });
    };
    var toASCII = function toASCII2(input) {
      return mapDomain(input, function(string) {
        return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
      });
    };
    var punycode = {
      /**
       * A string representing the current Punycode.js version number.
       * @memberOf punycode
       * @type String
       */
      "version": "2.1.0",
      /**
       * An object of methods to convert from JavaScript's internal character
       * representation (UCS-2) to Unicode code points, and back.
       * @see <https://mathiasbynens.be/notes/javascript-encoding>
       * @memberOf punycode
       * @type Object
       */
      "ucs2": {
        "decode": ucs2decode,
        "encode": ucs2encode
      },
      "decode": decode,
      "encode": encode,
      "toASCII": toASCII,
      "toUnicode": toUnicode
    };
    var SCHEMES = {};
    function pctEncChar(chr) {
      var c = chr.charCodeAt(0);
      var e = void 0;
      if (c < 16)
        e = "%0" + c.toString(16).toUpperCase();
      else if (c < 128)
        e = "%" + c.toString(16).toUpperCase();
      else if (c < 2048)
        e = "%" + (c >> 6 | 192).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();
      else
        e = "%" + (c >> 12 | 224).toString(16).toUpperCase() + "%" + (c >> 6 & 63 | 128).toString(16).toUpperCase() + "%" + (c & 63 | 128).toString(16).toUpperCase();
      return e;
    }
    function pctDecChars(str) {
      var newStr = "";
      var i = 0;
      var il = str.length;
      while (i < il) {
        var c = parseInt(str.substr(i + 1, 2), 16);
        if (c < 128) {
          newStr += String.fromCharCode(c);
          i += 3;
        } else if (c >= 194 && c < 224) {
          if (il - i >= 6) {
            var c2 = parseInt(str.substr(i + 4, 2), 16);
            newStr += String.fromCharCode((c & 31) << 6 | c2 & 63);
          } else {
            newStr += str.substr(i, 6);
          }
          i += 6;
        } else if (c >= 224) {
          if (il - i >= 9) {
            var _c = parseInt(str.substr(i + 4, 2), 16);
            var c3 = parseInt(str.substr(i + 7, 2), 16);
            newStr += String.fromCharCode((c & 15) << 12 | (_c & 63) << 6 | c3 & 63);
          } else {
            newStr += str.substr(i, 9);
          }
          i += 9;
        } else {
          newStr += str.substr(i, 3);
          i += 3;
        }
      }
      return newStr;
    }
    function _normalizeComponentEncoding(components, protocol) {
      function decodeUnreserved2(str) {
        var decStr = pctDecChars(str);
        return !decStr.match(protocol.UNRESERVED) ? str : decStr;
      }
      if (components.scheme)
        components.scheme = String(components.scheme).replace(protocol.PCT_ENCODED, decodeUnreserved2).toLowerCase().replace(protocol.NOT_SCHEME, "");
      if (components.userinfo !== void 0)
        components.userinfo = String(components.userinfo).replace(protocol.PCT_ENCODED, decodeUnreserved2).replace(protocol.NOT_USERINFO, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.host !== void 0)
        components.host = String(components.host).replace(protocol.PCT_ENCODED, decodeUnreserved2).toLowerCase().replace(protocol.NOT_HOST, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.path !== void 0)
        components.path = String(components.path).replace(protocol.PCT_ENCODED, decodeUnreserved2).replace(components.scheme ? protocol.NOT_PATH : protocol.NOT_PATH_NOSCHEME, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.query !== void 0)
        components.query = String(components.query).replace(protocol.PCT_ENCODED, decodeUnreserved2).replace(protocol.NOT_QUERY, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      if (components.fragment !== void 0)
        components.fragment = String(components.fragment).replace(protocol.PCT_ENCODED, decodeUnreserved2).replace(protocol.NOT_FRAGMENT, pctEncChar).replace(protocol.PCT_ENCODED, toUpperCase);
      return components;
    }
    function _stripLeadingZeros(str) {
      return str.replace(/^0*(.*)/, "$1") || "0";
    }
    function _normalizeIPv4(host, protocol) {
      var matches = host.match(protocol.IPV4ADDRESS) || [];
      var _matches = slicedToArray(matches, 2), address = _matches[1];
      if (address) {
        return address.split(".").map(_stripLeadingZeros).join(".");
      } else {
        return host;
      }
    }
    function _normalizeIPv6(host, protocol) {
      var matches = host.match(protocol.IPV6ADDRESS) || [];
      var _matches2 = slicedToArray(matches, 3), address = _matches2[1], zone = _matches2[2];
      if (address) {
        var _address$toLowerCase$ = address.toLowerCase().split("::").reverse(), _address$toLowerCase$2 = slicedToArray(_address$toLowerCase$, 2), last = _address$toLowerCase$2[0], first = _address$toLowerCase$2[1];
        var firstFields = first ? first.split(":").map(_stripLeadingZeros) : [];
        var lastFields = last.split(":").map(_stripLeadingZeros);
        var isLastFieldIPv4Address = protocol.IPV4ADDRESS.test(lastFields[lastFields.length - 1]);
        var fieldCount = isLastFieldIPv4Address ? 7 : 8;
        var lastFieldsStart = lastFields.length - fieldCount;
        var fields = Array(fieldCount);
        for (var x = 0; x < fieldCount; ++x) {
          fields[x] = firstFields[x] || lastFields[lastFieldsStart + x] || "";
        }
        if (isLastFieldIPv4Address) {
          fields[fieldCount - 1] = _normalizeIPv4(fields[fieldCount - 1], protocol);
        }
        var allZeroFields = fields.reduce(function(acc, field, index) {
          if (!field || field === "0") {
            var lastLongest = acc[acc.length - 1];
            if (lastLongest && lastLongest.index + lastLongest.length === index) {
              lastLongest.length++;
            } else {
              acc.push({ index, length: 1 });
            }
          }
          return acc;
        }, []);
        var longestZeroFields = allZeroFields.sort(function(a, b) {
          return b.length - a.length;
        })[0];
        var newHost = void 0;
        if (longestZeroFields && longestZeroFields.length > 1) {
          var newFirst = fields.slice(0, longestZeroFields.index);
          var newLast = fields.slice(longestZeroFields.index + longestZeroFields.length);
          newHost = newFirst.join(":") + "::" + newLast.join(":");
        } else {
          newHost = fields.join(":");
        }
        if (zone) {
          newHost += "%" + zone;
        }
        return newHost;
      } else {
        return host;
      }
    }
    var URI_PARSE = /^(?:([^:\/?#]+):)?(?:\/\/((?:([^\/?#@]*)@)?(\[[^\/?#\]]+\]|[^\/?#:]*)(?:\:(\d*))?))?([^?#]*)(?:\?([^#]*))?(?:#((?:.|\n|\r)*))?/i;
    var NO_MATCH_IS_UNDEFINED = "".match(/(){0}/)[1] === void 0;
    function parse(uriString) {
      var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      var components = {};
      var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
      if (options.reference === "suffix")
        uriString = (options.scheme ? options.scheme + ":" : "") + "//" + uriString;
      var matches = uriString.match(URI_PARSE);
      if (matches) {
        if (NO_MATCH_IS_UNDEFINED) {
          components.scheme = matches[1];
          components.userinfo = matches[3];
          components.host = matches[4];
          components.port = parseInt(matches[5], 10);
          components.path = matches[6] || "";
          components.query = matches[7];
          components.fragment = matches[8];
          if (isNaN(components.port)) {
            components.port = matches[5];
          }
        } else {
          components.scheme = matches[1] || void 0;
          components.userinfo = uriString.indexOf("@") !== -1 ? matches[3] : void 0;
          components.host = uriString.indexOf("//") !== -1 ? matches[4] : void 0;
          components.port = parseInt(matches[5], 10);
          components.path = matches[6] || "";
          components.query = uriString.indexOf("?") !== -1 ? matches[7] : void 0;
          components.fragment = uriString.indexOf("#") !== -1 ? matches[8] : void 0;
          if (isNaN(components.port)) {
            components.port = uriString.match(/\/\/(?:.|\n)*\:(?:\/|\?|\#|$)/) ? matches[4] : void 0;
          }
        }
        if (components.host) {
          components.host = _normalizeIPv6(_normalizeIPv4(components.host, protocol), protocol);
        }
        if (components.scheme === void 0 && components.userinfo === void 0 && components.host === void 0 && components.port === void 0 && !components.path && components.query === void 0) {
          components.reference = "same-document";
        } else if (components.scheme === void 0) {
          components.reference = "relative";
        } else if (components.fragment === void 0) {
          components.reference = "absolute";
        } else {
          components.reference = "uri";
        }
        if (options.reference && options.reference !== "suffix" && options.reference !== components.reference) {
          components.error = components.error || "URI is not a " + options.reference + " reference.";
        }
        var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
        if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
          if (components.host && (options.domainHost || schemeHandler && schemeHandler.domainHost)) {
            try {
              components.host = punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase());
            } catch (e) {
              components.error = components.error || "Host's domain name can not be converted to ASCII via punycode: " + e;
            }
          }
          _normalizeComponentEncoding(components, URI_PROTOCOL);
        } else {
          _normalizeComponentEncoding(components, protocol);
        }
        if (schemeHandler && schemeHandler.parse) {
          schemeHandler.parse(components, options);
        }
      } else {
        components.error = components.error || "URI can not be parsed.";
      }
      return components;
    }
    function _recomposeAuthority(components, options) {
      var protocol = options.iri !== false ? IRI_PROTOCOL : URI_PROTOCOL;
      var uriTokens = [];
      if (components.userinfo !== void 0) {
        uriTokens.push(components.userinfo);
        uriTokens.push("@");
      }
      if (components.host !== void 0) {
        uriTokens.push(_normalizeIPv6(_normalizeIPv4(String(components.host), protocol), protocol).replace(protocol.IPV6ADDRESS, function(_, $1, $2) {
          return "[" + $1 + ($2 ? "%25" + $2 : "") + "]";
        }));
      }
      if (typeof components.port === "number" || typeof components.port === "string") {
        uriTokens.push(":");
        uriTokens.push(String(components.port));
      }
      return uriTokens.length ? uriTokens.join("") : void 0;
    }
    var RDS1 = /^\.\.?\//;
    var RDS2 = /^\/\.(\/|$)/;
    var RDS3 = /^\/\.\.(\/|$)/;
    var RDS5 = /^\/?(?:.|\n)*?(?=\/|$)/;
    function removeDotSegments(input) {
      var output = [];
      while (input.length) {
        if (input.match(RDS1)) {
          input = input.replace(RDS1, "");
        } else if (input.match(RDS2)) {
          input = input.replace(RDS2, "/");
        } else if (input.match(RDS3)) {
          input = input.replace(RDS3, "/");
          output.pop();
        } else if (input === "." || input === "..") {
          input = "";
        } else {
          var im = input.match(RDS5);
          if (im) {
            var s = im[0];
            input = input.slice(s.length);
            output.push(s);
          } else {
            throw new Error("Unexpected dot segment condition");
          }
        }
      }
      return output.join("");
    }
    function serialize(components) {
      var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      var protocol = options.iri ? IRI_PROTOCOL : URI_PROTOCOL;
      var uriTokens = [];
      var schemeHandler = SCHEMES[(options.scheme || components.scheme || "").toLowerCase()];
      if (schemeHandler && schemeHandler.serialize)
        schemeHandler.serialize(components, options);
      if (components.host) {
        if (protocol.IPV6ADDRESS.test(components.host))
          ;
        else if (options.domainHost || schemeHandler && schemeHandler.domainHost) {
          try {
            components.host = !options.iri ? punycode.toASCII(components.host.replace(protocol.PCT_ENCODED, pctDecChars).toLowerCase()) : punycode.toUnicode(components.host);
          } catch (e) {
            components.error = components.error || "Host's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
          }
        }
      }
      _normalizeComponentEncoding(components, protocol);
      if (options.reference !== "suffix" && components.scheme) {
        uriTokens.push(components.scheme);
        uriTokens.push(":");
      }
      var authority = _recomposeAuthority(components, options);
      if (authority !== void 0) {
        if (options.reference !== "suffix") {
          uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (components.path && components.path.charAt(0) !== "/") {
          uriTokens.push("/");
        }
      }
      if (components.path !== void 0) {
        var s = components.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
          s = removeDotSegments(s);
        }
        if (authority === void 0) {
          s = s.replace(/^\/\//, "/%2F");
        }
        uriTokens.push(s);
      }
      if (components.query !== void 0) {
        uriTokens.push("?");
        uriTokens.push(components.query);
      }
      if (components.fragment !== void 0) {
        uriTokens.push("#");
        uriTokens.push(components.fragment);
      }
      return uriTokens.join("");
    }
    function resolveComponents(base2, relative) {
      var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      var skipNormalization = arguments[3];
      var target = {};
      if (!skipNormalization) {
        base2 = parse(serialize(base2, options), options);
        relative = parse(serialize(relative, options), options);
      }
      options = options || {};
      if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
          target.userinfo = relative.userinfo;
          target.host = relative.host;
          target.port = relative.port;
          target.path = removeDotSegments(relative.path || "");
          target.query = relative.query;
        } else {
          if (!relative.path) {
            target.path = base2.path;
            if (relative.query !== void 0) {
              target.query = relative.query;
            } else {
              target.query = base2.query;
            }
          } else {
            if (relative.path.charAt(0) === "/") {
              target.path = removeDotSegments(relative.path);
            } else {
              if ((base2.userinfo !== void 0 || base2.host !== void 0 || base2.port !== void 0) && !base2.path) {
                target.path = "/" + relative.path;
              } else if (!base2.path) {
                target.path = relative.path;
              } else {
                target.path = base2.path.slice(0, base2.path.lastIndexOf("/") + 1) + relative.path;
              }
              target.path = removeDotSegments(target.path);
            }
            target.query = relative.query;
          }
          target.userinfo = base2.userinfo;
          target.host = base2.host;
          target.port = base2.port;
        }
        target.scheme = base2.scheme;
      }
      target.fragment = relative.fragment;
      return target;
    }
    function resolve2(baseURI, relativeURI, options) {
      var schemelessOptions = assign({ scheme: "null" }, options);
      return serialize(resolveComponents(parse(baseURI, schemelessOptions), parse(relativeURI, schemelessOptions), schemelessOptions, true), schemelessOptions);
    }
    function normalize(uri2, options) {
      if (typeof uri2 === "string") {
        uri2 = serialize(parse(uri2, options), options);
      } else if (typeOf(uri2) === "object") {
        uri2 = parse(serialize(uri2, options), options);
      }
      return uri2;
    }
    function equal3(uriA, uriB, options) {
      if (typeof uriA === "string") {
        uriA = serialize(parse(uriA, options), options);
      } else if (typeOf(uriA) === "object") {
        uriA = serialize(uriA, options);
      }
      if (typeof uriB === "string") {
        uriB = serialize(parse(uriB, options), options);
      } else if (typeOf(uriB) === "object") {
        uriB = serialize(uriB, options);
      }
      return uriA === uriB;
    }
    function escapeComponent(str, options) {
      return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.ESCAPE : IRI_PROTOCOL.ESCAPE, pctEncChar);
    }
    function unescapeComponent(str, options) {
      return str && str.toString().replace(!options || !options.iri ? URI_PROTOCOL.PCT_ENCODED : IRI_PROTOCOL.PCT_ENCODED, pctDecChars);
    }
    var handler = {
      scheme: "http",
      domainHost: true,
      parse: function parse2(components, options) {
        if (!components.host) {
          components.error = components.error || "HTTP URIs must have a host.";
        }
        return components;
      },
      serialize: function serialize2(components, options) {
        var secure = String(components.scheme).toLowerCase() === "https";
        if (components.port === (secure ? 443 : 80) || components.port === "") {
          components.port = void 0;
        }
        if (!components.path) {
          components.path = "/";
        }
        return components;
      }
    };
    var handler$1 = {
      scheme: "https",
      domainHost: handler.domainHost,
      parse: handler.parse,
      serialize: handler.serialize
    };
    function isSecure(wsComponents) {
      return typeof wsComponents.secure === "boolean" ? wsComponents.secure : String(wsComponents.scheme).toLowerCase() === "wss";
    }
    var handler$2 = {
      scheme: "ws",
      domainHost: true,
      parse: function parse2(components, options) {
        var wsComponents = components;
        wsComponents.secure = isSecure(wsComponents);
        wsComponents.resourceName = (wsComponents.path || "/") + (wsComponents.query ? "?" + wsComponents.query : "");
        wsComponents.path = void 0;
        wsComponents.query = void 0;
        return wsComponents;
      },
      serialize: function serialize2(wsComponents, options) {
        if (wsComponents.port === (isSecure(wsComponents) ? 443 : 80) || wsComponents.port === "") {
          wsComponents.port = void 0;
        }
        if (typeof wsComponents.secure === "boolean") {
          wsComponents.scheme = wsComponents.secure ? "wss" : "ws";
          wsComponents.secure = void 0;
        }
        if (wsComponents.resourceName) {
          var _wsComponents$resourc = wsComponents.resourceName.split("?"), _wsComponents$resourc2 = slicedToArray(_wsComponents$resourc, 2), path = _wsComponents$resourc2[0], query = _wsComponents$resourc2[1];
          wsComponents.path = path && path !== "/" ? path : void 0;
          wsComponents.query = query;
          wsComponents.resourceName = void 0;
        }
        wsComponents.fragment = void 0;
        return wsComponents;
      }
    };
    var handler$3 = {
      scheme: "wss",
      domainHost: handler$2.domainHost,
      parse: handler$2.parse,
      serialize: handler$2.serialize
    };
    var O = {};
    var UNRESERVED$$ = "[A-Za-z0-9\\-\\.\\_\\~\\xA0-\\u200D\\u2010-\\u2029\\u202F-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFEF]";
    var HEXDIG$$ = "[0-9A-Fa-f]";
    var PCT_ENCODED$ = subexp(subexp("%[EFef]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%[89A-Fa-f]" + HEXDIG$$ + "%" + HEXDIG$$ + HEXDIG$$) + "|" + subexp("%" + HEXDIG$$ + HEXDIG$$));
    var ATEXT$$ = "[A-Za-z0-9\\!\\$\\%\\'\\*\\+\\-\\^\\_\\`\\{\\|\\}\\~]";
    var QTEXT$$ = "[\\!\\$\\%\\'\\(\\)\\*\\+\\,\\-\\.0-9\\<\\>A-Z\\x5E-\\x7E]";
    var VCHAR$$ = merge(QTEXT$$, '[\\"\\\\]');
    var SOME_DELIMS$$ = "[\\!\\$\\'\\(\\)\\*\\+\\,\\;\\:\\@]";
    var UNRESERVED = new RegExp(UNRESERVED$$, "g");
    var PCT_ENCODED = new RegExp(PCT_ENCODED$, "g");
    var NOT_LOCAL_PART = new RegExp(merge("[^]", ATEXT$$, "[\\.]", '[\\"]', VCHAR$$), "g");
    var NOT_HFNAME = new RegExp(merge("[^]", UNRESERVED$$, SOME_DELIMS$$), "g");
    var NOT_HFVALUE = NOT_HFNAME;
    function decodeUnreserved(str) {
      var decStr = pctDecChars(str);
      return !decStr.match(UNRESERVED) ? str : decStr;
    }
    var handler$4 = {
      scheme: "mailto",
      parse: function parse$$1(components, options) {
        var mailtoComponents = components;
        var to = mailtoComponents.to = mailtoComponents.path ? mailtoComponents.path.split(",") : [];
        mailtoComponents.path = void 0;
        if (mailtoComponents.query) {
          var unknownHeaders = false;
          var headers = {};
          var hfields = mailtoComponents.query.split("&");
          for (var x = 0, xl = hfields.length; x < xl; ++x) {
            var hfield = hfields[x].split("=");
            switch (hfield[0]) {
              case "to":
                var toAddrs = hfield[1].split(",");
                for (var _x = 0, _xl = toAddrs.length; _x < _xl; ++_x) {
                  to.push(toAddrs[_x]);
                }
                break;
              case "subject":
                mailtoComponents.subject = unescapeComponent(hfield[1], options);
                break;
              case "body":
                mailtoComponents.body = unescapeComponent(hfield[1], options);
                break;
              default:
                unknownHeaders = true;
                headers[unescapeComponent(hfield[0], options)] = unescapeComponent(hfield[1], options);
                break;
            }
          }
          if (unknownHeaders)
            mailtoComponents.headers = headers;
        }
        mailtoComponents.query = void 0;
        for (var _x2 = 0, _xl2 = to.length; _x2 < _xl2; ++_x2) {
          var addr = to[_x2].split("@");
          addr[0] = unescapeComponent(addr[0]);
          if (!options.unicodeSupport) {
            try {
              addr[1] = punycode.toASCII(unescapeComponent(addr[1], options).toLowerCase());
            } catch (e) {
              mailtoComponents.error = mailtoComponents.error || "Email address's domain name can not be converted to ASCII via punycode: " + e;
            }
          } else {
            addr[1] = unescapeComponent(addr[1], options).toLowerCase();
          }
          to[_x2] = addr.join("@");
        }
        return mailtoComponents;
      },
      serialize: function serialize$$1(mailtoComponents, options) {
        var components = mailtoComponents;
        var to = toArray(mailtoComponents.to);
        if (to) {
          for (var x = 0, xl = to.length; x < xl; ++x) {
            var toAddr = String(to[x]);
            var atIdx = toAddr.lastIndexOf("@");
            var localPart = toAddr.slice(0, atIdx).replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_LOCAL_PART, pctEncChar);
            var domain = toAddr.slice(atIdx + 1);
            try {
              domain = !options.iri ? punycode.toASCII(unescapeComponent(domain, options).toLowerCase()) : punycode.toUnicode(domain);
            } catch (e) {
              components.error = components.error || "Email address's domain name can not be converted to " + (!options.iri ? "ASCII" : "Unicode") + " via punycode: " + e;
            }
            to[x] = localPart + "@" + domain;
          }
          components.path = to.join(",");
        }
        var headers = mailtoComponents.headers = mailtoComponents.headers || {};
        if (mailtoComponents.subject)
          headers["subject"] = mailtoComponents.subject;
        if (mailtoComponents.body)
          headers["body"] = mailtoComponents.body;
        var fields = [];
        for (var name in headers) {
          if (headers[name] !== O[name]) {
            fields.push(name.replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFNAME, pctEncChar) + "=" + headers[name].replace(PCT_ENCODED, decodeUnreserved).replace(PCT_ENCODED, toUpperCase).replace(NOT_HFVALUE, pctEncChar));
          }
        }
        if (fields.length) {
          components.query = fields.join("&");
        }
        return components;
      }
    };
    var URN_PARSE = /^([^\:]+)\:(.*)/;
    var handler$5 = {
      scheme: "urn",
      parse: function parse$$1(components, options) {
        var matches = components.path && components.path.match(URN_PARSE);
        var urnComponents = components;
        if (matches) {
          var scheme = options.scheme || urnComponents.scheme || "urn";
          var nid = matches[1].toLowerCase();
          var nss = matches[2];
          var urnScheme = scheme + ":" + (options.nid || nid);
          var schemeHandler = SCHEMES[urnScheme];
          urnComponents.nid = nid;
          urnComponents.nss = nss;
          urnComponents.path = void 0;
          if (schemeHandler) {
            urnComponents = schemeHandler.parse(urnComponents, options);
          }
        } else {
          urnComponents.error = urnComponents.error || "URN can not be parsed.";
        }
        return urnComponents;
      },
      serialize: function serialize$$1(urnComponents, options) {
        var scheme = options.scheme || urnComponents.scheme || "urn";
        var nid = urnComponents.nid;
        var urnScheme = scheme + ":" + (options.nid || nid);
        var schemeHandler = SCHEMES[urnScheme];
        if (schemeHandler) {
          urnComponents = schemeHandler.serialize(urnComponents, options);
        }
        var uriComponents = urnComponents;
        var nss = urnComponents.nss;
        uriComponents.path = (nid || options.nid) + ":" + nss;
        return uriComponents;
      }
    };
    var UUID2 = /^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/;
    var handler$6 = {
      scheme: "urn:uuid",
      parse: function parse2(urnComponents, options) {
        var uuidComponents = urnComponents;
        uuidComponents.uuid = uuidComponents.nss;
        uuidComponents.nss = void 0;
        if (!options.tolerant && (!uuidComponents.uuid || !uuidComponents.uuid.match(UUID2))) {
          uuidComponents.error = uuidComponents.error || "UUID is not valid.";
        }
        return uuidComponents;
      },
      serialize: function serialize2(uuidComponents, options) {
        var urnComponents = uuidComponents;
        urnComponents.nss = (uuidComponents.uuid || "").toLowerCase();
        return urnComponents;
      }
    };
    SCHEMES[handler.scheme] = handler;
    SCHEMES[handler$1.scheme] = handler$1;
    SCHEMES[handler$2.scheme] = handler$2;
    SCHEMES[handler$3.scheme] = handler$3;
    SCHEMES[handler$4.scheme] = handler$4;
    SCHEMES[handler$5.scheme] = handler$5;
    SCHEMES[handler$6.scheme] = handler$6;
    exports2.SCHEMES = SCHEMES;
    exports2.pctEncChar = pctEncChar;
    exports2.pctDecChars = pctDecChars;
    exports2.parse = parse;
    exports2.removeDotSegments = removeDotSegments;
    exports2.serialize = serialize;
    exports2.resolveComponents = resolveComponents;
    exports2.resolve = resolve2;
    exports2.normalize = normalize;
    exports2.equal = equal3;
    exports2.escapeComponent = escapeComponent;
    exports2.unescapeComponent = unescapeComponent;
    Object.defineProperty(exports2, "__esModule", { value: true });
  });
})(uri_all, uri_all.exports);
var uri_allExports = uri_all.exports;
var fastDeepEqual = function equal(a, b) {
  if (a === b)
    return true;
  if (a && b && typeof a == "object" && typeof b == "object") {
    if (a.constructor !== b.constructor)
      return false;
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length)
        return false;
      for (i = length; i-- !== 0; )
        if (!equal(a[i], b[i]))
          return false;
      return true;
    }
    if (a.constructor === RegExp)
      return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf)
      return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString)
      return a.toString() === b.toString();
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length)
      return false;
    for (i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i]))
        return false;
    for (i = length; i-- !== 0; ) {
      var key = keys[i];
      if (!equal(a[key], b[key]))
        return false;
    }
    return true;
  }
  return a !== a && b !== b;
};
var ucs2length$1 = function ucs2length(str) {
  var length = 0, len = str.length, pos = 0, value;
  while (pos < len) {
    length++;
    value = str.charCodeAt(pos++);
    if (value >= 55296 && value <= 56319 && pos < len) {
      value = str.charCodeAt(pos);
      if ((value & 64512) == 56320)
        pos++;
    }
  }
  return length;
};
var util$5 = {
  copy,
  checkDataType,
  checkDataTypes,
  coerceToTypes,
  toHash: toHash$1,
  getProperty,
  escapeQuotes,
  equal: fastDeepEqual,
  ucs2length: ucs2length$1,
  varOccurences,
  varReplace,
  schemaHasRules,
  schemaHasRulesExcept,
  schemaUnknownRules,
  toQuotedString,
  getPathExpr,
  getPath,
  getData,
  unescapeFragment,
  unescapeJsonPointer,
  escapeFragment,
  escapeJsonPointer
};
function copy(o, to) {
  to = to || {};
  for (var key in o)
    to[key] = o[key];
  return to;
}
function checkDataType(dataType, data2, strictNumbers, negate) {
  var EQUAL = negate ? " !== " : " === ", AND = negate ? " || " : " && ", OK = negate ? "!" : "", NOT = negate ? "" : "!";
  switch (dataType) {
    case "null":
      return data2 + EQUAL + "null";
    case "array":
      return OK + "Array.isArray(" + data2 + ")";
    case "object":
      return "(" + OK + data2 + AND + "typeof " + data2 + EQUAL + '"object"' + AND + NOT + "Array.isArray(" + data2 + "))";
    case "integer":
      return "(typeof " + data2 + EQUAL + '"number"' + AND + NOT + "(" + data2 + " % 1)" + AND + data2 + EQUAL + data2 + (strictNumbers ? AND + OK + "isFinite(" + data2 + ")" : "") + ")";
    case "number":
      return "(typeof " + data2 + EQUAL + '"' + dataType + '"' + (strictNumbers ? AND + OK + "isFinite(" + data2 + ")" : "") + ")";
    default:
      return "typeof " + data2 + EQUAL + '"' + dataType + '"';
  }
}
function checkDataTypes(dataTypes, data2, strictNumbers) {
  switch (dataTypes.length) {
    case 1:
      return checkDataType(dataTypes[0], data2, strictNumbers, true);
    default:
      var code = "";
      var types = toHash$1(dataTypes);
      if (types.array && types.object) {
        code = types.null ? "(" : "(!" + data2 + " || ";
        code += "typeof " + data2 + ' !== "object")';
        delete types.null;
        delete types.array;
        delete types.object;
      }
      if (types.number)
        delete types.integer;
      for (var t in types)
        code += (code ? " && " : "") + checkDataType(t, data2, strictNumbers, true);
      return code;
  }
}
var COERCE_TO_TYPES = toHash$1(["string", "number", "integer", "boolean", "null"]);
function coerceToTypes(optionCoerceTypes, dataTypes) {
  if (Array.isArray(dataTypes)) {
    var types = [];
    for (var i = 0; i < dataTypes.length; i++) {
      var t = dataTypes[i];
      if (COERCE_TO_TYPES[t])
        types[types.length] = t;
      else if (optionCoerceTypes === "array" && t === "array")
        types[types.length] = t;
    }
    if (types.length)
      return types;
  } else if (COERCE_TO_TYPES[dataTypes]) {
    return [dataTypes];
  } else if (optionCoerceTypes === "array" && dataTypes === "array") {
    return ["array"];
  }
}
function toHash$1(arr) {
  var hash = {};
  for (var i = 0; i < arr.length; i++)
    hash[arr[i]] = true;
  return hash;
}
var IDENTIFIER$1 = /^[a-z$_][a-z$_0-9]*$/i;
var SINGLE_QUOTE = /'|\\/g;
function getProperty(key) {
  return typeof key == "number" ? "[" + key + "]" : IDENTIFIER$1.test(key) ? "." + key : "['" + escapeQuotes(key) + "']";
}
function escapeQuotes(str) {
  return str.replace(SINGLE_QUOTE, "\\$&").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\f/g, "\\f").replace(/\t/g, "\\t");
}
function varOccurences(str, dataVar) {
  dataVar += "[^0-9]";
  var matches = str.match(new RegExp(dataVar, "g"));
  return matches ? matches.length : 0;
}
function varReplace(str, dataVar, expr) {
  dataVar += "([^0-9])";
  expr = expr.replace(/\$/g, "$$$$");
  return str.replace(new RegExp(dataVar, "g"), expr + "$1");
}
function schemaHasRules(schema, rules3) {
  if (typeof schema == "boolean")
    return !schema;
  for (var key in schema)
    if (rules3[key])
      return true;
}
function schemaHasRulesExcept(schema, rules3, exceptKeyword) {
  if (typeof schema == "boolean")
    return !schema && exceptKeyword != "not";
  for (var key in schema)
    if (key != exceptKeyword && rules3[key])
      return true;
}
function schemaUnknownRules(schema, rules3) {
  if (typeof schema == "boolean")
    return;
  for (var key in schema)
    if (!rules3[key])
      return key;
}
function toQuotedString(str) {
  return "'" + escapeQuotes(str) + "'";
}
function getPathExpr(currentPath, expr, jsonPointers, isNumber) {
  var path = jsonPointers ? "'/' + " + expr + (isNumber ? "" : ".replace(/~/g, '~0').replace(/\\//g, '~1')") : isNumber ? "'[' + " + expr + " + ']'" : "'[\\'' + " + expr + " + '\\']'";
  return joinPaths(currentPath, path);
}
function getPath(currentPath, prop, jsonPointers) {
  var path = jsonPointers ? toQuotedString("/" + escapeJsonPointer(prop)) : toQuotedString(getProperty(prop));
  return joinPaths(currentPath, path);
}
var JSON_POINTER$1 = /^\/(?:[^~]|~0|~1)*$/;
var RELATIVE_JSON_POINTER$1 = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
function getData($data, lvl, paths) {
  var up, jsonPointer, data2, matches;
  if ($data === "")
    return "rootData";
  if ($data[0] == "/") {
    if (!JSON_POINTER$1.test($data))
      throw new Error("Invalid JSON-pointer: " + $data);
    jsonPointer = $data;
    data2 = "rootData";
  } else {
    matches = $data.match(RELATIVE_JSON_POINTER$1);
    if (!matches)
      throw new Error("Invalid JSON-pointer: " + $data);
    up = +matches[1];
    jsonPointer = matches[2];
    if (jsonPointer == "#") {
      if (up >= lvl)
        throw new Error("Cannot access property/index " + up + " levels up, current level is " + lvl);
      return paths[lvl - up];
    }
    if (up > lvl)
      throw new Error("Cannot access data " + up + " levels up, current level is " + lvl);
    data2 = "data" + (lvl - up || "");
    if (!jsonPointer)
      return data2;
  }
  var expr = data2;
  var segments = jsonPointer.split("/");
  for (var i = 0; i < segments.length; i++) {
    var segment = segments[i];
    if (segment) {
      data2 += getProperty(unescapeJsonPointer(segment));
      expr += " && " + data2;
    }
  }
  return expr;
}
function joinPaths(a, b) {
  if (a == '""')
    return b;
  return (a + " + " + b).replace(/([^\\])' \+ '/g, "$1");
}
function unescapeFragment(str) {
  return unescapeJsonPointer(decodeURIComponent(str));
}
function escapeFragment(str) {
  return encodeURIComponent(escapeJsonPointer(str));
}
function escapeJsonPointer(str) {
  return str.replace(/~/g, "~0").replace(/\//g, "~1");
}
function unescapeJsonPointer(str) {
  return str.replace(/~1/g, "/").replace(/~0/g, "~");
}
var util$4 = util$5;
var schema_obj = SchemaObject$2;
function SchemaObject$2(obj) {
  util$4.copy(obj, this);
}
var jsonSchemaTraverse = { exports: {} };
var traverse$1 = jsonSchemaTraverse.exports = function(schema, opts, cb) {
  if (typeof opts == "function") {
    cb = opts;
    opts = {};
  }
  cb = opts.cb || cb;
  var pre = typeof cb == "function" ? cb : cb.pre || function() {
  };
  var post = cb.post || function() {
  };
  _traverse(opts, pre, post, schema, "", schema);
};
traverse$1.keywords = {
  additionalItems: true,
  items: true,
  contains: true,
  additionalProperties: true,
  propertyNames: true,
  not: true
};
traverse$1.arrayKeywords = {
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};
traverse$1.propsKeywords = {
  definitions: true,
  properties: true,
  patternProperties: true,
  dependencies: true
};
traverse$1.skipKeywords = {
  default: true,
  enum: true,
  const: true,
  required: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};
function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
  if (schema && typeof schema == "object" && !Array.isArray(schema)) {
    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    for (var key in schema) {
      var sch = schema[key];
      if (Array.isArray(sch)) {
        if (key in traverse$1.arrayKeywords) {
          for (var i = 0; i < sch.length; i++)
            _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
        }
      } else if (key in traverse$1.propsKeywords) {
        if (sch && typeof sch == "object") {
          for (var prop in sch)
            _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
        }
      } else if (key in traverse$1.keywords || opts.allKeys && !(key in traverse$1.skipKeywords)) {
        _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
      }
    }
    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
  }
}
function escapeJsonPtr(str) {
  return str.replace(/~/g, "~0").replace(/\//g, "~1");
}
var jsonSchemaTraverseExports = jsonSchemaTraverse.exports;
var URI$1 = uri_allExports, equal$1 = fastDeepEqual, util$3 = util$5, SchemaObject$1 = schema_obj, traverse = jsonSchemaTraverseExports;
var resolve_1 = resolve$3;
resolve$3.normalizeId = normalizeId;
resolve$3.fullPath = getFullPath;
resolve$3.url = resolveUrl;
resolve$3.ids = resolveIds;
resolve$3.inlineRef = inlineRef;
resolve$3.schema = resolveSchema;
function resolve$3(compile2, root, ref2) {
  var refVal = this._refs[ref2];
  if (typeof refVal == "string") {
    if (this._refs[refVal])
      refVal = this._refs[refVal];
    else
      return resolve$3.call(this, compile2, root, refVal);
  }
  refVal = refVal || this._schemas[ref2];
  if (refVal instanceof SchemaObject$1) {
    return inlineRef(refVal.schema, this._opts.inlineRefs) ? refVal.schema : refVal.validate || this._compile(refVal);
  }
  var res = resolveSchema.call(this, root, ref2);
  var schema, v, baseId;
  if (res) {
    schema = res.schema;
    root = res.root;
    baseId = res.baseId;
  }
  if (schema instanceof SchemaObject$1) {
    v = schema.validate || compile2.call(this, schema.schema, root, void 0, baseId);
  } else if (schema !== void 0) {
    v = inlineRef(schema, this._opts.inlineRefs) ? schema : compile2.call(this, schema, root, void 0, baseId);
  }
  return v;
}
function resolveSchema(root, ref2) {
  var p = URI$1.parse(ref2), refPath = _getFullPath(p), baseId = getFullPath(this._getId(root.schema));
  if (Object.keys(root.schema).length === 0 || refPath !== baseId) {
    var id = normalizeId(refPath);
    var refVal = this._refs[id];
    if (typeof refVal == "string") {
      return resolveRecursive.call(this, root, refVal, p);
    } else if (refVal instanceof SchemaObject$1) {
      if (!refVal.validate)
        this._compile(refVal);
      root = refVal;
    } else {
      refVal = this._schemas[id];
      if (refVal instanceof SchemaObject$1) {
        if (!refVal.validate)
          this._compile(refVal);
        if (id == normalizeId(ref2))
          return { schema: refVal, root, baseId };
        root = refVal;
      } else {
        return;
      }
    }
    if (!root.schema)
      return;
    baseId = getFullPath(this._getId(root.schema));
  }
  return getJsonPointer.call(this, p, baseId, root.schema, root);
}
function resolveRecursive(root, ref2, parsedRef) {
  var res = resolveSchema.call(this, root, ref2);
  if (res) {
    var schema = res.schema;
    var baseId = res.baseId;
    root = res.root;
    var id = this._getId(schema);
    if (id)
      baseId = resolveUrl(baseId, id);
    return getJsonPointer.call(this, parsedRef, baseId, schema, root);
  }
}
var PREVENT_SCOPE_CHANGE = util$3.toHash(["properties", "patternProperties", "enum", "dependencies", "definitions"]);
function getJsonPointer(parsedRef, baseId, schema, root) {
  parsedRef.fragment = parsedRef.fragment || "";
  if (parsedRef.fragment.slice(0, 1) != "/")
    return;
  var parts = parsedRef.fragment.split("/");
  for (var i = 1; i < parts.length; i++) {
    var part = parts[i];
    if (part) {
      part = util$3.unescapeFragment(part);
      schema = schema[part];
      if (schema === void 0)
        break;
      var id;
      if (!PREVENT_SCOPE_CHANGE[part]) {
        id = this._getId(schema);
        if (id)
          baseId = resolveUrl(baseId, id);
        if (schema.$ref) {
          var $ref = resolveUrl(baseId, schema.$ref);
          var res = resolveSchema.call(this, root, $ref);
          if (res) {
            schema = res.schema;
            root = res.root;
            baseId = res.baseId;
          }
        }
      }
    }
  }
  if (schema !== void 0 && schema !== root.schema)
    return { schema, root, baseId };
}
var SIMPLE_INLINED = util$3.toHash([
  "type",
  "format",
  "pattern",
  "maxLength",
  "minLength",
  "maxProperties",
  "minProperties",
  "maxItems",
  "minItems",
  "maximum",
  "minimum",
  "uniqueItems",
  "multipleOf",
  "required",
  "enum"
]);
function inlineRef(schema, limit) {
  if (limit === false)
    return false;
  if (limit === void 0 || limit === true)
    return checkNoRef(schema);
  else if (limit)
    return countKeys(schema) <= limit;
}
function checkNoRef(schema) {
  var item;
  if (Array.isArray(schema)) {
    for (var i = 0; i < schema.length; i++) {
      item = schema[i];
      if (typeof item == "object" && !checkNoRef(item))
        return false;
    }
  } else {
    for (var key in schema) {
      if (key == "$ref")
        return false;
      item = schema[key];
      if (typeof item == "object" && !checkNoRef(item))
        return false;
    }
  }
  return true;
}
function countKeys(schema) {
  var count = 0, item;
  if (Array.isArray(schema)) {
    for (var i = 0; i < schema.length; i++) {
      item = schema[i];
      if (typeof item == "object")
        count += countKeys(item);
      if (count == Infinity)
        return Infinity;
    }
  } else {
    for (var key in schema) {
      if (key == "$ref")
        return Infinity;
      if (SIMPLE_INLINED[key]) {
        count++;
      } else {
        item = schema[key];
        if (typeof item == "object")
          count += countKeys(item) + 1;
        if (count == Infinity)
          return Infinity;
      }
    }
  }
  return count;
}
function getFullPath(id, normalize) {
  if (normalize !== false)
    id = normalizeId(id);
  var p = URI$1.parse(id);
  return _getFullPath(p);
}
function _getFullPath(p) {
  return URI$1.serialize(p).split("#")[0] + "#";
}
var TRAILING_SLASH_HASH = /#\/?$/;
function normalizeId(id) {
  return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
}
function resolveUrl(baseId, id) {
  id = normalizeId(id);
  return URI$1.resolve(baseId, id);
}
function resolveIds(schema) {
  var schemaId = normalizeId(this._getId(schema));
  var baseIds = { "": schemaId };
  var fullPaths = { "": getFullPath(schemaId, false) };
  var localRefs = {};
  var self2 = this;
  traverse(schema, { allKeys: true }, function(sch, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
    if (jsonPtr === "")
      return;
    var id = self2._getId(sch);
    var baseId = baseIds[parentJsonPtr];
    var fullPath = fullPaths[parentJsonPtr] + "/" + parentKeyword;
    if (keyIndex !== void 0)
      fullPath += "/" + (typeof keyIndex == "number" ? keyIndex : util$3.escapeFragment(keyIndex));
    if (typeof id == "string") {
      id = baseId = normalizeId(baseId ? URI$1.resolve(baseId, id) : id);
      var refVal = self2._refs[id];
      if (typeof refVal == "string")
        refVal = self2._refs[refVal];
      if (refVal && refVal.schema) {
        if (!equal$1(sch, refVal.schema))
          throw new Error('id "' + id + '" resolves to more than one schema');
      } else if (id != normalizeId(fullPath)) {
        if (id[0] == "#") {
          if (localRefs[id] && !equal$1(sch, localRefs[id]))
            throw new Error('id "' + id + '" resolves to more than one schema');
          localRefs[id] = sch;
        } else {
          self2._refs[id] = fullPath;
        }
      }
    }
    baseIds[jsonPtr] = baseId;
    fullPaths[jsonPtr] = fullPath;
  });
  return localRefs;
}
var resolve$2 = resolve_1;
var error_classes = {
  Validation: errorSubclass(ValidationError$1),
  MissingRef: errorSubclass(MissingRefError$1)
};
function ValidationError$1(errors) {
  this.message = "validation failed";
  this.errors = errors;
  this.ajv = this.validation = true;
}
MissingRefError$1.message = function(baseId, ref2) {
  return "can't resolve reference " + ref2 + " from id " + baseId;
};
function MissingRefError$1(baseId, ref2, message) {
  this.message = message || MissingRefError$1.message(baseId, ref2);
  this.missingRef = resolve$2.url(baseId, ref2);
  this.missingSchema = resolve$2.normalizeId(resolve$2.fullPath(this.missingRef));
}
function errorSubclass(Subclass) {
  Subclass.prototype = Object.create(Error.prototype);
  Subclass.prototype.constructor = Subclass;
  return Subclass;
}
var fastJsonStableStringify = function(data2, opts) {
  if (!opts)
    opts = {};
  if (typeof opts === "function")
    opts = { cmp: opts };
  var cycles = typeof opts.cycles === "boolean" ? opts.cycles : false;
  var cmp = opts.cmp && function(f) {
    return function(node) {
      return function(a, b) {
        var aobj = { key: a, value: node[a] };
        var bobj = { key: b, value: node[b] };
        return f(aobj, bobj);
      };
    };
  }(opts.cmp);
  var seen = [];
  return function stringify(node) {
    if (node && node.toJSON && typeof node.toJSON === "function") {
      node = node.toJSON();
    }
    if (node === void 0)
      return;
    if (typeof node == "number")
      return isFinite(node) ? "" + node : "null";
    if (typeof node !== "object")
      return JSON.stringify(node);
    var i, out;
    if (Array.isArray(node)) {
      out = "[";
      for (i = 0; i < node.length; i++) {
        if (i)
          out += ",";
        out += stringify(node[i]) || "null";
      }
      return out + "]";
    }
    if (node === null)
      return "null";
    if (seen.indexOf(node) !== -1) {
      if (cycles)
        return JSON.stringify("__cycle__");
      throw new TypeError("Converting circular structure to JSON");
    }
    var seenIndex = seen.push(node) - 1;
    var keys = Object.keys(node).sort(cmp && cmp(node));
    out = "";
    for (i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = stringify(node[key]);
      if (!value)
        continue;
      if (out)
        out += ",";
      out += JSON.stringify(key) + ":" + value;
    }
    seen.splice(seenIndex, 1);
    return "{" + out + "}";
  }(data2);
};
var validate$1 = function generate_validate(it, $keyword, $ruleType) {
  var out = "";
  var $async = it.schema.$async === true, $refKeywords = it.util.schemaHasRulesExcept(it.schema, it.RULES.all, "$ref"), $id2 = it.self._getId(it.schema);
  if (it.opts.strictKeywords) {
    var $unknownKwd = it.util.schemaUnknownRules(it.schema, it.RULES.keywords);
    if ($unknownKwd) {
      var $keywordsMsg = "unknown keyword: " + $unknownKwd;
      if (it.opts.strictKeywords === "log")
        it.logger.warn($keywordsMsg);
      else
        throw new Error($keywordsMsg);
    }
  }
  if (it.isTop) {
    out += " var validate = ";
    if ($async) {
      it.async = true;
      out += "async ";
    }
    out += "function(data, dataPath, parentData, parentDataProperty, rootData) { 'use strict'; ";
    if ($id2 && (it.opts.sourceCode || it.opts.processCode)) {
      out += " " + ("/*# sourceURL=" + $id2 + " */") + " ";
    }
  }
  if (typeof it.schema == "boolean" || !($refKeywords || it.schema.$ref)) {
    var $keyword = "false schema";
    var $lvl = it.level;
    var $dataLvl = it.dataLevel;
    var $schema2 = it.schema[$keyword];
    var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
    var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
    var $breakOnError = !it.opts.allErrors;
    var $errorKeyword;
    var $data = "data" + ($dataLvl || "");
    var $valid = "valid" + $lvl;
    if (it.schema === false) {
      if (it.isTop) {
        $breakOnError = true;
      } else {
        out += " var " + $valid + " = false; ";
      }
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = "";
      if (it.createErrors !== false) {
        out += " { keyword: '" + ($errorKeyword || "false schema") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: {} ";
        if (it.opts.messages !== false) {
          out += " , message: 'boolean schema is false' ";
        }
        if (it.opts.verbose) {
          out += " , schema: false , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
        }
        out += " } ";
      } else {
        out += " {} ";
      }
      var __err = out;
      out = $$outStack.pop();
      if (!it.compositeRule && $breakOnError) {
        if (it.async) {
          out += " throw new ValidationError([" + __err + "]); ";
        } else {
          out += " validate.errors = [" + __err + "]; return false; ";
        }
      } else {
        out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
      }
    } else {
      if (it.isTop) {
        if ($async) {
          out += " return data; ";
        } else {
          out += " validate.errors = null; return true; ";
        }
      } else {
        out += " var " + $valid + " = true; ";
      }
    }
    if (it.isTop) {
      out += " }; return validate; ";
    }
    return out;
  }
  if (it.isTop) {
    var $top = it.isTop, $lvl = it.level = 0, $dataLvl = it.dataLevel = 0, $data = "data";
    it.rootId = it.resolve.fullPath(it.self._getId(it.root.schema));
    it.baseId = it.baseId || it.rootId;
    delete it.isTop;
    it.dataPathArr = [""];
    if (it.schema.default !== void 0 && it.opts.useDefaults && it.opts.strictDefaults) {
      var $defaultMsg = "default is ignored in the schema root";
      if (it.opts.strictDefaults === "log")
        it.logger.warn($defaultMsg);
      else
        throw new Error($defaultMsg);
    }
    out += " var vErrors = null; ";
    out += " var errors = 0;     ";
    out += " if (rootData === undefined) rootData = data; ";
  } else {
    var $lvl = it.level, $dataLvl = it.dataLevel, $data = "data" + ($dataLvl || "");
    if ($id2)
      it.baseId = it.resolve.url(it.baseId, $id2);
    if ($async && !it.async)
      throw new Error("async schema in sync schema");
    out += " var errs_" + $lvl + " = errors;";
  }
  var $valid = "valid" + $lvl, $breakOnError = !it.opts.allErrors, $closingBraces1 = "", $closingBraces2 = "";
  var $errorKeyword;
  var $typeSchema = it.schema.type, $typeIsArray = Array.isArray($typeSchema);
  if ($typeSchema && it.opts.nullable && it.schema.nullable === true) {
    if ($typeIsArray) {
      if ($typeSchema.indexOf("null") == -1)
        $typeSchema = $typeSchema.concat("null");
    } else if ($typeSchema != "null") {
      $typeSchema = [$typeSchema, "null"];
      $typeIsArray = true;
    }
  }
  if ($typeIsArray && $typeSchema.length == 1) {
    $typeSchema = $typeSchema[0];
    $typeIsArray = false;
  }
  if (it.schema.$ref && $refKeywords) {
    if (it.opts.extendRefs == "fail") {
      throw new Error('$ref: validation keywords used in schema at path "' + it.errSchemaPath + '" (see option extendRefs)');
    } else if (it.opts.extendRefs !== true) {
      $refKeywords = false;
      it.logger.warn('$ref: keywords ignored in schema at path "' + it.errSchemaPath + '"');
    }
  }
  if (it.schema.$comment && it.opts.$comment) {
    out += " " + it.RULES.all.$comment.code(it, "$comment");
  }
  if ($typeSchema) {
    if (it.opts.coerceTypes) {
      var $coerceToTypes = it.util.coerceToTypes(it.opts.coerceTypes, $typeSchema);
    }
    var $rulesGroup = it.RULES.types[$typeSchema];
    if ($coerceToTypes || $typeIsArray || $rulesGroup === true || $rulesGroup && !$shouldUseGroup($rulesGroup)) {
      var $schemaPath = it.schemaPath + ".type", $errSchemaPath = it.errSchemaPath + "/type";
      var $schemaPath = it.schemaPath + ".type", $errSchemaPath = it.errSchemaPath + "/type", $method = $typeIsArray ? "checkDataTypes" : "checkDataType";
      out += " if (" + it.util[$method]($typeSchema, $data, it.opts.strictNumbers, true) + ") { ";
      if ($coerceToTypes) {
        var $dataType = "dataType" + $lvl, $coerced = "coerced" + $lvl;
        out += " var " + $dataType + " = typeof " + $data + "; var " + $coerced + " = undefined; ";
        if (it.opts.coerceTypes == "array") {
          out += " if (" + $dataType + " == 'object' && Array.isArray(" + $data + ") && " + $data + ".length == 1) { " + $data + " = " + $data + "[0]; " + $dataType + " = typeof " + $data + "; if (" + it.util.checkDataType(it.schema.type, $data, it.opts.strictNumbers) + ") " + $coerced + " = " + $data + "; } ";
        }
        out += " if (" + $coerced + " !== undefined) ; ";
        var arr1 = $coerceToTypes;
        if (arr1) {
          var $type, $i = -1, l1 = arr1.length - 1;
          while ($i < l1) {
            $type = arr1[$i += 1];
            if ($type == "string") {
              out += " else if (" + $dataType + " == 'number' || " + $dataType + " == 'boolean') " + $coerced + " = '' + " + $data + "; else if (" + $data + " === null) " + $coerced + " = ''; ";
            } else if ($type == "number" || $type == "integer") {
              out += " else if (" + $dataType + " == 'boolean' || " + $data + " === null || (" + $dataType + " == 'string' && " + $data + " && " + $data + " == +" + $data + " ";
              if ($type == "integer") {
                out += " && !(" + $data + " % 1)";
              }
              out += ")) " + $coerced + " = +" + $data + "; ";
            } else if ($type == "boolean") {
              out += " else if (" + $data + " === 'false' || " + $data + " === 0 || " + $data + " === null) " + $coerced + " = false; else if (" + $data + " === 'true' || " + $data + " === 1) " + $coerced + " = true; ";
            } else if ($type == "null") {
              out += " else if (" + $data + " === '' || " + $data + " === 0 || " + $data + " === false) " + $coerced + " = null; ";
            } else if (it.opts.coerceTypes == "array" && $type == "array") {
              out += " else if (" + $dataType + " == 'string' || " + $dataType + " == 'number' || " + $dataType + " == 'boolean' || " + $data + " == null) " + $coerced + " = [" + $data + "]; ";
            }
          }
        }
        out += " else {   ";
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = "";
        if (it.createErrors !== false) {
          out += " { keyword: '" + ($errorKeyword || "type") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { type: '";
          if ($typeIsArray) {
            out += "" + $typeSchema.join(",");
          } else {
            out += "" + $typeSchema;
          }
          out += "' } ";
          if (it.opts.messages !== false) {
            out += " , message: 'should be ";
            if ($typeIsArray) {
              out += "" + $typeSchema.join(",");
            } else {
              out += "" + $typeSchema;
            }
            out += "' ";
          }
          if (it.opts.verbose) {
            out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
          }
          out += " } ";
        } else {
          out += " {} ";
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          if (it.async) {
            out += " throw new ValidationError([" + __err + "]); ";
          } else {
            out += " validate.errors = [" + __err + "]; return false; ";
          }
        } else {
          out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
        }
        out += " } if (" + $coerced + " !== undefined) {  ";
        var $parentData = $dataLvl ? "data" + ($dataLvl - 1 || "") : "parentData", $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : "parentDataProperty";
        out += " " + $data + " = " + $coerced + "; ";
        if (!$dataLvl) {
          out += "if (" + $parentData + " !== undefined)";
        }
        out += " " + $parentData + "[" + $parentDataProperty + "] = " + $coerced + "; } ";
      } else {
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = "";
        if (it.createErrors !== false) {
          out += " { keyword: '" + ($errorKeyword || "type") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { type: '";
          if ($typeIsArray) {
            out += "" + $typeSchema.join(",");
          } else {
            out += "" + $typeSchema;
          }
          out += "' } ";
          if (it.opts.messages !== false) {
            out += " , message: 'should be ";
            if ($typeIsArray) {
              out += "" + $typeSchema.join(",");
            } else {
              out += "" + $typeSchema;
            }
            out += "' ";
          }
          if (it.opts.verbose) {
            out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
          }
          out += " } ";
        } else {
          out += " {} ";
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          if (it.async) {
            out += " throw new ValidationError([" + __err + "]); ";
          } else {
            out += " validate.errors = [" + __err + "]; return false; ";
          }
        } else {
          out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
        }
      }
      out += " } ";
    }
  }
  if (it.schema.$ref && !$refKeywords) {
    out += " " + it.RULES.all.$ref.code(it, "$ref") + " ";
    if ($breakOnError) {
      out += " } if (errors === ";
      if ($top) {
        out += "0";
      } else {
        out += "errs_" + $lvl;
      }
      out += ") { ";
      $closingBraces2 += "}";
    }
  } else {
    var arr2 = it.RULES;
    if (arr2) {
      var $rulesGroup, i2 = -1, l2 = arr2.length - 1;
      while (i2 < l2) {
        $rulesGroup = arr2[i2 += 1];
        if ($shouldUseGroup($rulesGroup)) {
          if ($rulesGroup.type) {
            out += " if (" + it.util.checkDataType($rulesGroup.type, $data, it.opts.strictNumbers) + ") { ";
          }
          if (it.opts.useDefaults) {
            if ($rulesGroup.type == "object" && it.schema.properties) {
              var $schema2 = it.schema.properties, $schemaKeys = Object.keys($schema2);
              var arr3 = $schemaKeys;
              if (arr3) {
                var $propertyKey, i3 = -1, l3 = arr3.length - 1;
                while (i3 < l3) {
                  $propertyKey = arr3[i3 += 1];
                  var $sch = $schema2[$propertyKey];
                  if ($sch.default !== void 0) {
                    var $passData = $data + it.util.getProperty($propertyKey);
                    if (it.compositeRule) {
                      if (it.opts.strictDefaults) {
                        var $defaultMsg = "default is ignored for: " + $passData;
                        if (it.opts.strictDefaults === "log")
                          it.logger.warn($defaultMsg);
                        else
                          throw new Error($defaultMsg);
                      }
                    } else {
                      out += " if (" + $passData + " === undefined ";
                      if (it.opts.useDefaults == "empty") {
                        out += " || " + $passData + " === null || " + $passData + " === '' ";
                      }
                      out += " ) " + $passData + " = ";
                      if (it.opts.useDefaults == "shared") {
                        out += " " + it.useDefault($sch.default) + " ";
                      } else {
                        out += " " + JSON.stringify($sch.default) + " ";
                      }
                      out += "; ";
                    }
                  }
                }
              }
            } else if ($rulesGroup.type == "array" && Array.isArray(it.schema.items)) {
              var arr4 = it.schema.items;
              if (arr4) {
                var $sch, $i = -1, l4 = arr4.length - 1;
                while ($i < l4) {
                  $sch = arr4[$i += 1];
                  if ($sch.default !== void 0) {
                    var $passData = $data + "[" + $i + "]";
                    if (it.compositeRule) {
                      if (it.opts.strictDefaults) {
                        var $defaultMsg = "default is ignored for: " + $passData;
                        if (it.opts.strictDefaults === "log")
                          it.logger.warn($defaultMsg);
                        else
                          throw new Error($defaultMsg);
                      }
                    } else {
                      out += " if (" + $passData + " === undefined ";
                      if (it.opts.useDefaults == "empty") {
                        out += " || " + $passData + " === null || " + $passData + " === '' ";
                      }
                      out += " ) " + $passData + " = ";
                      if (it.opts.useDefaults == "shared") {
                        out += " " + it.useDefault($sch.default) + " ";
                      } else {
                        out += " " + JSON.stringify($sch.default) + " ";
                      }
                      out += "; ";
                    }
                  }
                }
              }
            }
          }
          var arr5 = $rulesGroup.rules;
          if (arr5) {
            var $rule, i5 = -1, l5 = arr5.length - 1;
            while (i5 < l5) {
              $rule = arr5[i5 += 1];
              if ($shouldUseRule($rule)) {
                var $code = $rule.code(it, $rule.keyword, $rulesGroup.type);
                if ($code) {
                  out += " " + $code + " ";
                  if ($breakOnError) {
                    $closingBraces1 += "}";
                  }
                }
              }
            }
          }
          if ($breakOnError) {
            out += " " + $closingBraces1 + " ";
            $closingBraces1 = "";
          }
          if ($rulesGroup.type) {
            out += " } ";
            if ($typeSchema && $typeSchema === $rulesGroup.type && !$coerceToTypes) {
              out += " else { ";
              var $schemaPath = it.schemaPath + ".type", $errSchemaPath = it.errSchemaPath + "/type";
              var $$outStack = $$outStack || [];
              $$outStack.push(out);
              out = "";
              if (it.createErrors !== false) {
                out += " { keyword: '" + ($errorKeyword || "type") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { type: '";
                if ($typeIsArray) {
                  out += "" + $typeSchema.join(",");
                } else {
                  out += "" + $typeSchema;
                }
                out += "' } ";
                if (it.opts.messages !== false) {
                  out += " , message: 'should be ";
                  if ($typeIsArray) {
                    out += "" + $typeSchema.join(",");
                  } else {
                    out += "" + $typeSchema;
                  }
                  out += "' ";
                }
                if (it.opts.verbose) {
                  out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
                }
                out += " } ";
              } else {
                out += " {} ";
              }
              var __err = out;
              out = $$outStack.pop();
              if (!it.compositeRule && $breakOnError) {
                if (it.async) {
                  out += " throw new ValidationError([" + __err + "]); ";
                } else {
                  out += " validate.errors = [" + __err + "]; return false; ";
                }
              } else {
                out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
              }
              out += " } ";
            }
          }
          if ($breakOnError) {
            out += " if (errors === ";
            if ($top) {
              out += "0";
            } else {
              out += "errs_" + $lvl;
            }
            out += ") { ";
            $closingBraces2 += "}";
          }
        }
      }
    }
  }
  if ($breakOnError) {
    out += " " + $closingBraces2 + " ";
  }
  if ($top) {
    if ($async) {
      out += " if (errors === 0) return data;           ";
      out += " else throw new ValidationError(vErrors); ";
    } else {
      out += " validate.errors = vErrors; ";
      out += " return errors === 0;       ";
    }
    out += " }; return validate;";
  } else {
    out += " var " + $valid + " = errors === errs_" + $lvl + ";";
  }
  function $shouldUseGroup($rulesGroup2) {
    var rules3 = $rulesGroup2.rules;
    for (var i = 0; i < rules3.length; i++)
      if ($shouldUseRule(rules3[i]))
        return true;
  }
  function $shouldUseRule($rule2) {
    return it.schema[$rule2.keyword] !== void 0 || $rule2.implements && $ruleImplementsSomeKeyword($rule2);
  }
  function $ruleImplementsSomeKeyword($rule2) {
    var impl = $rule2.implements;
    for (var i = 0; i < impl.length; i++)
      if (it.schema[impl[i]] !== void 0)
        return true;
  }
  return out;
};
var resolve$1 = resolve_1, util$2 = util$5, errorClasses$1 = error_classes, stableStringify$1 = fastJsonStableStringify;
var validateGenerator = validate$1;
var ucs2length2 = util$2.ucs2length;
var equal2 = fastDeepEqual;
var ValidationError = errorClasses$1.Validation;
var compile_1 = compile$1;
function compile$1(schema, root, localRefs, baseId) {
  var self2 = this, opts = this._opts, refVal = [void 0], refs = {}, patterns = [], patternsHash = {}, defaults = [], defaultsHash = {}, customRules = [];
  root = root || { schema, refVal, refs };
  var c = checkCompiling.call(this, schema, root, baseId);
  var compilation = this._compilations[c.index];
  if (c.compiling)
    return compilation.callValidate = callValidate;
  var formats2 = this._formats;
  var RULES = this.RULES;
  try {
    var v = localCompile(schema, root, localRefs, baseId);
    compilation.validate = v;
    var cv = compilation.callValidate;
    if (cv) {
      cv.schema = v.schema;
      cv.errors = null;
      cv.refs = v.refs;
      cv.refVal = v.refVal;
      cv.root = v.root;
      cv.$async = v.$async;
      if (opts.sourceCode)
        cv.source = v.source;
    }
    return v;
  } finally {
    endCompiling.call(this, schema, root, baseId);
  }
  function callValidate() {
    var validate2 = compilation.validate;
    var result = validate2.apply(this, arguments);
    callValidate.errors = validate2.errors;
    return result;
  }
  function localCompile(_schema, _root, localRefs2, baseId2) {
    var isRoot = !_root || _root && _root.schema == _schema;
    if (_root.schema != root.schema)
      return compile$1.call(self2, _schema, _root, localRefs2, baseId2);
    var $async = _schema.$async === true;
    var sourceCode = validateGenerator({
      isTop: true,
      schema: _schema,
      isRoot,
      baseId: baseId2,
      root: _root,
      schemaPath: "",
      errSchemaPath: "#",
      errorPath: '""',
      MissingRefError: errorClasses$1.MissingRef,
      RULES,
      validate: validateGenerator,
      util: util$2,
      resolve: resolve$1,
      resolveRef,
      usePattern,
      useDefault,
      useCustomRule,
      opts,
      formats: formats2,
      logger: self2.logger,
      self: self2
    });
    sourceCode = vars(refVal, refValCode) + vars(patterns, patternCode) + vars(defaults, defaultCode) + vars(customRules, customRuleCode$1) + sourceCode;
    if (opts.processCode)
      sourceCode = opts.processCode(sourceCode, _schema);
    var validate2;
    try {
      var makeValidate = new Function(
        "self",
        "RULES",
        "formats",
        "root",
        "refVal",
        "defaults",
        "customRules",
        "equal",
        "ucs2length",
        "ValidationError",
        sourceCode
      );
      validate2 = makeValidate(
        self2,
        RULES,
        formats2,
        root,
        refVal,
        defaults,
        customRules,
        equal2,
        ucs2length2,
        ValidationError
      );
      refVal[0] = validate2;
    } catch (e) {
      self2.logger.error("Error compiling schema, function code:", sourceCode);
      throw e;
    }
    validate2.schema = _schema;
    validate2.errors = null;
    validate2.refs = refs;
    validate2.refVal = refVal;
    validate2.root = isRoot ? validate2 : _root;
    if ($async)
      validate2.$async = true;
    if (opts.sourceCode === true) {
      validate2.source = {
        code: sourceCode,
        patterns,
        defaults
      };
    }
    return validate2;
  }
  function resolveRef(baseId2, ref2, isRoot) {
    ref2 = resolve$1.url(baseId2, ref2);
    var refIndex = refs[ref2];
    var _refVal, refCode;
    if (refIndex !== void 0) {
      _refVal = refVal[refIndex];
      refCode = "refVal[" + refIndex + "]";
      return resolvedRef(_refVal, refCode);
    }
    if (!isRoot && root.refs) {
      var rootRefId = root.refs[ref2];
      if (rootRefId !== void 0) {
        _refVal = root.refVal[rootRefId];
        refCode = addLocalRef(ref2, _refVal);
        return resolvedRef(_refVal, refCode);
      }
    }
    refCode = addLocalRef(ref2);
    var v2 = resolve$1.call(self2, localCompile, root, ref2);
    if (v2 === void 0) {
      var localSchema = localRefs && localRefs[ref2];
      if (localSchema) {
        v2 = resolve$1.inlineRef(localSchema, opts.inlineRefs) ? localSchema : compile$1.call(self2, localSchema, root, localRefs, baseId2);
      }
    }
    if (v2 === void 0) {
      removeLocalRef(ref2);
    } else {
      replaceLocalRef(ref2, v2);
      return resolvedRef(v2, refCode);
    }
  }
  function addLocalRef(ref2, v2) {
    var refId = refVal.length;
    refVal[refId] = v2;
    refs[ref2] = refId;
    return "refVal" + refId;
  }
  function removeLocalRef(ref2) {
    delete refs[ref2];
  }
  function replaceLocalRef(ref2, v2) {
    var refId = refs[ref2];
    refVal[refId] = v2;
  }
  function resolvedRef(refVal2, code) {
    return typeof refVal2 == "object" || typeof refVal2 == "boolean" ? { code, schema: refVal2, inline: true } : { code, $async: refVal2 && !!refVal2.$async };
  }
  function usePattern(regexStr) {
    var index = patternsHash[regexStr];
    if (index === void 0) {
      index = patternsHash[regexStr] = patterns.length;
      patterns[index] = regexStr;
    }
    return "pattern" + index;
  }
  function useDefault(value) {
    switch (typeof value) {
      case "boolean":
      case "number":
        return "" + value;
      case "string":
        return util$2.toQuotedString(value);
      case "object":
        if (value === null)
          return "null";
        var valueStr = stableStringify$1(value);
        var index = defaultsHash[valueStr];
        if (index === void 0) {
          index = defaultsHash[valueStr] = defaults.length;
          defaults[index] = value;
        }
        return "default" + index;
    }
  }
  function useCustomRule(rule, schema2, parentSchema, it) {
    if (self2._opts.validateSchema !== false) {
      var deps = rule.definition.dependencies;
      if (deps && !deps.every(function(keyword2) {
        return Object.prototype.hasOwnProperty.call(parentSchema, keyword2);
      }))
        throw new Error("parent schema must have all required keywords: " + deps.join(","));
      var validateSchema2 = rule.definition.validateSchema;
      if (validateSchema2) {
        var valid = validateSchema2(schema2);
        if (!valid) {
          var message = "keyword schema is invalid: " + self2.errorsText(validateSchema2.errors);
          if (self2._opts.validateSchema == "log")
            self2.logger.error(message);
          else
            throw new Error(message);
        }
      }
    }
    var compile2 = rule.definition.compile, inline = rule.definition.inline, macro = rule.definition.macro;
    var validate2;
    if (compile2) {
      validate2 = compile2.call(self2, schema2, parentSchema, it);
    } else if (macro) {
      validate2 = macro.call(self2, schema2, parentSchema, it);
      if (opts.validateSchema !== false)
        self2.validateSchema(validate2, true);
    } else if (inline) {
      validate2 = inline.call(self2, it, rule.keyword, schema2, parentSchema);
    } else {
      validate2 = rule.definition.validate;
      if (!validate2)
        return;
    }
    if (validate2 === void 0)
      throw new Error('custom keyword "' + rule.keyword + '"failed to compile');
    var index = customRules.length;
    customRules[index] = validate2;
    return {
      code: "customRule" + index,
      validate: validate2
    };
  }
}
function checkCompiling(schema, root, baseId) {
  var index = compIndex.call(this, schema, root, baseId);
  if (index >= 0)
    return { index, compiling: true };
  index = this._compilations.length;
  this._compilations[index] = {
    schema,
    root,
    baseId
  };
  return { index, compiling: false };
}
function endCompiling(schema, root, baseId) {
  var i = compIndex.call(this, schema, root, baseId);
  if (i >= 0)
    this._compilations.splice(i, 1);
}
function compIndex(schema, root, baseId) {
  for (var i = 0; i < this._compilations.length; i++) {
    var c = this._compilations[i];
    if (c.schema == schema && c.root == root && c.baseId == baseId)
      return i;
  }
  return -1;
}
function patternCode(i, patterns) {
  return "var pattern" + i + " = new RegExp(" + util$2.toQuotedString(patterns[i]) + ");";
}
function defaultCode(i) {
  return "var default" + i + " = defaults[" + i + "];";
}
function refValCode(i, refVal) {
  return refVal[i] === void 0 ? "" : "var refVal" + i + " = refVal[" + i + "];";
}
function customRuleCode$1(i) {
  return "var customRule" + i + " = customRules[" + i + "];";
}
function vars(arr, statement) {
  if (!arr.length)
    return "";
  var code = "";
  for (var i = 0; i < arr.length; i++)
    code += statement(i, arr);
  return code;
}
var cache = { exports: {} };
var Cache$1 = cache.exports = function Cache() {
  this._cache = {};
};
Cache$1.prototype.put = function Cache_put(key, value) {
  this._cache[key] = value;
};
Cache$1.prototype.get = function Cache_get(key) {
  return this._cache[key];
};
Cache$1.prototype.del = function Cache_del(key) {
  delete this._cache[key];
};
Cache$1.prototype.clear = function Cache_clear() {
  this._cache = {};
};
var cacheExports = cache.exports;
var util$1 = util$5;
var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
var HOSTNAME = /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i;
var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
var URIREF = /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
var URITEMPLATE = /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i;
var URL$1 = /^(?:(?:http[s\u017F]?|ftp):\/\/)(?:(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+(?::(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?@)?(?:(?!10(?:\.[0-9]{1,3}){3})(?!127(?:\.[0-9]{1,3}){3})(?!169\.254(?:\.[0-9]{1,3}){2})(?!192\.168(?:\.[0-9]{1,3}){2})(?!172\.(?:1[6-9]|2[0-9]|3[01])(?:\.[0-9]{1,3}){2})(?:[1-9][0-9]?|1[0-9][0-9]|2[01][0-9]|22[0-3])(?:\.(?:1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])){2}(?:\.(?:[1-9][0-9]?|1[0-9][0-9]|2[0-4][0-9]|25[0-4]))|(?:(?:(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-)*(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)(?:\.(?:(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-)*(?:[0-9a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)*(?:\.(?:(?:[a-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]){2,})))(?::[0-9]{2,5})?(?:\/(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?$/i;
var UUID = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
var JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
var JSON_POINTER_URI_FRAGMENT = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i;
var RELATIVE_JSON_POINTER = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;
var formats_1 = formats$1;
function formats$1(mode) {
  mode = mode == "full" ? "full" : "fast";
  return util$1.copy(formats$1[mode]);
}
formats$1.fast = {
  // date: http://tools.ietf.org/html/rfc3339#section-5.6
  date: /^\d\d\d\d-[0-1]\d-[0-3]\d$/,
  // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
  time: /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
  "date-time": /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
  // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
  uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
  "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
  "uri-template": URITEMPLATE,
  url: URL$1,
  // email (sources from jsen validator):
  // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
  // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'willful violation')
  email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
  hostname: HOSTNAME,
  // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  // optimized http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
  regex,
  // uuid: http://tools.ietf.org/html/rfc4122
  uuid: UUID,
  // JSON-pointer: https://tools.ietf.org/html/rfc6901
  // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
  "json-pointer": JSON_POINTER,
  "json-pointer-uri-fragment": JSON_POINTER_URI_FRAGMENT,
  // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
  "relative-json-pointer": RELATIVE_JSON_POINTER
};
formats$1.full = {
  date,
  time,
  "date-time": date_time,
  uri,
  "uri-reference": URIREF,
  "uri-template": URITEMPLATE,
  url: URL$1,
  email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
  hostname: HOSTNAME,
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
  regex,
  uuid: UUID,
  "json-pointer": JSON_POINTER,
  "json-pointer-uri-fragment": JSON_POINTER_URI_FRAGMENT,
  "relative-json-pointer": RELATIVE_JSON_POINTER
};
function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function date(str) {
  var matches = str.match(DATE);
  if (!matches)
    return false;
  var year = +matches[1];
  var month = +matches[2];
  var day = +matches[3];
  return month >= 1 && month <= 12 && day >= 1 && day <= (month == 2 && isLeapYear(year) ? 29 : DAYS[month]);
}
function time(str, full) {
  var matches = str.match(TIME);
  if (!matches)
    return false;
  var hour = matches[1];
  var minute = matches[2];
  var second = matches[3];
  var timeZone = matches[5];
  return (hour <= 23 && minute <= 59 && second <= 59 || hour == 23 && minute == 59 && second == 60) && (!full || timeZone);
}
var DATE_TIME_SEPARATOR = /t|\s/i;
function date_time(str) {
  var dateTime = str.split(DATE_TIME_SEPARATOR);
  return dateTime.length == 2 && date(dateTime[0]) && time(dateTime[1], true);
}
var NOT_URI_FRAGMENT = /\/|:/;
function uri(str) {
  return NOT_URI_FRAGMENT.test(str) && URI.test(str);
}
var Z_ANCHOR = /[^\\]\\Z/;
function regex(str) {
  if (Z_ANCHOR.test(str))
    return false;
  try {
    new RegExp(str);
    return true;
  } catch (e) {
    return false;
  }
}
var ref = function generate_ref(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $async, $refCode;
  if ($schema2 == "#" || $schema2 == "#/") {
    if (it.isRoot) {
      $async = it.async;
      $refCode = "validate";
    } else {
      $async = it.root.schema.$async === true;
      $refCode = "root.refVal[0]";
    }
  } else {
    var $refVal = it.resolveRef(it.baseId, $schema2, it.isRoot);
    if ($refVal === void 0) {
      var $message = it.MissingRefError.message(it.baseId, $schema2);
      if (it.opts.missingRefs == "fail") {
        it.logger.error($message);
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = "";
        if (it.createErrors !== false) {
          out += " { keyword: '$ref' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { ref: '" + it.util.escapeQuotes($schema2) + "' } ";
          if (it.opts.messages !== false) {
            out += " , message: 'can\\'t resolve reference " + it.util.escapeQuotes($schema2) + "' ";
          }
          if (it.opts.verbose) {
            out += " , schema: " + it.util.toQuotedString($schema2) + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
          }
          out += " } ";
        } else {
          out += " {} ";
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          if (it.async) {
            out += " throw new ValidationError([" + __err + "]); ";
          } else {
            out += " validate.errors = [" + __err + "]; return false; ";
          }
        } else {
          out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
        }
        if ($breakOnError) {
          out += " if (false) { ";
        }
      } else if (it.opts.missingRefs == "ignore") {
        it.logger.warn($message);
        if ($breakOnError) {
          out += " if (true) { ";
        }
      } else {
        throw new it.MissingRefError(it.baseId, $schema2, $message);
      }
    } else if ($refVal.inline) {
      var $it = it.util.copy(it);
      $it.level++;
      var $nextValid = "valid" + $it.level;
      $it.schema = $refVal.schema;
      $it.schemaPath = "";
      $it.errSchemaPath = $schema2;
      var $code = it.validate($it).replace(/validate\.schema/g, $refVal.code);
      out += " " + $code + " ";
      if ($breakOnError) {
        out += " if (" + $nextValid + ") { ";
      }
    } else {
      $async = $refVal.$async === true || it.async && $refVal.$async !== false;
      $refCode = $refVal.code;
    }
  }
  if ($refCode) {
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = "";
    if (it.opts.passContext) {
      out += " " + $refCode + ".call(this, ";
    } else {
      out += " " + $refCode + "( ";
    }
    out += " " + $data + ", (dataPath || '')";
    if (it.errorPath != '""') {
      out += " + " + it.errorPath;
    }
    var $parentData = $dataLvl ? "data" + ($dataLvl - 1 || "") : "parentData", $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : "parentDataProperty";
    out += " , " + $parentData + " , " + $parentDataProperty + ", rootData)  ";
    var __callValidate = out;
    out = $$outStack.pop();
    if ($async) {
      if (!it.async)
        throw new Error("async schema referenced by sync schema");
      if ($breakOnError) {
        out += " var " + $valid + "; ";
      }
      out += " try { await " + __callValidate + "; ";
      if ($breakOnError) {
        out += " " + $valid + " = true; ";
      }
      out += " } catch (e) { if (!(e instanceof ValidationError)) throw e; if (vErrors === null) vErrors = e.errors; else vErrors = vErrors.concat(e.errors); errors = vErrors.length; ";
      if ($breakOnError) {
        out += " " + $valid + " = false; ";
      }
      out += " } ";
      if ($breakOnError) {
        out += " if (" + $valid + ") { ";
      }
    } else {
      out += " if (!" + __callValidate + ") { if (vErrors === null) vErrors = " + $refCode + ".errors; else vErrors = vErrors.concat(" + $refCode + ".errors); errors = vErrors.length; } ";
      if ($breakOnError) {
        out += " else { ";
      }
    }
  }
  return out;
};
var allOf = function generate_allOf(it, $keyword, $ruleType) {
  var out = " ";
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $it = it.util.copy(it);
  var $closingBraces = "";
  $it.level++;
  var $nextValid = "valid" + $it.level;
  var $currentBaseId = $it.baseId, $allSchemasEmpty = true;
  var arr1 = $schema2;
  if (arr1) {
    var $sch, $i = -1, l1 = arr1.length - 1;
    while ($i < l1) {
      $sch = arr1[$i += 1];
      if (it.opts.strictKeywords ? typeof $sch == "object" && Object.keys($sch).length > 0 || $sch === false : it.util.schemaHasRules($sch, it.RULES.all)) {
        $allSchemasEmpty = false;
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + "[" + $i + "]";
        $it.errSchemaPath = $errSchemaPath + "/" + $i;
        out += "  " + it.validate($it) + " ";
        $it.baseId = $currentBaseId;
        if ($breakOnError) {
          out += " if (" + $nextValid + ") { ";
          $closingBraces += "}";
        }
      }
    }
  }
  if ($breakOnError) {
    if ($allSchemasEmpty) {
      out += " if (true) { ";
    } else {
      out += " " + $closingBraces.slice(0, -1) + " ";
    }
  }
  return out;
};
var anyOf = function generate_anyOf(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $errs = "errs__" + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = "";
  $it.level++;
  var $nextValid = "valid" + $it.level;
  var $noEmptySchema = $schema2.every(function($sch2) {
    return it.opts.strictKeywords ? typeof $sch2 == "object" && Object.keys($sch2).length > 0 || $sch2 === false : it.util.schemaHasRules($sch2, it.RULES.all);
  });
  if ($noEmptySchema) {
    var $currentBaseId = $it.baseId;
    out += " var " + $errs + " = errors; var " + $valid + " = false;  ";
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var arr1 = $schema2;
    if (arr1) {
      var $sch, $i = -1, l1 = arr1.length - 1;
      while ($i < l1) {
        $sch = arr1[$i += 1];
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + "[" + $i + "]";
        $it.errSchemaPath = $errSchemaPath + "/" + $i;
        out += "  " + it.validate($it) + " ";
        $it.baseId = $currentBaseId;
        out += " " + $valid + " = " + $valid + " || " + $nextValid + "; if (!" + $valid + ") { ";
        $closingBraces += "}";
      }
    }
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += " " + $closingBraces + " if (!" + $valid + ") {   var err =   ";
    if (it.createErrors !== false) {
      out += " { keyword: 'anyOf' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: {} ";
      if (it.opts.messages !== false) {
        out += " , message: 'should match some schema in anyOf' ";
      }
      if (it.opts.verbose) {
        out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
      }
      out += " } ";
    } else {
      out += " {} ";
    }
    out += ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += " throw new ValidationError(vErrors); ";
      } else {
        out += " validate.errors = vErrors; return false; ";
      }
    }
    out += " } else {  errors = " + $errs + "; if (vErrors !== null) { if (" + $errs + ") vErrors.length = " + $errs + "; else vErrors = null; } ";
    if (it.opts.allErrors) {
      out += " } ";
    }
  } else {
    if ($breakOnError) {
      out += " if (true) { ";
    }
  }
  return out;
};
var comment = function generate_comment(it, $keyword, $ruleType) {
  var out = " ";
  var $schema2 = it.schema[$keyword];
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  !it.opts.allErrors;
  var $comment = it.util.toQuotedString($schema2);
  if (it.opts.$comment === true) {
    out += " console.log(" + $comment + ");";
  } else if (typeof it.opts.$comment == "function") {
    out += " self._opts.$comment(" + $comment + ", " + it.util.toQuotedString($errSchemaPath) + ", validate.root.schema);";
  }
  return out;
};
var _const = function generate_const(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $isData = it.opts.$data && $schema2 && $schema2.$data;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
  }
  if (!$isData) {
    out += " var schema" + $lvl + " = validate.schema" + $schemaPath + ";";
  }
  out += "var " + $valid + " = equal(" + $data + ", schema" + $lvl + "); if (!" + $valid + ") {   ";
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = "";
  if (it.createErrors !== false) {
    out += " { keyword: 'const' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { allowedValue: schema" + $lvl + " } ";
    if (it.opts.messages !== false) {
      out += " , message: 'should be equal to constant' ";
    }
    if (it.opts.verbose) {
      out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError([" + __err + "]); ";
    } else {
      out += " validate.errors = [" + __err + "]; return false; ";
    }
  } else {
    out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  }
  out += " }";
  if ($breakOnError) {
    out += " else { ";
  }
  return out;
};
var contains = function generate_contains(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $errs = "errs__" + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = "";
  $it.level++;
  var $nextValid = "valid" + $it.level;
  var $idx = "i" + $lvl, $dataNxt = $it.dataLevel = it.dataLevel + 1, $nextData = "data" + $dataNxt, $currentBaseId = it.baseId, $nonEmptySchema = it.opts.strictKeywords ? typeof $schema2 == "object" && Object.keys($schema2).length > 0 || $schema2 === false : it.util.schemaHasRules($schema2, it.RULES.all);
  out += "var " + $errs + " = errors;var " + $valid + ";";
  if ($nonEmptySchema) {
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    $it.schema = $schema2;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += " var " + $nextValid + " = false; for (var " + $idx + " = 0; " + $idx + " < " + $data + ".length; " + $idx + "++) { ";
    $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
    var $passData = $data + "[" + $idx + "]";
    $it.dataPathArr[$dataNxt] = $idx;
    var $code = it.validate($it);
    $it.baseId = $currentBaseId;
    if (it.util.varOccurences($code, $nextData) < 2) {
      out += " " + it.util.varReplace($code, $nextData, $passData) + " ";
    } else {
      out += " var " + $nextData + " = " + $passData + "; " + $code + " ";
    }
    out += " if (" + $nextValid + ") break; }  ";
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += " " + $closingBraces + " if (!" + $nextValid + ") {";
  } else {
    out += " if (" + $data + ".length == 0) {";
  }
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = "";
  if (it.createErrors !== false) {
    out += " { keyword: 'contains' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: {} ";
    if (it.opts.messages !== false) {
      out += " , message: 'should contain a valid item' ";
    }
    if (it.opts.verbose) {
      out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError([" + __err + "]); ";
    } else {
      out += " validate.errors = [" + __err + "]; return false; ";
    }
  } else {
    out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  }
  out += " } else { ";
  if ($nonEmptySchema) {
    out += "  errors = " + $errs + "; if (vErrors !== null) { if (" + $errs + ") vErrors.length = " + $errs + "; else vErrors = null; } ";
  }
  if (it.opts.allErrors) {
    out += " } ";
  }
  return out;
};
var dependencies = function generate_dependencies(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $errs = "errs__" + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = "";
  $it.level++;
  var $nextValid = "valid" + $it.level;
  var $schemaDeps = {}, $propertyDeps = {}, $ownProperties = it.opts.ownProperties;
  for ($property in $schema2) {
    if ($property == "__proto__")
      continue;
    var $sch = $schema2[$property];
    var $deps = Array.isArray($sch) ? $propertyDeps : $schemaDeps;
    $deps[$property] = $sch;
  }
  out += "var " + $errs + " = errors;";
  var $currentErrorPath = it.errorPath;
  out += "var missing" + $lvl + ";";
  for (var $property in $propertyDeps) {
    $deps = $propertyDeps[$property];
    if ($deps.length) {
      out += " if ( " + $data + it.util.getProperty($property) + " !== undefined ";
      if ($ownProperties) {
        out += " && Object.prototype.hasOwnProperty.call(" + $data + ", '" + it.util.escapeQuotes($property) + "') ";
      }
      if ($breakOnError) {
        out += " && ( ";
        var arr1 = $deps;
        if (arr1) {
          var $propertyKey, $i = -1, l1 = arr1.length - 1;
          while ($i < l1) {
            $propertyKey = arr1[$i += 1];
            if ($i) {
              out += " || ";
            }
            var $prop = it.util.getProperty($propertyKey), $useData = $data + $prop;
            out += " ( ( " + $useData + " === undefined ";
            if ($ownProperties) {
              out += " || ! Object.prototype.hasOwnProperty.call(" + $data + ", '" + it.util.escapeQuotes($propertyKey) + "') ";
            }
            out += ") && (missing" + $lvl + " = " + it.util.toQuotedString(it.opts.jsonPointers ? $propertyKey : $prop) + ") ) ";
          }
        }
        out += ")) {  ";
        var $propertyPath = "missing" + $lvl, $missingProperty = "' + " + $propertyPath + " + '";
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.opts.jsonPointers ? it.util.getPathExpr($currentErrorPath, $propertyPath, true) : $currentErrorPath + " + " + $propertyPath;
        }
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = "";
        if (it.createErrors !== false) {
          out += " { keyword: 'dependencies' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { property: '" + it.util.escapeQuotes($property) + "', missingProperty: '" + $missingProperty + "', depsCount: " + $deps.length + ", deps: '" + it.util.escapeQuotes($deps.length == 1 ? $deps[0] : $deps.join(", ")) + "' } ";
          if (it.opts.messages !== false) {
            out += " , message: 'should have ";
            if ($deps.length == 1) {
              out += "property " + it.util.escapeQuotes($deps[0]);
            } else {
              out += "properties " + it.util.escapeQuotes($deps.join(", "));
            }
            out += " when property " + it.util.escapeQuotes($property) + " is present' ";
          }
          if (it.opts.verbose) {
            out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
          }
          out += " } ";
        } else {
          out += " {} ";
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          if (it.async) {
            out += " throw new ValidationError([" + __err + "]); ";
          } else {
            out += " validate.errors = [" + __err + "]; return false; ";
          }
        } else {
          out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
        }
      } else {
        out += " ) { ";
        var arr2 = $deps;
        if (arr2) {
          var $propertyKey, i2 = -1, l2 = arr2.length - 1;
          while (i2 < l2) {
            $propertyKey = arr2[i2 += 1];
            var $prop = it.util.getProperty($propertyKey), $missingProperty = it.util.escapeQuotes($propertyKey), $useData = $data + $prop;
            if (it.opts._errorDataPathProperty) {
              it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
            }
            out += " if ( " + $useData + " === undefined ";
            if ($ownProperties) {
              out += " || ! Object.prototype.hasOwnProperty.call(" + $data + ", '" + it.util.escapeQuotes($propertyKey) + "') ";
            }
            out += ") {  var err =   ";
            if (it.createErrors !== false) {
              out += " { keyword: 'dependencies' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { property: '" + it.util.escapeQuotes($property) + "', missingProperty: '" + $missingProperty + "', depsCount: " + $deps.length + ", deps: '" + it.util.escapeQuotes($deps.length == 1 ? $deps[0] : $deps.join(", ")) + "' } ";
              if (it.opts.messages !== false) {
                out += " , message: 'should have ";
                if ($deps.length == 1) {
                  out += "property " + it.util.escapeQuotes($deps[0]);
                } else {
                  out += "properties " + it.util.escapeQuotes($deps.join(", "));
                }
                out += " when property " + it.util.escapeQuotes($property) + " is present' ";
              }
              if (it.opts.verbose) {
                out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
              }
              out += " } ";
            } else {
              out += " {} ";
            }
            out += ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } ";
          }
        }
      }
      out += " }   ";
      if ($breakOnError) {
        $closingBraces += "}";
        out += " else { ";
      }
    }
  }
  it.errorPath = $currentErrorPath;
  var $currentBaseId = $it.baseId;
  for (var $property in $schemaDeps) {
    var $sch = $schemaDeps[$property];
    if (it.opts.strictKeywords ? typeof $sch == "object" && Object.keys($sch).length > 0 || $sch === false : it.util.schemaHasRules($sch, it.RULES.all)) {
      out += " " + $nextValid + " = true; if ( " + $data + it.util.getProperty($property) + " !== undefined ";
      if ($ownProperties) {
        out += " && Object.prototype.hasOwnProperty.call(" + $data + ", '" + it.util.escapeQuotes($property) + "') ";
      }
      out += ") { ";
      $it.schema = $sch;
      $it.schemaPath = $schemaPath + it.util.getProperty($property);
      $it.errSchemaPath = $errSchemaPath + "/" + it.util.escapeFragment($property);
      out += "  " + it.validate($it) + " ";
      $it.baseId = $currentBaseId;
      out += " }  ";
      if ($breakOnError) {
        out += " if (" + $nextValid + ") { ";
        $closingBraces += "}";
      }
    }
  }
  if ($breakOnError) {
    out += "   " + $closingBraces + " if (" + $errs + " == errors) {";
  }
  return out;
};
var _enum = function generate_enum(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $isData = it.opts.$data && $schema2 && $schema2.$data;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
  }
  var $i = "i" + $lvl, $vSchema = "schema" + $lvl;
  if (!$isData) {
    out += " var " + $vSchema + " = validate.schema" + $schemaPath + ";";
  }
  out += "var " + $valid + ";";
  if ($isData) {
    out += " if (schema" + $lvl + " === undefined) " + $valid + " = true; else if (!Array.isArray(schema" + $lvl + ")) " + $valid + " = false; else {";
  }
  out += "" + $valid + " = false;for (var " + $i + "=0; " + $i + "<" + $vSchema + ".length; " + $i + "++) if (equal(" + $data + ", " + $vSchema + "[" + $i + "])) { " + $valid + " = true; break; }";
  if ($isData) {
    out += "  }  ";
  }
  out += " if (!" + $valid + ") {   ";
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = "";
  if (it.createErrors !== false) {
    out += " { keyword: 'enum' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { allowedValues: schema" + $lvl + " } ";
    if (it.opts.messages !== false) {
      out += " , message: 'should be equal to one of the allowed values' ";
    }
    if (it.opts.verbose) {
      out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError([" + __err + "]); ";
    } else {
      out += " validate.errors = [" + __err + "]; return false; ";
    }
  } else {
    out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  }
  out += " }";
  if ($breakOnError) {
    out += " else { ";
  }
  return out;
};
var format = function generate_format(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  if (it.opts.format === false) {
    if ($breakOnError) {
      out += " if (true) { ";
    }
    return out;
  }
  var $isData = it.opts.$data && $schema2 && $schema2.$data, $schemaValue;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
    $schemaValue = "schema" + $lvl;
  } else {
    $schemaValue = $schema2;
  }
  var $unknownFormats = it.opts.unknownFormats, $allowUnknown = Array.isArray($unknownFormats);
  if ($isData) {
    var $format = "format" + $lvl, $isObject = "isObject" + $lvl, $formatType = "formatType" + $lvl;
    out += " var " + $format + " = formats[" + $schemaValue + "]; var " + $isObject + " = typeof " + $format + " == 'object' && !(" + $format + " instanceof RegExp) && " + $format + ".validate; var " + $formatType + " = " + $isObject + " && " + $format + ".type || 'string'; if (" + $isObject + ") { ";
    if (it.async) {
      out += " var async" + $lvl + " = " + $format + ".async; ";
    }
    out += " " + $format + " = " + $format + ".validate; } if (  ";
    if ($isData) {
      out += " (" + $schemaValue + " !== undefined && typeof " + $schemaValue + " != 'string') || ";
    }
    out += " (";
    if ($unknownFormats != "ignore") {
      out += " (" + $schemaValue + " && !" + $format + " ";
      if ($allowUnknown) {
        out += " && self._opts.unknownFormats.indexOf(" + $schemaValue + ") == -1 ";
      }
      out += ") || ";
    }
    out += " (" + $format + " && " + $formatType + " == '" + $ruleType + "' && !(typeof " + $format + " == 'function' ? ";
    if (it.async) {
      out += " (async" + $lvl + " ? await " + $format + "(" + $data + ") : " + $format + "(" + $data + ")) ";
    } else {
      out += " " + $format + "(" + $data + ") ";
    }
    out += " : " + $format + ".test(" + $data + "))))) {";
  } else {
    var $format = it.formats[$schema2];
    if (!$format) {
      if ($unknownFormats == "ignore") {
        it.logger.warn('unknown format "' + $schema2 + '" ignored in schema at path "' + it.errSchemaPath + '"');
        if ($breakOnError) {
          out += " if (true) { ";
        }
        return out;
      } else if ($allowUnknown && $unknownFormats.indexOf($schema2) >= 0) {
        if ($breakOnError) {
          out += " if (true) { ";
        }
        return out;
      } else {
        throw new Error('unknown format "' + $schema2 + '" is used in schema at path "' + it.errSchemaPath + '"');
      }
    }
    var $isObject = typeof $format == "object" && !($format instanceof RegExp) && $format.validate;
    var $formatType = $isObject && $format.type || "string";
    if ($isObject) {
      var $async = $format.async === true;
      $format = $format.validate;
    }
    if ($formatType != $ruleType) {
      if ($breakOnError) {
        out += " if (true) { ";
      }
      return out;
    }
    if ($async) {
      if (!it.async)
        throw new Error("async format in sync schema");
      var $formatRef = "formats" + it.util.getProperty($schema2) + ".validate";
      out += " if (!(await " + $formatRef + "(" + $data + "))) { ";
    } else {
      out += " if (! ";
      var $formatRef = "formats" + it.util.getProperty($schema2);
      if ($isObject)
        $formatRef += ".validate";
      if (typeof $format == "function") {
        out += " " + $formatRef + "(" + $data + ") ";
      } else {
        out += " " + $formatRef + ".test(" + $data + ") ";
      }
      out += ") { ";
    }
  }
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = "";
  if (it.createErrors !== false) {
    out += " { keyword: 'format' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { format:  ";
    if ($isData) {
      out += "" + $schemaValue;
    } else {
      out += "" + it.util.toQuotedString($schema2);
    }
    out += "  } ";
    if (it.opts.messages !== false) {
      out += ` , message: 'should match format "`;
      if ($isData) {
        out += "' + " + $schemaValue + " + '";
      } else {
        out += "" + it.util.escapeQuotes($schema2);
      }
      out += `"' `;
    }
    if (it.opts.verbose) {
      out += " , schema:  ";
      if ($isData) {
        out += "validate.schema" + $schemaPath;
      } else {
        out += "" + it.util.toQuotedString($schema2);
      }
      out += "         , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError([" + __err + "]); ";
    } else {
      out += " validate.errors = [" + __err + "]; return false; ";
    }
  } else {
    out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  }
  out += " } ";
  if ($breakOnError) {
    out += " else { ";
  }
  return out;
};
var _if = function generate_if(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $errs = "errs__" + $lvl;
  var $it = it.util.copy(it);
  $it.level++;
  var $nextValid = "valid" + $it.level;
  var $thenSch = it.schema["then"], $elseSch = it.schema["else"], $thenPresent = $thenSch !== void 0 && (it.opts.strictKeywords ? typeof $thenSch == "object" && Object.keys($thenSch).length > 0 || $thenSch === false : it.util.schemaHasRules($thenSch, it.RULES.all)), $elsePresent = $elseSch !== void 0 && (it.opts.strictKeywords ? typeof $elseSch == "object" && Object.keys($elseSch).length > 0 || $elseSch === false : it.util.schemaHasRules($elseSch, it.RULES.all)), $currentBaseId = $it.baseId;
  if ($thenPresent || $elsePresent) {
    var $ifClause;
    $it.createErrors = false;
    $it.schema = $schema2;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += " var " + $errs + " = errors; var " + $valid + " = true;  ";
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    out += "  " + it.validate($it) + " ";
    $it.baseId = $currentBaseId;
    $it.createErrors = true;
    out += "  errors = " + $errs + "; if (vErrors !== null) { if (" + $errs + ") vErrors.length = " + $errs + "; else vErrors = null; }  ";
    it.compositeRule = $it.compositeRule = $wasComposite;
    if ($thenPresent) {
      out += " if (" + $nextValid + ") {  ";
      $it.schema = it.schema["then"];
      $it.schemaPath = it.schemaPath + ".then";
      $it.errSchemaPath = it.errSchemaPath + "/then";
      out += "  " + it.validate($it) + " ";
      $it.baseId = $currentBaseId;
      out += " " + $valid + " = " + $nextValid + "; ";
      if ($thenPresent && $elsePresent) {
        $ifClause = "ifClause" + $lvl;
        out += " var " + $ifClause + " = 'then'; ";
      } else {
        $ifClause = "'then'";
      }
      out += " } ";
      if ($elsePresent) {
        out += " else { ";
      }
    } else {
      out += " if (!" + $nextValid + ") { ";
    }
    if ($elsePresent) {
      $it.schema = it.schema["else"];
      $it.schemaPath = it.schemaPath + ".else";
      $it.errSchemaPath = it.errSchemaPath + "/else";
      out += "  " + it.validate($it) + " ";
      $it.baseId = $currentBaseId;
      out += " " + $valid + " = " + $nextValid + "; ";
      if ($thenPresent && $elsePresent) {
        $ifClause = "ifClause" + $lvl;
        out += " var " + $ifClause + " = 'else'; ";
      } else {
        $ifClause = "'else'";
      }
      out += " } ";
    }
    out += " if (!" + $valid + ") {   var err =   ";
    if (it.createErrors !== false) {
      out += " { keyword: 'if' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { failingKeyword: " + $ifClause + " } ";
      if (it.opts.messages !== false) {
        out += ` , message: 'should match "' + ` + $ifClause + ` + '" schema' `;
      }
      if (it.opts.verbose) {
        out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
      }
      out += " } ";
    } else {
      out += " {} ";
    }
    out += ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += " throw new ValidationError(vErrors); ";
      } else {
        out += " validate.errors = vErrors; return false; ";
      }
    }
    out += " }   ";
    if ($breakOnError) {
      out += " else { ";
    }
  } else {
    if ($breakOnError) {
      out += " if (true) { ";
    }
  }
  return out;
};
var items = function generate_items(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $errs = "errs__" + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = "";
  $it.level++;
  var $nextValid = "valid" + $it.level;
  var $idx = "i" + $lvl, $dataNxt = $it.dataLevel = it.dataLevel + 1, $nextData = "data" + $dataNxt, $currentBaseId = it.baseId;
  out += "var " + $errs + " = errors;var " + $valid + ";";
  if (Array.isArray($schema2)) {
    var $additionalItems = it.schema.additionalItems;
    if ($additionalItems === false) {
      out += " " + $valid + " = " + $data + ".length <= " + $schema2.length + "; ";
      var $currErrSchemaPath = $errSchemaPath;
      $errSchemaPath = it.errSchemaPath + "/additionalItems";
      out += "  if (!" + $valid + ") {   ";
      var $$outStack = $$outStack || [];
      $$outStack.push(out);
      out = "";
      if (it.createErrors !== false) {
        out += " { keyword: 'additionalItems' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { limit: " + $schema2.length + " } ";
        if (it.opts.messages !== false) {
          out += " , message: 'should NOT have more than " + $schema2.length + " items' ";
        }
        if (it.opts.verbose) {
          out += " , schema: false , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
        }
        out += " } ";
      } else {
        out += " {} ";
      }
      var __err = out;
      out = $$outStack.pop();
      if (!it.compositeRule && $breakOnError) {
        if (it.async) {
          out += " throw new ValidationError([" + __err + "]); ";
        } else {
          out += " validate.errors = [" + __err + "]; return false; ";
        }
      } else {
        out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
      }
      out += " } ";
      $errSchemaPath = $currErrSchemaPath;
      if ($breakOnError) {
        $closingBraces += "}";
        out += " else { ";
      }
    }
    var arr1 = $schema2;
    if (arr1) {
      var $sch, $i = -1, l1 = arr1.length - 1;
      while ($i < l1) {
        $sch = arr1[$i += 1];
        if (it.opts.strictKeywords ? typeof $sch == "object" && Object.keys($sch).length > 0 || $sch === false : it.util.schemaHasRules($sch, it.RULES.all)) {
          out += " " + $nextValid + " = true; if (" + $data + ".length > " + $i + ") { ";
          var $passData = $data + "[" + $i + "]";
          $it.schema = $sch;
          $it.schemaPath = $schemaPath + "[" + $i + "]";
          $it.errSchemaPath = $errSchemaPath + "/" + $i;
          $it.errorPath = it.util.getPathExpr(it.errorPath, $i, it.opts.jsonPointers, true);
          $it.dataPathArr[$dataNxt] = $i;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += " " + it.util.varReplace($code, $nextData, $passData) + " ";
          } else {
            out += " var " + $nextData + " = " + $passData + "; " + $code + " ";
          }
          out += " }  ";
          if ($breakOnError) {
            out += " if (" + $nextValid + ") { ";
            $closingBraces += "}";
          }
        }
      }
    }
    if (typeof $additionalItems == "object" && (it.opts.strictKeywords ? typeof $additionalItems == "object" && Object.keys($additionalItems).length > 0 || $additionalItems === false : it.util.schemaHasRules($additionalItems, it.RULES.all))) {
      $it.schema = $additionalItems;
      $it.schemaPath = it.schemaPath + ".additionalItems";
      $it.errSchemaPath = it.errSchemaPath + "/additionalItems";
      out += " " + $nextValid + " = true; if (" + $data + ".length > " + $schema2.length + ") {  for (var " + $idx + " = " + $schema2.length + "; " + $idx + " < " + $data + ".length; " + $idx + "++) { ";
      $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
      var $passData = $data + "[" + $idx + "]";
      $it.dataPathArr[$dataNxt] = $idx;
      var $code = it.validate($it);
      $it.baseId = $currentBaseId;
      if (it.util.varOccurences($code, $nextData) < 2) {
        out += " " + it.util.varReplace($code, $nextData, $passData) + " ";
      } else {
        out += " var " + $nextData + " = " + $passData + "; " + $code + " ";
      }
      if ($breakOnError) {
        out += " if (!" + $nextValid + ") break; ";
      }
      out += " } }  ";
      if ($breakOnError) {
        out += " if (" + $nextValid + ") { ";
        $closingBraces += "}";
      }
    }
  } else if (it.opts.strictKeywords ? typeof $schema2 == "object" && Object.keys($schema2).length > 0 || $schema2 === false : it.util.schemaHasRules($schema2, it.RULES.all)) {
    $it.schema = $schema2;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += "  for (var " + $idx + " = 0; " + $idx + " < " + $data + ".length; " + $idx + "++) { ";
    $it.errorPath = it.util.getPathExpr(it.errorPath, $idx, it.opts.jsonPointers, true);
    var $passData = $data + "[" + $idx + "]";
    $it.dataPathArr[$dataNxt] = $idx;
    var $code = it.validate($it);
    $it.baseId = $currentBaseId;
    if (it.util.varOccurences($code, $nextData) < 2) {
      out += " " + it.util.varReplace($code, $nextData, $passData) + " ";
    } else {
      out += " var " + $nextData + " = " + $passData + "; " + $code + " ";
    }
    if ($breakOnError) {
      out += " if (!" + $nextValid + ") break; ";
    }
    out += " }";
  }
  if ($breakOnError) {
    out += " " + $closingBraces + " if (" + $errs + " == errors) {";
  }
  return out;
};
var _limit = function generate__limit(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = "data" + ($dataLvl || "");
  var $isData = it.opts.$data && $schema2 && $schema2.$data, $schemaValue;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
    $schemaValue = "schema" + $lvl;
  } else {
    $schemaValue = $schema2;
  }
  var $isMax = $keyword == "maximum", $exclusiveKeyword = $isMax ? "exclusiveMaximum" : "exclusiveMinimum", $schemaExcl = it.schema[$exclusiveKeyword], $isDataExcl = it.opts.$data && $schemaExcl && $schemaExcl.$data, $op = $isMax ? "<" : ">", $notOp = $isMax ? ">" : "<", $errorKeyword = void 0;
  if (!($isData || typeof $schema2 == "number" || $schema2 === void 0)) {
    throw new Error($keyword + " must be number");
  }
  if (!($isDataExcl || $schemaExcl === void 0 || typeof $schemaExcl == "number" || typeof $schemaExcl == "boolean")) {
    throw new Error($exclusiveKeyword + " must be number or boolean");
  }
  if ($isDataExcl) {
    var $schemaValueExcl = it.util.getData($schemaExcl.$data, $dataLvl, it.dataPathArr), $exclusive = "exclusive" + $lvl, $exclType = "exclType" + $lvl, $exclIsNumber = "exclIsNumber" + $lvl, $opExpr = "op" + $lvl, $opStr = "' + " + $opExpr + " + '";
    out += " var schemaExcl" + $lvl + " = " + $schemaValueExcl + "; ";
    $schemaValueExcl = "schemaExcl" + $lvl;
    out += " var " + $exclusive + "; var " + $exclType + " = typeof " + $schemaValueExcl + "; if (" + $exclType + " != 'boolean' && " + $exclType + " != 'undefined' && " + $exclType + " != 'number') { ";
    var $errorKeyword = $exclusiveKeyword;
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = "";
    if (it.createErrors !== false) {
      out += " { keyword: '" + ($errorKeyword || "_exclusiveLimit") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: {} ";
      if (it.opts.messages !== false) {
        out += " , message: '" + $exclusiveKeyword + " should be boolean' ";
      }
      if (it.opts.verbose) {
        out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
      }
      out += " } ";
    } else {
      out += " {} ";
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += " throw new ValidationError([" + __err + "]); ";
      } else {
        out += " validate.errors = [" + __err + "]; return false; ";
      }
    } else {
      out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
    }
    out += " } else if ( ";
    if ($isData) {
      out += " (" + $schemaValue + " !== undefined && typeof " + $schemaValue + " != 'number') || ";
    }
    out += " " + $exclType + " == 'number' ? ( (" + $exclusive + " = " + $schemaValue + " === undefined || " + $schemaValueExcl + " " + $op + "= " + $schemaValue + ") ? " + $data + " " + $notOp + "= " + $schemaValueExcl + " : " + $data + " " + $notOp + " " + $schemaValue + " ) : ( (" + $exclusive + " = " + $schemaValueExcl + " === true) ? " + $data + " " + $notOp + "= " + $schemaValue + " : " + $data + " " + $notOp + " " + $schemaValue + " ) || " + $data + " !== " + $data + ") { var op" + $lvl + " = " + $exclusive + " ? '" + $op + "' : '" + $op + "='; ";
    if ($schema2 === void 0) {
      $errorKeyword = $exclusiveKeyword;
      $errSchemaPath = it.errSchemaPath + "/" + $exclusiveKeyword;
      $schemaValue = $schemaValueExcl;
      $isData = $isDataExcl;
    }
  } else {
    var $exclIsNumber = typeof $schemaExcl == "number", $opStr = $op;
    if ($exclIsNumber && $isData) {
      var $opExpr = "'" + $opStr + "'";
      out += " if ( ";
      if ($isData) {
        out += " (" + $schemaValue + " !== undefined && typeof " + $schemaValue + " != 'number') || ";
      }
      out += " ( " + $schemaValue + " === undefined || " + $schemaExcl + " " + $op + "= " + $schemaValue + " ? " + $data + " " + $notOp + "= " + $schemaExcl + " : " + $data + " " + $notOp + " " + $schemaValue + " ) || " + $data + " !== " + $data + ") { ";
    } else {
      if ($exclIsNumber && $schema2 === void 0) {
        $exclusive = true;
        $errorKeyword = $exclusiveKeyword;
        $errSchemaPath = it.errSchemaPath + "/" + $exclusiveKeyword;
        $schemaValue = $schemaExcl;
        $notOp += "=";
      } else {
        if ($exclIsNumber)
          $schemaValue = Math[$isMax ? "min" : "max"]($schemaExcl, $schema2);
        if ($schemaExcl === ($exclIsNumber ? $schemaValue : true)) {
          $exclusive = true;
          $errorKeyword = $exclusiveKeyword;
          $errSchemaPath = it.errSchemaPath + "/" + $exclusiveKeyword;
          $notOp += "=";
        } else {
          $exclusive = false;
          $opStr += "=";
        }
      }
      var $opExpr = "'" + $opStr + "'";
      out += " if ( ";
      if ($isData) {
        out += " (" + $schemaValue + " !== undefined && typeof " + $schemaValue + " != 'number') || ";
      }
      out += " " + $data + " " + $notOp + " " + $schemaValue + " || " + $data + " !== " + $data + ") { ";
    }
  }
  $errorKeyword = $errorKeyword || $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = "";
  if (it.createErrors !== false) {
    out += " { keyword: '" + ($errorKeyword || "_limit") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { comparison: " + $opExpr + ", limit: " + $schemaValue + ", exclusive: " + $exclusive + " } ";
    if (it.opts.messages !== false) {
      out += " , message: 'should be " + $opStr + " ";
      if ($isData) {
        out += "' + " + $schemaValue;
      } else {
        out += "" + $schemaValue + "'";
      }
    }
    if (it.opts.verbose) {
      out += " , schema:  ";
      if ($isData) {
        out += "validate.schema" + $schemaPath;
      } else {
        out += "" + $schema2;
      }
      out += "         , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError([" + __err + "]); ";
    } else {
      out += " validate.errors = [" + __err + "]; return false; ";
    }
  } else {
    out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  }
  out += " } ";
  if ($breakOnError) {
    out += " else { ";
  }
  return out;
};
var _limitItems = function generate__limitItems(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = "data" + ($dataLvl || "");
  var $isData = it.opts.$data && $schema2 && $schema2.$data, $schemaValue;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
    $schemaValue = "schema" + $lvl;
  } else {
    $schemaValue = $schema2;
  }
  if (!($isData || typeof $schema2 == "number")) {
    throw new Error($keyword + " must be number");
  }
  var $op = $keyword == "maxItems" ? ">" : "<";
  out += "if ( ";
  if ($isData) {
    out += " (" + $schemaValue + " !== undefined && typeof " + $schemaValue + " != 'number') || ";
  }
  out += " " + $data + ".length " + $op + " " + $schemaValue + ") { ";
  var $errorKeyword = $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = "";
  if (it.createErrors !== false) {
    out += " { keyword: '" + ($errorKeyword || "_limitItems") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { limit: " + $schemaValue + " } ";
    if (it.opts.messages !== false) {
      out += " , message: 'should NOT have ";
      if ($keyword == "maxItems") {
        out += "more";
      } else {
        out += "fewer";
      }
      out += " than ";
      if ($isData) {
        out += "' + " + $schemaValue + " + '";
      } else {
        out += "" + $schema2;
      }
      out += " items' ";
    }
    if (it.opts.verbose) {
      out += " , schema:  ";
      if ($isData) {
        out += "validate.schema" + $schemaPath;
      } else {
        out += "" + $schema2;
      }
      out += "         , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError([" + __err + "]); ";
    } else {
      out += " validate.errors = [" + __err + "]; return false; ";
    }
  } else {
    out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  }
  out += "} ";
  if ($breakOnError) {
    out += " else { ";
  }
  return out;
};
var _limitLength = function generate__limitLength(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = "data" + ($dataLvl || "");
  var $isData = it.opts.$data && $schema2 && $schema2.$data, $schemaValue;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
    $schemaValue = "schema" + $lvl;
  } else {
    $schemaValue = $schema2;
  }
  if (!($isData || typeof $schema2 == "number")) {
    throw new Error($keyword + " must be number");
  }
  var $op = $keyword == "maxLength" ? ">" : "<";
  out += "if ( ";
  if ($isData) {
    out += " (" + $schemaValue + " !== undefined && typeof " + $schemaValue + " != 'number') || ";
  }
  if (it.opts.unicode === false) {
    out += " " + $data + ".length ";
  } else {
    out += " ucs2length(" + $data + ") ";
  }
  out += " " + $op + " " + $schemaValue + ") { ";
  var $errorKeyword = $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = "";
  if (it.createErrors !== false) {
    out += " { keyword: '" + ($errorKeyword || "_limitLength") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { limit: " + $schemaValue + " } ";
    if (it.opts.messages !== false) {
      out += " , message: 'should NOT be ";
      if ($keyword == "maxLength") {
        out += "longer";
      } else {
        out += "shorter";
      }
      out += " than ";
      if ($isData) {
        out += "' + " + $schemaValue + " + '";
      } else {
        out += "" + $schema2;
      }
      out += " characters' ";
    }
    if (it.opts.verbose) {
      out += " , schema:  ";
      if ($isData) {
        out += "validate.schema" + $schemaPath;
      } else {
        out += "" + $schema2;
      }
      out += "         , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError([" + __err + "]); ";
    } else {
      out += " validate.errors = [" + __err + "]; return false; ";
    }
  } else {
    out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  }
  out += "} ";
  if ($breakOnError) {
    out += " else { ";
  }
  return out;
};
var _limitProperties = function generate__limitProperties(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = "data" + ($dataLvl || "");
  var $isData = it.opts.$data && $schema2 && $schema2.$data, $schemaValue;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
    $schemaValue = "schema" + $lvl;
  } else {
    $schemaValue = $schema2;
  }
  if (!($isData || typeof $schema2 == "number")) {
    throw new Error($keyword + " must be number");
  }
  var $op = $keyword == "maxProperties" ? ">" : "<";
  out += "if ( ";
  if ($isData) {
    out += " (" + $schemaValue + " !== undefined && typeof " + $schemaValue + " != 'number') || ";
  }
  out += " Object.keys(" + $data + ").length " + $op + " " + $schemaValue + ") { ";
  var $errorKeyword = $keyword;
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = "";
  if (it.createErrors !== false) {
    out += " { keyword: '" + ($errorKeyword || "_limitProperties") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { limit: " + $schemaValue + " } ";
    if (it.opts.messages !== false) {
      out += " , message: 'should NOT have ";
      if ($keyword == "maxProperties") {
        out += "more";
      } else {
        out += "fewer";
      }
      out += " than ";
      if ($isData) {
        out += "' + " + $schemaValue + " + '";
      } else {
        out += "" + $schema2;
      }
      out += " properties' ";
    }
    if (it.opts.verbose) {
      out += " , schema:  ";
      if ($isData) {
        out += "validate.schema" + $schemaPath;
      } else {
        out += "" + $schema2;
      }
      out += "         , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError([" + __err + "]); ";
    } else {
      out += " validate.errors = [" + __err + "]; return false; ";
    }
  } else {
    out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  }
  out += "} ";
  if ($breakOnError) {
    out += " else { ";
  }
  return out;
};
var multipleOf = function generate_multipleOf(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $isData = it.opts.$data && $schema2 && $schema2.$data, $schemaValue;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
    $schemaValue = "schema" + $lvl;
  } else {
    $schemaValue = $schema2;
  }
  if (!($isData || typeof $schema2 == "number")) {
    throw new Error($keyword + " must be number");
  }
  out += "var division" + $lvl + ";if (";
  if ($isData) {
    out += " " + $schemaValue + " !== undefined && ( typeof " + $schemaValue + " != 'number' || ";
  }
  out += " (division" + $lvl + " = " + $data + " / " + $schemaValue + ", ";
  if (it.opts.multipleOfPrecision) {
    out += " Math.abs(Math.round(division" + $lvl + ") - division" + $lvl + ") > 1e-" + it.opts.multipleOfPrecision + " ";
  } else {
    out += " division" + $lvl + " !== parseInt(division" + $lvl + ") ";
  }
  out += " ) ";
  if ($isData) {
    out += "  )  ";
  }
  out += " ) {   ";
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = "";
  if (it.createErrors !== false) {
    out += " { keyword: 'multipleOf' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { multipleOf: " + $schemaValue + " } ";
    if (it.opts.messages !== false) {
      out += " , message: 'should be multiple of ";
      if ($isData) {
        out += "' + " + $schemaValue;
      } else {
        out += "" + $schemaValue + "'";
      }
    }
    if (it.opts.verbose) {
      out += " , schema:  ";
      if ($isData) {
        out += "validate.schema" + $schemaPath;
      } else {
        out += "" + $schema2;
      }
      out += "         , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError([" + __err + "]); ";
    } else {
      out += " validate.errors = [" + __err + "]; return false; ";
    }
  } else {
    out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  }
  out += "} ";
  if ($breakOnError) {
    out += " else { ";
  }
  return out;
};
var not = function generate_not(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $errs = "errs__" + $lvl;
  var $it = it.util.copy(it);
  $it.level++;
  var $nextValid = "valid" + $it.level;
  if (it.opts.strictKeywords ? typeof $schema2 == "object" && Object.keys($schema2).length > 0 || $schema2 === false : it.util.schemaHasRules($schema2, it.RULES.all)) {
    $it.schema = $schema2;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    out += " var " + $errs + " = errors;  ";
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    $it.createErrors = false;
    var $allErrorsOption;
    if ($it.opts.allErrors) {
      $allErrorsOption = $it.opts.allErrors;
      $it.opts.allErrors = false;
    }
    out += " " + it.validate($it) + " ";
    $it.createErrors = true;
    if ($allErrorsOption)
      $it.opts.allErrors = $allErrorsOption;
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += " if (" + $nextValid + ") {   ";
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = "";
    if (it.createErrors !== false) {
      out += " { keyword: 'not' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: {} ";
      if (it.opts.messages !== false) {
        out += " , message: 'should NOT be valid' ";
      }
      if (it.opts.verbose) {
        out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
      }
      out += " } ";
    } else {
      out += " {} ";
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += " throw new ValidationError([" + __err + "]); ";
      } else {
        out += " validate.errors = [" + __err + "]; return false; ";
      }
    } else {
      out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
    }
    out += " } else {  errors = " + $errs + "; if (vErrors !== null) { if (" + $errs + ") vErrors.length = " + $errs + "; else vErrors = null; } ";
    if (it.opts.allErrors) {
      out += " } ";
    }
  } else {
    out += "  var err =   ";
    if (it.createErrors !== false) {
      out += " { keyword: 'not' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: {} ";
      if (it.opts.messages !== false) {
        out += " , message: 'should NOT be valid' ";
      }
      if (it.opts.verbose) {
        out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
      }
      out += " } ";
    } else {
      out += " {} ";
    }
    out += ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
    if ($breakOnError) {
      out += " if (false) { ";
    }
  }
  return out;
};
var oneOf = function generate_oneOf(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $errs = "errs__" + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = "";
  $it.level++;
  var $nextValid = "valid" + $it.level;
  var $currentBaseId = $it.baseId, $prevValid = "prevValid" + $lvl, $passingSchemas = "passingSchemas" + $lvl;
  out += "var " + $errs + " = errors , " + $prevValid + " = false , " + $valid + " = false , " + $passingSchemas + " = null; ";
  var $wasComposite = it.compositeRule;
  it.compositeRule = $it.compositeRule = true;
  var arr1 = $schema2;
  if (arr1) {
    var $sch, $i = -1, l1 = arr1.length - 1;
    while ($i < l1) {
      $sch = arr1[$i += 1];
      if (it.opts.strictKeywords ? typeof $sch == "object" && Object.keys($sch).length > 0 || $sch === false : it.util.schemaHasRules($sch, it.RULES.all)) {
        $it.schema = $sch;
        $it.schemaPath = $schemaPath + "[" + $i + "]";
        $it.errSchemaPath = $errSchemaPath + "/" + $i;
        out += "  " + it.validate($it) + " ";
        $it.baseId = $currentBaseId;
      } else {
        out += " var " + $nextValid + " = true; ";
      }
      if ($i) {
        out += " if (" + $nextValid + " && " + $prevValid + ") { " + $valid + " = false; " + $passingSchemas + " = [" + $passingSchemas + ", " + $i + "]; } else { ";
        $closingBraces += "}";
      }
      out += " if (" + $nextValid + ") { " + $valid + " = " + $prevValid + " = true; " + $passingSchemas + " = " + $i + "; }";
    }
  }
  it.compositeRule = $it.compositeRule = $wasComposite;
  out += "" + $closingBraces + "if (!" + $valid + ") {   var err =   ";
  if (it.createErrors !== false) {
    out += " { keyword: 'oneOf' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { passingSchemas: " + $passingSchemas + " } ";
    if (it.opts.messages !== false) {
      out += " , message: 'should match exactly one schema in oneOf' ";
    }
    if (it.opts.verbose) {
      out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  out += ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError(vErrors); ";
    } else {
      out += " validate.errors = vErrors; return false; ";
    }
  }
  out += "} else {  errors = " + $errs + "; if (vErrors !== null) { if (" + $errs + ") vErrors.length = " + $errs + "; else vErrors = null; }";
  if (it.opts.allErrors) {
    out += " } ";
  }
  return out;
};
var pattern = function generate_pattern(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $isData = it.opts.$data && $schema2 && $schema2.$data, $schemaValue;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
    $schemaValue = "schema" + $lvl;
  } else {
    $schemaValue = $schema2;
  }
  var $regexp = $isData ? "(new RegExp(" + $schemaValue + "))" : it.usePattern($schema2);
  out += "if ( ";
  if ($isData) {
    out += " (" + $schemaValue + " !== undefined && typeof " + $schemaValue + " != 'string') || ";
  }
  out += " !" + $regexp + ".test(" + $data + ") ) {   ";
  var $$outStack = $$outStack || [];
  $$outStack.push(out);
  out = "";
  if (it.createErrors !== false) {
    out += " { keyword: 'pattern' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { pattern:  ";
    if ($isData) {
      out += "" + $schemaValue;
    } else {
      out += "" + it.util.toQuotedString($schema2);
    }
    out += "  } ";
    if (it.opts.messages !== false) {
      out += ` , message: 'should match pattern "`;
      if ($isData) {
        out += "' + " + $schemaValue + " + '";
      } else {
        out += "" + it.util.escapeQuotes($schema2);
      }
      out += `"' `;
    }
    if (it.opts.verbose) {
      out += " , schema:  ";
      if ($isData) {
        out += "validate.schema" + $schemaPath;
      } else {
        out += "" + it.util.toQuotedString($schema2);
      }
      out += "         , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
    }
    out += " } ";
  } else {
    out += " {} ";
  }
  var __err = out;
  out = $$outStack.pop();
  if (!it.compositeRule && $breakOnError) {
    if (it.async) {
      out += " throw new ValidationError([" + __err + "]); ";
    } else {
      out += " validate.errors = [" + __err + "]; return false; ";
    }
  } else {
    out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
  }
  out += "} ";
  if ($breakOnError) {
    out += " else { ";
  }
  return out;
};
var properties$2 = function generate_properties(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $errs = "errs__" + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = "";
  $it.level++;
  var $nextValid = "valid" + $it.level;
  var $key = "key" + $lvl, $idx = "idx" + $lvl, $dataNxt = $it.dataLevel = it.dataLevel + 1, $nextData = "data" + $dataNxt, $dataProperties = "dataProperties" + $lvl;
  var $schemaKeys = Object.keys($schema2 || {}).filter(notProto), $pProperties = it.schema.patternProperties || {}, $pPropertyKeys = Object.keys($pProperties).filter(notProto), $aProperties = it.schema.additionalProperties, $someProperties = $schemaKeys.length || $pPropertyKeys.length, $noAdditional = $aProperties === false, $additionalIsSchema = typeof $aProperties == "object" && Object.keys($aProperties).length, $removeAdditional = it.opts.removeAdditional, $checkAdditional = $noAdditional || $additionalIsSchema || $removeAdditional, $ownProperties = it.opts.ownProperties, $currentBaseId = it.baseId;
  var $required = it.schema.required;
  if ($required && !(it.opts.$data && $required.$data) && $required.length < it.opts.loopRequired) {
    var $requiredHash = it.util.toHash($required);
  }
  function notProto(p) {
    return p !== "__proto__";
  }
  out += "var " + $errs + " = errors;var " + $nextValid + " = true;";
  if ($ownProperties) {
    out += " var " + $dataProperties + " = undefined;";
  }
  if ($checkAdditional) {
    if ($ownProperties) {
      out += " " + $dataProperties + " = " + $dataProperties + " || Object.keys(" + $data + "); for (var " + $idx + "=0; " + $idx + "<" + $dataProperties + ".length; " + $idx + "++) { var " + $key + " = " + $dataProperties + "[" + $idx + "]; ";
    } else {
      out += " for (var " + $key + " in " + $data + ") { ";
    }
    if ($someProperties) {
      out += " var isAdditional" + $lvl + " = !(false ";
      if ($schemaKeys.length) {
        if ($schemaKeys.length > 8) {
          out += " || validate.schema" + $schemaPath + ".hasOwnProperty(" + $key + ") ";
        } else {
          var arr1 = $schemaKeys;
          if (arr1) {
            var $propertyKey, i1 = -1, l1 = arr1.length - 1;
            while (i1 < l1) {
              $propertyKey = arr1[i1 += 1];
              out += " || " + $key + " == " + it.util.toQuotedString($propertyKey) + " ";
            }
          }
        }
      }
      if ($pPropertyKeys.length) {
        var arr2 = $pPropertyKeys;
        if (arr2) {
          var $pProperty, $i = -1, l2 = arr2.length - 1;
          while ($i < l2) {
            $pProperty = arr2[$i += 1];
            out += " || " + it.usePattern($pProperty) + ".test(" + $key + ") ";
          }
        }
      }
      out += " ); if (isAdditional" + $lvl + ") { ";
    }
    if ($removeAdditional == "all") {
      out += " delete " + $data + "[" + $key + "]; ";
    } else {
      var $currentErrorPath = it.errorPath;
      var $additionalProperty = "' + " + $key + " + '";
      if (it.opts._errorDataPathProperty) {
        it.errorPath = it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
      }
      if ($noAdditional) {
        if ($removeAdditional) {
          out += " delete " + $data + "[" + $key + "]; ";
        } else {
          out += " " + $nextValid + " = false; ";
          var $currErrSchemaPath = $errSchemaPath;
          $errSchemaPath = it.errSchemaPath + "/additionalProperties";
          var $$outStack = $$outStack || [];
          $$outStack.push(out);
          out = "";
          if (it.createErrors !== false) {
            out += " { keyword: 'additionalProperties' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { additionalProperty: '" + $additionalProperty + "' } ";
            if (it.opts.messages !== false) {
              out += " , message: '";
              if (it.opts._errorDataPathProperty) {
                out += "is an invalid additional property";
              } else {
                out += "should NOT have additional properties";
              }
              out += "' ";
            }
            if (it.opts.verbose) {
              out += " , schema: false , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
            }
            out += " } ";
          } else {
            out += " {} ";
          }
          var __err = out;
          out = $$outStack.pop();
          if (!it.compositeRule && $breakOnError) {
            if (it.async) {
              out += " throw new ValidationError([" + __err + "]); ";
            } else {
              out += " validate.errors = [" + __err + "]; return false; ";
            }
          } else {
            out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
          }
          $errSchemaPath = $currErrSchemaPath;
          if ($breakOnError) {
            out += " break; ";
          }
        }
      } else if ($additionalIsSchema) {
        if ($removeAdditional == "failing") {
          out += " var " + $errs + " = errors;  ";
          var $wasComposite = it.compositeRule;
          it.compositeRule = $it.compositeRule = true;
          $it.schema = $aProperties;
          $it.schemaPath = it.schemaPath + ".additionalProperties";
          $it.errSchemaPath = it.errSchemaPath + "/additionalProperties";
          $it.errorPath = it.opts._errorDataPathProperty ? it.errorPath : it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
          var $passData = $data + "[" + $key + "]";
          $it.dataPathArr[$dataNxt] = $key;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += " " + it.util.varReplace($code, $nextData, $passData) + " ";
          } else {
            out += " var " + $nextData + " = " + $passData + "; " + $code + " ";
          }
          out += " if (!" + $nextValid + ") { errors = " + $errs + "; if (validate.errors !== null) { if (errors) validate.errors.length = errors; else validate.errors = null; } delete " + $data + "[" + $key + "]; }  ";
          it.compositeRule = $it.compositeRule = $wasComposite;
        } else {
          $it.schema = $aProperties;
          $it.schemaPath = it.schemaPath + ".additionalProperties";
          $it.errSchemaPath = it.errSchemaPath + "/additionalProperties";
          $it.errorPath = it.opts._errorDataPathProperty ? it.errorPath : it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
          var $passData = $data + "[" + $key + "]";
          $it.dataPathArr[$dataNxt] = $key;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += " " + it.util.varReplace($code, $nextData, $passData) + " ";
          } else {
            out += " var " + $nextData + " = " + $passData + "; " + $code + " ";
          }
          if ($breakOnError) {
            out += " if (!" + $nextValid + ") break; ";
          }
        }
      }
      it.errorPath = $currentErrorPath;
    }
    if ($someProperties) {
      out += " } ";
    }
    out += " }  ";
    if ($breakOnError) {
      out += " if (" + $nextValid + ") { ";
      $closingBraces += "}";
    }
  }
  var $useDefaults = it.opts.useDefaults && !it.compositeRule;
  if ($schemaKeys.length) {
    var arr3 = $schemaKeys;
    if (arr3) {
      var $propertyKey, i3 = -1, l3 = arr3.length - 1;
      while (i3 < l3) {
        $propertyKey = arr3[i3 += 1];
        var $sch = $schema2[$propertyKey];
        if (it.opts.strictKeywords ? typeof $sch == "object" && Object.keys($sch).length > 0 || $sch === false : it.util.schemaHasRules($sch, it.RULES.all)) {
          var $prop = it.util.getProperty($propertyKey), $passData = $data + $prop, $hasDefault = $useDefaults && $sch.default !== void 0;
          $it.schema = $sch;
          $it.schemaPath = $schemaPath + $prop;
          $it.errSchemaPath = $errSchemaPath + "/" + it.util.escapeFragment($propertyKey);
          $it.errorPath = it.util.getPath(it.errorPath, $propertyKey, it.opts.jsonPointers);
          $it.dataPathArr[$dataNxt] = it.util.toQuotedString($propertyKey);
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            $code = it.util.varReplace($code, $nextData, $passData);
            var $useData = $passData;
          } else {
            var $useData = $nextData;
            out += " var " + $nextData + " = " + $passData + "; ";
          }
          if ($hasDefault) {
            out += " " + $code + " ";
          } else {
            if ($requiredHash && $requiredHash[$propertyKey]) {
              out += " if ( " + $useData + " === undefined ";
              if ($ownProperties) {
                out += " || ! Object.prototype.hasOwnProperty.call(" + $data + ", '" + it.util.escapeQuotes($propertyKey) + "') ";
              }
              out += ") { " + $nextValid + " = false; ";
              var $currentErrorPath = it.errorPath, $currErrSchemaPath = $errSchemaPath, $missingProperty = it.util.escapeQuotes($propertyKey);
              if (it.opts._errorDataPathProperty) {
                it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
              }
              $errSchemaPath = it.errSchemaPath + "/required";
              var $$outStack = $$outStack || [];
              $$outStack.push(out);
              out = "";
              if (it.createErrors !== false) {
                out += " { keyword: 'required' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { missingProperty: '" + $missingProperty + "' } ";
                if (it.opts.messages !== false) {
                  out += " , message: '";
                  if (it.opts._errorDataPathProperty) {
                    out += "is a required property";
                  } else {
                    out += "should have required property \\'" + $missingProperty + "\\'";
                  }
                  out += "' ";
                }
                if (it.opts.verbose) {
                  out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
                }
                out += " } ";
              } else {
                out += " {} ";
              }
              var __err = out;
              out = $$outStack.pop();
              if (!it.compositeRule && $breakOnError) {
                if (it.async) {
                  out += " throw new ValidationError([" + __err + "]); ";
                } else {
                  out += " validate.errors = [" + __err + "]; return false; ";
                }
              } else {
                out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
              }
              $errSchemaPath = $currErrSchemaPath;
              it.errorPath = $currentErrorPath;
              out += " } else { ";
            } else {
              if ($breakOnError) {
                out += " if ( " + $useData + " === undefined ";
                if ($ownProperties) {
                  out += " || ! Object.prototype.hasOwnProperty.call(" + $data + ", '" + it.util.escapeQuotes($propertyKey) + "') ";
                }
                out += ") { " + $nextValid + " = true; } else { ";
              } else {
                out += " if (" + $useData + " !== undefined ";
                if ($ownProperties) {
                  out += " &&   Object.prototype.hasOwnProperty.call(" + $data + ", '" + it.util.escapeQuotes($propertyKey) + "') ";
                }
                out += " ) { ";
              }
            }
            out += " " + $code + " } ";
          }
        }
        if ($breakOnError) {
          out += " if (" + $nextValid + ") { ";
          $closingBraces += "}";
        }
      }
    }
  }
  if ($pPropertyKeys.length) {
    var arr4 = $pPropertyKeys;
    if (arr4) {
      var $pProperty, i4 = -1, l4 = arr4.length - 1;
      while (i4 < l4) {
        $pProperty = arr4[i4 += 1];
        var $sch = $pProperties[$pProperty];
        if (it.opts.strictKeywords ? typeof $sch == "object" && Object.keys($sch).length > 0 || $sch === false : it.util.schemaHasRules($sch, it.RULES.all)) {
          $it.schema = $sch;
          $it.schemaPath = it.schemaPath + ".patternProperties" + it.util.getProperty($pProperty);
          $it.errSchemaPath = it.errSchemaPath + "/patternProperties/" + it.util.escapeFragment($pProperty);
          if ($ownProperties) {
            out += " " + $dataProperties + " = " + $dataProperties + " || Object.keys(" + $data + "); for (var " + $idx + "=0; " + $idx + "<" + $dataProperties + ".length; " + $idx + "++) { var " + $key + " = " + $dataProperties + "[" + $idx + "]; ";
          } else {
            out += " for (var " + $key + " in " + $data + ") { ";
          }
          out += " if (" + it.usePattern($pProperty) + ".test(" + $key + ")) { ";
          $it.errorPath = it.util.getPathExpr(it.errorPath, $key, it.opts.jsonPointers);
          var $passData = $data + "[" + $key + "]";
          $it.dataPathArr[$dataNxt] = $key;
          var $code = it.validate($it);
          $it.baseId = $currentBaseId;
          if (it.util.varOccurences($code, $nextData) < 2) {
            out += " " + it.util.varReplace($code, $nextData, $passData) + " ";
          } else {
            out += " var " + $nextData + " = " + $passData + "; " + $code + " ";
          }
          if ($breakOnError) {
            out += " if (!" + $nextValid + ") break; ";
          }
          out += " } ";
          if ($breakOnError) {
            out += " else " + $nextValid + " = true; ";
          }
          out += " }  ";
          if ($breakOnError) {
            out += " if (" + $nextValid + ") { ";
            $closingBraces += "}";
          }
        }
      }
    }
  }
  if ($breakOnError) {
    out += " " + $closingBraces + " if (" + $errs + " == errors) {";
  }
  return out;
};
var propertyNames = function generate_propertyNames(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $errs = "errs__" + $lvl;
  var $it = it.util.copy(it);
  var $closingBraces = "";
  $it.level++;
  var $nextValid = "valid" + $it.level;
  out += "var " + $errs + " = errors;";
  if (it.opts.strictKeywords ? typeof $schema2 == "object" && Object.keys($schema2).length > 0 || $schema2 === false : it.util.schemaHasRules($schema2, it.RULES.all)) {
    $it.schema = $schema2;
    $it.schemaPath = $schemaPath;
    $it.errSchemaPath = $errSchemaPath;
    var $key = "key" + $lvl, $idx = "idx" + $lvl, $i = "i" + $lvl, $invalidName = "' + " + $key + " + '", $dataNxt = $it.dataLevel = it.dataLevel + 1, $nextData = "data" + $dataNxt, $dataProperties = "dataProperties" + $lvl, $ownProperties = it.opts.ownProperties, $currentBaseId = it.baseId;
    if ($ownProperties) {
      out += " var " + $dataProperties + " = undefined; ";
    }
    if ($ownProperties) {
      out += " " + $dataProperties + " = " + $dataProperties + " || Object.keys(" + $data + "); for (var " + $idx + "=0; " + $idx + "<" + $dataProperties + ".length; " + $idx + "++) { var " + $key + " = " + $dataProperties + "[" + $idx + "]; ";
    } else {
      out += " for (var " + $key + " in " + $data + ") { ";
    }
    out += " var startErrs" + $lvl + " = errors; ";
    var $passData = $key;
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var $code = it.validate($it);
    $it.baseId = $currentBaseId;
    if (it.util.varOccurences($code, $nextData) < 2) {
      out += " " + it.util.varReplace($code, $nextData, $passData) + " ";
    } else {
      out += " var " + $nextData + " = " + $passData + "; " + $code + " ";
    }
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += " if (!" + $nextValid + ") { for (var " + $i + "=startErrs" + $lvl + "; " + $i + "<errors; " + $i + "++) { vErrors[" + $i + "].propertyName = " + $key + "; }   var err =   ";
    if (it.createErrors !== false) {
      out += " { keyword: 'propertyNames' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { propertyName: '" + $invalidName + "' } ";
      if (it.opts.messages !== false) {
        out += " , message: 'property name \\'" + $invalidName + "\\' is invalid' ";
      }
      if (it.opts.verbose) {
        out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
      }
      out += " } ";
    } else {
      out += " {} ";
    }
    out += ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += " throw new ValidationError(vErrors); ";
      } else {
        out += " validate.errors = vErrors; return false; ";
      }
    }
    if ($breakOnError) {
      out += " break; ";
    }
    out += " } }";
  }
  if ($breakOnError) {
    out += " " + $closingBraces + " if (" + $errs + " == errors) {";
  }
  return out;
};
var required$1 = function generate_required(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $isData = it.opts.$data && $schema2 && $schema2.$data;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
  }
  var $vSchema = "schema" + $lvl;
  if (!$isData) {
    if ($schema2.length < it.opts.loopRequired && it.schema.properties && Object.keys(it.schema.properties).length) {
      var $required = [];
      var arr1 = $schema2;
      if (arr1) {
        var $property, i1 = -1, l1 = arr1.length - 1;
        while (i1 < l1) {
          $property = arr1[i1 += 1];
          var $propertySch = it.schema.properties[$property];
          if (!($propertySch && (it.opts.strictKeywords ? typeof $propertySch == "object" && Object.keys($propertySch).length > 0 || $propertySch === false : it.util.schemaHasRules($propertySch, it.RULES.all)))) {
            $required[$required.length] = $property;
          }
        }
      }
    } else {
      var $required = $schema2;
    }
  }
  if ($isData || $required.length) {
    var $currentErrorPath = it.errorPath, $loopRequired = $isData || $required.length >= it.opts.loopRequired, $ownProperties = it.opts.ownProperties;
    if ($breakOnError) {
      out += " var missing" + $lvl + "; ";
      if ($loopRequired) {
        if (!$isData) {
          out += " var " + $vSchema + " = validate.schema" + $schemaPath + "; ";
        }
        var $i = "i" + $lvl, $propertyPath = "schema" + $lvl + "[" + $i + "]", $missingProperty = "' + " + $propertyPath + " + '";
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers);
        }
        out += " var " + $valid + " = true; ";
        if ($isData) {
          out += " if (schema" + $lvl + " === undefined) " + $valid + " = true; else if (!Array.isArray(schema" + $lvl + ")) " + $valid + " = false; else {";
        }
        out += " for (var " + $i + " = 0; " + $i + " < " + $vSchema + ".length; " + $i + "++) { " + $valid + " = " + $data + "[" + $vSchema + "[" + $i + "]] !== undefined ";
        if ($ownProperties) {
          out += " &&   Object.prototype.hasOwnProperty.call(" + $data + ", " + $vSchema + "[" + $i + "]) ";
        }
        out += "; if (!" + $valid + ") break; } ";
        if ($isData) {
          out += "  }  ";
        }
        out += "  if (!" + $valid + ") {   ";
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = "";
        if (it.createErrors !== false) {
          out += " { keyword: 'required' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { missingProperty: '" + $missingProperty + "' } ";
          if (it.opts.messages !== false) {
            out += " , message: '";
            if (it.opts._errorDataPathProperty) {
              out += "is a required property";
            } else {
              out += "should have required property \\'" + $missingProperty + "\\'";
            }
            out += "' ";
          }
          if (it.opts.verbose) {
            out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
          }
          out += " } ";
        } else {
          out += " {} ";
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          if (it.async) {
            out += " throw new ValidationError([" + __err + "]); ";
          } else {
            out += " validate.errors = [" + __err + "]; return false; ";
          }
        } else {
          out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
        }
        out += " } else { ";
      } else {
        out += " if ( ";
        var arr2 = $required;
        if (arr2) {
          var $propertyKey, $i = -1, l2 = arr2.length - 1;
          while ($i < l2) {
            $propertyKey = arr2[$i += 1];
            if ($i) {
              out += " || ";
            }
            var $prop = it.util.getProperty($propertyKey), $useData = $data + $prop;
            out += " ( ( " + $useData + " === undefined ";
            if ($ownProperties) {
              out += " || ! Object.prototype.hasOwnProperty.call(" + $data + ", '" + it.util.escapeQuotes($propertyKey) + "') ";
            }
            out += ") && (missing" + $lvl + " = " + it.util.toQuotedString(it.opts.jsonPointers ? $propertyKey : $prop) + ") ) ";
          }
        }
        out += ") {  ";
        var $propertyPath = "missing" + $lvl, $missingProperty = "' + " + $propertyPath + " + '";
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.opts.jsonPointers ? it.util.getPathExpr($currentErrorPath, $propertyPath, true) : $currentErrorPath + " + " + $propertyPath;
        }
        var $$outStack = $$outStack || [];
        $$outStack.push(out);
        out = "";
        if (it.createErrors !== false) {
          out += " { keyword: 'required' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { missingProperty: '" + $missingProperty + "' } ";
          if (it.opts.messages !== false) {
            out += " , message: '";
            if (it.opts._errorDataPathProperty) {
              out += "is a required property";
            } else {
              out += "should have required property \\'" + $missingProperty + "\\'";
            }
            out += "' ";
          }
          if (it.opts.verbose) {
            out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
          }
          out += " } ";
        } else {
          out += " {} ";
        }
        var __err = out;
        out = $$outStack.pop();
        if (!it.compositeRule && $breakOnError) {
          if (it.async) {
            out += " throw new ValidationError([" + __err + "]); ";
          } else {
            out += " validate.errors = [" + __err + "]; return false; ";
          }
        } else {
          out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
        }
        out += " } else { ";
      }
    } else {
      if ($loopRequired) {
        if (!$isData) {
          out += " var " + $vSchema + " = validate.schema" + $schemaPath + "; ";
        }
        var $i = "i" + $lvl, $propertyPath = "schema" + $lvl + "[" + $i + "]", $missingProperty = "' + " + $propertyPath + " + '";
        if (it.opts._errorDataPathProperty) {
          it.errorPath = it.util.getPathExpr($currentErrorPath, $propertyPath, it.opts.jsonPointers);
        }
        if ($isData) {
          out += " if (" + $vSchema + " && !Array.isArray(" + $vSchema + ")) {  var err =   ";
          if (it.createErrors !== false) {
            out += " { keyword: 'required' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { missingProperty: '" + $missingProperty + "' } ";
            if (it.opts.messages !== false) {
              out += " , message: '";
              if (it.opts._errorDataPathProperty) {
                out += "is a required property";
              } else {
                out += "should have required property \\'" + $missingProperty + "\\'";
              }
              out += "' ";
            }
            if (it.opts.verbose) {
              out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
            }
            out += " } ";
          } else {
            out += " {} ";
          }
          out += ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } else if (" + $vSchema + " !== undefined) { ";
        }
        out += " for (var " + $i + " = 0; " + $i + " < " + $vSchema + ".length; " + $i + "++) { if (" + $data + "[" + $vSchema + "[" + $i + "]] === undefined ";
        if ($ownProperties) {
          out += " || ! Object.prototype.hasOwnProperty.call(" + $data + ", " + $vSchema + "[" + $i + "]) ";
        }
        out += ") {  var err =   ";
        if (it.createErrors !== false) {
          out += " { keyword: 'required' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { missingProperty: '" + $missingProperty + "' } ";
          if (it.opts.messages !== false) {
            out += " , message: '";
            if (it.opts._errorDataPathProperty) {
              out += "is a required property";
            } else {
              out += "should have required property \\'" + $missingProperty + "\\'";
            }
            out += "' ";
          }
          if (it.opts.verbose) {
            out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
          }
          out += " } ";
        } else {
          out += " {} ";
        }
        out += ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } } ";
        if ($isData) {
          out += "  }  ";
        }
      } else {
        var arr3 = $required;
        if (arr3) {
          var $propertyKey, i3 = -1, l3 = arr3.length - 1;
          while (i3 < l3) {
            $propertyKey = arr3[i3 += 1];
            var $prop = it.util.getProperty($propertyKey), $missingProperty = it.util.escapeQuotes($propertyKey), $useData = $data + $prop;
            if (it.opts._errorDataPathProperty) {
              it.errorPath = it.util.getPath($currentErrorPath, $propertyKey, it.opts.jsonPointers);
            }
            out += " if ( " + $useData + " === undefined ";
            if ($ownProperties) {
              out += " || ! Object.prototype.hasOwnProperty.call(" + $data + ", '" + it.util.escapeQuotes($propertyKey) + "') ";
            }
            out += ") {  var err =   ";
            if (it.createErrors !== false) {
              out += " { keyword: 'required' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { missingProperty: '" + $missingProperty + "' } ";
              if (it.opts.messages !== false) {
                out += " , message: '";
                if (it.opts._errorDataPathProperty) {
                  out += "is a required property";
                } else {
                  out += "should have required property \\'" + $missingProperty + "\\'";
                }
                out += "' ";
              }
              if (it.opts.verbose) {
                out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
              }
              out += " } ";
            } else {
              out += " {} ";
            }
            out += ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } ";
          }
        }
      }
    }
    it.errorPath = $currentErrorPath;
  } else if ($breakOnError) {
    out += " if (true) {";
  }
  return out;
};
var uniqueItems = function generate_uniqueItems(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $isData = it.opts.$data && $schema2 && $schema2.$data, $schemaValue;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
    $schemaValue = "schema" + $lvl;
  } else {
    $schemaValue = $schema2;
  }
  if (($schema2 || $isData) && it.opts.uniqueItems !== false) {
    if ($isData) {
      out += " var " + $valid + "; if (" + $schemaValue + " === false || " + $schemaValue + " === undefined) " + $valid + " = true; else if (typeof " + $schemaValue + " != 'boolean') " + $valid + " = false; else { ";
    }
    out += " var i = " + $data + ".length , " + $valid + " = true , j; if (i > 1) { ";
    var $itemType = it.schema.items && it.schema.items.type, $typeIsArray = Array.isArray($itemType);
    if (!$itemType || $itemType == "object" || $itemType == "array" || $typeIsArray && ($itemType.indexOf("object") >= 0 || $itemType.indexOf("array") >= 0)) {
      out += " outer: for (;i--;) { for (j = i; j--;) { if (equal(" + $data + "[i], " + $data + "[j])) { " + $valid + " = false; break outer; } } } ";
    } else {
      out += " var itemIndices = {}, item; for (;i--;) { var item = " + $data + "[i]; ";
      var $method = "checkDataType" + ($typeIsArray ? "s" : "");
      out += " if (" + it.util[$method]($itemType, "item", it.opts.strictNumbers, true) + ") continue; ";
      if ($typeIsArray) {
        out += ` if (typeof item == 'string') item = '"' + item; `;
      }
      out += " if (typeof itemIndices[item] == 'number') { " + $valid + " = false; j = itemIndices[item]; break; } itemIndices[item] = i; } ";
    }
    out += " } ";
    if ($isData) {
      out += "  }  ";
    }
    out += " if (!" + $valid + ") {   ";
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = "";
    if (it.createErrors !== false) {
      out += " { keyword: 'uniqueItems' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { i: i, j: j } ";
      if (it.opts.messages !== false) {
        out += " , message: 'should NOT have duplicate items (items ## ' + j + ' and ' + i + ' are identical)' ";
      }
      if (it.opts.verbose) {
        out += " , schema:  ";
        if ($isData) {
          out += "validate.schema" + $schemaPath;
        } else {
          out += "" + $schema2;
        }
        out += "         , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
      }
      out += " } ";
    } else {
      out += " {} ";
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += " throw new ValidationError([" + __err + "]); ";
      } else {
        out += " validate.errors = [" + __err + "]; return false; ";
      }
    } else {
      out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
    }
    out += " } ";
    if ($breakOnError) {
      out += " else { ";
    }
  } else {
    if ($breakOnError) {
      out += " if (true) { ";
    }
  }
  return out;
};
var dotjs = {
  "$ref": ref,
  allOf,
  anyOf,
  "$comment": comment,
  const: _const,
  contains,
  dependencies,
  "enum": _enum,
  format,
  "if": _if,
  items,
  maximum: _limit,
  minimum: _limit,
  maxItems: _limitItems,
  minItems: _limitItems,
  maxLength: _limitLength,
  minLength: _limitLength,
  maxProperties: _limitProperties,
  minProperties: _limitProperties,
  multipleOf,
  not,
  oneOf,
  pattern,
  properties: properties$2,
  propertyNames,
  required: required$1,
  uniqueItems,
  validate: validate$1
};
var ruleModules = dotjs, toHash = util$5.toHash;
var rules$1 = function rules() {
  var RULES = [
    {
      type: "number",
      rules: [
        { "maximum": ["exclusiveMaximum"] },
        { "minimum": ["exclusiveMinimum"] },
        "multipleOf",
        "format"
      ]
    },
    {
      type: "string",
      rules: ["maxLength", "minLength", "pattern", "format"]
    },
    {
      type: "array",
      rules: ["maxItems", "minItems", "items", "contains", "uniqueItems"]
    },
    {
      type: "object",
      rules: [
        "maxProperties",
        "minProperties",
        "required",
        "dependencies",
        "propertyNames",
        { "properties": ["additionalProperties", "patternProperties"] }
      ]
    },
    { rules: ["$ref", "const", "enum", "not", "anyOf", "oneOf", "allOf", "if"] }
  ];
  var ALL = ["type", "$comment"];
  var KEYWORDS2 = [
    "$schema",
    "$id",
    "id",
    "$data",
    "$async",
    "title",
    "description",
    "default",
    "definitions",
    "examples",
    "readOnly",
    "writeOnly",
    "contentMediaType",
    "contentEncoding",
    "additionalItems",
    "then",
    "else"
  ];
  var TYPES = ["number", "integer", "string", "array", "object", "boolean", "null"];
  RULES.all = toHash(ALL);
  RULES.types = toHash(TYPES);
  RULES.forEach(function(group2) {
    group2.rules = group2.rules.map(function(keyword2) {
      var implKeywords;
      if (typeof keyword2 == "object") {
        var key = Object.keys(keyword2)[0];
        implKeywords = keyword2[key];
        keyword2 = key;
        implKeywords.forEach(function(k) {
          ALL.push(k);
          RULES.all[k] = true;
        });
      }
      ALL.push(keyword2);
      var rule = RULES.all[keyword2] = {
        keyword: keyword2,
        code: ruleModules[keyword2],
        implements: implKeywords
      };
      return rule;
    });
    RULES.all.$comment = {
      keyword: "$comment",
      code: ruleModules.$comment
    };
    if (group2.type)
      RULES.types[group2.type] = group2;
  });
  RULES.keywords = toHash(ALL.concat(KEYWORDS2));
  RULES.custom = {};
  return RULES;
};
var KEYWORDS = [
  "multipleOf",
  "maximum",
  "exclusiveMaximum",
  "minimum",
  "exclusiveMinimum",
  "maxLength",
  "minLength",
  "pattern",
  "additionalItems",
  "maxItems",
  "minItems",
  "uniqueItems",
  "maxProperties",
  "minProperties",
  "required",
  "additionalProperties",
  "enum",
  "format",
  "const"
];
var data = function(metaSchema2, keywordsJsonPointers) {
  for (var i = 0; i < keywordsJsonPointers.length; i++) {
    metaSchema2 = JSON.parse(JSON.stringify(metaSchema2));
    var segments = keywordsJsonPointers[i].split("/");
    var keywords = metaSchema2;
    var j;
    for (j = 1; j < segments.length; j++)
      keywords = keywords[segments[j]];
    for (j = 0; j < KEYWORDS.length; j++) {
      var key = KEYWORDS[j];
      var schema = keywords[key];
      if (schema) {
        keywords[key] = {
          anyOf: [
            schema,
            { $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#" }
          ]
        };
      }
    }
  }
  return metaSchema2;
};
var MissingRefError = error_classes.MissingRef;
var async = compileAsync;
function compileAsync(schema, meta, callback) {
  var self2 = this;
  if (typeof this._opts.loadSchema != "function")
    throw new Error("options.loadSchema should be a function");
  if (typeof meta == "function") {
    callback = meta;
    meta = void 0;
  }
  var p = loadMetaSchemaOf(schema).then(function() {
    var schemaObj = self2._addSchema(schema, void 0, meta);
    return schemaObj.validate || _compileAsync(schemaObj);
  });
  if (callback) {
    p.then(
      function(v) {
        callback(null, v);
      },
      callback
    );
  }
  return p;
  function loadMetaSchemaOf(sch) {
    var $schema2 = sch.$schema;
    return $schema2 && !self2.getSchema($schema2) ? compileAsync.call(self2, { $ref: $schema2 }, true) : Promise.resolve();
  }
  function _compileAsync(schemaObj) {
    try {
      return self2._compile(schemaObj);
    } catch (e) {
      if (e instanceof MissingRefError)
        return loadMissingSchema(e);
      throw e;
    }
    function loadMissingSchema(e) {
      var ref2 = e.missingSchema;
      if (added(ref2))
        throw new Error("Schema " + ref2 + " is loaded but " + e.missingRef + " cannot be resolved");
      var schemaPromise = self2._loadingSchemas[ref2];
      if (!schemaPromise) {
        schemaPromise = self2._loadingSchemas[ref2] = self2._opts.loadSchema(ref2);
        schemaPromise.then(removePromise, removePromise);
      }
      return schemaPromise.then(function(sch) {
        if (!added(ref2)) {
          return loadMetaSchemaOf(sch).then(function() {
            if (!added(ref2))
              self2.addSchema(sch, ref2, void 0, meta);
          });
        }
      }).then(function() {
        return _compileAsync(schemaObj);
      });
      function removePromise() {
        delete self2._loadingSchemas[ref2];
      }
      function added(ref3) {
        return self2._refs[ref3] || self2._schemas[ref3];
      }
    }
  }
}
var custom = function generate_custom(it, $keyword, $ruleType) {
  var out = " ";
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema2 = it.schema[$keyword];
  var $schemaPath = it.schemaPath + it.util.getProperty($keyword);
  var $errSchemaPath = it.errSchemaPath + "/" + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $errorKeyword;
  var $data = "data" + ($dataLvl || "");
  var $valid = "valid" + $lvl;
  var $errs = "errs__" + $lvl;
  var $isData = it.opts.$data && $schema2 && $schema2.$data, $schemaValue;
  if ($isData) {
    out += " var schema" + $lvl + " = " + it.util.getData($schema2.$data, $dataLvl, it.dataPathArr) + "; ";
    $schemaValue = "schema" + $lvl;
  } else {
    $schemaValue = $schema2;
  }
  var $rule = this, $definition = "definition" + $lvl, $rDef = $rule.definition, $closingBraces = "";
  var $compile, $inline, $macro, $ruleValidate, $validateCode;
  if ($isData && $rDef.$data) {
    $validateCode = "keywordValidate" + $lvl;
    var $validateSchema = $rDef.validateSchema;
    out += " var " + $definition + " = RULES.custom['" + $keyword + "'].definition; var " + $validateCode + " = " + $definition + ".validate;";
  } else {
    $ruleValidate = it.useCustomRule($rule, $schema2, it.schema, it);
    if (!$ruleValidate)
      return;
    $schemaValue = "validate.schema" + $schemaPath;
    $validateCode = $ruleValidate.code;
    $compile = $rDef.compile;
    $inline = $rDef.inline;
    $macro = $rDef.macro;
  }
  var $ruleErrs = $validateCode + ".errors", $i = "i" + $lvl, $ruleErr = "ruleErr" + $lvl, $asyncKeyword = $rDef.async;
  if ($asyncKeyword && !it.async)
    throw new Error("async keyword in sync schema");
  if (!($inline || $macro)) {
    out += "" + $ruleErrs + " = null;";
  }
  out += "var " + $errs + " = errors;var " + $valid + ";";
  if ($isData && $rDef.$data) {
    $closingBraces += "}";
    out += " if (" + $schemaValue + " === undefined) { " + $valid + " = true; } else { ";
    if ($validateSchema) {
      $closingBraces += "}";
      out += " " + $valid + " = " + $definition + ".validateSchema(" + $schemaValue + "); if (" + $valid + ") { ";
    }
  }
  if ($inline) {
    if ($rDef.statements) {
      out += " " + $ruleValidate.validate + " ";
    } else {
      out += " " + $valid + " = " + $ruleValidate.validate + "; ";
    }
  } else if ($macro) {
    var $it = it.util.copy(it);
    var $closingBraces = "";
    $it.level++;
    var $nextValid = "valid" + $it.level;
    $it.schema = $ruleValidate.validate;
    $it.schemaPath = "";
    var $wasComposite = it.compositeRule;
    it.compositeRule = $it.compositeRule = true;
    var $code = it.validate($it).replace(/validate\.schema/g, $validateCode);
    it.compositeRule = $it.compositeRule = $wasComposite;
    out += " " + $code;
  } else {
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = "";
    out += "  " + $validateCode + ".call( ";
    if (it.opts.passContext) {
      out += "this";
    } else {
      out += "self";
    }
    if ($compile || $rDef.schema === false) {
      out += " , " + $data + " ";
    } else {
      out += " , " + $schemaValue + " , " + $data + " , validate.schema" + it.schemaPath + " ";
    }
    out += " , (dataPath || '')";
    if (it.errorPath != '""') {
      out += " + " + it.errorPath;
    }
    var $parentData = $dataLvl ? "data" + ($dataLvl - 1 || "") : "parentData", $parentDataProperty = $dataLvl ? it.dataPathArr[$dataLvl] : "parentDataProperty";
    out += " , " + $parentData + " , " + $parentDataProperty + " , rootData )  ";
    var def_callRuleValidate = out;
    out = $$outStack.pop();
    if ($rDef.errors === false) {
      out += " " + $valid + " = ";
      if ($asyncKeyword) {
        out += "await ";
      }
      out += "" + def_callRuleValidate + "; ";
    } else {
      if ($asyncKeyword) {
        $ruleErrs = "customErrors" + $lvl;
        out += " var " + $ruleErrs + " = null; try { " + $valid + " = await " + def_callRuleValidate + "; } catch (e) { " + $valid + " = false; if (e instanceof ValidationError) " + $ruleErrs + " = e.errors; else throw e; } ";
      } else {
        out += " " + $ruleErrs + " = null; " + $valid + " = " + def_callRuleValidate + "; ";
      }
    }
  }
  if ($rDef.modifying) {
    out += " if (" + $parentData + ") " + $data + " = " + $parentData + "[" + $parentDataProperty + "];";
  }
  out += "" + $closingBraces;
  if ($rDef.valid) {
    if ($breakOnError) {
      out += " if (true) { ";
    }
  } else {
    out += " if ( ";
    if ($rDef.valid === void 0) {
      out += " !";
      if ($macro) {
        out += "" + $nextValid;
      } else {
        out += "" + $valid;
      }
    } else {
      out += " " + !$rDef.valid + " ";
    }
    out += ") { ";
    $errorKeyword = $rule.keyword;
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = "";
    var $$outStack = $$outStack || [];
    $$outStack.push(out);
    out = "";
    if (it.createErrors !== false) {
      out += " { keyword: '" + ($errorKeyword || "custom") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { keyword: '" + $rule.keyword + "' } ";
      if (it.opts.messages !== false) {
        out += ` , message: 'should pass "` + $rule.keyword + `" keyword validation' `;
      }
      if (it.opts.verbose) {
        out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
      }
      out += " } ";
    } else {
      out += " {} ";
    }
    var __err = out;
    out = $$outStack.pop();
    if (!it.compositeRule && $breakOnError) {
      if (it.async) {
        out += " throw new ValidationError([" + __err + "]); ";
      } else {
        out += " validate.errors = [" + __err + "]; return false; ";
      }
    } else {
      out += " var err = " + __err + ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
    }
    var def_customError = out;
    out = $$outStack.pop();
    if ($inline) {
      if ($rDef.errors) {
        if ($rDef.errors != "full") {
          out += "  for (var " + $i + "=" + $errs + "; " + $i + "<errors; " + $i + "++) { var " + $ruleErr + " = vErrors[" + $i + "]; if (" + $ruleErr + ".dataPath === undefined) " + $ruleErr + ".dataPath = (dataPath || '') + " + it.errorPath + "; if (" + $ruleErr + ".schemaPath === undefined) { " + $ruleErr + '.schemaPath = "' + $errSchemaPath + '"; } ';
          if (it.opts.verbose) {
            out += " " + $ruleErr + ".schema = " + $schemaValue + "; " + $ruleErr + ".data = " + $data + "; ";
          }
          out += " } ";
        }
      } else {
        if ($rDef.errors === false) {
          out += " " + def_customError + " ";
        } else {
          out += " if (" + $errs + " == errors) { " + def_customError + " } else {  for (var " + $i + "=" + $errs + "; " + $i + "<errors; " + $i + "++) { var " + $ruleErr + " = vErrors[" + $i + "]; if (" + $ruleErr + ".dataPath === undefined) " + $ruleErr + ".dataPath = (dataPath || '') + " + it.errorPath + "; if (" + $ruleErr + ".schemaPath === undefined) { " + $ruleErr + '.schemaPath = "' + $errSchemaPath + '"; } ';
          if (it.opts.verbose) {
            out += " " + $ruleErr + ".schema = " + $schemaValue + "; " + $ruleErr + ".data = " + $data + "; ";
          }
          out += " } } ";
        }
      }
    } else if ($macro) {
      out += "   var err =   ";
      if (it.createErrors !== false) {
        out += " { keyword: '" + ($errorKeyword || "custom") + "' , dataPath: (dataPath || '') + " + it.errorPath + " , schemaPath: " + it.util.toQuotedString($errSchemaPath) + " , params: { keyword: '" + $rule.keyword + "' } ";
        if (it.opts.messages !== false) {
          out += ` , message: 'should pass "` + $rule.keyword + `" keyword validation' `;
        }
        if (it.opts.verbose) {
          out += " , schema: validate.schema" + $schemaPath + " , parentSchema: validate.schema" + it.schemaPath + " , data: " + $data + " ";
        }
        out += " } ";
      } else {
        out += " {} ";
      }
      out += ";  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; ";
      if (!it.compositeRule && $breakOnError) {
        if (it.async) {
          out += " throw new ValidationError(vErrors); ";
        } else {
          out += " validate.errors = vErrors; return false; ";
        }
      }
    } else {
      if ($rDef.errors === false) {
        out += " " + def_customError + " ";
      } else {
        out += " if (Array.isArray(" + $ruleErrs + ")) { if (vErrors === null) vErrors = " + $ruleErrs + "; else vErrors = vErrors.concat(" + $ruleErrs + "); errors = vErrors.length;  for (var " + $i + "=" + $errs + "; " + $i + "<errors; " + $i + "++) { var " + $ruleErr + " = vErrors[" + $i + "]; if (" + $ruleErr + ".dataPath === undefined) " + $ruleErr + ".dataPath = (dataPath || '') + " + it.errorPath + ";  " + $ruleErr + '.schemaPath = "' + $errSchemaPath + '";  ';
        if (it.opts.verbose) {
          out += " " + $ruleErr + ".schema = " + $schemaValue + "; " + $ruleErr + ".data = " + $data + "; ";
        }
        out += " } } else { " + def_customError + " } ";
      }
    }
    out += " } ";
    if ($breakOnError) {
      out += " else { ";
    }
  }
  return out;
};
const $schema$1 = "http://json-schema.org/draft-07/schema#";
const $id$1 = "http://json-schema.org/draft-07/schema#";
const title = "Core schema meta-schema";
const definitions = {
  schemaArray: {
    type: "array",
    minItems: 1,
    items: {
      $ref: "#"
    }
  },
  nonNegativeInteger: {
    type: "integer",
    minimum: 0
  },
  nonNegativeIntegerDefault0: {
    allOf: [
      {
        $ref: "#/definitions/nonNegativeInteger"
      },
      {
        "default": 0
      }
    ]
  },
  simpleTypes: {
    "enum": [
      "array",
      "boolean",
      "integer",
      "null",
      "number",
      "object",
      "string"
    ]
  },
  stringArray: {
    type: "array",
    items: {
      type: "string"
    },
    uniqueItems: true,
    "default": []
  }
};
const type$1 = [
  "object",
  "boolean"
];
const properties$1 = {
  $id: {
    type: "string",
    format: "uri-reference"
  },
  $schema: {
    type: "string",
    format: "uri"
  },
  $ref: {
    type: "string",
    format: "uri-reference"
  },
  $comment: {
    type: "string"
  },
  title: {
    type: "string"
  },
  description: {
    type: "string"
  },
  "default": true,
  readOnly: {
    type: "boolean",
    "default": false
  },
  examples: {
    type: "array",
    items: true
  },
  multipleOf: {
    type: "number",
    exclusiveMinimum: 0
  },
  maximum: {
    type: "number"
  },
  exclusiveMaximum: {
    type: "number"
  },
  minimum: {
    type: "number"
  },
  exclusiveMinimum: {
    type: "number"
  },
  maxLength: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minLength: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  pattern: {
    type: "string",
    format: "regex"
  },
  additionalItems: {
    $ref: "#"
  },
  items: {
    anyOf: [
      {
        $ref: "#"
      },
      {
        $ref: "#/definitions/schemaArray"
      }
    ],
    "default": true
  },
  maxItems: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minItems: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  uniqueItems: {
    type: "boolean",
    "default": false
  },
  contains: {
    $ref: "#"
  },
  maxProperties: {
    $ref: "#/definitions/nonNegativeInteger"
  },
  minProperties: {
    $ref: "#/definitions/nonNegativeIntegerDefault0"
  },
  required: {
    $ref: "#/definitions/stringArray"
  },
  additionalProperties: {
    $ref: "#"
  },
  definitions: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    "default": {}
  },
  properties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    "default": {}
  },
  patternProperties: {
    type: "object",
    additionalProperties: {
      $ref: "#"
    },
    propertyNames: {
      format: "regex"
    },
    "default": {}
  },
  dependencies: {
    type: "object",
    additionalProperties: {
      anyOf: [
        {
          $ref: "#"
        },
        {
          $ref: "#/definitions/stringArray"
        }
      ]
    }
  },
  propertyNames: {
    $ref: "#"
  },
  "const": true,
  "enum": {
    type: "array",
    items: true,
    minItems: 1,
    uniqueItems: true
  },
  type: {
    anyOf: [
      {
        $ref: "#/definitions/simpleTypes"
      },
      {
        type: "array",
        items: {
          $ref: "#/definitions/simpleTypes"
        },
        minItems: 1,
        uniqueItems: true
      }
    ]
  },
  format: {
    type: "string"
  },
  contentMediaType: {
    type: "string"
  },
  contentEncoding: {
    type: "string"
  },
  "if": {
    $ref: "#"
  },
  then: {
    $ref: "#"
  },
  "else": {
    $ref: "#"
  },
  allOf: {
    $ref: "#/definitions/schemaArray"
  },
  anyOf: {
    $ref: "#/definitions/schemaArray"
  },
  oneOf: {
    $ref: "#/definitions/schemaArray"
  },
  not: {
    $ref: "#"
  }
};
const require$$13 = {
  $schema: $schema$1,
  $id: $id$1,
  title,
  definitions,
  type: type$1,
  properties: properties$1,
  "default": true
};
var metaSchema = require$$13;
var definition_schema = {
  $id: "https://github.com/ajv-validator/ajv/blob/master/lib/definition_schema.js",
  definitions: {
    simpleTypes: metaSchema.definitions.simpleTypes
  },
  type: "object",
  dependencies: {
    schema: ["validate"],
    $data: ["validate"],
    statements: ["inline"],
    valid: { not: { required: ["macro"] } }
  },
  properties: {
    type: metaSchema.properties.type,
    schema: { type: "boolean" },
    statements: { type: "boolean" },
    dependencies: {
      type: "array",
      items: { type: "string" }
    },
    metaSchema: { type: "object" },
    modifying: { type: "boolean" },
    valid: { type: "boolean" },
    $data: { type: "boolean" },
    async: { type: "boolean" },
    errors: {
      anyOf: [
        { type: "boolean" },
        { const: "full" }
      ]
    }
  }
};
var IDENTIFIER = /^[a-z_$][a-z0-9_$-]*$/i;
var customRuleCode = custom;
var definitionSchema = definition_schema;
var keyword = {
  add: addKeyword,
  get: getKeyword,
  remove: removeKeyword,
  validate: validateKeyword
};
function addKeyword(keyword2, definition) {
  var RULES = this.RULES;
  if (RULES.keywords[keyword2])
    throw new Error("Keyword " + keyword2 + " is already defined");
  if (!IDENTIFIER.test(keyword2))
    throw new Error("Keyword " + keyword2 + " is not a valid identifier");
  if (definition) {
    this.validateKeyword(definition, true);
    var dataType = definition.type;
    if (Array.isArray(dataType)) {
      for (var i = 0; i < dataType.length; i++)
        _addRule(keyword2, dataType[i], definition);
    } else {
      _addRule(keyword2, dataType, definition);
    }
    var metaSchema2 = definition.metaSchema;
    if (metaSchema2) {
      if (definition.$data && this._opts.$data) {
        metaSchema2 = {
          anyOf: [
            metaSchema2,
            { "$ref": "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#" }
          ]
        };
      }
      definition.validateSchema = this.compile(metaSchema2, true);
    }
  }
  RULES.keywords[keyword2] = RULES.all[keyword2] = true;
  function _addRule(keyword3, dataType2, definition2) {
    var ruleGroup;
    for (var i2 = 0; i2 < RULES.length; i2++) {
      var rg = RULES[i2];
      if (rg.type == dataType2) {
        ruleGroup = rg;
        break;
      }
    }
    if (!ruleGroup) {
      ruleGroup = { type: dataType2, rules: [] };
      RULES.push(ruleGroup);
    }
    var rule = {
      keyword: keyword3,
      definition: definition2,
      custom: true,
      code: customRuleCode,
      implements: definition2.implements
    };
    ruleGroup.rules.push(rule);
    RULES.custom[keyword3] = rule;
  }
  return this;
}
function getKeyword(keyword2) {
  var rule = this.RULES.custom[keyword2];
  return rule ? rule.definition : this.RULES.keywords[keyword2] || false;
}
function removeKeyword(keyword2) {
  var RULES = this.RULES;
  delete RULES.keywords[keyword2];
  delete RULES.all[keyword2];
  delete RULES.custom[keyword2];
  for (var i = 0; i < RULES.length; i++) {
    var rules3 = RULES[i].rules;
    for (var j = 0; j < rules3.length; j++) {
      if (rules3[j].keyword == keyword2) {
        rules3.splice(j, 1);
        break;
      }
    }
  }
  return this;
}
function validateKeyword(definition, throwError) {
  validateKeyword.errors = null;
  var v = this._validateKeyword = this._validateKeyword || this.compile(definitionSchema, true);
  if (v(definition))
    return true;
  validateKeyword.errors = v.errors;
  if (throwError)
    throw new Error("custom keyword definition is invalid: " + this.errorsText(v.errors));
  else
    return false;
}
const $schema = "http://json-schema.org/draft-07/schema#";
const $id = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
const description = "Meta-schema for $data reference (JSON Schema extension proposal)";
const type = "object";
const required = [
  "$data"
];
const properties = {
  $data: {
    type: "string",
    anyOf: [
      {
        format: "relative-json-pointer"
      },
      {
        format: "json-pointer"
      }
    ]
  }
};
const additionalProperties = false;
const require$$12 = {
  $schema,
  $id,
  description,
  type,
  required,
  properties,
  additionalProperties
};
var compileSchema = compile_1, resolve = resolve_1, Cache2 = cacheExports, SchemaObject = schema_obj, stableStringify = fastJsonStableStringify, formats = formats_1, rules2 = rules$1, $dataMetaSchema = data, util = util$5;
var ajv = Ajv;
Ajv.prototype.validate = validate;
Ajv.prototype.compile = compile;
Ajv.prototype.addSchema = addSchema;
Ajv.prototype.addMetaSchema = addMetaSchema;
Ajv.prototype.validateSchema = validateSchema;
Ajv.prototype.getSchema = getSchema;
Ajv.prototype.removeSchema = removeSchema;
Ajv.prototype.addFormat = addFormat;
Ajv.prototype.errorsText = errorsText;
Ajv.prototype._addSchema = _addSchema;
Ajv.prototype._compile = _compile;
Ajv.prototype.compileAsync = async;
var customKeyword = keyword;
Ajv.prototype.addKeyword = customKeyword.add;
Ajv.prototype.getKeyword = customKeyword.get;
Ajv.prototype.removeKeyword = customKeyword.remove;
Ajv.prototype.validateKeyword = customKeyword.validate;
var errorClasses = error_classes;
Ajv.ValidationError = errorClasses.Validation;
Ajv.MissingRefError = errorClasses.MissingRef;
Ajv.$dataMetaSchema = $dataMetaSchema;
var META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
var META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes", "strictDefaults"];
var META_SUPPORT_DATA = ["/properties"];
function Ajv(opts) {
  if (!(this instanceof Ajv))
    return new Ajv(opts);
  opts = this._opts = util.copy(opts) || {};
  setLogger(this);
  this._schemas = {};
  this._refs = {};
  this._fragments = {};
  this._formats = formats(opts.format);
  this._cache = opts.cache || new Cache2();
  this._loadingSchemas = {};
  this._compilations = [];
  this.RULES = rules2();
  this._getId = chooseGetId(opts);
  opts.loopRequired = opts.loopRequired || Infinity;
  if (opts.errorDataPath == "property")
    opts._errorDataPathProperty = true;
  if (opts.serialize === void 0)
    opts.serialize = stableStringify;
  this._metaOpts = getMetaSchemaOptions(this);
  if (opts.formats)
    addInitialFormats(this);
  if (opts.keywords)
    addInitialKeywords(this);
  addDefaultMetaSchema(this);
  if (typeof opts.meta == "object")
    this.addMetaSchema(opts.meta);
  if (opts.nullable)
    this.addKeyword("nullable", { metaSchema: { type: "boolean" } });
  addInitialSchemas(this);
}
function validate(schemaKeyRef, data2) {
  var v;
  if (typeof schemaKeyRef == "string") {
    v = this.getSchema(schemaKeyRef);
    if (!v)
      throw new Error('no schema with key or ref "' + schemaKeyRef + '"');
  } else {
    var schemaObj = this._addSchema(schemaKeyRef);
    v = schemaObj.validate || this._compile(schemaObj);
  }
  var valid = v(data2);
  if (v.$async !== true)
    this.errors = v.errors;
  return valid;
}
function compile(schema, _meta) {
  var schemaObj = this._addSchema(schema, void 0, _meta);
  return schemaObj.validate || this._compile(schemaObj);
}
function addSchema(schema, key, _skipValidation, _meta) {
  if (Array.isArray(schema)) {
    for (var i = 0; i < schema.length; i++)
      this.addSchema(schema[i], void 0, _skipValidation, _meta);
    return this;
  }
  var id = this._getId(schema);
  if (id !== void 0 && typeof id != "string")
    throw new Error("schema id must be string");
  key = resolve.normalizeId(key || id);
  checkUnique(this, key);
  this._schemas[key] = this._addSchema(schema, _skipValidation, _meta, true);
  return this;
}
function addMetaSchema(schema, key, skipValidation) {
  this.addSchema(schema, key, skipValidation, true);
  return this;
}
function validateSchema(schema, throwOrLogError) {
  var $schema2 = schema.$schema;
  if ($schema2 !== void 0 && typeof $schema2 != "string")
    throw new Error("$schema must be a string");
  $schema2 = $schema2 || this._opts.defaultMeta || defaultMeta(this);
  if (!$schema2) {
    this.logger.warn("meta-schema not available");
    this.errors = null;
    return true;
  }
  var valid = this.validate($schema2, schema);
  if (!valid && throwOrLogError) {
    var message = "schema is invalid: " + this.errorsText();
    if (this._opts.validateSchema == "log")
      this.logger.error(message);
    else
      throw new Error(message);
  }
  return valid;
}
function defaultMeta(self2) {
  var meta = self2._opts.meta;
  self2._opts.defaultMeta = typeof meta == "object" ? self2._getId(meta) || meta : self2.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0;
  return self2._opts.defaultMeta;
}
function getSchema(keyRef) {
  var schemaObj = _getSchemaObj(this, keyRef);
  switch (typeof schemaObj) {
    case "object":
      return schemaObj.validate || this._compile(schemaObj);
    case "string":
      return this.getSchema(schemaObj);
    case "undefined":
      return _getSchemaFragment(this, keyRef);
  }
}
function _getSchemaFragment(self2, ref2) {
  var res = resolve.schema.call(self2, { schema: {} }, ref2);
  if (res) {
    var schema = res.schema, root = res.root, baseId = res.baseId;
    var v = compileSchema.call(self2, schema, root, void 0, baseId);
    self2._fragments[ref2] = new SchemaObject({
      ref: ref2,
      fragment: true,
      schema,
      root,
      baseId,
      validate: v
    });
    return v;
  }
}
function _getSchemaObj(self2, keyRef) {
  keyRef = resolve.normalizeId(keyRef);
  return self2._schemas[keyRef] || self2._refs[keyRef] || self2._fragments[keyRef];
}
function removeSchema(schemaKeyRef) {
  if (schemaKeyRef instanceof RegExp) {
    _removeAllSchemas(this, this._schemas, schemaKeyRef);
    _removeAllSchemas(this, this._refs, schemaKeyRef);
    return this;
  }
  switch (typeof schemaKeyRef) {
    case "undefined":
      _removeAllSchemas(this, this._schemas);
      _removeAllSchemas(this, this._refs);
      this._cache.clear();
      return this;
    case "string":
      var schemaObj = _getSchemaObj(this, schemaKeyRef);
      if (schemaObj)
        this._cache.del(schemaObj.cacheKey);
      delete this._schemas[schemaKeyRef];
      delete this._refs[schemaKeyRef];
      return this;
    case "object":
      var serialize = this._opts.serialize;
      var cacheKey = serialize ? serialize(schemaKeyRef) : schemaKeyRef;
      this._cache.del(cacheKey);
      var id = this._getId(schemaKeyRef);
      if (id) {
        id = resolve.normalizeId(id);
        delete this._schemas[id];
        delete this._refs[id];
      }
  }
  return this;
}
function _removeAllSchemas(self2, schemas, regex2) {
  for (var keyRef in schemas) {
    var schemaObj = schemas[keyRef];
    if (!schemaObj.meta && (!regex2 || regex2.test(keyRef))) {
      self2._cache.del(schemaObj.cacheKey);
      delete schemas[keyRef];
    }
  }
}
function _addSchema(schema, skipValidation, meta, shouldAddSchema) {
  if (typeof schema != "object" && typeof schema != "boolean")
    throw new Error("schema should be object or boolean");
  var serialize = this._opts.serialize;
  var cacheKey = serialize ? serialize(schema) : schema;
  var cached = this._cache.get(cacheKey);
  if (cached)
    return cached;
  shouldAddSchema = shouldAddSchema || this._opts.addUsedSchema !== false;
  var id = resolve.normalizeId(this._getId(schema));
  if (id && shouldAddSchema)
    checkUnique(this, id);
  var willValidate = this._opts.validateSchema !== false && !skipValidation;
  var recursiveMeta;
  if (willValidate && !(recursiveMeta = id && id == resolve.normalizeId(schema.$schema)))
    this.validateSchema(schema, true);
  var localRefs = resolve.ids.call(this, schema);
  var schemaObj = new SchemaObject({
    id,
    schema,
    localRefs,
    cacheKey,
    meta
  });
  if (id[0] != "#" && shouldAddSchema)
    this._refs[id] = schemaObj;
  this._cache.put(cacheKey, schemaObj);
  if (willValidate && recursiveMeta)
    this.validateSchema(schema, true);
  return schemaObj;
}
function _compile(schemaObj, root) {
  if (schemaObj.compiling) {
    schemaObj.validate = callValidate;
    callValidate.schema = schemaObj.schema;
    callValidate.errors = null;
    callValidate.root = root ? root : callValidate;
    if (schemaObj.schema.$async === true)
      callValidate.$async = true;
    return callValidate;
  }
  schemaObj.compiling = true;
  var currentOpts;
  if (schemaObj.meta) {
    currentOpts = this._opts;
    this._opts = this._metaOpts;
  }
  var v;
  try {
    v = compileSchema.call(this, schemaObj.schema, root, schemaObj.localRefs);
  } catch (e) {
    delete schemaObj.validate;
    throw e;
  } finally {
    schemaObj.compiling = false;
    if (schemaObj.meta)
      this._opts = currentOpts;
  }
  schemaObj.validate = v;
  schemaObj.refs = v.refs;
  schemaObj.refVal = v.refVal;
  schemaObj.root = v.root;
  return v;
  function callValidate() {
    var _validate = schemaObj.validate;
    var result = _validate.apply(this, arguments);
    callValidate.errors = _validate.errors;
    return result;
  }
}
function chooseGetId(opts) {
  switch (opts.schemaId) {
    case "auto":
      return _get$IdOrId;
    case "id":
      return _getId;
    default:
      return _get$Id;
  }
}
function _getId(schema) {
  if (schema.$id)
    this.logger.warn("schema $id ignored", schema.$id);
  return schema.id;
}
function _get$Id(schema) {
  if (schema.id)
    this.logger.warn("schema id ignored", schema.id);
  return schema.$id;
}
function _get$IdOrId(schema) {
  if (schema.$id && schema.id && schema.$id != schema.id)
    throw new Error("schema $id is different from id");
  return schema.$id || schema.id;
}
function errorsText(errors, options) {
  errors = errors || this.errors;
  if (!errors)
    return "No errors";
  options = options || {};
  var separator = options.separator === void 0 ? ", " : options.separator;
  var dataVar = options.dataVar === void 0 ? "data" : options.dataVar;
  var text = "";
  for (var i = 0; i < errors.length; i++) {
    var e = errors[i];
    if (e)
      text += dataVar + e.dataPath + " " + e.message + separator;
  }
  return text.slice(0, -separator.length);
}
function addFormat(name, format2) {
  if (typeof format2 == "string")
    format2 = new RegExp(format2);
  this._formats[name] = format2;
  return this;
}
function addDefaultMetaSchema(self2) {
  var $dataSchema;
  if (self2._opts.$data) {
    $dataSchema = require$$12;
    self2.addMetaSchema($dataSchema, $dataSchema.$id, true);
  }
  if (self2._opts.meta === false)
    return;
  var metaSchema2 = require$$13;
  if (self2._opts.$data)
    metaSchema2 = $dataMetaSchema(metaSchema2, META_SUPPORT_DATA);
  self2.addMetaSchema(metaSchema2, META_SCHEMA_ID, true);
  self2._refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
}
function addInitialSchemas(self2) {
  var optsSchemas = self2._opts.schemas;
  if (!optsSchemas)
    return;
  if (Array.isArray(optsSchemas))
    self2.addSchema(optsSchemas);
  else
    for (var key in optsSchemas)
      self2.addSchema(optsSchemas[key], key);
}
function addInitialFormats(self2) {
  for (var name in self2._opts.formats) {
    var format2 = self2._opts.formats[name];
    self2.addFormat(name, format2);
  }
}
function addInitialKeywords(self2) {
  for (var name in self2._opts.keywords) {
    var keyword2 = self2._opts.keywords[name];
    self2.addKeyword(name, keyword2);
  }
}
function checkUnique(self2, id) {
  if (self2._schemas[id] || self2._refs[id])
    throw new Error('schema with key or id "' + id + '" already exists');
}
function getMetaSchemaOptions(self2) {
  var metaOpts = util.copy(self2._opts);
  for (var i = 0; i < META_IGNORE_OPTIONS.length; i++)
    delete metaOpts[META_IGNORE_OPTIONS[i]];
  return metaOpts;
}
function setLogger(self2) {
  var logger = self2._opts.logger;
  if (logger === false) {
    self2.logger = { log: noop, warn: noop, error: noop };
  } else {
    if (logger === void 0)
      logger = console;
    if (!(typeof logger == "object" && logger.log && logger.warn && logger.error))
      throw new Error("logger must implement log, warn and error methods");
    self2.logger = logger;
  }
}
function noop() {
}
const Ajv$1 = /* @__PURE__ */ getDefaultExportFromCjs(ajv);
function getStyleOverridden(parent, child) {
  const base = parent ? JSON.parse(JSON.stringify(parent)) : {};
  return child ? Object.assign(base, child) : base;
}
function fallback() {
  return Math.random().toString(36).substring(2, 10);
}
function uuid() {
  var _a, _b, _c;
  return (_c = (_b = (_a = globalThis.crypto).randomUUID) == null ? void 0 : _b.call(_a)) != null ? _c : fallback();
}
function traverseTracks(spec, callback) {
  if ("tracks" in spec) {
    spec.tracks.forEach((t, i, ts) => {
      callback(t, i, ts);
      traverseTracks(t, callback);
    });
  } else if ("views" in spec) {
    spec.views.forEach((view) => traverseTracks(view, callback));
  }
}
function traverseTracksAndViews(spec, callback) {
  if ("tracks" in spec) {
    spec.tracks.forEach((t) => {
      callback(t);
      traverseTracksAndViews(t, callback);
    });
  } else if ("views" in spec) {
    spec.views.forEach((v) => {
      callback(v);
      traverseTracksAndViews(v, callback);
    });
  }
}
function traverseViewArrangements(spec, callback) {
  if ("tracks" in spec)
    ;
  else {
    callback(spec);
    spec.views.forEach((v) => {
      traverseViewArrangements(v, callback);
    });
  }
}
function convertToFlatTracks(spec) {
  if (IsFlatTracks(spec)) {
    const base = { ...spec, tracks: void 0, id: void 0 };
    return spec.tracks.filter((track) => !track._invalidTrack).map((track) => Object.assign(JSON.parse(JSON.stringify(base)), track));
  }
  const newTracks = [];
  if (IsStackedTracks(spec)) {
    spec.tracks.filter((track) => !track._invalidTrack).map((track) => {
      if ("alignment" in track) {
        newTracks.push({
          ...track,
          _overlay: [...track.tracks],
          tracks: void 0,
          alignment: void 0
        });
      } else {
        const base = { ...spec, tracks: void 0, id: void 0 };
        const newSpec = Object.assign(JSON.parse(JSON.stringify(base)), track);
        newTracks.push(newSpec);
      }
    });
  } else {
    newTracks.push({
      ...spec,
      _overlay: [...spec.tracks.filter((track) => !track._invalidTrack)],
      tracks: void 0,
      alignment: void 0
    });
  }
  return JSON.parse(JSON.stringify(newTracks));
}
function traverseToFixSpecDownstream(spec, parentDef) {
  if (parentDef) {
    if (spec.assembly === void 0)
      spec.assembly = parentDef.assembly;
    if (spec.layout === void 0)
      spec.layout = parentDef.layout;
    if (spec.orientation === void 0)
      spec.orientation = parentDef.orientation;
    if (spec.static === void 0)
      spec.static = parentDef.static !== void 0 ? parentDef.static : false;
    if (spec.zoomLimits === void 0)
      spec.zoomLimits = parentDef.zoomLimits;
    if (spec.xDomain === void 0)
      spec.xDomain = parentDef.xDomain;
    if (spec.yDomain === void 0)
      spec.yDomain = parentDef.yDomain;
    if (spec.linkingId === void 0)
      spec.linkingId = parentDef.linkingId;
    if (spec.centerRadius === void 0)
      spec.centerRadius = parentDef.centerRadius;
    if (spec.spacing === void 0 && !("tracks" in spec))
      spec.spacing = parentDef.spacing;
    if (spec.xOffset === void 0)
      spec.xOffset = parentDef.xOffset;
    if (spec.yOffset === void 0)
      spec.yOffset = parentDef.yOffset;
    if ("views" in spec && "arrangement" in parentDef && spec.arrangement === void 0)
      spec.arrangement = parentDef.arrangement;
    spec.style = getStyleOverridden(parentDef.style, spec.style);
  } else {
    if (spec.assembly === void 0)
      spec.assembly = "hg38";
    if (spec.layout === void 0)
      spec.layout = "linear";
    if (spec.orientation === void 0)
      spec.orientation = "horizontal";
    if (spec.static === void 0)
      spec.static = false;
    if (spec.zoomLimits === void 0)
      spec.zoomLimits = [1, null];
    if (spec.centerRadius === void 0)
      spec.centerRadius = DEFAULT_INNER_RADIUS_PROP;
    if (spec.spacing === void 0)
      spec.spacing = DEFAULT_VIEW_SPACING;
    if ("views" in spec && spec.arrangement === void 0)
      spec.arrangement = "vertical";
    if (spec.xOffset === void 0)
      spec.xOffset = 0;
    if (spec.yOffset === void 0)
      spec.yOffset = 0;
  }
  if (!spec.id) {
    spec.id = uuid();
  }
  if ("tracks" in spec) {
    let tracks = convertToFlatTracks(spec);
    tracks = spreadTracksByData(tracks);
    const linkID = uuid();
    tracks.forEach((track, i, array) => {
      var _a, _b, _c;
      if (!track.id) {
        track.id = uuid();
      }
      if (!track.width) {
        track.width = Is2DTrack(track) ? DEFAULT_TRACK_SIZE_2D : DEFAULT_TRACK_WIDTH_LINEAR;
      }
      if (!track.height) {
        track.height = Is2DTrack(track) ? DEFAULT_TRACK_SIZE_2D : DEFAULT_TRACK_HEIGHT_LINEAR;
      }
      if ("displacement" in track) {
        if (((_a = track.displacement) == null ? void 0 : _a.type) === "pile" && track.row === void 0 && IsChannelDeep(track.x) && track.x.field && IsChannelDeep(track.xe) && track.xe.field) {
          const newField = uuid();
          const startField = track.x.field;
          const endField = track.xe.field;
          const padding = track.displacement.padding;
          const displaceTransform = {
            type: "displace",
            newField,
            boundingBox: { startField, endField, padding },
            method: "pile"
          };
          if (!track.dataTransform) {
            track.dataTransform = [];
          }
          track.dataTransform = [...track.dataTransform, displaceTransform];
          track.row = { field: newField, type: "nominal" };
        } else if (((_b = track.displacement) == null ? void 0 : _b.type) === "spread")
          ;
      }
      if (track.layout)
        track.layout = void 0;
      if (track.zoomLimits)
        track.zoomLimits = void 0;
      if (!track.assembly)
        track.assembly = spec.assembly;
      if (!track.layout)
        track.layout = spec.layout;
      if (!track.orientation)
        track.orientation = spec.orientation;
      if (track.static === void 0)
        track.static = spec.static !== void 0 ? spec.static : false;
      if (!track.zoomLimits)
        track.zoomLimits = spec.zoomLimits;
      if (track.layout == "circular" && IsDummyTrack(track)) {
        track._invalidTrack = true;
        return;
      }
      track.style = getStyleOverridden(spec.style, track.style);
      if (IsOverlaidTrack(track)) {
        track._overlay = track._overlay.filter((overlayTrack) => {
          return !("type" in overlayTrack && overlayTrack.type == "dummy-track");
        });
        track._overlay.forEach((o) => {
          o.style = getStyleOverridden(track.style, o.style);
        });
      }
      if ((track.layout === "circular" || Is2DTrack(track)) && track.orientation === "vertical") {
        track.orientation = "horizontal";
      }
      if (Is2DTrack(track)) {
        track.layout = "linear";
        if ((IsSingleTrack(track) || IsOverlaidTrack(track)) && IsChannelDeep(track.y) && !track.y.domain) {
          track.y.domain = spec.yDomain;
        } else if (IsOverlaidTrack(track)) {
          track._overlay.forEach((o) => {
            if (IsChannelDeep(o.y) && !o.y.domain) {
              o.y.domain = spec.yDomain;
            }
          });
        }
      }
      if ((IsSingleTrack(track) || IsOverlaidTrack(track)) && IsChannelDeep(track.x) && !track.x.domain) {
        track.x.domain = spec.xDomain;
      } else if (IsOverlaidTrack(track)) {
        track._overlay.forEach((o) => {
          if (IsChannelDeep(o.x) && !o.x.domain) {
            o.x.domain = spec.xDomain;
          }
        });
      }
      if ((IsSingleTrack(track) || IsOverlaidTrack(track)) && IsChannelDeep(track.x) && !track.x.linkingId) {
        track.x.linkingId = (_c = spec.linkingId) != null ? _c : linkID;
      } else if (IsOverlaidTrack(track)) {
        let isAdded = false;
        track._overlay.forEach((o) => {
          var _a2;
          if (isAdded)
            return;
          if (IsChannelDeep(o.x) && !o.x.linkingId) {
            o.x.linkingId = (_a2 = spec.linkingId) != null ? _a2 : linkID;
            isAdded = true;
          }
        });
      }
      if (i === 0) {
        track.overlayOnPreviousTrack = false;
      }
      if (i === 0 || i !== 0 && tracks.slice(0, i).filter((d) => !d.overlayOnPreviousTrack).length === 1 && track.overlayOnPreviousTrack === true) {
        if ((IsSingleTrack(track) || IsOverlaidTrack(track)) && IsChannelDeep(track.x) && !track.x.axis) {
          if (track.orientation === "vertical") {
            track.x.axis = "left";
          } else {
            track.x.axis = "top";
          }
        } else if (IsOverlaidTrack(track)) {
          track._overlay.forEach((o) => {
            if (IsChannelDeep(o.x) && !o.x.axis) {
              if (track.orientation === "vertical") {
                o.x.axis = "left";
              } else {
                o.x.axis = "top";
              }
            }
          });
        }
      }
      if ((IsSingleTrack(track) || IsOverlaidTrack(track)) && IsChannelDeep(track.x) && track.x.axis && track.x.axis !== "none") {
        if (track.orientation === "vertical") {
          if (track.x.axis === "top") {
            track.x.axis = "left";
          } else if (track.x.axis === "bottom") {
            track.x.axis = "right";
          }
        } else {
          if (track.x.axis === "left") {
            track.x.axis = "top";
          } else if (track.x.axis === "right") {
            track.x.axis = "bottom";
          }
        }
      } else if (IsOverlaidTrack(track)) {
        track._overlay.forEach((o) => {
          if (IsChannelDeep(o.x) && o.x.axis && o.x.axis !== "none") {
            if (track.orientation === "vertical") {
              if (o.x.axis === "top") {
                o.x.axis = "left";
              } else if (o.x.axis === "bottom") {
                o.x.axis = "right";
              }
            } else {
              if (o.x.axis === "left") {
                o.x.axis = "top";
              } else if (o.x.axis === "right") {
                o.x.axis = "bottom";
              }
            }
          }
        });
      }
      if (
        // first track can never flipped by default
        i !== 0 && // [0, ..., i] tracks should not overlaid as a single track
        (i === array.length - 1 && array.slice(0, i + 1).filter((d) => d.overlayOnPreviousTrack).length < i || // Are the rest of the tracks overlaid as a single track?
        i !== array.length - 1 && array.slice(i + 1).filter((d) => d.overlayOnPreviousTrack).length === array.length - i - 1 && array.slice(0, i + 1).filter((d) => d.overlayOnPreviousTrack).length < i)
      ) {
        if (IsSingleTrack(track) && track.mark === "withinLink" && track.flipY === void 0) {
          track.flipY = true;
        } else if (IsOverlaidTrack(track)) {
          if (track.mark === "withinLink" && track.flipY === void 0) {
            track.flipY = true;
          }
          track._overlay.forEach((o) => {
            if (o.mark === "withinLink" && o.flipY === void 0) {
              o.flipY = true;
            }
          });
        }
      }
      if (track.overlayOnPreviousTrack && array[i - 1]) {
        track.width = array[i - 1].width;
        track.height = array[i - 1].height;
        track.layout = array[i - 1].layout;
        track.assembly = array[i - 1].assembly;
      }
    });
    tracks = tracks.filter((track) => !track._invalidTrack);
    spec.tracks = tracks;
  } else {
    spec.views.forEach((v) => {
      traverseToFixSpecDownstream(v, spec);
    });
  }
}
function getVectorTemplate(column, value) {
  return {
    data: {
      type: "vector",
      url: "",
      column,
      value
    },
    mark: "bar",
    x: { field: column, type: "genomic", axis: "top" },
    y: { field: value, type: "quantitative" },
    width: 400,
    height: 100
  };
}
function getMultivecTemplate(row, column, value, categories) {
  return categories && categories.length < 10 ? {
    data: {
      type: "multivec",
      url: "",
      row,
      column,
      value,
      categories
    },
    mark: "bar",
    x: { field: column, type: "genomic", axis: "top" },
    y: { field: value, type: "quantitative" },
    row: { field: row, type: "nominal", legend: true },
    color: { field: row, type: "nominal" },
    width: 400,
    height: 100
  } : {
    data: {
      type: "multivec",
      url: "",
      row,
      column,
      value,
      categories
    },
    mark: "rect",
    x: { field: column, type: "genomic", axis: "top" },
    row: { field: row, type: "nominal", legend: true },
    color: { field: value, type: "quantitative" },
    width: 400,
    height: 100
  };
}
function overrideDataTemplates(spec) {
  traverseTracks(spec, (t, i, ts) => {
    var _a, _b, _c, _d, _e;
    if (!("data" in t) || !t.data || !IsDataDeepTileset(t.data)) {
      return;
    }
    if ("alignment" in t) {
      return;
    }
    if (!IsDataTemplate(t)) {
      return;
    }
    switch (t.data.type) {
      case "vector":
      case "bigwig":
        ts[i] = Object.assign(getVectorTemplate((_a = t.data.column) != null ? _a : "position", (_b = t.data.value) != null ? _b : "value"), t);
        break;
      case "multivec":
        ts[i] = Object.assign(
          getMultivecTemplate(
            (_c = t.data.row) != null ? _c : "category",
            (_d = t.data.column) != null ? _d : "position",
            (_e = t.data.value) != null ? _e : "value",
            t.data.categories
          ),
          t
        );
        break;
    }
  });
}
const CHROM_SIZE_HG38 = {
  chr1: 248956422,
  chr2: 242193529,
  chr3: 198295559,
  chr4: 190214555,
  chr5: 181538259,
  chr6: 170805979,
  chr7: 159345973,
  chr8: 145138636,
  chr9: 138394717,
  chr10: 133797422,
  chr11: 135086622,
  chr12: 133275309,
  chr13: 114364328,
  chr14: 107043718,
  chr15: 101991189,
  chr16: 90338345,
  chr17: 83257441,
  chr18: 80373285,
  chr19: 58617616,
  chr20: 64444167,
  chr21: 46709983,
  chr22: 50818468,
  chrX: 156040895,
  chrY: 57227415
};
const CHROM_SIZE_HG19 = {
  chr1: 249250621,
  chr2: 243199373,
  chr3: 198022430,
  chr4: 191154276,
  chr5: 180915260,
  chr6: 171115067,
  chr7: 159138663,
  chr8: 146364022,
  chr9: 141213431,
  chr10: 135534747,
  chr11: 135006516,
  chr12: 133851895,
  chr13: 115169878,
  chr14: 107349540,
  chr15: 102531392,
  chr16: 90354753,
  chr17: 81195210,
  chr18: 78077248,
  chr19: 59128983,
  chr20: 63025520,
  chr21: 48129895,
  chr22: 51304566,
  chrX: 155270560,
  chrY: 59373566,
  chrM: 16571
};
const CHROM_SIZE_HG18 = {
  chr1: 247249719,
  chr2: 242951149,
  chr3: 199501827,
  chr4: 191273063,
  chr5: 180857866,
  chr6: 170899992,
  chr7: 158821424,
  chr8: 146274826,
  chr9: 140273252,
  chr10: 135374737,
  chr11: 134452384,
  chr12: 132349534,
  chr13: 114142980,
  chr14: 106368585,
  chr15: 100338915,
  chr16: 88827254,
  chr17: 78774742,
  chr18: 76117153,
  chr19: 63811651,
  chr20: 62435964,
  chr21: 46944323,
  chr22: 49691432,
  chrX: 154913754,
  chrY: 57772954,
  chrM: 16571
};
const CHROM_SIZE_HG17 = {
  chr1: 245522847,
  chr2: 243018229,
  chr3: 199505740,
  chr4: 191411218,
  chr5: 180857866,
  chr6: 170975699,
  chr7: 158628139,
  chr8: 146274826,
  chr9: 138429268,
  chr10: 135413628,
  chr11: 134452384,
  chr12: 132449811,
  chr13: 114142980,
  chr14: 106368585,
  chr15: 100338915,
  chr16: 88827254,
  chr17: 78774742,
  chr18: 76117153,
  chr19: 63811651,
  chr20: 62435964,
  chr21: 46944323,
  chr22: 49554710,
  chrX: 154824264,
  chrY: 57701691,
  chrM: 16571
};
const CHROM_SIZE_HG16 = {
  chr1: 246127941,
  chr2: 243615958,
  chr3: 199344050,
  chr4: 191731959,
  chr5: 181034922,
  chr6: 170914576,
  chr7: 158545518,
  chr8: 146308819,
  chr9: 136372045,
  chr10: 135037215,
  chr11: 134482954,
  chr12: 132078379,
  chr13: 113042980,
  chr14: 105311216,
  chr15: 100256656,
  chr16: 90041932,
  chr17: 81860266,
  chr18: 76115139,
  chr19: 63811651,
  chr20: 63741868,
  chr21: 46976097,
  chr22: 49396972,
  chrX: 153692391,
  chrY: 50286555,
  chrM: 16571
};
const CHROM_SIZE_MM10 = {
  chr1: 195471971,
  chr2: 182113224,
  chr3: 160039680,
  chr4: 156508116,
  chr5: 151834684,
  chr6: 149736546,
  chr7: 145441459,
  chr8: 129401213,
  chr9: 124595110,
  chr10: 130694993,
  chr11: 122082543,
  chr12: 120129022,
  chr13: 120421639,
  chr14: 124902244,
  chr15: 104043685,
  chr16: 98207768,
  chr17: 94987271,
  chr18: 90702639,
  chr19: 61431566,
  chrX: 171031299,
  chrY: 91744698,
  chrM: 16299
};
const CHROM_SIZE_MM9 = {
  chr1: 197195432,
  chr2: 181748087,
  chr3: 159599783,
  chr4: 155630120,
  chr5: 152537259,
  chr6: 149517037,
  chr7: 152524553,
  chr8: 131738871,
  chr9: 124076172,
  chr10: 129993255,
  chr11: 121843856,
  chr12: 121257530,
  chr13: 120284312,
  chr14: 125194864,
  chr15: 103494974,
  chr16: 98319150,
  chr17: 95272651,
  chr18: 90772031,
  chr19: 61342430,
  chrX: 166650296,
  chrY: 15902555,
  chrM: 16299
};
function getRelativeGenomicPosition(absPos, assembly, returnWithinAssembly = false) {
  const chrSizes = Object.entries(computeChromSizes(assembly).interval);
  const minPosChr = { chromosome: "unknown", position: Infinity };
  const maxPosChr = { chromosome: "unknown", position: 0 };
  for (const chrSize of chrSizes) {
    const [chromosome, absInterval] = chrSize;
    const [start, end] = absInterval;
    if (start <= absPos && absPos < end) {
      return { chromosome, position: absPos - start };
    }
    if (start < minPosChr.position) {
      minPosChr.chromosome = chromosome;
      minPosChr.position = start;
    }
    if (end > maxPosChr.position) {
      maxPosChr.chromosome = chromosome;
      maxPosChr.position = end;
    }
  }
  if (returnWithinAssembly) {
    if (absPos < minPosChr.position) {
      return minPosChr;
    } else {
      return maxPosChr;
    }
  } else {
    return { chromosome: "unknown", position: absPos };
  }
}
function createChromSizesUrl(chromSizes) {
  const text = chromSizes.map((d) => d.join("	")).join("\n");
  const tsv = new Blob([text], { type: "text/tsv" });
  return URL.createObjectURL(tsv);
}
function computeChromSizes(assembly) {
  if (assembly && typeof assembly === "string" && assembly in CRHOM_SIZES) {
    return CRHOM_SIZES[assembly];
  } else if (Array.isArray(assembly) && assembly.length !== 0) {
    const size = Object.fromEntries(assembly);
    return {
      size,
      interval: getChromInterval(size),
      total: getChromTotalSize(size),
      path: createChromSizesUrl(assembly)
    };
  } else {
    return CRHOM_SIZES.hg38;
  }
}
const basePath = (assembly) => `https://s3.amazonaws.com/gosling-lang.org/data/${assembly}.chrom.sizes`;
const CRHOM_SIZES = Object.freeze({
  hg38: {
    size: CHROM_SIZE_HG38,
    interval: getChromInterval(CHROM_SIZE_HG38),
    total: getChromTotalSize(CHROM_SIZE_HG38),
    path: basePath("hg38")
  },
  hg19: {
    size: CHROM_SIZE_HG19,
    interval: getChromInterval(CHROM_SIZE_HG19),
    total: getChromTotalSize(CHROM_SIZE_HG19),
    path: basePath("hg19")
  },
  hg18: {
    size: CHROM_SIZE_HG18,
    interval: getChromInterval(CHROM_SIZE_HG18),
    total: getChromTotalSize(CHROM_SIZE_HG18),
    path: basePath("hg18")
  },
  hg17: {
    size: CHROM_SIZE_HG17,
    interval: getChromInterval(CHROM_SIZE_HG17),
    total: getChromTotalSize(CHROM_SIZE_HG17),
    path: basePath("hg17")
  },
  hg16: {
    size: CHROM_SIZE_HG16,
    interval: getChromInterval(CHROM_SIZE_HG16),
    total: getChromTotalSize(CHROM_SIZE_HG16),
    path: basePath("hg16")
  },
  mm10: {
    size: CHROM_SIZE_MM10,
    interval: getChromInterval(CHROM_SIZE_MM10),
    total: getChromTotalSize(CHROM_SIZE_MM10),
    path: basePath("mm10")
  },
  mm9: {
    size: CHROM_SIZE_MM9,
    interval: getChromInterval(CHROM_SIZE_MM9),
    total: getChromTotalSize(CHROM_SIZE_MM9),
    path: basePath("mm9")
  },
  // `unknown` assembly contains only one chromosome with max length
  unknown: {
    size: { chr: Number.MAX_VALUE },
    interval: { chr: [0, Number.MAX_VALUE] },
    total: Number.MAX_VALUE,
    path: basePath("hg38")
    // just to ensure this does not make crash
  }
});
function getAutoCompleteId(assembly) {
  switch (assembly) {
    case "hg19":
      return "OHJakQICQD6gTD7skx4EWA";
    case "mm10":
      return "QDutvmyiSrec5nX4pA5WGQ";
    case "mm9":
      return "GUm5aBiLRCyz2PsBea7Yzg";
    case "hg38":
    default:
      return "P0PLbQMwTYGy-5uPIQid7A";
  }
}
function getChromInterval(chromSize) {
  const interval = {};
  Object.keys(chromSize).reduce((sum, k) => {
    interval[k] = [sum, sum + chromSize[k]];
    return sum + chromSize[k];
  }, 0);
  return interval;
}
function getChromTotalSize(chromSize) {
  return Object.values(chromSize).reduce((sum, current) => sum + current, 0);
}
function parseGenomicPosition(position) {
  const [chromosome, intervalString] = position.split(":");
  if (intervalString) {
    const [start, end] = intervalString.split("-").map((s) => +s.replace(/,/g, ""));
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      return { chromosome, start, end };
    }
  }
  return { chromosome };
}
class GenomicPositionHelper {
  constructor(chromosome, start, end) {
    this.chromosome = chromosome;
    this.start = start;
    this.end = end;
  }
  static fromString(str) {
    const result = parseGenomicPosition(str);
    return new GenomicPositionHelper(result.chromosome, result.start, result.end);
  }
  toAbsoluteCoordinates(assembly, padding = 0) {
    const info = computeChromSizes(assembly);
    const size = info.size[this.chromosome];
    const interval = info.interval[this.chromosome];
    if (size === void 0 || interval === void 0) {
      throw new Error(`Chromosome name ${this.chromosome} is not valid`);
    }
    let { start, end } = this;
    if (start === void 0 || end === void 0) {
      [start, end] = [1, size];
    }
    const offset = interval[0];
    return [start + offset - padding, end + offset + padding];
  }
}
function filterUsingGenoPos(data2, [minX, maxX], config) {
  const { x, xe, x1, x1e } = config;
  const definedXFields = [x, xe, x1, x1e].filter((f) => f);
  return data2.filter((d) => {
    if (definedXFields.length === 0) {
      return true;
    } else if (definedXFields.length === 1) {
      const value = +d[definedXFields[0]];
      return typeof value === "number" && minX < value && value <= maxX;
    } else {
      const values = definedXFields.map((f) => +d[f]).filter((v) => !isNaN(v));
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      return minX <= maxValue && minValue <= maxX;
    }
  });
}
bisector((d) => d.pos).left;
function sanitizeChrName(chrName, assembly, chromosomePrefix) {
  if (Array.isArray(assembly)) {
    return chrName;
  }
  if (chromosomePrefix) {
    chrName = chrName.replace(chromosomePrefix, "chr");
  } else if (!chrName.includes("chr")) {
    chrName = `chr${chrName}`;
  }
  return chrName;
}
class RemoteFile extends RemoteFile$1 {
  constructor() {
    super(...arguments);
    // Overrides `read` to eagerly read 200 or 206 response
    // from https://github.com/GMOD/generic-filehandle/blob/0e8209be25e3097307bd15e964edd8c017e808d7/src/remoteFile.ts#L100-L162
    __publicField(this, "read", async (buffer, offset = 0, length, position = 0, opts = {}) => {
      const { headers = {}, signal, overrides = {} } = opts;
      if (length < Infinity) {
        headers.range = `bytes=${position}-${position + length}`;
      } else if (length === Infinity && position !== 0) {
        headers.range = `bytes=${position}-`;
      }
      const args = {
        // @ts-expect-error private property
        ...this.baseOverrides,
        ...overrides,
        headers: {
          ...headers,
          ...overrides.headers,
          // @ts-expect-error private property
          ...this.baseOverrides.headers
        },
        method: "GET",
        redirect: "follow",
        mode: "cors",
        signal
      };
      const response = await this.fetch(this.url, args);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} ${this.url}`);
      }
      if (response.status === 200 || response.status === 206) {
        const responseData = await this.getBufferFromResponse(response);
        const bytesCopied = responseData.copy(buffer, offset, 0, Math.min(length, responseData.length));
        const res = response.headers.get("content-range");
        const sizeMatch = /\/(\d+)$/.exec(res || "");
        if (sizeMatch && sizeMatch[1]) {
          this._stat = { size: parseInt(sizeMatch[1], 10) };
        }
        return { bytesRead: bytesCopied, buffer };
      }
      throw new Error(`HTTP ${response.status} fetching ${this.url}`);
    });
  }
}
export {
  IsDummyTrack as $,
  Ajv$1 as A,
  rectProperty as B,
  pointProperty as C,
  barProperty as D,
  IsStackedChannel as E,
  IsDomainArray as F,
  IsRangeArray as G,
  Is2DTrack as H,
  IsChannelDeep as I,
  isTabularDataFetcher as J,
  drawPreEmbellishment as K,
  drawMark as L,
  drawPostEmbellishment as M,
  getRelativeGenomicPosition as N,
  hasDataTransform as O,
  PREDEFINED_COLOR_STR_MAP as P,
  IsXAxis as Q,
  RADIAN_GAP as R,
  SUPPORTED_CHANNELS as S,
  IsMouseEventsDeep as T,
  colorToHex as U,
  flatArrayToPairArray as V,
  DEWFAULT_TITLE_PADDING_ON_TOP_AND_BOTTOM as W,
  traverseTracksAndViews as X,
  traverseViewArrangements as Y,
  DEFAULT_VIEW_SPACING as Z,
  DEFAULT_INNER_RADIUS_PROP as _,
  IsTemplateTrack as a,
  IsOverlaidTrack as a0,
  IsYAxis as a1,
  DEFAULT_CIRCULAR_VIEW_PADDING as a2,
  IsDataDeep as a3,
  IsHiGlassMatrix as a4,
  getHiGlassColorRange as a5,
  DEFAULT_TEXT_STYLE as a6,
  overrideDataTemplates as a7,
  traverseToFixSpecDownstream as a8,
  GenomicPositionHelper as a9,
  isObject as aa,
  getChromInterval as ab,
  getChromTotalSize as ac,
  parseGenomicPosition as ad,
  convertToFlatTracks as ae,
  spreadTracksByData as af,
  cartesianToPolar as b,
  computeChromSizes as c,
  commonjsGlobal as d,
  RemoteFile as e,
  IsOneOfFilter as f,
  getTextStyle as g,
  IsRangeFilter as h,
  IsIncludeFilter as i,
  getChannelKeysByAggregateFnc as j,
  getChannelKeysByType as k,
  filterUsingGenoPos as l,
  IsDataDeepTileset as m,
  IsDomainChr as n,
  IsDomainInterval as o,
  pointsToDegree as p,
  IsDomainChrInterval as q,
  resolveSuperposedTracks as r,
  sanitizeChrName as s,
  traverseTracks as t,
  uuid as u,
  valueToRadian as v,
  insertItemToArray as w,
  getAutoCompleteId as x,
  IsChannelValue as y,
  getValueUsingChannel as z
};
//# sourceMappingURL=exported-utils-c80467e4.js.map
