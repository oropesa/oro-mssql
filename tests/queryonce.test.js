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
        `CREATE TABLE test_once (
                    id INT NOT NULL IDENTITY PRIMARY KEY,
                    name VARCHAR (16) NOT NULL,
                CONSTRAINT unique_test_once_name UNIQUE ( name ) )` );
    await oMSSql.query( `INSERT INTO test_once ( name ) VALUES ( 'chacho' )` );

    await oMSSql.poolClose();
});

afterAll(async () => {
    let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
    let oMSSql = new OMSSql( { settings } );
    await oMSSql.poolOpen();

    await oMSSql.query( "DROP TABLE test_once" );

    await oMSSql.poolClose();
});

describe('queryOnce SELECT', () => {
    test( 'queryOnce SELECT bad settings', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssqll' } );
        const oMSSql = new OMSSql( { settings } );

        let response = await oMSSql.queryOnce( `SELECT * FROM test_once`, 'row' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toBe( `ConnectionError: Login failed for user 'sa'.` );
    } );

    test( 'queryOnce SELECT bad query', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        let response = await oMSSql.queryOnce( `SELECT * FROMM test_once`, 'row' );

        expect( response.status ).toBe( false );
        expect( response.error.msg ).toMatch( /(RequestError: Incorrect syntax near )/ );
    } );

    test( 'queryOnce SELECT query ok', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test_oromssql' } );
        const oMSSql = new OMSSql( { settings } );

        let response = await oMSSql.queryOnce( `SELECT * FROM test_once`, 'row' );

        expect( response.status ).toBe( true );
        expect( response.result ).toEqual( { id: 1, name: 'chacho' } );
    } );
});