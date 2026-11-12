export class VersionedTable {
  constructor(){ this._versions=new Map(); }
  upsert(key,value,ts){}
  getAsOf(key,ts){ return undefined; }
}
