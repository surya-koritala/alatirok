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
  debates: { label: 'Debates', color: '#E17055', bg: 'rgba(225,112,85,0.12)' },
  research: { label: 'Research', color: '#6C5CE7', bg: 'rgba(108,92,231,0.12)' },
  synthesis: { label: 'Synthesis', color: '#00B894', bg: 'rgba(0,184,148,0.12)' },
  mixed: { label: 'Mixed', color: '#FDCB6E', bg: 'rgba(253,203,110,0.12)' },
}

function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] || {
    label: category,
    color: '#8888AA',
    bg: 'rgba(255,255,255,0.05)',
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
        border: `1px solid ${meta.color}33`,
        fontFamily: "'DM Sans', sans-serif",
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
            background: 'var(--bg-card, #12121E)',
            border: '1px solid var(--border, #2A2A3E)',
            borderRadius: 12,
            padding: '24px 28px',
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
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
            background: 'var(--bg-card, #12121E)',
            border: '1px solid rgba(225,112,85,0.3)',
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
              color: '#E17055',
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: 8,
            }}
          >
            {error || 'Dataset not found'}
          </div>
          <Link
            href="/datasets"
            style={{
              fontSize: 13,
              color: '#A29BFE',
              textDecoration: 'none',
              fontFamily: "'DM Sans', sans-serif",
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
            color: '#A29BFE',
            textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Datasets
        </Link>
        <span
          style={{
            margin: '0 8px',
            color: 'var(--text-muted, #6B6B80)',
            fontSize: 13,
          }}
        >
          /
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--text-secondary, #8888AA)',
            fontFamily: "'DM Sans', sans-serif",
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
              color: 'var(--text-primary, #E0E0F0)',
              fontFamily: "'Outfit', sans-serif",
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
                color: '#FDCB6E',
                background: 'rgba(253,203,110,0.12)',
                border: '1px solid rgba(253,203,110,0.3)',
                borderRadius: 4,
                padding: '2px 8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: "'DM Sans', sans-serif",
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
              color: 'var(--text-muted, #6B6B80)',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Created {new Date(dataset.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p
          style={{
            fontSize: 15,
            color: 'var(--text-secondary, #A0A0B8)',
            fontFamily: "'DM Sans', sans-serif",
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
            background: 'var(--bg-card, #12121E)',
            border: '1px solid var(--border, #2A2A3E)',
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
              color: '#A29BFE',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {(dataset.postCount ?? 0).toLocaleString()}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted, #6B6B80)',
              fontFamily: "'DM Sans', sans-serif",
              marginTop: 2,
            }}
          >
            Posts
          </div>
        </div>
        <div
          style={{
            background: 'var(--bg-card, #12121E)',
            border: '1px solid var(--border, #2A2A3E)',
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
              color: '#55EFC4',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {(dataset.commentCount ?? 0).toLocaleString()}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted, #6B6B80)',
              fontFamily: "'DM Sans', sans-serif",
              marginTop: 2,
            }}
          >
            Comments
          </div>
        </div>
        <div
          style={{
            background: 'var(--bg-card, #12121E)',
            border: '1px solid var(--border, #2A2A3E)',
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
              color: '#FDCB6E',
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {dataset.avgTrustScore.toFixed(1)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted, #6B6B80)',
              fontFamily: "'DM Sans', sans-serif",
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
          background: 'var(--bg-card, #12121E)',
          border: '1px solid var(--border, #2A2A3E)',
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
              color: 'var(--text-primary, #E0E0F0)',
              fontFamily: "'Outfit', sans-serif",
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
              fontFamily: "'DM Mono', monospace",
            }}
          >
            JSONL
          </span>
        </div>
        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            padding: '14px 16px',
            position: 'relative',
          }}
        >
          <code
            style={{
              fontSize: 12,
              color: '#55EFC4',
              fontFamily: "'DM Mono', monospace",
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
              background: 'rgba(108,92,231,0.2)',
              border: '1px solid rgba(108,92,231,0.3)',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: '#A29BFE',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
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
            background: '#6C5CE7',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif",
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
            border: '1px solid var(--border, #2A2A3E)',
            background: 'var(--bg-card, #12121E)',
            color: '#A29BFE',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
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
            background: 'var(--bg-card, #12121E)',
            border: '1px solid var(--border, #2A2A3E)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-primary, #E0E0F0)',
              fontFamily: "'Outfit', sans-serif",
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
                color: 'var(--text-muted, #6B6B80)',
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Loading preview...
            </div>
          ) : preview.length === 0 ? (
            <div
              style={{
                padding: '24px 0',
                textAlign: 'center',
                color: 'var(--text-muted, #6B6B80)',
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              No preview records available.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
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
                          ? '1px solid var(--border, #2A2A3E)'
                          : 'none',
                      padding: '8px 0',
                    }}
                  >
                    <pre
                      style={{
                        fontSize: 11,
                        color: '#55EFC4',
                        fontFamily: "'DM Mono', monospace",
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
