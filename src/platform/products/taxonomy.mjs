import {fields, id, text, dataArray, json} from '../contracts/validation.mjs';

export function aliasToken(value) {
  return id(text(value, 64).toLowerCase());
}

export function normalizeAliases(value, reserved = []) {
  const aliases = dataArray(value, 5).map(aliasToken).sort();
  if (new Set(aliases).size !== aliases.length || aliases.some(alias => reserved.includes(alias))) throw new Error('Ambiguous alias');
  return Object.freeze(aliases);
}

export function normalizeTaxonomy(value) {
  const namespace = new Map();
  const categories = dataArray(value, 10).map(record => {
    fields(record, ['id', 'slug', 'name', 'aliases']);
    const categoryId = id(record.id), slug = aliasToken(record.slug);
    const aliases = normalizeAliases(record.aliases, [categoryId, slug]);
    for (const token of new Set([categoryId, slug, ...aliases])) {
      if (namespace.has(token)) throw new Error('Ambiguous category namespace');
      namespace.set(token, categoryId);
    }
    return {id:categoryId, slug, name:text(record.name, 100), aliases};
  });
  categories.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  return json(categories);
}

export function resolveCategory(taxonomy, token) {
  const categories = normalizeTaxonomy(taxonomy), selected = aliasToken(token);
  const category = categories.find(record => [record.id, record.slug, ...record.aliases].includes(selected));
  if (!category) throw new Error('Unknown category');
  return category.id;
}
