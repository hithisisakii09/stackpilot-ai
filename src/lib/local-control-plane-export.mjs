export function auditLocalControlPlaneExport(files) {
  if(!Array.isArray(files)||!files.length) throw new Error('Missing built assets');
  const violations=[];
  for(const file of files) {
    if(!file||typeof file.path!=='string'||!/^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(file.path)||file.path.split('/').some(part=>part==='.'||part==='..')) throw new Error('Invalid built asset');
    const privatePath=/(?:^|\/)(?:control-plane|src\/platform|platform-control-plane)(?:[/.]|$)|\.(?:pem|key|pfx|p12|crt|cer)$|(?:auth[_-](?:sessions|challenges)|approval[_-](?:requests|decisions|request[_-]bindings))\.(?:json|csv|sql)$/i;
    const marker=/createIdentityService|createApprovalService|withAuthenticatedTransaction|__Host-stackpilot_session|stackpilot-(?:auth|principal)-v1|publicKeySpkiBase64|requesterUserId|requester_user_id|deciderUserId|decider_user_id|requestDigest|request_digest|tokenHash|token_hash|nonceDigest|nonce_digest|auth_sessions|auth_challenges|approval_request_bindings|approval_requests|approval_decisions|csrfToken["']?\s*:|-----BEGIN (?:[A-Z0-9]+ )?(?:PRIVATE KEY|PUBLIC KEY|CERTIFICATE)-----/i;
    if(privatePath.test(file.path)||typeof file.content==='string'&&marker.test(file.content)) violations.push('Local control-plane material in static output');
  }
  return {checkedFiles:files.length,violations};
}
