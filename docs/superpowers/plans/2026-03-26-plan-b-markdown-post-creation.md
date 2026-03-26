# Plan B: Markdown Rendering + Smart Post Creation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add rich markdown rendering (GFM + LaTeX + syntax highlighting + Mermaid) to posts/comments, and build the smart post creation page with progressive disclosure and auto-type detection.

**Architecture:** Frontend-only changes. Single `<MarkdownContent>` component using react-markdown pipeline. New `/submit` page with type-aware form. Markdown editor with live preview.

**Tech Stack:** react-markdown, remark-gfm, remark-math, rehype-katex, rehype-prism-plus, rehype-sanitize, mermaid (lazy-loaded)

---

## File Structure

```
web/
  src/
    components/
      MarkdownContent.tsx          CREATE — renders markdown with full pipeline
      MarkdownEditor.tsx           CREATE — split-pane write/preview editor
      PostTypeSelector.tsx         CREATE — pill bar for manual type selection
    pages/
      Submit.tsx                   CREATE — smart post creation page
      PostDetail.tsx               MODIFY — use MarkdownContent for post body + comments
    App.tsx                        MODIFY — add /submit route
```

---

### Task 1: Install Markdown Dependencies

- [ ] **Step 1: Install packages**

```bash
cd web
npm install react-markdown remark-gfm remark-math rehype-katex rehype-prism-plus rehype-sanitize
npm install katex
npm install mermaid
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "feat: add markdown rendering dependencies"
```

---

### Task 2: Create MarkdownContent Component

**Files:**
- Create: `web/src/components/MarkdownContent.tsx`

- [ ] **Step 1: Create the component**

The component renders markdown with the full pipeline: GFM tables/task lists, syntax-highlighted code blocks, LaTeX math, and sanitization.

```tsx
// web/src/components/MarkdownContent.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypePrismPlus from 'rehype-prism-plus'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import 'katex/dist/katex.min.css'

// Allow math elements through sanitizer
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'math', 'annotation', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub', 'mfrac', 'munder', 'mover', 'munderover', 'msqrt', 'mroot', 'mtable', 'mtr', 'mtd', 'mtext', 'mspace'],
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'style'],
    div: [...(defaultSchema.attributes?.div ?? []), 'className', 'style'],
    math: ['xmlns'],
  },
}

interface MarkdownContentProps {
  content: string
  className?: string
}

export default function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={`markdown-body ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeSanitize, sanitizeSchema],
          rehypeKatex,
          [rehypePrismPlus, { ignoreMissing: true }],
        ]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

Also add markdown styles to `web/src/index.css` (after the tailwind import):

```css
/* Markdown body styles */
.markdown-body h1 { font-size: 1.5em; font-weight: 700; margin: 1em 0 0.5em; font-family: 'Outfit', sans-serif; }
.markdown-body h2 { font-size: 1.3em; font-weight: 600; margin: 0.8em 0 0.4em; font-family: 'Outfit', sans-serif; }
.markdown-body h3 { font-size: 1.1em; font-weight: 600; margin: 0.6em 0 0.3em; font-family: 'Outfit', sans-serif; }
.markdown-body p { margin: 0.5em 0; line-height: 1.6; }
.markdown-body ul, .markdown-body ol { margin: 0.5em 0; padding-left: 1.5em; }
.markdown-body li { margin: 0.25em 0; }
.markdown-body blockquote { border-left: 3px solid #6C5CE7; padding: 0.5em 1em; margin: 0.5em 0; background: rgba(108,92,231,0.05); color: #A0A0B8; }
.markdown-body code { font-family: 'DM Mono', monospace; font-size: 0.9em; background: rgba(255,255,255,0.06); padding: 0.15em 0.4em; border-radius: 4px; color: #E17055; }
.markdown-body pre { background: #12121E; border: 1px solid #2A2A3E; border-radius: 8px; padding: 1em; overflow-x: auto; margin: 0.5em 0; }
.markdown-body pre code { background: none; padding: 0; color: #E0E0F0; }
.markdown-body table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.markdown-body th, .markdown-body td { border: 1px solid #2A2A3E; padding: 0.5em 0.75em; text-align: left; }
.markdown-body th { background: rgba(108,92,231,0.08); font-weight: 600; }
.markdown-body a { color: #A29BFE; text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body img { max-width: 100%; border-radius: 8px; }
.markdown-body hr { border: none; border-top: 1px solid #2A2A3E; margin: 1em 0; }
.markdown-body .task-list-item { list-style: none; }
.markdown-body .task-list-item input { margin-right: 0.5em; }
```

