/**
 * @constructor
 * @param {MdxModel} model
 * @param {ParticleEmitter2} emitter
 */
function MdxParticleEmitter2(model, emitter) {
    let gl = model.gl;

    mix(this, emitter);

    this.model = model;

    this.head = (this.headOrTail === 0 || this.headOrTail === 2);
    this.tail = (this.headOrTail === 1 || this.headOrTail === 2);
    this.particlesPerEmit = (this.headOrTail === 2) ? 2 : 1;

    this.bytesPerParticle = 4 * 30; // 30 floats per particle

    this.buffer = new ResizeableBuffer(gl);

    this.particles = [];
    this.inactive = [];

    this.cellWidth = 1 / this.columns;
    this.cellHeight = 1 / this.rows;
    this.colors = [];

    var colors = this.segmentColor;
    var alpha = this.segmentAlpha;

    for (let i = 0; i < 3; i++) {
        this.colors[i] = [Math.floor(colors[i][0] * 255), Math.floor(colors[i][1] * 255), Math.floor(colors[i][2] * 255), alpha[i]];
    }

    let node = this.model.nodes[this.node.index];
    this.xYQuad = node.xYQuad;
    this.modelSpace = node.modelSpace;

    this.sd = new MdxSdContainer(model, emitter.tracks);

    // Avoid heap alocations in Particle2.reset
    this.particleLocalPosition = vec3.create();
    this.particlePosition = vec3.create();
    this.particleRotation = mat4.create();
    this.particleVelocity = vec3.create();
    this.particleVelocityStart = vec3.create();
    this.particleVelocityEnd = vec3.create();
    

    this.dimensions = [this.columns, this.rows];

    switch (this.filterMode) {
        // Blend
        case 0:
            this.blendSrc = gl.SRC_ALPHA;
            this.blendDst = gl.ONE_MINUS_SRC_ALPHA;
            break;
        // Additive
        case 1:
            this.blendSrc = gl.SRC_ALPHA;
            this.blendDst = gl.ONE;
            break;
        // Modulate
        case 2:
            this.blendSrc = gl.ZERO;
            this.blendDst = gl.SRC_COLOR;
            break;
        // Modulate 2X
        case 3:
            this.blendSrc = gl.DEST_COLOR;
            this.blendDst = gl.SRC_COLOR;
            break;
        // Add Alpha
        case 4:
            this.blendSrc = gl.SRC_ALPHA;
            this.blendDst = gl.ONE;
            break;
    }
}

