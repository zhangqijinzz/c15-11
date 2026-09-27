import { useEffect, useState, type ChangeEvent, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { LocalEnergyRepository } from './repository';
import { EnergyLensViewModel, type EnergyLensState } from './viewModel';

export function useEnergyLens(): { vm: EnergyLensViewModel; state: EnergyLensState } {
  const [vm] = useState(() => new EnergyLensViewModel(new LocalEnergyRepository()));
  const [state, setState] = useState(vm.getState());
  useEffect(() => {
    const unsubscribe = vm.subscribe(setState);
    vm.initialize();
    return unsubscribe;
  }, [vm]);
  return { vm, state };
}

interface DraftFieldProps {
  /** 已确认数据的展示文本，未编辑时直接显示 */
  value: string;
  /** 确认（失焦/回车）时调用；返回错误信息表示拒绝并保留草稿，返回 null 表示接受 */
  onCommit: (text: string) => string | null;
}

interface DraftField {
  error: string | null;
  inputProps: Pick<InputHTMLAttributes<HTMLInputElement>, 'value' | 'aria-invalid' | 'onChange' | 'onBlur' | 'onKeyDown'>;
}

/**
 * 把"正在输入的草稿"和"已确认的数据"分开：
 * 输入过程只更新本地草稿，不校验、不触发计算、不保存；
 * 失焦或回车时才通过 onCommit 校验落盘，失败则保留草稿并提示，Escape 放弃修改。
 */
export function useDraftField({ value, onCommit }: DraftFieldProps): DraftField {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    if (draft === value) {
      setDraft(null);
      setError(null);
      return;
    }
    const problem = onCommit(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setDraft(null);
    setError(null);
  };

  return {
    error,
    inputProps: {
      value: draft ?? value,
      'aria-invalid': error ? true : undefined,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        setDraft(event.target.value);
        setError(null);
      },
      onBlur: commit,
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') commit();
        if (event.key === 'Escape') {
          setDraft(null);
          setError(null);
        }
      },
    },
  };
}
