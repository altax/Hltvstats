# Design Guidelines: HLTV Match Tracker

## Design Approach
**Design System**: Material Design with esports/gaming aesthetic adaptations
**Rationale**: Data-heavy application requiring robust table components, clear information hierarchy, and responsive data visualization. Material Design provides excellent patterns for complex data displays while allowing customization for the gaming context.

## Typography
- **Primary Font**: Inter (via Google Fonts) - Clean, highly legible for data tables
- **Accent Font**: Rajdhani (via Google Fonts) - Angular, tech-forward for headers
- **Hierarchy**:
  - Page Title: Rajdhani Bold, text-4xl
  - Section Headers: Rajdhani SemiBold, text-2xl
  - Table Headers: Inter SemiBold, text-sm uppercase tracking-wide
  - Body/Data: Inter Regular, text-base
  - Match Details: Inter Regular, text-sm

## Layout System
**Spacing Units**: Tailwind units of 2, 4, 6, 8, and 12 for consistency
- Container: max-w-7xl mx-auto px-6
- Section spacing: py-8 between major sections
- Component padding: p-4 for cards, p-6 for containers
- Table cell padding: px-4 py-3

## Component Library

### Header
- Full-width sticky header with HLTV branding
- Logo/title on left, loading indicator on right
- Height: h-16, shadow-md for elevation
- Icons: Material Icons (CDN)

### Main Data Table (Teams)
- Full-width responsive table with alternating row treatment
- Columns: Rank (w-20), Team Name (flex-1), Country Flag (w-16), Matches Found (w-32), Actions (w-24)
- Sticky header row during scroll
- Expandable row toggle button (Material Icons: expand_more/expand_less)
- Hover state with subtle elevation
- Border separation: border-b on each row

### Nested Matches Table (Expandable)
- Indented container with distinct visual treatment
- Columns: Date (w-32), Opponent (flex-1), Event (w-48), Result (w-24), Link (w-16)
- Compact row height: py-2
- External link icon for match URLs (Material Icons: open_in_new)
- Scrollable if exceeds 400px height with max-h-96 overflow-y-auto

### Loading States
- Skeleton screens for table rows during initial load
- Inline spinner for individual team match fetching
- Pulsing animation on skeleton elements

### Search & Filter Bar
- Sticky below header, full-width
- Search input with icon (Material Icons: search)
- Filter chips for: All Teams, Top 10, Top 20, Top 30
- Height: h-14, spacing: gap-4 between elements

### Status Indicators
- Success: Checkmark icon for completed fetches
- Error: Warning icon for failed requests
- Loading: Circular progress indicator
- Badge positioning: absolute top-2 right-2 on team rows

### Empty States
- Centered container with icon and message
- Icon: Material Icons: sports_esports (large, 64px)
- Message: text-lg with action suggestion

## Animations
**Minimal Animation Strategy**:
- Row expansion: Simple height transition (300ms ease)
- Loading spinners: CSS rotation only
- Hover states: No transition (instant feedback)
- Skeleton pulse: Subtle opacity shift

## Responsive Behavior
- Desktop (lg): Full table with all columns visible
- Tablet (md): Hide Event column, stack match details
- Mobile (base): Card-based layout replacing table, stack all information vertically

## Images
No hero images or marketing visuals needed. This is a pure data application. Use only:
- Team logos (fetched from HLTV if available, placeholder icons otherwise)
- Country flags via CDN (e.g., flagcdn.com)
- Material Icons for all UI controls

## Data Presentation Hierarchy
1. Teams table: Primary focus, largest visual weight
2. Match links: Secondary, revealed on demand
3. Metadata (rank, country): Tertiary, compact presentation
4. Controls (search, filters): Persistent but understated