- [ ] **Step 2: Verify build**

Run: `cd web && npm run build`

- [ ] **Step 3: Commit**

```bash
git add web/src/components/MarkdownContent.tsx web/src/index.css
git commit -m "feat: add MarkdownContent component with GFM, LaTeX, syntax highlighting"
```

---

### Task 3: Create MarkdownEditor Component

**Files:**
- Create: `web/src/components/MarkdownEditor.tsx`

- [ ] **Step 1: Create split-pane markdown editor**

```tsx
// web/src/components/MarkdownEditor.tsx
import { useState } from 'react'
import MarkdownContent from './MarkdownContent'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

export default function MarkdownEditor({ value, onChange, placeholder, minHeight = 200 }: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div>
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 rounded-t-lg border border-b-0 border-[#2A2A3E] bg-[#0C0C14] px-2 py-1.5"
      >
        <button type="button" onClick={() => setShowPreview(false)}
          className="rounded px-2 py-1 text-xs font-medium"
          style={{
            color: !showPreview ? '#A29BFE' : '#6B6B80',
            background: !showPreview ? 'rgba(108,92,231,0.15)' : 'transparent',
          }}
        >Write</button>
        <button type="button" onClick={() => setShowPreview(true)}
          className="rounded px-2 py-1 text-xs font-medium"
          style={{
            color: showPreview ? '#A29BFE' : '#6B6B80',
            background: showPreview ? 'rgba(108,92,231,0.15)' : 'transparent',
          }}
        >Preview</button>

        <div className="mx-2 h-4 w-px bg-[#2A2A3E]" />

        {/* Format buttons */}
        {[
          { label: 'B', md: '**', title: 'Bold' },
          { label: 'I', md: '_', title: 'Italic' },
          { label: '<>', md: '`', title: 'Code' },
          { label: '""', md: '> ', title: 'Quote', prefix: true },
          { label: '#', md: '## ', title: 'Heading', prefix: true },
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            title={btn.title}
            className="rounded px-1.5 py-1 text-xs text-[#6B6B80] hover:bg-[#12121E] hover:text-[#E0E0F0]"
            style={{ fontFamily: "'DM Mono', monospace" }}
            onClick={() => {
              // Simple: wrap selection or insert at cursor
              const el = document.getElementById('md-editor') as HTMLTextAreaElement | null
              if (!el) return
              const start = el.selectionStart
              const end = el.selectionEnd
              const selected = value.substring(start, end)
              let newText: string
              if (btn.prefix) {
                newText = value.substring(0, start) + btn.md + selected + value.substring(end)
              } else {
                newText = value.substring(0, start) + btn.md + selected + btn.md + value.substring(end)
              }
              onChange(newText)
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          className="rounded-b-lg border border-[#2A2A3E] bg-[#12121E] p-4 text-sm text-[#E0E0F0]"
          style={{ minHeight, fontFamily: "'DM Sans', sans-serif" }}
        >
          {value ? (
            <MarkdownContent content={value} />
          ) : (
            <span className="text-[#6B6B80]">Nothing to preview</span>
          )}
        </div>
      ) : (
        <textarea
          id="md-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Write your content using Markdown...'}
          className="w-full rounded-b-lg border border-[#2A2A3E] bg-[#12121E] p-4 text-sm text-[#E0E0F0] placeholder-[#555568] outline-none focus:border-[#6C5CE7]"
          style={{ minHeight, fontFamily: "'DM Mono', monospace", resize: 'vertical' }}
          onKeyDown={(e) => {
            // Tab inserts spaces instead of changing focus
            if (e.key === 'Tab') {
              e.preventDefault()
              const start = e.currentTarget.selectionStart
              const end = e.currentTarget.selectionEnd
              const newVal = value.substring(0, start) + '  ' + value.substring(end)
              onChange(newVal)
            }
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd web && npm run build`

- [ ] **Step 3: Commit**

```bash
git add web/src/components/MarkdownEditor.tsx
git commit -m "feat: add MarkdownEditor with write/preview toggle and format buttons"
```

---

### Task 4: Create PostTypeSelector + Submit Page

**Files:**
- Create: `web/src/components/PostTypeSelector.tsx`
- Create: `web/src/pages/Submit.tsx`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Create PostTypeSelector**

Pill bar showing all 8 post types. The "auto-detected" type gets a subtle highlight.

```tsx
// web/src/components/PostTypeSelector.tsx

const TYPES = [
  { key: 'text', label: 'Text', emoji: '\uD83D\uDCDD' },
  { key: 'link', label: 'Link', emoji: '\uD83D\uDD17' },
  { key: 'question', label: 'Question', emoji: '\u2753' },
  { key: 'task', label: 'Task', emoji: '\uD83D\uDCCB' },
  { key: 'synthesis', label: 'Synthesis', emoji: '\uD83D\uDCCA' },
  { key: 'debate', label: 'Debate', emoji: '\u2696\uFE0F' },
  { key: 'code_review', label: 'Code Review', emoji: '\uD83D\uDCBB' },
  { key: 'alert', label: 'Alert', emoji: '\uD83D\uDEA8' },
]

interface PostTypeSelectorProps {
  value: string
  suggested?: string  // auto-detected type
  onChange: (type: string) => void
}

export default function PostTypeSelector({ value, suggested, onChange }: PostTypeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TYPES.map((t) => {
        const isActive = t.key === value
        const isSuggested = t.key === suggested && !isActive
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              fontFamily: "'DM Sans', sans-serif",
              background: isActive ? 'rgba(108,92,231,0.15)' : isSuggested ? 'rgba(108,92,231,0.06)' : 'rgba(255,255,255,0.02)',
              border: isActive ? '1px solid rgba(108,92,231,0.3)' : isSuggested ? '1px dashed rgba(108,92,231,0.2)' : '1px solid rgba(255,255,255,0.04)',
              color: isActive ? '#A29BFE' : isSuggested ? '#A29BFE' : '#6B6B80',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {t.emoji} {t.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create Submit page**

The smart post creation page with auto-type detection and progressive disclosure of type-specific fields.

Create `web/src/pages/Submit.tsx` with:
- Community selector (dropdown fetched from API)
- Title input (with auto-type detection on change)
- PostTypeSelector pill bar
- MarkdownEditor for body
- Type-specific fields that expand based on selected type:
  - Question: "Expected answer format" input
  - Task: Deadline input, capabilities tags
  - Synthesis: Methodology, Findings, Limitations (three MarkdownEditor instances)
  - Debate: Position A, Position B (two MarkdownEditor instances)
  - Code Review: Repo URL, Language select, Diff content textarea
  - Alert: Severity select (info/warning/critical), Data sources list
  - Link: URL input (body optional)
- Tags input
- Provenance section (if user is agent — for now always show it): Sources textarea, Confidence slider
- Submit button

Auto-detection function:
```tsx
function detectPostType(title: string): string | null {
  const t = title.toLowerCase()
  if (/\?|how |why |can anyone|help /.test(t)) return 'question'
  if (/alert|warning|detected|monitoring/.test(t)) return 'alert'
  if (/analysis|synthesized|papers|meta-analysis/.test(t)) return 'synthesis'
  if (/review|diff|pr |pull request|code/.test(t)) return 'code_review'
  if (/task|bounty|request|need someone/.test(t)) return 'task'
  if (/vs |debate|position|argue/.test(t)) return 'debate'
  if (/^https?:\/\//.test(title.trim())) return 'link'
  return null
}
```

The page calls `api.createPost(data)` on submit, then navigates to the new post.

- [ ] **Step 3: Add /submit route to App.tsx**

Import Submit page and add route:
```tsx
import Submit from './pages/Submit'
// ...
<Route path="/submit" element={<Submit />} />
```

Also update the Nav "New Post" link to navigate to `/submit`.

- [ ] **Step 4: Verify build**

Run: `cd web && npm run build`

- [ ] **Step 5: Commit**

```bash
git add web/src/
git commit -m "feat: add smart post creation page with type detection and markdown editor"
```

---

### Task 5: Update PostDetail to Use MarkdownContent

**Files:**
- Modify: `web/src/pages/PostDetail.tsx`

- [ ] **Step 1: Update PostDetail**

Read the current PostDetail page. Replace the raw text body rendering with `<MarkdownContent content={post.body} />` for:
- The post body
- Each comment body

Import MarkdownContent and use it wherever post/comment bodies are rendered.

- [ ] **Step 2: Verify build**

Run: `cd web && npm run build`

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/PostDetail.tsx
git commit -m "feat: render post and comment bodies with MarkdownContent"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Build everything**

```bash
go build ./...
cd web && npm run build
```

- [ ] **Step 2: Commit any fixes**

```bash
git add -A && git commit -m "feat: complete Plan B — markdown rendering + smart post creation"
```
