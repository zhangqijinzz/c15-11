import { describe, expect, it } from 'vitest';
import { estimateDevice, parseNumberInput, summarizeScenario, validateDevice } from '../domain';
import type { EnergyScenario } from '../types';

describe('energy domain', () => {
  it('calculates kWh and cost from watts, hours, days and price', () => {
    const result = estimateDevice({ id: 'a', name: '空调', watts: 1000, dailyHours: 2 }, 30, 0.5);
    expect(result).toEqual({ dailyKwh: 2, monthlyKwh: 60, monthlyCost: 30 });
  });

  it('keeps device shares explainable and sums to 100%', () => {
    const scenario: EnergyScenario = { id: 's', name: 'test', pricePerKwh: 1, daysPerMonth: 30, createdAt: '', devices: [
      { id: 'a', name: 'a', watts: 100, dailyHours: 1 }, { id: 'b', name: 'b', watts: 300, dailyHours: 1 },
    ] };
    const summary = summarizeScenario(scenario);
    expect(summary.total.monthlyKwh).toBe(12);
    expect(summary.devices.map((device) => device.share)).toEqual([0.25, 0.75]);
  });

  it('rejects negative power and more than 24 hours', () => {
    expect(validateDevice({ name: 'x', watts: -1, dailyHours: 1 })).toBe('功率不能为负数');
    expect(validateDevice({ name: 'x', watts: 1, dailyHours: 24.1 })).toBe('每日使用时间不能超过 24 小时');
  });

  it('parses confirmed drafts and never turns empty input into zero', () => {
    expect(parseNumberInput('800', '功率')).toEqual({ value: 800 });
    expect(parseNumberInput(' 0.62 ', '电价')).toEqual({ value: 0.62 });
    expect(parseNumberInput(2, '每日使用时间')).toEqual({ value: 2 });
    expect(parseNumberInput('', '功率')).toEqual({ error: '请填写功率' });
    expect(parseNumberInput('   ', '功率')).toEqual({ error: '请填写功率' });
    expect(parseNumberInput('abc', '电价')).toEqual({ error: '电价需为有效数字' });
    expect(parseNumberInput(Number.NaN, '电价')).toEqual({ error: '电价需为有效数字' });
  });
});
