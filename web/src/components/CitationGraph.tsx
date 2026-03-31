'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api/client'

interface GraphNode {
  id: string
  title: string
  author: string
  type: string
  score: number
  // Layout positions (computed client-side)
  x?: number
  y?: number
}

interface GraphEdge {
  source: string
  target: string
  type: string
}

interface CitationGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const EDGE_COLORS: Record<string, string> = {
  supports: '#00B894',
  contradicts: '#D63031',
  extends: '#6C5CE7',
  references: '#636E72',
  quotes: '#FDCB6E',
}

const EDGE_LABELS: Record<string, string> = {
  supports: 'supports',
  contradicts: 'contradicts',
  extends: 'extends',
  references: 'references',
  quotes: 'quotes',
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.substring(0, max - 1) + '\u2026'
}

interface CitationGraphProps {
  postId: string
  depth?: number
}

export default function CitationGraph({ postId, depth = 2 }: CitationGraphProps) {
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)
  const [graph, setGraph] = useState<CitationGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  useEffect(() => {
    if (!postId) return
    setLoading(true)
    api
      .getCitationGraph(postId, depth)
      .then((data: any) => {
        if (data && data.nodes && data.nodes.length > 1) {
          setGraph(data)
        } else {
          setGraph(null)
        }
      })
      .catch(() => setGraph(null))
      .finally(() => setLoading(false))
  }, [postId, depth])

  // Simple force-directed layout
  const computeLayout = useCallback((data: CitationGraphData): CitationGraphData => {
    const width = 700
    const height = Math.max(300, data.nodes.length * 60)
    const nodes = data.nodes.map((n, i) => ({
      ...n,
      x: width / 2 + (Math.cos((i / data.nodes.length) * Math.PI * 2) * width * 0.35),
      y: height / 2 + (Math.sin((i / data.nodes.length) * Math.PI * 2) * height * 0.35),
    }))

    // Put the current post in the center
    const centerIdx = nodes.findIndex((n) => n.id === postId)
    if (centerIdx >= 0) {
      nodes[centerIdx].x = width / 2
      nodes[centerIdx].y = height / 2
    }

    // Simple force simulation (a few iterations)
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    for (let iter = 0; iter < 50; iter++) {
      // Repulsion between all pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x! - nodes[i].x!
          const dy = nodes[j].y! - nodes[i].y!
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const force = 8000 / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          if (nodes[i].id !== postId) { nodes[i].x! -= fx; nodes[i].y! -= fy }
          if (nodes[j].id !== postId) { nodes[j].x! += fx; nodes[j].y! += fy }
        }
      }

      // Attraction along edges
      for (const edge of data.edges) {
        const src = nodeMap.get(edge.source)
        const tgt = nodeMap.get(edge.target)
        if (!src || !tgt) continue
        const dx = tgt.x! - src.x!
        const dy = tgt.y! - src.y!
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const force = (dist - 150) * 0.01
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        if (src.id !== postId) { src.x! += fx; src.y! += fy }
        if (tgt.id !== postId) { tgt.x! += fx; tgt.y! += fy }
      }

      // Keep nodes in bounds
      for (const n of nodes) {
        n.x = Math.max(80, Math.min(width - 80, n.x!))
        n.y = Math.max(40, Math.min(height - 40, n.y!))
      }
    }

    return { nodes, edges: data.edges }
  }, [postId])

  if (loading) return null
  if (!graph || graph.nodes.length <= 1) return null

  const layoutGraph = computeLayout(graph)
  const nodeMap = new Map(layoutGraph.nodes.map((n) => [n.id, n]))
  const svgHeight = Math.max(300, layoutGraph.nodes.length * 60)

  return (
    <div
      className="mt-6 rounded-xl p-5"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
    >
      <h2
        className="mb-3 text-sm font-semibold uppercase tracking-wider"
        style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-secondary)' }}
      >
        Citation Graph
      </h2>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        {Object.entries(EDGE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 16, height: 3, background: color, borderRadius: 2 }} />
            {EDGE_LABELS[type]}
          </span>
        ))}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 700 ${svgHeight}`}
        style={{ maxHeight: 500, overflow: 'visible' }}
      >
        <defs>
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <marker
              key={type}
              id={`arrow-${type}`}
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill={color} opacity={0.7} />
            </marker>
          ))}
        </defs>

        {/* Edges */}
        {layoutGraph.edges.map((edge, i) => {
          const src = nodeMap.get(edge.source)
          const tgt = nodeMap.get(edge.target)
          if (!src || !tgt) return null
          const color = EDGE_COLORS[edge.type] ?? '#636E72'
          const isHovered = hoveredNode === edge.source || hoveredNode === edge.target
          return (
            <line
              key={i}
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke={color}
              strokeWidth={isHovered ? 2.5 : 1.5}
              strokeOpacity={hoveredNode && !isHovered ? 0.15 : 0.6}
              markerEnd={`url(#arrow-${edge.type})`}
            />
          )
        })}

        {/* Nodes */}
        {layoutGraph.nodes.map((node) => {
          const isCurrent = node.id === postId
          const isHovered = hoveredNode === node.id
          const dimmed = hoveredNode !== null && !isHovered && !layoutGraph.edges.some(
            (e) => (e.source === hoveredNode && e.target === node.id) || (e.target === hoveredNode && e.source === node.id)
          ) && hoveredNode !== node.id
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              style={{ cursor: 'pointer', opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.2s' }}
              onClick={() => {
                if (!isCurrent) router.push(`/post/${node.id}`)
              }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <circle
                r={isCurrent ? 28 : 22}
                fill={isCurrent ? 'rgba(108,92,231,0.2)' : 'rgba(42,42,62,0.8)'}
                stroke={isCurrent ? '#6C5CE7' : isHovered ? '#A29BFE' : 'rgba(136,136,170,0.3)'}
                strokeWidth={isCurrent ? 2 : 1.5}
              />
              <text
                textAnchor="middle"
                dy={-6}
                fill={isCurrent ? '#E0E0F0' : '#C0C0D8'}
                fontSize={10}
                fontFamily="DM Sans, sans-serif"
                fontWeight={isCurrent ? 700 : 500}
              >
                {truncate(node.title, 18)}
              </text>
              <text
                textAnchor="middle"
                dy={8}
                fill="#8888AA"
                fontSize={8}
                fontFamily="DM Mono, monospace"
              >
                {node.author}
              </text>
              <text
                textAnchor="middle"
                dy={20}
                fill="#636E72"
                fontSize={8}
                fontFamily="DM Mono, monospace"
              >
                {node.score > 0 ? '+' : ''}{node.score}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
