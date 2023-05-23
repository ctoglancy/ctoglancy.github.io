var canvasResolution = 10

import * as THREE from 'three'
import {isInText, isInImage} from './global'

class Interface {
    constructor({ children, gl, canvases, }) {
        this.selectedIndex = 0

        this.children = children
        this.gl = gl
        this.canvases = {
            text: canvases.text,
            image: canvases.image
        }
        this.canvas = canvases.text[this.selectedIndex]
        this.pointer = {}
        this.ctx = this.canvas.getContext('2d')
        this.offsetX = this.canvas.offsetLeft
        this.offsetY = this.canvas.offsetTop
        this.hit = -1;
        this.hitTexture = -1;

        this.lastX = 0
        this.lastY = 0
        this.draggingElement = {
            x: 0,
            y: 0,
            fontSize: 15,
            text: 'Test'
        }
        this.isDown = false
        this.texts = []
        this.textEditors = []
        this.colorPickers = []
        this.imageEditors = []
        this.nextTextColor = '#000000'
        this.nextTextFont = 'Arial'
        this.hoveringInterface = false
        this.images = []
        this.isDragging = false
    }
    listScenes() {
        var _this = this
        // replace entire interface with a list of 3 items
        const inter = document.getElementsByClassName('interface')[0]
        // clear interface
        while (inter.children.length > 0) {
            inter.removeChild(inter.lastChild)
        }
        inter.style.height = 'auto'


        const list = document.createElement('div')
        list.className = 'list'
        const scene1 = document.createElement('div')
        scene1.className = 'scene-item'
        scene1.textContent = 'Towel Scene 🛁'
        const scene2 = document.createElement('div')
        scene2.className = 'scene-item'
        scene2.textContent = 'Product Scene 🟨'
        const scene3 = document.createElement('div')
        scene3.className = 'scene-item'
        scene3.textContent = 'Red Wall Scene 🧱'
        list.appendChild(scene1)

        scene1.addEventListener('click', () => {
            _this.gl.startSceneSetup(1);
        })
        scene2.addEventListener('click', () => {
            _this.gl.startSceneSetup(2);
        })
        scene3.addEventListener('click', () => {
            _this.gl.startSceneSetup(3);
        })

        list.appendChild(scene2)
        list.appendChild(scene3)
        inter.appendChild(list)


    }
    create(texts, images) {
        const submeshesDiv = document.getElementsByClassName('submeshes')[0]
        document.getElementsByClassName('interface')[0].addEventListener('mouseover', () => {
            this.hoveringInterface = true
        })
        document.getElementsByClassName('interface')[0].addEventListener('mouseout', () => {
            this.hoveringInterface = false
        })
        // add touch start and end for interface
        document.getElementsByClassName('interface')[0].addEventListener('touchstart', () => {
            this.hoveringInterface = true
        })
        document.getElementsByClassName('interface')[0].addEventListener('touchend', () => {
            this.hoveringInterface = false
        })
        document.getElementById('panel').addEventListener('mouseover', () => {
            this.hoveringInterface = true
        })
        document.getElementById('panel').addEventListener('mouseout', () => {
            this.hoveringInterface = false
        })

        window.addEventListener('keyup', (event) => {
            if (event.key === 'Delete' || event.key === 'Backspace')
                // only if text editor is open
                if (this.textEditors[this.selectedIndex].style.display == 'block') {
                    this.removeText(this.selectedIndex)
                } else if (this.imageEditors[this.selectedIndex].style.display == 'block') {
                    this.removeImage(this.selectedIndex)
                }
        })

        //remove all submeshes except first
        while (submeshesDiv.children.length > 0) {
            submeshesDiv.removeChild(submeshesDiv.lastChild)
        }

        for (var i = 0; i < this.children.length; i++) {
             const name = this.children[i].name.toString()
            if (texts && images) {
                this.texts.push(texts[i])
                this.images.push(images[i])
                this.canvas = this.canvases.image[i]
                 this.ctx = this.canvas.getContext('2d')
                 console.log(this.children);
                 this.draw(this.canvases.image[i].getContext('2d'), i)
                 this.updateCanvasWidth(this.canvas, true, false, name)

                 this.canvas = this.canvases.text[i]
                 this.ctx = this.canvas.getContext('2d')
                this.draw(this.canvases.text[i].getContext('2d'), i)

                 
          
                     this.addEventListenersToCanvas(i, this.canvas)
                     this.updateCanvasWidth(this.canvas, true, true, name)
         
            
            } else {
                this.texts.push([])
                this.images.push([])
                
            }

            const div = document.createElement('div')
            const nameDiv = document.createElement('div')
            div.appendChild(nameDiv)
            nameDiv.textContent += this.children[i].name.toString() + "\r\n";
            div.id = this.children[i].name.toString()
            nameDiv.className = 'material'
            nameDiv.onclick = (e) => {
                var name = e.target.textContent.toString()
                var index = this.children.indexOf(this.children.find(child => child.name.trim() == name.trim()))
                if (window.innerWidth > 1000) {

                    div.children[1].style.display = div.children[1].style.display == 'none' ? 'grid' : 'none'
                } else {
                    selectMaterial(div.children[0], this.selectedIndex, index)
                }
                this.selectedIndex = index

            }
            submeshesDiv.appendChild(div)
            const submenu = document.getElementById('submenu')
            const clone = submenu.cloneNode(false)
            clone.id = 'submenu-' + i


            const textButton = document.getElementById('add-text')
            const textClone = textButton.cloneNode(true)
            textClone.id = 'add-text-' + i

           textClone.onclick = (e) => {
                // Start Text Editor
                var name = e.target.parentElement.parentElement.id.toString()
                var index = this.children.indexOf(this.children.find(child => child.name.trim() == name.trim()))

                this.toggleTextEditor(index, this.children[index].name)
                this.nextTextColor = '#000000'
                for (var i = 0; i < this.children.length; i++) {
                    this.colorPickers[i].style.display = 'none'
                    this.imageEditors[i].style.display = 'none'
                    if (i != index)
                        this.textEditors[i].style.display = 'none'

                }
                this.selectedIndex = index
            }
            clone.appendChild(textClone)

            const imageButton = document.getElementById('add-image')
            const imageClone = imageButton.cloneNode(true)
             imageClone.id = 'add-image-' + i

           imageClone.onclick = (e) => {
                // Start Image editor
                var name = e.target.parentElement.parentElement.id.toString()
                var index = this.children.indexOf(this.children.find(child => child.name.trim() == name.trim()))
                this.toggleImageEditor(index, this.children[index].name)

                for (var i = 0; i < this.children.length; i++) {
                    this.textEditors[i].style.display = 'none'
                    this.colorPickers[i].style.display = 'none'
                    if (i != index)
                        this.imageEditors[i].style.display = 'none'
                }
                this.selectedIndex = index
            }

            clone.appendChild(imageClone)

            const colorButton = document.getElementById('add-color')
            const colorClone = colorButton.cloneNode(true)
                colorClone.id = 'add-color-' + i
            
            colorClone.onclick = (e) => {
                // Start Text Editor
                var name = e.target.parentElement.parentElement.id.toString()
                var index = this.children.indexOf(this.children.find(child => child.name.trim() == name.trim()))

                this.toggleColorEditor(index)
                for (var i = 0; i < this.children.length; i++) {
                    this.textEditors[i].style.display = 'none'
                    this.imageEditors[i].style.display = 'none'
                    if (i != index)
                        this.colorPickers[i].style.display = 'none'
                }
                this.selectedIndex = index
            }

            clone.appendChild(colorClone)

            const downloadButton = document.getElementById('download-material')
            const downloadClone = downloadButton.cloneNode(true)
            downloadClone.id = 'download-material-' + i


            downloadClone.onclick = (e) => {
                console.log('clicked download button');

                var name = e.target.parentElement.parentElement.id.toString()
                var index = this.children.indexOf(this.children.find(child => child.name.trim() == name.trim()))

                this.downloadCombinedTexture(index)
            }


            clone.appendChild(downloadClone)




            div.appendChild(clone)
            this.initTextEditor(i, this.children[i].name)
            this.initImageEditor(i, this.children[i].name)
            this.initColorEditor(i, this.children[i].name)
        }
      
        const submenuMobile = document.getElementById('mobile-submenu')
        submenuMobile.children[0].addEventListener('click', (e) => {
            // Start Text Editor
            var index = this.selectedIndex


            this.toggleTextEditor(index)
            this.nextTextColor = '#000000'
            for (var i = 0; i < this.children.length; i++) {
                this.colorPickers[i].style.display = 'none'
                this.imageEditors[i].style.display = 'none'
                if (i != index)


                    this.textEditors[i].style.display = 'none'

            }
        })
        submenuMobile.children[1].addEventListener('click', (e) => {
            // Start Image editor
            var index = this.selectedIndex

            this.toggleImageEditor(index)

            for (var j = 0; j < this.children.length; j++) {
                this.textEditors[j].style.display = 'none'
                this.colorPickers[j].style.display = 'none'
                if (j != index)
                    this.imageEditors[j].style.display = 'none'
            }
        })

        return this
    }
    downloadCombinedTexture(index) {
        var destinationCanvas = document.createElement('canvas');
        
        var canvasImage = this.canvases.image[index]
        var canvasText = this.canvases.text[index]

        var material = this.children[index].material[0]
        var color = material.color

        destinationCanvas.width = 180 * canvasResolution
        destinationCanvas.height = 180 * canvasResolution

        // const baseMaterial = this.children[index].material

        var destCtx = destinationCanvas.getContext('2d');
        destCtx.fillStyle = color.getStyle()
        destCtx.fillRect(0, 0, destinationCanvas.width, destinationCanvas.height)
        destCtx.drawImage(canvasImage, 0, 0);
        destCtx.drawImage(canvasText, 0, 0);
        var link = document.createElement('a');
        link.download = 'combined.png';
        link
            .href = destinationCanvas
                .toDataURL("image/png")
                .replace("image/png", "image/octet-stream");
        link.click();


    
    }
    dragTexture(intersects) {
        var index = this.children.indexOf(this.children.find(child => child.name == intersects[0].object.name))
        this.canvas = this.canvases.image[index]
        this.ctx = this.canvas.getContext('2d')
        var uvs = intersects[0].uv

        if (this.isDragging) {
            this.gl.controls.enableRotate = false
            var hitImage = this.images[index][this.hitTexture]
            hitImage.x = uvs.x * this.canvas.width - hitImage.width / 2
            hitImage.y = this.canvas.height - uvs.y * this.canvas.height - hitImage.height / 2

        }
        this.draw(this.ctx, index)

    }
    dragText(intersects) {
        var index = this.children.indexOf(this.children.find(child => child.name == intersects[0].object.name))
        this.canvas = this.canvases.text[index]
        this.ctx = this.canvas.getContext('2d')
        var uvs = intersects[0].uv

        if (this.isDragging) {
            this.gl.controls.enableRotate = false
            var hitText = this.texts[index][this.hitText]
            hitText.x = uvs.x * this.canvas.width
            hitText.y = this.canvas.height - uvs.y * this.canvas.height

        }
        this.draw(this.ctx, index)

    }



