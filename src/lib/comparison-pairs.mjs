/**
 * Neutral pairwise comparison catalog and side-by-side evaluation datasets.
 * Pre-computed, evidence-safe, and free from commercial bias or affiliate ranking.
 */

export const COMPARISON_PAIRS = Object.freeze([
  {
    slug: 'hubspot-vs-pipedrive',
    category: 'CRM',
    title: 'HubSpot vs Pipedrive',
    firstId: 'hubspot',
    secondId: 'pipedrive',
    metaDescription: 'Neutral comparison between HubSpot and Pipedrive for small sales and marketing teams. Workflow, data mobility, and pricing verification status.',
    relatedTools: [
      { title: 'CRM Paid-Seat Audit', href: '/tools/crm-seat-audit/' },
      { title: 'CRM Migration Readiness', href: '/tools/crm-migration-readiness/' }
    ],
    relatedGuides: [
      { title: 'CRM Migration Checklist', href: '/guides/crm-migration-checklist/' },
      { title: 'SaaS Total Cost of Ownership', href: '/guides/saas-total-cost-of-ownership/' }
    ],
    matrix: [
      {
        dimension: 'Primary architectural paradigm',
        firstValue: 'Unified CRM, marketing automation, and customer service suite',
        secondValue: 'Dedicated sales pipeline visualizer and activity tracker',
        buyerContext: 'Suite approach avoids integration points; dedicated pipeline tool is simpler for pure outbound sales reps.'
      },
      {
        dimension: 'Seat model & contract commitment',
        firstValue: 'Tiered suite licenses with potential feature gate minimums',
        secondValue: 'Per-user per-month tiered seats without required marketing add-ons',
        buyerContext: 'Audit inactive or view-only seats before contract renewal to prevent license waste.'
      },
      {
        dimension: 'Contact storage & list limits',
        firstValue: 'Marketing contact pricing tiers may scale with database size',
        secondValue: 'Contact volume generally unmetered; deal/stage counts scale',
        buyerContext: 'Check how rapidly your email marketing list grows compared to active sales leads.'
      },
      {
        dimension: 'Integration & API ecosystem',
        firstValue: 'Large App Marketplace spanning CMS, ad networks, and finance',
        secondValue: 'App marketplace focused on telephony, email, and sales engagement',
        buyerContext: 'Ensure your VOIP provider and email inbox are supported without custom code.'
      },
      {
        dimension: 'Data mobility & export options',
        firstValue: 'CSV export for deals, contacts, companies; API data sync',
        secondValue: 'CSV export for stages, deals, activities; REST API',
        buyerContext: 'Verify custom fields and notes can be exported cleanly during future migrations.'
      },
      {
        dimension: 'Editorial evidence & pricing status',
        firstValue: 'Candidate only — pricing and contract terms unverified',
        secondValue: 'Candidate only — pricing and contract terms unverified',
        buyerContext: 'Never purchase licenses based on third-party comparison charts; verify with official provider.'
      }
    ]
  },
  {
    slug: 'semrush-vs-ahrefs',
    category: 'SEO',
    title: 'Semrush vs Ahrefs',
    firstId: 'semrush',
    secondId: 'ahrefs',
    metaDescription: 'Objective comparison between Semrush and Ahrefs for small agencies. Search index depth, crawl auditing, and pricing transparency.',
    relatedTools: [
      { title: 'SEO Audit Scope Planner', href: '/tools/seo-audit-scope/' },
      { title: 'Software Cost Calculator', href: '/tools/software-cost-calculator/' }
    ],
    relatedGuides: [
      { title: 'SaaS Total Cost of Ownership', href: '/guides/saas-total-cost-of-ownership/' }
    ],
    matrix: [
      {
        dimension: 'Primary core strength',
        firstValue: 'Broad search marketing, content briefs, PPC competitor research',
        secondValue: 'High-precision backlink graph, Site Explorer, technical site auditing',
        buyerContext: 'Semrush covers more digital marketing disciplines; Ahrefs is renowned for web link indexing.'
      },
      {
        dimension: 'Consumption & credit governance',
        firstValue: 'Daily report request quotas and export row ceilings',
        secondValue: 'Monthly workspace credit limits consumed across tools',
        buyerContext: 'Multi-seat agencies should model daily export consumption before selecting an entry plan.'
      },
      {
        dimension: 'Content & on-page recommendations',
        firstValue: 'Built-in SEO Writing Assistant and content topic cluster ideas',
        secondValue: 'Content Explorer topic search and organic traffic potential metrics',
        buyerContext: 'Determine whether you need automated drafting assistance or research-focused gap analysis.'
      },
      {
        dimension: 'Multi-seat access & user licensing',
        firstValue: 'Base plans include 1 user; extra seats require monthly add-on fees',
        secondValue: 'Base plans include 1 user; additional seats require monthly add-on fees',
        buyerContext: 'Agency seat pricing can double or triple total subscription cost.'
      },
      {
        dimension: 'Historical data availability',
        firstValue: 'Historical rank tracking and domain trends available on higher tiers',
        secondValue: 'Historical web graph and backlink archives available on higher tiers',
        buyerContext: 'Agencies pitching new clients need historical trendlines to demonstrate prior trajectory.'
      },
      {
        dimension: 'Editorial evidence & pricing status',
        firstValue: 'Candidate only — pricing and plan quotas unverified',
        secondValue: 'Candidate only — pricing and plan quotas unverified',
        buyerContext: 'Verify plan limits on the vendor official pricing page before budgeting.'
      }
    ]
  },
  {
    slug: 'kinsta-vs-cloudways',
    category: 'Hosting',
    title: 'Kinsta vs Cloudways',
    firstId: 'kinsta',
    secondId: 'cloudways',
    metaDescription: 'Neutral technical comparison between Kinsta and Cloudways. Google Cloud container isolation vs multi-cloud VPS management.',
    relatedTools: [
      { title: 'Hosting Cutover Gate Assessor', href: '/tools/hosting-cutover-gates/' },
      { title: 'Hosting Hidden Costs Worksheet', href: '/tools/hosting-hidden-costs/' },
      { title: 'Backup Restore Drill Assessor', href: '/tools/backup-restore-drill/' }
    ],
    relatedGuides: [
      { title: 'Hosting Migration Checklist', href: '/guides/hosting-migration-checklist/' }
    ],
    matrix: [
      {
        dimension: 'Infrastructure deployment model',
        firstValue: 'Managed Google Cloud C2/C3D VM containers with Cloudflare Enterprise',
        secondValue: 'Managed VPS orchestration on DigitalOcean, AWS, or Google Cloud',
        buyerContext: 'Kinsta provides a unified managed environment; Cloudways lets you choose your underlying cloud provider.'
      },
      {
        dimension: 'Server control & customization',
        firstValue: 'Locked container runtime tailored specifically for WordPress and Node',
        secondValue: 'Granular access to server packages, PHP execution daemons, and Redis',
        buyerContext: 'Kinsta restricts server-level daemon installs; Cloudways provides higher operational flexibility.'
      },
      {
        dimension: 'Billing & capacity scaling',
        firstValue: 'Tiered monthly plans metered by monthly visits and PHP workers',
        secondValue: 'Hourly or monthly pay-as-you-go based on allocated server RAM/vCPU',
        buyerContext: 'Traffic spikes on Kinsta can incur visit overages; on Cloudways, RAM exhaustion requires server resize.'
      },
      {
        dimension: 'Staging & developer workflows',
        firstValue: 'One-click staging, selective push/pull, WP-CLI, APM diagnostics',
        secondValue: 'Staging URLs, Git deployment triggers, SSH/SFTP access per app',
        buyerContext: 'Both support safe staging, but inspect database merge rules before choosing.'
      },
      {
        dimension: 'Snapshot backup & disaster recovery',
        firstValue: 'Automated daily snapshots, downloadable manual backups, hourly add-ons',
        secondValue: 'Configurable automated snapshots to offsite storage, 1-click restore',
        buyerContext: 'Test restoring a backup to a separate test environment before production cutover.'
      },
      {
        dimension: 'Editorial evidence & pricing status',
        firstValue: 'Candidate only — pricing and visit overages unverified',
        secondValue: 'Candidate only — pricing and bandwidth limits unverified',
        buyerContext: 'Check currency, taxes, backup fees, and data center locations directly with the vendor.'
      }
    ]
  }
]);

