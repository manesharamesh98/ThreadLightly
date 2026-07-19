# ThreadLightly — Product Requirements Document (PRD)
**Version**: 1.1
**Status**: Draft — Decisions Locked
**Authors**: Manesha Ramesh, Catherine Pulickan, Vanessa Arieputri

---

## 1. Vision & Mission

**Vision**: Make ethical fashion choices as easy as checking a price tag.
**Mission**: Encourage conscious consumer choices — *changing behavior, one snap at a time.*
**Tagline**: Changing Behavior, One Snap at a Time

ThreadLightly is an AI-powered mobile web app that reveals the hidden environmental and labor impact of clothing — right at the point of purchase — and nudges users toward better choices through behavioral science.

---

## 2. Problem Statement

Fast fashion generates **92 million tonnes of textile waste per year**. Yet sustainable shopping remains hard:

| Pain Point | Why it Matters |
|---|---|
| **No Time** | Shoppers can't research mid-purchase |
| **No Clear Information** | Labels are confusing; brands hide impact |
| **Brands Hide Impact** | Greenwashing is rampant; no trusted signal |

> "Young shoppers can't easily judge sustainability when buying. Most fixes come too late, after the damage is done. **Real change must happen BEFORE purchase.**"
> — McKinsey & Company, 2023

**Market pull**: 62% of Gen Z prefer sustainable brands; 73% of Millennials are willing to pay more. The tool to close this intention-action gap doesn't exist in a simple, in-store-ready form.

---

## 3. Target Users

**Primary**: Gen Z shoppers (18–26), shopping in-store or online, sustainability-curious but time-poor.
**Secondary**: Millennials (27–40), already sustainability-minded, willing to pay for better choices.

**User mindset**: They want to do the right thing but won't sacrifice convenience. ThreadLightly must make the sustainable choice the *easy* choice.

---

## 4. Competitive Landscape

| Competitor | Downloads | Partners | Focus |
|---|---|---|---|
| ethy | 1k+ | 100+ | Rate brands on ethical/sustainable practices |
| Good On You | 100k+ | 150+ | Rate fashion brands |
| Giki | 10k+ | N/A | Rate grocery products on sustainability |

**ThreadLightly's differentiation**: In-the-moment label scan (not brand lookup), behavioral nudge design, sustainable alternatives discovery, and a rewards loop — all in one product.

---

## 5. Solution Overview

Three core pillars:

1. **Snap & Score** — AI reads the clothing label; returns material, environmental, and labor scores instantly
2. **Discover Alternatives** — Surfaces sustainable brand alternatives for scanned garments
3. **Impact Dashboard & Rewards** — Tracks user choices over time; rewards better behavior

---

## 6. MVP Scope

The MVP focuses entirely on **Pillar 1: Snap & Score**. This is the core behavioral nudge and the feature validated with users.

### MVP User Story
> As a shopper in a store, I want to snap a photo of a clothing label so I can instantly see how sustainable the garment is and make an informed decision before buying.

### MVP Screens (4 screens from Figma)

#### Screen 1 — Home
- Header: user avatar (top left) + ThreadLightly logo (center)
- Hero illustration: person analyzing clothing
- Headline: "Found something you like?"
- CTA button: **"Materials Analysis"** → navigates to Snap

#### Screen 2 — Snap (Camera Active)
- Header: "Snap" with X (close) and user icon
- Instruction text: "Take a picture of the materials label"
- Full-width camera viewfinder
- Hint text: "Point camera at label and tap on screen"
- Bottom controls: gallery icon (upload from library) + large capture button
- CTA: **"View Materials Analysis"** (disabled until image captured)

#### Screen 3 — Snap (Photo Captured)
- Same layout as Screen 2 but camera replaced by captured image
- Delete icon appears (red trash) to retake
- CTA changes to **"Explore"** (active/enabled)

#### Screen 4 — Snap Results
- Header: "Snap Results" with back arrow

**Section: Sustainability Score**
- Circular gauge (ring chart), partially filled in green
- Score displayed as **X/100** in large type, red for bad scores
- Rating badge: "Bad" / "OK" / "Good" / "Great" (color-coded)
- Short description: e.g. "Obtaining this product is poor commitment to environmental responsibility."

