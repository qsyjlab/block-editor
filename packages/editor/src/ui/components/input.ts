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
  const theme = options.themeColor || 'purple';
  
  if (options.label) {
    const label = document.createElement('label');
    label.className = 'be-block be-text-sm be-font-medium be-text-gray-700 be-mb-2';
    label.innerHTML = options.label; // Use innerHTML to allow HTML in label (e.g. <span class="text-gray-400 font-normal">(可选)</span>)
    container.appendChild(label);
  }

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'be-relative';

  const input = document.createElement('input');
  input.type = options.type || 'text';
  input.value = options.value || '';
  input.placeholder = options.placeholder || '';
  
  const focusBorderColor = theme === 'blue' ? 'be-focus:border-blue-500' : 'be-focus:border-purple-500';
  const focusRingColor = theme === 'blue' ? 'be-focus:ring-blue-50' : 'be-focus:ring-purple-50';
  const paddingLeft = options.icon ? 'be-pl-10' : 'be-px-4';

  input.className = `be-w-full be-border be-border-gray-200 be-rounded-xl ${paddingLeft} be-py-3 be-text-sm be-outline-none ${focusBorderColor} be-focus:ring-4 ${focusRingColor} be-transition-all`;
  
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
      
      // Resize SVG if needed
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
