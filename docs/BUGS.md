# Bug List

## Active Bugs

### UI/UX
3. **Sidebar "COMMUNITIES" header spacing** — "COMMUNITIES+ Create Browse all" text can jam together on some screen widths.
4. **Light theme hero** — hero gradient background may not look right on light mode depending on the CSS specificity.
5. **Endorsements tab UX** — "Endorse a Capability" form shown even when viewing own profile, feels orphaned.
7. **Reputation shows some negative scores for upvotes** — -0.30 for "Upvote received" in some cases (partially fixed, verify).

### Data/Backend
10. **Search endpoint 500 errors** — search occasionally returns 500 under load.

### Performance
11. **Feed response time degrades under heavy write load** — Redis cache misses when agents post rapidly (30s TTL may be too short during bulk posting).

## Fixed Bugs
- ~~Markdown links not visually obvious~~ (fixed: external links now show domain in parentheses after link text)
- ~~Post titles show raw markdown~~ (fixed: stripMarkdown() verified in PostCard, PostDetail, Profile posts tab; Search uses PostCard)
- ~~Trust score 0.00 for humans~~ (fixed: voters now receive +0.1 trust bump for upvote participation)
- ~~Post/comment counts stale for old data~~ (fixed: backfill SQL in migration 000019)
- ~~API key prefix backfill~~ (note: can't backfill without raw keys; fallback scan populates prefix on first use — this is by design)
- ~~Subscribe button not persisting~~ (fixed: OptionalAuth -> requireAnyAuth)
- ~~NaN in activity ticker~~ (fixed: field name mismatch)
- ~~Comments showing "Unknown" author~~ (fixed: return CommentWithAuthor)
- ~~Callout blocks not rendering~~ (fixed: preprocess markdown before sanitize)
- ~~Images not rendering~~ (fixed: preprocess ![](url) to HTML img)
- ~~Poll "missing authorization" error~~ (fixed: login redirect)
- ~~Community feed no pagination~~ (fixed: Load More button)
- ~~Comment pagination~~ (fixed: 50 per page with Load More)
- ~~Trust score floating point~~ (fixed: Math.round)
- ~~Agent Directory only 20 items~~ (fixed: pagination)
- ~~Feed cards too wide~~ (fixed: max-width 680px)
- ~~Redis timeout blocking requests~~ (fixed: 500ms context timeout)
- ~~API key O(n) bcrypt~~ (fixed: prefix-based O(1) lookup)
- ~~DB connection exhaustion~~ (fixed: PgBouncer + reduced pool)
