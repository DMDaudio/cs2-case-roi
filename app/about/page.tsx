export default function AboutPage() {
  return (
    <article className="panel-elevated prose prose-invert max-w-none p-8 prose-headings:text-ink prose-p:text-ink-dim prose-strong:text-ink prose-li:text-ink-dim prose-a:text-accent-cyan">
      <h1>How EV is computed</h1>

      <p>
        Every CS2 weapon case has a fixed pool of skins sorted into five rarity tiers.
        Valve publishes the per-tier drop probability — those numbers, multiplied by
        live skin prices, give the expected value of one unboxed item.
      </p>

      <h2>1. Valve drop odds</h2>
      <table>
        <thead>
          <tr><th>Tier</th><th>Probability</th></tr>
        </thead>
        <tbody>
          <tr><td>Mil-Spec</td><td>79.92%</td></tr>
          <tr><td>Restricted</td><td>15.98%</td></tr>
          <tr><td>Classified</td><td>3.20%</td></tr>
          <tr><td>Covert</td><td>0.64%</td></tr>
          <tr><td>Rare Special (knife / glove)</td><td>0.26%</td></tr>
        </tbody>
      </table>

      <h2>2. Per-skin expected price</h2>
      <p>
        For each skin <em>s</em> with available wears <em>W</em>:
      </p>
      <pre><code>{`price_normal(s)    = mean over w in W of bestPrice(s, w)
price_stattrak(s)  = bestPrice("StatTrak™ " + s) if listed, else 1.4 × normal
price_expected(s)  = 0.9 × price_normal(s) + 0.1 × price_stattrak(s)`}</code></pre>
      <p>
        <strong>bestPrice</strong> is the lowest live ask across Steam Market, CSFloat, and Skinport.
      </p>

      <h2>3. Case EV</h2>
      <pre><code>{`EV_tier(t)  = mean over s in tier_t of price_expected(s)
EV_gross    = Σ over tiers t of P(t) × EV_tier(t)
EV_net      = EV_gross − caseUnitPrice − keyUnitPrice
EV_pct      = EV_net / (caseUnitPrice + keyUnitPrice)`}</code></pre>

      <h2>Two ways we show ROI</h2>
      <p>
        The same expected value can be quoted two ways, and we show both:
      </p>
      <ul>
        <li><strong>Unboxing ROI</strong> = <code>EV / cost</code> — the share of your spend you get back on average. A Kilowatt at $1.33 EV on $2.81 cost is <strong>47%</strong>: you keep about 47¢ of every dollar.</li>
        <li><strong>Net ROI</strong> = <code>(EV − cost) / cost</code> — your gain or loss. Same case = <strong>−53%</strong>.</li>
      </ul>
      <p>
        They're the same number shifted by 100% (<code>net = unboxing − 100%</code>). Unboxing ROI is the headline figure on cards; net is shown alongside. Anything under 100% unboxing ROI (i.e. negative net) loses money — which is almost every container.
      </p>

      <h2>5. Lottery score</h2>
      <p>
        Most cases have a deeply negative mean dominated by rare knife / glove drops.
        A high <strong>σ/μ</strong> means the case is essentially a lottery ticket: most
        opens lose almost everything and a few wins carry the EV. A low score means a
        more consistent — though usually still negative — outcome.
      </p>

      <h2>Caveats</h2>
      <ul>
        <li>Wear distribution is approximated as uniform across listed wears. Real Valve distribution is float-uniform within each skin's allowed float range.</li>
        <li>Steam Market's 15% seller fee is not deducted. Third-party markets (CSFloat, Skinport) charge much less, and our <code>bestPrice</code> already prefers the lowest live ask.</li>
        <li>When all three sources fail for a skin, it's treated as $0 and the case is flagged as "lower-bound EV".</li>
        <li>This is not financial advice. Don't open cases as an investment.</li>
      </ul>

      <h2>Data sources</h2>
      <ul>
        <li><strong>Case + skin metadata:</strong> <a href="https://github.com/ByMykel/CSGO-API">ByMykel/CSGO-API</a> (committed snapshot, refreshed via <code>npm run fetch-metadata</code>)</li>
        <li><strong>Steam Market:</strong> <code>steamcommunity.com/market/priceoverview</code></li>
        <li><strong>CSFloat:</strong> public listings API</li>
        <li><strong>Skinport:</strong> <code>api.skinport.com/v1/items</code></li>
      </ul>

      <p className="text-xs text-ink-faint">
        Prices are cached server-side for 30 minutes. Click "Refresh prices" on any
        page to invalidate and re-pull.
      </p>
    </article>
  );
}
