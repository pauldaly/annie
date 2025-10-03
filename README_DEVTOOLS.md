# Annie DevTools Extension: Development Roadmap

This document outlines the main tasks and estimated timeline for building a browser DevTools extension for Annie, similar to Angular/Redux DevTools.

---

## Project Overview
The goal is to create a browser extension (Chrome/Edge) that provides a DevTools panel for inspecting, debugging, and time traveling Annie's state manager from outside the SPA.

---

## Task List & Timeline

### 1. Project Setup & Scaffolding
- Set up browser extension manifest (MV3)
- Create DevTools panel entry point
- Configure build tools (Webpack/Vite)
**Estimated Time:** 1–2 days

### 2. State Manager Integration
- Expose Annie state manager API for extension access
- Implement messaging between SPA and extension (window object, custom events)
**Estimated Time:** 2–3 days

### 3. UI Development
- Build basic UI for state inspection (React recommended)
- Display current state, history, subscriptions
- Add controls for time travel and snapshot restore
**Estimated Time:** 4–6 days

### 4. Advanced Features
- State diffing and comparison
- Action replay and history navigation
- Error handling and edge cases
**Estimated Time:** 4–7 days

### 5. Testing & Debugging
- Test extension in Chrome/Edge
- Validate communication and UI updates
- Fix bugs and polish UX
**Estimated Time:** 2–3 days

### 6. Packaging & Documentation
- Package extension for distribution
- Write usage and installation docs
- (Optional) Prepare for Chrome Web Store submission
**Estimated Time:** 1–2 days

---

## Total Estimated Timeline
- **Basic Version:** 1–2 weeks
- **Polished/Advanced Version:** 3–6 weeks

---

## Notes
- Timeline assumes part-time focus and familiarity with browser extension APIs and Annie’s state manager.
- Using React or similar UI framework is recommended for rapid development.
- Advanced features and polish may extend the timeline.

---

*Last updated: October 2, 2025*