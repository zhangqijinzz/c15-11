import type { InputHTMLAttributes, ReactNode } from 'react';
import { useDraftField } from '../hooks';

type DraftInputProps = {
  /** 已确认数据的展示文本，未编辑时直接显示 */
  value: string;
  /** 确认（失焦/回车）时调用；返回错误信息表示拒绝并保留草稿，返回 null 表示接受 */
  onCommit: (text: string) => string | null;
  /** 输入框前的装饰（如货币符号），提供时会带上 input-prefix 外壳 */
  leading?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'onKeyDown'>;

/** 草稿式输入框：输入过程不影响已确认数据，失焦/回车确认时才校验落盘，失败就地提示并保留草稿 */
export function DraftInput({ value, onCommit, leading, ...rest }: DraftInputProps) {
  const field = useDraftField({ value, onCommit });
  const input = <input {...rest} {...field.inputProps} />;
  return (
    <>
      {leading ? <div className="input-prefix">{leading}{input}</div> : input}
      {field.error && <span className="field-error" role="alert">{field.error}</span>}
    </>
  );
}
