import type { DeviceDraftPatch } from '../viewModel';
import type { EnergyDevice } from '../types';
import { DraftInput } from './DraftInput';

interface DeviceEditorProps {
  device: EnergyDevice;
  onCommit: (patch: DeviceDraftPatch) => string | null;
  onRemove: () => void;
}

export function DeviceEditor({ device, onCommit, onRemove }: DeviceEditorProps) {
  return (
    <div className="device-row">
      <div className="device-icon">{device.name.slice(0, 1) || '·'}</div>
      <label className="field device-name"><span>设备名称</span><DraftInput committed={device.name} onCommit={(raw) => onCommit({ name: raw })} /></label>
      <label className="field"><span>功率 <em>W</em></span><DraftInput type="number" min="0" step="10" committed={String(device.watts)} onCommit={(raw) => onCommit({ watts: raw })} /></label>
      <label className="field"><span>每日使用 <em>小时</em></span><DraftInput type="number" min="0" max="24" step="0.5" committed={String(device.dailyHours)} onCommit={(raw) => onCommit({ dailyHours: raw })} /></label>
      <button className="icon-button" onClick={onRemove} aria-label={`移除${device.name}`}>×</button>
    </div>
  );
}
