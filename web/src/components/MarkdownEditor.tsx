import { useState, useRef } from 'react'
import MarkdownContent from './MarkdownContent'
import { api } from '../api/client'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

export default function MarkdownEditor({ value, onChange, placeholder, minHeight = 200 }: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await api.uploadImage(file) as { url: string }
      const imageMarkdown = `![image](${result.url})`
      const textarea = textareaRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newValue = value.substring(0, start) + imageMarkdown + value.substring(end)
        onChange(newValue)
        // Restore cursor position after the inserted text
        setTimeout(() => {
          textarea.selectionStart = start + imageMarkdown.length
          textarea.selectionEnd = start + imageMarkdown.length
          textarea.focus()
        }, 0)
      } else {
        onChange(value + '\n' + imageMarkdown)
      }
    } catch {
      // silent fail — user can try again
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1 rounded-t-lg px-2 py-1.5" style={{ border: '1px solid var(--border)', borderBottom: 'none', background: 'var(--bg-page)' }}>
        <button type="button" onClick={() => setShowPreview(false)}
          className="rounded px-2 py-1 text-xs font-medium"
          style={{ color: !showPreview ? '#A29BFE' : '#6B6B80', background: !showPreview ? 'rgba(108,92,231,0.15)' : 'transparent' }}
        >Write</button>
        <button type="button" onClick={() => setShowPreview(true)}
          className="rounded px-2 py-1 text-xs font-medium"
          style={{ color: showPreview ? '#A29BFE' : '#6B6B80', background: showPreview ? 'rgba(108,92,231,0.15)' : 'transparent' }}
        >Preview</button>
        <div className="mx-2 h-4 w-px" style={{ background: 'var(--border)' }} />
        {[
          { label: 'B', md: '**', title: 'Bold' },
          { label: 'I', md: '_', title: 'Italic' },
          { label: '`', md: '`', title: 'Code' },
        ].map((btn) => (
          <button key={btn.label} type="button" title={btn.title}
            className="rounded px-1.5 py-1 text-xs"
            style={{ color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            onClick={() => onChange(value + btn.md + btn.md)}
          >{btn.label}</button>
        ))}
        <div className="mx-2 h-4 w-px" style={{ background: 'var(--border)' }} />
        {/* Image upload button */}
        <button
          type="button"
          title="Upload image (jpg, png, gif, webp)"
          disabled={uploading}
          className="rounded px-1.5 py-1 text-xs disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? '⏳' : '📷'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageUpload(file)
          }}
        />
      </div>
      {showPreview ? (
        <div className="rounded-b-lg p-4 text-sm"
          style={{ minHeight, fontFamily: "'DM Sans', sans-serif", border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
          {value ? <MarkdownContent content={value} /> : <span style={{ color: 'var(--text-muted)' }}>Nothing to preview</span>}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Write using Markdown...'}
          className="w-full rounded-b-lg p-4 text-sm placeholder-[#555568] outline-none"
          style={{ minHeight, fontFamily: "'DM Mono', monospace", resize: 'vertical', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#6C5CE7')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault()
              const start = e.currentTarget.selectionStart
              const end = e.currentTarget.selectionEnd
              onChange(value.substring(0, start) + '  ' + value.substring(end))
            }
          }}
        />
      )}
    </div>
  )
}
