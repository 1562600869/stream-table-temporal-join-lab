import { bindControls } from './ui/controls.js';
const status = document.querySelector('#status');
try {
  bindControls({ status, results: document.querySelector('#results'), stats: document.querySelector('#stats'), canvas: document.querySelector('#timeline') });
  status.textContent = 'ready';
} catch (err) { status.textContent = `error: ${err.message || err}`; }
