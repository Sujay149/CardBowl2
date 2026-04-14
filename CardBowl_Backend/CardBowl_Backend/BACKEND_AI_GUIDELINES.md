# Backend AI Coding Guidelines — Kapiva Backend

> **CRITICAL SYSTEM DIRECTIVE:** When generating new code, schemas, or features for this project, you **must** strictly adhere to the following architectural guidelines and standards without deviation. All generated Java classes, REST endpoints, service methods, and supporting code must follow these patterns exactly.

---

## How to Use This Document

This document is the single source of truth for all backend code decisions. Copy-paste any of the prompts below when working with an AI coding assistant:

**Prompt 1 — New Feature (Full Stack):**
> Read `BACKEND_AI_GUIDELINES.md` and `DB_AI_GUIDELINES.md`. Generate a complete feature for `{FeatureName}` including: Controller, Service interface + implementation, Repository, JPA Entity (extending `BaseEntityWithUniqueKey`), DTO (extending `BaseEntityDTO`), View Entity + View DTO, Mapper, and Flyway migration. Follow all architectural layers, naming conventions, and patterns exactly.

**Prompt 2 — New Endpoint:**
> Read `BACKEND_AI_GUIDELINES.md`. Add a new `{HTTP_METHOD} /{path}` endpoint to `{ControllerName}Controller`. Follow the standard pattern: extend `BaseController`, return `ResponseEntity<ApiResponse<Object>>`, use `buildSuccessResponse()`, delegate to the service layer, and include proper logging.

**Prompt 3 — Kafka Consumer:**
> Read `BACKEND_AI_GUIDELINES.md`. Create a new Kafka consumer for the topic `{topic-name}`. Follow the standard consumer pattern with `@KafkaListener`, proper error handling with try-catch, structured logging, and event data processing.

---

## 1. Technology Stack

| Component            | Technology                                          |
|----------------------|-----------------------------------------------------|
| Framework            | Spring Boot 3.3.6                                   |
| Java Version         | Java 21                                             |
| Database             | MySQL with Flyway migrations                        |
| ORM                  | Spring Data JPA (Hibernate)                         |
| Security             | Spring Security + JWT (jjwt library)                |
| Messaging            | Apache Kafka                                        |
| Search               | Elasticsearch (Elastic Java Client)                 |
| Boilerplate          | Lombok                                              |
| Push Notifications   | Firebase Cloud Messaging (FCM)                      |
| Password Hashing     | BCrypt (`BCryptPasswordEncoder`)                    |
| Build                | Maven                                               |

---

## 2. Package Structure

Root package: `com.techub.ffa`

```
com.techub.ffa/
├── aspect/                          # AOP (MethodLoggingAspect, @AuditMethod)
├── client/                          # External API clients
├── common/                          # Shared classes
│   ├── ApiResponse.java             # Generic response wrapper
│   ├── ApplicationConstants.java    # Kafka topics, filter operations
│   ├── AuditContext.java            # Thread-local audit context
│   └── util/                        # CommonUtil, FilterCriteriaUtil, JwtTokenUtil, etc.
├── config/                          # SecurityConfig, ElasticsearchConfig, KafkaConfig, etc.
├── controller/                      # REST controllers (organized by domain)
│   ├── BaseController.java          # Abstract base with exception handlers
│   └── {domain}/                    # e.g., employee/, sales/, product/, outlet/, visit/
├── dto/                             # Data Transfer Objects
│   ├── BaseEntityDTO.java           # Abstract base DTO
│   ├── FilterCriteria.java          # Dynamic filtering DTO
│   └── {domain}/                    # e.g., employee/, sales/, product/
│       └── view/                    # View DTOs for list endpoints
├── event/                           # Spring ApplicationEvent classes
├── exception/                       # Custom exceptions (5 types)
├── filter/                          # JwtRequestFilter, RAFilterHandler
├── mapper/                          # Manual static mapper classes
│   └── {domain}/                    # e.g., employee/, sales/, product/
├── model/sql/                       # JPA Entities
│   ├── BaseEntity.java              # Abstract base (id, audit fields)
│   ├── BaseEntityWithUniqueKey.java # Abstract base with unique_key
│   └── {domain}/                    # e.g., employee/, sales/, product/
│       └── view/                    # View entities (read-only)
├── repository/
│   ├── es/specification/            # Elasticsearch dynamic query
│   └── sql/                         # JPA repositories
│       ├── BaseUniqueKeyRepository.java
│       ├── specification/           # DynamicSpecification
│       └── {domain}/                # e.g., employee/, sales/
│           └── view/                # View repositories
├── service/                         # Business logic
│   ├── core/                        # AuditService, AuthService, etc.
│   │   └── impl/
│   ├── event/                       # Kafka consumer interfaces
│   │   └── impl/                    # Kafka consumer implementations
│   └── {domain}/                    # e.g., employee/, sales/
│       └── impl/
└── type/                            # Enums (OrderStatusType, etc.)
```

**Rules:**
- New features **must** follow this domain-based sub-package structure.
- Every domain gets its own sub-package under `controller/`, `service/`, `repository/sql/`, `dto/`, `mapper/`, and `model/sql/`.
- View entities and DTOs go in a `view/` sub-package within their domain.

---

## 3. Architecture Flow — Layer Isolation

```
Controller → Service (Interface) → Service (Impl) → Repository → Entity
                                                   → Mapper ↔ DTO
```

### Strict Rules:
1. **Controllers** call **Service interfaces only** — never repositories or mappers directly.
2. **Services** call **Repositories** for data access and **Mappers** for DTO conversion.
3. **Repositories** are the only layer that interacts with the database.
4. **Mappers** convert between Entities and DTOs — they are stateless static utility classes.
5. **DTOs** cross the controller boundary — entities **never** appear in controller signatures.
6. **No circular dependencies** between services. Use Spring `ApplicationEventPublisher` for cross-domain communication.

---

## 4. Entity Model

### 4.1 Base Classes

```
BaseEntity (abstract, @MappedSuperclass)
├── id: Long (IDENTITY strategy)
├── createdBy: Long
├── updatedBy: Long
├── createdOn: LocalDateTime
├── updatedOn: LocalDateTime
├── createdAt: String (GPS coordinates)
├── updatedAt: String (GPS coordinates)
│
└── BaseEntityWithUniqueKey (abstract, @MappedSuperclass)
    └── uniqueKey: String (max 15, unique)
```

### 4.2 Entity Rules

