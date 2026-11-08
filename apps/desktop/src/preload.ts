import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('passvaultDesktop', {
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
});