**Section: Material Analysis**
- Each identified material shown as: **Name** + **Composition: XX%**
- Garment type hint: e.g. "Feels similar to a gym legging" (AI inference)
- Expandable material cards:
  - Material name (bold)
  - MADE-BY Class rating (e.g. "Class E*") in red/amber/green
  - Description of material's environmental impact
- Citation: `*Made-by Environmental Benchmark for Fibres`

**Section: Environmental Impact** (below fold — detail TBD in next design iteration)

**Bottom Navigation** (persistent):
- Home | Snap | Resources | Profile

---

## 7. Feature Requirements

### F1 — Label Scanning

| Requirement | Detail |
|---|---|
| Camera capture | Access device camera via browser API |
| Gallery upload | Allow image upload from photo library |
| Image preview | Show captured image before analysis |
| Retake / delete | Allow user to discard and recapture |
| Processing state | Show loading indicator during AI analysis |
| Error state | Handle unreadable labels gracefully with helpful message |

### F2 — AI Analysis

| Requirement | Detail |
|---|---|
| OCR | Extract text from label image |
| Material identification | Identify all materials and their % composition |
| Sustainability scoring | Score 0–100 based on MADE-BY Environmental Benchmark for Fibres |
| MADE-BY Class | Classify each material as Class A–E (or Unclassified) |
| Rating label | Map score to human-readable rating: Bad / OK / Good / Great |
| Material descriptions | Plain-language explanation of each material's environmental impact |
| Garment type inference | Suggest garment category from material composition |
| Environmental Impact section | Additional impact metrics (CO2, water usage — detail TBD) |

**Scoring reference — MADE-BY Environmental Benchmark for Fibres:**
- **Class A** (best): Mechanically Recycled Nylon/Polyester, Organic Flax, Organic Hemp, Recycled Cotton, Recycled Wool
- **Class B**: Chemically Recycled Nylon/Polyester, Organic Cotton, TENCEL, Monocel, In Conversion Cotton, CRAiLAR Flax
- **Class C**: Conventional Flax/Hemp, PLA, Ramie
- **Class D**: Modal, Poly-acrylic, Virgin Polyester
- **Class E** (worst classified): Bamboo Viscose, Conventional Cotton, Viscose, Rayon, Spandex/Elastane, Virgin Nylon, Wool
- **Unclassified**: Acetate, Alpaca, Cashmere, Leather, Mohair, Natural Bamboo, Organic Wool, Silk

**Score calculation**: Weighted average of material class scores (A=100, B=80, C=60, D=40, E=20), weighted by % composition.

### F3 — Results Display

| Requirement | Detail |
|---|---|
| Score ring | Circular progress indicator filled proportionally to score |
| Expandable cards | Each material card expands/collapses for detail |
| Color coding | Red (Bad <40), Amber (OK 40–69), Green (Good/Great 70+) |
| MADE-BY attribution | Cite benchmark source on results screen |

### F4 — Navigation

| Requirement | Detail |
|---|---|
| Bottom nav | Persistent 4-tab nav: Home, Snap, Resources, Profile |
| Deep linking | Snap tab opens camera directly |
| Back navigation | Back arrow from results returns to Snap screen |

### F5 — Resources (MVP placeholder)

- Static screen with sustainable fashion tips and localized recycle guides
- Full content TBD post-MVP

### F6 — Profile (MVP placeholder)

- Basic screen; full scan history + rewards in post-MVP
- For MVP: placeholder UI only

---

## 8. Freemium Model (MVP launches free tier)

| Tier | Price | Features |
|---|---|---|
| **Free** | €0 | 10 snaps/week |
| **Premium (B2C)** | €3.99/month | Unlimited snaps, sustainable recommendations, wardrobe & style matching, community engagement |
| **B2B** | €100/month | Featured placement in alternatives, analytics report, video commerce |

**MVP launches Free tier only.** Freemium gate and Premium features are post-MVP.

---

## 9. Design System

### Colors

| Token | Hex | Usage |
|---|---|---|
| Primary | `#1C3564` | Nav bars, primary buttons, headers |
| Secondary | `#32507F` | Logo gold/tan, accents |
| Secondary Light | `#EAECEC` | Backgrounds, cards |
| Accent | `#24AAB4` | Highlights, icons |
| dark-100 | `#000000` | |
| dark-80 | `#333333` | Body text |
| dark-60 | `#626262` | Secondary text |
| dark-40 | `#C4C4C4` | Disabled states |
| dark-10 | `#F6F6F6` | Page backgrounds |
| White | `#FFFFFF` | |

