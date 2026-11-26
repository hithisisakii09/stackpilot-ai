import {createHash} from 'node:crypto';

// Exact reviewed Node-only files. Source changes require review before repinning.
export const reviewedLocalControlSources=Object.freeze({
  "src/control-plane/config.mjs": "0b62cd07e0f1b7f151c1fd7ad79feff784d26f33b421c094ffcd8c0d749b61b5",
  "src/control-plane/csrf.mjs": "f8f867f8b929fa3cc0a4ed8d3790c957199089bb1d235c850e6f9dc9999e2f24",
  "src/control-plane/routes.mjs": "c8fa4d85fb094205114893693dfc0bcc1493a9bfe0403329f1405850f7a8e517",
  "src/control-plane/server.mjs": "9362b0d98c68d6d38fc900108155dfd61959a36816c99c55392b2914c94d7f2e",
  "scripts/platform-control-plane.mjs": "35d6518ca357c7d2b742eeb5da72a7c603a0be85d187343761f8d552f15cdaea"
});

export function isReviewedLocalControlSource(path,bytes) {
  if(!Object.hasOwn(reviewedLocalControlSources,path)||!Buffer.isBuffer(bytes)) return false;
  const canonical=Buffer.from(bytes.toString('latin1').replace(/\r\n/g,'\n'),'latin1');
  return createHash('sha256').update(canonical).digest('hex')===reviewedLocalControlSources[path];
}