Every domain entity **must**:
- Extend `BaseEntityWithUniqueKey`
- Use `@Entity` and `@Table(name = "snake_case_table_name")`
- Use `@Getter` and `@Setter` from Lombok (not `@Data` — avoid unwanted `equals`/`hashCode`)
- Map relationships with `@ManyToOne` + `@JoinColumn` (lazy by default)
- Use `@Enumerated(EnumType.STRING)` for enum fields
- Use `@Column` only when the column name differs from the field name

```java
@Entity
@Table(name = "customer_feedback")
@Getter
@Setter
public class CustomerFeedback extends BaseEntityWithUniqueKey {

    @ManyToOne
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @ManyToOne
    @JoinColumn(name = "outlet_id", nullable = false)
    private Outlet outlet;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    private LocalDate feedbackDate;

    private Integer rating;

    @ManyToOne
    @JoinColumn(name = "feedback_type_id")
    private Lookup feedbackType;

    private String comments;
    private String imageUrl;

    @Column(name = "is_resolved")
    private Boolean isResolved;

    @ManyToOne
    @JoinColumn(name = "resolved_by_id")
    private Employee resolvedBy;

    private LocalDateTime resolvedDate;
    private String resolutionRemarks;

    @Column(name = "is_active")
    private Boolean isActive;

    private LocalDateTime deactivatedDate;
}
```

### 4.3 View Entities (Read-Only)

View entities map to database views and are used for list/grid endpoints:

```java
@Entity
@Table(name = "customer_feedback_view")
@Getter
@Setter
public class CustomerFeedbackView {

    @Id
    private Long id;

    private String feedbackKey;
    private LocalDate feedbackDate;
    private Integer rating;
    private String comments;
    private String feedbackType;
    private String outletKey;
    private String outletName;
    private String employeeKey;
    private String employeeName;
    private String searchText;
    // ... flattened view columns
}
```

---

## 5. Repository Layer

### 5.1 Entity Repositories

Entity repositories extend `BaseUniqueKeyRepository` (which extends `JpaRepository<T, Long>`) and `JpaSpecificationExecutor` for dynamic filtering:

```java
@Repository
public interface CustomerFeedbackRepository extends BaseUniqueKeyRepository<CustomerFeedback>,
                                                     JpaSpecificationExecutor<CustomerFeedback> {

    Optional<CustomerFeedback> findByUniqueKey(String uniqueKey);
}
```

**`BaseUniqueKeyRepository`** provides `saveWithUniqueKey(entity)` — the standard save method for all new entities. It saves the entity, generates a unique key from the auto-generated ID, and saves again.

### 5.2 View Repositories

View repositories extend `JpaRepository` + `JpaSpecificationExecutor` (no `BaseUniqueKeyRepository` needed since views are read-only):

```java
@Repository
public interface CustomerFeedbackViewRepository extends JpaRepository<CustomerFeedbackView, Long>,
                                                         JpaSpecificationExecutor<CustomerFeedbackView> {
}
```

### 5.3 Custom Queries

Use `@Query` with JPQL for complex operations:

```java
@Query("SELECT cf FROM CustomerFeedback cf LEFT JOIN FETCH cf.outlet LEFT JOIN FETCH cf.employee " +
       "WHERE cf.uniqueKey = :uniqueKey")
Optional<CustomerFeedback> findByUniqueKeyWithDetails(@Param("uniqueKey") String uniqueKey);

@Modifying
@Query("UPDATE CustomerFeedback cf SET cf.isResolved = true, cf.resolvedDate = :resolvedDate " +
       "WHERE cf.id = :id")
int markAsResolved(@Param("id") Long id, @Param("resolvedDate") LocalDateTime resolvedDate);
```

---

## 6. DTO Layer

### 6.1 Base DTOs

```java
// BaseEntityDTO — hides internal fields from JSON
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
@Getter @Setter
public abstract class BaseEntityDTO implements Serializable {
    @JsonIgnore private Long id;
    private String uniqueKey;
    @JsonIgnore private Long createdBy;
    @JsonIgnore private Long updatedBy;
    @JsonIgnore private Instant createdOn;
    @JsonIgnore private Instant updatedOn;
    @JsonIgnore private String createdAt;
    @JsonIgnore private String updatedAt;
}
```

### 6.2 DTO Rules

- All DTOs **must** be classes (not Java records).
- Entity DTOs extend `BaseEntityDTO`.
- Use `@Getter` and `@Setter` from Lombok.
- The same DTO is used for both request and response (e.g., `CustomerFeedbackDTO` for create, update, and get).
- View DTOs are separate classes mapped from database view entities.
- Nested relationships are represented as nested DTOs (composition):

```java
@Getter
@Setter
public class CustomerFeedbackDTO extends BaseEntityDTO {
    private VisitDTO visit;
    private OutletDTO outlet;
    private EmployeeDTO employee;
    private LocalDate feedbackDate;
    private Integer rating;
    private LookupDTO feedbackType;
    private String comments;
    private String imageUrl;
    private Boolean isResolved;
    private EmployeeDTO resolvedBy;
    private Instant resolvedDate;
    private String resolutionRemarks;
}
```

### 6.3 Input Validation

All DTOs used for create/update requests **must** use Jakarta Bean Validation annotations:

```java
@Getter
@Setter
public class CustomerFeedbackDTO extends BaseEntityDTO {
    @NotNull(message = "Visit is required")
    private VisitDTO visit;

    @NotNull(message = "Outlet is required")
    private OutletDTO outlet;

    @NotNull(message = "Feedback date is required")
    private LocalDate feedbackDate;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer rating;

    @Size(max = 500, message = "Comments must not exceed 500 characters")
    private String comments;
    // ...
}
```

Controller endpoints **must** use `@Valid` on request bodies:
```java
@PostMapping
public ResponseEntity<ApiResponse<Object>> create(@Valid @RequestBody CustomerFeedbackDTO request) {
```

---

## 7. Mapper Layer

### 7.1 Pattern

All mappers are **manual static utility classes** — no MapStruct or ModelMapper.

