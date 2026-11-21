const epsilon = 1e-8;

// Index occupied cells, then deduplicate contacts between the same pair of blocks.
export function faceNeighbors(blocks, length) {
  const cells = new Int32Array(length ** 3);
  const neighbors = blocks.map(() => new Set());
  const indexOf = (x, y, z) => x + length * (y + length * z);
  blocks.forEach(({ pos: [x, y, z], size: [dx, dy, dz] }, index) => {
    for (let k = z; k < z + dz; k++)
      for (let j = y; j < y + dy; j++)
        for (let i = x; i < x + dx; i++) cells[indexOf(i, j, k)] = index + 1;
  });
  function connect(a, b) {
    if (!b || a === b) return;
    neighbors[a - 1].add(b - 1);
    neighbors[b - 1].add(a - 1);
  }
  for (let z = 0; z < length; z++) {
    for (let y = 0; y < length; y++) {
      for (let x = 0; x < length; x++) {
        const cell = indexOf(x, y, z);
        const a = cells[cell];
        if (!a) continue;
        if (x + 1 < length) connect(a, cells[cell + 1]);
        if (y + 1 < length) connect(a, cells[cell + length]);
        if (z + 1 < length) connect(a, cells[cell + length ** 2]);
      }
    }
  }
  return neighbors;
}

class MinHeap {
  items = [];

  push(item) {
    let i = this.items.length;
    this.items.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].cost <= item.cost) break;
      this.items[i] = this.items[parent];
      i = parent;
    }
    this.items[i] = item;
  }

  pop() {
    const first = this.items[0];
    const last = this.items.pop();
    if (!this.items.length) return first;
    let i = 0;
    while (2 * i + 1 < this.items.length) {
      let child = 2 * i + 1;
      if (child + 1 < this.items.length && this.items[child + 1].cost < this.items[child].cost) child++;
      if (last.cost <= this.items[child].cost) break;
      this.items[i] = this.items[child];
      i = child;
    }
    this.items[i] = last;
    return first;
  }
}

function allocate(graph, supply, demands, capacity, efficiency, weights = demands) {
  const count = graph.length;
  const generators = [];
  const consumers = [];
  const received = new Float64Array(count);
  const generated = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    if (supply[i] > epsilon) generators.push(i);
    if (demands[i] > epsilon) consumers.push(i);
  }

  // One search per allocation round finds the best remaining route to every sink.
  // Generator terminals inject losslessly; traversing them uses normal forwarding.
  function routes() {
    const maxCost = Math.log(generators.reduce((total, i) => total + supply[i], 0) / epsilon);
    const best = new Float64Array(count).fill(Infinity);
    const paths = Array(count);
    const queue = new MinHeap();
    for (const source of generators) {
      if (supply[source] <= epsilon) continue;
      for (const next of graph[source]) {
        if (best[next] === 0) continue;
        best[next] = 0;
        const path = { index: next, source, cost: 0, previous: null };
        paths[next] = path;
        queue.push(path);
      }
    }
    while (queue.items.length) {
      const path = queue.pop();
      const { index, cost, source } = path;
      if (paths[index] !== path || capacity[index] <= epsilon || efficiency[index] <= 0) continue;
      const nextCost = cost - Math.log(efficiency[index]);
      if (nextCost > maxCost) continue;
      for (const next of graph[index]) {
        if (next === source || nextCost >= best[next]) continue;
        best[next] = nextCost;
        const candidate = { index: next, source, cost: nextCost, previous: path };
        paths[next] = candidate;
        queue.push(candidate);
      }
    }
    return paths;
  }

  // Increase delivered fractions together, rerouting when a shared limit is hit.
  while (consumers.length && generators.some(i => supply[i] > epsilon)) {
    const paths = routes();
    const sourceLoad = new Float64Array(count);
    const relayLoad = new Float64Array(count);
    const allocations = [];
    let fraction = 1;
    for (const sink of consumers) {
      const path = paths[sink];
      const remaining = demands[sink] - received[sink];
      if (!path || remaining <= epsilon) continue;
      let input = weights[sink];
      for (let relay = path.previous; relay; relay = relay.previous) {
        input /= efficiency[relay.index];
        relayLoad[relay.index] += input;
      }
      sourceLoad[path.source] += input;
      fraction = Math.min(fraction, remaining / weights[sink]);
      allocations.push(sink);
    }
    if (!allocations.length) break;
    for (let i = 0; i < count; i++) {
      if (sourceLoad[i]) fraction = Math.min(fraction, supply[i] / sourceLoad[i]);
      if (relayLoad[i]) fraction = Math.min(fraction, capacity[i] / relayLoad[i]);
    }
    if (!(fraction > 0)) break;
    for (const sink of allocations) received[sink] += weights[sink] * fraction;
    for (let i = 0; i < count; i++) {
      const draw = sourceLoad[i] * fraction;
      const relay = relayLoad[i] * fraction;
      supply[i] -= draw;
      capacity[i] -= relay;
      generated[i] += draw;
    }
  }

  return { received, generated };
}

// Each solve forecasts one second. Only the simulation step commits the energy.
export function solvePower(blocks, length, types) {
  const specs = blocks.map(block => types[block.type]);
  const graph = faceNeighbors(blocks, length);
  const demands = specs.map((spec, i) =>
    Math.max(0, Math.min(spec.powerConsumption, blocks[i].effectiveDemand ?? spec.powerConsumption)));
  const supply = specs.map(spec => spec.powerGeneration);
  const capacity = specs.map(spec => spec.transmissionCapacity);
  const efficiency = specs.map(spec => spec.transmissionEfficiency);
  const stored = specs.map((spec, i) => spec.storageCapacity ? (blocks[i].storedEnergy ?? 0) : 0);
  const primary = allocate(graph, supply, demands, capacity, efficiency);
  const discharge = specs.map((spec, i) => Math.min(spec.dischargeRate ?? 0, stored[i]));
  const unmet = demands.map((demand, i) => Math.max(0, demand - primary.received[i]));
  const backup = allocate(graph, discharge, unmet, capacity, efficiency, demands);
  const charge = specs.map((spec, i) => {
    if (!spec.storageCapacity || backup.generated[i] > epsilon || efficiency[i] <= 0) return 0;
    return Math.min(spec.chargeRate, (spec.storageCapacity - stored[i]) / efficiency[i]);
  });
  const charging = allocate(graph, supply, charge, capacity, efficiency);

  return blocks.map(({ id }, i) => {
    const received = primary.received[i] + backup.received[i];
    const result = {
      id, received, forwarded: specs[i].transmissionCapacity - capacity[i],
      generated: primary.generated[i] + charging.generated[i],
      output: specs[i].powerConsumption ? received / specs[i].powerConsumption : null,
    };
    if (specs[i].storageCapacity) {
      result.charge = charging.received[i];
      result.discharge = backup.generated[i];
      result.nextEnergy = Math.max(0, Math.min(specs[i].storageCapacity,
        stored[i] + result.charge * efficiency[i] - result.discharge));
    }
    return result;
  });
}
