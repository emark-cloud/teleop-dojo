const keyState = new Map<string, boolean>();

export function initKeyboard(): void {
  window.addEventListener('keydown', (e) => {
    keyState.set(e.code, true);
    // Prevent arrow keys from scrolling
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });

  window.addEventListener('keyup', (e) => {
    keyState.set(e.code, false);
  });

  // Clear all keys on blur (prevents stuck keys)
  window.addEventListener('blur', () => {
    keyState.clear();
  });
}

export function isKeyDown(code: string): boolean {
  return keyState.get(code) === true;
}

export function anyKeyPressed(): boolean {
  for (const v of keyState.values()) {
    if (v) return true;
  }
  return false;
}

/** Returns true once per press (resets on read) */
const keyJustPressed = new Set<string>();
const keyJustPressedBuffer = new Set<string>();

export function initKeyJustPressed(): void {
  window.addEventListener('keydown', (e) => {
    if (!e.repeat) {
      keyJustPressedBuffer.add(e.code);
    }
  });
}

export function flushJustPressed(): void {
  keyJustPressed.clear();
  for (const code of keyJustPressedBuffer) {
    keyJustPressed.add(code);
  }
  keyJustPressedBuffer.clear();
}

export function wasKeyJustPressed(code: string): boolean {
  return keyJustPressed.has(code);
}
