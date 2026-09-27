// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DraftInput } from '../components/DraftInput';
import { parseNumberDraft } from '../domain';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/** 模拟 DeviceEditor 的用法：父组件持有已确认数据，校验通过才更新 */
function Harness({ onCommit }: { onCommit: (text: string) => string | null }) {
  const [value, setValue] = useState('1200');
  return (
    <DraftInput
      value={value}
      onCommit={(text) => {
        const error = onCommit(text);
        if (!error) setValue(text);
        return error;
      }}
    />
  );
}

const validateWatts = (text: string): string | null => {
  const parsed = parseNumberDraft(text, '功率');
  if (!parsed.ok) return parsed.error;
  if (parsed.value < 0) return '功率不能为负数';
  return null;
};

function typeText(input: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('draft field editing', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(onCommit: (text: string) => string | null): HTMLInputElement {
    act(() => root.render(<Harness onCommit={onCommit} />));
    return container.querySelector('input')!;
  }

  it('types into a local draft without committing or recalculating', () => {
    const commit = vi.fn(validateWatts);
    const input = render(commit);
    act(() => {
      typeText(input, '');
      typeText(input, '5');
    });
    expect(input.value).toBe('5');
    expect(commit).not.toHaveBeenCalled();
    expect(container.querySelector('.field-error')).toBeNull();
  });

  it('keeps the cleared draft and explains the problem when confirm fails', () => {
    const commit = vi.fn(validateWatts);
    const input = render(commit);
    act(() => typeText(input, ''));
    act(() => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(commit).toHaveBeenCalledWith('');
    expect(input.value).toBe('');
    expect(container.querySelector('.field-error')?.textContent).toBe('请填写功率');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps the invalid draft and the confirmed data stays untouched', () => {
    const commit = vi.fn(validateWatts);
    const input = render(commit);
    act(() => typeText(input, '-50'));
    act(() => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(input.value).toBe('-50');
    expect(container.querySelector('.field-error')?.textContent).toBe('功率不能为负数');
    // 修正草稿后再次确认，错误清除并恢复正常显示
    act(() => typeText(input, '800'));
    expect(container.querySelector('.field-error')).toBeNull();
    act(() => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(input.value).toBe('800');
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('commits a valid value on Enter and falls back to the confirmed display', () => {
    const commit = vi.fn(validateWatts);
    const input = render(commit);
    act(() => typeText(input, '800'));
    expect(commit).not.toHaveBeenCalled();
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(commit).toHaveBeenCalledWith('800');
    expect(input.value).toBe('800');
  });

  it('reverts the draft on Escape without touching confirmed data', () => {
    const commit = vi.fn(validateWatts);
    const input = render(commit);
    act(() => typeText(input, 'abc'));
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(input.value).toBe('1200');
    expect(commit).not.toHaveBeenCalled();
  });
});
