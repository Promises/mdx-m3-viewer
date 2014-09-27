  textureHandlers["png"] = Texture;
  textureHandlers["gif"] = Texture;
  textureHandlers["jpg"] = Texture;
  textureHandlers["blp"] = BLPTexture;
  textureHandlers["dds"] = DDSTexture;
  textureHandlers["tga"] = TGATexture;
    
  return {
    setPerspective: setPerspective,
    setOrtho: setOrtho,
    loadIdentity: loadIdentity,
    translate: translate,
    rotate: rotate,
    scale: scale,
    lookAt: lookAt,
    multMat: multMat,
    pushMatrix: pushMatrix,
    popMatrix: popMatrix,
    createShader: createShader,
    shaderStatus: shaderStatus,
    bindShader: bindShader,
    getViewProjectionMatrix: getViewProjectionMatrix,
    getProjectionMatrix: getProjectionMatrix,
    getViewMatrix: getViewMatrix,
    loadTexture: loadTexture,
    unloadTexture: unloadTexture,
    textureOptions: textureOptions,
    bindTexture: bindTexture,
    bindWhiteTexture: bindWhiteTexture,
    createRect: createRect,
    createSphere: createSphere,
    createCube: createCube,
    createCylinder: createCylinder,
    ctx: ctx,
    registerTextureHandler: registerTextureHandler
  };
}