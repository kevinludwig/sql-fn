const path = require('path'),
    chai = require('chai'),
    {withTransaction, txSeries, txParallel, txWaterfall, generate} = require('../index')({
        user: 'admin',
        password: 'admin',
        port: 5432,
        database: 'postgres'
    });

const should = chai.should();

const {
    fns: {
        createTable,
        createOnePerson,
        findOnePersonById,
        findAllPersonsByFirstName,
        updateOnePersonById,
        deleteOnePersonById,
        deleteAll
    },
    sql
} = generate(path.join(__dirname, './sql'));

describe('sql-to-pg', () => {
    let server;

    before(async () => {
        await createTable();
    });

    afterEach(async () => {
        await deleteAll();
    });

    it('should run generated functions', async () => {
        let person = await createOnePerson('12345', 'John', 'Smith', 18, '121-555-1212');
        should.exist(person);
        person.first_name.should.be.eql('John');

        await createOnePerson('23456', 'John', 'Deere', 90, '212-555-2121');

        /* find by id */
        person = await findOnePersonById('23456');
        person.last_name.should.be.eql('Deere');

        let peeps = await findAllPersonsByFirstName('John');
        peeps.should.have.lengthOf(2);

        person = await updateOnePersonById('12345', 'Johnny', 'Smith', 19, '121-555-1212');
        person.first_name.should.be.eql('Johnny');

        await deleteOnePersonById('12345');

        person = await findOnePersonById('12345');
        should.not.exist(person);
    });

    it('should allow low level access to do complex transactions with txSeries', async () => {
        await createOnePerson('12345', 'John', 'Smith', 18, '121-555-1212');
        await createOnePerson('23456', 'John', 'Deere', 90, '212-555-2121');

        /* multiple updates, applied in series, in a transaction */
        await withTransaction(txSeries(
            sql.updateOnePersonById, ['12345', 'Bob', 'Smith', 18, '121-555-1212'],
            sql.updateOnePersonById, ['23456', 'Bob', 'Deere', 90, '212-555-2121']));

        const peeps = await findAllPersonsByFirstName('Bob');
        peeps.should.have.lengthOf(2);
    });

    it('should allow low level access to do complex transactions with txParallel', async () => {
        await createOnePerson('12345', 'John', 'Smith', 18, '121-555-1212');
        await createOnePerson('23456', 'John', 'Deere', 90, '212-555-2121');

        /* multiple updates, applied in parallel, in a transaction */
        await withTransaction(txParallel(
            sql.updateOnePersonById, ['12345', 'Bob', 'Smith', 18, '121-555-1212'],
            sql.updateOnePersonById, ['23456', 'Bob', 'Deere', 90, '212-555-2121']));

        const peeps = await findAllPersonsByFirstName('Bob');
        peeps.should.have.lengthOf(2);
    });

    it('should allow low level access to do complex transactions with txWaterfall', async () => {
        await createOnePerson('12345', 'John', 'Smith', 18, '121-555-1212');
        await createOnePerson('23456', 'John', 'Deere', 90, '212-555-2121');

        /* multiple updates, applied in waterfall, in a transaction */
        await withTransaction(txWaterfall(
            sql.updateOnePersonById, () => (['12345', 'Bob', 'Smith', 18, '121-555-1212']),
            sql.updateOnePersonById, (prior) => (['23456', 'Bob', 'Deere', prior.rows[0].age + 1, '212-555-2121'])));

        const person = await findOnePersonById('23456');
        person.age.should.be.eql(19);
    });
});
