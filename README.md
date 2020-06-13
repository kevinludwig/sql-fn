# sql-fn

SQL in, functions out. No ORM. No learning curve.

Loosely inspired by clojure's hugsql library.

### Basic Usage

Given a directory of SQL files, each file containing one statement, something like this:

```
./sql/
    findOnePersonById.sql
    findOnePersonByName.sql
    findAllPersons.sql
    createOnePerson.sql
    updateOnePersonById.sql
    deleteOnePersonById.sql

```

Generate code like this:

```
const config = {
    /* postgres config: db, username, password, etc. 
    This is the same config you'd pass to pg.Pool
    */
};

/* generate code from SQL files */
const {generate} = require('sql-to-pg')(config);

/* generated SQL functions have same names as filenames */
const {
    fns: {
        findOnePersonById,
        findOnePersonByName,
        findAllPersons,
        createOnePerson,
        updateOnePersonById,
        deleteOnePersonById
    }
} = generate('./sql');

(async () => {
    let rows = await createOnePerson(1, 'John', 'Smith', 32, '555-1212');
    const person = await findOnePersonById(1);
    console.log(person);
});
```

### Options

By default, any query (SQL filename) beginning with `findOne`, `updateOne`, `createOne`, or `deleteOne`
is assumed to return a single row, and the generated code will return first row only.

Similarly, any SQL command which has `UPDATE`, `DELETE`, or `INSERT` results in the operation being 
wrapped in a transaction.

These rules can be changed, or overridden, for individual queries, via an options parameter.


#### Override Global setting

In the example below, we use the options keys `tx` and `single` to turn transaction wrapping off entirely,
and return single result for any sql containing the text "SELECT".
```
const {generate, withOptions} = require('sql-to-pg')(config);
const {
    fns: {
        findOnePersonById,
        findOnePersonByName,
        findAllPersons,
        createOnePerson
    }
} = generate('./sql', withOptions({ tx: (name, sql) => false, single: (name, sql) => sql.includes('SELECT')} );
```

#### Override Individual Queries

In the example below, the `createOnePerson` query has been overridden to not be a transaction, and 
returning single row.

```
const {generate, withOptions} = require('sql-to-pg')(config);
const {
    fns: {
        findOnePersonById,
        findOnePersonByName,
        findAllPersons,
        createOnePerson
    }
} = generate('./sql', withOptions({ createOnePerson: {single: true, tx: false} );
```

### Advanced Use Cases

Three advanced use cases are supported with regard to transactions, `txSeries`, `txParallel`, and `txWaterfall`. These
loosely map to the corresponding operations in the `async` node package. To use these, you must drop below the 
level of generated code and use underlying functions that power this library.

#### txSeries

Execute a series of statements in series, in a transaction

```
const config = { ... };

/* generate code from SQL files */
const {generate, withTransaction, txSeries} = require('sql-to-pg')(config);

/* use sql key to access raw sql query */
const {
    sql: {
        updateOnePersonById,
    }
} = generate('./sql');

(async () => {
    const results = await withTransaction(txSeries(
        updateOnePersonById,
        ['12345', 'John', 'Deere', 23, '123-345-6789'],
        updateOnePersonById,
        ['9999', 'Some', 'Guy', 99, '555-555-1212']
    ));
});
```

#### txParallel

Execute a series of statements in parallel, in a transaction

```
const config = { ... };

/* generate code from SQL files */
const {generate, withTransaction, txParalel} = require('sql-to-pg')(config);

/* use sql key to access raw sql query */
const {
    sql: {
        updateOnePersonById,
    }
} = generate('./sql');

(async () => {
    const results = await withTransaction(txParallel(
        updateOnePersonById,
        ['12345', 'John', 'Deere', 23, '123-345-6789'],
        updateOnePersonById,
        ['9999', 'Some', 'Guy', 99, '555-555-1212']
    ));
});
```

#### txWaterfall

Execute a series of statements in series, where the prior results is passed into the next

```
const config = { ... };

/* generate code from SQL files */
const {generate, withTransaction, txWaterfall} = require('sql-to-pg')(config);

/* use sql key to access raw sql query */
const {
    sql: {
        updateOnePersonById,
    }
} = generate('./sql');

(async () => {
    const results = await withTransaction(txWaterfall(
        updateOnePersonById,
        () => ['12345', 'John', 'Deere', 23, '123-345-6789'],
        updateOnePersonById,
        (prior) => ['9999', 'Some', 'Guy', prior.rows[0].age + 1, '555-555-1212']
    ));
});
```
