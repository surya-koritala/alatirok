'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import dynamic from 'next/dynamic'
import EmbedRenderer from './EmbedRenderer'
import LinkPreview from './LinkPreview'
import SortableTable from './SortableTable'
import 'katex/dist/katex.min.css'

const MermaidDiagram = dynamic(() => import('./MermaidDiagram'), { ssr: false })

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'img',
    'math', 'annotation', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub',
    'mfrac', 'munder', 'mover', 'munderover', 'msqrt', 'mroot', 'mtable', 'mtr',
    'mtd', 'mtext', 'mspace',
    'details', 'summary',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: ['href', 'target', 'rel', 'className'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'style'],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'class', 'style'],
    div: [...(defaultSchema.attributes?.div ?? []), 'className', 'class', 'style'],
    math: ['xmlns'],
    details: ['open'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
}

const CALLOUT_ICONS: Record<string, string> = {
  NOTE: '\u2139\uFE0F',
  TIP: '\uD83D\uDCA1',
  WARNING: '\u26A0\uFE0F',
  IMPORTANT: '\uD83D\uDCCC',
  CAUTION: '\uD83D\uDEA8',
}

/**
 * Pre-process markdown to convert GitHub-style callout blockquotes into HTML.
 * This runs on the raw string BEFORE ReactMarkdown parses it, avoiding
 * issues with the parser splitting [!TYPE] across React nodes.
 *
 * Converts:
 *   > [!WARNING]
 *   > Content here
 *
 * Into:
 *   <div class="callout callout-warning"><div class="callout-header">⚠️ <strong>Warning</strong></div>
 *
 *   Content here
 *
 *   </div>
 */
function preprocessCallouts(md: string): string {
  const calloutRegex = /^(>)\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*\n?((?:>.*\n?)*)/gm
  return md.replace(calloutRegex, (_match, _gt, type: string, body: string) => {
    const icon = CALLOUT_ICONS[type] || ''
    const label = type.charAt(0) + type.slice(1).toLowerCase()
    const cssClass = type.toLowerCase()
    // Strip leading > from each body line
    const content = body
      .split('\n')
      .map((line: string) => line.replace(/^>\s?/, ''))
      .join('\n')
      .trim()

    return `<div class="callout callout-${cssClass}"><div class="callout-header">${icon} <strong>${label}</strong></div>\n\n${content}\n\n</div>\n`
  })
}

/**
 * Pre-process markdown images into HTML img tags that won't be stripped by sanitize.
 * rehype-sanitize strips markdown ![alt](url) images. By converting them to raw HTML
 * img tags with our allowed attributes, they pass through.
 * Also converts bare image URLs on their own line.
 */
function preprocessImages(md: string): string {
  // Convert ![alt](url) markdown images → raw HTML img
  let result = md.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px" loading="lazy" />'
  )
  // Convert bare image URLs on their own line
  result = result.replace(
    /^(https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?\S*)?)$/gim,
    '<img src="$1" alt="" style="max-width:100%;border-radius:8px" loading="lazy" />'
  )
  return result
}

interface MarkdownContentProps {
  content: string
  className?: string
}

/**
 * Pre-process @mentions in markdown: convert `@SomeName` patterns into
 * styled inline HTML spans so they render with indigo color.
 * Runs before ReactMarkdown parses the string.
 */
function preprocessMentions(md: string): string {
  // Match @Word patterns that are not inside code blocks or links
  // Negative lookbehind for ` (inline code) and [ (link text)
  return md.replace(
    /(?<![`\w])@(\w+)/g,
    '<span class="mention" style="color:var(--indigo);font-weight:500">@$1</span>'
  )
}

export default function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={`markdown-body ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeSanitize, sanitizeSchema],
          rehypeKatex,
        ]}
        components={{
          pre: ({ children }) => {
            // Check if the child <code> is a mermaid block. If so, render the
            // diagram directly instead of wrapping in <pre>.
            const childArray = React.Children.toArray(children)
            if (childArray.length === 1 && React.isValidElement(childArray[0])) {
              const child = childArray[0] as React.ReactElement<{ className?: string; children?: React.ReactNode }>
              const childClassName = child.props?.className || ''
              if (/language-mermaid/.test(childClassName)) {
                const code = String(child.props?.children ?? '').trim()
                return <MermaidDiagram chart={code} />
              }
            }
            return <pre>{children}</pre>
          },
          // blockquote callouts handled by preprocessCallouts() on raw markdown
          a: ({ href, children }) => {
            const isExternal = href?.startsWith('http')
            const domain = isExternal ? (() => { try { return new URL(href!).hostname.replace('www.', '') } catch { return null } })() : null
            return (
              <a href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}>
                {children}
                {domain && <span style={{ fontSize: '0.85em', opacity: 0.6, marginLeft: 4 }}>({domain})</span>}
              </a>
            )
          },
          table: ({ children }) => <SortableTable>{children}</SortableTable>,
          p: ({ children }) => {
            const childArray = React.Children.toArray(children)

            // Check if a single child is a link — try rich embed or auto-image
            if (childArray.length === 1) {
              const child = childArray[0]

              // Bare image URL as a link (agents often paste URLs without markdown image syntax)
              if (React.isValidElement(child) && (child.props as Record<string, unknown>)?.href) {
                const url = (child.props as Record<string, unknown>).href as string
                if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url) || /images\.unsplash\.com/i.test(url)) {
                  return (
                    <div style={{ margin: '8px 0' }}>
                      <img src={url} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} loading="lazy" />
                    </div>
                  )
                }
              }

              // Rich embed for YouTube/GitHub/Twitter
              if (
                React.isValidElement(child) &&
                (child.props as Record<string, unknown>)?.href
              ) {
                const url = (child.props as Record<string, unknown>).href as string
                const embed = EmbedRenderer({ url })
                if (embed) return embed

                // Fallback: show LinkPreview card for any standalone external link
                if (url.startsWith('http')) {
                  return (
                    <div style={{ margin: '8px 0' }}>
                      <LinkPreview url={url} />
                    </div>
                  )
                }
              }
            }
            return <p>{children}</p>
          },
        }}
      >
        {preprocessMentions(preprocessCallouts(preprocessImages(content)))}
      </ReactMarkdown>
    </div>
  )
}
