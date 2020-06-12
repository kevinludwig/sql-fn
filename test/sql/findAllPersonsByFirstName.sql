SELECT id, first_name, last_name, age, phone
FROM people
WHERE first_name = $1;