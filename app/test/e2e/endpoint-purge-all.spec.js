const nock = require('nock');
const chai = require('chai');

const Microservice = require('models/microservice.model');
const Endpoint = require('models/endpoint.model');
const { TOKENS } = require('./test.constants');

const should = chai.should();

const { getTestAgent, closeTestAgent } = require('./test-server');

let requester;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);


describe('Endpoint purge all', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        if (!process.env.FASTLY_SERVICEID || !process.env.FASTLY_APIKEY) {
            throw Error(`You need to set a fake value for FASTLY_SERVICEID and FASTLY_APIKEY for this test to work.`);
        }

        requester = await getTestAgent();

        Microservice.deleteMany({}).exec();
        Endpoint.deleteMany({}).exec();

        nock.cleanAll();
    });

    it('Purging endpoints without being logged in should fail', async () => {
        const response = await requester.delete(`/api/v1/endpoint/purge-all`);

        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('status').and.equal(401);
        response.body.errors[0].should.have.property('detail').and.equal('Not authenticated');
    });

    it('Purging endpoints as USER should fail', async () => {
        const response = await requester.delete(`/api/v1/endpoint/purge-all`)
            .set('Authorization', `Bearer ${TOKENS.USER}`);

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].status.should.equal(403);
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Purging endpoints as MANAGER should fail', async () => {
        const response = await requester.delete(`/api/v1/endpoint/purge-all`)
            .set('Authorization', `Bearer ${TOKENS.MANAGER}`);

        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].status.should.equal(403);
        response.body.errors[0].should.have.property('detail').and.equal(`Not authorized`);
    });

    it('Purging endpoints as ADMIN should succeed (happy case)', async () => {
        nock('https://api.fastly.com')
            .post(`/service/${process.env.FASTLY_SERVICEID}/purge_all`)
            .reply(200, { status: 'ok' });

        const response = await requester.delete(`/api/v1/endpoint/purge-all`)
            .set('Authorization', `Bearer ${TOKENS.ADMIN}`);

        response.status.should.equal(200);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
        Microservice.deleteMany({}).exec();
        Endpoint.deleteMany({}).exec();

        closeTestAgent();
    });
});
