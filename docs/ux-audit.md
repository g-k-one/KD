# UX/UI audit — prototype v3 (2026-10-16)

Scope: every built screen at 390 px (mobile) and 1440 px (desktop), the Figma kit (Components page) and the
competitor patterns we are borrowing from (csgogem as the base, skin.club for parts).

> Competitor sites could not be opened from this environment (browsing to gambling domains is blocked), so the
> competitor column is based on known patterns of these products, not on a fresh walkthrough. Worth re-checking
> on a phone before we lock the mobile navigation.

Legend: ✅ fixed in this pass · 🔜 proposed, not built · ⚠️ needs a product decision

## Critical (mobile)

| # | Problem | Fix |
|---|---|---|
| 1 | No way to reach your own profile, inventory or history on mobile: the drawer had no account links, the header had no avatar. | ✅ Avatar with level in the mobile header → `/profile`. Drawer opens with the account block (profile card → profile, Deposit / Withdraw, Profile · Inventory · Game history tiles). |
| 2 | Profile, inventory and history did not exist (all led to "Coming soon"). | ✅ `/profile` with tabs: Inventory (multi-select, sell selected, go to upgrade), Game history (Figma "Tables" on desktop, "MobileHistoryRow" on mobile, filter chips by game), Settings. Old `/inventory`, `/history`, `/settings` redirect to the tab. Mock backend now records history. |
| 3 | Home hero broke on mobile: the mascot was absolutely positioned over the title and buttons. | ✅ Uses the Figma mobile hero variant: art in the flow on top, eyebrow + 2-line title + actions below. |
| 4 | Home filters took ~250 px on mobile before the first case. | ✅ One row: "Filters" button (with active count) + scrollable price chips. Volatility, affordable and sort live in a bottom sheet with a "Show N cases" action. |
| 5 | Drawer slid in from the left while the Menu tab is bottom-right. | ✅ Drawer comes from the right; sections stagger in; explicit close button. |

## High

| # | Problem | Fix |
|---|---|---|
| 6 | Case page on mobile: after scrolling to "Found in this case" the Open button is gone. | ✅ Sticky open bar above the tab bar appears when the controls leave the screen; tapping it opens and scrolls back to the reel. |
| 7 | Upgrade on mobile: both inventory panels stacked → very long page, the target picker was far below. | ✅ "My skins / Desired" tabs on mobile, side by side on desktop. Stake and target panels sit side by side under a smaller dial. |
| 8 | Several elements rendered twice on mobile (`hidden` vs component root `inline-flex`). | ✅ Fixed in case card, upgrade stake, hero. Rule for the codebase: never toggle display on a component root with `hidden` + `x:inline-flex`; use a variant (`max-sm:`) or a wrapper. |
| 9 | Mobile header for signed-in users showed a globe button that did nothing useful. | ✅ Globe stays for guests (language before sign-in); signed-in users get the avatar. |
| 10 | Deposit: country selector truncated ("POLA…"). | ✅ Wider inline select. |

## Medium — proposed

| # | Problem | Proposal |
|---|---|---|
| 11 | Home has only "Featured" and "Polish classics". Both competitors lead with a promo carousel and many named sections (New, Cheap, Knives, Event). | 🔜 Banner carousel (Figma Hero ×N) + sections from the backend, horizontal scroll per section on mobile. |
| 12 | No search for cases. skin.club has it in the filter bar. | 🔜 Search field in desktop filters, search icon in the mobile filter row. |
| 13 | No "free case" / daily reward / level rewards — the main retention loop on skin.club. Level progress is shown but leads nowhere. | ⚠️ Decide on rewards scope; Figma has "Bonuses" in nav but no screens yet. |
| 14 | Case opening result: no "Upgrade this" shortcut. csgogem-style flows send the drop straight into the upgrader. | 🔜 Third action on the result: Upgrade → `/upgrade` with the item preselected. |
| 15 | Withdraw flow does not exist; menu "Withdraw" goes to the inventory. | ⚠️ Depends on the withdrawal partner (P2P market). |
| 16 | Live feed: tapping a drop opens the case, but there is no tooltip/preview of who won what on mobile. | 🔜 Long-press / tap → small popover with item, price, user, "Open this case". |
| 17 | Upgrade: chips "1/10 · 1/5 · 1/3" are ambiguous (of balance? of skins?). | ⚠️ Label them ("+10% balance") or move into the balance input as a menu. |
| 18 | Low-contrast meta text (`neutral-8` on `neutral-2`, ~2.4:1) in drop cards and footer copyright. | 🔜 Lift to `neutral-10`/`neutral-11` (≥ 4.5:1 for 12 px). Needs a Figma token decision. |
| 19 | Price formatting differs in Figma ("12,50" vs "12.50"). | ⚠️ Pick one; code uses `.` and a space for thousands everywhere. |

## Kit coverage (Figma → code)

Built: Button (all types/states), Chip, Toggle, Checkbox, Select + Menu + DropdownOption, Tabs, Accordion, Modal,
Price, Coin, RiskMeter, Avatar, LevelBadge, PageBar, SectionHeader, CaseCard, DropItemCard, InventoryItem,
UpgradeGauge, TransparencyBlock, CaseReel, OpenControls, Header, MiniProfile, ProfileMenu, SettingsMenu,
LiveFeed, Hero (desktop + mobile), CaseFilters, Footer, MobileHeader, BottomNav, MobileMenu, Account nav,
History table + MobileHistoryRow, Sign-in modal, Upgrade settings modal.

Not built yet: Battles (whole section), Leaderboard (MobileLeaderRow, Podium), Wallet withdraw, Mobile/CaseStats
(our TransparencyBlock covers it), Badges page, Progress variants beyond level.

## Motion rules (for Figma prototypes too)

- Hover: `--dur-base` 220 ms, `--ease-out`. Never bounce on hover.
- Press: scale 0.96 + opacity 0.8 in 90 ms; release springs back (`--ease-spring`).
- Enter: `--dur-slow` 420 ms ease-out; exit: 140 ms ease-in.
- One "moment" per screen: reel stop, dial stop, result reveal. Everything else stays quiet.
- `prefers-reduced-motion`: animations collapse to ~1 ms; spins still resolve.
