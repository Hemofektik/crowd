
Wolkenbruch.SuperQuadric = function (scene) {

    var that = this;


    var vs =
        "precision highp float;" +
        "varying vec3 vecWorldPos;" +
        "varying vec3 vecNormal;" +

        "uniform vec4 dimensionR;" +
        "uniform vec4 neRadNS;" +

        // sq (v, n)
        // s(v,n) = sgnf(v) * |v|^n
        "float sq ( float v, float n )" +
        "{" +
            "return sign( v ) * pow( abs( v ), n );" +
        "}" +
        "void main() {" +
            "float sinu = position.x;" +
	        "float cosu = position.y;" +
	        "float sinv = normal.x;" +
	        "float cosv = normal.y;" +
            "float radv = normal.z;" +
    
	        "float n = neRadNS.x;" +
	        "float e = neRadNS.y;" +
	        "float radius = dimensionR.w;" +
	        "float rad = neRadNS.z;" +
	        "float nSpecial = neRadNS.w;" +

	        "n = ( radv < rad ) ? nSpecial : n;" +

	        "vec4 localPos;" +
	        "localPos.x = dimensionR.x * ( radius + sq( cosu, e ) ) * sq(sinv, n);" +
	        "localPos.y = dimensionR.y * sq( sinu, e );" +
	        "localPos.z = dimensionR.z * ( radius + sq( cosu, e ) ) * sq(cosv, n);" +
	        "localPos.w = 1.0;" +
            "vecWorldPos = (modelMatrix * localPos).xyz;" +

	        "vec3 localNormal;" +
	        "localNormal.x = sq(cosu, 2.0 - e) * sq(sinv, 2.0 - n) / dimensionR.x;" +
            "localNormal.y = sq(sinu, 2.0 - e) / dimensionR.y;" +
	        "localNormal.z = sq(cosu, 2.0 - e) * sq(cosv, 2.0 - n) / dimensionR.z;" +

            "vecNormal = mat3(modelMatrix) * localNormal;" +
            "gl_Position = projectionMatrix * (modelViewMatrix * localPos);" +
        "}";

    var fs = 
        "precision highp float;" +
        "varying vec3 vecWorldPos;" +
        "varying vec3 vecNormal;" + 
        "uniform vec4 diffuse_color;\n" +
        "#if MAX_DIR_LIGHTS\n" +
        "uniform vec3 directionalLightDirection[MAX_DIR_LIGHTS];" +
        "uniform vec3 directionalLightColor[MAX_DIR_LIGHTS];\n" +
        "#endif\n" +
        "#if MAX_HEMI_LIGHTS\n" +
        "uniform vec3 hemisphereLightDirection[MAX_HEMI_LIGHTS];" +
        "uniform vec3 hemisphereLightSkyColor[MAX_HEMI_LIGHTS];" +
        "uniform vec3 hemisphereLightGroundColor[MAX_HEMI_LIGHTS];\n" +
        "#endif\n" +
        "void main() {" +
			"vec3 viewDir = normalize( vecWorldPos - cameraPosition );" +
            "vec3 pnormal = normalize(vecNormal);" +
            "vec3 lighting = vec3(0.0, 0.0, 0.0);" +
            "float specular = 0.0;" +
	        "vec3 reflection = normalize( reflect( viewDir, pnormal ) );" +
            "float fresnel = max(0.0, dot(reflection, viewDir));" +
            "fresnel = pow(fresnel, 4.0) * 0.3;\n" +
            "#if MAX_DIR_LIGHTS\n" +
            "for(int l = 0; l < MAX_DIR_LIGHTS; l++) {" +
                "float halfLambert = dot(directionalLightDirection[l], pnormal) * 0.5 + 0.5;" +
                "lighting += halfLambert * directionalLightColor[l];" +
                "specular += pow( clamp( dot( directionalLightDirection[l], reflection ), 0.0, 1.0 ), 9.0 );" +
            "}\n" +
            "#endif\n" +
            "#if MAX_HEMI_LIGHTS\n" +
            "for(int l = 0; l < MAX_HEMI_LIGHTS; l++) {" +
                "float halfLambert = dot(-hemisphereLightDirection[l], pnormal) * 0.5 + 0.5;" +
                "lighting += mix(hemisphereLightSkyColor[l], hemisphereLightGroundColor[l], halfLambert);" +
            "}\n" +
            "#endif\n" +
            "gl_FragColor = diffuse_color * vec4(lighting, 1.0) + vec4(specular, specular, specular, 0.0) + fresnel;" +
        "}";

    // share the same geometry across all superquadrics
    function getGeometry() {
        if (Wolkenbruch.SuperQuadric._geo == null) {
            var geometry = new THREE.BufferGeometry();

            var numVerticesX = 32;

            var NumQuadsX = numVerticesX - 1;
            var NumQuads = NumQuadsX * NumQuadsX;

            var numTriangles = NumQuads * 2;

            var numVertices = numVerticesX * numVerticesX;

            var numIndices = NumQuads * 6;

            var vertices = new Float32Array(numVertices * 3); // three components per vertex
            var normals = new Float32Array(numVertices * 3); // three components per vertex

            var vertexIndex = 0;
            for (var m = 0; m < numVerticesX; m++) {
                var v = m / NumQuadsX;
                for (var n = 0; n < numVerticesX; n++) {
                    var u = n / NumQuadsX;

                    // push faces to the center to minimize visual LOD differences
                    /*{
                        var uh = (u - 0.5) * 2.0;
                        var vh = (v - 0.5) * 2.0;
    
                        var us = sign(uh) * 0.5;
                        var vs = sign(vh) * 0.5;
    
                        u = us * Math.pow(Math.abs(uh), 0.5) + 0.5;
                        v = vs * Math.pow(Math.abs(vh), 1.0) + 0.5;
                    }*/

                    var radu = (u - 0.5) * Math.PI;
                    var radv = (v - 0.5) * Math.PI * 2.0;

                    var sinu = Math.sin(radu);
                    var cosu = Math.cos(radu);
                    var sinv = Math.sin(radv);
                    var cosv = Math.cos(radv);

                    if (n == 0) { sinu = -1.0; cosu = 0.0; }
                    if (n == NumQuadsX) { sinu = 1.0; cosu = 0.0; }
                    if (m == 0) { sinv = 0.0; cosv = -1.0; }
                    if (m == NumQuadsX) { sinv = 0.0; cosv = -1.0; }

                    vertices[vertexIndex + 0] = sinu;
                    vertices[vertexIndex + 1] = cosu;
                    normals[vertexIndex + 0] = sinv;
                    normals[vertexIndex + 1] = cosv;
                    normals[vertexIndex + 2] = radv;

                    vertexIndex += 3;
                }
            }

            var indices = new Int16Array(numIndices);

            var stepSize = 1;
            var ip = 0;
            for (var z = 0; z < NumQuadsX; z += stepSize) {
                for (var x = 0; x < NumQuadsX; x += stepSize) {
                    indices[ip + 0] = Math.min(NumQuadsX, z + stepSize) * numVerticesX + x;
                    indices[ip + 2] = z * numVerticesX + x;
                    indices[ip + 1] = z * numVerticesX + Math.min(NumQuadsX, x + stepSize);

                    indices[ip + 3] = Math.min(NumQuadsX, z + stepSize) * numVerticesX + x;
                    indices[ip + 5] = z * numVerticesX + Math.min(NumQuadsX, x + stepSize);
                    indices[ip + 4] = Math.min(NumQuadsX, z + stepSize) * numVerticesX + Math.min(NumQuadsX, x + stepSize);

                    ip += 6;
                }
            }

            // itemSize = 3 because there are 3 values (components) per vertex
            geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
            geometry.addAttribute('index', new THREE.BufferAttribute(indices, 1));

            Wolkenbruch.SuperQuadric._geo = geometry;
        }

        return Wolkenbruch.SuperQuadric._geo;
    };

    function createMaterial() {
        if (Wolkenbruch.SuperQuadric._mat == null) {

            var mat = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.merge([
                    THREE.UniformsLib['lights'],
                {
                    diffuse_color: { type: 'v4', value: new THREE.Vector4(0.8, 0.8, 0.8, 1.0) },
                    dimensionR: { type: 'v4', value: new THREE.Vector4(0.5, 0.5, 0.5, 0.0) },
                    neRadNS: { type: 'v4', value: new THREE.Vector4(0.5, 0.5, -10.0, 1.0) }
                }]),
                vertexShader: vs,
                fragmentShader: fs,
                lights: true
            });

            Wolkenbruch.SuperQuadric._mat = mat;
        }

        return Wolkenbruch.SuperQuadric._mat.clone();
    }

    var g = getGeometry();
    this.mat = createMaterial();

    this.mesh = new THREE.Mesh(g, this.mat);
    //this.mesh.castShadow = true;
    //this.mesh.position.y = 2;

    this.scene = scene;
    scene.add(this.mesh);
};

Wolkenbruch.SuperQuadric._geo = null;
Wolkenbruch.SuperQuadric._mat = null;

Wolkenbruch.SuperQuadric.prototype = {
    update: function ()
    {
    },
    destroy: function ()
    {
        this.scene.remove(this.mesh);
    }
};
