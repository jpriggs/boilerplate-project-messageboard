/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  var testThreadId;
  var testThreadId2;
  var testReplyId;
  
  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() {
      
      test('Create 2 test threads', function(done) {
        chai.request(server)
        .post('/api/threads/fcc')
        .send({text: 'This is a test', delete_password: '1234'})
        .end(function(err, res) {
          assert.equal(res.status, 200);
        });
        chai.request(server)
        .post('/api/threads/fcc')
        .send({text: 'This is another test', delete_password: '2345'})
        .end(function(err, res) {
          assert.equal(res.status, 200);
          done();
        });
      });
    });
    
    suite('GET', function() {
      
      test('Get 10 most recent threads with the 3 most recent replies each', function(done) {
        chai.request(server)
        .get('/api/threads/fcc')
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isBelow(res.body.length, 11);
          assert.property(res.body[0], '_id');
          assert.property(res.body[0], 'created_on');
          assert.property(res.body[0], 'bumped_on');
          assert.property(res.body[0], 'text');
          assert.property(res.body[0], 'replies');
          assert.notProperty(res.body[0], 'reported');
          assert.notProperty(res.body[0], 'delete_password');
          assert.isArray(res.body[0].replies);
          assert.isBelow(res.body[0].replies.length, 4);
          testThreadId = res.body[1]._id;
          testThreadId2 = res.body[0]._id;
          done();
        });
      });
    });
    
    suite('DELETE', function() {
      
      test('Delete a thread with a correct password', function(done) {
        chai.request(server)
        .delete('/api/threads/fcc')
        .send({thread_id: testThreadId, delete_password: '1234'})
        .end(function(err, res) {
          assert.equal(res.status, 200);
          console.log('Response text: ' + res.text);
          assert.equal(res.text, 'success');
          done();
        });
      });
      
      test('Delete a thread with an incorrect password', function(done) {
        chai.request(server)
        .delete('/api/threads/fcc')
        .send({thread_id: testThreadId2, delete_password: 'hello'})
        .end(function(err, res) {
          assert.equal(res.status, 200);
          console.log('Response text: ' + res.text);
          assert.equal(res.text, 'incorrect password');
          done();
        });
      })
    });
    
    suite('PUT', function() {
      
      test('Report a thread', function(done) {
        chai.request(server)
        .put('/api/threads/fcc')
        .send({report_id: testThreadId2})
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        })
      })
    });
  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {
    
    suite('POST', function() {
      
      test('reply to thread', function(done) {
        chai.request(server)
        .post('/api/replies/fcc')
        .send({thread_id: testThreadId2, text:'Replying to a thread', delete_password:'1234'})
        .end(function(err, res){
          assert.equal(res.status, 200);
          done();
        });
      });
    });
    
    suite('GET', function() {
      
      test('Get all replies for 1 thread', function(done) {
        chai.request(server)
        .get('/api/replies/fcc')
        .query({thread_id: testThreadId2})
        .end(function(err, res){
          assert.equal(res.status, 200);
          assert.property(res.body, '_id');
          assert.property(res.body, 'created_on');
          assert.property(res.body, 'bumped_on');
          assert.property(res.body, 'text');
          assert.property(res.body, 'replies');
          assert.notProperty(res.body, 'delete_password');
          assert.notProperty(res.body, 'reported');
          assert.isArray(res.body.replies);
          assert.notProperty(res.body.replies[0], 'delete_password');
          assert.notProperty(res.body.replies[0], 'reported');
          assert.equal(res.body.replies[res.body.replies.length-1].text, 'Replying to a thread');
          testReplyId = res.body.replies[0]._id;
          done();
        });
      });
    });
    
    suite('PUT', function() {
      
      test('report reply', function(done) {
        chai.request(server)
        .put('/api/threads/fcc')
        .send({thread_id: testThreadId2 , reply_id: testReplyId})
        .end(function(err, res){
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
      });
    });
    
    suite('DELETE', function() {
      
      test('delete reply with valid password', function(done) {
        chai.request(server)
        .delete('/api/threads/fcc')
        .send({thread_id: testThreadId2, reply_id: testReplyId, delete_password: '1234'})
        .end(function(err, res){
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
      });
      
      test('delete reply with bad password', function(done) {
        chai.request(server)
        .delete('/api/threads/fcc')
        .send({thread_id: testThreadId2, reply_id: testReplyId, delete_password: 'hello'})
        .end(function(err, res){
          assert.equal(res.status, 200);
          assert.equal(res.text, 'incorrect password');
          done();
        });
      });
    });
  });
});
