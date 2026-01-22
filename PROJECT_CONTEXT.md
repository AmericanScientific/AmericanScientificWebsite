# American Scientific Website Rebuild - Project Context

## What This Is
Rebuild the wholesale scientific/educational products website (american-scientific.com) to handle both wholesale (B2B) and retail (B2C) sales, integrated with NetSuite ERP.

## Current Site Analysis
- URL: https://www.american-scientific.com
- ~1,356 products across 5 main categories: Chemistry, Laboratory, Life Science, Physics & Physical Science, Special
- **Currently wholesale-only** - requires company name, must be a reseller
- Two account types: Educator or Distributor
- Features: search, cart, wishlist, order tracking, login/register
- Based in Columbus OH, phone 888-490-9002
- Reference screenshots saved in `/reference-images/`

## Core Requirements
1. Product catalog with pricing, descriptions, visibility toggles
2. Custom pricing per user based on customer class (wholesale vs retail, educator vs distributor)
3. User authentication
4. NetSuite integration for inventory, orders, pricing, customer data
5. Payment processing (Shopify Payments or alternative)
6. Dual storefront: extends existing wholesale capability + adds retail (B2C)

## Reality Check
- This is a massive undertaking, typically a team project costing $100k+
- NetSuite integration is the known hard part where things will likely break
- Boss knows it might fail, and that's accepted
- Front-end is buildable; backend/integration is where it gets ugly

## Agreed Approach
1. Build front-end with mock data first
2. Attempt NetSuite API integration piece by piece
3. Document failures clearly as evidence
4. Hit decision points with concrete findings

## Tech Stack (Decided)
- **Framework**: Next.js + TypeScript
- **Hosting**: Vercel (free tier for dev, Pro when production-ready ~$20/mo)
- **UI**: TBD - suggested Tailwind + shadcn/ui
- **Database**: TBD - Supabase or PlanetScale free tier suggested
- **Payments**: TBD - Shopify Payments or alternative

## Open Questions
1. NetSuite API credentials/documentation - do we have access?
2. UI library preference confirmation (Tailwind + shadcn/ui?)
3. Database choice
4. How B2B vs B2C routing should work (subdomain? toggle? separate checkout flows?)
5. Domain DNS situation - described as "a whole other set of worms"

## Deployment Strategy
- **Dev phase**: Vercel free tier with `.vercel.app` subdomain
- **Production**: Upgrade to Vercel Pro, connect real domain
- Existing site stays live until cutover

## Phase Plan

### Phase 1: Foundation
- [ ] Initialize Next.js + TypeScript project
- [ ] Set up project structure (components, pages, types, mock data)
- [ ] Basic layout/navigation shell
- [ ] Deploy to Vercel dev URL

### Phase 2: Front-end with Mock Data
- [ ] Product catalog pages
- [ ] Product detail pages
- [ ] User auth UI (login/register)
- [ ] Cart & checkout flow UI
- [ ] Account/dashboard pages
- [ ] B2B vs B2C flow differentiation

### Phase 3: The Scary Part (NetSuite)
- [ ] Research NetSuite API docs
- [ ] Auth/connection proof of concept
- [ ] Pull product data
- [ ] Pull customer/pricing data
- [ ] Push orders
- [ ] Document every failure

### Phase 4: Payments & Polish
- [ ] Integrate Shopify Payments or alternative
- [ ] Testing & refinement
- [ ] Production deployment

## Reference Materials
- `/reference-images/image.png` - Claude Code CLI screenshot
- `/reference-images/image copy.png` - Current site homepage screenshot

## Session Notes
- Claude Code CLI has vision - can read images directly
- Todo feature exists but may not show as visible panel in VS Code terminal setup
