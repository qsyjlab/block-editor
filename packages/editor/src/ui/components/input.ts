import { createBaseInput } from "./BaseInput";

export function createInput(options: {
  label?: string;
  placeholder?: string;
  value?: string;
  type?: string;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
  icon?: string;
  themeColor?: 'purple' | 'blue';
}): HTMLElement {
  const { container } = createBaseInput({
    label: options.label,
    placeholder: options.placeholder,
    value: options.value,
    type: options.type,
    autoFocus: options.autoFocus,
    icon: options.icon,
    onChange: options.onChange,
  });
  return container;
}
