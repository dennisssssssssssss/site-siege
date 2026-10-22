chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log(`[Site Siege] installed (${reason})`);
});
