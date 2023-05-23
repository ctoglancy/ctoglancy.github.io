

export const DESIGN = 0
export const SETUP = 1
export const RENDER = 2
export const canvasResolution = 10



const envMaps = {
    'Royal Esplanade': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/royal_esplanade_1k.hdr',
    'Moonless Golf': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/moonless_golf_1k.hdr',
    'Overpass': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/pedestrian_overpass_1k.hdr',
    'Venice Sunset': 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/venice_sunset_1k.hdr',
    'Small Studio': 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/master/hdri/studio_small_05_1k.hdr',
    'Pfalzer Forest': 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/master/hdri/phalzer_forest_01_1k.hdr',
    'Leadenhall Market': 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/master/hdri/leadenhall_market_1k.hdr',
    'Kloppenheim': 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/master/hdri/kloppenheim_05_1k.hdr',
    'Hilly Terrain': 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/master/hdri/hilly_terrain_01_1k.hdr',
    'Circus Arena': 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/master/hdri/circus_arena_1k.hdr',
    'Chinese Garden': 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/master/hdri/chinese_garden_1k.hdr',
    'Autoshop': 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/master/hdri/autoshop_01_1k.hdr',
};


export let params = {

    multipleImportanceSampling: true,
    acesToneMapping: true,
    resolutionScale: 1 / window.devicePixelRatio,
    tilesX: 2,
    tilesY: 2,
    samplesPerFrame: 1,
    resolution: '1k',
    ratio: '16:9',
    envMap: envMaps['Royal Esplanade'],
    gradientTop: '#bfd8ff',
    gradientBottom: '#ffffff',

    environmentIntensity: 0.7,
    environmentBlur: 0.0,
    environmentRotation: 0,

    cameraProjection: 'Perspective',

    backgroundType: 'Gradient',
    bgGradientTop: '#111111',
    bgGradientBottom: '#000000',
    backgroundAlpha: 1.0,
    checkerboardTransparency: true,

    enable: true,
    bounces: 3,
    transparentTraversals: 20,
    filterGlossyFactor: 0.5,
    pause: false,

    floorColor: '#080808',
    floorOpacity: 1.0,
    floorRoughness: 0.1,
    floorMetalness: 0.0

};



export const isInImage = (region, x, y, image, ctx) => {
    // rotate region according to image rotation and scale and minwidth and height and check if point is inside it using context.isPointInPath
    ctx.save()

    ctx.translate(region.x + region.width / 2, region.y + region.height / 2)
    ctx.rotate(image.rotation * Math.PI / 50)
    ctx.translate(-region.x - region.width / 2, -region.y - region.height / 2)

    ctx.beginPath()
    ctx.rect(region.x, region.y, region.width, region.height)
    var isInPath = ctx.isPointInPath(x, y)
    ctx.restore()
    return isInPath
}

export const isInText = (region, x, y, text, ctx) => {
    // rotate region according to text rotation and check if point is inside it using context.isPointInPath
    ctx.save()
    ctx.translate(region.x + region.width / 2, region.y + region.height / 2)
    ctx.rotate(text.rotation * Math.PI / 50)
    ctx.translate(-region.x - region.width / 2, -region.y - region.height / 2)
    ctx.beginPath()
    ctx.rect(region.x, region.y, region.width, region.height)
    var isInPath = ctx.isPointInPath(x, y)
    ctx.restore()
    return isInPath
}

