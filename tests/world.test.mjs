import assert from 'node:assert/strict';
import test from 'node:test';
import { types } from '../catalog.mjs';
import { World, orientedSize } from '../world.mjs';

test('asymmetric footprints rotate in X, Y, Z order', () => {
  assert.deepEqual(orientedSize([2, 3, 4], [1, 0, 0]), [2, 4, 3]);
  assert.deepEqual(orientedSize([2, 3, 4], [0, 1, 0]), [4, 3, 2]);
  assert.deepEqual(orientedSize([2, 3, 4], [0, 0, 1]), [3, 2, 4]);
  assert.deepEqual(orientedSize([2, 3, 4], [1, 1, 1]), [4, 3, 2]);
});

test('placement allows face contact and stacking and rejects collisions and invalid coordinates', () => {
  const world = new World(12, types);
  assert.ok(world.put('reactor', [0, 0, 0], [0, 0, 0]));
  assert.ok(world.put('hull', [2, 0, 0], [0, 0, 0]));
  assert.ok(world.put('hull', [0, 2, 0], [0, 0, 0]));
  assert.equal(world.put('hull', [1, 1, 1], [0, 0, 0]), null);
  assert.equal(world.put('engine', [11, 0, 0], [0, 0, 0]), null);
  assert.equal(world.put('hull', [0.5, 3, 0], [0, 0, 0]), null);
  assert.ok(world.put('engine', [11, 0, 0], [0, 1, 0]));
});

test('moves and rotations keep IDs and preserve state when blocked', () => {
  const world = new World(12, types);
  const engine = world.put('engine', [0, 0, 0], [0, 0, 0]);
  world.put('hull', [0, 0, 1], [0, 0, 0]);
  assert.equal(world.put('engine', engine.pos, [0, 1, 0], engine.id), null);
  assert.deepEqual(world.objects[0], engine);
  assert.equal(world.put('engine', [1, 0, 0], [0, 1, 0], engine.id).id, engine.id);
  world.remove(engine.id);
  assert.equal(world.objects.length, 1);
});

test('version 1 layouts round-trip, and invalid imports leave the current layout intact', () => {
  const world = new World(12, types);
  world.load({ objects: [{ type: 'engine', pos: [11, 0, 0], rot: [0, -3, 0] }] });
  const snapshot = JSON.parse(JSON.stringify(world.serialize()));
  world.load(snapshot);
  assert.deepEqual(world.serialize(), snapshot);
  for (const data of [
    { version: 2, objects: [] },
    { grid: [12, 10, 12], objects: [] },
    { objects: [null] },
    { objects: [{ type: 'constructor', pos: [0, 0, 0], rot: [0, 0, 0] }] },
    { objects: [snapshot.objects[0], snapshot.objects[0]] },
  ]) {
    assert.throws(() => world.load(data));
    assert.deepEqual(world.serialize(), snapshot);
  }
});
