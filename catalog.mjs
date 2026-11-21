export const gridLength = 30;

export const types = {
  reactor: { label: 'Reactor', size: [3, 3, 3], legacySize: [2, 2, 2], color: 0xf6b34f, powerGeneration: 100, powerConsumption: 0, transmissionCapacity: 30, transmissionEfficiency: 0.9 },
  battery: { label: 'Battery', storageCapacity: 200, chargeRate: 30, dischargeRate: 20, size: [1, 1, 1], color: 0x5fd3b3, powerGeneration: 0, powerConsumption: 0, transmissionCapacity: 30, transmissionEfficiency: 0.9 },
  engine: { label: 'Engine', size: [2, 1, 1], color: 0x6ba7ff, powerGeneration: 0, powerConsumption: 30, transmissionCapacity: 30, transmissionEfficiency: 0.9 },
  wire: { label: 'Wire', size: [1, 1, 1], color: 0xb4a1ff, powerGeneration: 0, powerConsumption: 0, transmissionCapacity: 100, transmissionEfficiency: 0.98 },
  hull: { label: 'Hull', size: [1, 1, 1], color: 0x8d9cb1, powerGeneration: 0, powerConsumption: 0, transmissionCapacity: 10, transmissionEfficiency: 0.6 },
};