```java
public class CustomerFeedbackMapper {

    // Entity → DTO
    public static void toDTO(CustomerFeedback entity, CustomerFeedbackDTO dto) {
        BeanUtils.copyProperties(entity, dto);
        DateTimeMapperUtil.convertToInstant(entity, dto);

        if (entity.getOutlet() != null) {
            dto.setOutlet(new OutletDTO());
            OutletMapper.toDTO(entity.getOutlet(), dto.getOutlet());
        }
        if (entity.getEmployee() != null) {
            dto.setEmployee(new EmployeeDTO());
            EmployeeMapper.toDTO(entity.getEmployee(), dto.getEmployee());
        }
        if (entity.getFeedbackType() != null) {
            dto.setFeedbackType(new LookupDTO());
            LookupMapper.toDTO(entity.getFeedbackType(), dto.getFeedbackType());
        }
    }

    // DTO → Entity (excludes relationships — handled in service)
    public static void toEntity(CustomerFeedbackDTO dto, CustomerFeedback entity) {
        BeanUtils.copyProperties(dto, entity, "id", "visit", "outlet", "employee",
                "feedbackType", "resolvedBy");
        DateTimeMapperUtil.convertToLocalDate(dto, entity);
    }

    // View Entity → View DTO
    public static void toDTO(CustomerFeedbackView view, CustomerFeedbackViewDTO dto) {
        BeanUtils.copyProperties(view, dto);
    }
}
```

**Rules:**
- All methods are `public static void` — modify the target in place.
- `BeanUtils.copyProperties` for flat field copying.
- Explicitly exclude `id` and relationship fields in the `toEntity` direction.
- Relationships are mapped manually with null checks.
- Use `DateTimeMapperUtil` for `LocalDateTime` ↔ `Instant` conversion.

---

## 8. Service Layer

### 8.1 Interface + Implementation Pattern

**Every** service must follow the Interface + Impl pattern:

```java
// Interface: service/{domain}/{Feature}Service.java
public interface CustomerFeedbackService {
    CustomerFeedbackDTO create(CustomerFeedbackDTO request);
    CustomerFeedbackDTO getByKey(String feedbackKey);
    CustomerFeedbackDTO update(CustomerFeedbackDTO request);
    Page<CustomerFeedbackViewDTO> list(List<FilterCriteria> filters, Pageable pageable);
}
```

```java
// Implementation: service/{domain}/impl/{Feature}ServiceImpl.java
@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class CustomerFeedbackServiceImpl implements CustomerFeedbackService {

    private final CustomerFeedbackRepository feedbackRepository;
    private final CustomerFeedbackViewRepository feedbackViewRepository;
    private final AuditService auditService;
    // ... other dependencies via constructor injection
}
```

### 8.2 Mandatory Annotations

| Annotation               | Where                              | Purpose                    |
|--------------------------|-------------------------------------|----------------------------|
| `@Service`               | Implementation class                | Spring bean registration   |
| `@Transactional`         | Implementation class (class-level)  | Transaction management     |
| `@Slf4j`                 | Implementation class                | Logging                    |
| `@RequiredArgsConstructor` | Implementation class              | Constructor injection      |

### 8.3 Service Method Pattern

```java
@Override
public CustomerFeedbackDTO create(CustomerFeedbackDTO request) {
    log.info("Creating customer feedback");

    CustomerFeedback feedback = new CustomerFeedback();
    CustomerFeedbackMapper.toEntity(request, feedback);

    // Resolve relationships by unique key
    if (request.getOutlet() != null && request.getOutlet().getUniqueKey() != null) {
        Outlet outlet = outletRepository.findByUniqueKey(request.getOutlet().getUniqueKey())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Outlet not found with key: " + request.getOutlet().getUniqueKey()));
        feedback.setOutlet(outlet);
    }

    // Set audit fields and save
    auditService.setAuditFields(feedback);
    feedback = feedbackRepository.saveWithUniqueKey(feedback);

    // Map to response DTO
    CustomerFeedbackDTO responseDTO = new CustomerFeedbackDTO();
    CustomerFeedbackMapper.toDTO(feedback, responseDTO);

    log.info("Customer feedback created with key: {}", responseDTO.getUniqueKey());
    return responseDTO;
}

@Override
public CustomerFeedbackDTO getByKey(String feedbackKey) {
    log.info("Fetching customer feedback with key: {}", feedbackKey);

    CustomerFeedback feedback = feedbackRepository.findByUniqueKey(feedbackKey)
            .orElseThrow(() -> {
                String errorMessage = "Customer feedback not found with key: " + feedbackKey;
                log.error(errorMessage);
                return new ResourceNotFoundException(errorMessage);
            });

    CustomerFeedbackDTO dto = new CustomerFeedbackDTO();
    CustomerFeedbackMapper.toDTO(feedback, dto);
    return dto;
}

@Override
public Page<CustomerFeedbackViewDTO> list(List<FilterCriteria> filters, Pageable pageable) {
    log.info("Fetching customer feedbacks with filters: {}", filters);

    DynamicSpecification<CustomerFeedbackView> spec = new DynamicSpecification<>(filters);
    Page<CustomerFeedbackView> page = feedbackViewRepository.findAll(spec, pageable);

    List<CustomerFeedbackViewDTO> dtos = page.stream()
            .map(view -> {
                CustomerFeedbackViewDTO dto = new CustomerFeedbackViewDTO();
                CustomerFeedbackMapper.toDTO(view, dto);
                return dto;
            })
            .collect(Collectors.toList());

    return new PageImpl<>(dtos, pageable, page.getTotalElements());
}
```

**Key patterns:**
- **Create:** `new Entity()` → `Mapper.toEntity()` → resolve FKs by `uniqueKey` → `auditService.setAuditFields()` → `repository.saveWithUniqueKey()` → `Mapper.toDTO()`.
- **Get by key:** `repository.findByUniqueKey()` → `.orElseThrow(ResourceNotFoundException)` → `Mapper.toDTO()`.
- **Update:** `findByUniqueKey()` → `Mapper.toEntity()` → resolve changed FKs → `auditService.setAuditFields()` → `repository.save()` → `Mapper.toDTO()`.
- **List:** `DynamicSpecification` → `viewRepository.findAll(spec, pageable)` → map to View DTOs → `new PageImpl<>()`.

---

## 9. Controller Layer

### 9.1 Rules

Every controller **must**:
- Be annotated with `@RestController` and `@RequestMapping("/{resource}")`
- Extend `BaseController`
- Use `@RequiredArgsConstructor` for dependency injection
- Return `ResponseEntity<ApiResponse<Object>>` from every endpoint
- Use `buildSuccessResponse(HttpStatus, String message, Object data)` for success
- Delegate all logic to the service layer — no business logic in controllers

### 9.2 Standard Endpoints

