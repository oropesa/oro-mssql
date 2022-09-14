const Ofn = require( 'oro-functions' );
const { OMSSql } = require( '../index' );

//

const CONFIG = Ofn.getFileJsonRecursivelySync( `${__dirname}/config.json` );

beforeAll(async () => {
    let oMSSql = new OMSSql( { settings: CONFIG } );
    await oMSSql.poolOpen();
    await oMSSql.query( "CREATE DATABASE test_oromssql" );
    await oMSSql.poolClose();

    let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
    oMSSql = new OMSSql( { settings } );
    await oMSSql.poolOpen();

    await oMSSql.query(
        `CREATE TABLE test_easy (
                    id INT NOT NULL IDENTITY PRIMARY KEY, \
                    name VARCHAR (16) NOT NULL,
                CONSTRAINT unique_test_easy_name UNIQUE ( name ) )` );
    await oMSSql.query(
        `CREATE TABLE test_complex ( \
                    name VARCHAR (16) NOT NULL, \
                    code INT IDENTITY NOT NULL,
                CONSTRAINT pk_test_complex_code_name PRIMARY KEY ( code, name ) )` );
    await oMSSql.poolClose();
});

afterAll(async () => {
    let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
    let oMSSql = new OMSSql( { settings } );
    await oMSSql.poolOpen();

    await oMSSql.query( "DROP TABLE test_easy" );
    await oMSSql.query( "DROP TABLE test_complex" );

    await oMSSql.poolClose();
});

//

describe('query when pool not opened', () => {
    test( 'query before poolOpen', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        let result = await oMSSql.query( `INSERT INTO test_easy ( name ) VALUES ( 'chacho' )` );

        expect( result.status ).toBe( false );
        expect( result.error.msg ).toBe( 'Server is down' );
    } );

    test( 'query after poolClose', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        await oMSSql.poolClose();

        let result = await oMSSql.query( `INSERT INTO test_easy ( name ) VALUES ( 'chacho' )` );

        expect( result.status ).toBe( false );
        expect( result.error.msg ).toBe( 'Server is down' );
    } );
});

describe('query INSERT', () => {
    test( 'query INSERT bad', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `INSERT INTO test_easy ( namee ) VALUES ( 'chacho' )` );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result.status ).toBe( false );
        expect( result.error.msg ).toBe( `RequestError: Invalid column name 'namee'.` );
        expect( lastQuery.status ).toBe( false );
        expect( lastQuery.error.msg ).toBe( `RequestError: Invalid column name 'namee'.` );
    } );

    test( 'query INSERT ok bool', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `INSERT INTO test_easy ( name ) VALUES ( 'chacho' )`, 'bool' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( true );
        expect( Ofn.type( lastQuery, true ) ).toBe( 'ResultArray' );
        expect( lastQuery.count ).toBe( 1 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query INSERT ok get id', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `INSERT INTO test_easy ( name ) OUTPUT INSERTED.id VALUES ( 'loco' )`, 'value' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( 2 );
        expect( lastQuery.count ).toBe( 1 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query INSERT ko unique', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `INSERT INTO test_easy ( name ) OUTPUT INSERTED.id VALUES ( 'chacho' )`, false );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( false );
        expect( lastQuery.status ).toBe( false );
        expect( lastQuery.error.msg ).toBe(
            `RequestError: Violation of UNIQUE KEY constraint 'unique_test_easy_name'. `
            + `Cannot insert duplicate key in object 'dbo.test_easy'. The duplicate key value is (chacho).` );
    } );

    test( 'query INSERT ok get bool', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `INSERT INTO test_easy ( name ) VALUES ( 'tio' )`, 'bool' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( true );
        expect( lastQuery.count ).toBe( 1 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query INSERT complex ok get id', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `INSERT INTO test_complex ( name ) OUTPUT INSERTED.code VALUES ( 'chacho' ), ( 'loco' )`, 'values' );
        let arr = await oMSSql.query( `SELECT * FROM test_complex`, 'array' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery( 1 );

        expect( result ).toEqual( [ 1, 2 ] );
        expect( arr ).toEqual( [ { name: 'chacho', code: 1 }, { name: 'loco', code: 2 } ] );
        expect( lastQuery.count ).toBe( 2 );
        expect( lastQuery.status ).toBe( true );
    } );
});

