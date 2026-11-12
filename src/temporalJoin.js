function joinOne(event, table, keyField, tsField) {
  return {
    ...event,
    dim: table.getAsOf(event[keyField], event[tsField]),
  };
}

export function joinVersioned(events, table, { keyField = 'key', tsField = 'ts' } = {}) {
  return events.map((event) => joinOne(event, table, keyField, tsField));
}

export function rejoinLateDimension(events, table, options = {}) {
  return joinVersioned(events, table, options);
}
