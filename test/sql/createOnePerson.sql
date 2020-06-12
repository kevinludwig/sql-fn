INSERT INTO people (id, first_name, last_name, age, phone)
    VALUES ($1, $2, $3, $4, $5) RETURNING *;