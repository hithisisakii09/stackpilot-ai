import { validateAgentBuyerGuides } from '../../lib/agent-buyer-guides.mjs';
import { validateVerifiedVendorFacts } from '../../lib/verified-vendor-facts.mjs';

/**
 * Selects the first pending topic from the SEO topic backlog.
 */
export function selectNextPendingTopic(backlog) {
  const topics = Array.isArray(backlog?.topics) ? backlog.topics : [];
  return topics.find(t => t && t.status === 'pending') ?? null;
}

/**
 * Builds a strictly grounded prompt using ONLY verified first-party vendor rows and official URLs.
 */
export function buildGroundedSeoPrompt(topic, verifiedVendorFacts) {
  const validatedFacts = validateVerifiedVendorFacts(verifiedVendorFacts, { today: '9999-12-31' });
  const groundedEvidence = {};
  for (const slug of topic.relatedComparisonSlugs) {
    if (Object.hasOwn(validatedFacts, slug)) {
      groundedEvidence[slug] = validatedFacts[slug];
    }
  }

  return [
    `Draft a neutral, factual buyer guide for slug "${topic.slug}".`,
    `Target title: ${topic.targetTitle}`,
    `Focus keywords: ${topic.focusKeywords.join(', ')}`,
    'STRICT GROUNDING RULES:',
    '1. Use ONLY facts present in the verified vendor documentation JSON below.',
    '2. Every citation url MUST be an exact string copied from the sourceUrl fields below (no other URLs allowed).',
    '3. Do NOT include HTML tags (< or >), affiliate links, or unverified claims.',
    '4. metaDescription must be 50 to 160 characters.',
    '5. Include 2 to 6 sections (heading + body) and 3 to 6 checklist items.',
    'Verified vendor documentation JSON:',
    JSON.stringify(groundedEvidence),
    'Return STRICT JSON ONLY with keys: title, metaDescription, summary, sections, checklist, citations.'
  ].join('\n\n');
}

/**
 * Parses AI JSON (stripping optional markdown fences) and validates against the strict guide contract.
 */
export function parseAndValidateAiGuideResponse(rawText, topic, verifiedVendorFacts, todayIso) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('AI returned empty guide payload');
  }
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);

  const candidateGuide = {
    slug: topic.slug,
    title: parsed.title,
    metaDescription: parsed.metaDescription,
    publishedAt: todayIso,
    summary: parsed.summary,
    relatedComparisonSlugs: [...topic.relatedComparisonSlugs],
    sections: parsed.sections,
    checklist: parsed.checklist,
    citations: parsed.citations
  };

  const validated = validateAgentBuyerGuides(
    { schemaVersion: 1, guides: [candidateGuide] },
    verifiedVendorFacts,
    { today: todayIso }
  );
  return validated.guides[0];
}

/**
 * Runs Agent 2 (Autonomous SEO Content & Page Builder) fail-closed.
 */
export async function runSeoContentBuilder({
  backlog,
  existingGuides,
  verifiedVendorFacts,
  runAiPrompt = null,
  allowLiveSeo = false,
  allowLiveAi = false,
  now = new Date().toISOString()
} = {}) {
  const todayIso = typeof now === 'string' && /^\d{4}-\d{2}-\d{2}/.test(now)
    ? now.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  if (allowLiveSeo !== true) {
    return Object.freeze({
      ok: false,
      reason: 'live_seo_disabled',
      status: 'blocked',
      generatedGuide: null,
      updatedGuides: existingGuides,
      updatedBacklog: backlog,
      estimatedCostMinor: 0,
      executedAt: now
    });
  }

  const topic = selectNextPendingTopic(backlog);
  if (!topic) {
    return Object.freeze({
      ok: true,
      reason: null,
      status: 'backlog_empty',
      generatedGuide: null,
      updatedGuides: existingGuides,
      updatedBacklog: backlog,
      estimatedCostMinor: 0,
      executedAt: now
    });
  }

  if (allowLiveAi !== true || typeof runAiPrompt !== 'function') {
    return Object.freeze({
      ok: false,
      reason: 'live_ai_disabled',
      status: 'blocked',
      generatedGuide: null,
      updatedGuides: existingGuides,
      updatedBacklog: backlog,
      estimatedCostMinor: 0,
      executedAt: now
    });
  }

  const prompt = buildGroundedSeoPrompt(topic, verifiedVendorFacts);
  const aiResult = await runAiPrompt({
    taskClass: 'editorial_draft',
    prompt,
    systemPrompt: 'You are an objective B2B software research writer. Output strict JSON only, grounded exclusively in the provided verified vendor documentation.',
    requestedTokens: 3072,
    maxOutputTokens: 512
  });

  if (!aiResult?.ok) {
    return Object.freeze({
      ok: false,
      reason: aiResult?.reason ?? 'ai_generation_failed',
      status: 'failed',
      generatedGuide: null,
      updatedGuides: existingGuides,
      updatedBacklog: backlog,
      estimatedCostMinor: 0,
      executedAt: now
    });
  }

  const newGuide = parseAndValidateAiGuideResponse(aiResult.text, topic, verifiedVendorFacts, todayIso);
  const priorGuides = Array.isArray(existingGuides?.guides) ? existingGuides.guides : [];
  const nextGuides = validateAgentBuyerGuides(
    { schemaVersion: 1, guides: [...priorGuides, newGuide] },
    verifiedVendorFacts,
    { today: todayIso }
  );

  const nextTopics = (backlog.topics ?? []).map(t =>
    t.slug === topic.slug
      ? { ...t, status: 'drafted', generatedAt: todayIso }
      : { ...t }
  );

  return Object.freeze({
    ok: true,
    reason: null,
    status: 'guide_drafted',
    provider: aiResult.provider ?? null,
    selectedModel: aiResult.selectedModel ?? null,
    generatedGuide: newGuide,
    updatedGuides: nextGuides,
    updatedBacklog: { schemaVersion: 1, topics: nextTopics },
    estimatedCostMinor: 0,
    executedAt: now
  });
}

export function formatSeoBuilderReportMarkdown(result) {
  const lines = [
    '# Agent 2 — Autonomous SEO Content & Page Builder',
    '',
    `- **Executed at:** ${result.executedAt ?? 'unknown'}`,
    `- **Status:** ${result.status}`,
    `- **estimatedCostMinor:** ${result.estimatedCostMinor ?? 0}`,
    ''
  ];

  if (result.generatedGuide) {
    lines.push(
      '## New Grounded Buyer Guide',
      '',
      `- **Slug:** \`/guides/${result.generatedGuide.slug}/\``,
      `- **Title:** ${result.generatedGuide.title}`,
      `- **Published date:** ${result.generatedGuide.publishedAt}`,
      `- **Provider / Model:** ${result.provider ?? 'unknown'} / ${result.selectedModel ?? 'unknown'}`,
      `- **Citations verified:** ${result.generatedGuide.citations.length}`,
      ''
    );
  } else if (result.reason) {
    lines.push(`- **Reason:** \`${result.reason}\``, '');
  }

  return lines.join('\n');
}