```java
@RestController
@RequestMapping("/customer-feedbacks")
@RequiredArgsConstructor
public class CustomerFeedbackController extends BaseController {

    private final CustomerFeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<ApiResponse<Object>> create(
            @Valid @RequestBody CustomerFeedbackDTO request) {
        CustomerFeedbackDTO feedback = feedbackService.create(request);
        return buildSuccessResponse(HttpStatus.CREATED, "Customer feedback created successfully", feedback);
    }

    @GetMapping("/{feedbackKey}")
    public ResponseEntity<ApiResponse<Object>> getByKey(@PathVariable String feedbackKey) {
        CustomerFeedbackDTO feedback = feedbackService.getByKey(feedbackKey);
        return buildSuccessResponse(HttpStatus.OK, "Customer feedback retrieved successfully", feedback);
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Object>> update(
            @Valid @RequestBody CustomerFeedbackDTO request) {
        CustomerFeedbackDTO feedback = feedbackService.update(request);
        return buildSuccessResponse(HttpStatus.OK, "Customer feedback updated successfully", feedback);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> list(
            @RequestParam Map<String, String> allParams,
            @PageableDefault(size = CommonUtil.DEFAULT_PAGE_SIZE) Pageable pageable) {
        List<FilterCriteria> filters = FilterCriteriaUtil.buildFilterCriteriaList(allParams);
        Page<CustomerFeedbackViewDTO> feedbacks = feedbackService.list(filters, pageable);
        return buildSuccessResponse(HttpStatus.OK, "Customer feedbacks retrieved successfully", feedbacks);
    }

    @PutMapping("/{feedbackKey}/deactivate")
    public ResponseEntity<ApiResponse<Object>> deactivate(@PathVariable String feedbackKey) {
        feedbackService.deactivate(feedbackKey);
        return buildSuccessResponse(HttpStatus.OK, "Customer feedback deactivated successfully", null);
    }

    @PutMapping("/{feedbackKey}/activate")
    public ResponseEntity<ApiResponse<Object>> activate(@PathVariable String feedbackKey) {
        feedbackService.activate(feedbackKey);
        return buildSuccessResponse(HttpStatus.OK, "Customer feedback activated successfully", null);
    }
}
```

### 9.3 Pagination & Filtering Pattern

- Use `@PageableDefault(size = CommonUtil.DEFAULT_PAGE_SIZE)` (50) for default page size.
- Accept `@RequestParam Map<String, String> allParams` for dynamic filtering.
- Parse filters via `FilterCriteriaUtil.buildFilterCriteriaList(allParams)`.
- Pass `List<FilterCriteria>` + `Pageable` to the service.
- Filter parameter format: `{field}__{operation}={value}` (e.g., `rating__gte=3`, `outletKey__eq=ABC123`).

---

## 10. Global Exception Handling

### 10.1 BaseController Exception Handlers

`BaseController` provides centralized exception handling via `@ExceptionHandler`:

| Exception                    | HTTP Status          | When to Throw                              |
|------------------------------|----------------------|--------------------------------------------|
| `ResourceNotFoundException`  | `404 NOT_FOUND`      | Entity not found by unique key             |
| `InvalidRequestException`    | `400 BAD_REQUEST`    | Invalid input, business rule violation     |
| `UnauthorizedException`      | `401 UNAUTHORIZED`   | Authentication/authorization failure       |
| `DuplicateResourceException` | `409 CONFLICT`       | Duplicate entry on unique constraint       |
| `ConflictException`          | `409 CONFLICT`       | State conflict (e.g., already approved)    |
| `Exception` (catch-all)      | `500 INTERNAL_SERVER_ERROR` | Unexpected errors                   |

### 10.2 Exception Classes

All custom exceptions extend `RuntimeException` with a single `String message` constructor:

```java
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
```

### 10.3 Standard Error Response

All error responses use the `ApiResponse` wrapper:

```json
{
    "success": false,
    "message": "Employee not found with key: ABC123",
    "data": null
}
```

### 10.4 Standard Success Response

```json
{
    "success": true,
    "message": "Employee created successfully",
    "data": { ... }
}
```

---

## 11. Security & Audit Context

### 11.1 Authentication

- JWT-based stateless authentication via `JwtRequestFilter`.
- The filter extracts the Bearer token, validates it, and sets `SecurityContextHolder` with the authenticated user (username = mobile number).
- Public endpoints: `/auth/login`, `/auth/refresh-token`, `/sync**`, `/public/**`, `/offline-sync/sync`.
- All other endpoints require authentication (`.anyRequest().authenticated()`).

### 11.2 Audit Field Population

The `AuditService` is the **only** mechanism for populating audit fields. It must be called explicitly in every service method before saving:

```java
auditService.setAuditFields(entity);
entity = repository.saveWithUniqueKey(entity);  // for new entities
// OR
entity = repository.save(entity);               // for updates
```

**How it works:**
1. Extracts the current user's ID from `SecurityContextHolder` → `Authentication.getName()` (mobile number) → resolves to `user_info.id`.
2. Extracts GPS coordinates from the `X-User-Coordinates` request header.
3. On **new** entities (`id == null`): sets `createdBy`, `updatedBy`, `createdOn`, `updatedOn`, `createdAt`, `updatedAt`.
4. On **existing** entities (`id > 0`): sets only `updatedBy`, `updatedOn`, `updatedAt`.

### 11.3 Offline Mode Audit

For offline sync scenarios, `AuditContext` (thread-local) provides audit data when no HTTP request context exists:

```java
AuditContext.setOfflineMode(true);
AuditContext.setOfflineAuditData(auditFieldDTO);
// ... process offline data
AuditContext.clear();
```

---

## 12. Kafka Integration

### 12.1 Topic Naming

All Kafka topic names are kebab-case and defined in `ApplicationConstants.KafkaTopics`:

```java
public static class KafkaTopics {
    public static final String ACTIVITY_LOG_TOPIC = "activity-log";
    public static final String NOTIFICATION_TOPIC = "notification";
    public static final String BADGE_EVALUATION_TOPIC = "badge-evaluation";
    public static final String CAMPAIGN_PROGRESS_TOPIC = "campaign-progress";
    public static final String INCENTIVE_CALCULATION_TOPIC = "incentive-calculation";
    // ...
}
```

**Rules:**
- New topics must be added as constants in `ApplicationConstants.KafkaTopics`.
- Topic names follow `kebab-case`: `{domain}-{action}` (e.g., `badge-evaluation`, `sync-offline-data`).

### 12.2 Producer Pattern

