/**
 * Deterministic, explainable recommendation insights and workflow dimensions.
 * Strictly alphabetical and neutral; never influenced by commercial or affiliate status.
 */
import { GOALS, TEAM_SIZES, BUDGETS } from './recommend.mjs';
import {getPublicComparisonRoute} from './public-comparison-routes.mjs';

const PRODUCT_WORKFLOW_PROFILES = Object.freeze({
  hubspot: {
    primaryFocus: 'All-in-one CRM, inbound marketing, and customer service ecosystem',
    workflowFitSummary: 'Evaluated primarily by teams prioritizing integrated marketing automation, content management, and centralized contact tracking alongside sales.',
    evaluationCriteria: [
      'Lead capture and inbound workflow automation',
      'Marketing email and deal pipeline integration',
      'Contract tiers and tiered seat-minimum commitments'
    ],
    peerId: 'pipedrive'
  },
  pipedrive: {
    primaryFocus: 'Activity-based sales pipeline visualizer and deal management',
    workflowFitSummary: 'Evaluated primarily by direct sales teams wanting visual deal stages, call/email activity scheduling, and lightweight contact management.',
    evaluationCriteria: [
      'Visual drag-and-drop deal stage usability',
      'Sales activity tracking and calendar sync',
      'Per-user seat costs without mandatory suite bundles'
    ],
    peerId: 'hubspot'
  },
  semrush: {
    primaryFocus: 'Broad search marketing, content optimization, and competitive intelligence suite',
    workflowFitSummary: 'Evaluated primarily by search agencies requiring integrated keyword tracking, on-page content audits, and multi-channel competitor metrics.',
    evaluationCriteria: [
      'Keyword database breadth and rank update cadence',
      'Content marketing recommendations and on-page auditing',
      'Historical domain visibility and backlink tracking'
    ],
    peerId: 'ahrefs'
  },
  ahrefs: {
    primaryFocus: 'Deep backlink indexing, link graph analysis, and technical search auditing',
    workflowFitSummary: 'Evaluated primarily by technical SEO specialists and link builders focused on web graph scale, crawl diagnostics, and content explorer trends.',
    evaluationCriteria: [
      'Backlink index freshness and historical link profiling',
      'Site Explorer competitive domain organic traffic estimates',
      'Technical site audit crawler flexibility and credit models'
    ],
    peerId: 'semrush'
  },
  kinsta: {
    primaryFocus: 'Managed enterprise WordPress and containerized cloud application hosting',
    workflowFitSummary: 'Evaluated primarily by agencies seeking fully managed Google Cloud infrastructure, built-in APM performance diagnostics, and automated staging/backups.',
    evaluationCriteria: [
      'Managed WP runtime security and isolation',
      'Application performance monitoring (APM) tooling',
      'Visit and PHP worker concurrency throttling thresholds'
    ],
    peerId: 'cloudways'
  },
  cloudways: {
    primaryFocus: 'Managed multi-cloud VPS orchestration (DigitalOcean, AWS, GCE)',
    workflowFitSummary: 'Evaluated primarily by technical site owners seeking server resource flexibility, choice of underlying cloud hyperscalers, and granular daemon control.',
    evaluationCriteria: [
      'Choice of underlying cloud infrastructure provider',
      'Dedicated RAM/vCPU server resource allocation',
      'Hourly vs monthly pay-as-you-go flexibility'
    ],
    peerId: 'kinsta'
  }
});

