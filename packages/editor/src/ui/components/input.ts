import { icons } from '../toolbar/icons';

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
  const container = document.createElement('div');

  if (options.label) {
    const label = document.createElement('label');
    label.className = 'be-block be-text-sm be-font-medium be-text-gray-700 be-mb-2';
    label.innerHTML = options.label;
    container.appendChild(label);
  }

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'be-relative';

  const input = document.createElement('input');
  input.type = options.type || 'text';
  input.value = options.value || '';
  input.placeholder = options.placeholder || '';

  const focusBorderColor = options.themeColor === 'blue' ? '#3b82f6' : '#8b5cf6';
  const focusRing = options.themeColor === 'blue' ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)';

  input.className = `be-w-full be-border be-border-gray-200 be-rounded-xl ${options.icon ? 'be-pl-10' : 'be-px-4'} be-py-3 be-text-sm be-outline-none be-transition-all`;
  input.style.fontFamily = 'inherit';

  input.addEventListener('focus', () => {
    input.style.borderColor = focusBorderColor;
    input.style.boxShadow = `0 0 0 3px ${focusRing}`;
  });
  input.addEventListener('blur', () => {
    input.style.borderColor = '';
    input.style.boxShadow = '';
  });

  if (options.autoFocus) {
    setTimeout(() => input.focus(), 50);
  }

  input.oninput = (e) => {
    if (options.onChange) {
      options.onChange((e.target as HTMLInputElement).value);
    }
  };

  if (options.icon && icons[options.icon]) {
    const iconContainer = document.createElement('div');
    iconContainer.className = 'be-absolute be-left-3 be-top-1/2 be--translate-y-1/2 be-text-gray-400 be-pointer-events-none be-flex be-items-center be-justify-center';
    iconContainer.innerHTML = icons[options.icon];
    const svg = iconContainer.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
    }
    inputWrapper.appendChild(iconContainer);
  }

  inputWrapper.appendChild(input);
  container.appendChild(inputWrapper);

  return container;
}
