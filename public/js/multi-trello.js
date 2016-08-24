  $(function() {
    // trello object should already be created
    if (Trello){
    
      var allLists = [];
      var allUsers = [];
      var myId = false;
      
      // clear all the cards and repull them
      $('#listname').change(function(){
        $('#output').empty();
        getAllBoards();
      });

      $('#username').change(function(){
        $('#output').empty();
        getAllBoards();
      });

      var getListId = function(board){
        var listName = $('#listname').val();
        var l=board.lists.length;
        for (var i = 0; i < l; i++) { 
          if (board.lists[i].name == listName){
            return board.lists[i].id;
          }
        }
        return false;
      }

      var getUserId = function(){
        var val = $('#username').val();
        return (val != null) ? val : 'me';
      }
      
      // print out a list of all my boards with a list named 'In Progress'
      var getAllBoards = function(){
        $('#message').html('Loading boards...');
          allLists = [];
          var userId = getUserId();
          if (userId == 0) { userId = 'me'; }
          console.log('get all boards for ' + userId);
          var params = { fields:'name,desc,url,closed,memberships', lists:'open', list_fields:'name'  };
          Trello.get("members/"+userId+"/boards", params, function(items) {
            var $li, $a;
            $.each(items, function(ix, item) {
              // only show open ones
              // make sure it has an 'in progress list'
              if (!item.closed){
                var listId = getListId(item);
                console.log('board',listId,item);
                if (listId){
                  allLists.push(listId);
                  var template = $('#boardTemplate').html();
                  Mustache.parse(template);   // optional, speeds up future uses
                  var rendered = Mustache.render(template, { boardurl: item.url, board: item, listId: listId, listStatus: 'In Progress' });
                  $('#output').append(rendered);
                  //console.log('board',item);
                  // add the users
                  $.each(item.memberships, function(im,member){
                    if (!member.deactivated){
                      if (!allUsers[member.idMember]){
                        allUsers[member.idMember] = { uid:member.idMember };
                      }
                    }
                  });
                }
              }
            });
            $('#message').html('');
            getUsers();
          });
      }
      
      var getUsers = function(){
        // reusable
        var loadUser = function(userId){
          var memberparams = { fields:'name,desc,closed,memberships', lists:'open', list_fields:'name'  };
          Trello.get("members/"+userId, {}, function(user) {
            var selected = '';
            if (userId == 'me'){
              myId = user.id;
              selected = ' selected="selected"';
            }
            allUsers[user.id] = user;
            $('#username').append('<option value="'+user.id+'"'+selected+'>'+user.fullName+'</option>');
            getUsers();
          });
        }
        // logic
        var stillLoading = false;
        if (!myId){
          stillLoading = true;
          loadUser('me');
        } else {
          var uid;
          for(uid in allUsers){
            if (!allUsers[uid]['fullName']){
              stillLoading = true;
              loadUser(uid);
              break;
            }
          }
        }
        // now get the cards and show them under the lists
        if (!stillLoading){
          console.log('hey stopped loading!!!!');
          getAllCards();
        }
      }

      var getPointsFromCard = function(item){
        var re = /\((\d+)\)/;
        var myArray = item.name.match(re);
        if (myArray){
          return parseInt(myArray[1]);
        } else {
          return 0;
        }
      }
      var getNameFromCard = function(item){
        var re = /\(\d+\)/;
        var name = item.name.replace(re, "");
        re = /\[\d+\]/;
        return name.replace(re, "");
      }
      var getProjectFromCard = function(item){
        var label = item.idLabels.pop();
        return label;
        // this would be the project name - look it up... or have some other lookup
        // OR put the project id in the label :()
      }
      var getPersonFromCard = function(item){
        var member = item.idMembers.pop();
        return member;
        // this would be their name - look it up... or have some other lookup
      }
      var getIdFromCard = function(item){
        var re = /\{(\d+)\}/;
        var myArray = item.desc.match(re);
        if (myArray){
          return parseInt(myArray[1]);
        } else {
          return 0;
        }
      }

      var getAllCards = function(){
          var userId = getUserId();
          console.log('get all cards for ' + userId);
          var params = { fields:'name,closed,idList,idBoard,url,idMembers,desc,idLabels' };
          Trello.get("members/"+userId+"/cards", params, function(items) {
            var $list, $li, $a;
            $.each(items, function(ix, item) {
              // only show open ones in in progress lists
              if (!item.closed){
                if (allLists.indexOf(item.idList) > -1){
                  // in progress!!!!!
                  //console.log(item);
                  var description = item.desc;
                  $list = $('#list_' + item.idList);
                  if ($list.length > 0){
                    var template = $('#itemTemplate').html();
                    Mustache.parse(template);   // optional, speeds up future uses
                    var rendered = Mustache.render(template, { 
                        item: item,
                        id: getIdFromCard(item),
                        name: getNameFromCard(item),
                        points: getPointsFromCard(item),
                        person: getPersonFromCard(item), 
                        project: getProjectFromCard(item)

                    });
                    $list.append(rendered);
                    //console.log('card',item);
                  }
                }
              }
            });
            // done with loop
            $('.panel-body').html('');
            showTotalPoints();
            $('.sync').on('click', onSync);
          });
      }

      var showTotalPoints = function(){
        $('.panel').each(items, function(ix, item) {

        });
      }
      
      var onSync = function(evt){
          var $this = $(this);
          $.ajax({
            type: "POST",
            url: this.href,
            data: { 
              id: $this.data('id'),
              name: $this.data('name'), 
              points: $this.data('points'),
              person: $this.data('person'),
              project: $this.data('project')
            }
          })
          .done(function( msg ) {
              var result = $.parseJSON(msg);
              if (result.id){
                alert('success! ' + result.id);
                console.log('update',item.desc,item);
                // set the activity id for future requests
                $this.data('id',result.id);
                // save the id to the card
                //PUT /1/cards/[card id or shortlink]/desc
                Trello.post("cards/" + $this.data('trelloid') + "/actions/desc", { text: item.desc + " {"+result.id+"}" })
              }
              console.log( "Data Saved: ", result);
          });
          evt.preventDefault();
      }

      
      var onAuthorize = function() {
        updateLoggedIn();
        $("#output").empty();
        
        Trello.members.get("me", function(member){
          $("#fullName").text(member.fullName);
          // get the boards
          getAllBoards();
        });
 
      };
 
      var updateLoggedIn = function() {
        var isLoggedIn = Trello.authorized();
        $("#loggedout").toggle(!isLoggedIn);
        $("#loggedin").toggle(isLoggedIn);
        $("#disconnect").toggle(isLoggedIn);
      };
        
      var logout = function() {
        Trello.deauthorize();
        updateLoggedIn();
        $('#output').html('');
      };
                    
      Trello.authorize({
        interactive:false,
        success: onAuthorize,
        error: updateLoggedIn
      });
 
      $("#connectLink").click(function(){
        Trello.authorize({
          name: 'Sharpdot Trello App',
          type: "popup",
          success: onAuthorize,
          scope: { write: true, read: true }
        })
      });
        
      $("#disconnect").click(logout);
            
    } else {
      alert('error - missing the Trello object?');
    }
  });
