import { beforeEach, describe, expect, it } from 'vitest'
import { localAdapter, isLocalStorageAvailable } from '@/lib/localAdapter'
import { useAppStore } from '@/stores/app.store'

describe('local storage adapter', () => {
  it('reports availability of the browser database', () => {
    expect(typeof isLocalStorageAvailable()).toBe('boolean')
  })

  it('round-trips a record', async () => {
    await localAdapter.put('projects', {
      id: 'p1',
      org_id: 'org-1',
      title: 'Borehole Project',
      is_demo: false,
    })
    const rows = await localAdapter.list('projects')
    expect(rows.find((row) => row.id === 'p1')).toMatchObject({ title: 'Borehole Project' })
  })

  it('round-trips a metadata value', async () => {
    await localAdapter.setMeta('unit-test-key', { hello: 'world' })
    const value = await localAdapter.getMeta<{ hello: string }>('unit-test-key')
    expect(value).toEqual({ hello: 'world' })
  })

  it('returns null for metadata that was never written', async () => {
    const value = await localAdapter.getMeta('never-written-key')
    expect(value).toBeNull()
  })
})

describe('resilience when storage is blocked', () => {
  beforeEach(() => {
    useAppStore.setState({ featureFlags: { module_grants: true } })
  })

  it('still applies a feature flag change even if persistence fails', async () => {
    // Simulate a browser that refuses storage, as in private browsing.
    const original = globalThis.indexedDB
    // @ts-expect-error deliberately removing the API for this test
    delete globalThis.indexedDB

    expect(() => useAppStore.getState().setFeatureFlag('module_grants', false)).not.toThrow()
    expect(useAppStore.getState().featureFlags.module_grants).toBe(false)

    // Give the rejected persistence promise a tick to settle without surfacing.
    await new Promise((resolve) => setTimeout(resolve, 0))

    globalThis.indexedDB = original
  })
})