    updateCanvasWidth(canvas, turningOn, text, name) {
        // update canvas width and height to 180 * canvasResolution and update the material accordingly to render the new CanvasTexture
        console.log(name);
        if (turningOn) {
            canvas.width = 180 * canvasResolution
            canvas.height = 180 * canvasResolution
        } else {
            canvas.width = 1800
            canvas.height = 1800
            // change to 0
        }
        var canvasTexture = new THREE.CanvasTexture(canvas)
        if (turningOn && text) {
            this.gl.canvasTextures[canvas.id * 2 + 1] = canvasTexture
            this.gl.object.getObjectByName(name).material[3].map = canvasTexture
            this.gl.object.getObjectByName(name).material[3].needsUpdate = true
        } else if (turningOn && !text) {
            console.log(this.gl.object);
            this.gl.canvasTextures[canvas.id * 2] = canvasTexture
            this.gl.object.getObjectByName(name).material[2].map = canvasTexture
            this.gl.object.getObjectByName(name).material[2].needsUpdate = true
        }
        this.ctx = canvas.getContext('2d')
        this.draw(this.ctx, canvas.id)
    }
    toggleTextEditor(i, name) {
        const grid = this.textEditors[i]
        this.canvas = this.canvases.text[i]
        this.ctx = this.canvas.getContext('2d')
        this.nextTextFont = 'Arial'
        if (this.textEditors[i].style.display == 'none') {
            this.addEventListenersToCanvas(i, this.canvas)
            grid.style.display = 'block'
            this.updateCanvasWidth(this.canvas, true, true, name)

        } else {
            this.removeEventListenersFromCanvas(i, this.canvas)
            grid.style.display = 'none'
            this.updateCanvasWidth(this.canvas, false, true, name)
        }

    }
    toggleColorEditor(i) {
        const colorPicker = this.colorPickers[i]
        colorPicker.style.display = colorPicker.style.display == 'none' ? 'block' : 'none'

    }
    toggleImageEditor(i, name) {
        this.canvas = this.canvases.image[i]

        this.ctx = this.canvas.getContext('2d')
        if (this.imageEditors[i].style.display == 'none') {
            this.addEventListenersToCanvas(i, this.canvas)
            this.updateCanvasWidth(this.canvas, true, false, name)

        } else {
            this.removeEventListenersFromCanvas(i, this.canvas)
            this.updateCanvasWidth(this.canvas, false, false, name)
        }
        const imageEditor = this.imageEditors[i]
        imageEditor.style.display = imageEditor.style.display == 'none' ? 'block' : 'none'

    }
    initImageEditor(index, name) {
        this.canvas = this.canvases.image[index]
        this.ctx = this.canvas.getContext('2d')


        const imageEditor = document.getElementById('image-editor')
        const clone = imageEditor.cloneNode(true)
        clone.style.display = 'none'
        imageEditor.parentElement.appendChild(clone)
        clone.insertBefore(this.canvas, clone.children[1])
        clone.children[0].children[6].textContent = this.children[index].name

        clone.children[0].children[0].addEventListener('input', (e) => {
            var imageFile = e.target.files
            this.addImage(imageFile, index)
        })
        this.imageEditors.push(clone)
        const rotationInput = clone.children[0].children[8].children[0]
        rotationInput.addEventListener('input', (event) => {
            this.images[index][this.hit].rotation = event.target.value
            this.draw(this.ctx, index)
        })

        const sizeInput = clone.children[0].children[9].children[0]
        sizeInput.addEventListener('input', (event) => {
            this.images[index][this.hit].scale = event.target.value
            this.draw(this.ctx, index)
        })

        clone.children[0].children[10].addEventListener('click', (e) => {
            this.images[index].splice(this.hit, 1)
            this.draw(this.ctx, index)
        })


        const carousel = clone.children[0].children[13]

        // if mobile
        if (window.innerWidth < 1000) {
            // loop through children of carousel

            for (var k = 0; k < carousel.children.length; k++) {
                // add image to canvas
                carousel.children[k].addEventListener('click', (e) => {
                    this.gl.placingImage = true
                    this.gl.imageToPlace = e.target
                    this.gl.placeOnIndex = index
                })
            }
        }
    }
    addTextMobile(text, index) {
        this.canvas = this.canvases.text[index]
        this.ctx = this.canvas.getContext('2d')

        var uv = this.gl.intersects[0].uv

        this.texts[index].push({

            x: uv.x * this.canvas.width,
            y: this.canvas.height - uv.y * this.canvas.height,
            fontSize: 15,
            color: this.nextTextColor,
            text: text,
            rotation: 0,
            font: this.nextTextFont
        });
        this.gl.placingText = false
        this.gl.textToPlace = null
        this.gl.placeOnIndex = null
        this.draw(this.ctx, index)
    }
    addImageMobile(file, index) {
        this.canvas = this.canvases.image[index]
        this.ctx = this.canvas.getContext('2d')


        var uv = this.gl.intersects[0].uv

        // draw on canvas
        var image = new Image();
        image.src = file.src;
        image.onload = () => {

            // push and place in center
            this.images[index].push({

                image: image,
                x: uv.x * this.canvas.width - image.width / 2,
                y: this.canvas.height - uv.y * this.canvas.height - image.height / 2,
                scale: 1,
                rotation: 0
            })


            this.gl.placingImage = false
            this.gl.imageToPlace = null
            this.gl.placeOnIndex = null
            this.draw(this.ctx, index)

        }



    }

