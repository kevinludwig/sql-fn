UPDATE people
SET first_name = $2,
    last_name=$3,
    age=$4,
    phone=$5
WHERE id=$1
RETURNING *;