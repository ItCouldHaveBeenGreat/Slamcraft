import assert from 'node:assert/strict';
import test from 'node:test';
import { faceNeighbors, solvePower } from '../power.mjs';

const types = {
  reactor: { powerGeneration: 100, powerConsumption: 0, transmissionCapacity: 30, transmissionEfficiency: .9 },
  big: { powerGeneration: 0, powerConsumption: 100, transmissionCapacity: 30, transmissionEfficiency: .9 },
  small: { powerGeneration: 0, powerConsumption: 50, transmissionCapacity: 30, transmissionEfficiency: .9 },
  wire: { powerGeneration: 0, powerConsumption: 0, transmissionCapacity: 50, transmissionEfficiency: .98 },
  hull: { powerGeneration: 0, powerConsumption: 0, transmissionCapacity: 10, transmissionEfficiency: .6 },
};

const block = (type, x, z, size = [1, 1, 1]) => ({ type, pos: [x, 0, z], size });
const solve = blocks => solvePower(blocks.map((block, id) => ({ ...block, id })), 30, types);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

test('contacts are face-only and each pair is connected once', () => {
  const graph = faceNeighbors([
    block('reactor', 0, 0, [2, 1, 2]), block('wire', 2, 0, [1, 1, 2]), block('big', 3, 2),
  ], 30);
  assert.deepEqual(graph.map(set => [...set]), [[1], [0], []]);
});

test('a shared bottleneck splits proportionally and honors a consumer cap', () => {
  const layout = [
    block('reactor', 0, 1), block('wire', 1, 1), block('big', 2, 1), block('small', 1, 2),
  ];
  const [, wire, big, small] = solve(layout);
  near(wire.forwarded, 50);
  near(big.received, 49 * 2 / 3);
  near(small.received, 49 / 3);
  near(big.output, small.output);
  layout[2].effectiveDemand = 50;
  const [, , capped, other] = solve(layout);
  near(capped.received, 24.5);
  near(other.received, 24.5);
  near(capped.output, .245);
});

test('an engine can combine separate paths and generators', () => {
  const results = solve([
    block('reactor', 0, 0), block('wire', 1, 0),
    block('reactor', 0, 1), block('wire', 1, 1),
    block('big', 2, 0, [1, 1, 2]),
  ]);
  near(results[4].received, 98);
  near(results[1].forwarded, 50);
  near(results[3].forwarded, 50);
});

test('a hull saturates while the engine on a wire continues to draw', () => {
  const results = solve([
    block('reactor', 1, 1), block('hull', 0, 1), block('wire', 2, 1),
    block('small', 0, 2), block('small', 2, 2), block('small', 4, 4),
  ]);
  near(results[3].received, 6);
  near(results[4].received, 49);
  near(results[5].received, 0);
});

test('batteries charge from surplus, apply charging loss, and stop at capacity', () => {
  const battery = { powerGeneration: 0, powerConsumption: 0, transmissionCapacity: 30,
    transmissionEfficiency: .9, storageCapacity: 200, chargeRate: 30, dischargeRate: 20 };
  const layout = [block('reactor', 1, 1), block('battery', 1, 2), block('small', 2, 1)];
  const step = () => solvePower(layout, 30, { ...types, battery });
  let [, storage, engine] = step();
  near(engine.received, 50);
  near(storage.charge, 30);
  near(storage.nextEnergy, 27);
  layout[1].storedEnergy = 199;
  [, storage] = step();
  near(storage.charge, 1 / .9);
  near(storage.nextEnergy, 200);
  layout[1].storedEnergy = 200;
  [, storage] = step();
  near(storage.charge, 0);
});

test('batteries cover shortfalls at their rate and discharge the last joule without storage loss', () => {
  const battery = { powerGeneration: 0, powerConsumption: 0, transmissionCapacity: 30,
    transmissionEfficiency: .9, storageCapacity: 200, chargeRate: 30, dischargeRate: 20 };
  const layout = [block('battery', 0, 0), block('small', 1, 0)];
  const step = () => solvePower(layout, 30, { ...types, battery });
  layout[0].storedEnergy = 23;
  let [storage, engine] = step();
  near(engine.received, 20);
  near(storage.nextEnergy, 3);
  layout[0].storedEnergy = storage.nextEnergy;
  [storage, engine] = step();
  near(engine.received, 3);
  near(storage.nextEnergy, 0);
  near(storage.charge, 0);
});

test('engine supply and charging share the same relay capacity', () => {
  const battery = { powerGeneration: 0, powerConsumption: 0, transmissionCapacity: 30,
    transmissionEfficiency: .9, storageCapacity: 200, chargeRate: 30, dischargeRate: 20 };
  const small = { ...types.small, powerConsumption: 30 };
  const layout = [block('reactor', 0, 1), block('wire', 1, 1),
    block('small', 2, 1), block('battery', 1, 2)];
  const [, wire, engine, storage] = solvePower(layout, 30, { ...types, battery, small });
  near(engine.received, 30);
  near(wire.forwarded, 50);
  near(storage.charge, 19);
  near(storage.nextEnergy, 17.1);
});
