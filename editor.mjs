import { gridLength, types } from './catalog.mjs?v=3';
import { createView } from './renderer.mjs?v=3';
import { World } from './world.mjs?v=3';

const historyLimit = 50;

const example = {
  objects: [
    { type: 'reactor', pos: [13, 0, 13], rot: [0, 0, 0] },
    { type: 'wire', pos: [16, 0, 14], rot: [0, 0, 0] },
    { type: 'engine', pos: [17, 0, 14], rot: [0, 0, 0] },
    { type: 'hull', pos: [12, 0, 14], rot: [0, 0, 0] },
    { type: 'engine', pos: [10, 0, 14], rot: [0, 0, 0] },
  ],
};

export function start() {
  const get = id => document.getElementById(id);
  const world = new World(gridLength, types);
  get('gridSize').textContent = Array(3).fill(gridLength).join(' × ');
  get('level').max = gridLength - 1;
  const view = createView(get('viewport'), world.length);
  let mode = 'Place';
  let selected = null;
  let tool = 'reactor';
  let rotation = [0, 0, 0];
  let level = 0;
  let toastTimer;
  const undoStack = [];
  const redoStack = [];
  const worker = new Worker(new URL('./power-worker.mjs?v=3', import.meta.url), { type: 'module' });
  let lastLayout = [];
  let pending = null;
  let calculating = false;
  let powerResults = new Map();
  let powerFailed = false;
  const format = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });

  function updatePowerStats() {
    const object = world.objects.find(item => item.id === selected);
    if (!object) return;
    const type = types[object.type];
    const result = powerResults.get(selected);
    const waiting = powerFailed ? 'Unavailable' : 'Calculating…';
    get('powerGeneration').textContent = `${type.powerGeneration} / tick`;
    get('powerConsumption').textContent = `${type.powerConsumption} / tick`;
    get('transmission').textContent = `${type.transmissionCapacity} / tick · ${percent.format(type.transmissionEfficiency)}`;
    get('powerForwarded').textContent = result ? `${format.format(result.forwarded)} / tick` : waiting;
    get('consumerPower').hidden = !type.powerConsumption;
    get('powerReceived').textContent = result ? `${format.format(result.received)} / tick` : waiting;
    get('operatingOutput').textContent = result?.output != null ? percent.format(result.output) : waiting;
  }

  function solvePending() {
    if (!pending || calculating || powerFailed) return;
    calculating = true;
    worker.postMessage({ blocks: pending, length: world.length });
    pending = null;
  }

  worker.onmessage = ({ data: { results, milliseconds } }) => {
    calculating = false;
    if (!pending) {
      powerResults = new Map(results.map(result => [result.id, result]));
      get('powerTiming').textContent = `Power calculation: ${format.format(milliseconds)} ms`;
      updatePowerStats();
    }
    solvePending();
  };
  worker.onerror = () => {
    powerFailed = true;
    get('powerTiming').textContent = 'Power calculation unavailable';
    updatePowerStats();
  };

  function requestPower(objects) {
    if (lastLayout.length === world.objects.length &&
        lastLayout.every((object, i) => object === world.objects[i])) return;
    lastLayout = [...world.objects];
    powerResults.clear();
    if (!powerFailed) get('powerTiming').textContent = 'Calculating power…';
    pending = objects;
    solvePending();
  }

  function toolSize() {
    const moving = mode === 'Move' && world.objects.find(object => object.id === selected);
    return world.size(tool, rotation, moving ? moving.baseSize : undefined);
  }

  function snapshot() {
    // World edits replace component records, so copying the array preserves them.
    return { objects: [...world.objects], nextId: world.nextId, selected, mode, level };
  }

  function editLayout(change) {
    const before = snapshot();
    const result = change();
    if (before.nextId !== world.nextId ||
        JSON.stringify(before.objects) !== JSON.stringify(world.objects)) {
      undoStack.push(before);
      if (undoStack.length > historyLimit) undoStack.shift();
      redoStack.length = 0;
    }
    return result;
  }

  function restoreHistory(from, to) {
    if (!from.length) return;
    to.push(snapshot());
    const state = from.pop();
    world.objects = state.objects;
    world.nextId = state.nextId;
    selected = state.selected;
    mode = state.mode === 'Move' ? 'Select' : state.mode;
    setLayer(state.level);
    render();
  }

  function notify(message) {
    const toast = get('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2700);
  }

  function setLayer(value) {
    level = Math.max(0, Math.min(world.length - 1, value));
    get('level').value = level;
    get('levelValue').textContent = level;
    get('layerDown').disabled = level === 0;
    get('layerUp').disabled = level === world.length - 1;
    view.setLayer(level);
    view.preview(null);
  }

  function renderControls() {
    get('undo').disabled = !undoStack.length;
    get('redo').disabled = !redoStack.length;
    get('mode').textContent = mode;
    get('placeMode').setAttribute('aria-pressed', mode === 'Place');
    get('selectMode').setAttribute('aria-pressed', mode === 'Select');
    get('cancelMove').hidden = mode !== 'Move';
    get('status').textContent = {
      Place: 'Tap the layer to place · Drag to orbit · Pinch to zoom',
      Select: 'Tap a block to inspect · Drag to orbit',
      Move: 'Tap the destination on the build layer',
    }[mode];
    get('footprint').textContent = toolSize().join(' × ');
    for (const button of get('palette').children) {
      const active = button.dataset.tool === tool && mode !== 'Select';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active);
    }
    for (const axis of 'XYZ') get('rotate' + axis).disabled = mode === 'Select';
    view.preview(null);
  }

  function choose(id) {
    selected = id;
    mode = 'Select';
    render();
  }

  function remove() {
    editLayout(() => world.remove(selected));
    selected = null;
    mode = 'Select';
    render();
  }

  function beginMove(object) {
    tool = object.type;
    rotation = [...object.rot];
    setLayer(object.pos[1]);
    mode = 'Move';
    render();
    get('viewport').scrollIntoView({ block: 'nearest' });
  }

  function render() {
    const objects = world.objects.map(object => ({
      ...object,
      size: world.size(object.type, object.rot, object.baseSize),
      color: types[object.type].color,
    }));
    requestPower(objects);
    view.draw(objects, selected);
    get('count').textContent = objects.length;
    const objectList = get('objects');
    objectList.replaceChildren();
    for (const object of objects) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = object.id === selected ? 'object selected' : 'object';
      button.textContent = `${types[object.type].label} #${object.id} · [${object.pos.join(', ')}]`;
      button.onclick = () => choose(object.id);
      objectList.append(button);
    }

    const object = objects.find(item => item.id === selected);
    const inspector = get('inspector');
    get('inspectorTitle').textContent = object ?
      `${types[object.type].label} #${object.id}` : 'No selection';
    inspector.textContent = object ?
      `Origin [${object.pos.join(', ')}] · Size ${object.size.join(' × ')} · Turns [${object.rot.join(', ')}]` :
      'Switch to Select and tap a block.';
    get('powerStats').hidden = !object;
    updatePowerStats();
    get('selectedActions').hidden = !object || mode === 'Move';
    get('moveSelected').onclick = object ? () => beginMove(object) : null;
    for (const [axis, letter] of [...'XYZ'].entries()) {
      get('sel' + letter).onclick = object ? () => {
        const nextRotation = [...object.rot];
        nextRotation[axis] = (nextRotation[axis] + 1) % 4;
        if (!editLayout(() => world.put(object.type, object.pos, nextRotation, object.id))) {
          notify('Rotation blocked by occupied cells or the grid edge');
          return;
        }
        render();
      } : null;
    }
    renderControls();
  }

  for (const [id, type] of Object.entries(types)) {
    const button = document.createElement('button');
    button.className = 'tool';
    button.dataset.tool = id;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = '#' + type.color.toString(16).padStart(6, '0');
    button.append(swatch, type.label);
    button.onclick = () => {
      tool = id;
      rotation = [0, 0, 0];
      selected = null;
      mode = 'Place';
      render();
    };
    get('palette').append(button);
  }

  function tap(event) {
    if (mode === 'Select' || event.shiftKey) {
      choose(view.pick(event));
      return;
    }
    const pos = view.cellAt(event, level);
    if (!pos) {
      notify('Tap inside the active build layer');
      return;
    }
    const moved = mode === 'Move';
    const object = editLayout(() => world.put(tool, pos, rotation, moved ? selected : null));
    if (!object) {
      notify('Cells occupied or outside the grid');
      return;
    }
    if (moved) {
      mode = 'Select';
      notify('Component moved');
    }
    render();
  }

  const pointers = new Set();
  let candidate = null;
  view.canvas.addEventListener('pointerdown', event => {
    pointers.add(event.pointerId);
    candidate = pointers.size === 1 && event.button === 0 ? {
      id: event.pointerId, x: event.clientX, y: event.clientY,
    } : null;
    view.preview(null);
  });
  function checkMovement(event) {
    if (candidate?.id === event.pointerId &&
        Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) > 7) {
      candidate = null;
    }
  }
  view.canvas.addEventListener('pointermove', event => {
    checkMovement(event);
    if (pointers.size || event.pointerType !== 'mouse' || mode === 'Select') return;
    const pos = view.cellAt(event, level);
    const size = toolSize();
    view.preview(pos, size, pos && world.canPlace(pos, size, mode === 'Move' ? selected : null));
  });
  view.canvas.addEventListener('pointerup', event => {
    checkMovement(event);
    const activate = candidate?.id === event.pointerId && pointers.size === 1;
    pointers.delete(event.pointerId);
    candidate = null;
    if (activate) tap(event);
  });
  for (const eventName of ['pointercancel', 'lostpointercapture']) {
    view.canvas.addEventListener(eventName, event => {
      pointers.delete(event.pointerId);
      if (candidate?.id === event.pointerId) candidate = null;
    });
  }
  view.canvas.addEventListener('pointerleave', () => view.preview(null));
  view.canvas.addEventListener('contextmenu', event => event.preventDefault());

  get('placeMode').onclick = () => { mode = 'Place'; selected = null; render(); };
  get('selectMode').onclick = () => { mode = 'Select'; render(); };
  get('cancelMove').onclick = () => choose(selected);
  get('undo').onclick = () => restoreHistory(undoStack, redoStack);
  get('redo').onclick = () => restoreHistory(redoStack, undoStack);
  get('deleteSelected').onclick = remove;
  for (const [axis, letter] of [...'XYZ'].entries()) {
    get('rotate' + letter).onclick = () => {
      rotation[axis] = (rotation[axis] + 1) % 4;
      renderControls();
    };
  }
  get('level').oninput = event => setLayer(Number(event.target.value));
  get('layerDown').onclick = () => setLayer(level - 1);
  get('layerUp').onclick = () => setLayer(level + 1);

  function replaceLayout(data) {
    editLayout(() => world.load(data, { legacyLength: 12 }));
    selected = null;
    mode = 'Place';
    setLayer(0);
    render();
  }

  get('demo').onclick = () => {
    if (world.objects.length && !confirm('Replace the current layout with the example?')) return;
    replaceLayout(example);
    notify('Select either engine to compare wire and hull power.');
  };
  get('clear').onclick = () => {
    if (world.objects.length && confirm('Clear all components?')) replaceLayout({ objects: [] });
  };
  get('save').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(world.serialize(), null, 2)], {
      type: 'application/json',
    }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spaceship-layout.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  get('load').onclick = () => get('file').click();
  get('file').onchange = async event => {
    const [file] = event.target.files;
    if (!file) return;
    event.target.value = '';
    try {
      replaceLayout(JSON.parse(await file.text()));
      notify('Layout loaded');
    } catch (error) {
      notify('Could not load layout. ' + error.message);
    }
  };

  document.addEventListener('keydown', event => {
    if (event.target.matches('input, button')) return;
    const key = event.key.toLowerCase();
    if (key === 'q') setLayer(level - 1);
    if (key === 'e') setLayer(level + 1);
    if (key === 'r') get('rotateY').click();
    if (key === 'escape') choose(null);
    if (key === 'delete' && selected !== null) remove();
  });
  setLayer(0);
  render();
}
