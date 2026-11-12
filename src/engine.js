import { VersionedTable } from './versionedTable.js';
import { joinVersioned, rejoinLateDimension } from './temporalJoin.js';

const DEFAULT_DIM_PATH = 'fixtures/dim.jsonl';
const DEFAULT_EVENT_PATH = 'fixtures/events.jsonl';

export class JoinEngine {
  constructor(options = {}) {
    this.dimPath = options.dimPath ?? DEFAULT_DIM_PATH;
    this.eventPath = options.eventPath ?? DEFAULT_EVENT_PATH;
    this.allowedLatenessMs = options.allowedLatenessMs ?? 0;
    this.keyField = options.keyField ?? 'key';
    this.tsField = options.tsField ?? 'ts';
    this.table = new VersionedTable();
    this.dimensions = [];
    this.events = [];
    this.processedEvents = [];
    this.results = [];
    this.stats = { joined: 0, lateUpdates: 0, watermark: 0 };
  }

  static parseJsonl(text) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  async _readText(path) {
    if (typeof document !== 'undefined') {
      const response = await fetch(new URL(path, document.baseURI));
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status}`);
      }
      return response.text();
    }

    const { readFile } = await import('node:fs/promises');
    return readFile(path, 'utf8');
  }

  async loadFixtures(dimPath = this.dimPath, eventPath = this.eventPath) {
    if (Array.isArray(dimPath) && Array.isArray(eventPath)) {
      this.dimensions = dimPath;
      this.events = eventPath;
    } else {
      const [dimText, eventText] = await Promise.all([
        this._readText(dimPath),
        this._readText(eventPath),
      ]);
      this.dimensions = JoinEngine.parseJsonl(dimText);
      this.events = JoinEngine.parseJsonl(eventText);
    }

    return { dimensions: this.dimensions, events: this.events };
  }

  async load() {
    return this.loadFixtures();
  }

  setAllowedLateness(ms) {
    const lateness = Number(ms);
    if (!Number.isFinite(lateness) || lateness < 0) {
      throw new RangeError('Allowed lateness must be a non-negative finite number');
    }
    this.allowedLatenessMs = lateness;
  }

  _joinOptions() {
    return { keyField: this.keyField, tsField: this.tsField };
  }

  applyDimensionUpdate(record) {
    const isLate = this.processedEvents.length > 0 && record.ts < this.stats.watermark;
    this.table.upsert(record.key, record.value, record.ts);

    if (!isLate) {
      return [];
    }

    this.stats.lateUpdates += 1;
    this.results = rejoinLateDimension(this.processedEvents, this.table, this._joinOptions());

    return this.results;
  }

  async run() {
    if (this.dimensions.length === 0 && this.events.length === 0) {
      await this.loadFixtures();
    }

    this.table = new VersionedTable();
    this.processedEvents = [];
    this.results = [];
    this.stats = { joined: 0, lateUpdates: 0, watermark: 0 };

    for (const record of this.dimensions) {
      this.applyDimensionUpdate(record);
    }

    const orderedEvents = [...this.events]
      .map((event, arrivalIndex) => ({ event, arrivalIndex }))
      .sort((left, right) =>
        left.event[this.tsField] - right.event[this.tsField] || left.arrivalIndex - right.arrivalIndex)
      .map(({ event }) => event);

    for (const event of orderedEvents) {
      this.stats.watermark = Math.max(
        this.stats.watermark,
        event[this.tsField] - this.allowedLatenessMs,
      );
      const [joined] = joinVersioned([event], this.table, this._joinOptions());
      this.processedEvents.push(event);
      this.results.push(joined);
      this.stats.joined = this.results.length;
    }

    return this.results;
  }
}
