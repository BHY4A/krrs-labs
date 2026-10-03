/* diagrams.js — структурные схемы динамических моделей (SVG) с численными параметрами варианта */
(function (root) {
  'use strict';
  const CH = 7.1;   // ширина символа моноширинного шрифта 12px

  function num(x) {
    if (!isFinite(x)) return '?';
    const a = Math.abs(x);
    if (a !== 0 && (a < 1e-3 || a >= 1e5)) return x.toExponential(3).replace('e', 'e').replace('+', '');
    return (+x.toPrecision(4)).toString();
  }
  const SUP = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶' };
  function poly(p, v) {
    v = v || 's';
    const n = p.length - 1; let s = '';
    p.forEach((c, i) => {
      if (c === 0) return;
      const pw = n - i, a = Math.abs(c);
      const cs = (pw > 0 && Math.abs(a - 1) < 1e-12) ? '' : num(a);
      const term = cs + (pw > 0 ? v + (pw > 1 ? SUP[pw] || '^' + pw : '') : '');
      s += (s === '' ? (c < 0 ? '−' : '') : (c < 0 ? '−' : '+')) + term;
    });
    return s || '0';
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function Diagram() { this.els = []; this.nodes = {}; this.W = 0; this.H = 0; }
  // блок: content = {num, den} | {text} ; x,y — центр
  Diagram.prototype.block = function (id, x, y, content, opt) {
    opt = opt || {};
    let w, h;
    if (content.den !== undefined) { w = Math.max(content.num.length, content.den.length) * CH + 18; h = 44; }
    else { const lines = String(content.text).split('\n'); w = Math.max(...lines.map(l => l.length)) * CH + 18; h = 18 + lines.length * 15; }
    if (opt.w) w = Math.max(w, opt.w);
    const n = { id, x, y, w, h, content, opt, kind: 'block' };
    this.nodes[id] = n; this.els.push(n); this.fit(x + w / 2 + 10, y + h / 2 + (opt.cap ? 18 : 6)); return n;
  };
  Diagram.prototype.sum = function (id, x, y, signs) { const n = { id, x, y, r: 9, signs: signs || {}, kind: 'sum' }; this.nodes[id] = n; this.els.push(n); this.fit(x + 20, y + 20); return n; };
  Diagram.prototype.text = function (x, y, t, anchor, cls) { this.els.push({ kind: 'text', x, y, t, anchor: anchor || 'middle', cls: cls || '' }); this.fit(x + 40, y + 10); };
  Diagram.prototype.wire = function (pts, arrow) { this.els.push({ kind: 'wire', pts, arrow: arrow !== false }); pts.forEach(p => this.fit(p[0] + 10, p[1] + 10)); };
  Diagram.prototype.dot = function (x, y) { this.els.push({ kind: 'dot', x, y }); };
  Diagram.prototype.fit = function (x, y) { this.W = Math.max(this.W, x); this.H = Math.max(this.H, y); };
  Diagram.prototype.port = function (id, side) {
    const n = this.nodes[id];
    if (n.kind === 'sum') return { l: [n.x - n.r, n.y], r: [n.x + n.r, n.y], t: [n.x, n.y - n.r], b: [n.x, n.y + n.r] }[side];
    return { l: [n.x - n.w / 2, n.y], r: [n.x + n.w / 2, n.y], t: [n.x, n.y - n.h / 2], b: [n.x, n.y + n.h / 2] }[side];
  };
  // последовательная цепочка блоков по горизонтали
  Diagram.prototype.chain = function (x0, y, items, gap) {
    gap = gap || 34; let x = x0; let prev = null;
    for (const it of items) {
      let n;
      if (it.sum) { n = this.sum(it.id, x + 9, y, it.signs); x += 18; }
      else {
        const tmp = it.content.den !== undefined ? Math.max(it.content.num.length, it.content.den.length) * CH + 18 : Math.max(...String(it.content.text).split('\n').map(l => l.length)) * CH + 18;
        const w = Math.max(tmp, (it.opt && it.opt.w) || 0);
        n = this.block(it.id, x + w / 2, y, it.content, it.opt); x += w;
      }
      if (prev) this.wire([this.port(prev.id, 'r'), this.port(n.id, 'l')]);
      if (it.labelBefore && prev) { const a = this.port(prev.id, 'r'), b = this.port(n.id, 'l'); this.text((a[0] + b[0]) / 2, y - 8, it.labelBefore, 'middle', 'sig'); }
      prev = n; x += gap;
    }
    return x - gap;
  };
  Diagram.prototype.svg = function (title) {
    const W = Math.ceil(this.W + 10), H = Math.ceil(this.H + 10);
    let s = `<svg class="ssdm" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title || 'Структурная схема')}" xmlns="http://www.w3.org/2000/svg">`;
    s += `<defs><marker id="arr" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arrowhead"/></marker></defs>`;
    for (const e of this.els) {
      if (e.kind === 'wire') s += `<polyline class="wire" points="${e.pts.map(p => p.join(',')).join(' ')}" ${e.arrow ? 'marker-end="url(#arr)"' : ''}/>`;
    }
    for (const e of this.els) {
      if (e.kind === 'block') {
        const x = e.x - e.w / 2, y = e.y - e.h / 2;
        s += `<rect class="blk${e.opt.accent ? ' acc' : ''}${e.opt.dashed ? ' dsh' : ''}" x="${x}" y="${y}" width="${e.w}" height="${e.h}" rx="2"/>`;
        if (e.content.den !== undefined) {
          s += `<text class="bt" x="${e.x}" y="${e.y - 6}" text-anchor="middle">${esc(e.content.num)}</text>`;
          s += `<line class="frac" x1="${x + 7}" x2="${x + e.w - 7}" y1="${e.y}" y2="${e.y}"/>`;
          s += `<text class="bt" x="${e.x}" y="${e.y + 15}" text-anchor="middle">${esc(e.content.den)}</text>`;
        } else {
          const lines = String(e.content.text).split('\n');
          lines.forEach((l, k) => { s += `<text class="bt" x="${e.x}" y="${e.y + 4 + (k - (lines.length - 1) / 2) * 15}" text-anchor="middle">${esc(l)}</text>`; });
        }
        if (e.opt.cap) s += `<text class="cap" x="${e.x}" y="${y + e.h + 13}" text-anchor="middle">${esc(e.opt.cap)}</text>`;
      } else if (e.kind === 'sum') {
        s += `<circle class="sum" cx="${e.x}" cy="${e.y}" r="${e.r}"/>`;
        s += `<line class="sumx" x1="${e.x - 6}" y1="${e.y - 6}" x2="${e.x + 6}" y2="${e.y + 6}"/><line class="sumx" x1="${e.x - 6}" y1="${e.y + 6}" x2="${e.x + 6}" y2="${e.y - 6}"/>`;
        const off = { l: [-15, -6], b: [-11, 21], t: [-11, -12], r: [13, -6] };
        for (const [side, sg] of Object.entries(e.signs)) { const o = off[side]; s += `<text class="sg" x="${e.x + o[0]}" y="${e.y + o[1]}">${sg === '-' ? '−' : '+'}</text>`; }
      } else if (e.kind === 'text') s += `<text class="lbl ${e.cls}" x="${e.x}" y="${e.y}" text-anchor="${e.anchor}">${esc(e.t)}</text>`;
      else if (e.kind === 'dot') s += `<circle class="dot" cx="${e.x}" cy="${e.y}" r="2.6"/>`;
    }
    return s + '</svg>';
  };

  /* ---------------- схемы лабораторных ---------------- */
  function lr2(R) {
    const o = R.lr1, d = new Diagram(), y = 110;
    d.text(10, y - 8, 'Uкс(s)', 'start', 'sig');
    const xe = d.chain(60, y, [
      { id: 's1', sum: true, signs: { l: '+', b: '-' } },
      { id: 'tp', content: { num: num(o.Ktp), den: poly([o.Ttp, 1]) }, labelBefore: 'ΔU' },
      { id: 's2', sum: true, signs: { l: '+', t: '-' }, labelBefore: 'Uтп' },
      { id: 'ia', content: { num: num(1 / o.Rr), den: poly([o.Te, 1]) } },
      { id: 's3', sum: true, signs: { l: '+', b: '-' }, labelBefore: '' },
      { id: 'wm', content: { num: num(o.Rr / (o.c * o.Tm)), den: 's' }, labelBefore: 'I(s)' }
    ], 40);
    d.wire([[10, y], d.port('s1', 'l')]);
    const xo = xe + 60; d.wire([d.port('wm', 'r'), [xo, y]]); d.text(xo + 4, y - 8, 'Ωдв(s)', 'start', 'sig');
    const xt = xe + 26; d.dot(xt, y);
    // противо-ЭДС
    const cx = (d.nodes.ia.x + d.nodes.s3.x) / 2;
    d.block('c', cx, 34, { text: 'c = ' + num(o.c) });
    d.wire([[xt, y], [xt, 34], d.port('c', 'r')]);
    d.wire([d.port('c', 'l'), [d.nodes.s2.x, 34], d.port('s2', 't')]);
    d.text(d.nodes.s2.x - 6, 70, 'E(s)', 'end', 'sig');
    // момент
    d.block('mc', d.nodes.s3.x - 60, 178, { num: '1', den: 'icη = ' + num(o.i * o.c * R.P.eta) });
    d.wire([[d.nodes.mc.x - d.nodes.mc.w / 2 - 50, 178], d.port('mc', 'l')]);
    d.text(d.nodes.mc.x - d.nodes.mc.w / 2 - 50, 170, 'Mc(s)', 'start', 'sig');
    d.wire([d.port('mc', 'r'), [d.nodes.s3.x, 178], d.port('s3', 'b')]);
    // ОС по скорости
    d.block('os', (d.nodes.s1.x + xt) / 2 + 40, 248, { num: num(o.Kos), den: poly([o.Tf, 1]) });
    d.wire([[xt, y], [xt, 248], d.port('os', 'r')]);
    d.wire([d.port('os', 'l'), [d.nodes.s1.x, 248], d.port('s1', 'b')]);
    d.text(d.nodes.s1.x + 6, 240, 'Uос(s)', 'start', 'sig');
    return d;
  }
  function speedChain(R, digital, uLabel) {
    const o = R.lr1, l3 = R.lr3, d = new Diagram(), y = 110;
    d.text(10, y - 8, uLabel || 'Uкс', 'start', 'sig');
    const items = [{ id: 's1', sum: true, signs: { l: '+', b: '-' } }];
    if (digital) {
      const bz = R.lr4.bz;
      items.push({ id: 'rc', content: { num: poly(bz.num.map(v => +v.toPrecision(5)), 'z'), den: poly(bz.den.map(v => +v.toPrecision(5)), 'z') }, opt: { accent: true, cap: 'Discrete State-Space, T0 = ' + num(R.P.T0) + ' с' }, labelBefore: 'ΔuΩ' });
      items.push({ id: 'zoh', content: { text: 'ZOH' }, opt: { cap: 'Zero-Order Hold' } });
    } else {
      items.push({ id: 'rc', content: { num: poly(l3.Wrc.num), den: poly(l3.Wrc.den) }, opt: { accent: true, cap: 'Wрс(s) — ПИД-регулятор' }, labelBefore: 'ΔuΩ' });
    }
    items.push({ id: 'tp', content: { num: num(o.Ktp), den: poly([o.Ttp, 1]) }, labelBefore: 'uрс' });
    items.push({ id: 'kdv', content: { text: num(R.lr2.Kdv) }, labelBefore: 'uтп' });
    items.push({ id: 's2', sum: true, signs: { l: '+', b: '-' } });
    items.push({ id: 'dv', content: { num: '1', den: poly([o.Te * o.Tm, o.Tm, 1]) } });
    const xe = d.chain(50, y, items, 36);
    d.wire([[10, y], d.port('s1', 'l')]);
    const xo = xe + 60; d.wire([d.port('dv', 'r'), [xo, y]]); d.text(xo + 4, y - 8, 'Ωдв', 'start', 'sig');
    const xt = xe + 24; d.dot(xt, y);
    // момент
    const fx = d.nodes.s2.x - 80;
    d.block('mf', fx, 186, { num: poly([o.Te, 1]), den: poly([0.1 * o.Te, 1]) });
    d.block('kmc', fx - d.nodes.mf.w / 2 - 50, 186, { text: num(l3.kMc) }, { cap: 'R/(ic²η)' });
    d.wire([d.port('kmc', 'r'), d.port('mf', 'l')]);
    const xm = d.nodes.kmc.x - d.nodes.kmc.w / 2 - 50;
    d.wire([[xm, 186], d.port('kmc', 'l')]); d.text(xm, 178, 'Mc', 'start', 'sig');
    d.wire([d.port('mf', 'r'), [d.nodes.s2.x, 186], d.port('s2', 'b')]);
    // ОС
    d.block('os', (d.nodes.s1.x + xt) / 2, 262, { num: num(o.Kos), den: poly([o.Tf, 1]) }, { cap: 'Wос(s) — тахогенератор с фильтром' });
    d.wire([[xt, y], [xt, 262], d.port('os', 'r')]);
    d.wire([d.port('os', 'l'), [d.nodes.s1.x, 262], d.port('s1', 'b')]);
    d.text(d.nodes.s1.x + 6, 254, 'uос', 'start', 'sig');
    return d;
  }
  function pos(R, kind, digital) {
    const o = R.lr1, d = new Diagram(), y = 90;
    const a = kind === 'pid' ? R.lr5.ap2 : R.lr5.ap1;
    d.text(10, y - 8, 'αз', 'start', 'sig');
    const items = [{ id: 's1', sum: true, signs: { l: '+', b: '-' } }, { id: 'kdp', content: { text: num(o.Kvt) }, opt: { cap: 'Kдп (ВТ)' }, labelBefore: 'Δα' }];
    if (digital) {
      const bz = kind === 'pid' ? R.lr6.bz62 : R.lr6.bz61;
      items.push({ id: 'rp', content: { num: poly(bz.num.map(v => +v.toPrecision(5)), 'z'), den: poly(bz.den.map(v => +v.toPrecision(5)), 'z') }, opt: { accent: true, cap: 'Wрп(z), T0 = ' + num(R.P.T0) + ' с' } });
      items.push({ id: 'zoh', content: { text: 'ZOH' } });
    } else if (kind === 'pid') {
      items.push({ id: 'rp', content: { text: num(a.K) + ' + ' + num(a.K / a.T1) + '/s' }, opt: { accent: true, cap: 'Kрп + (Kрп/T1)/s' } });
      items.push({ id: 'rp2', content: { num: poly([a.T2, 1]), den: poly([a.T3, 1]) }, opt: { accent: true } });
    } else {
      items.push({ id: 'rp', content: { num: num(a.K) + '(' + poly([a.T2, 1]) + ')', den: poly([a.T1, 1]) }, opt: { accent: true } });
      items.push({ id: 'rp2', content: { num: poly([a.T3, 1]), den: poly([a.T4, 1]) }, opt: { accent: true } });
    }
    items.push({ id: 'ks', content: { text: (digital ? 'Цифро-аналоговый\nконтур скорости' : 'Контур скорости\n(ЛР №3)') }, opt: { dashed: true }, labelBefore: 'Uкс' });
    items.push({ id: 'red', content: { num: '1', den: num(o.i) + 's' }, opt: { cap: 'редуктор 1/(is)' }, labelBefore: 'Ω' });
    const xe = d.chain(50, y, items, 34);
    d.wire([[10, y], d.port('s1', 'l')]);
    const xo = xe + 50; d.wire([d.port('red', 'r'), [xo, y]]); d.text(xo + 4, y - 8, 'α', 'start', 'sig');
    const xt = xe + 22; d.dot(xt, y);
    d.wire([[xt, y], [xt, 190], [d.nodes.s1.x, 190], d.port('s1', 'b')]);
    // момент
    const mx = d.nodes.ks.x + d.nodes.ks.w / 2 - 14;
    const yb = d.nodes.ks.y + d.nodes.ks.h / 2;
    d.wire([[mx, 165], [mx, yb]]);
    d.text(mx + 6, 160, kind === 'pid' ? 'Mc = M̈c⁰t²/2' : 'Mc = Ṁc⁰t', 'start', 'sig');
    return d;
  }

  const api = { lr2, speedChain, pos, poly, num };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DIAG = api;
})(typeof window !== 'undefined' ? window : globalThis);
