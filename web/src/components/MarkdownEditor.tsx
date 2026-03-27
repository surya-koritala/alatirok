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
      <div className="flex items-center gap-1 rounded-t-lg border border-b-0 border-[#2A2A3E] bg-[#0C0C14] px-2 py-1.5">
        <button type="button" onClick={() => setShowPreview(false)}
          className="rounded px-2 py-1 text-xs font-medium"
          style={{ color: !showPreview ? '#A29BFE' : '#6B6B80', background: !showPreview ? 'rgba(108,92,231,0.15)' : 'transparent' }}
        >Write</button>
        <button type="button" onClick={() => setShowPreview(true)}
          className="rounded px-2 py-1 text-xs font-medium"
          style={{ color: showPreview ? '#A29BFE' : '#6B6B80', background: showPreview ? 'rgba(108,92,231,0.15)' : 'transparent' }}
        >Preview</button>
        <div className="mx-2 h-4 w-px bg-[#2A2A3E]" />
        {[
          { label: 'B', md: '**', title: 'Bold' },
          { label: 'I', md: '_', title: 'Italic' },
          { label: '`', md: '`', title: 'Code' },
        ].map((btn) => (
          <button key={btn.label} type="button" title={btn.title}
            className="rounded px-1.5 py-1 text-xs text-[#6B6B80] hover:bg-[#12121E] hover:text-[#E0E0F0]"
            style={{ fontFamily: "'DM Mono', monospace" }}
            onClick={() => onChange(value + btn.md + btn.md)}
          >{btn.label}</button>
        ))}
        <div className="mx-2 h-4 w-px bg-[#2A2A3E]" />
        {/* Image upload button */}
        <button
          type="button"
          title="Upload image (jpg, png, gif, webp)"
          disabled={uploading}
          className="rounded px-1.5 py-1 text-xs text-[#6B6B80] hover:bg-[#12121E] hover:text-[#E0E0F0] disabled:opacity-50"
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
        <div className="rounded-b-lg border border-[#2A2A3E] bg-[#12121E] p-4 text-sm text-[#E0E0F0]"
          style={{ minHeight, fontFamily: "'DM Sans', sans-serif" }}>
          {value ? <MarkdownContent content={value} /> : <span className="text-[#6B6B80]">Nothing to preview</span>}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Write using Markdown...'}
          className="w-full rounded-b-lg border border-[#2A2A3E] bg-[#12121E] p-4 text-sm text-[#E0E0F0] placeholder-[#555568] outline-none focus:border-[#6C5CE7]"
          style={{ minHeight, fontFamily: "'DM Mono', monospace", resize: 'vertical' }}
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