**Semantic colors** (for scoring):
- Bad: Red (`#EF4444` or similar)
- OK: Amber (`#F59E0B`)
- Good: Green (`#22C55E`)
- Great: Dark Green (primary)

### Typography

**Font**: IBM Plex Sans (replacing current Manrope)

| Role | Size | Weight |
|---|---|---|
| Caption | 15px | Light / Regular |
| Body Text | 20px | Regular / Medium |
| Sub-Heading | 30px | Medium / Semibold |
| Heading | 35px | Semibold |

### Component Patterns (from screens)
- Rounded cards with subtle border
- Pill badges for class ratings
- Circular ring chart for score
- Full-width CTA buttons (rounded, dark primary fill)
- Expandable accordion cards for material detail

---

## 10. Technical Architecture

### Recommended Stack

**Frontend**: Vanilla JS + HTML/CSS (keep current approach, refactored cleanly) or React — TBD
**Backend**: Node.js + Express (keep)
**AI/OCR**: Replace current PaddleOCR with **Claude API (claude-sonnet-4-6)**
- Send label image to Claude vision API
- Prompt returns: materials[], percentages[], MADE-BY classes, descriptions, score, garment type
- Eliminates need for materials.json, materials-variations.json, NLP tokenization
- Handles multilingual labels automatically (major improvement)

**Storage**: No database for MVP (stateless); add DB in post-MVP for scan history + user accounts
**Hosting**: Node server (current), can deploy to Render/Railway/Fly.io

### API Design

```
POST /api/analyze
  body: multipart/form-data { image: File }
  response: {
    score: number,           // 0-100
    rating: string,          // "Bad" | "OK" | "Good" | "Great"
    description: string,     // summary sentence
    garmentType: string,     // e.g. "gym legging"
    materials: [
      {
        name: string,
        percentage: number,
        class: string,       // "A" | "B" | "C" | "D" | "E" | "Unclassified"
        description: string,
        impact: string
      }
    ],
    environmentalImpact: {}  // TBD
  }
```

### Key Technical Decisions for Rewrite
1. **Replace OCR pipeline with Claude vision API** — better accuracy, multilingual, no confidence threshold tuning needed
2. **Single `index.html`** replacing both index.html + index2.html
3. **CSS custom properties** for the full design system
4. **IBM Plex Sans** via Google Fonts
5. **PWA** maintained — keep service worker + manifest for mobile installation

---

## 11. Post-MVP Roadmap

| Phase | Features |
|---|---|
| **v1.1** | User accounts, scan history, impact dashboard |
| **v1.2** | Sustainable brand alternatives (curated DB) |
| **v1.3** | Rewards & challenges system |
| **v2.0** | Freemium gate (10 scans/week limit) + Premium upgrade flow |
| **v2.1** | B2B brand portal (analytics, featured placement) |
| **v3.0** | Wardrobe & style matching, community features |
| **v3.1** | Report generation, video commerce for brands |

---

## 12. Key Product Decisions (Locked)

| Decision | Choice | Notes |
|---|---|---|
| **Platform** | PWA (Progressive Web App) | Mobile-first, installable, no app store needed |
| **User accounts** | Yes — required for MVP | Needed for scan history, usage limits, and future rewards |
| **Scoring method** | Formula-based | Weighted MADE-BY class score by % composition. Labor/environmental modifiers TBD post-MVP via published benchmarks (e.g. Higg Index, Fashion Transparency Index) |
| **Sustainable alternatives** | Post-MVP | Approach: partner data + selective crawling (see §15) |
| **Rewards** | Excluded from MVP | Planned for v1.3 |
| **AI for label reading** | Claude API (vision) | Replaces PaddleOCR + hardcoded JSON |

---

## 13. Out of Scope for MVP

- Sustainable alternatives discovery
- Rewards / gamification
- Freemium scan limits / gating
- B2B brand portal
- Labor score (post-MVP formula TBD)
- Localized recycle guides (Resources screen is placeholder)
- Push notifications
- Social sharing
- Native mobile app (iOS/Android)

