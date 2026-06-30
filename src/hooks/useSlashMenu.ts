import { useCallback, useState } from "react";
import { SLASH_ACTIONS } from "@/components/items/SlashMenu";
import { t } from "@/i18n/service";
import {
  applySlashAction,
  getSlashQuery,
  type SlashAction,
} from "@/lib/slash-menu";

interface SlashState {
  start: number;
  caret: number;
}

/**
 * Drives the "/" formatting menu for a controlled text input. The parent owns
 * the value; this hook reads caret position off the DOM node, decides when the
 * menu is open, runs keyboard navigation, and reports the rewritten value via
 * onChange (then restores the caret/selection on the node).
 */
export function useSlashMenu(onChange: (value: string) => void) {
  const [state, setState] = useState<SlashState | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const sync = useCallback((el: HTMLInputElement) => {
    const caret = el.selectionStart ?? el.value.length;
    const hit = getSlashQuery(el.value, caret);
    if (hit) {
      setState({ start: hit.start, caret });
      setActiveIndex(0);
    } else {
      setState(null);
    }
  }, []);

  const close = useCallback(() => setState(null), []);

  const apply = useCallback(
    (action: SlashAction, el: HTMLInputElement, st: SlashState) => {
      const result = applySlashAction({
        value: el.value,
        start: st.start,
        caret: st.caret,
        action,
        placeholder: t("list.slashBoldPlaceholder"),
        urlPlaceholder: t("list.slashLinkUrlPlaceholder"),
      });
      setState(null);
      onChange(result.value);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    },
    [onChange]
  );

  const select = useCallback(
    (action: SlashAction, el: HTMLInputElement) => {
      if (!state) return;
      apply(action, el, state);
    },
    [state, apply]
  );

  const onKeyDown = useCallback(
    (
      e: { key: string; preventDefault: () => void },
      el: HTMLInputElement
    ): boolean => {
      if (!state) return false;
      const count = SLASH_ACTIONS.length;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % count);
          return true;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + count) % count);
          return true;
        case "Enter":
          e.preventDefault();
          apply(SLASH_ACTIONS[activeIndex].action, el, state);
          return true;
        case "Escape":
          e.preventDefault();
          setState(null);
          return true;
        default:
          return false;
      }
    },
    [state, activeIndex, apply]
  );

  return {
    open: state !== null,
    activeIndex,
    sync,
    onKeyDown,
    select,
    close,
  };
}
