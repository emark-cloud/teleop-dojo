import { isKeyDown } from '../controls/keyboard';

/** [negKey, negLabel, posKey, posLabel, actionDescription] */
const KEY_PAIRS: [string, string, string, string, string][] = [
  ['ArrowDown', '\u2193', 'ArrowUp', '\u2191', 'Elbow'],
  ['KeyA', 'A', 'KeyD', 'D', 'Rotate'],
  ['ArrowLeft', '\u2190', 'ArrowRight', '\u2192', 'Wrist roll'],
  ['KeyS', 'S', 'KeyW', 'W', 'Wrist pitch'],
  ['KeyQ', 'Q', 'KeyE', 'E', 'Lift'],
  ['KeyC', 'C', 'KeyV', 'V', 'Slide'],
  ['KeyZ', 'Z', 'KeyX', 'X', 'Grip'],
];

export class HUD {
  private keyIndicatorsEl: HTMLElement;
  private keyElements: Map<string, HTMLElement> = new Map();

  constructor() {
    this.keyIndicatorsEl = document.getElementById('key-indicators')!;
    this.createKeyIndicators();
  }

  private createKeyIndicators(): void {
    this.keyIndicatorsEl.innerHTML = '';
    for (const [negCode, negLabel, posCode, posLabel, action] of KEY_PAIRS) {
      const row = document.createElement('div');
      row.className = 'key-row';

      const negEl = document.createElement('div');
      negEl.className = 'key-indicator';
      negEl.textContent = negLabel;

      const posEl = document.createElement('div');
      posEl.className = 'key-indicator';
      posEl.textContent = posLabel;

      const actionEl = document.createElement('span');
      actionEl.className = 'key-action';
      actionEl.textContent = action;

      row.appendChild(negEl);
      row.appendChild(posEl);
      row.appendChild(actionEl);
      this.keyIndicatorsEl.appendChild(row);
      this.keyElements.set(negCode, negEl);
      this.keyElements.set(posCode, posEl);
    }
  }

  update(): void {
    for (const [code, el] of this.keyElements) {
      el.classList.toggle('active', isKeyDown(code));
    }
  }
}
