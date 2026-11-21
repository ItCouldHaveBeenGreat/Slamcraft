import { types } from './catalog.mjs?v=4';
import { solvePower } from './power.mjs?v=4';

self.onmessage = ({ data: { blocks, length } }) => {
  const started = performance.now();
  const results = solvePower(blocks, length, types);
  self.postMessage({ results, milliseconds: performance.now() - started });
};
