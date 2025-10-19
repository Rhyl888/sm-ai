import { MAIN_WIN_SIZE, WINDOW_NAMES } from '@common/constants';
import windowManager from '@main/service/WindowService';

export function setupMainWindow() {
  windowManager.create(WINDOW_NAMES.MAIN, MAIN_WIN_SIZE);
}
