/* eslint-disable no-unused-expressions */
const nock = require('nock');
const chai = require('chai');

const UserModel = require('plugins/sd-ct-oauth-plugin/models/user.model');

const { getTestAgent, closeTestAgent } = require('./../test-server');
const { TOKENS } = require('./../test.constants');

const should = chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('List users', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestAgent();

        UserModel.deleteMany({}).exec();

        nock.cleanAll();
    });

    it('Visiting /auth/user while not logged in should return a 401 error', async () => {
        const response = await requester
            .get(`/auth/user`)
            .set('Content-Type', 'application/json');

        response.status.should.equal(401);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not authenticated`);

    });

    it('Visiting /auth/user while logged in as USER should return a 403 error', async () => {
        const response = await requester
            .get(`/auth/user`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.USER}`);

        response.status.should.equal(403);
        response.header['content-type'].should.equal('application/json; charset=utf-8');
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Visiting /auth/user while logged in as MANAGER should return a 403 error', async () => {
        const response = await requester
            .get(`/auth/user`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.MANAGER}`);

        response.status.should.equal(403);
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Visiting /auth/user while logged in as ADMIN should return the list of users - no users for empty database', async () => {
        const response = await requester
            .get(`/auth/user`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        response.status.should.equal(200);
        response.body.should.be.an('array').and.length(0);
    });

    it('Visiting /auth/user while logged in as ADMIN should return the list of users - no users if non match the current user\'s apps', async () => {
        await new UserModel({
            __v: 0,
            email: 'test@example.com',
            password: '$2b$10$1wDgP5YCStyvZndwDu2GwuC6Ie9wj7yRZ3BNaaI.p9JqV8CnetdPK',
            salt: '$2b$10$1wDgP5YCStyvZndwDu2Gwu',
            extraUserData: {
                apps: ['fake-app']
            },
            _id: '5becfa2b67da0d3ec07a27f6',
            createdAt: '2018-11-15T04:46:35.313Z',
            role: 'USER',
            provider: 'local'
        }).save();

        const response = await requester
            .get(`/auth/user`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        response.status.should.equal(200);
        response.body.should.be.an('array').and.length(0);
    });

    it('Visiting /auth/user while logged in as ADMIN should return the list of users - only return users that match current user\'s app', async () => {
        await new UserModel({
            __v: 0,
            name: 'user one',
            email: 'rw-user-one@example.com',
            password: '$2b$10$1wDgP5YCStyvZndwDu2GwuC6Ie9wj7yRZ3BNaaI.p9JqV8CnetdPK',
            salt: '$2b$10$1wDgP5YCStyvZndwDu2Gwu',
            extraUserData: {
                apps: ['rw']
            },
            _id: '5decfa2b67da0d3ec07a27f6',
            createdAt: '2018-11-15T04:46:35.313Z',
            role: 'USER',
            provider: 'local'
        }).save();

        await new UserModel({
            __v: 0,
            name: 'user two',
            email: 'rw-user-two@example.com',
            password: '$2b$10$1wDgP5YCStyvZndwDu2GwuC6Ie9wj7yRZ3BNaaI.p9JqV8CnetdPK',
            salt: '$2b$10$1wDgP5YCStyvZndwDu2Gwu',
            extraUserData: {
                apps: ['rw']
            },
            _id: '5decfa2b67d50d3ec07a27f6',
            createdAt: '2018-11-15T04:46:35.313Z',
            role: 'MANAGER',
            provider: 'google'
        }).save();

        const response = await requester
            .get(`/auth/user`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        response.status.should.equal(200);
        response.body.should.be.an('array').and.length(2);
        response.body.map((e) => e.email).should.include('rw-user-two@example.com').and.to.include('rw-user-one@example.com');

    });

    it('Visiting /auth/user while logged in as ADMIN should return the list of users - filter by email address is supported', async () => {
        const response = await requester
            .get(`/auth/user?email=rw-user-two@example.com`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        response.status.should.equal(200);
        response.body.should.be.an('array').and.length(1);
        response.body.map((e) => e.email).should.include('rw-user-two@example.com');

    });

    it('Visiting /auth/user while logged in as ADMIN should return the list of users - filter by provider is supported', async () => {
        const responseOne = await requester
            .get(`/auth/user?provider=local`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        responseOne.status.should.equal(200);
        responseOne.body.should.be.an('array').and.length(1);
        responseOne.body.map((e) => e.email).should.include('rw-user-one@example.com');

        const responseTwo = await requester
            .get(`/auth/user?provider=google`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        responseTwo.status.should.equal(200);
        responseTwo.body.should.be.an('array').and.length(1);
        responseTwo.body.map((e) => e.email).should.include('rw-user-two@example.com');

    });

    it('Visiting /auth/user while logged in as ADMIN should return the list of users - filter by name is supported', async () => {
        const responseOne = await requester
            .get(`/auth/user?name=user one`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        responseOne.status.should.equal(200);
        responseOne.body.should.be.an('array').and.length(1);
        responseOne.body.map((e) => e.email).should.include('rw-user-one@example.com');

        const responseTwo = await requester
            .get(`/auth/user?name=user two`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        responseTwo.status.should.equal(200);
        responseTwo.body.should.be.an('array').and.length(1);
        responseTwo.body.map((e) => e.email).should.include('rw-user-two@example.com');

    });

    it('Visiting /auth/user while logged in as ADMIN should return the list of users - filter by role is supported', async () => {
        const responseOne = await requester
            .get(`/auth/user?role=USER`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        responseOne.status.should.equal(200);
        responseOne.body.should.be.an('array').and.length(1);
        responseOne.body.map((e) => e.email).should.include('rw-user-one@example.com');

        const responseTwo = await requester
            .get(`/auth/user?role=MANAGER`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        responseTwo.status.should.equal(200);
        responseTwo.body.should.be.an('array').and.length(1);
        responseTwo.body.map((e) => e.email).should.include('rw-user-two@example.com');

        const responseThree = await requester
            .get(`/auth/user?role=ADMIN`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        responseThree.status.should.equal(200);
        responseThree.body.should.be.an('array').and.length(0);

    });

    it('Visiting /auth/user while logged in as ADMIN should return the list of users - filter by password not supported', async () => {
        const response = await requester
            .get(`/auth/user?password=%242b%2410%241wDgP5YCStyvZndwDu2GwuC6Ie9wj7yRZ3BNaaI.p9JqV8CnetdPK`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        response.status.should.equal(200);
        response.body.should.be.an('array').and.length(2);
        response.body.map((e) => e.email).should.include('rw-user-two@example.com').and.to.include('rw-user-one@example.com');
    });

    it('Visiting /auth/user while logged in as ADMIN and query app=all should return the list of users - even if apps of users are not match to current user\'s app', async () => {
        await new UserModel({
            __v: 0,
            name: 'user three',
            email: 'rw-user-three@example.com',
            password: '$2b$10$1wDgP5YCStyvZnfwDu2GwuC6Ie9wj7yRZ3BNaaI.p9JqV8CnetdPK',
            salt: '$2b$10$1wDgP5YCStyvZndwDu2Gwu',
            extraUserData: {
                apps: ['rw']
            },
            _id: '5decfa2b67da0d3ec07a27f2',
            createdAt: '2018-11-15T04:46:35.313Z',
            role: 'USER',
            provider: 'test'
        }).save();

        await new UserModel({
            __v: 0,
            name: 'user four',
            email: 'rw-user-four@example.com',
            password: '$2b$10$1wDgP5YCStyvZnddDu2GwuC6Ie9wj7yRZ3BNaaI.p9JqV8CnetdPK',
            salt: '$2b$10$1wDgP5YCStyvZndwDu2Gwu',
            extraUserData: {
                apps: ['fake-app-2']
            },
            _id: '5decfa2b67d50d3ec07a27f4',
            createdAt: '2018-11-15T04:46:35.313Z',
            role: 'MANAGER',
            provider: 'test3'
        }).save();

        const response = await requester
            .get(`/auth/user?app=all`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send();

        response.status.should.equal(200);
        response.body.should.be.an('array').and.length(5);
        response.body.map((e) => e.email).should.include('rw-user-two@example.com').and.to.include('rw-user-one@example.com');
    });

    it('Visiting /auth/user while logged in as ADMIN and filtering by app should return the list of users with apps which provided in the query app', async () => {
        const response = await requester
            .get(`/auth/user?app=fake-app,fake-app-2`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send();

        response.status.should.equal(200);
        response.body.should.be.an('array').and.length(2);
    });

    it('Visiting /auth/user while logged in as ADMIN and an invalid query param should return the list of users ignoring the invalid query param', async () => {
        const filteredResponse = await requester
            .get(`/auth/user?foo=bar`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send();

        const response = await requester
            .get(`/auth/user`)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`)
            .send();

        response.status.should.equal(200);
        response.body.should.deep.equal(filteredResponse.body);
    });

    after(async () => {
        UserModel.deleteMany({}).exec();

        closeTestAgent();
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
