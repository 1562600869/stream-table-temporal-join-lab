import { JoinEngine } from '../engine.js';

function setStatus(status, text) {
  if (status) status.textContent = text;
}

function renderResults(resultsEl, results) {
  if (!resultsEl) return;
  resultsEl.textContent = results.length === 0
    ? 'No join output yet. Click Run.'
    : results.map((row) => JSON.stringify(row)).join('\n');
}

function renderStats(statsEl, stats) {
  if (!statsEl) return;
  statsEl.textContent = [
    `joined: ${stats.joined}`,
    `lateUpdates: ${stats.lateUpdates}`,
    `watermark: ${stats.watermark}`,
  ].join('\n');
}

function drawTimeline(canvas, engine) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const padding = 36;
  const records = [
    ...engine.dimensions.map((record) => ({ ...record, kind: 'dimension' })),
    ...engine.events.map((record) => ({ ...record, kind: 'event' })),
  ];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#18212b';
  ctx.fillRect(0, 0, width, height);

  if (records.length === 0) {
    ctx.fillStyle = '#8fa3b8';
    ctx.fillText('Load fixtures to draw the event-time timeline', padding, padding);
    return;
  }

  const times = records.map((record) => record.ts);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times, engine.stats.watermark);
  const span = Math.max(1, maxTime - minTime);
  const xFor = (ts) => padding + ((ts - minTime) / span) * (width - padding * 2);

  ctx.strokeStyle = '#334456';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height / 2);
  ctx.lineTo(width - padding, height / 2);
  ctx.stroke();

  ctx.fillStyle = '#8fa3b8';
  ctx.font = '12px ui-sans-serif, system-ui';
  ctx.fillText(`t=${minTime}`, padding, height - 12);
  ctx.fillText(`t=${maxTime}`, width - padding - 42, height - 12);

  for (const record of engine.dimensions) {
    const x = xFor(record.ts);
    ctx.fillStyle = '#f4b860';
    ctx.fillRect(x - 3, padding, 6, height / 2 - padding);
    ctx.fillStyle = '#f4b860';
    ctx.fillText(`dim ${record.key}`, x - 18, padding - 8);
  }

  engine.events.forEach((record, index) => {
    const x = xFor(record.ts);
    const y = height / 2 + 18 + (index % 2) * 24;
    ctx.fillStyle = '#58c7ff';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c9d7e5';
    ctx.fillText(String(record.id ?? index), x - 3, y + 20);
  });

  if (engine.stats.watermark > 0) {
    const x = xFor(engine.stats.watermark);
    ctx.strokeStyle = '#95e0a4';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x, padding - 12);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#95e0a4';
    ctx.fillText('watermark', x - 28, padding - 16);
  }
}

function exportResults(results) {
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'temporal-join-results.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

export function bindControls(ctx) {
  const root = ctx.root ?? document;
  const latenessInput = ctx.latenessInput ?? root.querySelector('[data-key="lateness"]');
  const loadButton = ctx.loadButton ?? root.querySelector('#btn-load');
  const runButton = ctx.runButton ?? root.querySelector('#btn-run');
  const exportButton = ctx.exportButton ?? root.querySelector('#btn-export');
  const engine = ctx.engine ?? new JoinEngine({
    allowedLatenessMs: Number(latenessInput?.value ?? 0),
  });

  renderResults(ctx.results, engine.results);
  renderStats(ctx.stats, engine.stats);
  drawTimeline(ctx.canvas, engine);

  if (loadButton) {
    loadButton.addEventListener('click', async () => {
      try {
        setStatus(ctx.status, 'loading');
        engine.setAllowedLateness(latenessInput?.value ?? engine.allowedLatenessMs);
        await engine.loadFixtures();
        renderResults(ctx.results, []);
        drawTimeline(ctx.canvas, engine);
        setStatus(ctx.status, 'ready');
      } catch (error) {
        setStatus(ctx.status, `error: ${error.message || error}`);
      }
    });
  }

  if (runButton) {
    runButton.addEventListener('click', async () => {
      try {
        setStatus(ctx.status, 'running');
        engine.setAllowedLateness(latenessInput?.value ?? engine.allowedLatenessMs);
        const results = await engine.run();
        renderResults(ctx.results, results);
        renderStats(ctx.stats, engine.stats);
        drawTimeline(ctx.canvas, engine);
        setStatus(ctx.status, 'ready');
      } catch (error) {
        setStatus(ctx.status, `error: ${error.message || error}`);
      }
    });
  }

  if (exportButton) {
    exportButton.addEventListener('click', () => {
      try {
        if (engine.results.length === 0) {
          setStatus(ctx.status, 'Run the join before exporting');
          return;
        }
        exportResults(engine.results);
        setStatus(ctx.status, 'ready');
      } catch (error) {
        setStatus(ctx.status, `error: ${error.message || error}`);
      }
    });
  }

  return engine;
}
