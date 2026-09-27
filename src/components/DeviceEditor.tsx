import { parseNumberDraft, validateDevice } from '../domain';
import type { EnergyDevice } from '../types';
import { DraftInput } from './DraftInput';

interface DeviceEditorProps {
  device: EnergyDevice;
  onChange: (patch: Partial<EnergyDevice>) => void;
  onRemove: () => void;
}

export function DeviceEditor({ device, onChange, onRemove }: DeviceEditorProps) {
  const commitName = (text: string): string | null => {
    const error = validateDevice({ ...device, name: text });
    if (error) return error;
    if (text !== device.name) onChange({ name: text });
    return null;
  };

  const commitNumber = (key: 'watts' | 'dailyHours', label: string) => (text: string): string | null => {
    const parsed = parseNumberDraft(text, label);
    if (!parsed.ok) return parsed.error;
    const error = validateDevice({ ...device, [key]: parsed.value });
    if (error) return error;
    if (parsed.value !== device[key]) onChange({ [key]: parsed.value });
    return null;
  };

  return (
    <div className="device-row">
      <div className="device-icon">{device.name.slice(0, 1) || '·'}</div>
      <label className="field device-name"><span>设备名称</span><DraftInput value={device.name} onCommit={commitName} /></label>
      <label className="field"><span>功率 <em>W</em></span><DraftInput type="number" min="0" step="10" value={String(device.watts)} onCommit={commitNumber('watts', '功率')} /></label>
      <label className="field"><span>每日使用 <em>小时</em></span><DraftInput type="number" min="0" max="24" step="0.5" value={String(device.dailyHours)} onCommit={commitNumber('dailyHours', '每日使用时间')} /></label>
      <button className="icon-button" onClick={onRemove} aria-label={`移除${device.name}`}>×</button>
    </div>
  );
}
