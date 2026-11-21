export function orientedSize(size, rotation) {
  const result = [...size];
  for (const [axis, turns] of rotation.entries()) {
    if (turns % 2 === 0) continue;
    const first = (axis + 1) % 3;
    const second = (axis + 2) % 3;
    [result[first], result[second]] = [result[second], result[first]];
  }
  return result;
}

const isTriple = value => Array.isArray(value) && value.length === 3 &&
  value.every(Number.isSafeInteger);

export class World {
  constructor(length, types) {
    this.length = length;
    this.types = types;
    this.objects = [];
    this.nextId = 1;
  }

  size(type, rotation, baseSize = this.types[type].size) {
    return orientedSize(baseSize, rotation);
  }

  canPlace(pos, size, except = null) {
    return isTriple(pos) &&
      pos.every((value, axis) => value >= 0 && value + size[axis] <= this.length) &&
      this.objects.every(object => {
        if (object.id === except) return true;
        const otherSize = this.size(object.type, object.rot, object.baseSize);
        return pos.some((value, axis) =>
          value + size[axis] <= object.pos[axis] ||
          object.pos[axis] + otherSize[axis] <= value);
      });
  }

  put(type, pos, rot, id = null, baseSize = id === null ? undefined : this.objects.find(object => object.id === id)?.baseSize) {
    if (!Object.hasOwn(this.types, type) || !isTriple(rot) ||
        rot.some(turns => turns < 0 || turns > 3) ||
        !this.canPlace(pos, this.size(type, rot, baseSize), id)) return null;

    const object = { id: id ?? this.nextId, type, pos: [...pos], rot: [...rot] };
    if (baseSize) object.baseSize = [...baseSize];
    if (id === null) {
      this.objects.push(object);
      this.nextId++;
    } else {
      const index = this.objects.findIndex(existing => existing.id === id);
      if (index === -1) return null;
      this.objects[index] = object;
    }
    return object;
  }

  remove(id) {
    this.objects = this.objects.filter(object => object.id !== id);
  }

  serialize() {
    return { version: 1, grid: Array(3).fill(this.length), objects: this.objects };
  }

  load(data, { legacyLength } = {}) {
    const legacy = isTriple(data?.grid) && data.grid.every(side => side === legacyLength);
    if (!Array.isArray(data?.objects) ||
        (data.version !== undefined && data.version !== 1) ||
        (data.grid !== undefined && !legacy && (!isTriple(data.grid) ||
          data.grid.some(side => side !== this.length)))) {
      throw new Error('Unsupported layout format or grid size');
    }

    const imported = new World(this.length, this.types);
    for (const raw of data.objects) {
      if (!raw || typeof raw.type !== 'string' || !isTriple(raw.rot) || !isTriple(raw.pos)) {
        throw new Error('Invalid component');
      }
      const rotation = raw.rot.map(turns => ((turns % 4) + 4) % 4);
      const legacySize = Object.hasOwn(this.types, raw.type) && this.types[raw.type].legacySize;
      if (raw.baseSize !== undefined && (!legacySize || !isTriple(raw.baseSize) ||
          raw.baseSize.some((side, axis) => side !== legacySize[axis]))) {
        throw new Error('Unsupported component footprint');
      }
      const baseSize = raw.baseSize ?? (legacy && legacySize ? legacySize : undefined);
      if (!imported.put(raw.type, raw.pos, rotation, null, baseSize)) {
        throw new Error('Unknown component, occupied cells, or out-of-bounds position');
      }
    }
    this.objects = imported.objects;
    this.nextId = imported.nextId;
  }
}