export function getAllComparisonPairs() {
  return [...COMPARISON_PAIRS];
}

export function getComparisonPair(slug, products) {
  if (typeof slug !== 'string' || !slug) {
    throw new Error('Invalid comparison pair slug');
  }
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('Invalid or empty product catalog');
  }
  const pair = COMPARISON_PAIRS.find(p => p.slug === slug);
  if (!pair) {
    throw new Error(`Unknown comparison pair: ${slug}`);
  }
  const first = products.find(p => p.id === pair.firstId);
  const second = products.find(p => p.id === pair.secondId);
  if (!first || !second) {
    throw new Error(`Product not found for comparison pair: ${slug}`);
  }
  return {
    pair,
    first,
    second,
    // The static matrices contain research leads, NOT authenticated vendor facts.
    // Never expose raw candidate values as authoritative comparison results.
    matrix: pair.matrix.map((row,index)=>({
      dimension: row.dimension,
      claimId: `comparison-${pair.slug}-${String(index+1).padStart(2,'0')}`,
      evidenceStatus: 'unverified',
      approved: false,
      sourceId: null,
      checkedAt: null,
      firstValue: 'Unverified — ask '+first.name+' to confirm this dimension for your plan.',
      secondValue: 'Unverified — ask '+second.name+' to confirm this dimension for your plan.',
      buyerContext: 'Verify the current plan, region and contract terms with both vendors before deciding.'
    }))
  };
}

