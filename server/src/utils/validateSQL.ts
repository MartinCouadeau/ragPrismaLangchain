// First, let's create a function to validate and fix SQL before execution
export function validateSQL(sql: string): string {
  let fixedSQL = sql.trim();
  
  // 1. Fix table names
  const tables = [
    "User", "Project", "Task", "Expense", "TimeEntry", "Notification",
    "TaskActivity", "ProjectTaskStatus", "Sprint", "Phase", "ProjectPersonnel",
    "Checklist", "ChecklistItem", "TaskDependency", "TaskAttachment",
    "Assignment", "RefreshToken", "NotificationDelivery", "NotificationSchedulerRun",
    "ProjectHealthSnapshot"
  ];
  
  for (const table of tables) {
    // Replace unquoted table names
    const regex = new RegExp(`\\b${table}\\b(?![\\"'])`, 'gi');
    fixedSQL = fixedSQL.replace(regex, `"${table}"`);
  }
  
  // 2. Fix common column patterns
  const columnPatterns = [
    // CamelCase columns
    { pattern: /\b([a-z]+[A-Z][a-zA-Z]*)\b(?!["'])/g, replace: '"$1"' },
    // Common columns that end with "Id"
    { pattern: /\b([a-zA-Z]+Id)\b(?!["'])/gi, replace: '"$1"' },
    // Common columns that end with "At"
    { pattern: /\b([a-zA-Z]+At)\b(?!["'])/gi, replace: '"$1"' },
    // Common columns that end with "Date"
    { pattern: /\b([a-zA-Z]+Date)\b(?!["'])/gi, replace: '"$1"' }
  ];
  
  for (const { pattern, replace } of columnPatterns) {
    fixedSQL = fixedSQL.replace(pattern, replace);
  }
  
  // 3. Fix specific common columns
  const specificColumns = [
    'id', 'firstName', 'lastName', 'email', 'name', 'title', 'description',
    'createdAt', 'updatedAt', 'status', 'role', 'priority', 'dueDate',
    'startDate', 'endDate', 'projectId', 'userId', 'taskId', 'sprintId',
    'phaseId', 'assigneeId', 'statusId', 'amountCents', 'budgetCents',
    'hourlyRateCents', 'rateCentsSnapshot', 'entryDate', 'seconds',
    'estimateHours', 'actualSeconds', 'profileImageUrl', 'kanbanTemplateKey',
    'isVerified', 'startedAt', 'stoppedAt', 'note', 'message', 'body',
    'category', 'severity', 'channel', 'entityType', 'entityId', 'eventKey',
    'dedupeKey', 'metadata', 'objectKey', 'mimeType', 'size', 'label',
    'value', 'position', 'goal', 'allocationPct', 'passwordHash', 'token',
    'expiresAt', 'revokedAt', 'resetToken', 'resetTokenExpiresAt',
    'invitationToken', 'invitationTokenExpiresAt', 'roleLabel',
    'missingReminderSentAt', 'createdById', 'actorId', 'notificationId',
    'readAt', 'sentAt', 'errorMessage', 'startedAt', 'endedAt', 'triggeredBy',
    'summaryJson', 'computedAt', 'statusLabel', 'requireAllDone', 'done',
    'checklistId', 'dependsOnTaskId', 'url'
  ];
  
  for (const column of specificColumns) {
    const regex = new RegExp(`\\b${column}\\b(?![\\"'])`, 'gi');
    fixedSQL = fixedSQL.replace(regex, `"${column}"`);
  }
  
  // 4. Fix GROUP BY issues - if there's a SELECT with non-aggregated columns and GROUP BY,
  // make sure all non-aggregated columns are in GROUP BY
  if (fixedSQL.toUpperCase().includes('GROUP BY')) {
    // This is a complex fix - for now, we'll just make sure it's a valid query
    // by checking if COUNT/SUM/AVG etc are used with non-grouped columns
    const hasAggregate = /(COUNT|SUM|AVG|MAX|MIN|GROUP_CONCAT)\s*\(/i.test(fixedSQL);
    if (hasAggregate) {
      // For now, we'll just note this and let it fail with a better error
      console.log("Warning: Query contains GROUP BY with aggregates");
    }
  }
  
  // 5. Always add LIMIT if missing (for safety)
  const upperSQL = fixedSQL.toUpperCase();
  if (!upperSQL.includes('LIMIT') && !upperSQL.includes('FETCH')) {
    if (fixedSQL.endsWith(';')) {
      fixedSQL = fixedSQL.slice(0, -1);
    }
    // Don't add LIMIT to COUNT queries
    if (!upperSQL.includes('COUNT(')) {
      fixedSQL += ' LIMIT 100';
    }
  }
  
  return fixedSQL;
}