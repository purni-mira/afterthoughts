/* Afterthoughts — tiny SVG charts (no libraries). Colours come from CSS variables. */
(function (AT) {
  "use strict";
  const U = AT.u;
  const C = (AT.charts = {});

  /* Activity heatmap: weeks x 7 days, ending today */
  C.heatmap = function (days, weeks = 18) {
    const cell = 13, gap = 3, left = 22, topPad = 18;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay())); // end of this week (Sat)
    const start = new Date(end);
    start.setDate(start.getDate() - (weeks * 7 - 1));
    const w = left + weeks * (cell + gap), h = topPad + 7 * (cell + gap);
    let out = "", months = "", lastMonth = -1;
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let wk = 0; wk < weeks; wk++) {
      for (let dw = 0; dw < 7; dw++) {
        const d = new Date(start);
        d.setDate(start.getDate() + wk * 7 + dw);
        if (d > today) continue;
        const n = days[U.dayKey(d.getTime())] || 0;
        const lvl = n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4;
        out += '<rect class="hm' + lvl + '" x="' + (left + wk * (cell + gap)) + '" y="' + (topPad + dw * (cell + gap)) + '" width="' + cell + '" height="' + cell + '" rx="3"><title>' + U.esc(d.toDateString() + ": " + n + " activit" + (n === 1 ? "y" : "ies")) + "</title></rect>";
        if (dw === 0 && d.getMonth() !== lastMonth && d.getDate() <= 7) {
          lastMonth = d.getMonth();
          months += '<text class="ax" x="' + (left + wk * (cell + gap)) + '" y="11">' + names[lastMonth] + "</text>";
        }
      }
    }
    const dl = ["", "Mon", "", "Wed", "", "Fri", ""].map((t, i) => (t ? '<text class="ax" x="0" y="' + (topPad + i * (cell + gap) + 10) + '">' + t[0] + "</text>" : "")).join("");
    return '<svg class="chart heat" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Thinking activity over the last ' + weeks + ' weeks">' + months + dl + out + "</svg>";
  };

  /* Radar for the 5 thinking rungs */
  C.radar = function (values, labels) {
    const n = labels.length, cx = 150, cy = 128, R = 92;
    const max = Math.max(1, ...values);
    const pt = (i, r) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    let grid = "";
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      grid += '<polygon class="grid" points="' + labels.map((_, i) => pt(i, R * f).join(",")).join(" ") + '"/>';
    });
    labels.forEach((_, i) => {
      const [x, y] = pt(i, R);
      grid += '<line class="grid" x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '"/>';
    });
    const poly = values.map((v, i) => pt(i, Math.max(0.06, v / max) * R).join(",")).join(" ");
    const dots = values.map((v, i) => {
      const [x, y] = pt(i, Math.max(0.06, v / max) * R);
      return '<circle class="dot" cx="' + x + '" cy="' + y + '" r="3.5"><title>' + U.esc(labels[i] + ": " + v) + "</title></circle>";
    }).join("");
    const labs = labels.map((l, i) => {
      const [x, y] = pt(i, R + 18);
      const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
      return '<text class="lab" x="' + x + '" y="' + (y + 4) + '" text-anchor="' + anchor + '">' + U.esc(l) + ' <tspan class="ax">' + values[i] + "</tspan></text>";
    }).join("");
    return '<svg class="chart radar" viewBox="-50 0 400 256" role="img" aria-label="Thinking profile">' + grid + '<polygon class="area" points="' + poly + '"/>' + dots + labs + "</svg>";
  };

  /* Funnel from captured to posted */
  C.funnel = function (stages) {
    const max = Math.max(1, stages[0].value);
    return '<div class="funnel">' + stages.map((s, i) => {
      const pct = Math.round((s.value / max) * 100);
      const conv = i > 0 && max ? Math.round((s.value / max) * 100) + "%" : "";
      return '<div class="fn-row"><span class="fn-lab">' + U.esc(s.label) + '</span><span class="fn-bar"><span style="width:' + Math.max(pct, s.value ? 4 : 0) + '%"></span></span><span class="fn-val">' + s.value + (conv ? ' <small>' + conv + "</small>" : "") + "</span></div>";
    }).join("") + "</div>";
  };

  /* Ring gauge */
  C.ring = function (pct, label) {
    const r = 34, c = 2 * Math.PI * r, v = U.clamp(pct || 0, 0, 100);
    return '<svg class="chart ring" viewBox="0 0 84 84" role="img" aria-label="' + U.esc(label + " " + v + "%") + '"><circle class="track" cx="42" cy="42" r="' + r + '"/><circle class="val" cx="42" cy="42" r="' + r + '" stroke-dasharray="' + ((v / 100) * c).toFixed(1) + " " + c.toFixed(1) + '" transform="rotate(-90 42 42)"/><text x="42" y="47" text-anchor="middle" class="ringtxt">' + v + "</text></svg>";
  };

  /* Horizontal bars */
  C.bars = function (items) {
    const max = Math.max(1, ...items.map((i) => i.value));
    return '<div class="hbars">' + items.map((i) => '<div class="hb-row"><span class="hb-lab">' + U.esc(i.label) + '</span><span class="hb-bar"><span style="width:' + Math.round((i.value / max) * 100) + '%"></span></span><span class="hb-val">' + i.value + "</span></div>").join("") + "</div>";
  };

  /* Weekly sparkline of sessions for 8 weeks */
  C.spark = function (days, weeks = 8) {
    const vals = [];
    const end = new Date();
    for (let w = weeks - 1; w >= 0; w--) {
      let n = 0;
      for (let d = 0; d < 7; d++) {
        const t = new Date(end);
        t.setDate(end.getDate() - w * 7 - d);
        n += days[U.dayKey(t.getTime())] || 0;
      }
      vals.push(n);
    }
    const W = 120, H = 34, max = Math.max(1, ...vals);
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * (W - 6) + 3, H - 4 - (v / max) * (H - 10)]);
    const line = pts.map((p) => p.join(",")).join(" ");
    const area = "3," + (H - 2) + " " + line + " " + (W - 3) + "," + (H - 2);
    const last = pts[pts.length - 1];
    return '<svg class="chart spark" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true"><polygon class="sp-area" points="' + area + '"/><polyline class="sp-line" points="' + line + '"/><circle class="sp-dot" cx="' + last[0] + '" cy="' + last[1] + '" r="2.8"/></svg>';
  };
})(window.AT);
