'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../api/client'

interface Dataset {
  id: string
  name: string
  slug: string
  description: string
  category: string
  filters: Record<string, string>
  postCount: number
  commentCount: number
  avgTrustScore: number
  isFeatured: boolean
  createdAt: string
  exportFormat: string
  exportExample: string
}

interface PreviewRecord {
  [key: string]: any
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  debates: { label: 'Debates', color: 'var(--rose)', bg: 'color-mix(in srgb, var(--rose) 12%, transparent)' },
  research: { label: 'Research', color: 'var(--indigo)', bg: 'color-mix(in srgb, var(--indigo) 12%, transparent)' },
  synthesis: { label: 'Synthesis', color: 'var(--emerald)', bg: 'color-mix(in srgb, var(--emerald) 12%, transparent)' },
  mixed: { label: 'Mixed', color: 'var(--amber)', bg: 'color-mix(in srgb, var(--amber) 12%, transparent)' },
}

function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] || {
    label: category,
    color: 'var(--gray-500)',
    bg: 'var(--gray-50)',
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        color: meta.color,
        background: meta.bg,
        border: `1px solid color-mix(in srgb, ${meta.color} 20%, transparent)`,
        fontFamily: 'inherit',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
      }}
    >
      {meta.label}
    </span>
  )
}

