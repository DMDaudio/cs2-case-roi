# CS2 Case ROI — Growth & Monetization Plan

**Date:** 2026-05-28
**Goal:** Build the site to a level that generates meaningful **side income** (target: $50–500/month within 6–12 months) via affiliate links, eventually display ads, while keeping the "honest math" brand.
**Owner:** DMDaudio
**Status:** Living doc — update as we learn.

---

## TL;DR

1. The product is shipped at https://cs2-case-roi.vercel.app — that part is done.
2. The bottleneck is **traffic**, not monetization. 5,000 monthly views unlocks Skinport's affiliate program; until then, monetization tactics earn ~$0.
3. **Goal for the first 90 days: hit 5,000 monthly views.** Everything else is downstream of that.
4. The path is unglamorous and slow: SEO + Reddit + community engagement + content. Daily/weekly effort, not a viral moment.
5. Most side projects die because the builder loses interest in this distribution work. Be honest with yourself about whether you can sustain it.

---

## 1. Revenue reality check

| Monthly visitors | Affiliate income | Display ads | Combined |
|---|---|---|---|
| 1,000 | $5–20 | $0–5 | "lunch money" |
| 5,000 | $30–150 | $5–30 | "phone bill" |
| 10,000 | $50–300 | $20–100 | "real but small" |
| 100,000 | $500–3,000 | $200–1,000 | "real side income" |

Niche tools cap out earlier than viral consumer apps. Total addressable audience for CS2 ROI is bounded (low millions globally, of whom a fraction will ever care about ROI math). Realistic ceiling without going broad: **~30k–100k monthly views**, with affiliate income in the few-hundreds-of-dollars-per-month range. Plan accordingly — this is a side hustle, not a startup.

---

## 2. Apply to all affiliate programs NOW (Week 1)

Many programs auto-approve at any traffic level. Get the infrastructure ready before you have traffic.

| Program | Threshold | Payout estimate | Status |
|---|---|---|---|
| **Skinport** | ~5,000 monthly site views | ~6% revshare | ⬜ Defer until traffic is built |
| **CSFloat** | No public threshold | ~? | ⬜ Apply via support email |
| **DMarket** | Open | ~1–5% | ⬜ Apply |
| **Tradeit.gg** | Open | ~1–5% | ⬜ Apply |
| **Skinbaron** | Open | Varies | ⬜ Apply |
| **Waxpeer** | Open | Varies | ⬜ Apply |
| **Google AdSense** | Quality site (low traffic OK) | $1–3 per 1k views | ⬜ Apply — get approved early |
| **Buy Me a Coffee / Ko-fi** | None | Tips only | ⬜ Set up, link in footer |

**Action:** Spend one afternoon (~2 hours) applying to everything in this table. Don't wait for traffic.

**Affiliates to AVOID:** Gambling sites (Hellcase, CSGOEmpire, Daddyskins, etc.). They pay enormously but contradict your "every case loses money — here's the math" brand. The honesty is your moat; don't trade it for short-term cash.

---

## 3. Infrastructure to ship in Week 1

These unblock everything else. None take more than 30 minutes.

- [ ] **Vercel Analytics** — enable in the Vercel project dashboard. One click. Free. Gives you pageviews + top pages.
- [ ] **Plausible or Umami** — separate referrer-tracking analytics. Without this you can't tell if a Reddit post worked. Free Plausible self-host on the same Vercel works fine.
- [ ] **SEO basics** on every page:
  - Specific `<title>` per route (not just "CS2 Case ROI")
  - `<meta description>` per page describing what's on it
  - OpenGraph image (a screenshot of the dashboard works) so Reddit/Twitter previews look professional
  - `sitemap.xml` and `robots.txt` for Google indexing
- [ ] **Vercel KV + Steam cookie** — wire up real price history (see README). Lights up the Invest leaderboard with real trends. This becomes your **unique angle** vs other ROI calcs.
- [ ] **Footer feedback link** — `cs2roi@gmail.com` or a Discord invite. Without this, frustrated users leave silently and you never know what's wrong.
- [ ] **Affiliate disclosure** in the footer — "We earn a small commission when you click market links. Prices are unaffected." Honest, legally required in many jurisdictions, and it doesn't hurt trust if you're upfront about it.

---

## 4. The traffic playbook

Five channels. Stack 3–4 of these and 5,000 views/month is reachable in 4–8 weeks.