    addImage(file, index) {
        this.canvas = this.canvases.image[index]
        this.ctx = this.canvas.getContext('2d')
        console.log(this.canvas);

        const reader = new FileReader()
        var _this = this

        reader.onload = function () {
            var image = new Image();
            image.src = reader.result;

            image.onload = function () {
                var width = image.width
                var height = image.height
                var minWidth = Math.min(width, _this.canvas.width)
                var minHeight = Math.min(height, _this.canvas.height )


                if (minWidth > minHeight) {
                    var scale = minHeight / height * 1
                } else {
                    var scale = minWidth / width * 1
                }
                var x = _this.canvas.width / 2 - width / 2 * scale
                var y = _this.canvas.height / 2 - height / 2 * scale
                _this.images[index].push({
                    image: image,
                    // place in center
                    x: x,
                    y: y,

                    width: 500,
                    height: 500,
                    scale: 1,
                    rotation: 0,
                })
                _this.draw(_this.ctx, index)
                _this.draw(_this.ctx, index)
            }
        }
        reader.readAsDataURL(file[0]);
    }
    initColorEditor(index, name) {

        const colorPicker = document.getElementById('color-picker')
        colorPicker.style.display = 'none'
        const colorPickerClone = colorPicker.cloneNode(true)
        colorPicker.parentElement.appendChild(colorPickerClone)


        colorPickerClone.children[0].addEventListener('input', (event) => {
            this.gl.updateMaterialColor(event.target.value, index, name)
        })
        this.colorPickers.push(colorPickerClone)

    }

