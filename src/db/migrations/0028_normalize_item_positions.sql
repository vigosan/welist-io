UPDATE items
SET position = sub.new_position
FROM (
  SELECT
    id,
    (ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY created_at ASC, id ASC) - 1)::int AS new_position
  FROM items
) AS sub
WHERE items.id = sub.id
  AND items.position IS DISTINCT FROM sub.new_position;
