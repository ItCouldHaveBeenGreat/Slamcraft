import { types } from './catalog.mjs?v=4';
import { solveShipPower } from './power.mjs?v=5';

self.onmessage = ({ data: { blocks, length } }) => {
  const started = performance.now();
  const { results, ship } = solveShipPower(blocks, length, types);
  self.postMessage({ results, ship, milliseconds: performance.now() - started });
};
