import { afterEach, describe, expect, it, vi } from 'vitest'
import { NativeRequestTracker } from '../packages/cli/assets/launcher/native-request-tracker.mjs'

afterEach(() => vi.useRealTimers())

describe('native recovery request tracking', () => {
  it('reclaims expired requests without replaying them or capturing a late response', () => {
    vi.useFakeTimers()
    const tracker = new NativeRequestTracker(64, 100)
    for (let id = 0; id < 64; id++) expect(tracker.track(id, { threadId: `lost-${id}`, input: ['private'] })).toBe(true)
    expect(tracker.track('full', { threadId: 'next' })).toBe(false)
    vi.advanceTimersByTime(100)
    expect(tracker.take(0)).toBeUndefined()
    expect(tracker.hasThread('lost-0')).toBe(false)
    expect(tracker.track('next', { threadId: 'next' })).toBe(true)
    tracker.clear()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('retires every request for a cancelled thread while preserving unrelated requests', () => {
    vi.useFakeTimers()
    const tracker = new NativeRequestTracker()
    tracker.track(1, { threadId: 'cancelled' })
    tracker.track(2, { threadId: 'cancelled' })
    tracker.track(3, { threadId: 'other' })
    expect(tracker.track(3, { threadId: 'changed' })).toBe(false)
    tracker.retireThread('cancelled')
    expect(tracker.take(1)).toBeUndefined()
    expect(tracker.take(2)).toBeUndefined()
    expect(tracker.take(3)).toEqual({ threadId: 'other' })
    expect(vi.getTimerCount()).toBe(0)
  })
})
