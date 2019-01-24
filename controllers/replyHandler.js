var bcrypt = require('bcrypt');
const saltRounds = 12;
var MongoClient = require('mongodb');
var threadHandler = require('./threadHandler.js');
var mongoose = require('mongoose');
var Thread = mongoose.model('Thread');
const connectionStr = process.env.MONGO_URI;
mongoose.connect(connectionStr);

function ReplyHandler() {
  
  this.replyList = function(req, res) {
    var board = req.params.board;
    var _id = req.query.thread_id;
    
    //Find selected thread id
    Thread.find({_id: _id}, function(err, docs) {
      if(err) {
        console.log('Database error: ' + err);
      }
      else {
        
        //Trim selected record of passwords and reported status
        var repliesArr = docs[0].replies;
        var resultArr = [];
        repliesArr.forEach((item) => {
          var itemObj = {_id: item._id, text: item.text, created_on: item.created_on};
          resultArr.push(itemObj);
        });
        
        //Return results as a json api
        res.json({_id: docs[0]._id, text: docs[0].text, created_on: docs[0].created_on, bumped_on: docs[0].bumped_on, replies: resultArr});
      }
    });
  }
  
  this.newReply = function(req, res) {
    var board = req.params.board;
    var threadId = req.body.thread_id;
    var text = req.body.text;
    var ObjectId = mongoose.Types.ObjectId;
    var password = req.body.delete_password;
    
    //Ensure a board name was entered
    if(!board) {
      res.send('Please enter a board name to reply to');
    }
    
    //Process input if all fields are entered into
    else if(board && text && password) {
      
      //Encrypt password
      bcrypt.hash(password, saltRounds, function(err, hash) {
        var reply = {
          _id: new ObjectId(),
          text: text,
          created_on: new Date(),
          reported: false,
          delete_password: hash
        }
        
        //Update the selected thread with a reply object and a current bumped_on date
        Thread.findByIdAndUpdate({_id: threadId}, {$push: {replies: reply}, $set: {bumped_on: new Date()}}, function(err, docs) {
          if(err) {
            console.log('Database error: ' + err);
          }
          else {
            //Render board page with new reply
            res.redirect('/b/' + board + '/' + docs._id);
          }
        });
      });
    }
    //Send error if all fields haven't been entered into
    else {
      res.send('Please enter text into the board, text, and password fields');
    }
  }
  
  this.reportReply = function(req, res) {
    var board = req.params.board;
    var threadId = req.body.thread_id;
    var replyId = req.body.reply_id;

    //Ensure user has made an entry in all fields
    if(!board && !threadId && !replyId) {
      res.send('Please make an entry into all fields before submitting');
    }
    else {
      
      //Find selected record based on the thread id
      Thread.findById({_id: threadId}, function(err, docs) {
        if(err) {
          console.log('Database error: ' + err);
        }
        else {
          
          //Check each reply for a matching reply id
          docs.replies.forEach((item) => {
            if(item._id == replyId) {
              item.reported = true;
            }
          });
          
          //Track change so record is modified
          docs.markModified('replies');
          
          //Update record with change
          docs.save(function(error, document) {
            if(error) {
              console.log('Database error: ' + error);
            }
            else {
              
              //Send confirmation of record update
              res.send('success');
            }
          })
        }
      });
    }
  }
  
  this.deleteReply = function(req, res) {
    var board = req.params.board;
    var threadId = req.body.thread_id;
    var replyId = req.body.reply_id;
    var password = req.body.delete_password;
    
    //Ensure user has made an entry in all fields
    if(!board && !threadId && !replyId && !password) {
      res.send('Please make an entry into all fields');
    }
    else {
      
      //Find selected record based on the thread id
      Thread.findById({_id: threadId}, function(err, docs) {
        if(err) {
          console.log('Database error: ' + err);
        }
        else {
          
          //Check each reply for a matching reply id
          var thisIndex = 0;
          docs.replies.forEach((item) => {
            if(item._id == replyId) {
              //Ensure plain text password matched encrypted password in the database
              bcrypt.compare(password, item.delete_password, function(error, result) {
                if(error) {
                  console.log('Password decryption error: ' + error);
                }
                if(result == false) {
                  console.log('Result: ' + result);
                  res.send('incorrect password');
                }
                else {
                  
                  //Remove matching array element
                  docs.replies.splice(thisIndex, 1);
                  
                  //Track change so record is modified
                  docs.markModified('replies');
                  
                  //Update record with change
                  docs.save(function(e, document) {
                    if(e) {
                      console.log('Database error: ' + e);
                    }
                    else {
                      
                      //Send confirmation of record update reflecting reply delete
                      res.send('success');
                    }
                  });
                }
              });
            }
            else {
              
              //Increment the index number
              thisIndex++;
            }
          });
        }
      });
    }
  }
}

module.exports = ReplyHandler;