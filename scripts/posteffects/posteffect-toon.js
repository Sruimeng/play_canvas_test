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
            "    worldPostion=  (vec4(aPosition, 0.0, 1.0) * viewProjectionMatrix ).xyz ;",
            "}"
        ].join("\n"),
        fshader: [
            (graphicsDevice.webgl2) ? ("#version 300 es\n\n" + pc.shaderChunks.gles3PS) : "",
            "precision " + graphicsDevice.precision + " float;",
            pc.shaderChunks.screenDepthPS,
            "",
            "uniform sampler2D uColorBuffer;",
            "uniform vec4 camera_params;",
            "uniform mat4 viewProjectionMatrix;",
            "uniform mat4 viewProjectionMatrixInverse;",
            "",
            "varying vec2 vUv0;",
            "varying vec3 worldPostion;",

            "",
            "void main() {",
            "    vec4 color = texture2D(uColorBuffer, vUv0);",
            "    float depth = getLinearScreenDepth(vUv0);",
            "",
            "    gl_FragColor = color;",
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
        scope.resolve("uResolution").setValue(device.width/device.height);
        scope.resolve("uColorBuffer").setValue(inputTarget.colorBuffer);
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
