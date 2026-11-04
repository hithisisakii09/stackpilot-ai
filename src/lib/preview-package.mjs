/**
 * Deterministic, pure content index for a private-preview artifact.
 * It deliberately never authorizes deployment, commercial activity or spending.
 */
const required = ['index.html','compare/index.html','research/index.html','robots.txt','_headers'];
const normalizePath = value => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_][a-zA-Z0-9_./-]*$/.test(value) ||
      value.includes('\\') || value.includes('//') || value.endsWith('/') ||
      value.split('/').some(part => part === '.' || part === '..' || part.startsWith('.'))) {
    throw new Error('Invalid or unsafe preview file path');
  }
  return value;
};
export function buildPrivatePreviewManifest(files, policy, sourceCommit) {
  if (typeof sourceCommit !== 'string' || !/^[a-f0-9]{40}$/.test(sourceCommit)) {
    throw new Error('Invalid source commit');
  }
  if (!policy || policy.policyVersion !== 1 ||
      policy.monthlyBudgetINR !== 0 || policy.delegatedSpendINR !== 0 ||
      policy.hostingCandidate !== 'netlify-free' ||
      policy.commercialHostingApproved !== false ||
      policy.productionLaunchApproved !== false ||
      policy.affiliateActivationApproved !== false ||
      policy.paidServicesApproved !== false) {
    throw new Error('Unapproved budget or public authorization policy');
  }
  if (!Array.isArray(files) || files.length < required.length) {
    throw new Error('Missing required preview files');
  }
  const seen = new Set();
  let totalBytes = 0;
  const checked = files.map(file => {
    if (!file || typeof file !== 'object') throw new Error('Invalid preview file');
    const path = normalizePath(file.path);
    if (seen.has(path)) throw new Error('Duplicate preview file path');
    seen.add(path);
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > 25 * 1024 * 1024) {
      throw new Error('Invalid preview file size');
    }
    if (typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256)) {
      throw new Error('Invalid preview file hash');
    }
    totalBytes += file.bytes;
    if (totalBytes > 100 * 1024 * 1024) throw new Error('Preview total size exceeds cap');
    return {path,bytes:file.bytes,sha256:file.sha256};
  });
  for (const name of required) if (!seen.has(name)) throw new Error('Missing required preview file: ' + name);
  checked.sort((a,b) => a.path.localeCompare(b.path,'en'));
  return {
    schemaVersion:1,
    mode:'private-preview-build-package',
    sourceCommit,
    hostingCandidate:'netlify-free',
    productionPromoted:false,
    publicLaunchAuthorized:false,
    affiliateActivationAuthorized:false,
    delegatedSpendINR:0,
    fileCount:checked.length,
    totalBytes,
    files:checked
  };
}
