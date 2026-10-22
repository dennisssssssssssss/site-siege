# Site Siege

> Turn any website into a game level.

A Chrome extension where page elements become targets: scan the page, then blast images, links, buttons and ads apart. A restore button always puts the page back.

Built by **Solo Queue** as an [ASSIST Academy](https://learning.assist.ro/course/info.php?id=43) student project.

## Status

- [x] Stage 0: project setup, popup connected to the page
- [ ] Base: level report, destroy on click, restore, per-site stats
- [ ] Plus: drivable vehicle, shooting, collisions, scoring
- [ ] Signature: XP, levels, vehicle classes, power-ups

## Run it locally

Requires Node.js 20+.

```bash
npm install
npm run build
```

Then in Chrome open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select the `dist` folder.

For development with hot reload, run `npm run dev` instead and load the same `dist` folder.

## Tech

TypeScript · Vite · Chrome Extension Manifest V3 · Canvas 2D
