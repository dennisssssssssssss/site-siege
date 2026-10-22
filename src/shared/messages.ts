// Messages exchanged between the popup, the content script and the service worker.

export type PingRequest = { type: 'PING' };
export type PingResponse = { ok: true; title: string; host: string };

export type Request = PingRequest;