Producers use Spring's `ApplicationEventPublisher` to publish domain events, which are then forwarded to Kafka:

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class ActivityEventPublisher {
    private final KafkaTemplate<String, KafkaEventData> kafkaTemplate;

    public void publishActivityEvent(ActivityEventData activity) {
        KafkaEventData eventData = new KafkaEventData();
        eventData.setActivityEventData(activity);
        kafkaTemplate.send(ApplicationConstants.KafkaTopics.ACTIVITY_LOG_TOPIC, eventData);
        log.info("Published activity event for employee: {}", activity.getEmployeeKey());
    }
}
```

### 12.3 Consumer Pattern

Consumers follow the Interface + Impl pattern and live in `service/event/impl/`:

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class ActivityEventConsumerServiceImpl implements ActivityEventConsumerService {

    private final ActivityLogService activityLogService;

    @Override
    @KafkaListener(
            topics = "#{@kafkaTopicResolver.getActivityLogTopic()}",
            groupId = ApplicationConstants.ConsumerGroups.SSGC_SUMMARY_GROUP
    )
    public void processActivityEvent(KafkaEventData eventData) {
        ActivityEventData activity = eventData.getActivityEventData();

        if (activity == null) {
            log.warn("Received KafkaEventData with null activityEventData, skipping");
            return;
        }

        log.info("Processing activity event: employee={}, type={}",
                activity.getEmployeeKey(), activity.getActivityType());

        try {
            // Process the event...
            activityLogService.logActivity(logDTO);
            log.info("Activity logged successfully for employee: {}", activity.getEmployeeKey());
        } catch (Exception e) {
            log.error("Failed to process activity event for employee: {}, error: {}",
                    activity.getEmployeeKey(), e.getMessage(), e);
        }
    }
}
```

**Consumer rules:**
- Always validate incoming data (null check the event payload).
- Wrap processing in try-catch — log errors but don't rethrow (prevent consumer group rebalance).
- Log at `INFO` level at entry and exit of processing.
- Log at `ERROR` level on failure with the exception.

### 12.4 Summary Table Refresh Pattern (Dashboard / Reporting)

For dashboards, leaderboards, and performance reports, we use **denormalized summary tables** that are refreshed asynchronously via Kafka — not by direct API calls.

**Flow:**
1. A domain event occurs (order placed, visit completed, check-in, etc.).
2. The service publishes a `SummaryDataEvent` to the `refresh-summary-data` Kafka topic.
3. `SummaryDataConsumerServiceImpl` receives the event, queries source-of-truth tables, re-aggregates metrics, and upserts the summary row.

**Consumer pattern:**

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class SummaryDataConsumerServiceImpl implements SummaryDataConsumerService {

    private final EmployeePerformanceSummaryRepository summaryRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final VisitRepository visitRepository;
    // ... other source repositories

    @Override
    @KafkaListener(
            topics = "#{@kafkaTopicResolver.getEmployeeRefreshSummaryDataTopic()}",
            groupId = ApplicationConstants.ConsumerGroups.SSGC_SUMMARY_GROUP
    )
    @Transactional
    public void refreshSummaryData(KafkaEventData eventData) {
        SummaryDataEvent event = eventData.getSummaryDataEvent();
        Long employeeId = event.getEmployeeId();
        LocalDate date = event.getEventDate() != null
                ? event.getEventDate()
                : CommonUtil.getCurrentDateInIST();

        log.info("Refreshing summary: employeeId={}, date={}", employeeId, date);

        try {
            // Find-or-create the summary row (upsert pattern)
            EmployeePerformanceSummary summary = summaryRepository
                    .findByEmployeeIdAndSummaryDate(employeeId, date)
                    .orElseGet(() -> createNewSummary(employee, date));

            // Re-aggregate each metric category from source tables
            refreshSalesMetrics(summary, employeeId, date);
            refreshVisitMetrics(summary, employeeId, date);
            refreshCollectionMetrics(summary, employeeId, date);
            refreshAttendanceMetrics(summary, employeeId, date);

            summary.setUpdatedOn(CommonUtil.getCurrentDateTimeInIST());
            summaryRepository.save(summary);

            log.info("Summary refreshed: employeeId={}, orders={}, sales={}",
                    employeeId, summary.getTotalOrdersCount(), summary.getTotalSalesValue());
        } catch (Exception e) {
            log.error("Error refreshing summary for employeeId={}, date={}: {}",
                    employeeId, date, e.getMessage(), e);
        }
    }
}
```

**Key rules for summary consumers:**
- Use `@Transactional` on the consumer method (the summary upsert must be atomic).
- Use a **find-or-create** (upsert) pattern keyed by composite business key (e.g., `employee_id + summary_date`).
- Query source-of-truth tables for fresh aggregates — never increment/decrement existing values (full recompute is idempotent).
- Initialize all numeric metrics to `0` / `BigDecimal.ZERO` when creating a new summary row.
- Wrap in try-catch to prevent consumer group rebalance on transient errors.

---

## 13. Elasticsearch Integration

### 13.1 Libraries

- **Elasticsearch Java Client** (`co.elastic.clients:elasticsearch-java`) — not Spring Data Elasticsearch.
- Jackson-based JSON mapping via `JacksonJsonpMapper`.

### 13.2 Configuration

```java
@Configuration
public class ElasticsearchConfig {
    @Value("${app.elasticsearch.url}")
    private String elasticsearchUrl;

    @Bean
    public ElasticsearchClient elasticsearchClient(ObjectMapper objectMapper) {
        URI uri = URI.create(elasticsearchUrl);
        HttpHost httpHost = new HttpHost(uri.getHost(), uri.getPort(), uri.getScheme());
        RestClient restClient = RestClient.builder(httpHost).build();
        return new ElasticsearchClient(new RestClientTransport(restClient, new JacksonJsonpMapper(objectMapper)));
    }
}
```

### 13.3 Query Pattern

Use `DynamicElasticsearchQuery<T>` for dynamic filtering (same `FilterCriteria` model as JPA):

```java
DynamicElasticsearchQuery<AgentDocument> query = new DynamicElasticsearchQuery<>(filterCriteriaList);
// Execute via ElasticsearchClient
```

Index names are defined in `ApplicationConstants.Elasticsearch` (e.g., `"agent"`).

---

## 14. Logging Standards

### 14.1 Framework

- **SLF4J** with **Logback** (Spring Boot default).
- Loggers are declared via Lombok `@Slf4j` on classes (preferred) or `LoggerFactory.getLogger()`.

### 14.2 Level Guidelines

| Level   | When to Use                                                                        |
|---------|------------------------------------------------------------------------------------|
| `INFO`  | Method entry/exit, successful operations, state changes. One `log.info` at the start and end of each service method. |
| `DEBUG` | Detailed diagnostic info: filter criteria, intermediate computation values, cache hits/misses. |
| `WARN`  | Recoverable anomalies: null data in Kafka events, missing optional fields, skipped processing. |
| `ERROR` | Failures requiring attention: exceptions caught, failed external calls, data integrity issues. Always include the exception object as the last argument. |

### 14.3 Logging Patterns

```java
// Service method entry
log.info("Creating customer feedback");

