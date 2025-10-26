import { BrowserWindow, ipcMain, nativeTheme } from "electron";
import {logManager} from "./LogService";
import { IPC_EVENTS } from "@common/constants";

class ThemeService {
  private static _instance: ThemeService;
  private is_Dark: boolean = nativeTheme.shouldUseDarkColors;

  private constructor() {
    const themeMode = 'dark' 
    if (themeMode) {
      nativeTheme.themeSource = themeMode;
      this.is_Dark = nativeTheme.shouldUseDarkColors;
    }
    this._setupIpcEvents();
    logManager.info('ThemeService initialized successfully.');
  }

  private _setupIpcEvents() {
    ipcMain.handle(IPC_EVENTS.SET_THEME_MODE, (_e, mode: ThemeMode) => {
      nativeTheme.themeSource = mode;
      this.is_Dark = nativeTheme.shouldUseDarkColors;
    });
    ipcMain.handle(IPC_EVENTS.GET_THEME_MODE, () => {
      return nativeTheme.themeSource;
    });
    ipcMain.handle(IPC_EVENTS.IS_DARK_THEME, () => {
      return nativeTheme.shouldUseDarkColors;
    }); 
    nativeTheme.on('updated', () => {
      this.is_Dark = nativeTheme.shouldUseDarkColors;
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send(IPC_EVENTS.THEME_MODE_UPDATED, this.is_Dark);
      });
    });
  }

  public static getInstance() {
    if (!this._instance) {
      this._instance = new ThemeService();
    }
    return this._instance;
  }

  public get isDark() {
    return this.is_Dark;
  }

  public get themeMode() {
    return nativeTheme.themeSource;
  }
  
}

export const themeManager = ThemeService.getInstance();
export default themeManager;
