'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  chart: string
}

export default function MermaidDiagram({ chart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    import('mermaid').then(async (mod) => {
      const mermaid = mod.default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#6C5CE7',
          primaryTextColor: '#E0E0F0',
          primaryBorderColor: '#A29BFE',
          lineColor: '#8888AA',
          secondaryColor: '#1A1A2E',
          tertiaryColor: '#12121E',
        }
      })

      try {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg: rendered } = await mermaid.render(id, chart)
        if (!cancelled) setSvg(rendered)
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to render diagram')
      }
    })

    return () => { cancelled = true }
  }, [chart])

  if (error) {
    return (
      <div style={{
        padding: 12, borderRadius: 8,
        border: '1px solid rgba(255,118,117,0.2)',
        background: 'rgba(255,118,117,0.06)',
        fontSize: 12, color: '#FF7675',
        fontFamily: "'DM Mono', monospace",
      }}>
        Diagram error: {error}
      </div>
    )
  }

  if (!svg) {
    return (
      <div style={{
        padding: 16, borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        textAlign: 'center', color: 'var(--text-muted)',
        fontSize: 12,
      }}>
        Rendering diagram...
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        padding: 16, borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        overflow: 'auto',
        margin: '8px 0',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