describe('query UPDATE', () => {
    test( 'query UPDATE ok', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `UPDATE test_easy SET name = 'foo' WHERE id = 2` );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( Ofn.type( result, true ) ).toBe( 'ResultArray' );
        expect( lastQuery.count ).toBe( 1 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query UPDATE ok get bool', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `UPDATE test_easy SET name = 'bar' WHERE name = 'fooo'`, 'bool' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( false );
        expect( lastQuery.count ).toBe( 0 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query UPDATE ok get bool', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `UPDATE test_easy SET name = 'bar' WHERE name = 'foo'`, 'bool' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( true );
        expect( lastQuery.count ).toBe( 1 );
        expect( lastQuery.status ).toBe( true );
    } );
});

describe('query SELECT', () => {
    test( 'query SELECT bad', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROMM test_easy` );
        await oMSSql.poolClose();

        expect( Ofn.type( result, true ) ).toBe( 'ResultArray' );
        expect( result.status ).toBe( false );
        expect( result.error.msg ).toBe( `RequestError: Incorrect syntax near 'FROMM'.` );
    } );

    test( 'query SELECT ok', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy` );
        await oMSSql.poolClose();

        expect( Ofn.type( result, true ) ).toBe( 'ResultArray' );
        expect( result.status ).toBe( true );
        expect( result.count ).toBe( 3 );
    } );

    test( 'query SELECT ok get bool', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT '' FROM test_easy`, 'bool' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( true );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get bad format', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy`, 'chacho' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( false );
        expect( lastQuery.status ).toBe( false );
        expect( lastQuery.error.msg ).toBe( 'OMSSql.query:format is not allowed: chacho' );
    } );

    test( 'query SELECT ok get count', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT '' FROM test_easy`, 'count' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( 3 );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get value default', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy WHERE name = 'chacho'`, 'value' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( 1 );
        expect( lastQuery.count ).toBe( 1 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get value', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT name FROM test_easy WHERE id = 1`, 'value' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( 'chacho' );
        expect( lastQuery.count ).toBe( 1 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get value column', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy WHERE id = 1`, 'value', 'name' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( 'chacho' );
        expect( lastQuery.count ).toBe( 1 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get value bad column', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy WHERE id = 1`, 'value', 'chacho' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toBe( undefined );
        expect( lastQuery.count ).toBe( 1 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get values default', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy ORDER BY id ASC`, 'values' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( [ 1, 2, 4 ] );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get values column', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy ORDER BY id ASC`, 'values', 'name' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( [ 'chacho', 'bar', 'tio' ] );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get values bad column', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy ORDER BY id ASC`, 'values', 'chacho' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( [ undefined, undefined, undefined ] );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get valuesById default', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy`, 'valuesById', 'name' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { '1': 'chacho', '2': 'bar', '4': 'tio' } );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get valuesById column key', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy`, 'valuesById', 'id', 'name' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { 'chacho': 1, 'bar': 2, 'tio': 4 } );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get valuesById bad column key', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy`, 'valuesById', 'chacho', 'name' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { 'chacho': undefined, 'bar': undefined, 'tio': undefined } );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get valuesById column bad key', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy`, 'valuesById', 'id', 'chacho' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( {} );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get array', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy ORDER BY id ASC`, 'array' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( [ { id: 1, name: 'chacho' }, { id: 2, name: 'bar' }, { id: 4, name: 'tio' } ] );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get arrayById default', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy ORDER BY id ASC`, 'arrayById' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { '1': { id: 1, name: 'chacho' }, '2': { id: 2, name: 'bar' }, '4': { id: 4, name: 'tio' } } );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get arrayById column', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy ORDER BY id ASC`, 'arrayById', 'name' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { 'chacho': { id: 1, name: 'chacho' }, 'bar': { id: 2, name: 'bar' }, 'tio': { id: 4, name: 'tio' } } );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get arrayById bad column', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy ORDER BY id ASC`, 'arrayById', 'chacho' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( {} );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get row', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy ORDER BY id ASC`, 'row' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { id: 1, name: 'chacho' } );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get row 2', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy ORDER BY id ASC`, 'row', 2 );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { id: 4, name: 'tio' } );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get bad row 999', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT * FROM test_easy ORDER BY id ASC`, 'row', 999 );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( {} );
        expect( lastQuery.count ).toBe( 3 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get rowStrict', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        await oMSSql.query( `INSERT INTO test_easy ( name ) VALUES ( '' )` );
        let result1 = await oMSSql.query( `SELECT * FROM test_easy WHERE id = 5`, 'row' );
        let result2 = await oMSSql.query( `SELECT * FROM test_easy WHERE id = 5`, 'rowStrict' );

        await oMSSql.poolClose();

        expect( result1 ).toEqual( { id: 5, name: '' } );
        expect( result2 ).toEqual( { id: 5 } );
    } );
});

describe('query SELECT with fnSanitize', () => {
    test( 'query SELECT ok bad fnSanitize', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query( `SELECT '' FROM test_easy`, 'bool', 0, 0, 'chacho' );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( false );
        expect( lastQuery.status ).toBe( false );
        expect( lastQuery.error.msg ).toBe( 'OMSSql.query:fnSanitize must be a function, not a string.' );
    } );

    test( 'query INSERT ok get id', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query(
            `INSERT INTO test_easy ( name ) OUTPUT INSERTED.id VALUES ( 'foo' )`, 'value', 0, 0,
            value => ({ rowId: value })
        );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();
        expect( result ).toEqual( { rowId: 6 } );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get bool', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query(
            `SELECT '' FROM test_easy`, 'bool', 0, 0,
            value => ({ isDone: value })
        );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { isDone: true } );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get count', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query(
            `SELECT '' FROM test_easy`, 'count', 0, 0,
            value => ({ total: value })
        );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { total: 5 } );
        expect( lastQuery.count ).toBe( 5 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get value', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query(
            `SELECT * FROM test_easy WHERE name = 'chacho'`, 'value', 'name', 0,
            value => ({ value })
        );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { value: 'chacho' } );
        expect( lastQuery.count ).toBe( 1 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get values', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query(
            `SELECT * FROM test_easy ORDER BY id ASC`, 'values', 'name', 0,
            value => ! value ? null : `name: ${value}`
        );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( [ 'name: chacho', 'name: bar', 'name: tio', null, 'name: foo' ] );
        expect( lastQuery.count ).toBe( 5 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get valuesById column key', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query(
            `SELECT * FROM test_easy`, 'valuesById', 'id', 'name',
            value => ({ id: value })
        );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { 'chacho': { id: 1 }, 'bar': { id: 2 }, 'tio': { id: 4 }, '': { id: 5 }, 'foo': { id: 6 } } );
        expect( lastQuery.count ).toBe( 5 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get array', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query(
            `SELECT * FROM test_easy ORDER BY id ASC`, 'array', 0, 0,
            value => ! value ? 'default' : value
        );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( [
            { id: 1, name: 'chacho' },
            { id: 2, name: 'bar' },
            { id: 4, name: 'tio' },
            { id: 5, name: 'default' },
            { id: 6, name: 'foo' },
        ] );
        expect( lastQuery.count ).toBe( 5 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get arrayById column', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query(
            `SELECT * FROM test_easy ORDER BY id ASC`, 'arrayById', 'name', 0,
            value => ! value ? 'default' : value
        );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( {
            'chacho': { id: 1, name: 'chacho'  },
            'bar'   : { id: 2, name: 'bar'     },
            'tio'   : { id: 4, name: 'tio'     },
            ''      : { id: 5, name: 'default' },
            'foo'   : { id: 6, name: 'foo'     }
        } );
        expect( lastQuery.count ).toBe( 5 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get row', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query(
            `SELECT * FROM test_easy ORDER BY id ASC`, 'row', 0, 0,
            value => value +''
        );
        await oMSSql.poolClose();

        let lastQuery = oMSSql.getLastQuery();

        expect( result ).toEqual( { id: '1', name: 'chacho' } );
        expect( lastQuery.count ).toBe( 5 );
        expect( lastQuery.status ).toBe( true );
    } );

    test( 'query SELECT ok get rowStrict', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result2 = await oMSSql.query(
            `SELECT * FROM test_easy WHERE id = 5`, 'rowStrict', 0, 0,
            value => value +''
        );
        await oMSSql.poolClose();

        expect( result2 ).toEqual( { id: '5' } );
    } );
});