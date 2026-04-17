const presets = {
  simple: '12\n24\n37\n45\n30\n18\n22',
  labeled: 'Apple, 42\nBanana, 15\nCherry, 31\nDate, 23\nElder, 38',
  weekly: 'Mon, 120\nTue, 145\nWed, 170\nThu, 155\nFri, 180\nSat, 90\nSun, 75',
  json: '[12, 24, 37, 45, 30, 18, 22, 28, 35, 41]'
};

const $ = id => document.getElementById(id);
const dataEl = $('data');
const typeEl = $('type');
const widthEl = $('width');
const heightEl = $('height');
const showValuesEl = $('showValues');
const showAxisEl = $('showAxis');
const styleEl = $('style');
const chartEl = $('chart');
const statusEl = $('status');

function fmtNum(n) {
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return String(n);
  return Number(n.toFixed(2)).toString();
}

function parse(text) {
  text = text.trim();
  if (!text) return [];

  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const j = JSON.parse(text);
      if (Array.isArray(j)) {
        return j.map((item, i) => {
          if (typeof item === 'number') return { label: String(i + 1), value: item };
          if (Array.isArray(item) && item.length >= 2) {
            return { label: String(item[0]), value: Number(item[1]) };
          }
          if (item && typeof item === 'object') {
            if ('label' in item && 'value' in item) {
              return { label: String(item.label), value: Number(item.value) };
            }
            const keys = Object.keys(item);
            if (keys.length === 1) return { label: keys[0], value: Number(item[keys[0]]) };
          }
          return null;
        }).filter(d => d && Number.isFinite(d.value));
      }
      if (j && typeof j === 'object') {
        return Object.entries(j)
          .map(([k, v]) => ({ label: k, value: Number(v) }))
          .filter(d => Number.isFinite(d.value));
      }
    } catch {
      // fall through to line parsing
    }
  }

  return text.split(/\r?\n/).map((line, i) => {
    line = line.trim();
    if (!line || line.startsWith('#')) return null;
    const m = line.match(/^(.+?)[\s,;:\t]+(-?\d+(?:\.\d+)?)\s*$/);
    if (m) return { label: m[1].trim(), value: Number(m[2]) };
    const n = Number(line);
    if (Number.isFinite(n)) return { label: String(i + 1), value: n };
    return null;
  }).filter(Boolean);
}

function renderHBar(data, opts) {
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value), 0);
  const range = max - min || 1;
  const labelWidth = Math.max(...data.map(d => d.label.length));
  const valStrs = data.map(d => fmtNum(d.value));
  const valWidth = opts.showValues ? Math.max(...valStrs.map(s => s.length)) : 0;
  const chrome = labelWidth + 3 + (opts.showValues ? valWidth + 1 : 0);
  const barArea = Math.max(4, opts.width - chrome);

  const full = opts.style === 'ascii' ? '#' : '█';
  const partials = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
  const sep = opts.style === 'ascii' ? '|' : '│';

  return data.map((d, i) => {
    const frac = (d.value - min) / range;
    const total = Math.max(0, frac * barArea);
    const whole = Math.floor(total);
    let bar = full.repeat(whole);
    if (opts.style === 'block') {
      const rem = total - whole;
      const idx = Math.floor(rem * 8);
      if (idx > 0) bar += partials[idx];
    }
    const label = d.label.padEnd(labelWidth);
    const val = opts.showValues ? ' ' + valStrs[i] : '';
    return `${label} ${sep} ${bar}${val}`;
  }).join('\n');
}

