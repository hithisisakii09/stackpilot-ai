import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { 
  buildSoftwareApplicationSchema, 
  buildFAQSchema, 
  buildBreadcrumbSchema,
  serializeJsonLd 
} from '../src/lib/structured-data.mjs';

const products = JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8'));

test('buildSoftwareApplicationSchema produces valid Schema.org SoftwareApplication object', () => {
  const hubspot = products.find(p => p.id === 'hubspot');
  const schema = buildSoftwareApplicationSchema(hubspot);

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'SoftwareApplication');
  assert.equal(schema.name, 'HubSpot');
  assert.equal(schema.applicationCategory, 'CRM');
  assert.equal(schema.operatingSystem, 'Cloud-based');
  assert.ok(schema.description);
  assert.equal(schema.offers['@type'], 'Offer');
  assert.equal(schema.offers.priceSpecification['@type'], 'PriceSpecification');
  assert.equal(schema.offers.priceSpecification.description, 'Pricing unverified — consult official provider');
});

test('buildFAQSchema produces valid Schema.org FAQPage', () => {
  const faqs = [
    { question: 'Is HubSpot or Pipedrive better for small teams?', answer: 'Both offer distinct workflows depending on your focus.' },
    { question: 'Are these pricing figures final?', answer: 'No, all pricing requires verification directly with the vendor.' }
  ];
  const schema = buildFAQSchema(faqs);

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'FAQPage');
  assert.equal(schema.mainEntity.length, 2);
  assert.equal(schema.mainEntity[0]['@type'], 'Question');
  assert.equal(schema.mainEntity[0].name, faqs[0].question);
  assert.equal(schema.mainEntity[0].acceptedAnswer['@type'], 'Answer');
  assert.equal(schema.mainEntity[0].acceptedAnswer.text, faqs[0].answer);
});

test('buildBreadcrumbSchema produces valid Schema.org BreadcrumbList', () => {
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: 'Compare', url: '/compare/' },
    { name: 'HubSpot vs Pipedrive', url: '/compare/hubspot-vs-pipedrive/' }
  ];
  const schema = buildBreadcrumbSchema(crumbs);

  assert.equal(schema['@context'], 'https://schema.org');
  assert.equal(schema['@type'], 'BreadcrumbList');
  assert.equal(schema.itemListElement.length, 3);
  assert.equal(schema.itemListElement[0].position, 1);
  assert.equal(schema.itemListElement[0].name, 'Home');
  assert.equal(schema.itemListElement[2].position, 3);
  assert.equal(schema.itemListElement[2].name, 'HubSpot vs Pipedrive');
});

test('serializeJsonLd safely escapes HTML characters to prevent XSS breakout', () => {
  const dangerous = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Test</script><script>alert(1)</script>',
    description: 'A & B < C > D'
  };
  const jsonString = serializeJsonLd(dangerous);
  assert.doesNotMatch(jsonString, /<script/i);
  assert.match(jsonString, /\\u003c/i);
  // Must still parse back to valid JSON
  const parsed = JSON.parse(jsonString);
  assert.equal(parsed.name, 'Test</script><script>alert(1)</script>');
});

test('rejects invalid inputs fail-closed', () => {
  assert.throws(() => buildSoftwareApplicationSchema(null), /invalid/i);
  assert.throws(() => buildFAQSchema('invalid'), /array/i);
  assert.throws(() => buildFAQSchema([]), /empty/i);
  assert.throws(() => buildBreadcrumbSchema([]), /empty/i);
  assert.throws(() => serializeJsonLd(null), /invalid/i);
});
