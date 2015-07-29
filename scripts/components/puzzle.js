


Wolkenbruch.Puzzle = function (scene, camera, renderer) {

    var that = this;

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.activeElements = [];

    InputModule.dragConsumer = this;

    var hexahedronTarget = {
        x: 0.05,
        y: 0.05,
        distanceX: function (x) {
            return x;
        },
        distanceY: function (y) {
            return y;
        }
    };
    var polygonalPrismTarget = {
        x: 1.0,
        y: 0.05,
        distanceX: function (x) {
            return x - 1.0;
        },
        distanceY: function (y) {
            return y;
        }
    };
    var octahedronTarget = {
        x: 0.05,
        y: 2.0,
        distanceX: function (x) {
            return x;
        },
        distanceY: function (y) {
            return y - 1.0;
        }
    };
    var sphericalPolyhedronTarget = {
        x: 1.0,
        y: 1.0,
        distanceX: function (x) {
            return x - 1.0;
        },
        distanceY: function (y) {
            return y - 1.0;
        }
    };
    
    this.elementTargets = [hexahedronTarget, polygonalPrismTarget, octahedronTarget, sphericalPolyhedronTarget];

    var spaceX = 5.0;
    var spaceY = 5.0;

    this.spaceX = spaceX;
    this.spaceY = spaceY;

    var numElementsX = 5;
    var numElementsY = 5;
    var elementScaleX = spaceX / numElementsX;
    var elementScaleY = spaceY / numElementsY;
    this.elements = [];
    for (var y = 0; y < numElementsY; y++) {
        for (var x = 0; x < numElementsX; x++) {

            var sizeX = 0.5 * elementScaleX;
            var sizeY = 0.5 * elementScaleY;

            var posx = (x - numElementsX / 2) * elementScaleX + sizeX;
            var posy = (y - numElementsY / 2) * elementScaleY + sizeY + 2.0;
            var posz = 0.0;

            var sq = new Wolkenbruch.SuperQuadric(scene);
            sq.mesh.position.x = posx;
            sq.mesh.position.y = posy;
            sq.mesh.position.z = posz;
            sq.mesh.scale.x = elementScaleX;
            sq.mesh.scale.y = elementScaleY;
            sq.mesh.scale.z = elementScaleX;

            var pos = new THREE.Vector3(posx, posy, posz);
            var min = new THREE.Vector3(-sizeX, -sizeY, -sizeX).add(pos);
            var max = new THREE.Vector3(sizeX, sizeY, sizeX).add(pos);
            var aabb = new THREE.Box3(min, max);

            var length = this.elements.push(
            {
                pos: pos,
                morphx: 0.5,
                morphy: 0.5,
                morphTargetX: Math.round(Math.random()),
                morphTargetY: Math.round(Math.random()),
                morphvx: 0.0,
                morphvy: 0.0,
                sq: sq,
                aabb: aabb,
                neighbors: []
            });
            this.updateElement(length - 1);
        }
    }

    var dirs = [
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
    ];

    // collect list of direct neighbors (von Neumann neighborhood) for each element
    for (var e = 0; e < this.elements.length; e++) {
        for (var d = 0; d < 6; d++) {
            var minDist = Infinity;
            var neighborIndex = -1;
            var ray = new THREE.Ray(this.elements[e].pos, dirs[d]);
            for (var eo = 0; eo < this.elements.length; eo++) {
                if (e == eo) continue;
                var el = this.elements[eo];

                var result = ray.intersectBox(el.aabb);

                if (result) {
                    var dist = ray.origin.distanceToSquared(result);
                    if (dist < minDist) {
                        minDist = dist;
                        neighborIndex = eo;
                    }
                }
            }
            if (neighborIndex >= 0) {
                this.elements[e].neighbors.push(neighborIndex);
            }
        }
    }
};