---

## 13. Success Metrics (MVP)

| Metric | Target |
|---|---|
| Scan success rate | >80% of uploaded labels return valid results |
| Time to result | <5 seconds from upload to results screen |
| User satisfaction | >80% positive feedback (replicate 92% from prototype validation) |
| Weekly active scans | Track via server logs (no analytics tool required for MVP) |

---

## 14. Open Questions

| Question | Owner | Priority |
|---|---|---|
| Labor score formula — which published index to use? (Higg, Fashion Transparency Index, Know the Chain?) | Vanessa | Medium (post-MVP) |
| Claude API key — do you have one, or need to create an Anthropic account? | Manesha | High — needed before dev |

**Resolved:**
- Environmental Impact section → **excluded from MVP** (omit the section entirely for now)
- Auth → **email/password** (no social login for MVP)

---

## 15. Sustainable Alternatives — Legality & Implementation Research

This feature is **post-MVP** but planned. Here is a breakdown of the options, from safest to riskiest:

### Option A — Direct Brand Partnerships (Recommended, Safest)
Partner with sustainable brands directly. They provide product data (name, category, materials, URL, price) in exchange for featured placement. This aligns perfectly with your **B2B €100/month revenue stream** — brands pay to be listed as alternatives.

- **Legal risk**: None. Fully consensual.
- **Data quality**: High — brands self-report accurate product info.
- **Effort**: Business development work, not engineering.
- **Start with**: Your mentors — Change Clothes and Offset Fashion are natural first partners.

### Option B — Existing Sustainability APIs
Several organisations publish ethical brand ratings via API or data downloads:

| Source | Data | Access |
|---|---|---|
| **Good On You** | Brand ratings (people, planet, animals) | Developer API available (contact them) |
| **Fashion Transparency Index** | Brand-level transparency scores | Public PDFs; no official API |
| **Remake** | Brand accountability scorecards | No API — manual curation |
| **Open Apparel Registry (OAR)** | Factory locations/ownership | Free open API |

- **Legal risk**: Low — these datasets are designed to be shared.
- **Best starting point**: Good On You developer API for brand-level ratings.

### Option C — Web Crawling / Scraping
Crawling retailer or brand websites (e.g. ASOS, H&M, Zara) for product + material data.

**Legal landscape (Ireland / EU):**
- **Terms of Service**: Almost all major retailers explicitly prohibit scraping in their ToS. Violating ToS is a civil matter (not criminal), but can result in IP bans, cease-and-desist letters, or legal action.
- **EU Database Directive (96/9/EC)**: Protects databases where the owner made substantial investment in compiling them. Scraping product catalogues from retailers likely infringes this.
- **GDPR**: Does not apply to product data (no personal data involved), so not a concern here.
- **Computer Misuse Act (Ireland: Criminal Justice (Offences Relating to Information Systems) Act 2017)**: Only applies if you bypass access controls. Public-facing pages with no login wall are generally not covered.
- **robots.txt**: No legal force in the EU, but ethically significant. Courts have referenced it as evidence of intent.

**What this means in practice:**
- Scraping publicly listed product pages (no login required) is a grey area, not clearly illegal in Ireland/EU — but ToS violations create legal exposure.
- Scraping *sustainable brand* sites (small ethical brands) is much lower risk than scraping H&M or ASOS — smaller brands are unlikely to pursue legal action and may welcome the exposure.
- The safest scraping approach: only crawl sites that don't explicitly prohibit it in their ToS/robots.txt, cache results so you don't hammer servers, and identify your crawler in the User-Agent string.

**Technical approach (when ready):**
- Use a Node.js crawler (e.g. Crawlee + Puppeteer) targeting sustainable brand directories
- Target structured data: Open Graph tags, JSON-LD schema.org markup — less likely to be protected
- Start with a curated seed list of ~50 sustainable brands, not mass scraping

**Recommendation**: Start with Option A (partnerships) and Option B (Good On You API) for launch. Add selective crawling of brand-owned sites as a supplementary data source, with legal review first.

---

*This PRD reflects the MVP scope based on the NovaUCD pitch deck, e-booklet, Figma MVP screens, and design system. Sections marked "TBD" require one more round of design review before implementation.*
