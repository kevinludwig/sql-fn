const fs = require('fs'),
    assert = require('assert'),
    path = require('path'),
    {Pool, Client} = require('pg'),
    Cursor = require('pg-cursor');

const first = (a) => a && a.length ? a[0] : null;

module.exports = (config) => {
    const pool = new Pool(config);
    
    const withClient = async (afn) => {
        const client = await pool.connect();
        try {
            return afn(client);
        } finally {
            client.release();
        }
    };

    const query = (sql, params) => withClient(async (client) => client.query(sql, params));

    const withTransaction = (body) => withClient(async (client) => {
        await client.query('BEGIN');
        try {
            const res = await body(client);
            await client.query('COMMIT');
            return res;
        } catch (ex) {
            await client.query('ROLLBACK');
            throw ex;
        }
    });

    const updateFn = (sql, single) => (...params) => {
        return withTransaction(async (client) => {
            const {rows} = await client.query(sql, params);
            return single ? first(rows) : rows;
        });
    };

    const queryFn = (sql, single) => async (...params) => {
        const {rows} = await query(sql, params);
        return single ? first(rows) : rows;
    };

    const toJS = (options) => ([name, sql]) => {
        let tx = options[name] && options[name].tx;
        let single = options[name] && options[name].single;

        if (tx === undefined) tx = options.tx(name, sql);
        if (single === undefined) single = options.single(name, sql);

        const fn = tx ? updateFn(sql, single) : queryFn(sql, single);
        return [
            name,
            fn
        ];
    };

    const isUpdate = (name, sql) => /INSERT|UPDATE|DELETE/.test(sql);
    const isSingle = (name) => /^(findOne|updateOne|deleteOne|createOne)/.test(name);
    const withOptions = (options) => ({tx: isUpdate, single: isSingle, ...options});
    
    const isSqlFile = (f) => path.extname(f) === '.sql';
    const toMethodName = (f) => path.basename(f).replace(/\.sql$/, '');
    const readSql = (f) => fs.readFileSync(f, 'utf-8');

    const generate = (dir, options = withOptions()) => {
        const sql = fs.readdirSync(dir)
            .filter(isSqlFile)
            .map(entry => [toMethodName(entry), readSql(path.join(dir, entry))]);

        const fns = Object.fromEntries(sql.map(toJS(options)));
        return {
            sql: Object.fromEntries(sql),
            fns
        };
    };

    const pairsFrom = (...args) => {
        const result = [];
        for (let i = 0; i < args.length; i += 2) {
            result.push([args[i], args[i+1]]);
        }
        return result;
    };

    const txSeries = (...args) => async (client) => {
        assert(args.length % 2 === 0, 'must be even number of args');
        const results = [];
        for (const [sql, params] of pairsFrom(...args)) {
            results.push(await client.query(sql, params));
        }
        return results;
    };

    const txParallel = (...args) => async (client) => {
        assert(args.length % 2 === 0, 'must be even number of args');
        return Promise.all(pairsFrom(...args).map(([sql, params]) => client.query(sql, params)));
    };

    const txWaterfall = (...args) => async (client) => {
        assert(args.length %2 === 0, 'must be even number of args');
        const results = [];
        let lastResult = null;
        for (const [sql, paramFn] of pairsFrom(...args)) {
            lastResult = await client.query(sql, paramFn(lastResult));
            results.push(lastResult);
        }
        return results;
    };
    return {
        withOptions,
        withClient,
        query,
        withTransaction,
        txSeries,
        txParallel,
        txWaterfall,
        generate
    };
};

