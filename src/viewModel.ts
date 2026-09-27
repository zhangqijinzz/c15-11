import { cloneScenario, parseNumberInput, summarizeScenario, validateDevice, validateScenarioSettings } from './domain';
import { findScenario, type EnergyRepository } from './repository';
import type { EnergyDevice, EnergyDocument, EnergyScenario, Notice, ViewStatus } from './types';

export interface EnergyLensState {
  document: EnergyDocument | null;
  status: ViewStatus;
  notice: Notice | null;
}

export type DeviceDraftPatch = Partial<{ name: string; watts: number | string; dailyHours: number | string }>;
export type SettingsDraftPatch = Partial<{ name: string; pricePerKwh: number | string; daysPerMonth: number | string }>;

type Listener = (state: EnergyLensState) => void;

export class EnergyLensViewModel {
  private state: EnergyLensState = { document: null, status: 'loading', notice: null };
  private readonly listeners = new Set<Listener>();

  constructor(private readonly repository: EnergyRepository) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): EnergyLensState { return this.state; }

  initialize(): void {
    try {
      this.state = { document: this.repository.load(), status: 'ready', notice: null };
    } catch {
      this.state = { document: null, status: 'error', notice: { kind: 'error', text: '本地数据读取失败，请刷新重试' } };
    }
    this.emit();
  }

  get activeScenario(): EnergyScenario | null {
    if (!this.state.document) return null;
    return findScenario(this.state.document, this.state.document.activeScenarioId) ?? null;
  }

  get activeSummary() {
    return this.activeScenario ? summarizeScenario(this.activeScenario) : null;
  }

  updateDevice(deviceId: string, patch: DeviceDraftPatch): string | null {
    const scenario = this.activeScenario;
    if (!scenario) return null;
    const device = scenario.devices.find((item) => item.id === deviceId);
    if (!device) return null;
    const next: EnergyDevice = { ...device };
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.watts !== undefined) {
      const parsed = parseNumberInput(patch.watts, '功率');
      if ('error' in parsed) return this.reject(parsed.error);
      next.watts = parsed.value;
    }
    if (patch.dailyHours !== undefined) {
      const parsed = parseNumberInput(patch.dailyHours, '每日使用时间');
      if ('error' in parsed) return this.reject(parsed.error);
      next.dailyHours = parsed.value;
    }
    const error = validateDevice(next);
    if (error) return this.reject(error);
    this.commit((current) => ({ ...current, devices: current.devices.map((item) => item.id === deviceId ? next : item) }), '参数已更新');
    return null;
  }

  addDevice(): void {
    const scenario = this.activeScenario;
    if (!scenario) return;
    const device: EnergyDevice = { id: `device-${Date.now()}`, name: '新设备', watts: 100, dailyHours: 1 };
    this.commit((current) => ({ ...current, devices: [...current.devices, device] }), '已添加设备，可继续修改参数');
  }

  removeDevice(deviceId: string): void {
    const scenario = this.activeScenario;
    if (!scenario || scenario.devices.length <= 1) {
      this.setNotice({ kind: 'info', text: '至少保留一个设备，便于计算方案' });
      return;
    }
    this.commit((current) => ({ ...current, devices: current.devices.filter((item) => item.id !== deviceId) }), '设备已移除');
  }

  updateSettings(patch: SettingsDraftPatch): string | null {
    const scenario = this.activeScenario;
    if (!scenario) return null;
    const next = { ...scenario };
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.pricePerKwh !== undefined) {
      const parsed = parseNumberInput(patch.pricePerKwh, '电价');
      if ('error' in parsed) return this.reject(parsed.error);
      next.pricePerKwh = parsed.value;
    }
    if (patch.daysPerMonth !== undefined) {
      const parsed = parseNumberInput(patch.daysPerMonth, '计费天数');
      if ('error' in parsed) return this.reject(parsed.error);
      next.daysPerMonth = parsed.value;
    }
    const error = validateScenarioSettings(next.pricePerKwh, next.daysPerMonth);
    if (error) return this.reject(error);
    this.commit((current) => ({ ...current, name: next.name.trim() || '未命名方案', pricePerKwh: next.pricePerKwh, daysPerMonth: next.daysPerMonth }), '计费参数已更新');
    return null;
  }

  duplicateActive(): void {
    const source = this.activeScenario;
    if (!source || !this.state.document) return;
    const id = `scenario-${Date.now()}`;
    const copy = cloneScenario(source, id, `${source.name} · 副本`);
    const document = { ...this.state.document, scenarios: [...this.state.document.scenarios, copy], activeScenarioId: id };
    this.persist(document, '方案已复制，现在可以修改副本');
  }

  selectScenario(id: string): void {
    if (!this.state.document || !findScenario(this.state.document, id)) return;
    this.persist({ ...this.state.document, activeScenarioId: id }, '已切换方案');
  }

  complete(): void {
    this.state = { ...this.state, status: 'completed', notice: { kind: 'success', text: '本次推演已保存，可随时回来继续调整' } };
    this.emit();
  }

  private commit(update: (scenario: EnergyScenario) => EnergyScenario, notice: string): void {
    if (!this.state.document) return;
    const document = { ...this.state.document, scenarios: this.state.document.scenarios.map((scenario) => scenario.id === this.state.document?.activeScenarioId ? update(scenario) : scenario) };
    this.persist(document, notice);
  }

  private persist(document: EnergyDocument, notice: string): void {
    try {
      this.repository.save(document);
      this.state = { document, status: 'editing', notice: { kind: 'success', text: notice } };
    } catch {
      this.state = { ...this.state, status: 'error', notice: { kind: 'error', text: '保存失败，当前页面仍可继续编辑' } };
    }
    this.emit();
  }

  private reject(error: string): string {
    this.setNotice({ kind: 'error', text: error });
    return error;
  }

  private setNotice(notice: Notice): void {
    this.state = { ...this.state, status: notice.kind === 'error' ? 'error' : 'editing', notice };
    this.emit();
  }

  private emit(): void { this.listeners.forEach((listener) => listener(this.state)); }
}