### Channel A — Reddit (fastest first results)

The highest-leverage subs:

| Subreddit | Members | Notes |
|---|---|---|
| r/GlobalOffensiveTrade | ~600k | Most relevant — pure market discussion |
| r/csgomarketforum | ~150k | Market-focused, smaller but targeted |
| r/csgo | ~1.7M | Broad, lots of casuals, more competitive for attention |
| r/GlobalOffensive | ~2M | Biggest but strictest self-promo rules — check Wiki |

**How to post without getting downvoted:**

- Lead with the story / insight, not the URL.
- Embed a screenshot. Show *one* surprising finding from your data.
- Ask for feedback at the end, not at the start.
- Reply to every comment within the first 24 hours — Reddit's algorithm rewards engagement.
- Best window: **Tuesday–Thursday, 8–11am ET**.
- One post per sub every 1–2 weeks max. Rotate angles.

**Post ideas (queue up 6 angles, use one every 2 weeks):**

1. "Built a tool that aggregates Steam + Skinport + CSFloat to show real CS2 case ROI. Snakebite turns out to be the least-bad case at −21%."
2. "Why Souvenir packages are way worse than the math suggests (the sticker outlier problem)."
3. "Every CS2 case ranked by EV — which are 'investments' vs 'lottery tickets'."
4. "How many cases until a knife, by case? (it's not the same for every case)."
5. "The cases Steam removed from active drops — and how their prices changed."
6. "I scraped 90 days of price history for every CS2 container — here's what 'frozen supply' looks like."

### Channel B — SEO content (compounds forever)

Each article ranks once, brings traffic monthly with no ongoing work. The math is unbeatable long-term.

**Cadence:** one 800–1500 word article per week.