    addEventListenersToCanvas = (index, canvas) => {
        this.canvas = canvas

        this.mouseMove = (event) => {
            this.handleMouseMove(event, index)
        }
        this.mouseMoveHandler = this.mouseMove.bind(this)

        this.mouseDown = (event) => {
            this.handleMouseDown(event, index)
        }
        this.mouseDownHandler = this.mouseDown.bind(this)

        this.mouseUp = (event) => {

            this.handleMouseUp(event, index)
        }
        this.mouseUpHandler = this.mouseUp.bind(this)

        this.mouseOut = (event) => {
            this.handleMouseUp(event, index)
        }

        this.mouseOutHandler = this.mouseOut.bind(this)

        canvas.addEventListener('mousemove', this.mouseMoveHandler)
        canvas.addEventListener('mousedown', this.mouseDownHandler)
        canvas.addEventListener('mouseup', this.mouseUpHandler)
        canvas.addEventListener('mouseout', this.mouseOutHandler)

    }

    removeEventListenersFromCanvas = (index, canvas) => {
        this.canvas = canvas
        canvas.removeEventListener('mousemove', this.mouseMoveHandler)
        canvas.removeEventListener('mousedown', this.mouseDownHandler)
        canvas.removeEventListener('mouseup', this.mouseUpHandler)
        canvas.removeEventListener('mouseout', this.mouseOutHandler)
    }


