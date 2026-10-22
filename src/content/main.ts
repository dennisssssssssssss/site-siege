import type { BuyResponse, PingResponse, Request } from '../shared/messages';
import { armoryView, buy, loadWallet } from './armory';
import { scanPage } from './scanner';
import { getState, reloadWallet, restorePage, startSiege, stopSiege } from './siege';
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
    case 'GET_WALLET':
      loadWallet().then((wallet) => sendResponse(armoryView(wallet)));
      return true;
    case 'BUY':
      buy(message.item).then(({ ok, wallet }) => {
        reloadWallet();
        const response: BuyResponse = { ok, armory: armoryView(wallet) };
        sendResponse(response);
      });
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
