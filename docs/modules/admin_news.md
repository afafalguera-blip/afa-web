# Admin News Module

## Architecture (Current)

### News List Manager (`NewsManager.tsx`)
- **Service**: `AdminNewsService` — getAll, delete, togglePublish.
- **Components**: `NewsAdminHeader`, `NewsAdminFilters` (search + date range), `NewsAdminCard`.
- **Types**: Uses unified `NewsArticle` from `PublicNewsService`.

### News Editor (`NewsEditorPage.tsx` — 309 lines)
- **Service**: `AdminNewsEditorService` — loadArticle, saveArticle, slug validation.
- **Components**:
  - `EditorToolbar` — TipTap formatting toolbar (bold, italic, headings, lists, links, images).
  - `NewsEditorSidebar` — Publish toggle, metrics, featured image, slug, sources, PDF attachment, event date.
  - `NewsPreview` — Rendered HTML preview of the article.
- **Features**: Multi-language editor (CA/ES/EN), auto-translation, draft autosave to localStorage, readability metrics, slug auto-generation.

## File Map

```
services/admin/AdminNewsService.ts        — List CRUD operations
services/admin/AdminNewsEditorService.ts   — Editor load/save + form types
components/admin/news/NewsAdminHeader.tsx   — List page header
components/admin/news/NewsAdminFilters.tsx  — Search + date range filters
components/admin/news/NewsAdminCard.tsx     — Article card with actions
components/admin/news/EditorToolbar.tsx     — TipTap toolbar
components/admin/news/NewsEditorSidebar.tsx — Editor sidebar panels
components/admin/news/NewsPreview.tsx       — Article preview
pages/admin/NewsManager.tsx                — List orchestrator
pages/admin/NewsEditorPage.tsx             — Editor orchestrator
```
