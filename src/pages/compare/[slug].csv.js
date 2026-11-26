import products from '../../data/products.json';
import { getAllComparisonPairs, getComparisonPair, generatePairVendorQuestionsCsv } from '../../lib/comparison-pairs.mjs';

export function getStaticPaths() {
  return getAllComparisonPairs().map(({ slug }) => ({ params: { slug: `${slug}-vendor-questions` }, props: { pairSlug: slug } }));
}

export function GET({ props }) {
  const pair = getComparisonPair(props.pairSlug, products);
  return new Response(generatePairVendorQuestionsCsv(pair), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' }
  });
}