function renderVBar(data, opts) {
  const max = Math.max(...data.map(d => d.value), 0);
  const min = Math.min(...data.map(d => d.value), 0);
  const range = max - min || 1;
  const height = Math.max(3, opts.height);

  const axisWidth = opts.showAxis
    ? Math.max(fmtNum(max).length, fmtNum(min).length)
    : 0;

  const available = Math.max(data.length * 2, opts.width - axisWidth - 4);
  const slot = Math.max(2, Math.floor(available / data.length));
  const barW = Math.max(1, slot - 1);
  const gap = 1;

  const full = opts.style === 'ascii' ? '#' : '█';
  const levels = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  const rows = Array.from({ length: height }, () => '');

  data.forEach(d => {
    const frac = (d.value - min) / range;
    const eighths = Math.round(frac * height * 8);
    const wholeRows = Math.floor(eighths / 8);
    const rem = eighths % 8;

    for (let r = 0; r < height; r++) {
      const fromBottom = height - 1 - r;
      let ch = ' ';
      if (fromBottom < wholeRows) {
        ch = full;
      } else if (fromBottom === wholeRows && rem > 0 && opts.style === 'block') {
        ch = levels[rem - 1];
      }
      rows[r] += ch.repeat(barW) + ' '.repeat(gap);
    }
  });

  let body = rows;

  if (opts.showAxis) {
    const tick = opts.style === 'ascii' ? '|' : '┤';
    const corner = opts.style === 'ascii' ? '+' : '└';
    const hline = opts.style === 'ascii' ? '-' : '─';

    body = body.map((row, i) => {
      let lbl = ' '.repeat(axisWidth);
      if (i === 0) lbl = fmtNum(max).padStart(axisWidth);
      else if (i === height - 1) lbl = fmtNum(min).padStart(axisWidth);
      return `${lbl} ${tick} ${row.trimEnd()}`;
    });

    const xLen = (barW + gap) * data.length;
    body.push(`${' '.repeat(axisWidth)} ${corner}${hline.repeat(xLen + 1)}`);

    if (data.every(d => d.label.length <= slot)) {
      let xLabels = `${' '.repeat(axisWidth)}   `;
      data.forEach(d => { xLabels += d.label.padEnd(slot); });
      body.push(xLabels.trimEnd());
    }

    if (opts.showValues) {
      body.unshift('');
      const offset = axisWidth + 3;
      let valRow = ' '.repeat(offset);
      data.forEach(d => { valRow += fmtNum(d.value).padEnd(slot); });
      body[0] = valRow.trimEnd();
    }
  }

  return body.join('\n');
}

