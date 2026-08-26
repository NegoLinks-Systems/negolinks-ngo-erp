import { useEffect, useState, type FC } from 'react'
import { Loader2 } from 'lucide-react'
import { FormField, NegoModal } from '@/components/negolinks/Primitives'
import { cn } from '@/lib/utils'

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'money'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'email'
  | 'tel'

export interface FieldDef {
  name: string
  label: string
  type: FieldType
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  hint?: string
  full?: boolean
  min?: number
  max?: number
  defaultValue?: string | number | boolean
}

export type FormValues = Record<string, string | number | boolean | string[] | null>

interface RecordFormProps {
  title: string
  description?: string
  fields: FieldDef[]
  initial?: FormValues
  isOpen: boolean
  submitting?: boolean
  onClose: () => void
  onSubmit: (values: FormValues) => void
  submitLabel?: string
}

const emptyFor = (field: FieldDef): string | number | boolean | string[] | null => {
  if (field.defaultValue !== undefined) return field.defaultValue
  switch (field.type) {
    case 'number':
    case 'money':
      return 0
    case 'checkbox':
      return false
    case 'multiselect':
      return []
    default:
      return ''
  }
}

export const RecordForm: FC<RecordFormProps> = ({
  title,
  description,
  fields,
  initial,
  isOpen,
  submitting,
  onClose,
  onSubmit,
  submitLabel = 'Save',
}) => {
  const [values, setValues] = useState<FormValues>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    const next: FormValues = {}
    fields.forEach((field) => {
      const supplied = initial?.[field.name]
      next[field.name] = supplied === undefined || supplied === null ? emptyFor(field) : supplied
    })
    setValues(next)
    setErrors({})
  }, [isOpen, fields, initial])

  const setValue = (name: string, value: FormValues[string]): void => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleSubmit = (): void => {
    const nextErrors: Record<string, string> = {}
    fields.forEach((field) => {
      if (!field.required) return
      const value = values[field.name]
      const missing =
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      if (missing) nextErrors[field.name] = `${field.label} is required`
    })
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    onSubmit(values)
  }

  return (
    <NegoModal
      title={title}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="nl-btn nl-btn-subtle" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="nl-btn nl-btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
            {submitLabel}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const value = values[field.name]
          const controlId = `field-${field.name}`
          return (
            <FormField
              key={field.name}
              label={field.label}
              required={field.required}
              error={errors[field.name]}
              hint={field.hint}
              className={cn(field.full && 'sm:col-span-2')}
              htmlFor={controlId}
            >
              {field.type === 'textarea' ? (
                <textarea
                  id={controlId}
                  className="nl-input min-h-[96px] resize-y"
                  placeholder={field.placeholder}
                  value={String(value ?? '')}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
              ) : field.type === 'select' ? (
                <select
                  id={controlId}
                  className="nl-input"
                  value={String(value ?? '')}
                  onChange={(event) => setValue(field.name, event.target.value)}
                >
                  <option value="">Select…</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'multiselect' ? (
                <div id={controlId} className="flex flex-wrap gap-1.5 rounded-lg border border-line bg-card-alt p-2">
                  {field.options?.map((option) => {
                    const selected = Array.isArray(value) && value.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          const current = Array.isArray(value) ? value : []
                          setValue(
                            field.name,
                            selected ? current.filter((item) => item !== option.value) : [...current, option.value],
                          )
                        }}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                          selected ? 'text-white' : 'text-ink-3 hover:text-ink',
                        )}
                        style={selected ? { background: 'var(--accent-primary)' } : { background: 'var(--bg-card)' }}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              ) : field.type === 'checkbox' ? (
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-card-alt px-3">
                  <input
                    id={controlId}
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) => setValue(field.name, event.target.checked)}
                    className="h-4 w-4 accent-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-ink-2">{field.placeholder ?? 'Enabled'}</span>
                </label>
              ) : (
                <input
                  id={controlId}
                  type={field.type === 'money' ? 'number' : field.type}
                  className="nl-input"
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  step={field.type === 'money' ? '0.01' : undefined}
                  value={String(value ?? '')}
                  onChange={(event) =>
                    setValue(
                      field.name,
                      field.type === 'number' || field.type === 'money'
                        ? event.target.value === ''
                          ? ''
                          : Number(event.target.value)
                        : event.target.value,
                    )
                  }
                />
              )}
            </FormField>
          )
        })}
      </div>
    </NegoModal>
  )
}
