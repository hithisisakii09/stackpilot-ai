import test from 'node:test';
import assert from 'node:assert/strict';
import {auditStaticRoutes} from '../src/lib/release-preflight.mjs';

const shell='<!doctype html><html lang="en"><head><title>Private safety test</title><meta name="robots" content="noindex,nofollow"></head><body>{{LINK}}</body></html>';
const scan=link=>auditStaticRoutes([{path:'index.html',html:shell.replace('{{LINK}}',link)}]).violations;

test('blocks unsafe explicit and protocol-relative anchor hrefs before a private preview',()=>{
  for(const href of [
    'javascript:alert(1)',
    'data:text/html,attack',
    'http://external.example/path',
    '//external.example/path',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://external.example/file'
  ]){
    const errors=scan('<a href="'+href+'">Inspect</a>');
    assert.ok(errors.some(message=>message.includes('unsafe anchor destination')),href+': '+errors.join(' | '));
  }
});

test('rejects HTML-entity and control-character disguised executable link schemes',()=>{
  for(const href of [
    'java&#x73;cript:alert(1)',
    '&#106;avascript:alert(1)',
    'javascript&colon;alert(1)',
    'java&#115;cript&#58;alert(1)',
    'java&#x09;script:alert(1)',
    'java\nscript:alert(1)'
  ]){
    const errors=scan('<a href="'+href+'">Inspect</a>');
    assert.ok(errors.some(message=>message.includes('unsafe anchor destination')),JSON.stringify(href)+': '+errors.join(' | '));
  }
});

test('allows deliberate HTTPS vendor navigation and local anchors, without applying to data-href',()=>{
  for(const link of [
    '<a href="https://www.hubspot.com/">Official HubSpot</a>',
    '<a href="HTTPS://www.pipedrive.com/">Official Pipedrive</a>',
    '<a href="/compare/">Compare</a>',
    '<a href="../methodology/">Methodology</a>',
    '<a href="#details">Details</a>',
    '<a href="mailto:contact@example.com">Contact</a>',
    '<a data-href="javascript:alert(1)" href="/research/">Research</a>'
  ]){
    assert.deepEqual(scan(link),[],link);
  }
});
