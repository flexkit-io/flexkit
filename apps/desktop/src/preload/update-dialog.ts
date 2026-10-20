import { ipcRenderer } from 'electron';
import { UPDATE_DIALOG_CHOICE, UPDATE_DIALOG_SIZE } from '../main/update-dialog-channels';

/**
 * Wires the update dialog page (src/main/update-dialog.ts): button presses
 * and Enter/Escape answer with the choice and the checkbox state, and the
 * page's height is reported so the window fits it.
 */
function autoDownload(): boolean {
  return (document.getElementById('auto') as HTMLInputElement | null)?.checked === true;
}

function answer(choice: string): void {
  ipcRenderer.send(UPDATE_DIALOG_CHOICE, { choice, autoDownload: autoDownload() });
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auto')?.addEventListener('change', () => answer('checkbox'));

  document.querySelectorAll<HTMLButtonElement>('button[data-choice]').forEach((button) => {
    button.addEventListener('click', () => answer(button.dataset.choice ?? 'later'));
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      answer('later');
    } else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
      const primary = document.querySelector<HTMLButtonElement>('button.primary');

      answer(primary?.dataset.choice ?? 'later');
    }
  });

  // The content's height (the body fills the window, so its height says nothing).
  const main = document.querySelector('main');

  ipcRenderer.send(UPDATE_DIALOG_SIZE, main ? main.getBoundingClientRect().bottom : document.documentElement.scrollHeight);
});
