
var KEY_CODE = {
    PLUS: 187,
    MINUS: 189,

    RIGHT: 37,
    DOWN: 38,
    LEFT: 39,
    UP: 40
};

var InputModule = {

    resetFocusPoint: true,
    focusPoint: { x: 0, y: 0 },
    focusVel: { x: 0, y: 0 },
    panVel: { x: 0, y: 0 },
    scaleDistance: 1.0,
    inputTimeIndex: 0.0,
    isMouseDown: false,
    activePointers: { touches: [], touchIds: [] },
    activeKeys: [],

    targetSQ: null,

    init: function (targetElement) {

        var that = this;
        this.targetElement = targetElement;

        targetElement.addEventListener('mousewheel', function (event) {
            that.onMousewheel(event, event.wheelDelta);
        }, false);
        targetElement.addEventListener('DOMMouseScroll', function (event) {
            that.onMousewheel(event, event.detail * -50.0);
        }, false);

        document.addEventListener("keydown", function (event) {
            if (event.target == document.body) {
                that.activeKeys[event.keyCode] = true;
            }
        }, false);
        document.addEventListener("keyup", function (event) {
            that.activeKeys[event.keyCode] = false;
        }, false);

        /*if(navigator.pointerEnabled) { // w3c implementation of touch/mouse/pen (IE11)

            document.addEventListener("MSGestureInit", function(e){ if(e.preventManipulation) e.preventManipulation(); }, false);
            document.addEventListener("MSHoldVisual", function(e){ e.preventDefault(); }, false);

            document.addEventListener('pointermove', function(evt) {
                evt.preventDefault();
                var touchIndex = that.activePointers.touchIds.indexOf(evt.pointerId);
                if(touchIndex >= 0) {
                    that.activePointers.touches[touchIndex] = evt;
                    that.onTouchMove(that.activePointers);
                }
            }, false);

            targetElement.addEventListener("pointerdown", function(evt) {
                evt.preventDefault();
                that.activePointers.touches.push(evt);
                that.activePointers.touchIds.push(evt.pointerId);
                
                that.panVel = { x:0, y:0 };
            }, false);

            var removePointer = function(evt) {
                evt.preventDefault();

                var touchIndex = that.activePointers.touchIds.indexOf(evt.pointerId);
                if(touchIndex >= 0) {
                    that.activePointers.touches.splice(touchIndex, 1);
                    that.activePointers.touchIds.splice(touchIndex, 1);
                }

                if( that.activePointers.touches.length === 0 ) {
                    that.panVel = that.focusVel;
                }
            };
            document.addEventListener("pointerup", removePointer, false);
            document.addEventListener("pointercancel", removePointer, false);

        } else*/ { // non-standard touch implementation (chrome, safari, firefox)
            document.addEventListener('mousemove', function (evt) {
                if (evt.srcElement === targetElement || evt.target === targetElement) {
                    evt.preventDefault();
                }
                var newMousePos = that.getRelativePos(targetElement, evt);
                that.handleNewMousePos(newMousePos);
            }, false);

            targetElement.addEventListener("mousedown", function (evt) {
                var newMousePos = that.getRelativePos(targetElement, evt);
                that.isMouseDown = true;
                that.handleNewMousePos(newMousePos);
                that.panVel = { x: 0, y: 0 };
            }, false);

            targetElement.addEventListener("click", function (evt) {
                
            }, false);

            document.addEventListener("mouseup", function (evt) {
                if (!that.isMouseDown) return;
                var newMousePos = that.getRelativePos(targetElement, evt);
                that.isMouseDown = false;
                var inputDeltaTime = that.handleNewMousePos(newMousePos);
                if (inputDeltaTime < 0.1 && (that.focusVel.x * that.focusVel.x + that.focusVel.y * that.focusVel.y) > 5.0) {
                    that.panVel = that.focusVel;
                }

                if (that.dragConsumer) {
                    that.dragConsumer.consumeDraggingEnd();
                }
            }, false);

            document.addEventListener('touchmove', function (event) {
                if (event.srcElement === targetElement || event.target === targetElement) {
                    event.preventDefault();
                    that.onTouchMove(event);
                    return false;
                }
            });

            targetElement.addEventListener('touchstart', function (event) {
                if (event.touches.length > 1) { // keep click but prevent zooming
                    event.preventDefault();
                }
                that.resetFocusPoint = true;
                that.panVel = { x: 0, y: 0 };
            }, false);
            document.addEventListener('touchend', function (event) {
                that.resetFocusPoint = true;
                if (event.touches.length === 0 && that.lastData) {

                    var focusDeltaX = that.lastData.focusDeltaX;
                    var focusDeltaY = that.lastData.focusDeltaY;
                    var invDT = that.lastData.invDT;

                    var CLAMP_FOCUS = 20;
                    if (focusDeltaY > 0) {
                        focusDeltaY = Math.min(CLAMP_FOCUS, focusDeltaY);
                    } else {
                        focusDeltaY = Math.max(-CLAMP_FOCUS, focusDeltaY);
                    }
                    if (focusDeltaX > 0) {
                        focusDeltaX = Math.min(CLAMP_FOCUS, focusDeltaX);
                    } else {
                        focusDeltaX = Math.max(-CLAMP_FOCUS, focusDeltaX);
                    }

                    that.focusVel = {
                        x: focusDeltaX * invDT,
                        y: focusDeltaY * invDT
                    };

                    that.panVel = that.focusVel;

                    if (that.dragConsumer) {
                        that.dragConsumer.consumeDraggingEnd();
                    }
                }
            });
        }
    },

    onMousewheel: function (event, wheelDelta) {
        var newMousePos = this.getRelativePos(this.targetElement, event);
        //var newScale = meEngine.viewScale + wheelDelta * 0.0005 * meEngine.viewScale;
        //this.zoom(newScale, newMousePos.x, newMousePos.y);
        event.preventDefault();
        return false;
    },
    onTouchMove: function (event) {

        var newFocusPoint = { x: 0, y: 0 };
        var newScaleDistance = 0.0;
        var numTouches = event.touches.length;
        if (numTouches > 0) {
            for (var touchIndex = 0; touchIndex < numTouches; touchIndex++) {

                var newTouch = event.touches[touchIndex];
                var newTouchPos = this.getRelativePos(this.targetElement, newTouch);

                newFocusPoint.x += newTouchPos.x;
                newFocusPoint.y += newTouchPos.y;
            }

            newFocusPoint.x /= numTouches;
            newFocusPoint.y /= numTouches;
        
            for (var touchIndex = 0; touchIndex < numTouches; touchIndex++) {

                var newTouch = event.touches[touchIndex];
                var newTouchPos = this.getRelativePos(this.targetElement, newTouch);

                var currentDeltaX = newFocusPoint.x - newTouchPos.x;
                var currentDeltaY = newFocusPoint.y - newTouchPos.y;

                var currentDistance = Math.sqrt(currentDeltaX * currentDeltaX + currentDeltaY * currentDeltaY);

                newScaleDistance += currentDistance;
            }

            newScaleDistance /= numTouches;
        } else {
            newFocusPoint.x = focusPoint.x;
            newFocusPoint.y = focusPoint.y;
        }

        if (this.resetFocusPoint) {
            this.focusPoint = newFocusPoint;
            this.scaleDistance = newScaleDistance;
            this.resetFocusPoint = false;
        }

        var focusDeltaX = newFocusPoint.x - this.focusPoint.x;
        var focusDeltaY = newFocusPoint.y - this.focusPoint.y;
        var scaleDelta = newScaleDistance / this.scaleDistance;

        var lastInputTimeIndex = this.inputTimeIndex;
        this.inputTimeIndex = Wolkenbruch.inputClock.getElapsedTime();

        var dt = Math.min(0.1, this.inputTimeIndex - lastInputTimeIndex);
        
        var invDT = 0.0;
        if (dt > 0.001) {
            invDT = Math.min(300.0, 1.0 / dt);
        }
        
        this.focusVel = {
            x: focusDeltaX * invDT,
            y: focusDeltaY * invDT
        };

        this.lastData = {
            focusDeltaX: focusDeltaX,
            focusDeltaY: focusDeltaY,
            invDT: invDT
        };

        if (this.dragConsumer) {
            this.dragConsumer.consumeDragging(newFocusPoint.x, newFocusPoint.y, focusDeltaX, focusDeltaY);
        }

        this.focusPoint = newFocusPoint;
        this.scaleDistance = newScaleDistance;
    },

    updateInput: function (deltaTime) {

        if (this.activeKeys[KEY_CODE.PLUS]) {
            this.zoomInOrOut(true, deltaTime);
        }
        if (this.activeKeys[KEY_CODE.MINUS]) {
            this.zoomInOrOut(false, deltaTime);
        }

        var keyOffsetX = 0.0;
        var keyOffsetY = 0.0;
        var keySpeed = 800.0;
        if (this.activeKeys[KEY_CODE.LEFT]) { keyOffsetX -= 1.0; }
        if (this.activeKeys[KEY_CODE.RIGHT]) { keyOffsetX += 1.0; }
        if (this.activeKeys[KEY_CODE.UP]) { keyOffsetY -= 1.0; }
        if (this.activeKeys[KEY_CODE.DOWN]) { keyOffsetY += 1.0; }

        var panDeceleration = Math.pow(0.9, 30.0 * deltaTime);
        this.panVel.x *= panDeceleration;
        this.panVel.y *= panDeceleration;
    },

    zoom: function (newScale, centerX, centerY) {
        /*var previousFrameScale = meEngine.viewScale;

        meEngine.viewScale = newScale;
        meEngine.viewScale = Math.min(meEngine.viewScale, meEngine.maxScale);
        meEngine.viewScale = Math.max(meEngine.viewScale, meEngine.minScale);

        var scaleDelta = (previousFrameScale - meEngine.viewScale) / (previousFrameScale * meEngine.viewScale);
        var viewOffsetDeltaX = centerX * scaleDelta;
        var viewOffsetDeltaY = -(meEngine.resolutionY - centerY) * scaleDelta;
        meEngine.viewOffsetX += viewOffsetDeltaX;
        meEngine.viewOffsetY += viewOffsetDeltaY;*/
    },

    zoomOnCenter: function (newScale) {
        /*var previousFrameScale = meEngine.viewScale;

        meEngine.viewScale = newScale;
        meEngine.viewScale = Math.min(meEngine.viewScale, meEngine.maxScale);
        meEngine.viewScale = Math.max(meEngine.viewScale, meEngine.minScale);

        var scaleDelta = (previousFrameScale - meEngine.viewScale) / (previousFrameScale * meEngine.viewScale);
        var viewOffsetDeltaX = meEngine.resolutionX * 0.5 * scaleDelta;
        var viewOffsetDeltaY = meEngine.resolutionY * -0.5 * scaleDelta;
        meEngine.viewOffsetX += viewOffsetDeltaX;
        meEngine.viewOffsetY += viewOffsetDeltaY;*/
    },

    zoomInOrOut: function (zoomIn, deltaTime) {
        //var newScale = meEngine.viewScale + (zoomIn ? 1 : -1) * deltaTime * meEngine.viewScale;
        //this.zoomOnCenter(newScale);
    },

    handleNewMousePos: function (newMousePos) {

        var deltaX = newMousePos.x - this.focusPoint.x;
        var deltaY = newMousePos.y - this.focusPoint.y;
        var lastInputTimeIndex = this.inputTimeIndex;

        this.focusPoint = newMousePos;
        this.inputTimeIndex = Wolkenbruch.inputClock.getElapsedTime();

        var dt = Math.min(0.1, this.inputTimeIndex - lastInputTimeIndex);
        if (this.isMouseDown) {
            var invDT = 0.0;
            if (dt > 0.0001) {
                invDT = 1.0 / dt;
            }
            this.focusVel = {
                x: deltaX * invDT,
                y: deltaY * invDT
            };
            //meEngine.viewOffsetX += deltaX / meEngine.viewScale * meEngine.scrollFactor3D;
            //meEngine.viewOffsetY += deltaY / meEngine.viewScale;

            if (this.dragConsumer) {
                this.dragConsumer.consumeDragging(newMousePos.x, newMousePos.y, deltaX, deltaY);
            }
        }
        return dt;
    },

    getRelativePos: function (element, evt) {
        var rect = element.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }
};