function neutralizeFormula(val) {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

function escapeCsvField(val) {
  const safe = neutralizeFormula(val);
  return `"${safe.replace(/"/g, '""')}"`;
}

export function generatePairVendorQuestionsCsv(pairData) {
  if (!pairData || !pairData.pair || !pairData.first || !pairData.second) {
    throw new Error('Invalid pairData for CSV generation');
  }
  const header = ['Question ID', 'Category', 'Software Target', 'Question', 'Verification Priority'];
  const rows = [
    [
      'Q-01',
      pairData.pair.category,
      pairData.first.name,
      'What are the exact monthly seat and feature add-on costs for our team size in local currency?',
      'High'
    ],
    [
      'Q-02',
      pairData.pair.category,
      pairData.second.name,
      'What are the exact monthly seat and feature add-on costs for our team size in local currency?',
      'High'
    ],
    [
      'Q-03',
      pairData.pair.category,
      pairData.first.name,
      'What are the overage charges if our usage (contacts, visits, or crawl credits) spikes during peak months?',
      'Medium'
    ],
    [
      'Q-04',
      pairData.pair.category,
      pairData.second.name,
      'What are the overage charges if our usage (contacts, visits, or crawl credits) spikes during peak months?',
      'Medium'
    ],
    [
      'Q-05',
      pairData.pair.category,
      pairData.first.name,
      'Can all custom fields, raw logs, and historical data be exported via automated API or flat files upon cancellation?',
      'Critical'
    ],
    [
      'Q-06',
      pairData.pair.category,
      pairData.second.name,
      'Can all custom fields, raw logs, and historical data be exported via automated API or flat files upon cancellation?',
      'Critical'
    ]
  ];

  const lines = [
    header.map(escapeCsvField).join(','),
    ...rows.map(row => row.map(escapeCsvField).join(','))
  ];
  return lines.join('\r\n') + '\r\n';
}
