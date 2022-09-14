const Ofn = require( 'oro-functions' );
const { OMSSql } = require( '../index' );

//

const CONFIG_BAD = { host: 'chacho', database: 'chacho', user: 'chacho', password: 'loco' };
const CONFIG_BAD2 = { database: 'chacho', user: 'chacho', password: 'loco' };
const CONFIG_BAD3 = { database: 'chacho', user: 'chacho', password: 'loco', trustServerCertificate: true };
const CONFIG = Ofn.getFileJsonRecursivelySync( `${__dirname}/config.json` );

//

describe('get OMSSql defaults', () => {
    test( 'get client is mssql', async () => {
        const oMSSql = new OMSSql( { settings: CONFIG } );

        let client = oMSSql.getClient();
        expect( Ofn.isObject( client ) ).toBe( true );
        expect( Ofn.type( client.ConnectionPool, true ) ).toBe( 'class' );
        expect( Ofn.type( client.Transaction, true ) ).toBe( 'class' );
        expect( Ofn.type( client.Request, true ) ).toBe( 'class' );
        expect( Ofn.type( client.PreparedStatement, true ) ).toBe( 'class' );
    } );

    test( 'get db con', async () => {
        const oMSSql = new OMSSql( { settings: CONFIG } );

        const poolOpen = await oMSSql.poolOpen();
        const db = oMSSql.getDB();
        await oMSSql.poolClose();

        expect( poolOpen.status ).toBe( true );
        expect( Ofn.type( db, true ) ).toBe( 'ConnectionPool' );
    } );

    test( 'get default settings', async () => {
        const oMSSql = new OMSSql();

        expect( oMSSql.getInfo() ).toEqual( {
            server: 'localhost',
            port: 1433,
            database: null,
            user: 'sa',
            password: '',
            arrayRowMode: true
        } );
    } );

    test( 'get info', async () => {
        let settings = Object.assign( {}, CONFIG, { database: 'test', password: 'chacho' } );
        const oMSSql = new OMSSql( { settings } );

        expect( oMSSql.getInfo() ).toEqual( {
            server: 'localhost',
            port: 1433,
            database: 'test',
            user: 'sa',
            password: '******',
            arrayRowMode: true,
            options: { trustServerCertificate: true }
        } );
    } );

    test( 'get default status', async () => {
        const oMSSql = new OMSSql();

        expect( oMSSql.status ).toBe( false );
        expect( oMSSql.getStatus() ).toEqual( { status: false, error: { msg: 'Not connected yet.' } } );
    } );

    test( 'get status dis/connected', async () => {
        const oMSSql = new OMSSql( { settings: CONFIG } );

        await oMSSql.poolOpen();

        let status = oMSSql.status;
        let objStatus = oMSSql.getStatus();

        await oMSSql.poolClose();

        expect( status ).toBe( true );
        expect( objStatus ).toEqual( { status: true, msg: 'Connected successfully.' } );

        expect( oMSSql.status ).toBe( false );
        expect( oMSSql.getStatus() ).toEqual( { status: false, error: { msg: 'Disconnected successfully.' } } );
    } );
});

describe('init Bad OMSSql', () => {
    test( 'new OMSSql( bad-config )', async () => {
        const oMSSql = new OMSSql( { settings: CONFIG_BAD } );

        const responseOpen = await oMSSql.poolOpen();

        expect( responseOpen.status ).toBe( false );
        expect( responseOpen.error.msg ).toBe( 'ConnectionError: Failed to connect to chacho:1433 - getaddrinfo ENOTFOUND chacho' );
    } );

    test( 'new OMSSql( bad-config2 )', async () => {
        const oMSSql = new OMSSql( { settings: CONFIG_BAD2 } );

        const responseOpen = await oMSSql.poolOpen();

        expect( responseOpen.status ).toBe( false );
        expect( responseOpen.error.msg ).toBe( "ConnectionError: Failed to connect to localhost:1433 - self signed certificate" );
    } );

    test( 'new OMSSql( bad-config3 )', async () => {
        const oMSSql = new OMSSql( { settings: CONFIG_BAD3 } );

        const responseOpen = await oMSSql.poolOpen();

        expect( responseOpen.status ).toBe( false );
        expect( responseOpen.error.msg ).toBe( "ConnectionError: Login failed for user 'chacho'." );
    } );

    test( 'new OMSSql( timeout-config )', async () => {
        const customConfig = Object.assign( { connectionTimeout: 1 }, CONFIG );
        const oMSSql = new OMSSql( { settings: customConfig } );

        const responseOpen = await oMSSql.poolOpen();

        expect( responseOpen.status ).toBe( false );
        expect( responseOpen.error.msg ).toBe( `ConnectionError: Failed to connect to localhost:1433 in 1ms` );
    } );
});

describe('init OMSSql', () => {
    test( 'new OMSSql( config )', async () => {
        const oMSSql = new OMSSql( { settings: CONFIG } );

        const responseOpen = await oMSSql.poolOpen();
        const responseClose = await oMSSql.poolClose();

        expect( responseOpen.status ).toBe( true );
        expect( responseOpen.msg ).toBe( 'Connected successfully.' );
        expect( responseClose.status ).toBe( true );
        expect( responseClose.msg ).toBe( 'Disconnected successfully.' );
    } );

    test( 'close without being opened', async () => {
        const oMSSql = new OMSSql( { settings: CONFIG } );

        const responseClose = await oMSSql.poolClose();

        expect( responseClose.status ).toBe( true );
        expect( responseClose.msg ).toBe( 'Is already disconnected.' );
    } );

    test( 'open one close twice', async () => {
        const oMSSql = new OMSSql( { settings: CONFIG } );

        const responseOpen = await oMSSql.poolOpen();
        const responseClose = await oMSSql.poolClose();
        const responseClose2 = await oMSSql.poolClose();

        expect( responseClose2.status ).toBe( true );
        expect( responseClose2.msg ).toBe( 'Is already disconnected.' );
    } );

    test( 'open twice', async () => {
        const oMSSql = new OMSSql( { settings: CONFIG } );

        const responseOpen = await oMSSql.poolOpen();
        const responseOpen2 = await oMSSql.poolOpen();
        const responseClose = await oMSSql.poolClose();

        expect( responseOpen2.status ).toBe( true );
        expect( responseOpen2.msg ).toBe( 'Connected successfully.' );
    } );
});