Wolkenbruch.Puzzle.prototype = {
    update: function () {

        var dt = Wolkenbruch.smoothDelta;
        var snappingSpeed = 10.0;

        for (var e = 0; e < this.elements.length; e++) {

            var el = this.elements[e];
            var isActive = (this.activeElements.indexOf(e) >= 0);

            var dx = el.morphTargetX - el.morphx + el.morphvx;
            var dy = el.morphTargetY - el.morphy + el.morphvy;
            //var dx = el.morphTargetX - el.morphx;
            //var dy = el.morphTargetY - el.morphy;

            var snappingSpeed = 20.0;

            if (isActive) {
                snappingSpeed *= 10;
            } else {

                // snap all inactive elements to their destination shape
                if (el.morphvx !== 0.0 && el.morphvy !== 0.0) {

                    var vTan = Math.abs(el.morphvx / el.morphvy);

                    if (vTan < 0.5) {
                        dx = 0.0;
                    }
                    if (vTan > 2.0) {
                        dy = 0.0;
                    }
                }

                if (dx == 0.0) {
                    dx = el.morphx - 0.5;
                }
                if (dy == 0.0) {
                    dy = el.morphy - 0.5;
                }

                el.morphTargetX = (dx > 0.0) ? 1.0 : 0.0;
                el.morphTargetY = (dy > 0.0) ? 1.0 : 0.0;
            }

            var constantSnappingSpeed = Math.min(1.0,dt * snappingSpeed);

            dx = el.morphTargetX - el.morphx;
            dy = el.morphTargetY - el.morphy;
            if(Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
                el.morphx = Math.min(1.0, Math.max(0.0, el.morphx + dx * constantSnappingSpeed));
                el.morphy = Math.min(1.0, Math.max(0.0, el.morphy + dy * constantSnappingSpeed));
                this.updateElement(e);
            }
        }
    },
    updateElement: function (elementIndex) {
        var element = this.elements[elementIndex];
        var n = 0.0;
        var e = 0.0;
        for (var t = 0; t < this.elementTargets.length; t++) {
            var target = this.elementTargets[t];
            var dx = Math.max(0.0, 1.0 - Math.abs(target.distanceX(element.morphx)));
            var dy = Math.max(0.0, 1.0 - Math.abs(target.distanceY(element.morphy)));
            var d = dx * dy;    // results in linear interpolation

            n += target.x * d;
            e += target.y * d;
        }

        var neRadNS = element.sq.mat.uniforms.neRadNS.value;
        neRadNS.x = n;
        neRadNS.y = e;
    },
    consumeDragging: function (x, y, dx, dy) {

        if (this.activeElements.length == 0) {
            var mouse = new THREE.Vector2();

            mouse.x = 2 * (x / this.renderer.domElement.clientWidth) - 1;
            mouse.y = 1 - 2 * (y / this.renderer.domElement.clientHeight);

            var raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);

            var touchedElementIndex = -1;
            var minDist = Infinity;
            for (var e = 0; e < this.elements.length; e++) {
                var el = this.elements[e];

                var result = raycaster.ray.intersectBox(el.aabb);

                if (result) {
                    var dist = raycaster.ray.origin.distanceToSquared(result);
                    if (dist < minDist) {
                        minDist = dist;
                        touchedElementIndex = e;
                    }
                }
            }

            AudioModule.play("swipe");

            if (touchedElementIndex < 0) {
                this.activeElements = [];
            } else {
                this.activeElements.push(touchedElementIndex);
                // get a list of all neighbors with same morph values to move them along
                this.computeAllEqualNeighbors(touchedElementIndex, this.activeElements);
            }
        }

        if (this.activeElements.length > 0) {
            var maxSpeed = 3.0;
            dSqr = dx * dx + dy * dy;
            if (dSqr > maxSpeed * maxSpeed) {
                var dScale = maxSpeed / Math.sqrt(dSqr);
                dx *= dScale;
                dy *= dScale;
            }

            for (var e = 0; e < this.activeElements.length; e++) {
                var activeElementIndex = this.activeElements[e];
                var el = this.elements[activeElementIndex];
                var oldMorphTargetX = el.morphTargetX;
                var oldMorphTargetY = el.morphTargetY;
                el.morphTargetX = Math.min(1.0, Math.max(0.0, el.morphTargetX + dx * 0.02));
                el.morphTargetY = Math.min(1.0, Math.max(0.0, el.morphTargetY + dy * 0.02));
                el.morphvx = el.morphTargetX - oldMorphTargetX;
                el.morphvy = el.morphTargetY - oldMorphTargetY;
            }
        }
    },
    consumeDraggingEnd: function () {
        this.activeElements = [];
    },
    computeAllEqualNeighbors: function (elementIndex, elements) {
        var el = this.elements[elementIndex];
        
        for (var n = 0; n < el.neighbors.length; n++) {
            var ni = el.neighbors[n];
            if (elements.indexOf(ni) < 0 &&
                this.elements[ni].morphTargetX == el.morphTargetX &&
                this.elements[ni].morphTargetY == el.morphTargetY) {
                elements.push(ni);

                this.computeAllEqualNeighbors(ni, elements);
            }
        }
    },
    destroy: function () {
        for (var e = 0; e < this.elements.length; e++) {
            this.elements[e].sq.destroy();
        }
    }
};