const CATEGORY_DIMENSIONS = Object.freeze({
  CRM: [
    {
      key: 'sales_pipeline',
      label: 'Deal Pipeline Management',
      buyerRelevance: 'How visual deal stages and activity reminders guide day-to-day rep behavior.'
    },
    {
      key: 'lead_nurturing',
      label: 'Inbound & Marketing Automation',
      buyerRelevance: 'Whether contacts can be automatically scored, segmented, and emailed before sales outreach.'
    },
    {
      key: 'contract_flexibility',
      label: 'Seat & Contract Terms',
      buyerRelevance: 'Whether licenses are month-to-month per rep or subject to multi-seat enterprise minimums.'
    }
  ],
  SEO: [
    {
      key: 'index_coverage',
      label: 'Keyword & Link Index Depth',
      buyerRelevance: 'The scale, regional granularity, and freshness of search results and backlink graphs.'
    },
    {
      key: 'workflow_breadth',
      label: 'Toolchain Breadth',
      buyerRelevance: 'Whether the platform covers technical auditing, rank tracking, PPC, and content planning in one login.'
    },
    {
      key: 'credit_governance',
      label: 'Usage & Credit Constraints',
      buyerRelevance: 'How account export limits, API calls, and workspace seats restrict daily agency throughput.'
    }
  ],
  Hosting: [
    {
      key: 'infrastructure_control',
      label: 'Infrastructure Isolation',
      buyerRelevance: 'Whether sites share containerized enterprise pods or receive dedicated VPS resources.'
    },
    {
      key: 'developer_operations',
      label: 'Deployment & Staging Workflows',
      buyerRelevance: 'Availability of Git integration, staging-to-live sync, SSH/WP-CLI, and automated snapshot backups.'
    },
    {
      key: 'cost_predictability',
      label: 'Usage-Based Invoicing',
      buyerRelevance: 'How traffic spikes, PHP worker bottlenecks, and CDN bandwidth overages impact monthly billing.'
    }
  ]
});

export function explainRecommendation(product, options = {}) {
  if (!product || typeof product !== 'object' || typeof product.id !== 'string') {
    throw new Error('Invalid product input');
  }
  if (!options || typeof options !== 'object') {
    throw new Error('Invalid recommendation options');
  }
  const { goal, team, budget } = options;
  if (!GOALS.includes(goal) || !TEAM_SIZES.includes(team) || !BUDGETS.includes(budget)) {
    throw new Error('Invalid recommendation options');
  }

  const profile = PRODUCT_WORKFLOW_PROFILES[product.id] ?? {
    primaryFocus: product.description ?? 'General software solution',
    workflowFitSummary: 'Independent candidate profile under preliminary editorial review.',
    evaluationCriteria: ['Core feature reliability', 'Pricing transparency', 'Vendor lock-in risk'],
    peerId: null
  };

  const comparePeerUrl = getPublicComparisonRoute(product.id,profile.peerId ?? undefined) ?? '/compare/';

  const verificationTier = product.verified === true 
    ? 'Tier 2: Verified Claim' 
    : (Array.isArray(product.sources) && product.sources.length > 0 
      ? 'Tier 0: Unverified Candidate' 
      : 'Tier 0: Unreviewed Candidate');

  const suitabilityExplanation = product.verified === true
    ? 'Suitability confirmed against documented vendor benchmarks.'
    : `Team-size (${team}) and budget (${budget}) suitability remain unverified pending primary source audit.`;

  return {
    productId: product.id,
    productName: product.name,
    category: product.category,
    primaryFocus: profile.primaryFocus,
    workflowFitSummary: profile.workflowFitSummary,
    suitabilityExplanation,
    evaluationCriteria: [...profile.evaluationCriteria],
    verificationTier,
    evidenceLeadCount: Array.isArray(product.sources) ? product.sources.length : 0,
    profileUrl: `/software/${product.id}/`,
    comparePeerUrl
  };
}

export function explainRecommendations(products, options = {}) {
  if (!Array.isArray(products)) {
    return [];
  }
  return products
    .filter(p => p && Array.isArray(p.bestFor) && p.bestFor.includes(options.goal))
    .map(p => explainRecommendation(p, options))
    .sort((a, b) => a.productName.localeCompare(b.productName, 'en') || a.productId.localeCompare(b.productId, 'en'));
}

export function getWorkflowEvaluationDimensions(category) {
  if (typeof category !== 'string' || !CATEGORY_DIMENSIONS[category]) {
    throw new Error(`Unknown software category: ${category}`);
  }
  return [...CATEGORY_DIMENSIONS[category]];
}
