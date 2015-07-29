
Wolkenbruch.Renderer = function (targetElement) {

    var that = this;

    this.targetElement = targetElement;

    var scene = new THREE.Scene();
    this.scene = scene;

    //var camera = new THREE.PerspectiveCamera(60, targetElement.clientWidth / targetElement.clientHeight, 0.1, 1000);

    var spaceX = 5.0;
    var spaceY = 5.0;

    var width = 3;
    var height = 3;
    var camera = new THREE.OrthographicCamera(-width * 0.5, width * 0.5, height * 0.5, -height * 0.5, 1, 1000);
    camera.width = width;
    camera.height = height;

    this.camera = camera;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, premultipliedAlpha: false} /*{antialias: true}*/);
    this.renderer.shadowMapEnabled = true;
    this.renderer.shadowMapSoft = true;

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    var skyColor = 0xA0C0FF;
    //var skyColor = 0x000000;

    targetElement.appendChild(this.renderer.domElement);
    this.renderer.setClearColor(skyColor, 0.0);

    InputModule.init(this.renderer.domElement);
    AudioModule.init();

    var hemiLight = new THREE.HemisphereLight(0x2040AA, 0x40AA40, 0.3);
    scene.add(hemiLight);

    var sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    sunLight.position.set(-20, 30, 10);
    sunLight.target.position.copy(scene.position);
    //sunLight.castShadow = true;
    sunLight.shadowCameraLeft = -30;
    sunLight.shadowCameraTop = -30;
    sunLight.shadowCameraRight = 30;
    sunLight.shadowCameraBottom = 30;
    sunLight.shadowCameraNear = 20;
    sunLight.shadowCameraFar = 200;
    sunLight.shadowBias = -0.003
    sunLight.shadowMapWidth = sunLight.shadowMapHeight = 2048;
    sunLight.shadowDarkness = 0.75;
    scene.add(sunLight);

    var groundGeometry = new THREE.PlaneBufferGeometry(20, 20);
    var groundMaterial = new THREE.MeshLambertMaterial({ color: 0x208020 });
    var ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotateX(-Math.PI * 0.5);
    ground.receiveShadow = true;

    //scene.add(ground);

    /*var geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    var material = new THREE.MeshLambertMaterial({ color: 0xA04040 });
    var cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.position.y = 2;
    cube.position.x = 2;

    scene.add(cube);*/


    camera.position.y = 2.6;
    camera.position.z = 3;
    camera.rotateX(-0.2);

    Wolkenbruch.clock = new THREE.Clock();
    Wolkenbruch.inputClock = new THREE.Clock();
    Wolkenbruch.smoothDelta = 0.0;

    //var fpsDiv = document.getElementById("fps");

    var glS = new glStats();
    var tS = new threeStats(this.renderer);


    this.initGame();


    this.showStats = false;

    rS = new rStats({
        CSSPath: "css/",
        values: {
            frame: { caption: 'Total frame time (ms)', over: 16 },
            fps: { caption: 'Framerate (FPS)', below: 30 },
            calls: { caption: 'Calls (three.js)', over: 3000 },
            raf: { caption: 'Time since last rAF (ms)' },
            rstats: { caption: 'rStats update (ms)' }
        },
        groups: [
            { caption: 'Framerate', values: ['fps', 'raf'] },
            { caption: 'Frame Budget', values: ['frame', 'render'] }
        ],
        /*fractions: [
            { base: 'frame', steps: ['action1', 'render'] }
        ],*/
        plugins: [
            tS,
            glS
        ]
    });

    this.resize = function() {
        var realToCSSPixels = window.devicePixelRatio || 1; // TODO: if performance is permanently low (below 60Hz) force this value to be 1

        var glCanvas = this.renderer.domElement;

        // Lookup the size the browser is displaying the canvas in CSS pixels
        // and compute a size needed to make our drawingbuffer match it in
        // device pixels.
        var displayWidth = Math.floor(glCanvas.clientWidth * realToCSSPixels);
        var displayHeight = Math.floor(glCanvas.clientHeight * realToCSSPixels);

        // Check if the canvas is not the same size.
        if (glCanvas.width != displayWidth ||
            glCanvas.height != displayHeight) {

            // Make the canvas the same size
            glCanvas.width = displayWidth;
            glCanvas.height = displayHeight;

            // Set the viewport to match
            //gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        }
    }

    this.render = function () {

        InputModule.updateInput(Wolkenbruch.smoothDelta);

        rS('frame').start();
        glS.start();

        rS('rAF').tick();
        rS('FPS').frame();

        that.renderer.setPixelRatio(window.devicePixelRatio || 1);
        that.renderer.setSize(that.targetElement.clientWidth, that.targetElement.clientHeight);

        camera.width = spaceX;
        camera.height = spaceY;
        camera.aspect = that.targetElement.clientWidth / that.targetElement.clientHeight;
        if (camera.aspect > 1.0) {
            camera.left = -camera.width * camera.aspect * 0.5;
            camera.right = camera.width * camera.aspect * 0.5;
            camera.top = camera.height * 0.5;
            camera.bottom = -camera.height * 0.5;
        } else {
            camera.left = -camera.width * 0.5;
            camera.right = camera.width * 0.5;
            camera.top = camera.height / camera.aspect * 0.5;
            camera.bottom = -camera.height / camera.aspect * 0.5;
        }

        camera.updateProjectionMatrix();

        //cube.rotation.x += 0.01;
        //cube.rotation.y += 0.01;

        //that.puzzle.update();

        for (var i = 0; i < that.sqs.length; i++) {
            
            var neRadNS = that.sqs[i].mat.uniforms.neRadNS.value;
            neRadNS.x = Math.sin(that.time+ i * 0.5) * 0.5 + 0.5;
            neRadNS.y = Math.cos(that.time + i) * 0.5 + 0.5;
        }

        rS('render').start();
        that.renderer.render(scene, camera);
        rS('render').end();

        Wolkenbruch.smoothDelta = Wolkenbruch.smoothDelta * 0.9 + Wolkenbruch.clock.getDelta() * 0.1;
        that.time += Wolkenbruch.smoothDelta;

        rS('frame').end();

        if (that.showStats) {
            rS('rStats').start();
            rS().update();
            rS('rStats').end();
        }
        else {
            rS().element.style.display = "none";
            //fpsDiv.innerText = (1.0 / Wolkenbruch.smoothDelta).toFixed(2);
        }
        requestAnimationFrame(that.render);
    };

    this.render();
};

Wolkenbruch.Renderer.prototype = {
    
    sqs: [],
    time: 0,

    initGame: function () {


    },

    addPlayer() {
        
        var spaceX = 5.0;
        var spaceY = 5.0;
        var numElementsX = 10;
        var numElementsY = 10;
        var elementScaleX = spaceX / numElementsX;
        var elementScaleY = spaceY / numElementsY;

        var posx = (Math.random() - 0.5) * spaceX;
        var posy = Math.random() * spaceY + 1.5;
        var posz = Math.random();

        var sq = new Wolkenbruch.SuperQuadric(this.scene);
        sq.mesh.position.x = posx;
        sq.mesh.position.y = posy;
        sq.mesh.position.z = posz;
        sq.mesh.scale.x = elementScaleX;
        sq.mesh.scale.y = elementScaleY;
        sq.mesh.scale.z = elementScaleX;

        this.sqs.push(sq);
    },

    restartGame: function () {


        this.initGame();
    }
};