// Service method success
log.info("Customer feedback created with key: {}", dto.getUniqueKey());

// Lookup failure
log.error("Outlet not found with key: {}", outletKey);

// Kafka consumer error (always include exception)
log.error("Failed to process activity event for employee: {}, error: {}",
        activity.getEmployeeKey(), e.getMessage(), e);

// Debug-level detail
log.debug("Fetching employees with filters: {}", filterCriteriaList);

// Warning for non-critical skip
log.warn("Received KafkaEventData with null activityEventData, skipping");
```

**Rules:**
- Always use parameterized logging (`{}` placeholders) — never string concatenation.
- Never log sensitive data (passwords, tokens, PII beyond user IDs/keys).
- Include the exception object as the last argument in `log.error()` calls to capture the stack trace.

---

## 15. Lombok Usage Standards

| Annotation                  | Where to Use                           | Rule                                    |
|----------------------------|----------------------------------------|-----------------------------------------|
| `@Getter` + `@Setter`     | Entities, DTOs                         | **Mandatory** on all entities and DTOs  |
| `@RequiredArgsConstructor` | Services, Controllers, Components      | **Mandatory** for constructor injection |
| `@Slf4j`                  | Services, Consumers, Aspects, Components | **Mandatory** for logging             |
| `@Builder`                | Event DTOs, complex request DTOs       | Use when building objects with many fields |
| `@AllArgsConstructor`     | DTOs that need it                      | Use sparingly                           |
| `@NoArgsConstructor`      | DTOs, Entities (JPA requires it)       | Use when needed                         |
| `@Data`                   | **NEVER** on entities                  | Avoid — generates unwanted `equals`/`hashCode` |

---

## 16. API Response Wrapper

### 16.1 Standard Wrapper

All endpoints return `ResponseEntity<ApiResponse<Object>>`:

```java
@Getter
@Setter
public class ApiResponse<O> {
    private boolean success;   // true for success, false for errors
    private String message;    // Human-readable message
    private Object data;       // Payload (entity DTO, Page, List, or null)
}
```

### 16.2 Response Building

```java
// Success
return buildSuccessResponse(HttpStatus.CREATED, "Entity created successfully", dto);
return buildSuccessResponse(HttpStatus.OK, "Entities retrieved successfully", page);
return buildSuccessResponse(HttpStatus.OK, "Entity deactivated successfully", null);

// Errors (handled automatically by BaseController @ExceptionHandler)
throw new ResourceNotFoundException("Entity not found with key: " + key);
throw new InvalidRequestException("Invalid input: field X is required");
```

---

## 17. Dynamic Filtering System

### 17.1 Filter Parameter Format

Query parameters follow the convention `{field}__{operation}={value}`:

```
GET /employees?employeeName__has=john&isActive__eq=true&createdOn__gte=2024-01-01
```

### 17.2 Supported Operations

| Operation | Code      | SQL Equivalent                    |
|-----------|-----------|-----------------------------------|
| Equals    | `eq`      | `= value`                        |
| Not Equal | `neq`     | `<> value`                       |
| Less Than | `lt`      | `< value`                        |
| Greater Than | `gt`   | `> value`                        |
| Less/Equal | `lte`    | `<= value`                      |
| Greater/Equal | `gte` | `>= value`                      |
| Contains  | `has`     | `LIKE %value%`                   |
| In        | `in`      | `IN (value1, value2, ...)`       |
| Not In    | `nin`     | `NOT IN (value1, value2, ...)`   |
| Is Null   | `isnull`  | `IS NULL`                        |
| Not Null  | `notnull` | `IS NOT NULL`                    |

### 17.3 Implementation

`DynamicSpecification<T>` converts `List<FilterCriteria>` into JPA `Predicate` objects. Supports type-aware conversion (`LocalDate`, `LocalDateTime`, `Boolean`, `Enum`, `String`) and nested paths (e.g., `employee.id`).

---

## 18. Testing Standards

### 18.1 Testing Stack

| Tool           | Purpose                          |
|----------------|----------------------------------|
| JUnit 5        | Test framework                   |
| Mockito        | Mocking in unit tests            |
| Spring Boot Test | Integration test infrastructure |

### 18.2 Unit Test Pattern

```java
@ExtendWith(MockitoExtension.class)
class CustomerFeedbackServiceImplTest {

    @Mock private CustomerFeedbackRepository feedbackRepository;
    @Mock private CustomerFeedbackViewRepository feedbackViewRepository;
    @Mock private AuditService auditService;
    @InjectMocks private CustomerFeedbackServiceImpl feedbackService;

    @Test
    void getByKey_shouldReturnFeedback_whenKeyExists() {
        // Arrange
        CustomerFeedback entity = new CustomerFeedback();
        entity.setId(1L);
        entity.setUniqueKey("TEST123");
        when(feedbackRepository.findByUniqueKey("TEST123")).thenReturn(Optional.of(entity));

        // Act
        CustomerFeedbackDTO result = feedbackService.getByKey("TEST123");

        // Assert
        assertNotNull(result);
        assertEquals("TEST123", result.getUniqueKey());
        verify(feedbackRepository).findByUniqueKey("TEST123");
    }

    @Test
    void getByKey_shouldThrowResourceNotFound_whenKeyDoesNotExist() {
        when(feedbackRepository.findByUniqueKey("INVALID")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> feedbackService.getByKey("INVALID"));
    }
}
```

### 18.3 Test Rules

- Test class name: `{ServiceImpl}Test` or `{Controller}Test`.
- Use `@ExtendWith(MockitoExtension.class)` for unit tests.
- Follow Arrange-Act-Assert pattern.
- Test both happy path and error paths (especially `ResourceNotFoundException`).
- Name tests: `{method}_{expectedBehavior}_{condition}`.

---

## 19. Endpoint Security

- All endpoints (except public ones) require a valid JWT Bearer token.
- JWT authentication is handled globally by `JwtRequestFilter` — no per-endpoint annotation needed for basic auth.
- For role-based access control on specific endpoints, use `@PreAuthorize`:

```java
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/{key}")
public ResponseEntity<ApiResponse<Object>> delete(@PathVariable String key) { ... }
```

---

## 20. API Documentation

New endpoints **should** include Swagger/OpenAPI annotations for documentation:

```java
@Tag(name = "Customer Feedback", description = "Customer feedback management endpoints")
@RestController
@RequestMapping("/customer-feedbacks")
public class CustomerFeedbackController extends BaseController {

