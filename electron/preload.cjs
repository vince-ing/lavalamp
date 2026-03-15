const { ipcRenderer } = require('electron');

window.setIgnoreMouse = (ignore) => {
  ipcRenderer.send('set-ignore-mouse', ignore);
};