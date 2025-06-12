## ADR-001: Database Selection

**Status:** Accepted

**Date:** May 18, 2025

**Authors:** Volodymyr Malishevskyi

---

### Context

The goal is to develop a robust and scalable application that sends weather change notifications to users via email. This application will need to store city information, user subscriptions, and related data.

Key requirements for the database include:

- **Reliability and Data Integrity:** Accurate weather data and consistent user preferences are critical.
- **Scalability:** The system should be able to handle a growing number of users and weather data points.
- **Maintainability and Community Support:** Ease of management, availability of tools, and a strong community for troubleshooting and future development.
- **Cost-Effectiveness:** Consideration for licensing and operational costs, especially in the long term.

---

### Decision

**We have decided to use PostgreSQL as the primary database for the weather application.**

---

### Alternatives Considered

1.  **MongoDB (NoSQL Document Database):**

    - **Pros:**
      - Schema-less nature offers flexibility for evolving data structures (e.g., new weather parameters).
      - Good for high-volume, high-velocity data ingestion.
      - Horizontal scalability (sharding).
    - **Cons:**
      - Less robust transactional support compared to relational databases, which is important for user preferences and notification state.
      - Data integrity might be harder to enforce without a defined schema.
      - Complex queries across different document types could be less efficient.

2.  **MySQL (Relational Database):**

    - **Pros:**
      - Mature, widely adopted, and well-understood relational database.
      - Strong transactional support and data integrity.
      - Good tooling and community support.
    - **Cons:**
      - Historically, PostgreSQL has offered more advanced features (e.g., richer data types, advanced indexing, better extensibility) which could be beneficial for future enhancements related to weather data analysis or complex notification rules.
      - Performance at very large scale might require more manual tuning compared to PostgreSQL's built-in optimizations for certain workloads.

3.  **Redis (In-memory Data Store):**
    - **Pros:**
      - Extremely fast for caching and real-time operations.
      - Could be used for a message queue for notifications.
    - **Cons:**
      - Not suitable as a primary persistence layer for all application data due to its in-memory nature (data persistence needs careful handling) and lack of robust querying capabilities for complex relational data.
      - Would require another primary database for long-term storage, increasing system complexity.

---

### Rationale

PostgreSQL was chosen over the alternatives due to its strong combination of reliability, data integrity, advanced features, and proven scalability for applications requiring structured data.

- **Robustness and Data Integrity:** PostgreSQL provides ACID compliance, ensuring that user preferences, weather data, and notification states are always consistent and reliable. This is crucial for a notification system where missed or incorrect notifications directly impact user experience.
- **Advanced Features and Extensibility:** PostgreSQL offers a rich set of data types (e.g., JSONB for semi-structured weather data, geospatial types for location-based queries), advanced indexing options, and extensibility through extensions. These features provide flexibility for future enhancements, such as storing more detailed weather attributes or implementing location-based notification triggers.
- **Scalability:** While traditionally seen as a vertical scaling solution, PostgreSQL can scale horizontally with techniques like read replicas, logical replication, and sharding solutions (e.g., CitusData). Its performance for complex queries and ability to handle large datasets makes it suitable for growth.
- **Community and Ecosystem:** PostgreSQL has a very active and supportive community, extensive documentation, and a wide array of tools and integrations, which will simplify development, deployment, and maintenance.
- **Open Source and Cost-Effective:** Being open-source, PostgreSQL eliminates licensing costs, making it a highly cost-effective solution, especially for a new application.

While MongoDB offered schema flexibility, the strong need for transactional integrity and complex querying capabilities for user preferences outweighed this benefit. MySQL was a strong contender, but PostgreSQL's more advanced feature set and reputation for handling complex workloads tipped the scale in its favor. Redis, while excellent for specific use cases like caching and queuing, is not suitable as a primary general-purpose database for this application.

---

### Consequences

- **Positive:**
  - High data integrity and reliability for user preferences and weather data.
  - Flexibility to evolve the data model with advanced features like JSONB.
  - Strong support for complex queries and reporting on weather data and notification delivery.
  - Lower long-term operational costs due to open-source nature.
  - Access to a large and knowledgeable community for support and future development.
- **Negative:**
  - May require more upfront schema design compared to a NoSQL database.
  - Potential for slightly higher operational overhead compared to a fully managed NoSQL service for very simple data models, though this is offset by the control and flexibility gained.
  - Horizontal scaling for extreme workloads might require more deliberate architectural planning (e.g., sharding) compared to some distributed NoSQL databases, but this is a solvable problem for the expected scale.

---

### Conclusion

The decision to use PostgreSQL provides a solid foundation for the weather application, balancing the need for data integrity, scalability, and feature richness with cost-effectiveness and community support. This choice enables us to build a reliable and extensible system that can effectively serve our users.

---
