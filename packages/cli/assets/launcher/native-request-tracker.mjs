/** Expiry retires correlation only: an uncertain native request must never be replayed. */
export class NativeRequestTracker {
  constructor(limit = 64, timeoutMs = 120_000) {
    this.limit = limit
    this.timeoutMs = timeoutMs
    this.entries = new Map()
  }
  track(id, params) {
    if (this.entries.has(id) || this.entries.size >= this.limit) return false
    const timer = setTimeout(() => this.take(id), this.timeoutMs)
    timer.unref?.()
    this.entries.set(id, { params, timer })
    return true
  }
  take(id) {
    const entry = this.entries.get(id)
    if (!entry) return undefined
    clearTimeout(entry.timer)
    this.entries.delete(id)
    return entry.params
  }
  hasThread(threadId) {
    return [...this.entries.values()].some(entry => entry.params.threadId === threadId)
  }
  retireThread(threadId) {
    for (const [id, entry] of this.entries) {
      if (entry.params.threadId === threadId) this.take(id)
    }
  }
  clear() {
    for (const id of this.entries.keys()) this.take(id)
  }
}
