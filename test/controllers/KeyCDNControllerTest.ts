/// <reference path="../../typings/index.d.ts" />
// tslint:disable-next-line:no-var-requires
const Lab = require('lab');
export const lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const beforeEach = lab.beforeEach;

import * as request from 'supertest';
import * as nock from 'nock';

import { server } from '../../src/darkstar';

describe('/v1/caches/keycdn', () => {
  let keycdnAPIMock: nock.Scope;

  beforeEach( (done: Function) => {
    keycdnAPIMock = nock('https://api.keycdn.com');
    done();
  });

  describe('/zones', () => {
    describe('DELETE', () => {
      let flushRequest: request.Test;
      let keycdnFlushMock: nock.Scope;

      beforeEach( (done: Function) => {
        flushRequest = request(server.listener)
          .delete('/v1/caches/keycdn/zones/1')
          .set('accept', 'application/json');
        keycdnFlushMock = keycdnAPIMock
          .get('/zones/purge/1.json');
        done();
      });

      it('should flush a complete zone of KeyCDN', (done: Function) => {
        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(200, { status: 'success', description: 'Cache has been cleared for zone 1.' });

        flushRequest.send({ authorizationToken: 'sk_prod_XXX' })
          .expect('content-type', /application\/json/)
          .expect(200)
          .expect({
            remoteStatusCode: 200,
            remoteResponse: { status: 'success', description: 'Cache has been cleared for zone 1.' },
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            done(error);
          });
      });

      it('should reply "Bad request" when invalid payload is sent', (done: Function) => {
        keycdnFlushMock.times(0);

        flushRequest.send({})
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'child "authorizationToken" fails because ["authorizationToken" is required]',
            validation: { source: 'payload', keys: [ 'authorizationToken' ] },
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            done(error);
          });
      });

      it('should reply bad request when receiving KeyCDN client errors', (done: Function) => {
        const keycdnError = {
          description: 'Unauthorized',
          status: 'error',
        };

        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(401, keycdnError);

        flushRequest.send({ authorizationToken: 'sk_prod_XXX' })
          .expect('content-type', /application\/json/)
          .expect(400)
          .expect({
            message: 'A remote error occurred',
            remoteStatusCode: 401,
            remoteResponse: keycdnError,
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            done(error);
          });
      });

      it('should reply bad gateway when receiving KeyCDN server errors', (done: Function) => {
        const keycdnError = {
          description: 'Internal Server Error',
          status: 'error',
        };

        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .reply(500, keycdnError);

        flushRequest.send({ authorizationToken: 'sk_prod_XXX' })
          .expect('content-type', /application\/json/)
          .expect(502)
          .expect({
            message: 'A remote error occurred',
            remoteStatusCode: 500,
            remoteResponse: keycdnError,
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            done(error);
          });
      });

      it('should reply bad gateway when an error occurred while accessing KeyCDN API', (done: Function) => {
        keycdnFlushMock
          .matchHeader('accept', 'application/json')
          .matchHeader('authorization', `Basic ${new Buffer('sk_prod_XXX:').toString('base64')}`)
          .replyWithError('connection error');

        flushRequest.send({ authorizationToken: 'sk_prod_XXX' })
          .expect('content-type', /application\/json/)
          .expect(502)
          .expect({
            message: 'An error occurred while accessing keycdn API: connection error',
          })
          .end((error: any, response: request.Response) => {
            keycdnAPIMock.done();
            done(error);
          });
      });
    });
  });
});
