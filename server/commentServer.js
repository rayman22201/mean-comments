/**
 * @file commentServer.js
 * Defines a Nodejs, Express, and TingoDB based server for storing comments.
 * The whole system is based on the MEAN stack, with the M being replaces with T.
 * TingoDB is an embedded version of MongoDB, just to keep things simple and fast to code.
 */

//Set up TingoDB
var Engine = require('tingodb')();
var db = new Engine.Db('./database/', {});

//Set up Express
var express = require('express');
var app = express();
// Only allow json in the POST body.
app.use(express.json());
// The port to use.
var port = 3000;

//Add crypto for hashing
var crypto = require('crypto');

//Give me promises
var promiscuous = require('promiscuous');

//Implement simple queue based lock
function lockFactory() {
    var lock = { locked : false, lockQueue : [] };
    var lockInterfce = {};
    lockInterfce.getLock = function() {
        var lockDefer = promiscuous.deferred();
        if(!this.locked) {
            lock.locked = true;
            lockDefer.resolve(true);
        } else {
            lock.lockQueue.push(lockDefer);
        }
        return lockDefer.promise;
    };

    lockInterfce.unlock = function() {
        lock.locked = false;
        // If there are other functions waiting to get the lock, pass the lock to the next person in line.
        if(lock.lockQueue.length > 0) {
            var nextDefer = lock.lockQueue.pop();
            lock.locked = true;
            nextDefer.resolve(true);
        }
    };

    return lockInterfce;
}

app.get('/', function(req, res){
  res.json({ name : 'GVT Comment Server', version : '0.1' });
});

app.get('/node/comment', function(req, res){
    if(typeof req.query.p != 'undefined') {
        var hash = crypto.createHash('md5').update(req.query.p).digest('hex');
        var collection = db.collection(hash);
        collection.find().sort({ _id : -1 }).toArray(function(err, items) {
            if(err) {
                console.log(err);
                res.json({'error' : err});
                return;
            }
            res.json(items);
        });
    } else {
        res.json([]);
    }
});

app.get('/node/comment/:id', function(req, res){
    if(typeof req.query.p != 'undefined') {
        var hash = crypto.createHash('md5').update(req.query.p).digest('hex');
        var collection = db.collection(hash);
        collection.findOne({ _id : req.params.id } , function(err, item) {
            if(err) {
                console.log(err);
                res.json({'error' : err});
                return;
            }
            res.json(item);
        });
    } else {
        res.json({});
    }
});

app.post('/node/comment/new', function(req, res){
    if(typeof req.query.p != 'undefined') {
        var hash = crypto.createHash('md5').update(req.query.p).digest('hex');
        var collection = db.collection(hash);
        collection.insert(req.body, {w:1}, function(err, result){
            if(err) {
                console.log(err);
                res.json({'error' : err});
            }
            res.json(result);
        });
    } else {
        res.json({});
    }
});

app.post('/node/comment/:id/update', function(req, res){
    if(typeof req.query.p != 'undefined') {
        var hash = crypto.createHash('md5').update(req.query.p).digest('hex');
        var collection = db.collection(hash);
        req.body._id = req.params.id;
        collection.save(req.body);
    } else {
        res.json({});
    }
});

app.post('/node/comment/:id/delete', function(req, res){
    if(typeof req.query.p != 'undefined') {
        var hash = crypto.createHash('md5').update(req.query.p).digest('hex');
        var collection = db.collection(hash);

        collection.findOne({ _id : req.params.id } , function(err, item) {
            if(err) {
                console.log(err);
                res.json({'error' : err});
                return;
            }
            res.json(item);
        });
        collection.remove({ _id : req.params.id });
    } else {
        res.json({});
    }
});

app.post('/node/comment/:commentID/reply/add', function(req, res){
    if(typeof req.query.p != 'undefined') {
        var hash = crypto.createHash('md5').update(req.query.p).digest('hex');
        var collection = db.collection(hash);
        collection.update({ _id : req.params.commentID }, {
            $push : { replies : req.body }
        });
    } else {
        res.json({});
    }
});

var editLock = lockFactory();
app.post('/node/comment/:commentID/reply/:replyID/edit', function(req, res){
    if(typeof req.query.p != 'undefined') {
        var hash = crypto.createHash('md5').update(req.query.p).digest('hex');
        var collection = db.collection(hash);

        // Make sure the operation is atomic using locking

        editLock.getLock().then(function(){
            collection.findOne({ _id : req.params.commentID }, function(err, comment){
                var editPosition = -1;
                for (var i = comment.replies.length - 1; i >= 0; i--) {
                    if( comment.replies[i]._id == req.params.replyID ) {
                        editPosition = i;
                        break;
                    }
                };
                if(editPosition > -1) {
                    comment.replies[editPosition] = req.body;
                    collection.update({ _id : req.params.commentID }, {
                        $set : { 'replies' : comment.replies }
                    });
                }
            });
            editLock.unlock();
        });
    } else {
        res.json({});
    }
});

var deleteLock = lockFactory();
app.post('/node/comment/:commentID/reply/:replyID/delete', function(req,res){
    if(typeof req.query.p != 'undefined') {
        var hash = crypto.createHash('md5').update(req.query.p).digest('hex');
        var collection = db.collection(hash);

        // Make this operation atomic by using locks. A better way is to use transactions, but that is complicated and I'm lazy.
        // @See: http://docs.mongodb.org/manual/tutorial/perform-two-phase-commits/

        deleteLock.getLock().then(function() {
            collection.findOne({ _id : req.params.commentID }, function(err, comment) {
                var deletedPosition = -1;
                for (var i = comment.replies.length - 1; i >= 0; i--) {
                    if( comment.replies[i]._id == req.params.replyID ) {
                        deletedPosition = i;
                        break;
                    }
                };
                if(deletedPosition > -1) {
                    comment.replies.splice(deletedPosition, 1);
                    collection.update({ _id : req.params.commentID }, {
                        $set : { 'replies' : comment.replies }
                    });
                }
            });
            deleteLock.unlock();
        });
    } else {
        res.json({});
    }
});

//Start listening
app.listen(port);
console.log('Listening on port ' + port);