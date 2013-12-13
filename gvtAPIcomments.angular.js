angular.module('gvtAPIcomments', ['ngCookies','ngAnimate','angular-md5','ngAnimate-animate.css', 'btford.markdown']).
    factory('gravatarFactory', ['md5', function(md5){
        var interfce = {};

        interfce.getGravatar = function(email) {
            var emailHash = md5.createHash(email.toLowerCase());
            return 'http://www.gravatar.com/avatar/'+emailHash+'?s=80&d=retro';
        }

        return interfce;
    }]).
    factory('commentDB', ['$http', '$location', function($http, $location){
        var interfce = {};

        var path = (window.location.pathname != '/') ? window.location.pathname : '/index.html';

        interfce.getCommentList = function() {
            return $http.get('/node/comment?p=' + path);
        }

        interfce.getComment = function(id) {
            return $http.get('/node/comment/' + id + '?p=' + path);
        }

        interfce.updateComment = function(comment) {
            return $http.post('/node/comment/' + comment._id + '/update?p=' + path, comment);
        }

        interfce.insertComment = function(comment) {
            return $http.post('/node/comment/new?p=' + path, comment);
        }

        interfce.removeComment = function(comment) {
            return $http.post('/node/comment/' + comment._id + '/delete?p=' + path, comment);
        }

        interfce.insertReply = function(comment, reply) {
            return $http.post('/node/comment/' + comment._id + '/reply/add?p=' + path, reply);
        }

        interfce.editReply = function(comment, reply) {
            return $http.post('/node/comment/' + comment._id + '/reply/' + reply._id + '/edit?p=' + path, reply);
        }

        interfce.deleteReply = function(comment, reply) {
            return $http.post('/node/comment/' + comment._id + '/reply/' + reply._id + '/delete?p=' + path, reply);
        }

        return interfce;
    }]).
    controller('commentListController', ['$scope', '$cookieStore', '$filter', 'gravatarFactory', 'commentDB', function($scope, $cookieStore, $filter, gravatarFactory, commentDB){
        $scope.user = ( $cookieStore.get('commentUser') ) ? $cookieStore.get('commentUser') : { name : '', email : '', avatar : '' };
        $scope.loggedIn = ($scope.user.email.length > 0);
        $scope.commentList = [];
        $scope.editMode = false;

        $scope.commentsEnabled = (window.location.pathname != '/search.php');

        $scope.logIn = function() {
            $cookieStore.put('commentUser', $scope.user);
            $scope.loggedIn = true;
        }

        function newCommentFactory() {
            return { author : $scope.user, title : '', body : '', mode : 'view', replies : [] };
        }

        ;
        $scope.newComment = newCommentFactory();

        commentDB.getCommentList().success(function(data){
            $scope.commentList = data;
        });

        $scope.formatDate = function(theDate) {
            return $filter('date')(theDate, 'MMM d, y h:mm a');
        }

        $scope.addComment = function() {
            $scope.newComment.postDate = new Date();
            $scope.newComment.title = $scope.newComment.body.substring(0, 30) + '...';
            $scope.newComment.author.email = ($scope.newComment.author.email) ? $scope.newComment.author.email : 'invalidEmail';
            $scope.newComment.author.avatar = gravatarFactory.getGravatar($scope.newComment.author.email);
            if(!$scope.loggedIn) { $scope.logIn(); }
            $scope.commentList.unshift($scope.newComment);
            commentDB.insertComment($scope.newComment);
            $scope.newComment = newCommentFactory();
        };

        $scope.canEdit = function(comment) {
            return ($scope.loggedIn && comment.author.email == $scope.user.email);
        };

        $scope.toggleEditComment = function(comment) {
            if(!$scope.editMode) {
                comment.mode="edit";
                $scope.editMode = true;
            }
        };

        $scope.editComment = function(editedComment) {
            if($scope.editMode) {
                editedComment.editDate = new Date();
                editedComment.mode="view";
                $scope.editMode = false;
                commentDB.updateComment(editedComment);
            }
        };

        $scope.deleteComment = function(deletedComment) {
            if(!$scope.editMode) {
                var deletedPosition = $scope.commentList.indexOf(deletedComment);
                if(deletedPosition > -1) {
                    $scope.commentList.splice(deletedPosition, 1);
                    commentDB.removeComment(deletedComment);
                }
            }
        };

        //Reply functions
        //@TODO: toggleEditReply, editReply, deleteReply
        $scope.toggleAddReply = function(comment) {
            if(typeof comment.replies == 'undefined') { comment.replies = []; }
            var newReply = newCommentFactory();
            newReply.mode = 'new';
            // An always increasing auto-incrementing id.
            newReply._id = (comment.replies.length > 0) ? (comment.replies[(comment.replies.length - 1)]._id + 1) : 0;
            comment.replies.push(newReply);
        };

        $scope.addReply = function(comment, reply) {
            reply.postDate = new Date();
            reply.title = reply.body.substring(0, 30) + '...';
            reply.author.avatar = gravatarFactory.getGravatar($scope.newComment.author.email);
            if(!$scope.loggedIn) { $scope.logIn(); }
            reply.mode = 'view';
            commentDB.insertReply(comment, reply);
        };

        $scope.toggleEditReply = function(reply) {
            if(!$scope.editMode) {
                reply.mode = 'edit';
                $scope.editMode = true;
            }
        };

        $scope.editReply = function(comment, reply) {
            if($scope.editMode) {
                reply.editDate = new Date();
                reply.mode="view";
                $scope.editMode = false;
                commentDB.editReply(comment, reply);
            }
        };

        $scope.deleteReply = function(comment, reply) {
            if(!$scope.editMode) {
                var deletedPosition = comment.replies.indexOf(reply);
                if(deletedPosition > -1) {
                    comment.replies.splice(deletedPosition, 1);
                    commentDB.deleteReply(comment, reply);
                }
            }
        };

    }]);