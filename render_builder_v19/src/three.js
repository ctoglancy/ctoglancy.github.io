import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from './utils/TransformControls.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { RGBELoader } from 'three/examples/jsm/loaders/rgbeloader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import * as dat from 'lil-gui'

import './global'

import Interface from './interface';

import './style.css'

import {
    PathTracingRenderer,
    PhysicalPathTracingMaterial,
 BlurredEnvMapGenerator, 
} from 'three-gpu-pathtracer';
import { Box3, Vector3 } from 'three';
import { DESIGN, SETUP, RENDER, canvasResolution, params } from './global';
let delaySamples = 0;

var ratioObject = {
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '3:4': 3 / 4,
    '9:16': 9 / 16,
}


class WebGL {
    constructor() {
        this.gui = new dat.GUI();
        this.animate = this.animate.bind(this);
        this.transformControls = null
        this.transforming = false
        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000)
        this.dontReset = false
        this.dragged = false
        this.renderer = new THREE.WebGLRenderer(
            {
                antialias: true,
                alpha: false,
                preserveDrawingBuffer: true
            }
        )
        this.loadedScene = null
        this.renderer.physicallyCorrectLights = false

        // this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        // this.renderer.outputEncoding = THREE.sRGBEncoding
        // this.renderer.setClearColor(0xff0000, 0);
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        // this.controls.enabled = false
        this.object = new THREE.Mesh(
            new THREE.BufferGeometry(),
            new THREE.MeshPhysicalMaterial()
        )
        this.objectList = []
        this.params = { color: 0x202020, url: 'objects/dove/dove_vf.obj' }
        this.canvasTextures = []
        this.children = []
        this.raycaster = new THREE.Raycaster()
        this.mouse = {}
        this.currentMode = DESIGN
        this.interface = null
        this.realRenderer = {}
        this.isDown = false
        this.intersects = []
        this.lastIntersected = null
        this.autoSpin = false
        this.placingImage = false
        this.placingText = false
        this.textToPlace = null
        this.imageToPlace = null
        this.ptRenderer = null
        this.render = false
        this.dirLight = null
        this.envMapGenerator
        this.thirdGroup = new THREE.Group()
        this.fourthGroup = new THREE.Group()
        this.secondGroup = new THREE.Group()
        this.centerGroup = new THREE.Group()
        this.speedX = 0
        this.speedY = 0
        this.allowRotate = true
        this.lightsFolder = null
        this.targetFolder = null
        this.frustum = new THREE.Frustum()
        this.cameraViewProjectionMatrix = new THREE.Matrix4()
        this.iesProfiles = null
        this.selectedObjectId = 1

    }
    init() {
        this.initScene()
        return this
    }
    initScene() {
        this.mouse = { x: 0, y: 0 }
        this.camera.position.z = 50
        // this.scene.background = new THREE.Color('#202020')
        this.controls.enableDamping = false
        this.controls.dampingFactor = 0.1
        if (window.innerWidth >= 1000) {
            this.controls.enableRotate = false

        }
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.raycaster.setFromCamera(this.mouse, this.camera);
        this.renderer.domElement.id = 'three'
        var container = document.getElementsByClassName('container')[0]
        container.appendChild(this.renderer.domElement);
        this.renderer.autoClear = false


        // this.ptRenderer.material.bgGradientTop.set(params.bgGradientTop);
        // this.ptRenderer.material.bgGradientBottom.set(params.bgGradientBottom);
        this.samplesEl = document.getElementById('samples');
    
        var resolutionObject = {
            '1K': 1920 * 1080,
            '2K': 2048 * 1440,
            '4K': 3840 * 2160,
        }
        const desiredResolution = params.resolution.toUpperCase()
        const resolution = resolutionObject[desiredResolution]
        this.handleResolutionChange(resolution)
        this.envMapGenerator = new BlurredEnvMapGenerator(this.renderer);

        window.addEventListener('mousemove', (event) => {
            this.onMouseMove(event)
        })
        // touch move
        this.renderer.domElement.addEventListener('touchmove', (event) => {
            this.onTouchMove(event)
        })
        // touch start
        window.addEventListener('touchstart', (event) => {
            this.onTouchStart(event)
        })
        // touch end
        window.addEventListener('touchend', (event) => {
            this.onTouchEnd(event)
        })
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            this.onMouseDown(event)
        })
        this.renderer.domElement.addEventListener('mouseup', (event) => {
            this.onMouseUp(event)
        })
        // Resize
        this.renderer.domElement.addEventListener('resize', (e) => {
            this.onResize()
        })

        var _this = this

        const load_button = document.getElementById('load-button')
        load_button.addEventListener('change', (e) => {
            _this.loadFbxGlb(e.target.files[0]);
        }
        )

        // _this.startRealRender()
        const render_button = document.getElementById('render-button')
        render_button.addEventListener('click', () => {
            if (_this.currentMode === DESIGN) {
                this.materialFolder.close()
                _this.currentMode = SETUP
                _this.controls.enableRotate = true
                document.getElementById('transform-mode').style.display = 'block'
                render_button.innerHTML = 'RENDER'
                render_button.style.backgroundColor = '#acacac'
                // _this.startSceneSetup()
                _this.interface.listScenes()

                const duplicateButton = document.getElementById('duplicate')
                duplicateButton.addEventListener('click', () => {
                    _this.duplicateObject(_this.objectList.length > 1 ? _this.objectList[_this.selectedObjectId - 1].parent.parent : _this.object.parent.parent)
                })
                duplicateButton.style.display = 'block'

                const removeButton = document.getElementById('remove')
                removeButton.addEventListener('click', () => {
                    console.log(_this.selectedObjectId, _this.objectList.length > 1);
                    _this.removeObject(_this.objectList.length > 1 ? _this.objectList[_this.selectedObjectId - 1].parent.parent : _this.object.parent.parent, _this.selectedObjectId - 1)
                })
                removeButton.style.display = 'block'
            } else if (_this.currentMode === SETUP) {
                this.realRenderer = new RealRenderer({
                    gl: this
                }).create();
                this.ptRenderer = this.realRenderer.ptRenderer;
        
                _this.realRenderer.start()
                // _this.startRealRender()
                

            }
        }
        )

        this.addLights()
        this.initGUI()
        this.animate()
        this.resizeWithRatio(ratioObject[params.ratio])
        params.ratio = '4:3'
        this.handleResolutionChange(window.innerWidth * window.innerHeight)

    }
    initGUI() {
        this.gui.domElement.id = 'gui'
        var container = document.getElementsByClassName('container')[0]
        container.appendChild(this.gui.domElement);
        const globalFolder = this.gui.addFolder('Global')
        const objectFolder = this.gui.addFolder('Object')
        this.materialFolder = this.gui.addFolder('Material')
        this.scene.background = new THREE.Color('#202020')
        globalFolder.addColor(this.params, 'color').onChange(() => {
            this.onBackgroundColorChange()
        }).name('Background Color')

        this.gui.add(this, 'autoSpin').name('Auto Spin')

        var resolutions =
        {
            'Resolution': '',

        }


        const qualityButton = document.getElementById('quality-button')
        qualityButton.addEventListener('click', () => {

            if (params.resolution == '1k') {
                params.resolution = '2k'
            } else if (params.resolution == '2k') {
                params.resolution = '4k'
            }
            else if (params.resolution == '4k') {
                params.resolution = '1k'
            }

            var resolutionObject = {
                '1K': 1920 * 1080,
                '2K': 2048 * 1440,
                '4K': 3840 * 2160,
            }
            const desiredResolution = params.resolution.toUpperCase()
            const resolution = resolutionObject[desiredResolution]
            console.log(desiredResolution, resolution);
            this.handleResolutionChange(resolution)
            qualityButton.innerHTML = 'Quality ' + params.resolution.toUpperCase()


        });

        const ratioButton = document.getElementById('ratio-button')
        ratioButton.addEventListener('click', () => {

            const desiredRatio = params.ratio
            const ratio = ratioObject[desiredRatio]
            this.handleRatioChange(ratio)


        });



        objectFolder.add(this.params, 'url').name('OBJ URL:').onFinishChange(() => {
            this.loadOBJ(this.params.url)
        })
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.addEventListener('change', (e) => {

            console.log(e.target.files);
            const files = Array.from(e.target.files)

            const objFile = files.filter(file => file.name.includes('.obj'))[0]
            const mtlFile = files.filter(file => file.name.includes('.mtl'))[0]

            console.log(mtlFile, objFile);


            this.loadOBJ(URL.createObjectURL(objFile), URL.createObjectURL(mtlFile))
        })

        var obj = {
            'Load OBJ': () => {
                input.click()
            }

        }
        objectFolder.add(obj, 'Load OBJ').name('Load OBJ & MTL')

        // this.loadOBJ(this.params.url)

        this.gui.add(this.controls, 'enableZoom').name('Enable Zoom');

        const objLoad = {
            'Load Session': () => {
                this.loadSession()
            }
        }
        globalFolder.add(objLoad, 'Load Session').name('Load Session');

        const objSave = {
            'Save Session': () => {
                this.saveSession()
            }
        }
        globalFolder.add(objSave, 'Save Session').name('Save Session');

        this.gui.add(params, 'resolutionScale').min(0.1).max(2).step(0.1).name('Resolution Scale').onChange(() => {
            this.onResize()
        }
        )


    }
    handleResolutionChange(value) {
        var desiredResolution = value
        var currentResolution = window.innerWidth * window.innerHeight
        var scale = Math.sqrt(desiredResolution / currentResolution)
        var neededPixelRatio = scale / window.devicePixelRatio
        this.renderer.setPixelRatio(neededPixelRatio)
    }
    resizeWithRatio(value) {
        const maxWidth = window.innerWidth / 1.2
        const maxHeight = window.innerHeight / 1.3


        const width = maxWidth * params.resolutionScale
        const height = maxHeight * params.resolutionScale

        const ratio = width / height
        if (ratio > value) {
            this.renderer.setSize(height * value, height)
        } else {
            this.renderer.setSize(width, width / value)
        }
        this.camera.aspect = this.renderer.domElement.width / this.renderer.domElement.height
        this.camera.updateProjectionMatrix()

        // center domelement in screen
        this.renderer.domElement.style.position = 'absolute'
        this.renderer.domElement.style.left = '50%'
        this.renderer.domElement.style.top = '50%'
        this.renderer.domElement.style.transform = 'translate(-50%, -50%)'


    }
    handleRatioChange(value) {


        this.resizeWithRatio(value)


        setTimeout(() => {
            this.renderer.domElement.style.border = '1px solid #b8ff8f'
            // border radius 10px
            this.renderer.domElement.style.borderRadius = '10px'
        }
            , 100)


        setTimeout(() => {
            this.renderer.domElement.style.border = 'none'
        }
            , 1000)

        document.getElementById('ratio-button').innerHTML = 'Ratio ' + params.ratio

        if (params.ratio == '16:9') {
            params.ratio = '4:3'
        } else if (params.ratio == '4:3') {

            params.ratio = '3:4'
        } else if (params.ratio == '3:4') {

            params.ratio = '9:16'
        } else if (params.ratio == '9:16') {
            params.ratio = '16:9'
        }





    }

    saveSession() {
        var object = {}
        // for (var i = 0 ; i < gl.object.children.length ; i++) {
        //     object[i] = {
        //         geometry: gl.object.children[i].geometry.toJSON(),
        //     }

        //     var material = gl.object.children[i].material
        //     if (Array.isArray(material)) {
        //         object[i].material = []
        //         for (var j = 0 ; j < material.length ; j++) {
        //             object[i].material.push(material[j].toJSON())
        //         }
        //     } else {
        //         object[i].material = material.toJSON()
        //     }
        //     console.log(object);
        // }

        object = gl.object.parent.parent.parent.toJSON()
        console.log('object is', object);

        var imagesObject = {}
        for (var i = 0; i < this.interface.images.length; i++) {
            imagesObject[i] = {}
            console.log(this.interface.images[i]);
            for (var j = 0; j < this.interface.images[i].length; j++) {
                var imageObjCopy = Object.assign({}, this.interface.images[i][j])
                // to data URL
                imageObjCopy.image = imageObjCopy.image.src
                imagesObject[i][j] = JSON.stringify(imageObjCopy)
            }

        }

        var textObject = {}

        for (var i = 0; i < this.interface.texts.length; i++) {
            textObject[i] = {}

            for (var j = 0; j < this.interface.texts[i].length; j++) {
                var textObjCopy = Object.assign({}, this.interface.texts[i][j])
                textObject[i][j] = JSON.stringify(textObjCopy)
            }

        }

        var imagesAndText = 'text:' + JSON.stringify(textObject) + 'images:' + JSON.stringify(imagesObject)

        var string = JSON.stringify(object) + 'canvases:' + imagesAndText

        console.log(imagesObject);

        // download JSON
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(string);
        var dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "session.json");
        dlAnchorElem.click();

    }
    loadSession() {

        var input = document.createElement('input')
        input.type = 'file'
        var once = true
        input.addEventListener('change', (e) => {

            var file = e.target.files[0]
            const reader = new FileReader()
            reader.onload = (event) => {

                const firstPart = event.target.result.split('canvases:')[0]
                var imagesAndText = event.target.result.split('canvases:')[1]
                const jsonLoader = new THREE.ObjectLoader();
                const jsonString = JSON.parse(firstPart);
                jsonLoader.parse(
                    jsonString,
                    (obj) => {
                        if (once) {
                            this.loadObject(obj, imagesAndText)

                            once = false
                        }
                    }
                );
            }
            reader.readAsText(file)

        })
        input.click()

    }
    addLights() {
        this.lightsFolder = this.gui.addFolder('Lights')

        this.dirLight = new THREE.DirectionalLight(0xffffff, 1, 0);
        this.dirLight.position.set(0, 200, -43);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.bias = -0.03;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        // near and far very far
        var side = 1000
        this.dirLight.shadow.camera.top = side;
        this.dirLight.shadow.camera.bottom = -side;
        this.dirLight.shadow.camera.left = side;
        this.dirLight.shadow.camera.right = -side;

        this.thirdGroup.add(this.dirLight.target)

        // add intensity to global folder
        this.lightsFolder.add(this.dirLight, 'intensity', 0, 2, 0.01).name('Light Intensity')
        this.lightsFolder.add(this.dirLight.position, 'x', -100, 100, 1).name('Light X')
        this.lightsFolder.add(this.dirLight.position, 'y', -100, 200, 1).name('Light Y')
        this.lightsFolder.add(this.dirLight.position, 'z', -100, 100, 1).name('Light Z')

        // add light target to gui
        this.targetFolder = this.lightsFolder.addFolder('Light Target')
        this.targetFolder.add(this.dirLight.target.position, 'x', -100, 100, 1).name('Target X')
        this.targetFolder.add(this.dirLight.target.position, 'y', -100, 100, 1).name('Target Y')
        this.targetFolder.add(this.dirLight.target.position, 'z', -100, 100, 1).name('Target Z')




        //set bias to -0.001
        this.thirdGroup.add(this.dirLight);


        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.thirdGroup.add(ambientLight);

        // add ambient light to gui
        this.lightsFolder.add(ambientLight, 'intensity', 0, 2, 0.01).name('Ambient Light Intensity').onChange((value) => {
            ambientLight.intensity = value
            params.environmentIntensity = value / 2
        })
    }
    loadObject(object, imagesAndText) {
        this.objectList = []
        var imagesString = imagesAndText.split('images:')[1]
        var textString = imagesAndText.split('images:')[0].split('text:')[1]

        var imagesObject = JSON.parse(imagesString)
        var textObject = JSON.parse(textString)

        var texts = [], images = []

        var _this = this
        _this.children = []
        _this.materialFolder.destroy()
        _this.materialFolder = _this.gui.addFolder('Material')
        if (_this.object.parent) {
            _this.object.parent.remove(_this.object)
            _this.secondGroup.removeFromParent()
            _this.centerGroup.removeFromParent()
        }
        console.log(object);
        // where child nameis secondgroup
        _this.object = object.children.find(child => child.name === 'secondGroup').children[0].children[0]
        console.log(_this.object);
        console.log(object);
        _this.objectList.push(_this.object)
        var canvases = {
            text: [],
            image: []
        }

        _this.object.traverse((child) => {

            texts.push([])
            images.push([])
     
                console.log(imagesObject);
            if (child.isMesh) {
                var i = _this.children.length
                _this.children.push(child)
                child.frustumCulled = true
                // to non indexed
                var currentImageObject = imagesObject[i]
                var currentTextObject = textObject[i]

                for (var k = 0; k < Object.entries(currentImageObject).length; k++) {
                    const imageObj = JSON.parse(Object.entries(currentImageObject)[k][1])
                    const image = new Image()
                    image.id = i

                    image.onload = function () {
                        imageObj.image = image
                        _this.interface.images[image.id].push(imageObj)
                        // draw on canvas
                        _this.interface.ctx = _this.interface.canvases.image[image.id].getContext('2d')
                        _this.interface.draw(_this.interface.canvases.image[image.id].getContext('2d'), image.id)
                    }
                    image.src = imageObj.image
                    console.log(Object.entries(currentImageObject)[k]);


                }
                for (var k = 0; k < Object.entries(currentTextObject).length; k++) {
                    var textObj = JSON.parse(Object.entries(currentTextObject)[k][1])
                    texts[i].push(textObj)
                    // draw on canvas
                    // _this.interface.ctx = _this.interface.canvases.text[textObj.name].getContext('2d')
                    // _this.interface.draw(_this.interface.canvases.text[textObj.name].getContext('2d'), textObj.name)
                }
                var canvasTxt, canvasTxt2
                for (var j = 0; j < 2; j++) {
                    var canvas = document.createElement('canvas')

                    canvas.width = 180 * canvasResolution
                    canvas.height = 180 * canvasResolution
                    // change to 0
                    canvas.id = i.toString()
                    canvas.className = 'drawCanvas'
                    canvas.style.transformOrigin = 'left top'
                    canvas.style.transform = 'scale(' + 1 / canvasResolution + ')'
                    if (j == 0) {
                        canvases.image.push(canvas)
                        canvasTxt2 = new THREE.CanvasTexture(canvas)

                    } else {
                        canvases.text.push(canvas)
                        canvasTxt = new THREE.CanvasTexture(canvas)

                    }
                }

                canvasTxt.needsUpdate = true
                applyMapSettings(canvasTxt)

                canvasTxt2.needsUpdate = true
                applyMapSettings(canvasTxt2)
                _this.canvasTextures.push(canvasTxt, canvasTxt2)

                var currentMat = child.material[0]
                const childStandardMaterial = new THREE.MeshPhysicalMaterial({
                    transparent: currentMat.transparent,
                    alphaTest: 0,
                    emissive: currentMat.emissive,
                    emissiveIntensity: currentMat.emissiveIntensity,
                    // normalMap: currentMat.normalMap,
                    normalScale: currentMat.normalScale,
                    specularColor: 0xffffff, specularIntensity: 1, color: currentMat.color, map: currentMat.map, roughness: 1 - currentMat.shininess / 100, reflectivity: currentMat.reflectivity, opacity: currentMat.opacity,
                    metalness: currentMat.metalness,
                    roughness: currentMat.roughness,
                    envMap: currentMat.envMap,
                    envMapIntensity: currentMat.envMapIntensity,
                    ior: currentMat.ior,
                    reflectivity: currentMat.reflectivity,
                    metalnessMap: currentMat.metalnessMap,
                    roughnessMap: currentMat.roughnessMap,
                    clearcoat: currentMat.clearcoat,
                    clearcoatRoughness: currentMat.clearcoatRoughness,
                    transmission: currentMat.transmission,
                    side: currentMat.side,

                })


                var clonePhysical = new THREE.MeshPhysicalMaterial().copy(childStandardMaterial)
                clonePhysical.map = null
                clonePhysical.alphaTest = 0.5

                var mapMaterial = child.material[1]
                const childMapMaterial = new THREE.MeshPhysicalMaterial().copy(clonePhysical)
                childMapMaterial.map = mapMaterial.map
                childMapMaterial.normalMap = mapMaterial.normalMap
                // only maps for childMapMaterial
                childMapMaterial.roguhnessMap = mapMaterial.roguhnessMap
                childMapMaterial.metalnessMap = mapMaterial.metalnessMap
                childMapMaterial.aoMap = mapMaterial.aoMap
                childMapMaterial.envMap = mapMaterial.envMap
                childMapMaterial.specularColorMap = mapMaterial.specularColorMap
                childMapMaterial.specularIntensityMap = mapMaterial.specularIntensityMap
                childMapMaterial.iorMap = mapMaterial.iorMap
                childMapMaterial.reflectivityMap = mapMaterial.reflectivityMap
                childMapMaterial.clearcoatMap = mapMaterial.clearcoatMap
                childMapMaterial.clearcoatRoughnessMap = mapMaterial.clearcoatRoughnessMap
                childMapMaterial.color = new THREE.Color(0xffffff)

                childMapMaterial.alphaTest = 0.5
                console.log(childMapMaterial);
                childMapMaterial.transparent = true
                childMapMaterial.opacity = mapMaterial.map != null ? 1 : 0

                const canvasMaterial = new THREE.MeshPhysicalMaterial().copy(clonePhysical)
                const canvasMaterial2 = new THREE.MeshPhysicalMaterial().copy(clonePhysical)
                // canvasMaterial.map = child.material[2].map
                // canvasMaterial2.map = child.material[3].map
                canvasMaterial.color = new THREE.Color(0xffffff)
                canvasMaterial2.color = new THREE.Color(0xffffff)

                canvasMaterial.alphaTest = 0
                canvasMaterial2.alphaTest = 0
                canvasMaterial.transmission = 0
                canvasMaterial2.transmission = 0
                canvasMaterial.transparent = true
                canvasMaterial2.transparent = true
                _this.colorMaterial = new THREE.MeshPhysicalMaterial().copy(clonePhysical)

                childStandardMaterial.name = 'standard'
                childMapMaterial.name = 'map'
                canvasMaterial.name = 'canvas'
                canvasMaterial2.name = 'canvas2'



                let geometry = child.geometry;

                geometry.clearGroups();

                geometry.addGroup(0, Infinity, 0); // z index 0
                geometry.addGroup(0, Infinity, 1); // z index 1
                geometry.addGroup(0, Infinity, 2); // z index 2
                geometry.addGroup(0, Infinity, 3); // z index 2


                child.material = [childStandardMaterial, childMapMaterial, canvasMaterial2, canvasMaterial,]



                const currentFolder = _this.materialFolder.addFolder(child.name)
                const changedChild = _this.object.getObjectByName(currentFolder.$title.textContent)


                currentFolder.add(child.material[0], 'metalness', 0, 1, 0.01).name('Metalness').onChange(function () {
                    changedChild.material[1].metalness = changedChild.material[0].metalness
                    changedChild.material[2].metalness = changedChild.material[0].metalness
                    changedChild.material[3].metalness = changedChild.material[0].metalness
                })

                // add transparency toggle
                currentFolder.add(child.material[1], 'transparent').name('Transparent').onChange(function (e) {
                    changedChild.material[0].transparent = e
                    changedChild.material[2].transparent = e
                    changedChild.material[3].transparent = e

                    if (e == true) {
                        //alphatest  0
                        changedChild.material[1].alphaTest = 0
                        changedChild.material[0].alphaTest = 0

                        changedChild.material[2].alphaTest = 0
                        changedChild.material[3].alphaTest = 0

                    } else {
                        changedChild.material[1].alphaTest = 0.5
                        changedChild.material[0].alphaTest = 0.5
                        changedChild.material[2].alphaTest = 0.5
                        changedChild.material[3].alphaTest = 0.5
                    }
                    // needs update
                    changedChild.material[0].needsUpdate = true
                    changedChild.material[1].needsUpdate = true
                    changedChild.material[2].needsUpdate = true
                    changedChild.material[3].needsUpdate = true
                })


                currentFolder.add(child.material[0], 'roughness', 0, 1, 0.01).name('Roughness').onChange(function () {

                    changedChild.material[1].roughness = changedChild.material[0].roughness
                    changedChild.material[2].roughness = changedChild.material[0].roughness
                    changedChild.material[3].roughness = changedChild.material[0].roughness

                })
                currentFolder.add(child.material[0], 'opacity', 0, 1, 0.01).name('Opacity').onChange(function () {

                    if (changedChild.material[1].map != undefined || changedChild.material[1].opacity != 0) {
                        changedChild.material[1].opacity = changedChild.material[0].opacity
                    }

                    // changedChild.material[2].opacity = changedChild.material[0].opacity
                    // changedChild.material[3].opacity = changedChild.material[0].opacity

                })
                currentFolder.add(child.material[0], 'reflectivity', 0, 1, 0.01).name('Reflectivity').onChange(function () {


                    changedChild.material[1].reflectivity = changedChild.material[0].reflectivity
                    changedChild.material[2].reflectivity = changedChild.material[0].reflectivity
                    changedChild.material[3].reflectivity = changedChild.material[0].reflectivity

                })
                currentFolder.add(child.material[0], 'ior', 1.0, 2.333, 0.01).name('Refraction').onChange(function () {

                    changedChild.material[1].ior = changedChild.material[0].ior
                    changedChild.material[2].ior = changedChild.material[0].ior
                    changedChild.material[3].ior = changedChild.material[0].ior

                })

                currentFolder.add(child.material[0], 'transmission', 0.0, 1.0, 0.01).name('Transmission').onChange(function () {
                    changedChild.material[1].transmission = changedChild.material[0].transmission
                    // changedChild.material[2].transmission = changedChild.material[0].transmission
                    // changedChild.material[3].transmission = changedChild.material[0].transmission

                })

                currentFolder.add(child.material[0], 'thickness', 0, 10, 0.01).name('Thickness').onChange(function () {
                    changedChild.material[1].thickness = changedChild.material[0].thickness
                    changedChild.material[2].thickness = changedChild.material[0].thickness
                    changedChild.material[3].thickness = changedChild.material[0].thickness

                })


                currentFolder.add(child.material[0], 'clearcoat', 0, 1, 0.01).name('ClearCoat').onChange(function () {
                    changedChild.material[1].clearcoat = changedChild.material[0].clearcoat
                    changedChild.material[2].clearcoat = changedChild.material[0].clearcoat
                    changedChild.material[3].clearcoat = changedChild.material[0].clearcoat

                })

                currentFolder.add(child.material[0], 'clearcoatRoughness', 0, 1, 0.01).name('ClearCoat Roughness').onChange(function () {
                    changedChild.material[1].clearcoatRoughness = changedChild.material[0].clearcoatRoughness
                    changedChild.material[2].clearcoatRoughness = changedChild.material[0].clearcoatRoughness
                    changedChild.material[3].clearcoatRoughness = changedChild.material[0].clearcoatRoughness

                })



                const obj = {
                    url: 'objects/dove/texture5.jpg',
                    normalMap: 'objects/sofa2/sofa2.png',
                    metalnessMap: 'objects/sofa2/sofa2.png',
                    roughnessMap: 'objects/sofa2/sofa2.png',
                    specularMap: 'objects/sofa2/sofa2.png',
                    environmentMap: 'img/grid.jpg',
                    aoMap: 'img/grid.jpg',

                }
                currentFolder.add(obj, 'url').name('MATERIAL URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.url)
                    applyMapSettings(map)
                    changedChild.material[1].map = map
                    changedChild.material[1].needsUpdate = true
                    changedChild.material[1].opacity = 1
                    _this.realRenderer.reset()
                })
                currentFolder.add(obj, 'normalMap').name('Normal URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.normalMap)
                    applyMapSettings(map)
                    changedChild.material[1].normalMap = map
                    changedChild.material[1].normalScale = new THREE.Vector2(1.0, 1.0)
                    changedChild.material[1].needsUpdate = true
                    console.log('APPLIED NORMAL MAP', changedChild.material[1].normalMap);

                })
                currentFolder.add(obj, 'metalnessMap').name('Metalness URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.metalnessMap)
                    applyMapSettings(map)
                    changedChild.material[1].metalnessMap = map
                    changedChild.material[1].needsUpdate = true
                })
                currentFolder.add(obj, 'roughnessMap').name('Roughness URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.roughnessMap)
                    applyMapSettings(map)
                    changedChild.material[1].roughnessMap = map
                    changedChild.material[1].needsUpdate = true
                })
                currentFolder.add(obj, 'specularMap').name('Specular URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.specularMap)
                    applyMapSettings(map)
                    changedChild.material[1].specularColorMap = map

                    changedChild.material[1].needsUpdate = true

                    changedChild.material[2].specularColorMap = map
                    changedChild.material[2].needsUpdate = true

                    changedChild.material[3].specularColorMap = map
                    changedChild.material[3].needsUpdate = true



                })

                currentFolder.add(obj, 'environmentMap').name('Environment URL:').onFinishChange(function () {
                    new THREE.TextureLoader().load(obj.environmentMap, (map) => {
                        // _this.scene.background = map
                        applyMapSettings(map)
                        map.mapping = THREE.EquirectangularReflectionMapping
                        var pmrem = new THREE.PMREMGenerator(_this.renderer)
                        pmrem.compileEquirectangularShader()
                        console.log(map);
                        var envMap = pmrem.fromEquirectangular(map).texture
                        changedChild.material[1].envMap = envMap
                        changedChild.material[1].needsUpdate = true
                        changedChild.material[0].envMap = envMap
                        changedChild.material[0].needsUpdate = true
                        changedChild.material[2].envMap = envMap
                        changedChild.material[2].needsUpdate = true
                        changedChild.material[3].envMap = envMap
                        changedChild.material[3].needsUpdate = true

                    })

                })

                // add envmapintensity
                currentFolder.add(changedChild.material[0], 'envMapIntensity', 0, 10, 0.01).name('EnvMap Intensity').onChange(function () {
                    changedChild.material[1].envMapIntensity = changedChild.material[0].envMapIntensity
                    changedChild.material[2].envMapIntensity = changedChild.material[0].envMapIntensity
                    changedChild.material[3].envMapIntensity = changedChild.material[0].envMapIntensity

                })


                currentFolder.add(obj, 'aoMap').name('AO URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.aoMap)
                    applyMapSettings(map)
                    changedChild.geometry.attributes.uv2 = changedChild.geometry.attributes.uv

                    for (var k = 0; k < changedChild.material.length; k++) {
                        console.log(changedChild.material[k], map);
                        changedChild.material[k].aoMap = map
                        changedChild.material[k].aoMapIntensity = 1
                        changedChild.material[k].needsUpdate = true

                    }
                    console.log(changedChild.geometry.attributes);

                })



                currentFolder.add(child.material[0], 'specularIntensity', 0, 1, 0.01).name('Specular Intensity').onChange(function () {
                    changedChild.material[1].specularIntensity = changedChild.material[0].specularIntensity
                    changedChild.material[2].specularIntensity = changedChild.material[0].specularIntensity
                    changedChild.material[3].specularIntensity = changedChild.material[0].specularIntensity

                })
                currentFolder.addColor(child.material[0], 'specularColor').name('Specular Color').onChange(function () {
                    changedChild.material[1].specularColor = changedChild.material[0].specularColor
                    changedChild.material[2].specularColor = changedChild.material[0].specularColor
                    changedChild.material[3].specularColor = changedChild.material[0].specularColor

                })

                currentFolder.close()

                child.castShadow = true
                child.receiveShadow = true
            }


        })

        _this.centerGroup = new THREE.Group()
        if (window.innerWidth < 1000) {
            // move object 1/3 screen up on y
        }
        _this.object.updateMatrixWorld()
        var box3 = new THREE.Box3().setFromObject(_this.object)
        var center = new THREE.Vector3()
        box3.getCenter(center)
        // _this.object.lookAt(_this.camera.position)

        // _this.scene.add(object)
        _this.centerGroup.add(_this.object)
        _this.centerGroup.position.x = -center.x
        _this.centerGroup.position.y = -center.y
        _this.centerGroup.position.z = -center.z
        _this.centerGroup.name = 'centergroupnew'
        console.log(_this.centerGroup.position);

        // set camera z as far as needed
        _this.camera.position.z = box3.getSize(new THREE.Vector3()).length() * 2
        var secondGroup = new THREE.Group()
        secondGroup.name = 'secondGroup'
        secondGroup.add(_this.centerGroup)
        _this.thirdGroup.add(secondGroup)


        // add lights
        _this.thirdGroup.remove(_this.dirLight)
        // _this.thirdGroup.remove(_this.ambientLight)
        console.log(_this.thirdGroup);

        _this.dirLight = object.children.find((child) => child.type.includes('irectional'))
        _this.ambientLight = object.children.find((child) => child.type.includes('mbient'))

        object.remove(_this.dirLight)
        // object.remove(_this.ambientLight)

        _this.lightsFolder.destroy()
        _this.lightsFolder = _this.gui.addFolder('Lights')
        _this.targetFolder.destroy()

        // add intensity to global folder
        _this.lightsFolder.add(_this.dirLight, 'intensity', 0, 2, 0.01).name('Light Intensity')
        _this.lightsFolder.add(_this.dirLight.position, 'x', -100, 100, 1).name('Light X')
        _this.lightsFolder.add(_this.dirLight.position, 'y', -100, 200, 1).name('Light Y')
        _this.lightsFolder.add(_this.dirLight.position, 'z', -100, 100, 1).name('Light Z')

        // add light target to gui
        _this.targetFolder = _this.lightsFolder.addFolder('Light Target')
        _this.targetFolder.add(_this.dirLight.target.position, 'x', -100, 100, 1).name('Target X')
        _this.targetFolder.add(_this.dirLight.target.position, 'y', -100, 100, 1).name('Target Y')
        _this.targetFolder.add(_this.dirLight.target.position, 'z', -100, 100, 1).name('Target Z')


        _this.thirdGroup.add(_this.dirLight)
        // _this.thirdGroup.add(_this.ambientLight)

        if (_this.fourthGroup.children.length == 0) {
            _this.fourthGroup = new THREE.Group()
            _this.fourthGroup.name = 'fourthGroup'
            _this.fourthGroup.add(_this.thirdGroup)
            _this.scene.add(_this.fourthGroup)
        }


        // _this.thirdGroup.add(this.secondGroup)

        // _this.scene.add(_this.thirdGroup)
        _this.interface = new Interface({
            children: _this.children,
            gl: _this,
            canvases: canvases
        }).create(texts, images)
        // mtlLoader.setPath('objects/Tests/Test-2/')
        // mtlLoader.load('scene.mtl', (materials) => {
        //     loader.setMaterials(materials)
        //     loader.setPath('objects/Tests/Test-2/')
        //     loader.load('scene.obj', (object) => {
        //         object.traverse((child) => {
        //             if (child.isMesh) {
        //                 // console.log(child.material);
        //                 child.material = materials.materials[child.material.name]
        //             }
        //         })
        //         // console.log(object);
        //         object.position.z = 3333.8
        //         object.position.x = -666
        //         object.position.y = -280
        //         object.scale.set(130, 130, 130)
        //         _this.gui.add(object.position, 'x', -5100, 5100, 0.01).name('X')
        //         _this.gui.add(object.position, 'y', -555, 555, 0.01).name('Y')
        //         _this.gui.add(object.position, 'z', -5010, 5010, 0.01).name('Z')
        //         centerGroup.add(object)
        //     })
        // })

        // create plane behind
        // new THREE.TextureLoader().load('objects/Tests/Test-11/Autumn.png', async function (img) {
        //     var background = img
        //     var aspectRatio = background.image.width / background.image.height
        //     var planeGeometry = new THREE.PlaneGeometry(800 * aspectRatio, 800, 100, 100)

        //     applyMapSettings(background)
        //     var planeMaterial = new THREE.MeshBasicMaterial({
        //         side: THREE.DoubleSide,
        //         map: background,
        //         transparent: false


        //     })
        //     var plane = new THREE.Mesh(planeGeometry, planeMaterial)
        //     plane.position.z = -200
        //     plane.position.y = 50
        //     plane.position.x = 30
        //     // plane.rotation.x = Math.PI / 2
        //     plane.receiveShadow = true
        //     plane.castShadow = false

        //     _this.thirdGroup.add(plane)


        //     const shadowMaterial = new THREE.ShadowMaterial({
        //         side: THREE.DoubleSide,
        //         opacity: 0.5,
        //     })
        //     shadowMaterial.name = 'shadow'
        //     const ground = new THREE.Mesh(planeGeometry, shadowMaterial)
        //     ground.position.y = -143
        //     ground.receiveShadow = true
        //     ground.castShadow = true
        //     _this.gui.add(ground.position, 'x', -5100, 5100, 0.01).name('X')
        //     _this.gui.add(ground.position, 'y', -555, 555, 0.01).name('Y')
        //     _this.gui.add(ground.position, 'z', -5010, 5010, 0.01).name('Z')
        //     ground.rotateX(Math.PI / 2)
        //     _this.thirdGroup.add(ground)

        //     _this.gui.add(_this.controls, 'enableRotate')




        //     _this.scene.updateMatrixWorld();

        //     // _this.startRealRender()
        //     const render_button = document.getElementById('render-button')
        //     // render_button.addEventListener('click', () => {
        //     //     console.log('clicked once');
        //     //     _this.startRealRender()
        //     // }
        //     // )


        // })
    }
    async loadOBJ(url, mtlUrl, objekt) {
        this.objectList = []

        var isObject = objekt ?? false
        var _this = this
        this.camera.position.x = 0
        this.camera.position.y = 0

        if (this.centerGroup.parent) {
            this.centerGroup.parent.remove(this.centerGroup)
            console.log('removed');
        }

        if (this.interface) {
            //delete canvases
            this.interface.canvases.image.forEach(canvas => {
                canvas.parentElement.remove()
            })
            this.interface.canvases.text.forEach(canvas => {
                canvas.parentElement.remove()
            })
            this.interface.colorPickers.forEach(colorPicker => {
                colorPicker.remove()
            })

            this.interface.canvases.image = []
            this.interface.canvases.text = []
            this.interface.images = []
            this.interface.texts = []
            this.interface.canvases = { text: [], image: [] }
            this.interface = null

        }
        var loader = new OBJLoader();
        var mtlLoader = new MTLLoader();
        const path = url;
        if (mtlUrl == undefined) {
            mtlLoader.setPath(path.split('/').slice(0, -1).join('/') + '/');

        }

        mtlLoader.load(mtlUrl != undefined ? mtlUrl : (path.split('/')[path.split('/').length - 1].split('.')[0] + '.mtl'), (mats) => {

            mats.preload();

            loader.setMaterials(mats);
            loader.load(url, async function (object) {


                _this.loadObjCallback(object, mats)

            })

        })
    }
    loadObjCallback(object, mats) {
        var _this = this
        this.camera.position.x = 0
        this.camera.position.y = 0
        _this.children = []
        _this.materialFolder.destroy()
        _this.materialFolder = _this.gui.addFolder('Material')
        if (_this.object.parent) {
            _this.object.removeFromParent()
        }
        _this.object = object
        _this.objectList.push(_this.object)

        var canvases = {
            text: [],
            image: []
        }
        object.traverse((child) => {
            if (child.isCamera) {
                child.removeFromParent()
            } else if (child.isLight) {
                // child.intensity = 1
            }
            if (child.isMesh || child.isSkinnedMesh) {
                if (Array.isArray(child.material)) {
                    console.log(child.material);
                    child.material.name += ' ' + child.material.length
                    child.name += ' ' + child.material.length
                    // combine
                    var colors = []
                    child.material.forEach((mat) => {
                        colors.push(mat.color)
                    })
                    child.material = new THREE.MeshStandardMaterial({
                        // combine colors 
                        color: colors[1],
                    })


                }

                _this.children.push(child)

                // child.frustumCulled = true
                // to non indexed

                var canvasTxt, canvasTxt2
                for (var j = 0; j < 2; j++) {
                    const canvas = document.createElement('canvas')

                    canvas.width = 1
                    canvas.height = 1
                    // change to 0
                    canvas.id = (_this.children.length - 1).toString()
                    canvas.className = 'drawCanvas'
                    canvas.style.transformOrigin = 'left top'
                    canvas.style.transform = 'scale(' + 1 / canvasResolution + ')'
                    if (j == 0) {
                        canvases.image.push(canvas)
                        canvasTxt2 = new THREE.CanvasTexture(canvas)

                    } else {
                        canvases.text.push(canvas)
                        canvasTxt = new THREE.CanvasTexture(canvas)

                    }
                }

                canvasTxt.needsUpdate = true
                applyMapSettings(canvasTxt)

                canvasTxt2.needsUpdate = true
                applyMapSettings(canvasTxt2)
                _this.canvasTextures.push(canvasTxt, canvasTxt2)

                let geometry = child.geometry;

                geometry.clearGroups();

                geometry.addGroup(0, Infinity, 0); // z index 0
                geometry.addGroup(0, Infinity, 1); // z index 1
                geometry.addGroup(0, Infinity, 2); // z index 2
                geometry.addGroup(0, Infinity, 3); // z index 2


                var currentMat = mats ? (mats.materials[child.material.name]) : (Array.isArray(child.material) ? child.material[0] : child.material)
                const childStandardMaterial = new THREE.MeshPhysicalMaterial({
                    transparent: false,
                    // alphaTest: 0.5,
                    emissive: currentMat.emissive,
                    emissiveIntensity: currentMat.emissiveIntensity,
                    normalMap: currentMat.normalMap,
                    normalScale: currentMat.normalScale,
                    specularColor: 0xffffff,
                    specularIntensity: 1,
                    color: currentMat.color,
                    map: currentMat.map,
                    roughness: currentMat.type.toLowerCase().includes('phong') ? 1 - currentMat.shininess / 100 : currentMat.roughness,
                    metalness: currentMat.metalness ?? 0,
                    reflectivity: currentMat.reflectivity ?? 0,
                    metalnessMap: currentMat.metalnessMap ?? null,
                    roughnessMap: currentMat.roughnessMap ?? null,
                    opacity: currentMat.opacity,
                    // color: currentMat.color ?? 0xffffff,
                    color:  0xffffff,
                    side: THREE.DoubleSide,
                })


                var clonePhysical = new THREE.MeshPhysicalMaterial().copy(childStandardMaterial)
                clonePhysical.map = null
                clonePhysical.alphaTest = 0.5
                clonePhysical.transparent = true
                clonePhysical.opacity = 0
                const childMapMaterial = new THREE.MeshPhysicalMaterial().copy(clonePhysical)
                childMapMaterial.alphaTest = 0.5
                childMapMaterial.transparent = true
                childMapMaterial.opacity = 0

                const canvasMaterial = new THREE.MeshPhysicalMaterial().copy(clonePhysical)
                canvasMaterial.opacity = 1
                const canvasMaterial2 = new THREE.MeshPhysicalMaterial().copy(clonePhysical)
                canvasMaterial2.opacity = 1
                canvasMaterial.color = new THREE.Color(0xffffff)
                canvasMaterial2.color = new THREE.Color(0xffffff)
                _this.colorMaterial = new THREE.MeshPhysicalMaterial().copy(clonePhysical)

                childStandardMaterial.name = 'Standard'
                childMapMaterial.name = 'Map'
                canvasMaterial.name = 'Canvas'
                canvasMaterial2.name = 'Canvas2'

                child.material = [childStandardMaterial, childMapMaterial, canvasMaterial2, canvasMaterial,]

                const currentFolder = _this.materialFolder.addFolder(child.name)
                const changedChild = _this.object.getObjectByName(currentFolder.$title.textContent)


                currentFolder.add(child.material[0], 'metalness', 0, 1, 0.01).name('Metalness').onChange(function () {
                    changedChild.material[1].metalness = changedChild.material[0].metalness
                    changedChild.material[2].metalness = changedChild.material[0].metalness
                    changedChild.material[3].metalness = changedChild.material[0].metalness
                })

                // add transparency toggle
                currentFolder.add(child.material[0], 'transparent').name('Transparent').onChange(function (e) {
                    changedChild.material[1].transparent = e
                    changedChild.material[2].transparent = e
                    changedChild.material[3].transparent = e

                    if (e == true) {
                        //alphatest  0
                        changedChild.material[1].alphaTest = 0
                        changedChild.material[0].alphaTest = 0

                        changedChild.material[2].alphaTest = 0
                        changedChild.material[3].alphaTest = 0

                    } else {
                        changedChild.material[1].alphaTest = 0.5
                        changedChild.material[0].alphaTest = 0.5
                        changedChild.material[2].alphaTest = 0.5
                        changedChild.material[3].alphaTest = 0.5
                    }
                    // needs update
                    changedChild.material[0].needsUpdate = true
                    changedChild.material[1].needsUpdate = true
                    changedChild.material[2].needsUpdate = true
                    changedChild.material[3].needsUpdate = true
                })


                currentFolder.add(child.material[0], 'roughness', 0, 1, 0.01).name('Roughness').onChange(function () {

                    changedChild.material[1].roughness = changedChild.material[0].roughness
                    changedChild.material[2].roughness = changedChild.material[0].roughness
                    changedChild.material[3].roughness = changedChild.material[0].roughness

                })
                currentFolder.add(child.material[0], 'opacity', 0, 1, 0.01).name('Opacity').onChange(function () {

                    if (changedChild.material[1].map != undefined || changedChild.material[1].opacity != 0) {
                        changedChild.material[1].opacity = changedChild.material[0].opacity
                    }

                    // changedChild.material[2].opacity = changedChild.material[0].opacity
                    // changedChild.material[3].opacity = changedChild.material[0].opacity

                })
                currentFolder.add(child.material[0], 'reflectivity', 0, 1, 0.01).name('Reflectivity').onChange(function () {


                    changedChild.material[1].reflectivity = changedChild.material[0].reflectivity
                    changedChild.material[2].reflectivity = changedChild.material[0].reflectivity
                    changedChild.material[3].reflectivity = changedChild.material[0].reflectivity

                })
                currentFolder.add(child.material[0], 'ior', 1.0, 2.333, 0.01).name('Refraction').onChange(function () {

                    changedChild.material[1].ior = changedChild.material[0].ior
                    changedChild.material[2].ior = changedChild.material[0].ior
                    changedChild.material[3].ior = changedChild.material[0].ior

                })

                currentFolder.add(child.material[0], 'transmission', 0.0, 1.0, 0.01).name('Transmission').onChange(function () {
                    changedChild.material[1].transmission = changedChild.material[0].transmission
                    // changedChild.material[2].transmission = changedChild.material[0].transmission
                    // changedChild.material[3].transmission = changedChild.material[0].transmission

                })

                currentFolder.add(child.material[0], 'thickness', 0, 10, 0.01).name('Thickness').onChange(function () {
                    changedChild.material[1].thickness = changedChild.material[0].thickness
                    changedChild.material[2].thickness = changedChild.material[0].thickness
                    changedChild.material[3].thickness = changedChild.material[0].thickness

                })


                currentFolder.add(child.material[0], 'clearcoat', 0, 1, 0.01).name('ClearCoat').onChange(function () {
                    changedChild.material[1].clearcoat = changedChild.material[0].clearcoat
                    changedChild.material[2].clearcoat = changedChild.material[0].clearcoat
                    changedChild.material[3].clearcoat = changedChild.material[0].clearcoat

                })

                currentFolder.add(child.material[0], 'clearcoatRoughness', 0, 1, 0.01).name('ClearCoat Roughness').onChange(function () {
                    changedChild.material[1].clearcoatRoughness = changedChild.material[0].clearcoatRoughness
                    changedChild.material[2].clearcoatRoughness = changedChild.material[0].clearcoatRoughness
                    changedChild.material[3].clearcoatRoughness = changedChild.material[0].clearcoatRoughness

                })



                const obj = {
                    url: 'objects/dove/texture5.jpg',
                    normalMap: 'objects/sofa2/sofa2.png',
                    metalnessMap: 'objects/sofa2/sofa2.png',
                    roughnessMap: 'objects/sofa2/sofa2.png',
                    specularMap: 'objects/sofa2/sofa2.png',
                    environmentMap: 'img/grid.jpg',
                    aoMap: 'img/grid.jpg',

                }
                currentFolder.add(obj, 'url').name('MATERIAL URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.url)
                    applyMapSettings(map)
                    changedChild.material[1].map = map
                    changedChild.material[1].needsUpdate = true
                    changedChild.material[1].opacity = 1
                    _this.realRenderer.reset()
                    
                })
                currentFolder.add(obj, 'normalMap').name('Normal URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.normalMap)
                    applyMapSettings(map)
                    changedChild.material[1].normalMap = map
                    changedChild.material[1].normalScale = new THREE.Vector2(1.0, 1.0)
                    changedChild.material[1].needsUpdate = true
                    console.log('APPLIED NORMAL MAP', changedChild);

                })
                currentFolder.add(obj, 'metalnessMap').name('Metalness URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.metalnessMap)
                    applyMapSettings(map)
                    changedChild.material[1].metalnessMap = map
                    changedChild.material[1].needsUpdate = true
                })
                currentFolder.add(obj, 'roughnessMap').name('Roughness URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.roughnessMap)
                    applyMapSettings(map)
                    changedChild.material[1].roughnessMap = map
                    changedChild.material[1].needsUpdate = true
                })
                currentFolder.add(obj, 'specularMap').name('Specular URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.specularMap)
                    applyMapSettings(map)
                    changedChild.material[1].specularColorMap = map

                    changedChild.material[1].needsUpdate = true

                    changedChild.material[2].specularColorMap = map
                    changedChild.material[2].needsUpdate = true

                    changedChild.material[3].specularColorMap = map
                    changedChild.material[3].needsUpdate = true



                })

                currentFolder.add(obj, 'environmentMap').name('Environment URL:').onFinishChange(function () {
                    new THREE.TextureLoader().load(obj.environmentMap, (map) => {
                        // _this.scene.background = map
                        applyMapSettings(map)
                        map.mapping = THREE.EquirectangularReflectionMapping
                        var pmrem = new THREE.PMREMGenerator(_this.renderer)
                        pmrem.compileEquirectangularShader()
                        console.log(map);
                        var envMap = pmrem.fromEquirectangular(map).texture
                        changedChild.material[1].envMap = envMap
                        changedChild.material[1].needsUpdate = true
                        changedChild.material[0].envMap = envMap
                        changedChild.material[0].needsUpdate = true
                        changedChild.material[2].envMap = envMap
                        changedChild.material[2].needsUpdate = true
                        changedChild.material[3].envMap = envMap
                        changedChild.material[3].needsUpdate = true

                    })

                })

                // add envmapintensity
                currentFolder.add(changedChild.material[0], 'envMapIntensity', 0, 10, 0.01).name('EnvMap Intensity').onChange(function () {
                    changedChild.material[1].envMapIntensity = changedChild.material[0].envMapIntensity
                    changedChild.material[2].envMapIntensity = changedChild.material[0].envMapIntensity
                    changedChild.material[3].envMapIntensity = changedChild.material[0].envMapIntensity

                })


                currentFolder.add(obj, 'aoMap').name('AO URL:').onFinishChange(function () {
                    const map = new THREE.TextureLoader().load(obj.aoMap)
                    applyMapSettings(map)
                    changedChild.geometry.attributes.uv2 = changedChild.geometry.attributes.uv

                    for (var k = 0; k < changedChild.material.length; k++) {
                        console.log(changedChild.material[k], map);
                        changedChild.material[k].aoMap = map
                        changedChild.material[k].aoMapIntensity = 1
                        changedChild.material[k].needsUpdate = true

                    }
                    console.log(changedChild.geometry.attributes);

                })



                currentFolder.add(child.material[0], 'specularIntensity', 0, 1, 0.01).name('Specular Intensity').onChange(function () {
                    changedChild.material[1].specularIntensity = changedChild.material[0].specularIntensity
                    changedChild.material[2].specularIntensity = changedChild.material[0].specularIntensity
                    changedChild.material[3].specularIntensity = changedChild.material[0].specularIntensity

                })
                currentFolder.addColor(child.material[0], 'specularColor').name('Specular Color').onChange(function () {
                    changedChild.material[1].specularColor = changedChild.material[0].specularColor
                    changedChild.material[2].specularColor = changedChild.material[0].specularColor
                    changedChild.material[3].specularColor = changedChild.material[0].specularColor

                })

                currentFolder.close()

                canvasMaterial.map = canvasTxt
                canvasMaterial2.map = canvasTxt2
                child.castShadow = true
                child.receiveShadow = true

            }


        })

        _this.centerGroup = new THREE.Group()
        if (window.innerWidth < 1000) {
            // move object 1/3 screen up on y
        }
        var box3 = new THREE.Box3().setFromObject(_this.object)
        var center = new THREE.Vector3()
        box3.getCenter(center)

        _this.object.lookAt(_this.camera.position)

        // _this.scene.add(object)
        _this.centerGroup.add(_this.object)
        _this.centerGroup.name = 'centerGroup'
        _this.centerGroup.position.x = -center.x
        _this.centerGroup.position.y = -center.y
        _this.centerGroup.position.z = -center.z

        // set camera z as far as needed
        _this.camera.position.z = box3.getSize(new THREE.Vector3()).length() * 2


        _this.secondGroup.name = 'secondGroup'
        _this.secondGroup.add(_this.centerGroup)
        _this.thirdGroup.add(_this.secondGroup)
        _this.thirdGroup.name = 'thirdGroup'

        _this.fourthGroup.add(_this.thirdGroup)


        _this.scene.add(_this.fourthGroup)
        _this.interface = new Interface({
            children: _this.children,
            gl: _this,
            canvases: canvases
        }).create()


        // const gltfLoader = new GLTFLoader()
        // gltfLoader.setPath('scenes/positions/')
        // gltfLoader.load('centered.glb', (glb) => {
        //     glb.scene.scale.set(10,10,10,)
        //     _this.thirdGroup.add(glb.scene)
        // })


        // // create plane behind
        // new THREE.TextureLoader().load('objects/Tests/Test-11/Autumn.png', async function (img) {
        //     var background = img
        //     var aspectRatio = background.image.width / background.image.height
        //     var planeGeometry = new THREE.PlaneGeometry(800 * aspectRatio, 800, 100, 100)

        //     applyMapSettings(background)
        //     var planeMaterial = new THREE.MeshBasicMaterial({
        //         side: THREE.DoubleSide,
        //         map: background,
        //         transparent: false


        //     })
        //     var plane = new THREE.Mesh(planeGeometry, planeMaterial)
        //     plane.position.z = -200
        //     plane.position.y = 50
        //     plane.position.x = 30
        //     // plane.rotation.x = Math.PI / 2
        //     plane.receiveShadow = true
        //     plane.castShadow = false

        //     // _this.fourthGroup.add(plane)


        //     const shadowMaterial = new THREE.ShadowMaterial({
        //         side: THREE.DoubleSide,
        //         opacity: 0.5,
        //     })
        //     shadowMaterial.name = 'shadow'
        //     const ground = new THREE.Mesh(planeGeometry, shadowMaterial)
        //     ground.position.y = -143
        //     ground.receiveShadow = true
        //     ground.castShadow = true
        //     _this.gui.add(ground.position, 'x', -5100, 5100, 0.01).name('X')
        //     _this.gui.add(ground.position, 'y', -555, 555, 0.01).name('Y')
        //     _this.gui.add(ground.position, 'z', -5010, 5010, 0.01).name('Z')
        //     ground.rotateX(Math.PI / 2)
        //     // _this.fourthGroup.add(ground)

        //     _this.gui.add(_this.controls, 'enableRotate')




        //     _this.scene.updateMatrixWorld();





        // })
    }
    loadFbxGlb(model) {
        var _this = this
        this.camera.position.x = 0
        this.camera.position.y = 0

        if (_this.currentMode == DESIGN) {
            if (this.centerGroup.parent) {
                this.centerGroup.parent.remove(this.centerGroup)
                console.log('removed');
            }

            if (this.interface) {
                //delete canvases
                this.interface.canvases.image.forEach(canvas => {
                    canvas.parentElement.remove()
                })
                this.interface.canvases.text.forEach(canvas => {
                    canvas.parentElement.remove()
                })
                this.interface.colorPickers.forEach(colorPicker => {
                    colorPicker.remove()
                })

                this.interface.canvases.image = []
                this.interface.canvases.text = []
                this.interface.images = []
                this.interface.texts = []
                this.interface.canvases = { text: [], image: [] }
                this.interface = null

            }
            var _this = this
            // if it's glb/gltf 
            if (model.name.match(/.glb/) || model.name.match(/.gltf/)) {
                var gltfLoader = new GLTFLoader()
                gltfLoader.load(URL.createObjectURL(model), (glb) => {
                    // glb.scene.scale.set(10, 10, 10,)
                    console.log(glb.scene);
                    _this.loadObjCallback(glb.scene)
                })
            } else if (model.name.match(/.fbx/)) {
                var fbxLoader = new FBXLoader()
                fbxLoader.load(URL.createObjectURL(model), (fbx) => {
                    // fbx.scale.set(10, 10, 10,)

                    _this.loadObjCallback(fbx)
                    // _this.objectList.push(fbx.children[0].children[0])
                    // _this.thirdGroup.add(fbx)
                })
            }
        } else if (_this.currentMode == SETUP) {
            console.log('In setup, add as accessory.');
            if (model.name.match(/.glb/) || model.name.match(/.gltf/)) {
                var gltfLoader = new GLTFLoader()
                gltfLoader.load(URL.createObjectURL(model), (glb) => {
                    _this.duplicateObject(glb.scene)
                })
            } else if (model.name.match(/.fbx/)) {
                var fbxLoader = new FBXLoader()
                fbxLoader.load(URL.createObjectURL(model), (fbx) => {
                    _this.duplicateObject(fbx)
                })
            }
        }


    }
    duplicateObject(objectToDuplicate) {
        console.log('duplicating', objectToDuplicate);
        var duplicate = objectToDuplicate.clone()

        var duplicateWidth = new Box3().setFromObject(duplicate).getSize(new Vector3()).x
        duplicate.position.x = duplicateWidth * Math.random()

        if (objectToDuplicate.name == 'secondGroup') {
            this.objectList.push(duplicate.children[0].children[0])
            this.thirdGroup.add(duplicate)


        } else {
            this.centerGroup = new THREE.Group()
            duplicate.updateMatrixWorld()
            var box3 = new THREE.Box3().setFromObject(duplicate)
            var center = new THREE.Vector3()
            box3.getCenter(center)
            // duplicate.lookAt(this.camera.position)

            // this.scene.add(object)
            this.centerGroup.add(duplicate)
            this.centerGroup.position.x = -center.x
            this.centerGroup.position.y = -center.y
            this.centerGroup.position.z = -center.z
            this.centerGroup.name = 'centergroupnew'
            console.log(this.centerGroup.position);

            // set camera z as far as needed
            this.camera.position.z = box3.getSize(new THREE.Vector3()).length() * 2
            var secondGroup = new THREE.Group()
            secondGroup.name = 'secondGroup'
            secondGroup.add(this.centerGroup)
            this.objectList.push(secondGroup.children[0].children[0])
            this.thirdGroup.add(secondGroup)


        }


        const fieldset1 = document.getElementsByTagName('fieldset')[0]
        const container = document.createElement("label");


        container.className = "container";
        // container.textContent = 'Object ' + (this.objectList.length)
        const objectName = document.createElement('div')
        objectName.id = 'object-name'
        objectName.textContent = 'Object ' + (this.objectList.length)
        container.appendChild(objectName)
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "lightmode";
        input.id = "object";

        container.appendChild(input);
        // .appendChild(container)
        fieldset1.childNodes[0].insertBefore(container, fieldset1.childNodes[0].childNodes[this.objectList.length])
        // if (this.objectList.length == 2) 
        fieldset1.childNodes[0].childNodes[0].textContent = 'Object 1'

        // fieldset1.insertBefore(container, fieldset1.childNodes[0]);



    }
    removeObject(objectToRemove, index) {
        if (this.objectList.length > 1) {
            this.transformControls.detach()

            this.selectedObjectId = 1
            if (objectToRemove.name == 'secondGroup') {
                this.thirdGroup.remove(objectToRemove)
    
            } else {
                this.thirdGroup.remove(objectToRemove.children[0].children[0])
            }
            this.objectList.splice(index, 1)
            console.log(index, objectToRemove, this.objectList);
            const fieldset1 = document.getElementsByTagName('fieldset')[0]
            fieldset1.childNodes[0].removeChild(fieldset1.childNodes[0].childNodes[this.objectList.length + 1])
            if (this.objectList.length == 1) {
                fieldset1.childNodes[0].childNodes[0].textContent = 'Object 1'
    
            } else {
                // update all names
                for (let i = 0; i < this.objectList.length; i++) {
                    if (i == 0) {
                        fieldset1.childNodes[0].childNodes[i].textContent = 'Object 1'
                    } else {
                        fieldset1.childNodes[0].childNodes[i + 1].children[0].textContent = 'Object ' + (i + 1)
    
                    }
                }
            }
    
            this.transformControls.attach(this.objectList[0].parent.parent)
            fieldset1.childNodes[0].childNodes[1].checked = true
    
    
        }
 
    }
    addToSceneInterface(child) {
        var _this = this
        const sceneInterface = document.getElementById('scene-interface')
        // clear all children
 
        const fieldset = document.createElement('fieldset')
        fieldset.id = 'scene-interface-fieldset'
        const container = document.createElement("label");
        container.textContent = child.name
        fieldset.appendChild(container);

        fieldset.addEventListener('change', (e) => {
            document.getElementsByTagName('fieldset')[1].children[0].children[1].children[0].disabled = false
            document.getElementsByTagName('fieldset')[1].children[0].children[1].children[1].children[0].disabled = false
            console.log(e.target.parentElement);
            const id = parseInt(e.target.parentElement.childNodes[0].textContent.toString().split(" ")[1])
            var selectedObject = _this.loadedScene.getObjectByName(e.target.parentElement.childNodes[0].textContent)
            console.log(e.target.parentElement.childNodes[0].textContent, selectedObject);
            _this.transformControls.detach(_this.dirLight.target)
            _this.transformControls.detach(_this.dirLight)
            _this.transformControls.detach()
            _this.transformControls.attach(selectedObject)
        })

        const input = document.createElement("input");
        input.name = "lightmode";
        input.type = "radio";
        container.appendChild(input);


        var gui2 = new dat.GUI({ autoPlace: false });
        gui2.domElement.id = 'gui2'
        fieldset.appendChild(gui2.domElement)

        sceneInterface.appendChild(fieldset)
        child.material = child.material.clone()

        const childObj = {
            color: child.material.color,
        }
        gui2.addColor(childObj, 'color').onChange(function (value) {
            child.material.color.set(value)
        }
        ).name(child.material.name)

        // if (child.material.type == 'MeshStandardMaterial') {
        //     gui2.add(child.material, 'metalness', 0, 1, 0.01).name('metalness')
        //     gui2.add(child.material, 'roughness', 0, 1, 0.01).name('roughness')
            
        // } else if (child.material.type == 'MeshPhongMaterial') {
        //     gui2.add(child.material, 'shininess', 0, 100, 0.01).name('shininess')
        // }
        var isStandardMaterial = child.material.type == 'MeshStandardMaterial'
             
        child.material = new THREE.MeshPhysicalMaterial({
            color: child.material.color,
            metalness: isStandardMaterial ? child.material.metalness : 0,
            roughness: isStandardMaterial ? child.material.roughness : 0.5,
            reflectivity: 0.5,
            clearcoat:  0,
            clearcoatRoughness:  0,
            transmission:  0,
            name: child.material.name,
            transparent: child.material.transparent,
            opacity: child.material.opacity,
            thickness: child.material.thickness ?? 0,
            ior: child.material.ior ?? 1.5,
            emissive: child.material.emissive,
            emissiveIntensity: child.material.emissiveIntensity,
        })

        gui2.add(child.material, 'metalness').min(0).max(1).step(0.01).name('metalness').onChange(function (value) {
        })
        gui2.add(child.material, 'roughness').min(0).max(1).step(0.01).name('roughness')
        gui2.add(child.material, 'reflectivity').min(0).max(1).step(0.01).name('reflectivity')
        gui2.add(child.material, 'clearcoat').min(0).max(1).step(0.01).name('clearcoat')
        gui2.add(child.material, 'clearcoatRoughness').min(0).max(1).step(0.01).name('clearcoatRoughness')
        gui2.add(child.material, 'transmission').min(0).max(1).step(0.01).name('transmission')
        gui2.add(child.material, 'transparent').name('transparent').onChange((transparent) => {
            child.material.needsUpdate = true   
        })
        gui2.add(child.material, 'opacity').min(0).max(1).step(0.01).name('opacity')
        gui2.add(child.material, 'thickness').min(0).max(1).step(0.01).name('thickness')
        gui2.add(child.material, 'ior').min(0).max(1).step(0.01).name('ior')
        gui2.addColor(child.material, 'emissive').onChange(function (value) {
            child.material.emissive.set(value)
        })
        gui2.add(child.material, 'emissiveIntensity').min(0).max(1).step(0.01).name('emissiveIntensity')


    }
    async startSceneSetup(index) {
        var _this = this
        _this.gui.close()

        const sceneInterface = document.getElementById('scene-interface')
        while (sceneInterface.firstChild) {
            sceneInterface.removeChild(sceneInterface.firstChild);
        }
        sceneInterface.textContent = 'CUSTOMIZE YOUR SCENE' 
        // display flex important
        sceneInterface.style.setProperty('display', 'flex', 'important')
        const render_button = document.getElementById('render-button')

        render_button.style.backgroundColor = '#b8ff8f'




        if (_this.loadedScene != null) {
            _this.thirdGroup.remove(_this.loadedScene)

        }
        if (index == 3) {
            var loader = new OBJLoader();
            var mtlLoader = new MTLLoader();
            mtlLoader.setPath('scenes/')
            mtlLoader.load('scene.mtl', (materials) => {
                loader.setMaterials(materials)
                loader.setPath('scenes/')
                loader.load('scene.obj', (object) => {
                    object.traverse((child) => {
                        if (child.isMesh) {
                            child.material = materials.materials[child.material.name]

                            _this.addToSceneInterface(child)

                            // console.log(child.material);
                        }
                        child.castShadow = true
                        child.receiveShadow = true
                    })
            
                    // console.log(object);
                    object.position.z = 350
                    object.position.x = -66
                    object.position.y = -34
                    object.scale.set(13, 13, 13)
                    _this.gui.add(object.position, 'x', -5100, 5100, 0.01).name('X')
                    _this.gui.add(object.position, 'y', -555, 555, 0.01).name('Y')
                    _this.gui.add(object.position, 'z', -5010, 5010, 0.01).name('Z')
                    _this.thirdGroup.add(object)
                    _this.loadedScene = object

                })
            })

            const dirLightHelper = new THREE.DirectionalLightHelper(_this.dirLight, 5)
            _this.scene.add(dirLightHelper)
        }

        if (index == 2) {
            const fbxLoader = new FBXLoader()
            fbxLoader.setPath('scenes/')
            fbxLoader.load('scene without packs.fbx', (object) => {
                object.traverse((child) => {
                    if (child.type.toString().toLowerCase().includes('light')) {
                        child.intensity = 0.1
                    }
                    if (child.isMesh) {
                        _this.addToSceneInterface(child)

                        // console.log(child.material);
                        // child.material = materials.materials[child.material.name]
                    }
                    child.castShadow = true
                    child.receiveShadow = true
                })
                // console.log(object);
                object.position.z = -80
                object.position.x = 3
                object.position.y = -8
                object.scale.set(0.05, 0.05, 0.05)

                _this.gui.add(object.position, 'x', -200, 200, 0.01).name('X')
                _this.gui.add(object.position, 'y', -200, 200, 0.01).name('Y')

                _this.gui.add(object.position, 'z', -1000, 200, 0.01).name('Z')
                _this.thirdGroup.add(object)
                _this.loadedScene = object

            })
        }


        if (index == 1) {

            const fbxLoader = new FBXLoader()
            fbxLoader.setPath('scenes/')

            fbxLoader.load('room2.fbx', (object) => {
                object.traverse((child) => {
                    if (child.type.toString().toLowerCase().includes('light')) {
                        child.intensity = 20
                        child.visible = false
                    }
                    if (child.isMesh) {
                        child.frustumCulled = true

                        if (Array.isArray(child.material)) {
                            // combine
                            var colors = []
                            child.material.forEach((mat) => {
                                colors.push(mat.color)
                            })
                            child.material = new THREE.MeshStandardMaterial({
                                // combine colors 
                                color: colors[1],
                            })

                        }
                        _this.addToSceneInterface(child)

                        // child.material = new THREE.MeshStandardMaterial({
                        //     color: 0xffffff
                        // })
                        // child.material = materials.materials[child.material.name]
                    }
                    child.castShadow = true
                    child.receiveShadow = true
                })
    
                // console.log(object);
                object.position.z = -12.5
                object.position.x = 3
                object.position.y = -11.9
                object.scale.set(0.05, 0.05, 0.05)

                _this.gui.add(object.position, 'x', -200, 200, 0.01).name('X')
                _this.gui.add(object.position, 'y', -200, 200, 0.01).name('Y')

                _this.gui.add(object.position, 'z', -1000, 200, 0.01).name('Z')
                _this.thirdGroup.add(object)
                _this.loadedScene = object

            })
        }

        const transformControls = new TransformControls(_this.camera, _this.renderer.domElement);



        document.getElementsByTagName("fieldset")[1].addEventListener("change", function (e) {
            console.log(e.target.id);
            transformControls.setMode(e.target.id);
            if (e.target.checked) {
                // Checkbox is checked..
                console.log("checked");
            } else {
                // Checkbox is not checked..
                console.log("unchecked");
            }
            if (e.target.id == 'scale') {
                // transformControls.showX = false
                // transformControls.showY = false
                // transformControls.showZ = false
            }
        });
        document.getElementsByTagName('fieldset')[0].addEventListener("change", function (e) {
            console.log(e.target.id);
            if (e.target.id == 'light') {
                console.log(document.getElementsByTagName('fieldset')[1].children[0].children[0]);
                document.getElementsByTagName('fieldset')[1].children[0].children[1].children[0].disabled = true
                document.getElementsByTagName('fieldset')[1].children[0].children[1].children[1].children[0].disabled = true
                transformControls.detach(dirLightTarget)
                transformControls.attach(_this.dirLight)
            } else if (e.target.id == 'target') {
                document.getElementsByTagName('fieldset')[1].children[0].children[1].children[0].disabled = true
                document.getElementsByTagName('fieldset')[1].children[0].children[1].children[1].children[0].disabled = true
                transformControls.detach(_this.dirLight)
                transformControls.attach(dirLightTarget)
            } else {
                document.getElementsByTagName('fieldset')[1].children[0].children[1].children[0].disabled = false
                document.getElementsByTagName('fieldset')[1].children[0].children[1].children[1].children[0].disabled = false
                console.log(e.target.parentElement);
                const id = parseInt(e.target.parentElement.childNodes[0].textContent.toString().split(" ")[1])
                _this.selectedObjectId = id
                console.log(id);
                transformControls.detach(dirLightTarget)
                transformControls.detach(_this.dirLight)
                if (_this.objectList.length > 1) {
                    console.log('ATTACHING TO ', _this.objectList[id - 1].parent.parent);
                    transformControls.attach(_this.objectList[id - 1].parent.parent)

                } else {
                    transformControls.attach(_this.object.parent.parent)
                }
            }
        })
        if (_this.transformControls == null) {
            transformControls.addEventListener('dragging-changed', function (event) {

                _this.controls.enabled = !event.value;
                _this.allowRotate = !event.value
    
            });
            transformControls.addEventListener('change', function (event) {
                if (_this.ptRenderer) {
                    _this.ptRenderer.reset();

                }
    
            });
    
    
            this.thirdGroup.add(transformControls);
            _this.transformControls = transformControls;
            _this.transformControls.addEventListener('mouseDown', this.mouseDownTransformControls)
    
            _this.transformControls.addEventListener('mouseUp',this.mouseUpTransformControls)
    
            _this.transformControls.attach(_this.object.parent.parent);
            _this.transformControls.setMode('translate');
            _this.transformControls.setSpace('world');
        }
 

        // add to dirlight

        const dirLightTarget = new THREE.Object3D();
        _this.thirdGroup.add(dirLightTarget);
        _this.dirLight.target = dirLightTarget;

        // this.transformControls.attach(dirLightTarget);


    }
    mouseDownTransformControls () {
        this.transforming = true
        console.log(this.transforming);
    }
    mouseUpTransformControls (e) {
        this.transforming = false
        console.log(this.transforming);
    }
 
    selectiveBoxFilter(imageData, kernelSize, threshold) {
        var data = imageData.data;
        var width = imageData.width;
        var height = imageData.height;
        var kernelRadius = Math.floor(kernelSize / 2);

        // Create a copy of the original image data
        var output = new ImageData(width, height);
        var outputData = output.data;

        // Apply the box filter to each pixel
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                var r = 0, g = 0, b = 0, a = 0, count = 0;
                for (var ky = -kernelRadius; ky <= kernelRadius; ky++) {
                    for (var kx = -kernelRadius; kx <= kernelRadius; kx++) {
                        var posX = x + kx;
                        var posY = y + ky;
                        if (posX >= 0 && posX < width && posY >= 0 && posY < height) {
                            var offset = (posY * width + posX) * 4;
                            r += data[offset];
                            g += data[offset + 1];
                            b += data[offset + 2];
                            a += data[offset + 3];
                            count++;
                        }
                    }
                }
                var outputOffset = (y * width + x) * 4;
                var avgR = r / count;
                var avgG = g / count;
                var avgB = b / count;
                var avgA = a / count;
                var avg = (avgR + avgG + avgB) / 3;
                var current = (data[outputOffset] + data[outputOffset + 1] + data[outputOffset + 2]) / 3;
                if (Math.abs(avg - current) > threshold) {
                    outputData[outputOffset] = avgR;
                    outputData[outputOffset + 1] = avgG;
                    outputData[outputOffset + 2] = avgB;
                    outputData[outputOffset + 3] = avgA;
                } else {
                    outputData[outputOffset] = data[outputOffset];
                    outputData[outputOffset + 1] = data[outputOffset + 1];
                    outputData[outputOffset + 2] = data[outputOffset + 2];
                    outputData[outputOffset + 3] = data[outputOffset + 3];
                }
            }
        }
        return output;
    }
 
    updateCamera() {
        var activeCamera = this.camera

        // controls.object = activeCamera;
        this.ptRenderer.camera = activeCamera;


        this.realRenderer.reset()

    }
    updateEnvMap() {

        new RGBELoader()
            .load(params.envMap, texture => {

                if (this.scene.environmentMap) {

                    this.scene.environment.dispose();

                }
                const blurredEnvMap = this.envMapGenerator.generate(texture, 0.35);
                this.ptRenderer.material.envMapInfo.updateFrom(blurredEnvMap);
                // this.envMapGenerator.dispose();
                // this.scene.environment = blurredEnvMap;
                //     this.scene.background = blurredEnvMap;


                // this.ptRenderer.reset();

            });
    }


    updateMaterialColor(e, index, name) {
        var theObject = this.object.getObjectByName(name)
        theObject.material[0].color = new THREE.Color(e)
        theObject.material[0].needsUpdate = true
    }
    onBackgroundColorChange() {
        this.scene.background.set(this.params.color)
    }
    onMouseMove(e) {
        const canvasWidth = this.renderer.domElement.clientWidth;
        const canvasHeight = this.renderer.domElement.clientHeight;
        var deltaX = (e.offsetX / canvasWidth) * 2 - 1 - this.mouse.x
        var deltaY = -(e.offsetY / canvasHeight) * 2 + 1 - this.mouse.y



        this.mouse.x = (e.offsetX / canvasWidth) * 2 - 1;
        this.mouse.y = -(e.offsetY / canvasHeight) * 2 + 1;
        if (this.isDown && this.realRenderer.fsQuad == null) {
            this.speedX += deltaY * 0.1
            this.speedY += deltaX * 0.3
        }

        if (this.isDown) {
            this.dragged = true
        }

    }
    rotateScene(deltaX, deltaY, object) {

        if (this.realRenderer.ptRenderer) {
            this.ptRenderer.reset();
        }
        // rotate on all axes
        
        // this.resetRenderer()
        // this.interface.updateCanvasWidth()

        var deltaRotationQuaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(
                THREE.MathUtils.degToRad(-this.speedX * 111),
                THREE.MathUtils.degToRad(this.speedY * 111),
                0,
                'XYZ'
            ));
        if (object)
            object.quaternion.multiplyQuaternions(deltaRotationQuaternion, object.quaternion);
        // object.rotation.y += deltaX * 3
        // object.rotation.x += deltaY * 3



    }
    rotateSceneMobile(deltaX, deltaY, object) {
        // object.rotation.y += deltaX * 3
        // object.rotation.x -= deltaY * 3

        var deltaRotationQuaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(
                THREE.MathUtils.degToRad(-deltaY * 111),
                THREE.MathUtils.degToRad(deltaX * 111),
                0,
                'XYZ'
            ));
        object.quaternion.multiplyQuaternions(deltaRotationQuaternion, object.quaternion);

    }

    onTouchMove(e) {

        const canvasWidth = this.renderer.domElement.clientWidth;
        const canvasHeight = this.renderer.domElement.clientHeight;

        // get delta for mobile
        var deltaX = (e.touches[0].clientX / canvasWidth) * 2 - 1 - this.mouse.x
        var deltaY = -(e.touches[0].clientY / canvasHeight) * 2 + 1 - this.mouse.y

        this.mouse.x = (e.touches[0].clientX / canvasWidth) * 2 - 1;
        this.mouse.y = -(e.touches[0].clientY / canvasHeight) * 2 + 1;

        if (this.interface.isDragging == false && !this.hoveringInterface && this.allowRotate && this.currentMode != SETUP && this.currentMode != RENDER && this.controls.enableRotate == false) {
            this.rotateSceneMobile(deltaX, deltaY, this.object.parent.parent)
            this.speedX += deltaY * 0.1
            this.speedY += deltaX * 0.3

        }
        if (this.intersects.length > 0) {
            if (this.interface.isDragging) {
                if (this.interface.hitTexture != -1) {
                    this.interface.dragTexture(this.intersects)
                }
                if (this.interface.hitText != -1) {

                    this.interface.dragText(this.intersects)

                }
            }


        } else {
            this.interface.isDragging = false
        }
    }
    onTouchEnd(e) {
        this.isDown = false
        this.interface.isDragging = false
        this.interface.hitTexture = -1
        this.interface.hitText = -1
        this.controls.enableRotate = false
    }

    onTouchStart(e) {


        const canvasWidth = this.renderer.domElement.clientWidth;
        const canvasHeight = this.renderer.domElement.clientHeight;


        this.mouse.x = (e.touches[0].clientX / canvasWidth) * 2 - 1;
        this.mouse.y = -(e.touches[0].clientY / canvasHeight) * 2 + 1;
        this.onTouchMove(e)
        this.checkIntersections()
        this.isDown = true

        if (this.intersects.length > 0) {
            if (!this.placingText) {
            }

            // this.controls.enableRotate = false
            var uvs = this.intersects[0].uv

            var index = this.interface.children.indexOf(this.interface.children.find(child => child.name == this.intersects[0].object.name))

            this.canvas = this.interface.canvases.image[index]
            var canvasText = this.interface.canvases.text[index]
            var textCtx = canvasText.getContext('2d')
            this.ctx = this.canvas.getContext('2d')
            var _this = this

            if (this.placingImage) {

                this.interface.addImageMobile(this.imageToPlace, this.placeOnIndex)
            } else if (this.placingText) {
                this.interface.addTextMobile(this.textToPlace, this.placeOnIndex)
            } else {

                for (var i = 0; i < this.interface.texts[index].length; i++) {
                    var text = this.interface.texts[index][i];
                    var measuredTextSize = textCtx.measureText(text.text)

                    const region = {
                        x: text.x - measuredTextSize.width / 2,
                        y: text.y - measuredTextSize.actualBoundingBoxAscent / 2,
                        width: measuredTextSize.width,
                        height: measuredTextSize.actualBoundingBoxAscent,
                    }

                    console.log(canvasText.width);

                    if (isInText(region, uvs.x * canvasText.width, canvasText.height - uvs.y * canvasText.height, text, textCtx)) {

                        this.interface.hit = i
                        this.interface.hitText = i
                        this.interface.isDragging = true
                        console.log('drag');

                    }
                }
                for (var i = 0; i < this.interface.images[index].length; i++) {
                    var image = this.interface.images[index][i]

                    const region = {
                        x: image.x,
                        y: image.y,
                        width: image.width,
                        height: image.height
                    }

                    if (isInImage(region, uvs.x * this.canvas.width, this.canvas.height - uvs.y * this.canvas.height, image, this.ctx)) {
                        this.interface.hitTexture = i
                        this.interface.hit = i
                        this.interface.isDragging = true

                    }

                }
            }




        }

    }


    onResize() {
        const scale = params.resolutionScale;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const dpr = window.devicePixelRatio;

        this.ptRenderer.setSize(w * scale * dpr, h * scale * dpr);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio * scale);
        this.resizeWithRatio(ratioObject[params.ratio])
    }
    onMouseDown(e) {
        this.isDown = true
 

        if (this.intersects.length > 0 && this.hit == -1 && !this.placingText && !this.placingImage) {
            this.interface.selectElement(this.intersects)


        } else {
            this.hit = -1
        }


    }
    onMouseUp(e) {
        if (this.realRenderer.ptRenderer) {
            this.realRenderer.reset()

        }
        
        this.isDown = false


        if (!this.dragged && this.currentMode == SETUP) {
            var _this = this
            var intersects2 = this.raycaster.intersectObjects(this.thirdGroup.children.filter((child) => child != _this.transformControls), true);
    
            for (var i = 0; i < intersects2.length; i++) {
                const currentObject = intersects2[i].object
    
    
                // Check if is controls or controls child
                var isControls = this.transformControls.getObjectById(intersects2[0].object.id) !== undefined || intersects2[0].object.type == 'TransformControls'
                var isSceneChild = this.loadedScene.getObjectById(intersects2[i].object.id) !== undefined
    
                if (currentObject.type == 'TransformControlsPlane') {
                    i++
                }
    
    
                var objectToSearchFor
                if (isSceneChild) {
                    objectToSearchFor = intersects2[i].object
                } else {
                    objectToSearchFor = intersects2[i].object.parent.parent.parent
                }
    
                if (this.transformControls.object != objectToSearchFor && !_this.transforming) {
    
                    this.transformControls.detach()
                    this.transformControls.attach(objectToSearchFor)
                    let objectId
                    if (isSceneChild) {
                        objectId = objectToSearchFor.name
                        const sceneInterface = document.getElementById('scene-interface')
                        const sceneInterfaceChildren = sceneInterface.childNodes
                        var nodeList = [...sceneInterfaceChildren]
                        const fieldSets= nodeList.slice(1)
                        const fieldSet = fieldSets.find(fieldset => fieldset.childNodes[0].textContent == objectId)
                        // check 
                        fieldSet.childNodes[0].childNodes[1].checked = true
                        console.log(fieldSet.childNodes[0].childNodes[1]);
                        
                    } else {
                        objectId = this.objectList.indexOf(
                            this.objectList.find((object) => object.getObjectById(intersects2[i].object.id) !== undefined)

                        )
                        _this.selectedObjectId = objectId + 1
                        const transformLightsDiv = document.getElementById('transform-lights')

                        if (this.objectList.length == 1) {
                            transformLightsDiv.childNodes[0].childNodes[0].childNodes[1].checked = true
                        } else {
                            if (parseInt(objectId) >= 1) {
                                const nodeList = [...transformLightsDiv.childNodes[0].childNodes[0].childNodes]
                                const fieldSets = nodeList.filter((node) => node.className == 'container')
                                const fieldSet = fieldSets.find(fieldset => {
                                    return fieldset.childNodes[0].textContent.split(" ")[1] == (parseInt(objectId) + 1).toString()
                                })
    
                                fieldSet.childNodes[1].checked = true
                                
                            } else {
                                const objectNameDiv = document.getElementById('object-name')
                                objectNameDiv.parentElement.childNodes[1].checked = true
                            }
               
                 
                        }

                    }


                    break
                } else {
                    break
                }
    
    
            }
        }

        this.dragged = false
    }

    checkIntersections() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        this.intersects = this.raycaster.intersectObjects(this.children);
        if (this.intersects.length > 0) {
            if (this.lastIntersected && this.lastIntersected.object != this.intersects[0].object && this.interface.isDragging) {
                this.interface.isDragging = false
            }
            this.lastIntersected = this.intersects[0]
        }
    }
    updateFrustumCuller() {
        this.cameraViewProjectionMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix);
    }
    animate() {
        var _this = this
        this.updateFrustumCuller();
        this.scene.traverse(function (object) {
            if (object instanceof THREE.Mesh) {
                if (_this.frustum.intersectsObject(object)) {
                    object.visible = true;
                    // render the object
                } else {
                    object.visible = false;
                }
            }
        });
        if (this.speedX > 0) {
            this.speedX -= Math.abs(this.speedX) * 0.1
        } else if (this.speedX < 0) {
            this.speedX += Math.abs(this.speedX) * 0.1
        }

        if (this.speedY > 0) {
            this.speedY -= Math.abs(this.speedY) * 0.1
        } else if (this.speedY < 0) {
            this.speedY += Math.abs(this.speedY) * 0.1
        }
        if (this.object.parent && (!this.realRenderer || this.realRenderer.fsQuad == null) && this.allowRotate && this.currentMode != SETUP && this.controls.enableRotate == false && this.currentMode != RENDER && (this.isDown || Math.abs(this.speedX) > 0.01 || Math.abs(this.speedY) > 0.01)) {
            this.rotateScene(0, 0, this.object.parent.parent)

        }
        requestAnimationFrame(this.animate);

        if (this.autoSpin) {
            this.object.parent.parent.rotation.y += 0.01

        }
        for (var i = 0; i < this.canvasTextures.length; i++) {
            this.canvasTextures[i].needsUpdate = true
        }
        this.checkIntersections()
        this.controls.update()

        if (this.realRenderer.ptRenderer != null) {
            this.realRenderer.render()
        }

        if (this.realRenderer.ptRenderer == null || this.realRenderer.ptRenderer.samples < 1.0 || !params.enable) {
            var renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

            this.renderer.render(this.scene, this.camera);

            // in your render loop

            // after the renderer has finished rendering
            // var imageData = renderTarget.toDataURL();

            // apply blur filter to the image data


        }

        this.camera.updateMatrixWorld();


    }
}


/**
 * Utils
 */

const applyMapSettings = (map) => {
    map.flipY = true
    map.wrapS = THREE.RepeatWrapping
    map.wrapT = THREE.RepeatWrapping
    map.repeat.set(1, 1)
    map.minFilter = THREE.LinearFilter
    map.magFilter = THREE.LinearFilter
}


var gl = new WebGL().init()
