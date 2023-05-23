import { BufferAttribute, BufferGeometry } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { StaticGeometryGenerator } from './StaticGeometryGenerator.js';
import { setCommonAttributes, getGroupMaterialIndicesAttribute } from './GeometryPreparationUtils.js';
import { mergeVertices } from './BufferGeometryUtils.js';

export class DynamicPathTracingSceneGenerator {

	get initialized() {

		return Boolean(this.bvh);

	}

	constructor(scene) {

		this.objects = Array.isArray(scene) ? scene : [scene];
		this.bvh = null;
		this.geometry = new BufferGeometry();
		this.materials = null;
		this.textures = null;
		this.lights = [];
		this.staticGeometryGenerator = new StaticGeometryGenerator(this.objects);

	}

	reset() {

		this.bvh = null;
		this.geometry.dispose();
		this.geometry = new BufferGeometry();
		this.materials = null;
		this.textures = null;
		this.lights = [];
		this.staticGeometryGenerator = new StaticGeometryGenerator(this.objects);

	}

	dispose() { }

	generate() {

		const { objects, staticGeometryGenerator, geometry } = this;
		if (this.bvh === null) {

			const attributes = ['position', 'normal', 'tangent', 'uv', 'color'];

			for (let i = 0, l = objects.length; i < l; i++) {

				objects[i].traverse(c => {
					if (c.isMesh) {

						const normalMapRequired = ! !c.material.normalMap;
					
						 setCommonAttributes( c.geometry, { attributes, normalMapRequired } );
						// computeTangents requires an index buffer

						if (!c.geometry.attributes.normal && (attributes && attributes.includes('normal'))) {
							c.geometry.computeVertexNormals();
						}

						if (!c.geometry.attributes.uv && (attributes && attributes.includes('uv'))) {

							const vertCount = c.geometry.attributes.position.count;
							c.geometry.setAttribute('uv', new BufferAttribute(new Float32Array(vertCount * 2), 2, false));

						}
						if (!c.geometry.attributes.color) {
							console.log('TNO COLOR WHY!?!?', c);
						}
					

						if (!c.geometry.attributes.tangent && (attributes && attributes.includes('tangent'))) {

							if (normalMapRequired) {

								// computeTangents requires an index buffer
								if (c.geometry.index === null) {
									console.log(c.geometry);
									c.geometry = mergeVertices(c.geometry);
									console.log(c.geometry);
								}

								c.geometry.computeTangents();


							} else {
								const vertCount = c.geometry.attributes.position.count;
								c.geometry.setAttribute('tangent', new BufferAttribute(new Float32Array(vertCount * 4), 4, false));
							}

						}

						if (!c.geometry.attributes.color && (attributes && attributes.includes('color'))) {
							console.log(c);

							const vertCount = c.geometry.attributes.position.count;
							const array = new Float32Array(vertCount * 4);
							array.fill(1.0);
							c.geometry.setAttribute('color', new BufferAttribute(array, 4));

						}

						if (!c.geometry.index) {
							// TODO: compute a typed array
							const indexCount = c.geometry.attributes.position.count;
							const array = new Array(indexCount);
							for (let i = 0; i < indexCount; i++) {

								array[i] = i;

							}

							c.geometry.setIndex(array);

						}

					} else if (c.isRectAreaLight || c.isSpotLight) {

						this.lights.push(c);

					}

				});

			}

			const textureSet = new Set();
			const materials = staticGeometryGenerator.getMaterials();
			materials.forEach(material => {

				for (const key in material) {

					const value = material[key];
					if (value && value.isTexture) {

						textureSet.add(value);

					}

				}

			});

			staticGeometryGenerator.attributes = attributes;
			staticGeometryGenerator.generate(geometry);

			const materialIndexAttribute = getGroupMaterialIndicesAttribute(geometry, materials, materials);
			geometry.setAttribute('materialIndex', materialIndexAttribute);
			geometry.clearGroups();

			this.bvh = new MeshBVH(geometry);
			this.materials = materials;
			this.textures = Array.from(textureSet);

			return {
				lights: this.lights,
				bvh: this.bvh,
				materials: this.materials,
				textures: this.textures,
				objects,
			};

		} else {

			const { bvh } = this;
			staticGeometryGenerator.generate(geometry);
			bvh.refit();
			return {
				lights: this.lights,
				bvh: this.bvh,
				materials: this.materials,
				textures: this.textures,
				objects,
			};

		}

	}


}