**Where:** `/blog/<slug>` route on the same domain (boosts the main site's SEO authority).

**Target queries** (long-tail, low-competition):

| Article title | Search intent |
|---|---|
| "Every CS2 Case Ranked by ROI in 2026 (Live Data)" | "cs2 case roi ranked" |
| "How Many Cases Until a Knife? The Honest Math" | "cs2 how many cases for knife" |
| "Are Souvenir Packages Worth Opening?" | "souvenir packages worth it cs2" |
| "Kilowatt vs Recoil vs Dreams & Nightmares: Which Case to Open?" | "best cs2 case to open 2026" |
| "The CS2 Cases Steam Removed — and Why They Keep Climbing" | "cs2 retired cases price" |
| "Unboxing ROI vs Net ROI Explained" | "cs2 unboxing roi meaning" |
| "Is CS2 Case Opening Gambling? (Spoiler: Yes, Here's the Math)" | "is cs2 case opening gambling" |

After 8 weeks Google starts indexing seriously. By month 3 expect several articles bringing 50–300 organic visits/month each, growing slowly forever.

### Channel C — Discord communities

Slow build, but right Discords are gold for trust.

**Join:**
- CSFloat official Discord (~50k)
- Skinport Discord
- CS2-trade-focused servers (search "cs2 trade" on disboard.org)
- Case-opening sim servers

**Rules:**
- Don't spam. Participate first; share your tool *only when it actually answers a question*.
- "When someone asks 'is X case worth opening?' → link, with a one-line summary of what your tool shows."
- Expect ~50–200 monthly visits at steady state; the bigger win is trust and word-of-mouth.

### Channel D — YouTube Shorts / TikTok

You don't need to be on camera. 30-second clips with text overlay + screen recording of your tool.

**Cadence:** one short per week.

**Topics:**
- "Today's worst CS2 case to open"
- "I tried to make money opening cases — here's what happened"
- "The math behind why you keep losing on cases"
- "This case has the best ROI of any active CS2 container"

The algorithm pushes Shorts to interested viewers regardless of subscriber count. One hit can do 10k–100k views and 1k+ click-throughs.

### Channel E — Direct outreach to small creators

Find creators with 5k–50k subs (small enough to read DMs, large enough for traffic).

**Template DM:**
> Hey [name], built this CS2 ROI tool that aggregates Steam + Skinport + CSFloat to show real EV per container. Thought it might be useful for case-opening videos — happy to answer any data questions. No ask: [URL]

Send 10 a week. Even one mention in a video is a real spike.

---

## 5. The 90-day plan

### Days 1–7 — Foundations

- [ ] Apply to CSFloat, DMarket, Tradeit, Skinbaron, Waxpeer affiliates (~2 hours total).
- [ ] Apply to Google AdSense (~30 min).
- [ ] Enable Vercel Analytics + Plausible (~15 min).
- [ ] Per-page SEO titles + meta descriptions + OG image (~1 hour).
- [ ] Vercel KV + Steam cookie + run `npm run backfill-history` (~30 min setup + ~hours of backfill running).
- [ ] Add footer feedback link + affiliate disclosure (~10 min).
- [ ] Replace existing external market links with affiliate URLs once any affiliate approves.

### Days 8–30 — First traffic push

- [ ] **1 Reddit post** in r/GlobalOffensiveTrade. Reply to every comment.
- [ ] Start the blog. Goal: **4 articles by day 30.**
- [ ] Join **3–5 Discords**. Lurk, then participate.
- [ ] **1 YouTube Short per week** (4 by day 30).
- [ ] Daily Vercel Analytics check — note what's working.

### Days 31–60 — Iterate

- [ ] **2 more Reddit posts** (different subs, different angles).
- [ ] **4 more blog articles** (8 total).
- [ ] **5–10 creator DMs** sent.
- [ ] **4 more Shorts** (8 total).
- [ ] Identify which channel(s) actually deliver. **Drop whichever isn't working.**

### Days 61–90 — Double down

- [ ] Double weekly effort on the channel that's working best.
- [ ] Apply to Skinport affiliate (should be at or near 5k/month now).
- [ ] Start optimizing whatever monetization is live — A/B test affiliate link placement, etc.
- [ ] If revenue exists, reinvest in faster Vercel tier / better tools.

---

## 6. Quarterly checkpoints

Treat these as honest reviews. If the numbers aren't moving, change tactic — not effort.

### Month 3 check
- **Traffic target:** 1,500–5,000 monthly visits
- **Revenue target:** $5–50/month
- **Decision:** If <500 monthly visits, the niche / angle isn't landing — try a sharper hook (e.g. pivot to "case-opening tracker for streamers" or similar specific use case).

### Month 6 check
- **Traffic target:** 5,000–15,000 monthly visits
- **Revenue target:** $50–200/month
- **Decision:** If revenue is real but small, double down. If traffic plateaued, broaden (start covering CS2 skins generally, not just cases).

### Month 12 check
- **Traffic target:** 20,000–80,000 monthly visits
- **Revenue target:** $200–800/month
- **Decision:** Decide whether this is worth your time at this rate. Some side projects max out and that's fine. Others become real businesses.

---

## 7. What gates each milestone

| Milestone | Real blocker | First fix |
|---|---|---|
| First 100 visitors | "Nobody knows it exists" | Reddit post. |
| 1k monthly | "Reddit post died, then silence" | Start the blog so traffic compounds. |
| 5k monthly | "Reddit + blog isn't enough" | Stack channel C/D/E. Build retention loops (alerts, weekly digest). |
| 10k monthly | "I plateaued" | Broaden topic scope or chase a viral moment intentionally. |
| 50k monthly | "Maintenance is taking over" | Hire help (cheap freelance writer), or accept the plateau. |

---

## 8. Honest reality

**Most side-income projects make $0 forever.** Not because the product is bad — because the builder gets bored of the distribution work. The work that grows traffic (writing articles, posting on Reddit, replying to comments, making Shorts) **never stops being unglamorous and repetitive.**

Successful tools in niche spaces are almost always run by people who genuinely enjoy the niche enough to be in the community for years. The CS2 case-opening community is your audience. If you're not actively interested in CS2 economics — if you were just building a thing — this becomes a slog within 2 months.

**Decide now**, honestly:

- "I enjoy CS2 enough to be in those Discord servers 6 months from now" → **proceed**.
- "I built the thing for the build, I'm losing interest already" → **make it a portfolio piece**. Polish it, write a great README, list it as a featured project. That's a real outcome too.

There's no shame in the second answer. Most builders should pick it. The first answer is what unlocks side income.

---

## 9. Out of scope (deliberately, for now)

- Premium tier / paid features — don't build until users *ask* for them.
- Email newsletter — wait until you have 1k+ monthly visitors.
- iOS / Android app — never. Web works fine for this use case.
- Branching beyond CS2 — focus.

---

## Changelog

- 2026-05-28: Initial plan after first traffic question.
