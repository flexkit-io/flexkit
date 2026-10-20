/**
 * IPC channels of the update dialog, kept out of `constants.ts`: the dialog's
 * preload must not share a module (and so a bundle chunk) with the Studio
 * preload, because a sandboxed preload cannot `require` other files.
 */
export const UPDATE_DIALOG_SIZE = 'desktop:update-dialog-size';
export const UPDATE_DIALOG_CHOICE = 'desktop:update-dialog-choice';
