\pset pager off
\pset format aligned

SELECT current_database() AS database_name, now() AS verified_at;

SELECT 'users' AS entity, count(*) AS total FROM users
UNION ALL
SELECT 'tasks' AS entity, count(*) AS total FROM tasks
ORDER BY entity;

SELECT status, count(*) AS total
FROM tasks
GROUP BY status
ORDER BY status;

SELECT priority, count(*) AS total
FROM tasks
GROUP BY priority
ORDER BY priority;

SELECT
  min("createdAt") AS oldest_task,
  max("createdAt") AS newest_task,
  count(*) FILTER (WHERE "assigneeId" IS NULL) AS unassigned_tasks
FROM tasks;

SELECT count(*) AS orphan_assignees
FROM tasks t
LEFT JOIN users u ON u.id = t."assigneeId"
WHERE t."assigneeId" IS NOT NULL AND u.id IS NULL;
