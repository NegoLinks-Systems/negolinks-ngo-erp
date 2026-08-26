import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import { repository, type QueryOptions } from '@/lib/repository'
import { organizationService } from '@/lib/services/auth.service'
import { generateDemoData, SCENARIO_SHAPES } from '@/lib/demoData'
import { DEMO_TABLES, TABLES } from '@/lib/tables'
import { useAppStore } from '@/stores/app.store'
import type { DemoScenarioId } from '@/constants'

/** Generic org-scoped collection hook used by every module. */
export const useCollection = <T,>(
  table: string,
  options: QueryOptions = {},
  enabled = true,
): UseQueryResult<T[]> => {
  const orgId = useAppStore((state) => state.session?.orgId)
  return useQuery({
    queryKey: ['collection', table, orgId, options],
    queryFn: () => repository.list<T>(table, options),
    enabled: Boolean(orgId) && enabled,
    staleTime: 1000 * 60 * 2,
  })
}

export const useRecord = <T,>(table: string, id: string | undefined): UseQueryResult<T | null> => {
  const orgId = useAppStore((state) => state.session?.orgId)
  return useQuery({
    queryKey: ['record', table, id, orgId],
    queryFn: () => repository.getById<T>(table, id as string),
    enabled: Boolean(orgId && id),
  })
}

export const useCreateRecord = <T,>(table: string, label = 'Record') => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<T>) =>
      repository.create<Record<string, unknown>>(table, input as Record<string, unknown>, label),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collection', table] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`${label} created`)
    },
    onError: (error: Error) => toast.error(error.message || `Unable to create ${label.toLowerCase()}`),
  })
}

export const useUpdateRecord = <T,>(table: string, label = 'Record') => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<T> }) =>
      repository.update<Record<string, unknown>>(table, id, changes as Record<string, unknown>, label),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collection', table] })
      void queryClient.invalidateQueries({ queryKey: ['record', table] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`${label} updated`)
    },
    onError: (error: Error) => toast.error(error.message || `Unable to update ${label.toLowerCase()}`),
  })
}

export const useDeleteRecord = (table: string, label = 'Record') => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.softDelete(table, id, label),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collection', table] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`${label} removed`)
    },
    onError: (error: Error) => toast.error(error.message || `Unable to remove ${label.toLowerCase()}`),
  })
}

/* --------------------------------------------------------- demo data */

export const useDemoData = () => {
  const queryClient = useQueryClient()
  const session = useAppStore((state) => state.session)
  const setDemoMode = useAppStore((state) => state.setDemoMode)
  const refreshOrganization = useAppStore((state) => state.refreshOrganization)

  const load = useMutation({
    mutationFn: async (scenario: DemoScenarioId) => {
      if (!session) throw new Error('No active session')
      // A reload replaces any existing demo footprint before inserting fresh data.
      for (const table of DEMO_TABLES) {
        await repository.purgeDemo(table)
      }
      const bundle = generateDemoData(session.orgId, scenario)
      for (const entry of bundle.tables) {
        await repository.createMany(entry.table, entry.rows)
      }
      await organizationService.update(session.orgId, {
        ...bundle.orgPatch,
        demo_mode: true,
      } as never)
      await repository.create(
        TABLES.jobRuns,
        {
          job_key: 'demo_data_load',
          status: 'success',
          duration_ms: 0,
          message: `Loaded ${SCENARIO_SHAPES[scenario].label} demo scenario`,
          ran_at: new Date().toISOString(),
        },
        'Demo data',
      )
      return bundle.summary
    },
    onSuccess: async (summary) => {
      setDemoMode(true)
      await refreshOrganization()
      await queryClient.invalidateQueries()
      const total = summary.reduce((acc, row) => acc + row.count, 0)
      toast.success(`Demo data loaded — ${total.toLocaleString()} records across all modules`)
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to load demo data'),
  })

  const remove = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No active session')
      let removed = 0
      for (const table of DEMO_TABLES) {
        removed += await repository.purgeDemo(table)
      }
      await organizationService.update(session.orgId, { demo_mode: false } as never)
      await repository.create(
        TABLES.jobRuns,
        {
          job_key: 'demo_data_delete',
          status: 'success',
          duration_ms: 0,
          message: `Removed ${removed} demo records`,
          ran_at: new Date().toISOString(),
        },
        'Demo data',
      )
      return removed
    },
    onSuccess: async (removed) => {
      setDemoMode(false)
      await refreshOrganization()
      await queryClient.invalidateQueries()
      toast.success(`Demo data deleted — ${removed.toLocaleString()} records removed. Real data untouched.`)
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to delete demo data'),
  })

  return { load, remove }
}
