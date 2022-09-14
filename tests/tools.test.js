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
        `CREATE TABLE test_tools ( \
                     id      INT NOT NULL IDENTITY PRIMARY KEY, \
                     name    VARCHAR (16) NOT NULL, \
                     info    TEXT NOT NULL, \
                     enabled TINYINT NOT NULL DEFAULT 1, \
                     fecha   DATE, \
                     created DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_test_tools_name UNIQUE ( name ) )` );

    await oMSSql.poolClose();
});

afterAll(async () => {
    let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
    let oMSSql = new OMSSql( { settings } );
    await oMSSql.poolOpen();

    await oMSSql.query( "DROP TABLE test_tools" );

    await oMSSql.poolClose();
});

//

describe('tools sanitize', () => {
    test( 'tool obj sanitize char', async () => {
        const oMSSql = new OMSSql();

        expect( oMSSql.sanitize( `chacho`   ) ).toBe( `'chacho'` );
        expect( oMSSql.sanitize( `'chacho'` ) ).toBe( `'''chacho'''` );
    } );

    test( 'tool static sanitize char', async () => {
        expect( OMSSql.sanitize( `chacho`      ) ).toBe( `'chacho'`        );
        expect( OMSSql.sanitize( `'chacho'`    ) ).toBe( `'''chacho\'''`  );
        expect( OMSSql.sanitize( `"chacho"`    ) ).toBe( `'"chacho"'`  );
        expect( OMSSql.sanitize( `' OR 1 = 1;` ) ).toBe( `''' OR 1 = 1;'` );
    } );

    test( 'tool static sanitize number', async () => {
        expect( OMSSql.sanitize(  5  ) ).toBe( `5` );
        expect( OMSSql.sanitize( '5' ) ).toBe( `'5'` );
    } );

    test( 'tool static sanitize null', async () => {
        expect( OMSSql.sanitize( undefined ) ).toBe( `NULL` );
        expect( OMSSql.sanitize( null ) ).toBe( `NULL` );
        expect( OMSSql.sanitize( 'NULL' ) ).toBe( `'NULL'` );
    } );

    test( 'tool static sanitize bool', async () => {
        expect( OMSSql.sanitize( true ) ).toBe( `1` );
        expect( OMSSql.sanitize( false ) ).toBe( `0` );
    } );

    test( 'tool static sanitize array', async () => {
        expect( OMSSql.sanitize( [ 1, 2, 3 ] ) ).toBe( `'[1,2,3]'` );
    } );

    test( 'tool static sanitize obj', async () => {
        expect( OMSSql.sanitize( { chacho: 'loco', tio: 1 } ) ).toBe( `'{"chacho":"loco","tio":1}'` );
        expect( OMSSql.sanitize( { chACho: "' OR 1 = 1;" } ) ).toBe( `'{"chACho":"'' OR 1 = 1;"}'` );
    } );
} );

describe('tools query history', () => {
    test( 'tool getAffectedRows', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result = await oMSSql.query(
            `INSERT INTO test_tools ( name, info, enabled, fecha) \
                    VALUES ( 'chacho', 'loco', '1', '2022-05-01' ), \
                           ( 'foo', 'bar', '0', NULL )` );
        await oMSSql.poolClose();

        expect( result.status ).toBe( true );
        expect( result.count ).toBe( 2 );
        expect( oMSSql.getAffectedRows() ).toBe( 2 );
    } );

    test( 'tool getLastQuery', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result1 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 1` );
        let result2 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 2` );
        await oMSSql.poolClose();

        let lastResult = oMSSql.getLastQuery();

        expect( Ofn.type( lastResult, true ) ).toBe( 'ResultArray' );
        expect( result2 ).not.toBe( lastResult );
        expect( result2 ).toEqual( lastResult );
    } );

    test( 'tool getLastQuery offset', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result1 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 1` );
        let result2 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 2` );
        await oMSSql.poolClose();

        let lastResult = oMSSql.getLastQuery( 1 );

        expect( Ofn.type( lastResult, true ) ).toBe( 'ResultArray' );
        expect( result1 ).not.toBe( lastResult );
        expect( result1 ).toEqual( lastResult );
    } );

    test( 'tool getLastQuery raw', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result1 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 1` );
        let result2 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 2` );
        await oMSSql.poolClose();

        let lastResult = oMSSql.getLastQuery( 0, true );

        expect( Ofn.type( lastResult, true ) ).toBe( 'ResultArray' );
        expect( result2 ).toBe( lastResult );
    } );

    test( 'tool getLastQuery offset bad', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result1 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 1` );
        let result2 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 2` );
        await oMSSql.poolClose();

        let lastResult = oMSSql.getLastQuery( 2 );

        expect( lastResult ).toBe( undefined );
    } );

    test( 'tool getFirstQuery', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result1 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 1` );
        let result2 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 2` );
        await oMSSql.poolClose();

        let lastResult = oMSSql.getFirstQuery();

        expect( Ofn.type( lastResult, true ) ).toBe( 'ResultArray' );
        expect( result1 ).not.toBe( lastResult );
        expect( result1 ).toEqual( lastResult );
    } );

    test( 'tool getFirstQuery offset', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result1 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 1` );
        let result2 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 2` );
        await oMSSql.poolClose();

        let lastResult = oMSSql.getFirstQuery( 1 );

        expect( Ofn.type( lastResult, true ) ).toBe( 'ResultArray' );
        expect( result2 ).not.toBe( lastResult );
        expect( result2 ).toEqual( lastResult );
    } );

    test( 'tool getFirstQuery raw', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result1 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 1` );
        let result2 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 2` );
        await oMSSql.poolClose();

        let lastResult = oMSSql.getFirstQuery( 0, true );

        expect( Ofn.type( lastResult, true ) ).toBe( 'ResultArray' );
        expect( result1 ).toBe( lastResult );
    } );

    test( 'tool getFirstQuery offset bad', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        await oMSSql.poolOpen();
        let result1 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 1` );
        let result2 = await oMSSql.query( `SELECT * FROM test_tools WHERE id = 2` );
        await oMSSql.poolClose();

        let lastResult = oMSSql.getFirstQuery( 2 );

        expect( lastResult ).toBe( undefined );
    } );

    test( 'tool getAllQueries', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        let results = [];

        await oMSSql.poolOpen();
        results.unshift( await oMSSql.query( `SELECT * FROM test_tools WHERE id = 1` ) );
        results.unshift( await oMSSql.query( `SELECT * FROM test_tools WHERE id = 2` ) );
        await oMSSql.poolClose();

        let allResults = oMSSql.getAllQueries();

        for( let i = 0, len = results.length; i < len; i++ ) {
            expect( results[ i ] ).not.toBe( allResults[ i ] );
            expect( results[ i ] ).toEqual( allResults[ i ] );
        }
    } );

    test( 'tool getAllQueries', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        let results = [];

        await oMSSql.poolOpen();
        results.unshift( await oMSSql.query( `SELECT * FROM test_tools WHERE id = 1` ) );
        results.unshift( await oMSSql.query( `SELECT * FROM test_tools WHERE id = 2` ) );
        await oMSSql.poolClose();

        let allResults = oMSSql.getAllQueries( true );

        for( let i = 0, len = results.length; i < len; i++ ) {
            expect( results[ i ] ).toBe( allResults[ i ] );
        }

    } );
});