/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var ReplyHandler = require('../controllers/replyHandler.js');
var ThreadHandler = require('../controllers/threadHandler.js');

var replyHandler = new ReplyHandler();
var threadHandler = new ThreadHandler();

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .get(threadHandler.threadList)
    .post(threadHandler.newThread)  
    .put(threadHandler.reportThread)
    .delete(threadHandler.deleteThread);
  
  app.route('/api/replies/:board')
    .get(replyHandler.replyList)
    .post(replyHandler.newReply)
    .put(replyHandler.reportReply)
    .delete(replyHandler.deleteReply);
};
