var expect = require('chai').expect;
var bcrypt = require('bcrypt');
const saltRounds = 12;
var MongoClient = require('mongodb');
var mongoose = require('mongoose');
const connectionStr = process.env.MONGO_URI;

mongoose.connect(connectionStr);
var Schema = mongoose.Schema;
var threadSchema = new Schema({
  board: {type: String, required: true},
  text: {type: String, required: true},
  delete_password: {type: String, required: true},
  created_on: Date,
  bumped_on: Date,
  reported: {type: Boolean, default: false},
  replies: []
});

//Pre-hook the model before it is saved to hash passwords
threadSchema.pre('save', function(next) {
  var threadUser = this;
  
  //Hash if password is new or has been modified
  if(!threadUser.isModified('delete_password')) return next();
  
  //Generate a salt round
  bcrypt.genSalt(saltRounds, function(err, salt) {
    if(err) return next(err);
    
    //Hash password using this salt round
    bcrypt.hash(threadUser.delete_password, salt, function(err, hash) {
      if(err) return next(err);
      
      //Replace cleartext password with this salt round hash
      threadUser.delete_password = hash;
      next();
    });
  });
});

var Thread = mongoose.model('Thread', threadSchema);

//ThreadHandler constructor
function ThreadHandler() {
  
  //List threads on a board via a GET method
  this.threadList = function(req, res) {
    
    var board = req.params.board;
    
    //Find all records for a selected board
    Thread.find({}, function(err, docs) {
      if(err) {
        console.log('Database error: ' + err);
      }
      else {
        
        //Trim returned results
        var resultArr = [];
        docs.forEach((item) => {
          var replyCount = item.replies.length;
          
          //Trim reported status and password from reply results
          item.replies.forEach((reply) => {
            delete reply.reported;
            delete reply.delete_password;
          });
          var itemObj = {_id: item._id, text: item.text, created_on: item.created_on, bumped_on: item.bumped_on, 
                         replies: item.replies, replycount: replyCount};
          
          //Trim replies if there are more than 3
          if(itemObj.replyCount > 3) {
            itemObj.replies = itemObj.replies.slice(-3);
          }
          resultArr.push(itemObj);
        });
        
        //Render json api
        res.json(resultArr);
      }
    })
      .where('board').equals(board)
      .limit(10)
      .sort({bumped_on: -1});
  }
  
  //Create a new thread via a POST method
  this.newThread = function(req, res) {
    var board = req.params.board;
    var text = req.body.text;
    var password = req.body.delete_password;
    
    //Ensure a board parameter was entered else return error
    if(!board) {
      res.send('Please enter a board name to post to');
    }
    //Save user entered data
    else if(board && text && password) {
      var  thread = new Thread({
        board: board,
        text: req.body.text,
        delete_password: password,
        created_on: new Date(),
        bumped_on: new Date(),
        reported: false,
        replies: []
      });
      thread.save(function(err, doc) {
        if(err) {
          console.log('Database error: ' + err);
        }
        else {
          //Redirect to the board url
          res.redirect('/b/' + board + '/');
        }
      });
    }
    //Ensure all fields have been filled in by the user
    else {
      res.send('Please enter text into the board, text, and password fields');
    }
  }
  
  //Allow users to report a bad thread
  this.reportThread = function(req, res) {
    var board = req.params.board;
    var _id = req.body.thread_id || req.body.report_id;
    
    //Ensure a user entered information into all fields
    if(!board && !_id) {
      res.send('Please make an entry into all fields before submitting');
    }
    else {
      //Find record based on the id and change the reported to true
      Thread.findByIdAndUpdate({_id: _id}, {$set: {reported: true}}, function(err, doc) {
        if(err) {
          console.log('Database error: ' + err);
        }
        else {
          res.send('success');
        }
      })
      .where('board').equals(board);
    }
  }
  
  //Allows user to delete their own thread
  this.deleteThread = function(req, res) {
    var board = req.params.board;
    var password = req.body.delete_password;
    
    //Ensure user has entered information into all fields
    if(!req.body.board && !req.body.thread_id && !password) {
      res.send('Please make an entry into all fields before submitting');
    }
    else {
      
      //Search for matching id in the database
      Thread.findOne({_id: req.body.thread_id}, function(err, docs) {
        if(err) {
          console.log('Database error: ' + err);
        }
        else {
          
          //Decrypt the password in the database and match it against the inputted password
          bcrypt.compare(password, docs.delete_password, function(err, result) {
            if(err) {
              console.log('Decryption error');
            }
            if(result === false) {
              res.send('incorrect password');
            }
            else {
              
              //Delete the matching thread from the database
              Thread.deleteOne({_id: req.body.thread_id}, function(err) {
                if(err) {
                  console.log('Database error: ' + err);
                }
                else {
                  res.send('success');
                }
              });
            }
          });
        }
      });
    }
  }
}

module.exports = ThreadHandler;