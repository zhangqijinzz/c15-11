import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exampleScenario } from '../domain';
import type { EnergyDocument } from '../types';
import { EnergyLensViewModel } from '../viewModel';
import type { EnergyRepository } from '../repository';

function makeRepository(): EnergyRepository & { data: EnergyDocument; save: ReturnType<typeof vi.fn> } {
  const data: EnergyDocument = { version: 1, scenarios: [structuredClone(exampleScenario)], activeScenarioId: exampleScenario.id };
  return { data, load: () => data, save: vi.fn((next: EnergyDocument) => { data.scenarios = next.scenarios; data.activeScenarioId = next.activeScenarioId; }) };
}

describe('EnergyLensViewModel', () => {
  let repository: ReturnType<typeof makeRepository>;
  let vm: EnergyLensViewModel;
  beforeEach(() => { repository = makeRepository(); vm = new EnergyLensViewModel(repository); vm.initialize(); });

  it('initializes, persists edits, and recalculates results', () => {
    expect(vm.getState().status).toBe('ready');
    const before = vm.activeSummary?.total.monthlyKwh;
    vm.updateDevice('device-aircon', { dailyHours: 2 });
    expect(vm.activeSummary?.total.monthlyKwh).toBeLessThan(before ?? Infinity);
    expect(repository.save).toHaveBeenCalled();
  });

  it('keeps invalid values out of the document and exposes an error notice', () => {
    vm.updateDevice('device-aircon', { watts: -50 });
    expect(vm.getState().status).toBe('error');
    expect(vm.getState().notice?.text).toBe('功率不能为负数');
    expect(vm.activeScenario?.devices[0].watts).toBe(1200);
  });

  it('commits a confirmed draft and returns null on success', () => {
    const error = vm.updateDevice('device-aircon', { watts: '800' });
    expect(error).toBeNull();
    expect(vm.activeScenario?.devices[0].watts).toBe(800);
    expect(repository.save).toHaveBeenCalled();
  });

  it('rejects an empty draft without touching the document or storage', () => {
    const saveCalls = repository.save.mock.calls.length;
    const error = vm.updateDevice('device-aircon', { watts: '' });
    expect(error).toBe('请填写功率');
    expect(vm.getState().notice?.kind).toBe('error');
    expect(vm.activeScenario?.devices[0].watts).toBe(1200);
    expect(vm.activeSummary?.total.monthlyKwh).toBeGreaterThan(0);
    expect(repository.save.mock.calls.length).toBe(saveCalls);
  });

  it('rejects an empty device name without polluting saved data', () => {
    const error = vm.updateDevice('device-aircon', { name: '   ' });
    expect(error).toBe('请填写设备名称');
    expect(vm.activeScenario?.devices[0].name).toBe('客厅空调');
  });

  it('rejects out-of-range settings drafts and keeps the committed values', () => {
    expect(vm.updateSettings({ daysPerMonth: '' })).toBe('请填写计费天数');
    expect(vm.updateSettings({ daysPerMonth: '40' })).toBe('计费天数需在 1–31 天之间');
    expect(vm.activeScenario?.daysPerMonth).toBe(30);
    expect(vm.updateSettings({ pricePerKwh: '0.8' })).toBeNull();
    expect(vm.activeScenario?.pricePerKwh).toBe(0.8);
  });

  it('duplicates a scenario and can recover a saved document', () => {
    vm.duplicateActive();
    expect(vm.getState().document?.scenarios).toHaveLength(2);
    const recovered = new EnergyLensViewModel(repository);
    recovered.initialize();
    expect(recovered.getState().document?.scenarios).toHaveLength(2);
  });

  it('surfaces persistence failure as a recoverable error', () => {
    repository.save.mockImplementation(() => { throw new Error('quota'); });
    vm.addDevice();
    expect(vm.getState().status).toBe('error');
    expect(vm.getState().notice?.text).toContain('保存失败');
  });
});
