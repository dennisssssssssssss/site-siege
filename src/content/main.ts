import type { PingResponse, Request } from '../shared/messages';

chrome.runtime.onMessage.addListener((message: Request, _sender, sendResponse) => {
  if (message.type === 'PING') {
    const response: PingResponse = { ok: true, title: document.title, host: location.host };
    sendResponse(response);
  }
});
