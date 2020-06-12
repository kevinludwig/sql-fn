const path = require('path'),
    chai = require('chai'),
    pg = require('pg'),
    {query, generate} = require('../index')({
        user: 'admin',
        password: 'admin',
        port: 5432,
        database: 'postgres'
    });

const should = chai.should();

const {
    createTable,
    createOnePerson,
    findOnePersonById,
    findAllPersonsByFirstName,
    updateOnePersonById,
    deleteOnePersonById,
    deleteAll
} = generate(path.join(__dirname, './sql'));

describe('sql-to-pg', () => {
    let server;

    before(async () => {
        await createTable();
    });

    after(async () => {
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
});
