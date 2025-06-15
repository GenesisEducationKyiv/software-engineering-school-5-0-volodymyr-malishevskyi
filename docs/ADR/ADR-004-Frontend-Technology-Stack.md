## ADR-004: Frontend Technology Stack Selection

**Status:** Accepted

**Date:** May 18, 2025

**Authors:** Volodymyr Malishevskyi

---

### Context

The project requires a user interface to allow users to interact with the backend API. Specifically, the frontend needs to:

- Enable users to subscribe to weather updates by providing their email, city, and preferred frequency.
- Handle confirmation of subscriptions via tokens.
- Handle unsubscription requests via tokens.
- Display weather information (though this feature might be more prominently for direct city lookups rather than for subscribed weather, based on current routing).
- Be modern, responsive, and provide a good user experience.
- Offer a productive development experience with fast builds and hot module reloading.

Key requirements for the frontend technology stack include:

- **Reactivity and Component-Based Architecture:** To build a dynamic and maintainable UI.
- **Developer Productivity:** A framework or library that is easy to learn, has good tooling, and a strong community.
- **Performance:** Efficient rendering and a small bundle size for fast load times.
- **Ecosystem and Tooling:** Availability of routing solutions, state management (if needed), and build tools.
- **Type Safety:** Preferably with TypeScript support for better code quality and maintainability.

---

### Decision

**We have decided to use the following technology stack for the frontend:**

- **Framework:** Vue.js
- **Build Tool & Dev Server:** Vite
- **Programming Language:** TypeScript
- **Routing:** Vue Router

---

### Alternatives Considered

1.  **React.js (with Create React App / Next.js / Remix):**

    - **Pros:**
      - Largest ecosystem and community.
      - Vast number of third-party libraries and components.
      - Strong backing from Facebook (Meta).
      - Frameworks like Next.js offer excellent features like SSR, SSG, and file-system routing.
    - **Cons:**
      - Can have a steeper learning curve for some concepts (e.g., JSX, hooks for beginners).
      - State management often requires additional libraries (though Context API is built-in).
      - Build tooling setup (without a meta-framework) can be more complex than Vite.

2.  **Angular:**

    - **Pros:**
      - Comprehensive, opinionated framework providing a full suite of tools (routing, HTTP client, forms).
      - Strongly typed with TypeScript by default.
      - Good for large-scale enterprise applications.
    - **Cons:**
      - Steeper learning curve due to its comprehensive nature and concepts like modules, dependency injection, and RxJS.
      - Can be more verbose than Vue or React.
      - Build times and bundle sizes can be larger, though Ivy has improved this.

3.  **Svelte (with SvelteKit):**
    - **Pros:**
      - Compiles components to highly optimized vanilla JavaScript at build time, leading to excellent performance and small bundle sizes.
      - Simple and intuitive syntax.
      - Growing ecosystem and SvelteKit provides a full-featured app framework.
    - **Cons:**
      - Smaller community and ecosystem compared to React, Vue, or Angular.
      - Fewer readily available third-party component libraries.
      - Less mature in terms of enterprise adoption, though rapidly gaining traction.

---

### Rationale

Vue.js with Vite was chosen for its excellent balance of ease of use, performance, and modern development experience:

- **Developer Experience & Ease of Use:**
  - **Vue.js:** Known for its gentle learning curve, clear documentation, and approachable API. Its single-file components (`.vue` files) are intuitive for structuring UI elements.
  - **Vite:** Provides an extremely fast development server with Hot Module Replacement (HMR) and optimized builds. This significantly speeds up the development cycle.
- **Performance:**
  - **Vue.js 3:** Offers good runtime performance with its reactivity system and optimized rendering.
  - **Vite:** Leverages native ES modules during development and uses Rollup for optimized production builds, resulting in fast load times and efficient asset handling.
- **Ecosystem and Tooling:**
  - **Vue Router:** The official routing library for Vue.js integrates seamlessly.
  - **TypeScript Support:** Vue.js 3 has excellent TypeScript support, which is utilized in this project.
- **Progressive Framework:** Vue.js can be adopted incrementally. While this project uses it as a full SPA, its flexibility is a plus.
- **Community:** Vue.js has a strong and active community, providing plenty of resources, libraries, and support.

While React has a larger ecosystem, Vue's perceived simplicity and the exceptional developer experience offered by Vite made it a compelling choice for this project. Angular was considered too heavyweight for the current scale, and Svelte, while performant, has a smaller ecosystem which might pose challenges for finding specific solutions or libraries quickly.

---

### Consequences

- **Positive:**
  - **Rapid Development:** The combination of Vue's simplicity and Vite's speed allows for quick iteration and development of UI features.
  - **Good Performance:** Fast dev server startup and optimized production builds.
  - **Maintainable Code:** Single-file components and TypeScript support contribute to a well-organized and maintainable codebase.
  - **Enjoyable Developer Experience:** Vite's HMR and fast feedback loops make development pleasant.
- **Negative:**
  - **Ecosystem Size:** While large, Vue's ecosystem is not as vast as React's. Finding highly specific or niche third-party components might occasionally be more challenging.
  - **Hiring Pool:** The pool of experienced Vue.js developers might be smaller in some regions compared to React developers, though this is changing.
  - **State Management:** For more complex applications, choosing and integrating a state management solution would be an additional consideration. The current project seems to manage state within components or via simple props/events.

---

### Conclusion

The selection of Vue.js with Vite for the frontend provides a modern, performant, and developer-friendly stack well-suited for building the user interface of this weather notification application. It aligns with the project's goals of rapid development and a good user experience.

---
