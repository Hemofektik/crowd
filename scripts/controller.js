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

// Start the main app logic.
requirejs([
    'hft/commonui',
    'hft/gameclient',
    'hft/misc/input',
    'hft/misc/misc',
    'hft/misc/mobilehacks',
    'hft/misc/touch',
  ], function(
    CommonUI,
    GameClient,
    Input,
    Misc,
    MobileHacks,
    Touch) {

  var globals = {
    debug: false,
  };
  Misc.applyUrlSettings(globals);
  MobileHacks.fixHeightHack();

  var GameState =
  {
      Init: 0,
      Poll: 1,
      MajorityPoll: 2,
      Score: 3
  }

  var gameState = GameState.Init;

  var score = 0;
  var statusElem = document.getElementById("gamestatus");
  var attachedElem = document.getElementById("attached");
  var inputElem = document.getElementById("inputarea");
  var questionElem = document.getElementById("questionarea");
  var colorElem = document.getElementById("display");
  var canvas = document.getElementById("canvas");
  var client = new GameClient();

  var ctx = canvas.getContext("2d");

  var options = [""];
  var optionScores = [100];
  var numOptions = 1;
  var startAngle = 0.0;
  var angleStep = 2.0 * Math.PI / numOptions;
  var selectedOptionIndex = -1;
  var currentCountDownTime = 0;
  var intervalHandle = null;


  CommonUI.setupStandardControllerUI(client, globals);

  var redraw = function () {

      Misc.resize(canvas);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      var centerX = ctx.canvas.width * 0.5;
      var centerY = ctx.canvas.height * 0.5;
      var radiusX = centerX;
      var radiusY = centerY;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      var showScores = (gameState == GameState.Score);

      var myColor = ['#7AB1A0', '#46665B', '#92BCA8', '#638E7F'];
      var angle = startAngle + angleStep * 0.5;

      var anyVotes = false;
      var majorityOptionValue = 0;
      if (showScores) {
          for (var n = 0; n < numOptions; n++) {

              if (optionScores[n] == 0) {
                  continue;
              }

              anyVotes = true;

              ctx.fillStyle = myColor[n];
              ctx.beginPath();
              ctx.moveTo(centerX, centerY);
              ctx.arc(centerX, centerY, Math.min(radiusX, radiusY), angle, angle + (Math.PI * 2 * (optionScores[n] / 100.0)), false);
              ctx.lineTo(centerX, centerY);
              ctx.fill();

              angle += (Math.PI * 2 * (optionScores[n] / 100.0));

              if (optionScores[n] > majorityOptionValue) {
                  majorityOptionValue = optionScores[n];
              }
          }
      }

      angle = startAngle;
      for (var n = 0; n < numOptions; n++) {

            if (showScores && optionScores[n] == 0) {
                continue;
            }

          var text = options[n];

          if (globals.debug) {
              ctx.strokeStyle = '#FF00FF';
              ctx.beginPath();
              ctx.moveTo(centerX, centerY);
              ctx.lineTo(centerX + Math.cos(angle) * radiusX, centerY + Math.sin(angle) * radiusY);
              ctx.stroke();
          }

          ctx.fillStyle = (n === selectedOptionIndex) ? '#FFFFFF' : '#CCCCCC';

          var angleTextOffset = 0.0;
          if (showScores) {

              angleTextOffset = (Math.PI * 2 * (optionScores[n] / 100.0));

              if (n === selectedOptionIndex) {
                  ctx.fillStyle = (optionScores[selectedOptionIndex] === majorityOptionValue) ? '#00FF00' : '#FF0000';
              } else if (optionScores[n] === majorityOptionValue) {
                  ctx.fillStyle = '#FFFFFF';
              }
          }


          ctx.font = "10vmin eacologica";
          ctx.fillText(text,
              centerX + Math.cos(angle + angleStep * 0.5 + angleTextOffset * 0.5) * radiusX * 0.75,
              centerY + Math.sin(angle + angleStep * 0.5 + angleTextOffset * 0.5) * radiusY * 0.75, Math.min(radiusX, radiusY));

          if (showScores) {
              ctx.fillStyle = '#FFFFFF';
              ctx.font = "5vmin Verdana";
              ctx.fillText(optionScores[n].toFixed(0) + "%",
                  centerX + Math.cos(angle + angleStep * 0.5 + angleTextOffset * 0.5) * radiusX * 0.45,
                  centerY + Math.sin(angle + angleStep * 0.5 + angleTextOffset * 0.5) * radiusY * 0.45, Math.min(radiusX, radiusY));

              angle += angleTextOffset;
          } else {
              angle += angleStep;
          }
      }

      if (!anyVotes && showScores) {
          questionElem.innerHTML = "Chicken!";
          questionElem.style.opacity = 1.0;
      }
  }

  var randInt = function(range) {
    return Math.floor(Math.random() * range);
  };

  // Sends a move command to the game.
  //
  // This will generate a 'move' event in the corresponding
  // NetPlayer object in the game.
  var sendMoveCmd = function(position, target) {
      if (gameState === GameState.Score) {
          return;
      }
    var centerX = ctx.canvas.width * 0.5;
    var centerY = ctx.canvas.height * 0.5;

    var deltaX = position.x - centerX;
    var deltaY = position.y - centerY;

    var angle = Math.atan2(deltaY, deltaX);

    selectedOptionIndex = (Math.round((((angle - startAngle + angleStep * 0.5) + Math.PI * 2.0) % (Math.PI * 2.0)) / angleStep) + (numOptions - 1) + numOptions) % numOptions;

    client.sendCmd('select', {
        optionIndex: selectedOptionIndex
    });

    redraw();
  };

  var countDown = function () {
      currentCountDownTime = Math.max(0, currentCountDownTime - 1);
      statusElem.innerHTML = currentCountDownTime;
  }

  // Pick a random color
  var color =  'rgb(' + randInt(256) + "," + randInt(256) + "," + randInt(256) + ")";
  // Send the color to the game.
  //
  // This will generate a 'color' event in the corresponding
  // NetPlayer object in the game.
  client.sendCmd('color', {
    color: color,
  });
  //colorElem.style.backgroundColor = color;

  // Send a message to the game when the screen is touched
  inputElem.addEventListener('pointermove', function(event) {
    var position = Input.getRelativeCoordinates(event.target, event);
    sendMoveCmd(position, event.target);
    event.preventDefault();
  });

  inputElem.addEventListener('pointerdown', function (event) {
      var position = Input.getRelativeCoordinates(event.target, event);
      sendMoveCmd(position, event.target);
      event.preventDefault();
  });

  // Update our score when the game tells us.
  client.addEventListener('scored', function(cmd) {
    score += cmd.points;
    //statusElem.innerHTML = "You scored: " + cmd.points + " total: " + score;
  });

  client.addEventListener('score', function (cmd) {

      if (gameState !== GameState.MajorityPoll) {
          return;
      }

      questionElem.style.opacity = 0.0;
      attachedElem.style.opacity = 0.0;
      gameState = GameState.Score;

      currentCountDownTime = cmd.scoreCountDownTime;
      optionScores = cmd.scores;

      countDown();
      redraw();
  });

  client.addEventListener('majority', function (cmd) {

      if (gameState !== GameState.Poll) {
          return;
      }

      gameState = GameState.MajorityPoll;

      attachedElem.style.opacity = 1.0;

      selectedOptionIndex = -1;
      currentCountDownTime = cmd.pollCountDownTime;

      countDown();
      redraw();
  });

  client.addEventListener('poll', function (cmd) {

      gameState = GameState.Poll;

      questionElem.innerHTML = cmd.question;

      options = cmd.options;
      numOptions = cmd.options.length;
      startAngle = (numOptions === 3) ? -Math.PI / 6.0 : 0.0;
      angleStep = 2.0 * Math.PI / numOptions;
      selectedOptionIndex = -1;
      questionElem.style.opacity = 1.0;
      attachedElem.style.opacity = 0.0;

      currentCountDownTime = cmd.pollCountDownTime;
      countDown();

      clearInterval(intervalHandle)
      intervalHandle = setInterval(countDown, 1000);

      redraw();
  });
});