    @Operation(summary = "Create customer feedback", description = "Creates a new customer feedback entry")
    @ApiResponse(responseCode = "200", description = "Feedback created successfully")
    @PostMapping
    public ResponseEntity<com.techub.ffa.common.ApiResponse<Object>> create(...) { ... }
}
```

---

## 21. Reference Examples — Idealized Controller + Service Pair

### Controller

```java
package com.techub.ffa.controller.feedback;

import com.techub.ffa.common.ApiResponse;
import com.techub.ffa.common.util.CommonUtil;
import com.techub.ffa.common.util.FilterCriteriaUtil;
import com.techub.ffa.controller.BaseController;
import com.techub.ffa.dto.FilterCriteria;
import com.techub.ffa.dto.feedback.CustomerFeedbackDTO;
import com.techub.ffa.dto.feedback.view.CustomerFeedbackViewDTO;
import com.techub.ffa.service.feedback.CustomerFeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/customer-feedbacks")
@RequiredArgsConstructor
public class CustomerFeedbackController extends BaseController {

    private final CustomerFeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<ApiResponse<Object>> create(
            @Valid @RequestBody CustomerFeedbackDTO request) {
        CustomerFeedbackDTO feedback = feedbackService.create(request);
        return buildSuccessResponse(HttpStatus.CREATED, "Customer feedback created successfully", feedback);
    }

