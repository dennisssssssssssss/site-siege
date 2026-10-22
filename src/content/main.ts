import type { PingResponse, Request } from '../shared/messages';
import { scanPage } from './scanner';
import { getState, restorePage, startSiege, stopSiege } from './siege';
import { loadStats } from './stats';

chrome.runtime.onMessage.addListener((message: Request, _sender, sendResponse) => {
  switch (message.type) {
    case 'PING': {
      const response: PingResponse = { ok: true, title: document.title, host: location.host };
      sendResponse(response);
      break;
    }
    case 'SCAN':
      sendResponse(scanPage());
      break;
    case 'GET_STATE':
      sendResponse(getState());
      break;
    case 'GET_STATS':
      loadStats(location.host).then(sendResponse);
      // Keeps the channel open until the async response is sent.
      return true;
    case 'SIEGE_START':
      startSiege();
      sendResponse(getState());
      break;
    case 'SIEGE_STOP':
      stopSiege();
      sendResponse(getState());
      break;
    case 'RESTORE':
      restorePage();
      sendResponse(getState());
      break;
  }
});
