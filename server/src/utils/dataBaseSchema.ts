//missing some tables, for example department was missing (not on schema.prisma, why?) need to check db and compared tables with all tables here, then update



export function getFullDatabaseSchema() {
  return {
    enums: {
      UserRole: ["ADMIN", "PROJECT_MANAGER", "DEVELOPER", "MEMBER", "GUEST"],
      UserStatus: ["ACTIVE", "INACTIVE"],
      ProjectStatus: ["PLANNING", "IN_PROGRESS", "COMPLETED"],
      TaskStatus: ["TODO", "IN_PROGRESS", "DONE"],
      TaskPriority: ["LOW", "MEDIUM", "HIGH"],
      TaskAttachmentType: ["IMAGE", "FILE", "LINK", "PDF"],
      NotificationChannel: ["APP", "EMAIL"],
      NotificationSeverity: ["INFO", "WARNING", "CRITICAL"],
      NotificationDeliveryStatus: ["PENDING", "SENT", "FAILED"],
      SchedulerRunStatus: ["SUCCESS", "FAILED", "SKIPPED"],
      ExpenseCategory: ["SOFTWARE", "TRAVEL", "EQUIPMENT", "LABOR", "OPERATIONS", "OTHER"]
    },
    tables: [
      {
        name: "User",
        description: "Users of the platform with roles, status, and personal information",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "firstName", type: "string", description: "User's first name" },
          { name: "lastName", type: "string", description: "User's last name" },
          { name: "email", type: "string", description: "User's email address (unique)" },
          { name: "passwordHash", type: "string", description: "Hashed password" },
          { name: "role", type: "enum", description: "User role from UserRole enum" },
          { name: "roleLabel", type: "string", description: "Custom role label" },
          { name: "hourlyRateCents", type: "int", description: "Hourly rate in cents" },
          { name: "status", type: "enum", description: "User status from UserStatus enum" },
          { name: "isVerified", type: "boolean", description: "Whether user is verified" },
          { name: "profileImageUrl", type: "string", description: "URL to profile image" },
          { name: "resetToken", type: "string", description: "Password reset token" },
          { name: "resetTokenExpiresAt", type: "datetime", description: "Reset token expiration time" },
          { name: "invitationToken", type: "string", description: "Invitation token" },
          { name: "invitationTokenExpiresAt", type: "datetime", description: "Invitation token expiration time" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "Department",
        description: "Departments within the organization",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "description", type: "string", description: "Description of the department" },
          { name: "name", type: "string", description: "department's name" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "RefreshToken",
        description: "Refresh tokens for user authentication sessions",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "token", type: "string", description: "Refresh token value (unique)" },
          { name: "userId", type: "string", description: "User ID (references User.id)" },
          { name: "expiresAt", type: "datetime", description: "Token expiration time" },
          { name: "revokedAt", type: "datetime", description: "When token was revoked" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" }
        ]
      },
      {
        name: "Project",
        description: "Projects in the system with budgets, timelines, and status",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "name", type: "string", description: "Project name" },
          { name: "description", type: "string", description: "Project description" },
          { name: "status", type: "enum", description: "Project status from ProjectStatus enum" },
          { name: "startDate", type: "datetime", description: "Project start date" },
          { name: "endDate", type: "datetime", description: "Project end date" },
          { name: "budgetCents", type: "int", description: "Project budget in cents" },
          { name: "projectManagerId", type: "string", description: "ID of project manager (references User.id)" },
          { name: "kanbanTemplateKey", type: "string", description: "Kanban template key" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "ProjectHealthSnapshot",
        description: "Snapshot of project health metrics at a specific time",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "projectId", type: "string", description: "Project ID (references Project.id, unique)" },
          { name: "statusLabel", type: "string", description: "Health status label" },
          { name: "computedAt", type: "datetime", description: "When the snapshot was computed" }
        ]
      },
      {
        name: "ProjectTaskStatus",
        description: "Custom task statuses for projects",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "projectId", type: "string", description: "Project ID (references Project.id)" },
          { name: "value", type: "string", description: "Status value (unique per project)" },
          { name: "label", type: "string", description: "Status label" },
          { name: "position", type: "int", description: "Display position (unique per project)" },
          { name: "category", type: "enum", description: "Category from TaskStatus enum" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "Phase",
        description: "Project phases",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "projectId", type: "string", description: "Project ID (references Project.id)" },
          { name: "name", type: "string", description: "Phase name" },
          { name: "position", type: "int", description: "Display position (unique per project)" },
          { name: "startDate", type: "datetime", description: "Phase start date" },
          { name: "endDate", type: "datetime", description: "Phase end date" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "Sprint",
        description: "Sprints within project phases",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "projectId", type: "string", description: "Project ID (references Project.id)" },
          { name: "phaseId", type: "string", description: "Phase ID (references Phase.id)" },
          { name: "name", type: "string", description: "Sprint name (unique per phase)" },
          { name: "goal", type: "string", description: "Sprint goal" },
          { name: "startDate", type: "datetime", description: "Sprint start date" },
          { name: "endDate", type: "datetime", description: "Sprint end date" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "Task",
        description: "Tasks within projects with assignments, priorities, and status",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "projectId", type: "string", description: "Project ID (references Project.id)" },
          { name: "sprintId", type: "string", description: "Sprint ID (references Sprint.id)" },
          { name: "assigneeId", type: "string", description: "Assignee user ID (references User.id)" },
          { name: "statusId", type: "string", description: "Status ID (references ProjectTaskStatus.id)" },
          { name: "title", type: "string", description: "Task title" },
          { name: "description", type: "string", description: "Task description" },
          { name: "dueDate", type: "datetime", description: "Task due date" },
          { name: "priority", type: "enum", description: "Task priority from TaskPriority enum" },
          { name: "estimateHours", type: "float", description: "Estimated hours to complete" },
          { name: "actualSeconds", type: "int", description: "Actual time spent in seconds" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "TaskDependency",
        description: "Dependencies between tasks",
        columns: [
          { name: "taskId", type: "string", description: "Dependent task ID (references Task.id)" },
          { name: "dependsOnTaskId", type: "string", description: "Task that must be completed first (references Task.id)" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" }
        ]
      },
      {
        name: "Checklist",
        description: "Checklists associated with tasks",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "taskId", type: "string", description: "Task ID (references Task.id, unique)" },
          { name: "requireAllDone", type: "boolean", description: "Whether all items must be done" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "ChecklistItem",
        description: "Individual items within checklists",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "checklistId", type: "string", description: "Checklist ID (references Checklist.id)" },
          { name: "label", type: "string", description: "Item label" },
          { name: "done", type: "boolean", description: "Whether item is completed" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "TaskActivity",
        description: "Activity log for task updates and comments",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "taskId", type: "string", description: "Task ID (references Task.id)" },
          { name: "userId", type: "string", description: "User ID (references User.id)" },
          { name: "message", type: "string", description: "Activity message" },
          { name: "metadata", type: "json", description: "Additional metadata" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" }
        ]
      },
      {
        name: "TaskAttachment",
        description: "Files and attachments associated with tasks",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "taskId", type: "string", description: "Task ID (references Task.id)" },
          { name: "userId", type: "string", description: "User ID who uploaded (references User.id)" },
          { name: "type", type: "enum", description: "Attachment type from TaskAttachmentType enum" },
          { name: "name", type: "string", description: "Attachment name" },
          { name: "objectKey", type: "string", description: "Storage object key" },
          { name: "url", type: "string", description: "Access URL" },
          { name: "mimeType", type: "string", description: "MIME type" },
          { name: "size", type: "int", description: "File size in bytes" },
          { name: "metadata", type: "json", description: "Additional metadata" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" }
        ]
      },
      {
        name: "ProjectPersonnel",
        description: "Project team members and their roles",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "projectId", type: "string", description: "Project ID (references Project.id)" },
          { name: "userId", type: "string", description: "User ID (references User.id)" },
          { name: "roleLabel", type: "string", description: "Custom role label" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" }
        ]
      },
      {
        name: "Assignment",
        description: "User assignments to tasks with allocation percentages",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "taskId", type: "string", description: "Task ID (references Task.id)" },
          { name: "userId", type: "string", description: "User ID (references User.id)" },
          { name: "allocationPct", type: "int", description: "Allocation percentage (0-100)" },
          { name: "startDate", type: "datetime", description: "Assignment start date" },
          { name: "endDate", type: "datetime", description: "Assignment end date" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "TimeEntry",
        description: "Time entries for tasks with durations and notes",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "projectId", type: "string", description: "Project ID (references Project.id)" },
          { name: "taskId", type: "string", description: "Task ID (references Task.id)" },
          { name: "userId", type: "string", description: "User ID (references User.id)" },
          { name: "startedAt", type: "datetime", description: "When time tracking started" },
          { name: "stoppedAt", type: "datetime", description: "When time tracking stopped" },
          { name: "entryDate", type: "datetime", description: "Entry date" },
          { name: "seconds", type: "int", description: "Duration in seconds" },
          { name: "note", type: "string", description: "Time entry note" },
          { name: "rateCentsSnapshot", type: "int", description: "Hourly rate snapshot in cents" },
          { name: "missingReminderSentAt", type: "datetime", description: "When missing time reminder was sent" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "Expense",
        description: "Project expenses with categories and amounts",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "projectId", type: "string", description: "Project ID (references Project.id)" },
          { name: "title", type: "string", description: "Expense title" },
          { name: "category", type: "enum", description: "Expense category from ExpenseCategory enum" },
          { name: "amountCents", type: "int", description: "Amount in cents" },
          { name: "description", type: "string", description: "Expense description" },
          { name: "date", type: "datetime", description: "Expense date" },
          { name: "createdById", type: "string", description: "Creator user ID (references User.id)" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      },
      {
        name: "Notification",
        description: "System notifications with severity and delivery status",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "projectId", type: "string", description: "Project ID (references Project.id)" },
          { name: "actorId", type: "string", description: "Actor user ID (references User.id)" },
          { name: "entityType", type: "string", description: "Entity type (e.g., 'task', 'project')" },
          { name: "entityId", type: "string", description: "Entity ID" },
          { name: "category", type: "string", description: "Notification category" },
          { name: "eventKey", type: "string", description: "Event key" },
          { name: "title", type: "string", description: "Notification title" },
          { name: "body", type: "string", description: "Notification body" },
          { name: "severity", type: "enum", description: "Severity from NotificationSeverity enum" },
          { name: "metadata", type: "json", description: "Additional metadata" },
          { name: "dedupeKey", type: "string", description: "Deduplication key" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" }
        ]
      },
      {
        name: "NotificationDelivery",
        description: "Delivery status for notifications to users",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "notificationId", type: "string", description: "Notification ID (references Notification.id)" },
          { name: "userId", type: "string", description: "User ID (references User.id)" },
          { name: "channel", type: "enum", description: "Delivery channel from NotificationChannel enum" },
          { name: "status", type: "enum", description: "Delivery status from NotificationDeliveryStatus enum" },
          { name: "readAt", type: "datetime", description: "When user read the notification" },
          { name: "sentAt", type: "datetime", description: "When notification was sent" },
          { name: "errorMessage", type: "string", description: "Error message if delivery failed" },
          { name: "metadata", type: "json", description: "Additional metadata" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" }
        ]
      },
      {
        name: "NotificationSchedulerRun",
        description: "Logs of notification scheduler runs",
        columns: [
          { name: "id", type: "string", description: "Unique identifier" },
          { name: "startedAt", type: "datetime", description: "When scheduler run started" },
          { name: "endedAt", type: "datetime", description: "When scheduler run ended" },
          { name: "status", type: "enum", description: "Run status from SchedulerRunStatus enum" },
          { name: "triggeredBy", type: "string", description: "What triggered the run" },
          { name: "summaryJson", type: "json", description: "Summary data in JSON format" },
          { name: "createdAt", type: "datetime", description: "Creation timestamp" },
          { name: "updatedAt", type: "datetime", description: "Last update timestamp" }
        ]
      }
    ],
    relationships: [
      "User.id ← RefreshToken.userId",
      "User.id ← Project.projectManagerId",
      "User.id ← Task.assigneeId",
      "User.id ← ProjectPersonnel.userId",
      "User.id ← Assignment.userId",
      "User.id ← TaskAttachment.userId",
      "User.id ← Expense.createdById",
      "User.id ← TimeEntry.userId",
      "User.id ← TaskActivity.userId",
      "User.id ← Notification.actorId",
      "User.id ← NotificationDelivery.userId",
      "Project.id ← ProjectHealthSnapshot.projectId",
      "Project.id ← ProjectTaskStatus.projectId",
      "Project.id ← Phase.projectId",
      "Project.id ← Sprint.projectId",
      "Project.id ← Task.projectId",
      "Project.id ← ProjectPersonnel.projectId",
      "Project.id ← Expense.projectId",
      "Project.id ← TimeEntry.projectId",
      "Project.id ← Notification.projectId",
      "Phase.id ← Sprint.phaseId",
      "Sprint.id ← Task.sprintId",
      "ProjectTaskStatus.id ← Task.statusId",
      "Task.id ← TaskDependency.taskId",
      "Task.id ← TaskDependency.dependsOnTaskId",
      "Task.id ← Checklist.taskId",
      "Task.id ← TaskActivity.taskId",
      "Task.id ← TaskAttachment.taskId",
      "Task.id ← Assignment.taskId",
      "Task.id ← TimeEntry.taskId",
      "Checklist.id ← ChecklistItem.checklistId",
      "Notification.id ← NotificationDelivery.notificationId"
    ],
    importantNotes: [
      "All ID fields are strings using UUID format",
      "Money amounts are stored in cents (integer) - divide by 100 for dollars",
      "Time durations are stored in seconds - divide by 3600 for hours",
      "Use ILIKE for case-insensitive text searches",
      "Enum values are stored as strings in uppercase",
      "JSON fields contain structured metadata",
      "Column names with capital letters MUST be quoted: \"firstName\", NOT firstname",
      "TaskDependency has a composite primary key (taskId, dependsOnTaskId)",
      "Assignment has a unique constraint on (taskId, userId, startDate, endDate)",
      "ProjectTaskStatus has value and position unique per project",
      "Phase position is unique per project",
      "Sprint name is unique per phase"
    ]
  };
}