function renderLine(data, opts) {
  if (data.length < 2) return '(need at least 2 points for a line chart)';

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const height = Math.max(3, opts.height);

  const axisWidth = opts.showAxis
    ? Math.max(fmtNum(max).length, fmtNum(min).length)
    : 0;

  const plotWidth = Math.max(10, opts.width - axisWidth - 4);

  const cols = [];
  for (let c = 0; c < plotWidth; c++) {
    const t = (c / (plotWidth - 1)) * (data.length - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(data.length - 1, i0 + 1);
    const frac = t - i0;
    const v = data[i0].value * (1 - frac) + data[i1].value * frac;
    cols.push(Math.round((1 - (v - min) / range) * (height - 1)));
  }

  const grid = Array.from({ length: height }, () => Array(plotWidth).fill(' '));
  const point = opts.style === 'ascii' ? '*' : '●';
  const fill = opts.style === 'ascii' ? '.' : '·';

  for (let c = 0; c < plotWidth; c++) {
    grid[cols[c]][c] = point;
    if (c > 0) {
      const a = cols[c - 1];
      const b = cols[c];
      const [lo, hi] = a < b ? [a, b] : [b, a];
      for (let r = lo + 1; r < hi; r++) {
        if (grid[r][c] === ' ') grid[r][c] = fill;
      }
    }
  }

  let body = grid.map(row => row.join('').trimEnd());

  if (opts.showAxis) {
    const tick = opts.style === 'ascii' ? '|' : '┤';
    const corner = opts.style === 'ascii' ? '+' : '└';
    const hline = opts.style === 'ascii' ? '-' : '─';

    body = body.map((row, i) => {
      let lbl = ' '.repeat(axisWidth);
      if (i === 0) lbl = fmtNum(max).padStart(axisWidth);
      else if (i === height - 1) lbl = fmtNum(min).padStart(axisWidth);
      return `${lbl} ${tick} ${row}`;
    });

    body.push(`${' '.repeat(axisWidth)} ${corner}${hline.repeat(plotWidth + 1)}`);

    if (opts.showValues && data.length <= 10) {
      const firstLbl = data[0].label;
      const lastLbl = data[data.length - 1].label;
      const padLen = plotWidth + 3 - firstLbl.length - lastLbl.length;
      if (padLen > 0) {
        body.push(`${' '.repeat(axisWidth)}  ${firstLbl}${' '.repeat(padLen)}${lastLbl}`);
      }
    }
  }

  return body.join('\n');
}

function renderSpark(data, opts) {
  const values = data.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const levels = opts.style === 'ascii'
    ? ['_', '.', '-', '~', '=', '+', '*', '#']
    : ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  const line = values.map(v => {
    const idx = Math.min(levels.length - 1, Math.floor(((v - min) / range) * levels.length));
    return levels[Math.max(0, idx)];
  }).join('');

  if (opts.showValues) {
    return `${line}  (${fmtNum(min)} → ${fmtNum(max)})`;
  }
  return line;
}

function render() {
  const text = dataEl.value;
  const data = parse(text);

  if (!data.length) {
    chartEl.textContent = '';
    statusEl.textContent = text.trim() ? 'Could not parse any numbers.' : 'Paste some data to begin.';
    return;
  }

  const opts = {
    width: clamp(parseInt(widthEl.value, 10) || 40, 10, 200),
    height: clamp(parseInt(heightEl.value, 10) || 10, 3, 60),
    showValues: showValuesEl.checked,
    showAxis: showAxisEl.checked,
    style: styleEl.value
  };

  let out = '';
  switch (typeEl.value) {
    case 'hbar': out = renderHBar(data, opts); break;
    case 'vbar': out = renderVBar(data, opts); break;
    case 'line': out = renderLine(data, opts); break;
    case 'spark': out = renderSpark(data, opts); break;
  }

  chartEl.textContent = out;
  statusEl.textContent = `${data.length} point${data.length === 1 ? '' : 's'} · min ${fmtNum(Math.min(...data.map(d => d.value)))} · max ${fmtNum(Math.max(...data.map(d => d.value)))}`;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function updateFieldVisibility() {
  const needsHeight = typeEl.value === 'vbar' || typeEl.value === 'line';
  document.querySelector('.height-field').style.display = needsHeight ? '' : 'none';
}

function copy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  return Promise.resolve();
}

function flash(btn, msg) {
  const original = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = original; }, 1200);
}

document.querySelectorAll('.presets button').forEach(btn => {
  btn.addEventListener('click', () => {
    dataEl.value = presets[btn.dataset.preset] || '';
    render();
    saveState();
  });
});

$('copy').addEventListener('click', e => {
  const text = chartEl.textContent;
  if (!text) return;
  copy(text).then(() => flash(e.target, 'Copied'));
});

$('copyMd').addEventListener('click', e => {
  const text = chartEl.textContent;
  if (!text) return;
  copy('```\n' + text + '\n```').then(() => flash(e.target, 'Copied'));
});

function saveState() {
  try {
    localStorage.setItem('ascii-chart', JSON.stringify({
      data: dataEl.value,
      type: typeEl.value,
      width: widthEl.value,
      height: heightEl.value,
      showValues: showValuesEl.checked,
      showAxis: showAxisEl.checked,
      style: styleEl.value
    }));
  } catch {}
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem('ascii-chart') || 'null');
    if (!s) return false;
    dataEl.value = s.data || '';
    typeEl.value = s.type || 'hbar';
    widthEl.value = s.width || 40;
    heightEl.value = s.height || 10;
    showValuesEl.checked = s.showValues !== false;
    showAxisEl.checked = s.showAxis !== false;
    styleEl.value = s.style || 'block';
    return !!s.data;
  } catch { return false; }
}

['input', 'change'].forEach(evt => {
  document.addEventListener(evt, e => {
    if (e.target.closest('main')) {
      render();
      saveState();
    }
  });
});

if (!loadState()) {
  dataEl.value = presets.labeled;
}
updateFieldVisibility();
typeEl.addEventListener('change', updateFieldVisibility);
render();
