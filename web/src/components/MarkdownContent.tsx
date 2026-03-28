'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import 'katex/dist/katex.min.css'

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'math', 'annotation', 'semantics', 'mrow', 'mi', 'mn', 'mo', 'msup', 'msub',
    'mfrac', 'munder', 'mover', 'munderover', 'msqrt', 'mroot', 'mtable', 'mtr',
    'mtd', 'mtext', 'mspace',
    'details', 'summary',
  ],
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'style'],
    div: [...(defaultSchema.attributes?.div ?? []), 'className', 'style'],
    math: ['xmlns'],
    details: ['open'],
  },
}

const CALLOUT_TYPES: Record<string, { icon: string; label: string }> = {
  NOTE:      { icon: '\u2139\uFE0F', label: 'Note' },
  TIP:       { icon: '\uD83D\uDCA1', label: 'Tip' },
  WARNING:   { icon: '\u26A0\uFE0F', label: 'Warning' },
  IMPORTANT: { icon: '\uD83D\uDCCC', label: 'Important' },
  CAUTION:   { icon: '\uD83D\uDEA8', label: 'Caution' },
}

const CALLOUT_REGEX = /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/

/**
 * Extract callout type from a blockquote's children.
 * Returns the type string and the remaining children with the marker stripped,
 * or null if this is not a callout blockquote.
 */
function extractCallout(children: React.ReactNode): { type: string; rest: React.ReactNode } | null {
  const childArray = React.Children.toArray(children)
  if (childArray.length === 0) return null

  const first = childArray[0]
  if (!React.isValidElement(first)) return null

  // The first child of a blockquote is typically a <p> element
  const pChildren = React.Children.toArray((first.props as { children?: React.ReactNode }).children)
  if (pChildren.length === 0) return null

  const firstText = pChildren[0]
  if (typeof firstText !== 'string') return null

  const match = firstText.match(CALLOUT_REGEX)
  if (!match) return null

  const calloutType = match[1]
  const strippedText = firstText.replace(CALLOUT_REGEX, '')

  // Rebuild the first <p> with the marker text removed
  const newPChildren = strippedText ? [strippedText, ...pChildren.slice(1)] : pChildren.slice(1)
  const newFirst = React.cloneElement(first as React.ReactElement, {}, ...newPChildren)

  // If the stripped paragraph is empty, drop it entirely
  const restChildren = newPChildren.length > 0
    ? [newFirst, ...childArray.slice(1)]
    : childArray.slice(1)

  return { type: calloutType, rest: restChildren }
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
        ]}
        components={{
          blockquote: ({ children }) => {
            const callout = extractCallout(children)
            if (callout) {
              const { icon, label } = CALLOUT_TYPES[callout.type]
              return (
                <div className={`callout callout-${callout.type.toLowerCase()}`}>
                  <div className="callout-header">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </div>
                  <div>{callout.rest}</div>
                </div>
              )
            }
            return <blockquote>{children}</blockquote>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
