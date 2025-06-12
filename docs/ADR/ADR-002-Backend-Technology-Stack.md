## ADR-002: Backend Technology Stack Selection

**Status:** Accepted

**Date:** May 18, 2025

**Authors:** Volodymyr Malishevskyi

---

### Context

The project requires a backend system to manage weather data subscriptions, interact with external weather APIs, handle user authentication and notifications, and expose a RESTful API for the frontend client.

Key requirements for the backend technology stack include:

- **Performance and Scalability:** The system must efficiently handle concurrent user requests and be scalable to accommodate a growing user base and data volume.
- **Developer Productivity and Maintainability:** The chosen stack should allow for rapid development, easy maintenance, and good readability. A strong ecosystem with readily available libraries and tools is crucial.
- **Type Safety:** To reduce runtime errors and improve code quality and refactoring capabilities.
- **Community Support:** Access to a large and active community for troubleshooting, libraries, and long-term support.
- **Cost-Effectiveness:** Consideration for licensing costs and operational overhead.

---

### Decision

**We have decided to use the following technology stack for the backend:**

- **Runtime Environment:** Node.js
- **Web Framework:** Express.js
- **Programming Language:** TypeScript
- **ORM (Object-Relational Mapper):** Prisma

---

### Alternatives Considered

1.  **Python (with Django/Flask):**

    - **Pros:**
      - Mature ecosystem with a vast number of libraries (e.g., Django for batteries-included, Flask for microframework).
      - Strong in data science and machine learning, which could be beneficial for future weather data analysis features.
      - Readable syntax.
    - **Cons:**
      - The Global Interpreter Lock (GIL) in CPython can limit true parallelism for CPU-bound tasks.
      - While type hinting exists, TypeScript offers a more integrated and robust static typing experience, especially when paired with a Node.js ecosystem.
      - Potentially different primary language than the frontend, increasing context switching for full-stack developers.

2.  **Java (with Spring Boot):**

    - **Pros:**
      - Highly robust, scalable, and performant, especially for large enterprise applications.
      - Strongly typed language with a mature ecosystem and extensive tooling.
      - Large talent pool for Java developers.
    - **Cons:**
      - Can be more verbose and have a steeper learning curve compared to Node.js/TypeScript.
      - Higher memory footprint and potentially longer startup times.
      - Development cycles can feel slower for smaller to medium-sized projects.

3.  **Go (with Gin/Echo):**

    - **Pros:**
      - Excellent performance and efficiency, particularly for concurrent operations due to goroutines.
      - Statically typed and compiled, leading to fast execution and early error detection.
      - Simple language syntax and fast compile times.
    - **Cons:**
      - The ecosystem, while growing, is not as extensive as Node.js or Python for web development libraries and ORMs.
      - Error handling can be verbose (explicit `if err != nil` checks).
      - Fewer developers available compared to JavaScript/TypeScript or Python.

4.  **Ruby (with Ruby on Rails):**
    - **Pros:**
      - Convention-over-configuration philosophy leads to rapid development for standard CRUD applications.
      - Elegant syntax and a strong, established community.
    - **Cons:**
      - Performance can be a concern for highly concurrent or CPU-intensive tasks.
      - Scalability might require more effort compared to Node.js or Go for certain workloads.
      - Popularity has somewhat declined in favor of other stacks for new projects.

---

### Rationale

The Node.js, Express.js, TypeScript, and Prisma stack was chosen for its balanced strengths aligning with the project's needs:

- **Performance for I/O-Bound Operations:** Node.js's event-driven, non-blocking I/O model is well-suited for applications like this one, which involve many network requests (to external APIs, database) and client interactions.
- **Developer Productivity & Ecosystem:**
  - **JavaScript/TypeScript:** A vast talent pool and a massive ecosystem of libraries via npm.
  - **Express.js:** A minimal and flexible framework that is widely adopted well-documented, and has a rich middleware ecosystem.
  - **TypeScript:** Provides static typing, leading to fewer runtime errors, improved code maintainability, better tooling (autocompletion, refactoring), and easier collaboration on larger codebases.
  - **Prisma:** A modern, type-safe ORM that simplifies database interactions, provides excellent TypeScript integration (e.g., auto-generated types for query results), and handles migrations effectively.
- **Unified Language:** Using TypeScript for both frontend and backend can reduce context switching for developers and allow for shared code/types in the future if a monorepo structure is further leveraged.
- **Scalability:** Node.js applications can be scaled horizontally by running multiple instances behind a load balancer. The non-blocking nature helps handle many concurrent connections.
- **Community Support:** All chosen technologies have large, active communities, ensuring ample resources, tutorials, and third-party packages.

While alternatives like Python or Java offer robustness, the Node.js/TypeScript stack provides a more agile and often faster development experience for web APIs, especially when leveraging the same language family as the frontend. Go offers superior raw performance but with a less mature web framework and ORM ecosystem compared to what Prisma and Express offer in the Node.js world.

---

### Consequences

- **Positive:**
  - **Rapid Development:** The familiarity of JavaScript/TypeScript and the rich npm ecosystem allow for quick iteration.
  - **Improved Code Quality:** TypeScript's static typing helps catch errors early and makes the codebase more robust and maintainable.
  - **Good Performance for I/O-Bound Tasks:** Node.js excels in handling concurrent API requests and interactions with databases/external services.
  - **Strong Tooling:** Excellent IDE support, linters, and debugging tools for TypeScript and Node.js.
  - **Type-Safe Database Access:** Prisma ensures that database queries and their results are type-checked at compile time.
- **Negative:**
  - **CPU-Bound Limitations:** Node.js is single-threaded (utilizing an event loop). CPU-intensive tasks can block the event loop if not handled carefully (e.g., by offloading to worker threads or separate services). This is less of a concern for this application's primary I/O-bound nature but needs consideration for any future complex data processing.
  - **Callback Hell/Promise Management:** While `async/await` largely mitigates this, managing asynchronous operations still requires careful attention to avoid unhandled promise rejections or overly complex flows.
  - **Dependency Management:** The `node_modules` directory can become large, and managing dependencies requires attention to security and versioning.

---

### Conclusion

The selection of Node.js, Express.js, TypeScript, and Prisma provides a powerful, modern, and productive stack for building the backend of the weather notification application. It balances performance, developer experience, type safety, and ecosystem support, making it a suitable choice for the project's current and foreseeable needs.

---