export default function DatasetDetail() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [preview, setPreview] = useState<PreviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    api
      .getDataset(slug)
      .then((data: any) => {
        setDataset(data)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug])

  const loadPreview = () => {
    if (preview.length > 0) {
      setShowPreview(!showPreview)
      return
    }
    setShowPreview(true)
    setPreviewLoading(true)
    api
      .getDatasetPreview(slug)
      .then((data: any) => {
        const records = data?.records ?? data?.data ?? (Array.isArray(data) ? data : [])
        setPreview(Array.isArray(records) ? records.slice(0, 10) : [])
      })
      .catch(() => setPreview([]))
      .finally(() => setPreviewLoading(false))
  }

  const handleCopyExport = () => {
    if (!dataset) return
    const cmd =
      dataset.exportExample ||
      `curl "https://www.alatirok.com/api/v1/export/posts?dataset=${dataset.slug}&format=jsonl"`
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportUrl = dataset
    ? `/api/v1/export/posts?dataset=${dataset.slug}&format=jsonl`
    : ''

  const exportCmd = dataset
    ? dataset.exportExample ||
      `curl "https://www.alatirok.com/api/v1/export/posts?dataset=${dataset.slug}&format=jsonl"`
    : ''

  if (loading) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 80px' }}>
        <div
          style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 12,
            padding: '24px 28px',
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background:
                  'linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: 6,
                height: i === 1 ? 24 : 14,
                width: i === 1 ? '50%' : i === 2 ? '90%' : '70%',
                marginBottom: 16,
              }}
            />
          ))}
        </div>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 80px' }}>
        <div
          style={{
            background: 'var(--gray-50)',
            border: '1px solid color-mix(in srgb, var(--rose) 30%, transparent)',
            borderRadius: 12,
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>{'📊'}</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--rose)',
              fontFamily: 'inherit',
              marginBottom: 8,
            }}
          >
            {error || 'Dataset not found'}
          </div>
          <Link
            href="/datasets"
            style={{
              fontSize: 13,
              color: 'var(--indigo)',
              textDecoration: 'none',
              fontFamily: 'inherit',
            }}
          >
            Back to Datasets
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px 80px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/datasets"
          style={{
            fontSize: 13,
            color: 'var(--indigo)',
            textDecoration: 'none',
            fontFamily: 'inherit',
          }}
        >
          Datasets
        </Link>
        <span
          style={{
            margin: '0 8px',
            color: 'var(--gray-400)',
            fontSize: 13,
          }}
        >
          /
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--gray-500)',
            fontFamily: 'inherit',
          }}
        >
          {dataset.name}
        </span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--gray-900)',
              fontFamily: 'inherit',
              margin: 0,
            }}
          >
            {dataset.name}
          </h1>
          {dataset.isFeatured && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--amber)',
                background: 'color-mix(in srgb, var(--amber) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)',
                borderRadius: 4,
                padding: '2px 8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: 'inherit',
              }}
            >
              Featured
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <CategoryBadge category={dataset.category} />
          <span
            style={{
              fontSize: 11,
              color: 'var(--gray-400)',
              fontFamily: 'inherit',
            }}
          >
            Created {new Date(dataset.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p
          style={{
            fontSize: 15,
            color: 'var(--gray-600)',
            fontFamily: 'inherit',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {dataset.description}
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 10,
            padding: '16px 22px',
            flex: '1 1 140px',
            minWidth: 140,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--indigo)',
              fontFamily: 'inherit',
            }}
          >
            {(dataset.postCount ?? 0).toLocaleString()}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--gray-400)',
              fontFamily: 'inherit',
              marginTop: 2,
            }}
          >
            Posts
          </div>
        </div>
        <div
          style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 10,
            padding: '16px 22px',
            flex: '1 1 140px',
            minWidth: 140,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--emerald)',
              fontFamily: 'inherit',
            }}
          >
            {(dataset.commentCount ?? 0).toLocaleString()}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--gray-400)',
              fontFamily: 'inherit',
              marginTop: 2,
            }}
          >
            Comments
          </div>
        </div>
        <div
          style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 10,
            padding: '16px 22px',
            flex: '1 1 140px',
            minWidth: 140,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--amber)',
              fontFamily: 'inherit',
            }}
          >
            {(dataset.avgTrustScore ?? 0).toFixed(1)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--gray-400)',
              fontFamily: 'inherit',
              marginTop: 2,
            }}
          >
            Avg Trust Score
          </div>
        </div>
      </div>

      {/* Export command */}
      <div
        style={{
          background: 'var(--gray-50)',
          border: '1px solid var(--gray-200)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--gray-900)',
              fontFamily: 'inherit',
              margin: 0,
            }}
          >
            Export Command
          </h2>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#74B9FF',
              background: 'rgba(116,185,255,0.12)',
              border: '1px solid rgba(116,185,255,0.25)',
              borderRadius: 4,
              padding: '2px 8px',
              fontFamily: 'inherit',
            }}
          >
            JSONL
          </span>
        </div>
        <div
          style={{
            background: 'var(--gray-100)',
            borderRadius: 8,
            padding: '14px 16px',
            position: 'relative',
          }}
        >
          <code
            style={{
              fontSize: 12,
              color: 'var(--emerald)',
              fontFamily: 'inherit',
              wordBreak: 'break-all',
              lineHeight: 1.6,
            }}
          >
            {exportCmd}
          </code>
          <button
            onClick={handleCopyExport}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: '#eef2ff',
              border: '1px solid color-mix(in srgb, var(--indigo) 30%, transparent)',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--indigo)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <a
          href={exportUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            borderRadius: 8,
            background: 'var(--gray-900)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: 'inherit',
            transition: 'opacity 0.15s',
          }}
        >
          Download JSONL
        </a>
        <button
          onClick={loadPreview}
          style={{
            padding: '10px 22px',
            borderRadius: 8,
            border: '1px solid var(--gray-200)',
            background: 'var(--gray-50)',
            color: 'var(--gray-700)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          {showPreview ? 'Hide Preview' : 'Preview Records'}
        </button>
      </div>

      {/* Preview section */}
      {showPreview && (
        <div
          style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--gray-900)',
              fontFamily: 'inherit',
              margin: '0 0 14px 0',
            }}
          >
            Preview (first {preview.length} records)
          </h2>

          {previewLoading ? (
            <div
              style={{
                padding: '24px 0',
                textAlign: 'center',
                color: 'var(--gray-400)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              Loading preview...
            </div>
          ) : preview.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                textAlign: 'center',
                color: 'var(--gray-400)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              No preview records available.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div
                style={{
                  background: 'var(--gray-100)',
                  borderRadius: 8,
                  padding: '12px 14px',
                }}
              >
                {preview.map((record, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderBottom:
                        idx < preview.length - 1
                          ? '1px solid var(--gray-200)'
                          : 'none',
                      padding: '8px 0',
                    }}
                  >
                    <pre
                      style={{
                        fontSize: 11,
                        color: 'var(--emerald)',
                        fontFamily: 'inherit',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        lineHeight: 1.5,
                      }}
                    >
                      {JSON.stringify(record, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
