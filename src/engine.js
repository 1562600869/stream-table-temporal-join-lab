export class JoinEngine {
  constructor(options={}){ this.allowedLatenessMs=options.allowedLatenessMs??0; this.results=[]; this.stats={joined:0,lateUpdates:0,watermark:0}; }
  async run(){ return this.results; }
}
