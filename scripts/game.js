/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

// Require will call this with GameServer, GameSupport, and Misc once
// gameserver.js, gamesupport.js, and misc.js have loaded.

// Start the main app logic.
requirejs([
    'hft/gameserver',
    'hft/gamesupport',
    'hft/misc/misc',
  ], function(GameServer, GameSupport, Misc) {
      var canvas = document.getElementById("playfield");
      var questionarea = document.getElementById("questionarea");
      var optionsElem = document.getElementById("options");
      var playersElem = document.getElementById("players");
      var ctx = canvas.getContext("2d");

  var players = [];
  var globals = {
      showFPS: true,
      itemSize: 15,
      pollCountDownTime: 7,
      scoreCountDownTime: 5
  };
  Misc.applyUrlSettings(globals);

  var GameState =
  {
      Init: 0,
      Poll: 1,
      MajorityPoll: 2,
      Score: 3
  }

  var renderview = document.getElementById("renderview");
  Wolkenbruch.GameRenderer = new Wolkenbruch.Renderer(renderview);

  var pollResults = [];
  var polls = [];
  var currentPollIndex = -1;
  var currentCountDownTime = 0;
  var gameState = GameState.Init;

  polls.push({
      question: "Whazzzzup?!",
      options: ["great!", "awesome!", "moooh!", "argh!"]
  });
  polls.push({
      question: "What's your gender?",
      options: ["male", "female", "other"]
  });
  polls.push({
      question: "What's your stance?",
      options: ["SJW", "GG", "neutral"]
  });
  polls.push({
      question: "Pizza or Burger?",
      options: ["Pizza", "Burger"]
  });
  polls.push({
      question: "What for'n Saftladen?!",
      options: ["Laaadn!", "Mooaah!", "What?!"]
  });
  polls.push({
      question: "How do you like this event?",
      options: ["Transcendental", "Booooring", "don't know"]
  });
  polls.push({
      question: "Employed or Indie?",
      options: ["employed", "Indie", "neither"]
  });
  polls.push({
      question: "Nutrition",
      options: ["MEAT!", "Vegetarian", "Vegan"]
  });
  polls.push({
      question: "Do you want to have kids?",
      options: ["Yes", "No"]
  });
  polls.push({
      question: "Religion",
      options: ["Mac", "Windows", "Linux"]
  });
  polls.push({
      question: "Locomotion",
      options: ["Car", "Bike", "Public Transport"]
  })
  polls.push({
      question: "Will you return?",
      options: ["Yes", "No", "return what?"]
  });
  polls.push({
      question: "Vacation",
      options: ["Beach", "Mountains", "Balcony"]
  });

  for (var p = 0; p < polls.length; p++) {
      var votes = [];
      for (var n = 0; n < polls[p].options.length; n++) {
          votes.push(0);
      }
      pollResults.push(votes);
  }

  var pickRandomPosition = function() {
    return {
      x: 30 + Misc.randInt(canvas.width  - 60),
      y: 30 + Misc.randInt(canvas.height - 60),
    };
  };

  var Goal = function() {
      this.pickGoal();
      this.radiusesSquared = globals.itemSize * 2 * globals.itemSize;
  };

  Goal.prototype.pickGoal = function() {
    this.position = pickRandomPosition();
  };

  Goal.prototype.hit = function(otherPosition) {
    var dx = otherPosition.x - this.position.x;
    var dy = otherPosition.y - this.position.y;
    return dx * dx + dy * dy < this.radiusesSquared;
  };

  var Player = function(netPlayer, name) {
    this.netPlayer = netPlayer;
    this.name = name;
    this.position = pickRandomPosition();
    this.color = "green";
    this.selectedOptionIndex = -1;
    this.selectedMajorityOptionIndex = -1;
    this.numSelectedMajorityOptions = 0;
    this.numSelectedMajorityOptionsHit = 0;

    netPlayer.addEventListener('disconnect', Player.prototype.disconnect.bind(this));
    netPlayer.addEventListener('select', Player.prototype.selectOption.bind(this));
    netPlayer.addEventListener('color', Player.prototype.setColor.bind(this));
  };

  // The player disconnected.
  Player.prototype.disconnect = function() {
    for (var ii = 0; ii < players.length; ++ii) {
      var player = players[ii];
      if (player === this) {
        players.splice(ii, 1);
        return;
      }
    }
  };

  Player.prototype.selectOption = function (cmd) {
      if (gameState == GameState.Poll) {
          this.selectedOptionIndex = cmd.optionIndex;
      } else if (gameState == GameState.MajorityPoll) {
          this.selectedMajorityOptionIndex = cmd.optionIndex;
      }
  };

  Player.prototype.setColor = function(cmd) {
    this.color = cmd.color;
  };

  var server = new GameServer();
  GameSupport.init(server, globals);


  var qrcode = new QRCode(document.getElementById("qrcode"), {
      text: window.location.href.replace("gameview.html", "index.html"),
      width: 128,
      height: 128,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
  });

  var goal = new Goal();

  // A new player has arrived.
  server.addEventListener('playerconnect', function (netPlayer, name) {
      var newPlayer = new Player(netPlayer, name);
      players.push(newPlayer);

      Wolkenbruch.GameRenderer.addPlayer();
  });

  var showScore = function () {

    currentCountDownTime = globals.scoreCountDownTime;

    var poll = polls[currentPollIndex];

    poll.scores = [];
    poll.scoreCountDownTime = globals.scoreCountDownTime;

    var numVotes = 0;
    players.forEach(function (player) {
        if( player.selectedOptionIndex >= 0 &&
            player.selectedOptionIndex < poll.options.length) {
            pollResults[currentPollIndex][player.selectedOptionIndex]++;
            numVotes++;
        }

        if (player.selectedMajorityOptionIndex >= 0 &&
            player.selectedMajorityOptionIndex < poll.options.length) {
            player.numSelectedMajorityOptions++;
        }
    });
    numVotes = Math.max(numVotes, 1);

    var maxScore = 0;
    for (var n = 0; n < pollResults[currentPollIndex].length; n++) {
        var score = 100 * pollResults[currentPollIndex][n] / numVotes;
        poll.scores.push(score);
        maxScore = Math.max(maxScore, score);
    }


    players.forEach(function (player) {

        if (player.selectedMajorityOptionIndex >= 0 &&
            player.selectedMajorityOptionIndex < poll.options.length) {
            if (poll.scores[player.selectedMajorityOptionIndex] === maxScore) {
                player.numSelectedMajorityOptionsHit++;
            }
        }

        player.netPlayer.sendCmd('score', poll);
    });
  }

  var startMajorityPoll = function () {

    currentCountDownTime = globals.pollCountDownTime;

    var poll = polls[currentPollIndex];
    players.forEach(function (player) {
        player.netPlayer.sendCmd('majority', poll);
    });
  }


  var startNextPoll = function () {

      currentCountDownTime = globals.pollCountDownTime;
      currentPollIndex = (currentPollIndex + 1) % polls.length;
      
      var poll = polls[currentPollIndex];
      poll.pollCountDownTime = globals.pollCountDownTime;

      for (var n = 0; n < pollResults[currentPollIndex].length; n++) {
          pollResults[currentPollIndex][n] = 0;
      }

      questionarea.innerHTML = poll.question;

      while (optionsElem.firstChild) {
          optionsElem.removeChild(optionsElem.firstChild);
      }

      ctx.font = "8vmin eacologica";
      var elementSpace = (playfield.clientWidth / poll.options.length);
      for (var n = 0; n < poll.options.length; n++) {
          var opElem = document.createElement("div");
          opElem.innerHTML = poll.options[n];

          var w = ctx.measureText(opElem.innerHTML).width;

          opElem.style.position = "absolute";
          opElem.style.top = "5vh";
          opElem.style.left = (elementSpace * (n + 0.5) - w * 0.5).toFixed(0) + "px";

          optionsElem.appendChild(opElem);
      }

      players.forEach(function (player) {
          player.selectedOptionIndex = -1;
          player.selectedMajorityOptionIndex = -1;
          player.netPlayer.sendCmd('poll', poll);
      });
  }

  var switchStateDueToCountDownReached = function () {

      var newGameState = gameState
      switch (gameState) {
          case GameState.Poll:
              newGameState = GameState.MajorityPoll;
              break;
          case GameState.MajorityPoll:
              newGameState = GameState.Score;
              break;
          case GameState.Init:
          default:
              newGameState = GameState.Poll;
              break;
      }

      if (newGameState == GameState.Poll) {
          startNextPoll();
      } else if (newGameState == GameState.MajorityPoll) {
          startMajorityPoll();
      } else if (newGameState == GameState.Score) {
          showScore();
      }

      gameState = newGameState;
  }

  var render = function() {
    Misc.resize(canvas);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    var playersText = players.length + " players | ";

    players.sort(function (p2, p1) {
        return (p1.numSelectedMajorityOptions > 0 ? p1.numSelectedMajorityOptionsHit / p1.numSelectedMajorityOptions : 0) -
               (p2.numSelectedMajorityOptions > 0 ? p2.numSelectedMajorityOptionsHit / p2.numSelectedMajorityOptions : 0);
    });

    for (var p = 0; p < Math.min(players.length, 5); p++) {
        playersText += " >>> " + (p + 1) + ". " + players[p].name + "(" + players[p].numSelectedMajorityOptionsHit + "/" + players[p].numSelectedMajorityOptions + ")"
    }

    playersElem.innerHTML = playersText;

    currentCountDownTime -= globals.elapsedTime;
    if (currentCountDownTime < 0.0) {
        switchStateDueToCountDownReached();
    }
  };

  GameSupport.run(globals, render);
});