    initTextEditor(index, name) {
        this.canvas = this.canvases.text[index]
        this.ctx = this.canvas.getContext('2d')
        const grid = document.getElementById('grid')

        var gridClone = grid.cloneNode(true)
        grid.parentElement.appendChild(gridClone)
        gridClone.insertBefore(this.canvas, gridClone.children[1])

        this.textEditors.push(gridClone)

        gridClone.children[0].children[10].textContent = this.children[index].name
        const textInput = gridClone.children[0].children[0]
        textInput.addEventListener('keydown', (event) => {
            if (event.key == 'Enter') {
                if (window.innerWidth < 1000) {

                    this.gl.placingText = true
                    this.gl.textToPlace = event.target.value
                    this.gl.placeOnIndex = index
                } else {
                    this.addNewText(event.target.value, index)

                }
            }

        })

        var addButton = gridClone.children[0].children[2]
        addButton.addEventListener('click', (event) => {
            if (window.innerWidth < 1000) {

                this.gl.placingText = true
                this.gl.textToPlace = textInput.value
                this.gl.placeOnIndex = index
            } else {
                this.addNewText(textInput.value, index)
                console.log(index);

            }
        })


        const textFontInput = gridClone.children[0].children[3]
        textFontInput.addEventListener('change', (event) => {
            this.nextTextFont = event.target.value;

            if (this.hit != -1) {
                this.texts[index][this.hit].font = event.target.value
                this.draw(this.ctx, index)
            }
        })
        const textColorInput = gridClone.children[0].children[7]
        textColorInput.addEventListener('input', (event) => {
            this.nextTextColor = event.target.value;
            if (this.hit != -1) {
                this.texts[index][this.hit].color = event.target.value
                this.draw(this.ctx, index)
            }
        })

        const rotationInput = gridClone.children[0].children[12].children[0]
        rotationInput.addEventListener('input', (event) => {
            this.texts[index][this.hit].rotation = event.target.value
            this.draw(this.ctx, index)
        })

        const sizeInput = gridClone.children[0].children[13].children[0]
        sizeInput.addEventListener('input', (event) => {
            this.texts[index][this.hit].fontSize = event.target.value
            this.draw(this.ctx, index)
        })

        gridClone.children[0].children[14].addEventListener('click', (event) => {
            this.texts[index].splice(this.hit, 1)
            this.draw(this.ctx, index)
        })

    }
    removeText(index) {
        this.texts[index].splice(this.hit, 1);
        this.draw(this.ctx, index)

    }
    removeImage(index) {
        this.images[index].splice(this.hit, 1);
        this.draw(this.ctx, index)
    }
    addNewText(text, index) {
        this.texts[index].push({
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            fontSize: 15,
            color: this.nextTextColor,
            text: text,
            rotation: 0,
            font: this.nextTextFont
        });
        this.draw(this.ctx, index)
    }


