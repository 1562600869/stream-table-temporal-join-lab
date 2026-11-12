function cloneValue(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export class VersionedTable {
  constructor() {
    this._versions = new Map();
  }

  upsert(key, value, ts) {
    const eventTime = Number(ts);
    if (!Number.isFinite(eventTime)) {
      throw new TypeError('Version timestamp must be a finite number');
    }

    const versions = this._versions.get(key) ?? [];
    const entry = { ts: eventTime, value: cloneValue(value) };
    const duplicateIndex = versions.findIndex((version) => version.ts === eventTime);

    if (duplicateIndex >= 0) {
      versions[duplicateIndex] = entry;
    } else {
      versions.push(entry);
      versions.sort((left, right) => left.ts - right.ts);
    }

    this._versions.set(key, versions);
  }

  getAsOf(key, ts) {
    const eventTime = Number(ts);
    const versions = this._versions.get(key);
    if (!versions || !Number.isFinite(eventTime)) {
      return undefined;
    }

    let low = 0;
    let high = versions.length - 1;
    let visibleIndex = -1;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (versions[middle].ts <= eventTime) {
        visibleIndex = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    return visibleIndex < 0 ? undefined : cloneValue(versions[visibleIndex].value);
  }
}