MdxParticleEmitter2.prototype = {
    emitParticle(instance, isHead) {
        let size = (this.particles.length + this.particlesPerEmit) * this.bytesPerParticle;

        if (this.buffer.byteLength < size) {
            this.buffer.resize(size);
        }

        let inactive = this.inactive,
            particle;

        if (inactive.length) {
            particle = inactive.pop();
        } else {
            particle = new MdxParticle2(this);
        }

        particle.reset(instance, isHead);

        this.particles.push(particle);
    },

    emit(instance) {
        if (this.head) {
            this.emitParticle(instance, true);
        }

        if (this.tail) {
            this.emitParticle(instance, false);
        }
    },

    update(scene) {
        let particles = this.particles,
            inactive = this.inactive;

        if (particles.length > 0) {
            // First stage: remove dead particles.
            // The used particles array is a queue, dead particles will always come first.
            // As of the time of writing, the easiest and fastest way to implement a queue in Javascript is a normal array.
            // To add items, you push, to remove items, the array is reversed and you pop.
            // So the first stage reverses the array, and then keeps checking the last element for its health.
            // As long as we hit a dead particle, pop, and check the new last element.

            // Ready for pop mode
            particles.reverse();

            let particle = particles[particles.length - 1];
            while (particle && particle.health <= 0) {
                inactive.push(particles.pop());

                // Need to recalculate the length each time
                particle = particles[particles.length - 1];
            }

            // Ready for push mode
            particles.reverse()

            // Second stage: update the living particles.
            // All the dead particles were removed, so a simple loop is all that's required.
            for (let i = 0, l = particles.length; i < l; i++) {
                particles[i].update();
            }

            this.updateHW(scene);
        }
    },

    updateHW(scene) {
        let particles = this.particles;

        var data = this.buffer.float32array;
        var columns = this.columns;
        var particle, position, color;
        var pv1, pv2, pv3, pv4, csx, csy, csz;
        var rect;

        let camera = scene.camera;

        // Choose between a default rectangle or billboarded one
        if (this.xYQuad) {
            rect = camera.vectors;
        } else {
            rect = camera.billboardedVectors;
        }

        pv1 = rect[0];
        pv2 = rect[1];
        pv3 = rect[2];
        pv4 = rect[3];
        csx = rect[4];
        csy = rect[5];
        csz = rect[6];

        var scale, textureIndex, left, top, right, bottom, r, g, b, a, px, py, pz;
        var v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z, v4x, v4y, v4z;
        var lta, lba, rta, rba, rgb;

        for (let i = 0, l = particles.length, index = 0; i < l; i++, index += 30) {
            let particle = particles[i],
                nodeScale = particle.nodeScale;

            position = particle.worldLocation;
            scale = particle.scale;
            textureIndex = particle.index;
            left = textureIndex % columns;
            top = Math.floor(textureIndex / columns);
            right = left + 1;
            bottom = top + 1;
            color = particle.color;
            r = Math.floor(color[0]);
            g = Math.floor(color[1]);
            b = Math.floor(color[2]);
            a = Math.floor(color[3]);
            px = position[0];
            py = position[1];
            pz = position[2];

            if (particle.head) {
                v1x = px + pv1[0] * scale * nodeScale[0];
                v1y = py + pv1[1] * scale * nodeScale[1];
                v1z = pz + pv1[2] * scale * nodeScale[2];
                v2x = px + pv2[0] * scale * nodeScale[0];
                v2y = py + pv2[1] * scale * nodeScale[1];
                v2z = pz + pv2[2] * scale * nodeScale[2];
                v3x = px + pv3[0] * scale * nodeScale[0];
                v3y = py + pv3[1] * scale * nodeScale[1];
                v3z = pz + pv3[2] * scale * nodeScale[2];
                v4x = px + pv4[0] * scale * nodeScale[0];
                v4y = py + pv4[1] * scale * nodeScale[1];
                v4z = pz + pv4[2] * scale * nodeScale[2];
            } else {
                var tailLength = this.tailLength;
                var v = particle.velocity;
                var offsetx = tailLength * v[0];
                var offsety = tailLength * v[1];
                var offsetz = tailLength * v[2];

                var px2 = px + offsetx;
                var py2 = py + offsety;
                var pz2 = pz + offsetz;

                px -= offsetx;
                py -= offsety;
                pz -= offsetz;
                /*
                v1x = px2 - csx[0] * scale + csz[0] * scale;
                v1y = py2 - csx[1] * scale + csz[1] * scale;
                v1z = pz2 - csx[2] * scale + csz[2] * scale;

                v2x = px - csx[0] * scale - csz[0] * scale;
                v2y = py - csx[1] * scale - csz[1] * scale;
                v2z = pz - csx[2] * scale - csz[2] * scale;
                v3x = px + csx[0] * scale - csz[0] * scale;
                v3y = py + csx[1] * scale - csz[1] * scale;
                v3z = pz + csx[2] * scale - csz[2] * scale;
                v4x = px2 + csx[0] * scale + csz[0] * scale;
                v4y = py2 + csx[1] * scale + csz[1] * scale;
                v4z = pz2 + csx[2] * scale + csz[2] * scale;
                */
                v1x = px2 - csx[0] * scale * nodeScale[0];
                v1y = py2 - csx[1] * scale * nodeScale[1];
                v1z = pz2 - csx[2] * scale * nodeScale[2];

                v2x = px - csx[0] * scale * nodeScale[0];
                v2y = py - csx[1] * scale * nodeScale[1];
                v2z = pz - csx[2] * scale * nodeScale[2];

                v3x = px + csx[0] * scale * nodeScale[0];
                v3y = py + csx[1] * scale * nodeScale[1];
                v3z = pz + csx[2] * scale * nodeScale[2];

                v4x = px2 + csx[0] * scale * nodeScale[0];
                v4y = py2 + csx[1] * scale * nodeScale[1];
                v4z = pz2 + csx[2] * scale * nodeScale[2];
            }

            lta = encodeFloat3(left, top, a);
            lba = encodeFloat3(left, bottom, a);
            rta = encodeFloat3(right, top, a);
            rba = encodeFloat3(right, bottom, a);
            rgb = encodeFloat3(r, g, b);

            data[index + 0] = v1x;
            data[index + 1] = v1y;
            data[index + 2] = v1z;
            data[index + 3] = lta;
            data[index + 4] = rgb;

            data[index + 5] = v2x;
            data[index + 6] = v2y;
            data[index + 7] = v2z;
            data[index + 8] = lba;
            data[index + 9] = rgb;

            data[index + 10] = v3x;
            data[index + 11] = v3y;
            data[index + 12] = v3z;
            data[index + 13] = rba;
            data[index + 14] = rgb;

            data[index + 15] = v1x;
            data[index + 16] = v1y;
            data[index + 17] = v1z;
            data[index + 18] = lta;
            data[index + 19] = rgb;

            data[index + 20] = v3x;
            data[index + 21] = v3y;
            data[index + 22] = v3z;
            data[index + 23] = rba;
            data[index + 24] = rgb;

            data[index + 25] = v4x;
            data[index + 26] = v4y;
            data[index + 27] = v4z;
            data[index + 28] = rta;
            data[index + 29] = rgb;
        }
    },

    render(bucket, shader) {
        let model = this.model,
            gl = model.gl,
            particles = this.particles.length;

        if (particles > 0) {
            gl.disable(gl.CULL_FACE);
            gl.enable(gl.DEPTH_TEST);
            gl.depthMask(0);
            gl.enable(gl.BLEND);
            gl.blendFunc(this.blendSrc, this.blendDst);

            gl.uniform2fv(shader.uniforms.get("u_dimensions"), this.dimensions);

            model.bindTexture(model.textures[this.textureId], 0, bucket.modelView);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.buffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.buffer.float32array.subarray(0, particles * 30));

            gl.vertexAttribPointer(shader.attribs.get("a_position"), 3, gl.FLOAT, false, 20, 0);
            gl.vertexAttribPointer(shader.attribs.get("a_uva_rgb"), 2, gl.FLOAT, false, 20, 12);

            gl.drawArrays(gl.TRIANGLES, 0, particles * 6);
        }
    },

    shouldRender(instance) {
        return this.getVisibility(instance) > 0.75;
    },

    getWidth(instance) {
        return this.sd.getValue("KP2W", instance, this.width);
    },

    getLength(instance) {
        return this.sd.getValue("KP2N", instance, this.length);
    },

    getSpeed(instance) {
        return this.sd.getValue("KP2S", instance, this.speed);
    },

    getLatitude(instance) {
        return this.sd.getValue("KP2L", instance, this.latitude);
    },

    getGravity(instance) {
        return this.sd.getValue("KP2G", instance, this.gravity);
    },

    getEmissionRate(instance) {
        return this.sd.getValue("KP2E", instance, this.emissionRate);
    },

    getVisibility(instance) {
        return this.sd.getValue("KP2V", instance, 1);
    }

    //getVariation(sequence, frame, counter) {
    //    return this.sd.getKP2R(sequence, frame, counter, ?);
    //}
};
