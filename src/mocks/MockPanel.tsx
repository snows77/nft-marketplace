import { useId, useState, useSyncExternalStore } from 'react'
import { FlaskConical, X } from 'lucide-react'
import { resetDemo } from './control'
import {
  applyPreset,
  getScenario,
  PRESETS,
  setScenario,
  subscribeScenario,
  type LatencyMode,
  type PresetName,
} from './scenario'

const LATENCY_LABEL: Record<LatencyMode, string> = {
  none: 'Sem atraso',
  normal: 'Normal (150 ms)',
  slow: 'Lenta (2,5 s)',
  variable: 'Variável (0,1–1,5 s)',
}

const fieldClass = 'w-full rounded border border-input bg-background px-2 py-1.5 text-caption'
const actionClass =
  'w-full rounded border border-border-soft px-3 py-1.5 text-left text-caption hover:border-primary hover:text-primary'

// Painel de demonstração: só existe quando os mocks estão ligados (VITE_ENABLE_MOCKS)
export function MockPanel() {
  const scenario = useSyncExternalStore(subscribeScenario, getScenario)
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const isDefault =
    scenario.preset === 'padrao' && scenario.latency === 'normal' && scenario.failures.length === 0

  return (
    <div className="fixed bottom-28 left-3 z-50 md:bottom-4">
      {open && (
        <section
          id={panelId}
          aria-label="Cenários da API simulada"
          className="mb-2 w-72 space-y-3 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Cenários da demo</h2>
            <button type="button" aria-label="Fechar painel" onClick={() => setOpen(false)}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <label className="block space-y-1 text-caption">
            <span>Preset</span>
            <select
              className={fieldClass}
              value={scenario.preset}
              onChange={(e) => applyPreset(e.target.value as PresetName)}
            >
              {Object.entries(PRESETS).map(([name, { label }]) => (
                <option key={name} value={name}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-caption">
            <span>Latência</span>
            <select
              className={fieldClass}
              value={scenario.latency}
              onChange={(e) => setScenario({ latency: e.target.value as LatencyMode })}
            >
              {Object.entries(LATENCY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <button
              type="button"
              className={actionClass}
              onClick={() =>
                setScenario({
                  failures: [
                    ...scenario.failures,
                    { method: 'GET', path: '/api/nfts', kind: 'http-500', times: 3 },
                  ],
                })
              }
            >
              Falhar próxima carga do catálogo (500)
            </button>
            {scenario.failures.length > 0 && (
              <p className="text-2xs text-muted-foreground" aria-live="polite">
                Falhas pendentes: {scenario.failures.length}
              </p>
            )}
            <button
              type="button"
              className={`${actionClass} border-destructive/60 text-destructive`}
              onClick={resetDemo}
            >
              Resetar dados da demo
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border-soft bg-popover px-3 py-1.5 text-2xs font-bold text-muted-foreground shadow-lg hover:text-primary"
      >
        <FlaskConical className="size-3.5" aria-hidden="true" />
        Cenários
        {!isDefault && <span className="rounded bg-primary px-1 text-primary-foreground">: {scenario.preset}</span>}
      </button>
    </div>
  )
}
