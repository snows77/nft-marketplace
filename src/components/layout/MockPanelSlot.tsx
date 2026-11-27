import { useEffect, useState, type ComponentType } from 'react'

// O painel de cenários aparece quando os mocks terminam de ligar (a tela não espera por ele)
export function MockPanelSlot({ panel }: { panel: Promise<ComponentType | null> }) {
  const [Panel, setPanel] = useState<ComponentType | null>(null)
  useEffect(() => {
    void panel.then((component) => component && setPanel(() => component))
  }, [panel])
  return Panel ? <Panel /> : null
}
