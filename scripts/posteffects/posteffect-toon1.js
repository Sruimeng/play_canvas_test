// --------------- POST EFFECT DEFINITION --------------- //
Object.assign(pc, function () {

    /**
     * @class
     * @name pc.ToonShadeEffect
     * @classdesc Implements the ToonShadeEffect post processing effect.
     * @description Creates new instance of the post effect.
     * @augments pc.PostEffect
     * @param {pc.GraphicsDevice} graphicsDevice - The graphics device of the application.
     */
    var ToonShadeEffect = function (graphicsDevice) {
        pc.PostEffect.call(this, graphicsDevice);

        this.needsDepthBuffer = true;
        this.matrix = new pc.Mat4();

        this.shader = new pc.Shader(graphicsDevice, {
            attributes: {
                aPosition: pc.SEMANTIC_POSITION
            },
            vshader: [
                (graphicsDevice.webgl2) ? ("#version 300 es\n\n" + pc.shaderChunks.gles3VS) : "",
                "in vec4 aPosition;",
                
                "",
                "uniform mat4 matrix_viewProjectionInverse;",
                "uniform mat4 matrix_viewProjection;",
                "out vec3 WorldPos;",
                "out vec2 vUv0;",
                "",
                
                "void main(void)",
                "{",
                
                "gl_Position = vec4(aPosition.xy, 0.0, 1.0);",
                "vUv0 = (aPosition.xy + 1.0) * 0.5;",
                "WorldPos = (aPosition * matrix_viewProjection).xyz;",
                "}"
            ].join("\n"),
            fshader: [
                (graphicsDevice.webgl2) ? ("#version 300 es\n\n" + pc.shaderChunks.gles3PS) : "",
                "precision " + graphicsDevice.precision + " float;",
                pc.shaderChunks.screenDepthPS,
                "",
                "in vec2 vUv0;",
                "in vec3 WorldPos;",
                "",
                "uniform sampler2D uColorBuffer;",
                "",
                "uniform vec2 uResolution;",
                "uniform mat4 matrix_viewProjectionInverse;",
                "uniform mat4 matrix_viewProjection;",
            
                "vec3 getViewNormal( const in vec3 viewPosition )",
                "{",

                    "return normalize( cross( dFdx( viewPosition ), dFdy( viewPosition ) ) );",
                "}",

                "vec3 getViewPositionFromDepth( const in vec2 screenPosition, const in float depth)",
                "{",
                  "vec3 normalizedDeviceCoordinatesPosition;",
                  "normalizedDeviceCoordinatesPosition.xy = (2.0 * screenPosition) / uResolution - 1.0;",
                  "normalizedDeviceCoordinatesPosition.z = 2.0 * depth - 1.0;",


                  "vec4 clipSpaceLocation;",

                  "clipSpaceLocation.w = matrix_viewProjection[3][2] / (normalizedDeviceCoordinatesPosition.z - (matrix_viewProjection[2][2] / matrix_viewProjection[2][3]));",
                  "clipSpaceLocation.xyz = normalizedDeviceCoordinatesPosition * clipSpaceLocation.w;",

                  "vec4 eyePosition = vec4(WorldPos , 0.0) - (matrix_viewProjectionInverse * clipSpaceLocation);",

                  "return eyePosition.xyz / eyePosition.w;",

                "}",

                "mat3 calcLookAtMatrix(const in vec3 origin, const in vec3 target, const in float roll)",
                "{",
                  "vec3 rr = vec3(sin(roll), cos(roll), 0.0);",
                  "vec3 ww = normalize(target - origin);",
                  "vec3 uu = normalize(cross(ww, rr));",
                  "vec3 vv = normalize(cross(uu, ww));",

                  "return mat3(uu, vv, ww);",
                "}",

                "vec3 getRay(const in vec3 origin, const in vec3 target, const in vec2 screenPos, const in float lensLength)", 
                "{",
                  "mat3 camMat = calcLookAtMatrix(origin, target, 0.0);",
                  "return normalize(camMat * vec3(screenPos, lensLength));",
                "}",

                "vec2 squareFrame(const in vec2 screenSize, const in vec2 coord)",
                "{",
                 "vec2 position = 2.0 * (coord.xy / screenSize.xy) - 1.0;",
                  "position.x *= screenSize.x / screenSize.y;",
                  "return position;",
                "}",

                "vec3 getDeltaNormal(const in vec2 uv)",
                "{",

                  "float depth = getLinearScreenDepth(uv.xy);",
                  "vec3 viewPosition = getViewPositionFromDepth( uv.xy, depth);",
                  "return getViewNormal(viewPosition);",
                "}",

                "vec2 getDeltas(const in vec2 uv)",
                "{",
                  "vec2 pixel = vec2(1. / uResolution.xy);",
                  "vec3 pole = vec3(-.75, 0, +.75);",
                  "float dpos = 0.0;",
                  "float dnor = 0.0;",

                  "float d0 = getLinearScreenDepth(uv + pixel.xy * pole.xx);",
                  "float d1 = getLinearScreenDepth(uv + pixel.xy * pole.yx);",
                  "float d2 = getLinearScreenDepth(uv + pixel.xy * pole.zx);",
                  "float d3 = getLinearScreenDepth(uv + pixel.xy * pole.xy);",
                  "float d4 = getLinearScreenDepth(uv + pixel.xy * pole.yy);",
                  "float d5 = getLinearScreenDepth(uv + pixel.xy * pole.zy);",
                  "float d6 = getLinearScreenDepth(uv + pixel.xy * pole.xz);",
                  "float d7 = getLinearScreenDepth(uv + pixel.xy * pole.yz);",
                  "float d8 = getLinearScreenDepth(uv + pixel.xy * pole.zz);",

                  "dpos = (",
                    "abs(d1 - d7) +",
                    "abs(d5 - d3) +",
                    "abs(d0 - d8) +",
                    "abs(d2 - d6)",
                  ") * 0.5;",

                  "vec3 s0 = getDeltaNormal(uv + pixel.xy * pole.xx);",
                  "vec3 s1 = getDeltaNormal(uv + pixel.xy * pole.yx);",
                  "vec3 s2 = getDeltaNormal(uv + pixel.xy * pole.zx);",
                  "vec3 s3 = getDeltaNormal(uv + pixel.xy * pole.xy);",
                  "vec3 s4 = getDeltaNormal(uv + pixel.xy * pole.yy);",
                  "vec3 s5 = getDeltaNormal(uv + pixel.xy * pole.zy);",
                  "vec3 s6 = getDeltaNormal(uv + pixel.xy * pole.xz);",
                  "vec3 s7 = getDeltaNormal(uv + pixel.xy * pole.yz);",
                  "vec3 s8 = getDeltaNormal(uv + pixel.xy * pole.zz);",

                  "dpos += (",
                    "max(0.0, 1.0 - dot(s1.rgb, s7.rgb)) +",
                    "max(0.0, 1.0 - dot(s5.rgb, s3.rgb)) +",
                    "max(0.0, 1.0 - dot(s0.rgb, s8.rgb)) +",
                    "max(0.0, 1.0 - dot(s2.rgb, s6.rgb))",
                  ");",

                  "dpos = pow(max(dpos - 0.5, 0.0), 5.0);",

                  "return vec2(dpos, dnor);",
                "}",
                
                "void main(void)",
                "{",
                
                  "vec4 buf = texture(uColorBuffer, vUv0.xy);",
                  "float depth = getLinearScreenDepth(vUv0.xy);",

                  "float t = depth;",

                    "vec3 viewPosition = getViewPositionFromDepth( vUv0, depth);",
                    "vec3 nor = getViewNormal(viewPosition);",
                  "nor += vec3(.75);",

                  "vec3 col = texture(uColorBuffer, vUv0).rgb;",

                  "vec2 deltas = getDeltas(vUv0);",

                  "if (t > -0.5) {",
                    "col *= max(0.3, 0.5 + dot(nor, normalize(vec3(0, 1, 0.5))));",
                    "col *= vec3(1, 0.8, 0.35);",

                  "}",
                  "col.r = smoothstep(0.1, 1.0, col.r);",
                  "col.g = smoothstep(0.1, 1.1, col.g);",
                  "col.b = smoothstep(-0.1, 1.0, col.b);",
                  "col = pow(col, vec3(.75));",
                  "col -= deltas.x - deltas.y;",
                
                "",
                "gl_FragColor = vec4(col, 1.0);",
                "}" 
            ].join("\n")
        });

    };

    ToonShadeEffect.prototype = Object.create(pc.PostEffect.prototype);
    ToonShadeEffect.prototype.constructor = ToonShadeEffect;

    Object.assign(ToonShadeEffect.prototype, {
        render: function (inputTarget, outputTarget, rect) {
            var device = this.device;
            var scope = device.scope;

             scope.resolve("uColorBuffer").setValue(inputTarget.colorBuffer);
             scope.resolve("uResolution").setValue([device.width, device.height]);
             
            
            var matrixValue = scope.resolve("matrix_viewProjection").getValue();
            this.matrix.set(matrixValue);
            this.matrix.invert();
            scope.resolve("matrix_viewProjectionInverse").setValue(this.matrix.data);

            pc.drawFullscreenQuad(device, outputTarget, this.vertexBuffer, this.shader, rect);
        }
    });

    return {
        ToonShadeEffect: ToonShadeEffect
    };
}());

// ----------------- SCRIPT DEFINITION ------------------ //
var ToonShadingv1 = pc.createScript('toonShadingv1');


ToonShadingv1.prototype.initialize = function () {
    this.effect = new pc.ToonShadeEffect(this.app.graphicsDevice);
    this.effect.time = 0;
    this.effect.resolution = [this.app.graphicsDevice.width, this.app.graphicsDevice.height];

    this.on('attr', function (name, value) {
        this.effect[name] = value;
    }, this);

    var queue = this.entity.camera.postEffects;

    queue.addEffect(this.effect);

    this.on('state', function (enabled) {
        if (enabled) {
            queue.addEffect(this.effect);
        } else {
            queue.removeEffect(this.effect);
        }
    });

    this.on('destroy', function () {
        queue.removeEffect(this.effect);
    });
};


