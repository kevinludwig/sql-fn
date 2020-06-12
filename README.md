### sql-to-pg

Convert SQL files to executing code in a few lines of javascript.

### Usage

Given a directory of SQL files, each file containing one statement, something like this:

```
./sql/
    findPersonById.sql
    findPersonByName.sql
    findAllPersons.sql
    createPerson.sql
    updatePersonById.sql
    deletePersonById.sql

```

```
const config = {
    /* postgres config: db, username, password, etc. 
    This is the same config you'd pass to pg.Pool
    */
};
const {generate} = require('sql-to-pg')(config);

const {
    findPersonById,
    findPersonByName,
    findAllPersons,
    createPerson,
    updatePersonById,
    deletePersonById
} = generate('./sql');

(async () => {
    let rows = await createPerson(1, 'John', 'Smith', 32, '555-1212');
    const rows = await findPersonById(1);
    const [person] = rows;
    console.log(person);
});
```