    @GetMapping("/{feedbackKey}")
    public ResponseEntity<ApiResponse<Object>> getByKey(@PathVariable String feedbackKey) {
        CustomerFeedbackDTO feedback = feedbackService.getByKey(feedbackKey);
        return buildSuccessResponse(HttpStatus.OK, "Customer feedback retrieved successfully", feedback);
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Object>> update(
            @Valid @RequestBody CustomerFeedbackDTO request) {
        CustomerFeedbackDTO feedback = feedbackService.update(request);
        return buildSuccessResponse(HttpStatus.OK, "Customer feedback updated successfully", feedback);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> list(
            @RequestParam Map<String, String> allParams,
            @PageableDefault(size = CommonUtil.DEFAULT_PAGE_SIZE) Pageable pageable) {
        List<FilterCriteria> filters = FilterCriteriaUtil.buildFilterCriteriaList(allParams);
        Page<CustomerFeedbackViewDTO> feedbacks = feedbackService.list(filters, pageable);
        return buildSuccessResponse(HttpStatus.OK, "Customer feedbacks retrieved successfully", feedbacks);
    }

    @PutMapping("/{feedbackKey}/deactivate")
    public ResponseEntity<ApiResponse<Object>> deactivate(@PathVariable String feedbackKey) {
        feedbackService.deactivate(feedbackKey);
        return buildSuccessResponse(HttpStatus.OK, "Customer feedback deactivated successfully", null);
    }

    @PutMapping("/{feedbackKey}/activate")
    public ResponseEntity<ApiResponse<Object>> activate(@PathVariable String feedbackKey) {
        feedbackService.activate(feedbackKey);
        return buildSuccessResponse(HttpStatus.OK, "Customer feedback activated successfully", null);
    }
}
```

### Service Interface

```java
package com.techub.ffa.service.feedback;

import com.techub.ffa.dto.FilterCriteria;
import com.techub.ffa.dto.feedback.CustomerFeedbackDTO;
import com.techub.ffa.dto.feedback.view.CustomerFeedbackViewDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CustomerFeedbackService {
    CustomerFeedbackDTO create(CustomerFeedbackDTO request);
    CustomerFeedbackDTO getByKey(String feedbackKey);
    CustomerFeedbackDTO update(CustomerFeedbackDTO request);
    Page<CustomerFeedbackViewDTO> list(List<FilterCriteria> filters, Pageable pageable);
    void deactivate(String feedbackKey);
    void activate(String feedbackKey);
}
```

### Service Implementation

```java
package com.techub.ffa.service.feedback.impl;

import com.techub.ffa.common.util.CommonUtil;
import com.techub.ffa.dto.FilterCriteria;
import com.techub.ffa.dto.feedback.CustomerFeedbackDTO;
import com.techub.ffa.dto.feedback.view.CustomerFeedbackViewDTO;
import com.techub.ffa.exception.ResourceNotFoundException;
import com.techub.ffa.mapper.feedback.CustomerFeedbackMapper;
import com.techub.ffa.model.sql.core.Lookup;
import com.techub.ffa.model.sql.employee.Employee;
import com.techub.ffa.model.sql.feedback.CustomerFeedback;
import com.techub.ffa.model.sql.feedback.view.CustomerFeedbackView;
import com.techub.ffa.model.sql.outlet.Outlet;
import com.techub.ffa.model.sql.visit.Visit;
import com.techub.ffa.repository.sql.core.LookupRepository;
import com.techub.ffa.repository.sql.employee.EmployeeRepository;
import com.techub.ffa.repository.sql.feedback.CustomerFeedbackRepository;
import com.techub.ffa.repository.sql.feedback.view.CustomerFeedbackViewRepository;
import com.techub.ffa.repository.sql.outlet.OutletRepository;
import com.techub.ffa.repository.sql.specification.DynamicSpecification;
import com.techub.ffa.repository.sql.visit.VisitRepository;
import com.techub.ffa.service.core.AuditService;
import com.techub.ffa.service.feedback.CustomerFeedbackService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class CustomerFeedbackServiceImpl implements CustomerFeedbackService {

    private final CustomerFeedbackRepository feedbackRepository;
    private final CustomerFeedbackViewRepository feedbackViewRepository;
    private final VisitRepository visitRepository;
    private final OutletRepository outletRepository;
    private final EmployeeRepository employeeRepository;
    private final LookupRepository lookupRepository;
    private final AuditService auditService;

    @Override
    public CustomerFeedbackDTO create(CustomerFeedbackDTO request) {
        log.info("Creating customer feedback");

        CustomerFeedback feedback = new CustomerFeedback();
        CustomerFeedbackMapper.toEntity(request, feedback);

        // Resolve visit
        if (request.getVisit() != null && request.getVisit().getUniqueKey() != null) {
            Visit visit = visitRepository.findByUniqueKey(request.getVisit().getUniqueKey())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Visit not found with key: " + request.getVisit().getUniqueKey()));
            feedback.setVisit(visit);
        }

        // Resolve outlet
        if (request.getOutlet() != null && request.getOutlet().getUniqueKey() != null) {
            Outlet outlet = outletRepository.findByUniqueKey(request.getOutlet().getUniqueKey())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Outlet not found with key: " + request.getOutlet().getUniqueKey()));
            feedback.setOutlet(outlet);
        }

        // Resolve employee
        if (request.getEmployee() != null && request.getEmployee().getUniqueKey() != null) {
            Employee employee = employeeRepository.findByUniqueKey(request.getEmployee().getUniqueKey())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Employee not found with key: " + request.getEmployee().getUniqueKey()));
            feedback.setEmployee(employee);
        }

        // Resolve feedback type (lookup)
        if (request.getFeedbackType() != null && request.getFeedbackType().getUniqueKey() != null) {
            Lookup feedbackType = lookupRepository.findByUniqueKey(request.getFeedbackType().getUniqueKey())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Feedback type not found with key: " + request.getFeedbackType().getUniqueKey()));
            feedback.setFeedbackType(feedbackType);
        }

        feedback.setIsActive(Boolean.TRUE);
        auditService.setAuditFields(feedback);
        feedback = feedbackRepository.saveWithUniqueKey(feedback);

        CustomerFeedbackDTO responseDTO = new CustomerFeedbackDTO();
        CustomerFeedbackMapper.toDTO(feedback, responseDTO);

        log.info("Customer feedback created with key: {}", responseDTO.getUniqueKey());
        return responseDTO;
    }

    @Override
    public CustomerFeedbackDTO getByKey(String feedbackKey) {
        log.info("Fetching customer feedback with key: {}", feedbackKey);

        CustomerFeedback feedback = feedbackRepository.findByUniqueKey(feedbackKey)
                .orElseThrow(() -> {
                    String errorMessage = "Customer feedback not found with key: " + feedbackKey;
                    log.error(errorMessage);
                    return new ResourceNotFoundException(errorMessage);
                });

        CustomerFeedbackDTO dto = new CustomerFeedbackDTO();
        CustomerFeedbackMapper.toDTO(feedback, dto);
        return dto;
    }

    @Override
    public CustomerFeedbackDTO update(CustomerFeedbackDTO request) {
        log.info("Updating customer feedback with key: {}", request.getUniqueKey());

        CustomerFeedback feedback = feedbackRepository.findByUniqueKey(request.getUniqueKey())
                .orElseThrow(() -> {
                    String errorMessage = "Customer feedback not found with key: " + request.getUniqueKey();
                    log.error(errorMessage);
                    return new ResourceNotFoundException(errorMessage);
                });

        CustomerFeedbackMapper.toEntity(request, feedback);

        // Re-resolve relationships if changed
        if (request.getFeedbackType() != null && request.getFeedbackType().getUniqueKey() != null) {
            Lookup feedbackType = lookupRepository.findByUniqueKey(request.getFeedbackType().getUniqueKey())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Feedback type not found with key: " + request.getFeedbackType().getUniqueKey()));
            feedback.setFeedbackType(feedbackType);
        }

        auditService.setAuditFields(feedback);
        feedback = feedbackRepository.save(feedback);

        CustomerFeedbackDTO responseDTO = new CustomerFeedbackDTO();
        CustomerFeedbackMapper.toDTO(feedback, responseDTO);

        log.info("Customer feedback updated with key: {}", responseDTO.getUniqueKey());
        return responseDTO;
    }

    @Override
    public Page<CustomerFeedbackViewDTO> list(List<FilterCriteria> filters, Pageable pageable) {
        log.info("Fetching customer feedbacks with filters: {}", filters);

        DynamicSpecification<CustomerFeedbackView> spec = new DynamicSpecification<>(filters);
        Page<CustomerFeedbackView> page = feedbackViewRepository.findAll(spec, pageable);

        List<CustomerFeedbackViewDTO> dtos = page.stream()
                .map(view -> {
                    CustomerFeedbackViewDTO dto = new CustomerFeedbackViewDTO();
                    CustomerFeedbackMapper.toDTO(view, dto);
                    return dto;
                })
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    @Override
    public void deactivate(String feedbackKey) {
        log.info("Deactivating customer feedback with key: {}", feedbackKey);

        CustomerFeedback feedback = feedbackRepository.findByUniqueKey(feedbackKey)
                .orElseThrow(() -> {
                    String errorMessage = "Customer feedback not found with key: " + feedbackKey;
                    log.error(errorMessage);
                    return new ResourceNotFoundException(errorMessage);
                });

        feedback.setIsActive(false);
        feedback.setDeactivatedDate(CommonUtil.getCurrentDateTimeInIST());
        auditService.setAuditFields(feedback);
        feedbackRepository.save(feedback);

        log.info("Customer feedback deactivated with key: {}", feedbackKey);
    }

    @Override
    public void activate(String feedbackKey) {
        log.info("Activating customer feedback with key: {}", feedbackKey);

        CustomerFeedback feedback = feedbackRepository.findByUniqueKey(feedbackKey)
                .orElseThrow(() -> {
                    String errorMessage = "Customer feedback not found with key: " + feedbackKey;
                    log.error(errorMessage);
                    return new ResourceNotFoundException(errorMessage);
                });

        feedback.setIsActive(true);
        feedback.setDeactivatedDate(null);
        auditService.setAuditFields(feedback);
        feedbackRepository.save(feedback);

        log.info("Customer feedback activated with key: {}", feedbackKey);
    }
}
```

---

## Quick Checklist for Every New Feature

- [ ] Entity extends `BaseEntityWithUniqueKey`, uses `@Getter`/`@Setter`
- [ ] Repository extends `BaseUniqueKeyRepository` + `JpaSpecificationExecutor`
- [ ] View entity + view repository created for list endpoints
- [ ] DTO extends `BaseEntityDTO`, nested DTOs for relationships
- [ ] Mapper is a static utility class with `toDTO()`, `toEntity()`, and view `toDTO()` methods
- [ ] Service follows Interface + Impl pattern
- [ ] Service Impl uses `@Service`, `@Transactional`, `@Slf4j`, `@RequiredArgsConstructor`
- [ ] `auditService.setAuditFields()` called before every save
- [ ] New entities saved via `repository.saveWithUniqueKey()`, updates via `repository.save()`
- [ ] Relationships resolved by `findByUniqueKey()` with `ResourceNotFoundException`
- [ ] Controller extends `BaseController`, uses `@RestController`, `@RequiredArgsConstructor`
- [ ] All endpoints return `ResponseEntity<ApiResponse<Object>>`
- [ ] List endpoints use `FilterCriteriaUtil` + `@PageableDefault(size = CommonUtil.DEFAULT_PAGE_SIZE)`
- [ ] Logging at `INFO` for method entry/exit, `ERROR` for failures
- [ ] Flyway migration created for new tables/columns (see `DB_AI_GUIDELINES.md`)
