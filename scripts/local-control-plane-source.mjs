import {createHash} from 'node:crypto';

// Exact reviewed Node-only files. Source changes require review before repinning.
export const reviewedLocalControlSources=Object.freeze({
  "src/control-plane/config.mjs": "0b62cd07e0f1b7f151c1fd7ad79feff784d26f33b421c094ffcd8c0d749b61b5",
  "src/control-plane/csrf.mjs": "f8f867f8b929fa3cc0a4ed8d3790c957199089bb1d235c850e6f9dc9999e2f24",
  "src/control-plane/routes.mjs": "f6837020e1a0cbf51393c77e5a238d80a903e7057d43c0266aa60013c06781f5",
  "src/control-plane/server.mjs": "06f1c9c43946b6bdf144990a60cfb7d5aeb2d107feb703c485c35d5dfb4a03d2",
  "scripts/platform-control-plane.mjs": "35d6518ca357c7d2b742eeb5da72a7c603a0be85d187343761f8d552f15cdaea"
});

export function isReviewedLocalControlSource(path,bytes) {
  if(!Object.hasOwn(reviewedLocalControlSources,path)||!Buffer.isBuffer(bytes)) return false;
  const canonical=Buffer.from(bytes.toString('latin1').replace(/\r\n/g,'\n'),'latin1');
  return createHash('sha256').update(canonical).digest('hex')===reviewedLocalControlSources[path];
}