    draw(ctx, index) {
        var circles = this.texts[index]
        console.log(this.texts);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.ctx == this.canvases.text[index].getContext('2d')) {
            // console.log('drawing text');
            for (var i = 0; i < circles.length; i++) {
                var circle = circles[i];
                ctx.beginPath();
                ctx.font = circle.fontSize * canvasResolution + 'px ' + circle.font
                if (this.hit == i) {
                    ctx.shadowColor = "black";
                    ctx.shadowBlur = 7;
                    ctx.lineWidth = 5;
                } else {

                    ctx.shadowBlur = 0;
                }
                ctx.fillStyle = circle.color
                ctx.save()
                var rotation = circle.rotation * Math.PI / 50;
                if (rotation != 0) {
                    ctx.translate(circle.x, circle.y);
                }
                ctx.rotate(rotation)
                if (rotation != 0) {
                    ctx.translate(-circle.x, -circle.y);
                }
                ctx.textAlign = 'center'


                ctx.fillText(circle.text, circle.x, circle.y);
                ctx.restore()
                ctx.closePath();
                ctx.fill();
            }
        }
        var _this = this
        var images = this.images[index]
        if (this.ctx == this.canvases.image[index].getContext('2d')) {
            for (var i = 0; i < images.length; i++) {
                var image = images[i].image

                var width = image.width
                var height = image.height
                var minWidth = Math.min(width, _this.canvas.width )
                var minHeight = Math.min(height, _this.canvas.height )


                if (minWidth > minHeight) {
                    var scale = minHeight / height * images[i].scale
                } else {
                    var scale = minWidth / width * images[i].scale
                }
                var x = images[i].x
                var y = images[i].y


                var angle = images[i].rotation * Math.PI / 50;
                ctx.save()
                ctx.translate(x + width * scale / 2, y + height * scale / 2);
                ctx.rotate(angle)
                ctx.translate(-x - width * scale / 2, -y - height * scale / 2);

                ctx.drawImage(image, x, y, width * scale, height * scale);
                ctx.restore()


                ctx.restore()
                images[i].width = width * scale
                images[i].height = height * scale
                images[i].x = x
                images[i].y = y

            }
        }


    }
    handleMouseMove(event, index) {
        if (!this.isDown) {
            return
        }

        event.preventDefault();
        event.stopPropagation();
        // get coordinates relative to its size
        this.pointer.x = event.offsetX
        this.pointer.y = event.offsetY

        var dx = this.pointer.x - this.lastX;
        var dy = this.pointer.y - this.lastY;

        this.lastX = this.pointer.x;
        this.lastY = this.pointer.y;

        this.draggingElement.x += dx;
        this.draggingElement.y += dy;

        if (this.hitTexture != -1) {
            console.log(this.hitTexture);
        }

        this.draw(this.ctx, index)
    }
    handleMouseDown(event, index) {

        event.preventDefault();
        event.stopPropagation();

        // save the mouse position
        // in case this becomes a drag operation
        this.lastX = event.offsetX
        this.lastY = event.offsetY

        var _this = this;

        this.hit = -1


        if (this.ctx == this.canvases.text[index].getContext('2d')) {

            // hit test all existing texts
            for (var i = 0; i < this.texts[index].length; i++) {
                var text = this.texts[index][i];
                var measuredTextSize = this.ctx.measureText(text.text)

                const region = {
                    x: text.x - measuredTextSize.width / 2,
                    y: text.y - measuredTextSize.actualBoundingBoxAscent / 2,
                    width: measuredTextSize.width,
                    height: measuredTextSize.actualBoundingBoxAscent,
                }



                if (isInText(region, this.lastX, this.lastY, text, this.ctx)) {
                    this.hit = i
                }
            }

        } else if (this.ctx == this.canvases.image[index].getContext('2d')) {

            for (var i = 0; i < this.images[index].length; i++) {
                var image = this.images[index][i]
                var measuredImageSize = {
                    width: image.width,
                    height: image.height

                }
                const region = {

                    x: image.x,
                    y: image.y,
                    width: measuredImageSize.width,
                    height: measuredImageSize.height,
                }
                if (isInImage(region, this.lastX, this.lastY, image, this.ctx)) {
                    this.hit = i
                }
            }
        }

        if (this.hit < 0) {
            this.draw(this.ctx, index)
        } else {
            // this.draggingElement =  this.texts[index][this.hit];
            this.draggingElement =
                this.ctx == this.canvases.image[index].getContext('2d') ? this.images[index][this.hit] : this.texts[index][this.hit]
            this.isDown = true;
        }

    }
    handleMouseUp(event, index) {
        this.isDown = false
        this.draw(this.ctx, index)

    }
    selectElement(intersects) {
        if ((!this.hoveringInterface || window.innerWidth < 1000 ) && this.gl.currentMode == 0) {
            var oldIndex = this.selectedIndex
            this.selectedIndex = this.children.indexOf(this.children.find(child => child.name == intersects[0].object.name))

            const divElement = document.getElementById('submenu-'   + this.selectedIndex)
            console.log(divElement);
            // if not mobile
            if (window.innerWidth > 1000 && divElement) {
                divElement.style.display = divElement.style.display == 'none' ? 'grid' : 'none'
            } else if (!this.gl.placingImage && !this.gl.placingText && divElement) {
                selectMaterial(divElement, oldIndex, this.selectedIndex)
            }


        }

    }
}

export default Interface;