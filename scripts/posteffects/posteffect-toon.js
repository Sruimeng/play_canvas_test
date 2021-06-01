// --------------- POST EFFECT DEFINITION --------------- //
/**
 * @class
 * @name ToonEffect
 * @classdesc Implements the ToonEffect color filter.
 * @description Creates new instance of the post effect.
 * @augments PostEffect
 * @param {GraphicsDevice} graphicsDevice - The graphics device of the application.
 * @property {number} amount Controls the intensity of the effect. Ranges from 0 to 1.
 */
 function ToonEffect(graphicsDevice) {
    pc.PostEffect.call(this, graphicsDevice);
    this.needsDepthBuffer =true;
    this.matrix = new pc.Mat4();
    this.shader = new pc.Shader(graphicsDevice, {
        attributes: {
            aPosition: pc.SEMANTIC_POSITION
        },
        vshader: [
            (graphicsDevice.webgl2) ? ("#version 300 es\n\n" + pc.shaderChunks.gles3VS) : "",
            "attribute vec2 aPosition;",
            "uniform mat4 viewProjectionMatrix;",
            "uniform mat4 viewProjectionMatrixInverse;",
            "",
            "varying vec2 vUv0;",
            "varying vec3 worldPosition;",
            "",
            "void main(void)",
            "{",
            "    gl_Position = vec4(aPosition, 0.0, 1.0);",
            "    vUv0 = (aPosition.xy + 1.0) * 0.5;",
            "    worldPosition=  (vec4(aPosition, 0.0, 1.0) * viewProjectionMatrix ).xyz ;",
            "}"
        ].join("\n"),
        fshader: [
            (graphicsDevice.webgl2) ? ("#version 300 es\n\n" + pc.shaderChunks.gles3PS) : "",
            "precision " + graphicsDevice.precision + " float;",
            pc.shaderChunks.screenDepthPS,
            "",
            "uniform sampler2D uColorBuffer;",
            "uniform vec4 uResolution;",
            "uniform mat4 viewProjectionMatrix;",
            "uniform mat4 viewProjectionMatrixInverse;",
            "",
            "varying vec2 vUv0;",
            "varying vec3 worldPosition;",
            "",

            

            "vec3 faceNormal(vec3 dpdx, vec3 dpdy) {",
            "    return normalize(cross(dpdx, dpdy));",
            "}",
            "vec3 computeViewSpacePositionFromDepth(vec2 uv, float linearDepth) {",
            "    return vec3((0.5 - uv) * vec2(uResolution.x/uResolution.y, 1.0) * linearDepth, linearDepth);",
            "}",
            "vec3 computeViewSpaceNormal( vec3 position,  vec2 uv) {",
                "     vec2 uvdx = uv + vec2(uResolution.z, 0.0);",
                "     vec2 uvdy = uv + vec2(0.0, uResolution.w);",
                "     vec3 px = computeViewSpacePositionFromDepth(uvdx, -getLinearScreenDepth(uvdx));",
                "     vec3 py = computeViewSpacePositionFromDepth(uvdy, -getLinearScreenDepth(uvdy));",
                // "    highp vec3 camera_position = vec3(0.0,6.0,25.0);",
                // "    highp vec3 dpdx = px - position+camera_position;",
                // "    highp vec3 dpdy = py - position+camera_position;",
                 "    vec3 dpdx = px - position;",
                 "     vec3 dpdy = py - position;",
                "    return faceNormal(dpdx, dpdy);",
                "}",
            "vec3 getViewPositionFromDepth(const vec2 screenPosition, const  float depth)",
            "{",
              "vec3 normalizedDeviceCoordinatesPosition;",
              "normalizedDeviceCoordinatesPosition.xy = (2.0 * screenPosition) / uResolution.xy - 1.0;",
              "normalizedDeviceCoordinatesPosition.z = 2.0 * depth - 1.0;",


              "vec4 clipSpaceLocation;",

              "clipSpaceLocation.w = viewProjectionMatrix[3][2] / (normalizedDeviceCoordinatesPosition.z - (viewProjectionMatrix[2][2] / viewProjectionMatrix[2][3]));",
              "clipSpaceLocation.xyz = normalizedDeviceCoordinatesPosition * clipSpaceLocation.w;",

              "vec4 eyePosition = vec4(worldPosition , 0.0) - (viewProjectionMatrixInverse * clipSpaceLocation);",

              "return eyePosition.xyz / eyePosition.w;",

            "}",

            "vec3 getDeltaNormal( vec2 uv)",
            "{",

              "float depth = getLinearScreenDepth(uv.xy);",
              "vec3 viewPosition = getViewPositionFromDepth( uv.xy, depth);",
              "return computeViewSpaceNormal(viewPosition,uv);",
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

            "",
            "void main() {",
            "    vec4 color = texture2D(uColorBuffer, vUv0);",
            "    float depth = getLinearScreenDepth(vUv0);",
            "    float t = depth;",
            "    vec3 viewPosition = getViewPositionFromDepth( vUv0, depth);",
            "   vec3 nor = computeViewSpaceNormal(viewPosition,vUv0);",
            //"   nor += vec3(.75);",

            "vec3 col = texture(uColorBuffer, vUv0).rgb;",
            "vec2 deltas = getDeltas(vUv0);",
            "if (t > 0.5) {",
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
            "   ",
            "}"
        ].join("\n")
    });

    // Uniforms
    this.amount = 1;
}

ToonEffect.prototype = Object.create(pc.PostEffect.prototype);
ToonEffect.prototype.constructor = ToonEffect;

Object.assign(ToonEffect.prototype, {
    render: function (inputTarget, outputTarget, rect) {
        var device = this.device;
        var scope = device.scope;
        scope.resolve("uColorBuffer").setValue(inputTarget.colorBuffer);
        scope.resolve("uResolution").setValue([device.width, device.height, 1.0 / device.width, 1.0 / device.height]);
        pc.drawFullscreenQuad(device, outputTarget, this.vertexBuffer, this.shader, rect);
    }
});

// ----------------- SCRIPT DEFINITION ------------------ //
var Sepia = pc.createScript('sepia');

Sepia.attributes.add('amount', {
    type: 'number',
    default: 1,
    min: 0,
    max: 1,
    title: 'Amount'
});

// initialize code called once per entity
Sepia.prototype.initialize = function () {
    this.effect = new ToonEffect(this.app.graphicsDevice);
    this.effect.amount = this.amount;

    this.on('attr:amount', function (value) {
        this.effect.amount = value;
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
