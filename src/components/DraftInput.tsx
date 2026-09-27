import { useState } from 'react';
import type { InputHTMLAttributes, KeyboardEvent } from 'react';

interface DraftInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'onFocus' | 'onKeyDown'> {
  /** 已落盘的值，格式化后的字符串；未在编辑时直接展示它 */
  committed: string;
  /** 确认（失焦/回车）时调用，返回 null 表示校验通过并已保存，否则返回错误信息 */
  onCommit: (raw: string) => string | null;
}

/**
 * 草稿输入框：打字过程只更新本地草稿，不触发计算与保存；
 * 确认时才提交校验，失败则保留草稿，绝不回写已落盘的数据。
 */
export function DraftInput({ committed, onCommit, ...rest }: DraftInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    if (draft === committed || onCommit(draft) === null) setDraft(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };

  return (
    <input
      {...rest}
      value={draft ?? committed}
      onFocus={() => setDraft((current) => current ?? committed)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}
