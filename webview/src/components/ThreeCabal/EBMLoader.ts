import { BufferGeometry, LoadingManager, DefaultLoadingManager, FileLoader, Group, Mesh, Vector3, Color, MixOperation, Texture, Material, Skeleton, AnimationClip, Bone, Matrix4, Float32BufferAttribute, SkinnedMesh, Uint16BufferAttribute, KeyframeTrack, Quaternion, VectorKeyframeTrack, QuaternionKeyframeTrack, MeshBasicMaterial, DoubleSide, BoxGeometry, RepeatWrapping, } from 'three';
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js';
import { EBMReader, Influence, Rotation, Translation } from './EBMReader';

// let estType: string = "EBM";
const FILE_TYPE = 0x03ED03;
export class EBMLoader {
    // private manager: LoadingManager;
    private fileLoader: FileLoader;

    constructor(manager: LoadingManager = DefaultLoadingManager) {
        // this.manager = manager;
        this.fileLoader = new FileLoader(manager);
        this.fileLoader.setResponseType('arraybuffer'); // 新增这行
    }

    public load(url: string, onLoad: (group: Group) => void, onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void) {
        this.fileLoader.load(url, (data) => {

            if (data instanceof ArrayBuffer) { // 现在data会是ArrayBuffer类型
                try {
                    const group = this.parse(data);

                    onLoad(group);
                } catch (e) {
                    onError?.(e);
                }
            } else {
                onError?.(new Error('Invalid binary data'));
            }
        }, onProgress, onError);
    }

    public parse(buffer: ArrayBuffer): Group {
        // 将 Buffer 转成 DataView
        const dataView = new DataView(buffer);

        const ebm = new EBMReader(dataView);

        const group = this.reader(ebm);


        return group;
    }

    public reader(ebm: EBMReader): Group {

        const group = new Group();
        try {
            const materials = createMaterial(ebm);
            const skeleton = createSkeleton(ebm);
            const meshs = createMesh(ebm, materials, skeleton);
            group.add(...meshs);
            const animations = createAnimations(ebm, skeleton);
            group.animations = animations;

        } catch (error) {
            console.warn(error)
        }
        return group;
    }
}



const createSkeleton = (ebm: EBMReader): Skeleton => {
    const bones: Bone[] = [];
    ebm.sk.bones.forEach(boneData => {
        const { id, parent_bone_index, bone_space_matrix, parent_bone_space_matrix } = boneData;
        const bone = new Bone();
        bone.name = id.text;
        const worldMatrix = new Matrix4().fromArray(bone_space_matrix.col).invert();
        bone.matrix.copy(worldMatrix);
        if (parent_bone_index !== -1) {
            const localMatrix = new Matrix4().fromArray(parent_bone_space_matrix.col).invert().multiply(worldMatrix);
            bone.matrix.copy(localMatrix);
            bones[parent_bone_index].add(bone);
        }
        // bone.matrixAutoUpdate = false;
        bone.matrix.decompose(bone.position, bone.quaternion, bone.scale)
        bones.push(bone);
    })
    return new Skeleton(bones);
}
// 修改 createMesh 函数
const createMesh = (ebm: EBMReader, materials: Material[], skeleton: Skeleton) => {
    return ebm.ge.meshes.map((meshData, meshIndex) => {
        try {
            const { id, positions, normals, uvs, faces, influence_count, influences, material_index } = meshData;

            // ✅ 重要修复：检查顶点数是否为0
            if (positions.length === 0 || positions.length !== meshData.vertex_count * 3) {
                console.warn(`网格 ${meshIndex} (${id.text}) 顶点数据异常，创建占位网格`);
                return createPlaceholderMesh(meshIndex, id.text);
            }

            const geometry = new BufferGeometry();

            // 验证并设置属性
            if (positions.length > 0) {
                geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
            }

            if (normals && normals.length === positions.length) {
                geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
            } else {
                console.warn(`网格 ${meshIndex} 法线数据异常，自动计算`);
                geometry.computeVertexNormals();
            }

            if (uvs && uvs.length > 0) {
                geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
            }

            if (faces && faces.length > 0) {
                geometry.setIndex(faces);
            }

            // 验证材质索引
            const materialIndex = material_index >= 0 && material_index < materials.length
                ? material_index
                : 0;

            let mesh: Mesh | SkinnedMesh;

            // ✅ 修复：只有有顶点且需要蒙皮时才创建SkinnedMesh
            if (influence_count === 0 || !skeleton || skeleton.bones.length === 0) {
                // 静态网格
                mesh = new Mesh(geometry, materials[materialIndex]);
                // console.log(`创建静态网格: ${id.text}`);
            } else {
                // 蒙皮网格
                mesh = new SkinnedMesh(geometry, materials[materialIndex]);

                // 验证骨骼数据
                if (skeleton && skeleton.bones.length > 0) {
                    try {
                        setupSkinnedMesh(mesh as SkinnedMesh, influences, skeleton);
                    } catch (skinningError) {
                        console.warn(`网格 ${meshIndex} 蒙皮设置失败:`, skinningError);
                        // 回退到静态网格
                        mesh = new Mesh(geometry, materials[materialIndex]);
                    }
                } else {
                    mesh = new Mesh(geometry, materials[materialIndex]);
                }
            }

            mesh.name = id?.text || `mesh_${meshIndex}`;
            mesh.userData = {
                originalMeshIndex: meshIndex,
                vertexCount: positions.length / 3
            };

            return mesh;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            // console.error(`创建网格 ${meshIndex} 失败:`, error);
            // 创建一个简单的占位网格
            return createPlaceholderMesh(meshIndex, meshData.id?.text);
        }
    });
};

// 创建占位网格函数
function createPlaceholderMesh(index: number, name?: string): Mesh {
    const placeholderGeometry = new BoxGeometry(0.1, 0.1, 0.1); // 更小的占位网格
    const placeholderMaterial = new MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        transparent: true,
        opacity: 0.5
    });
    const placeholder = new Mesh(placeholderGeometry, placeholderMaterial);
    placeholder.name = name ? `error_${name}` : `error_mesh_${index}`;

    // 添加用户数据标识
    placeholder.userData = {
        isPlaceholder: true,
        originalName: name,
        error: true
    };

    return placeholder;
}



const setupSkinnedMesh = (mesh: SkinnedMesh, influences: Influence[], skeleton: Skeleton): void => {
    // 筛选根骨骼数组
    const rootBones = skeleton.bones.filter(bone => !(bone.parent instanceof Bone));
    // 添加根骨骼 绑定骨架
    mesh.add(...rootBones);
    mesh.bind(skeleton);
    // 初始化蒙皮索引和权重
    const skinIndices: number[][] = [];
    const skinWeights: number[][] = [];

    influences.forEach((influence) => {
        influence.influence_for_bone.forEach((boneInfluence, i: number) => {
            boneInfluence.vertex_index.forEach((vertIdx: number, weightIdx: number) => {
                const weight = boneInfluence.weight[weightIdx];
                // 如果该顶点索引不存在，则初始化为空数组
                if (!skinIndices[vertIdx]) {
                    skinIndices[vertIdx] = [];
                    skinWeights[vertIdx] = [];
                }
                // 如果该顶点已有影响，且影响数还未达到上限（最多四个），则添加
                if (skinIndices[vertIdx].length < 4) {
                    skinIndices[vertIdx].push(i);  // 将骨骼索引添加到该顶点的影响中
                    skinWeights[vertIdx].push(weight);  // 将权重添加到该顶点的影响中
                }
            });
        });
    });

    // 确保每个顶点最多有4个骨骼影响
    for (let i = 0; i < skinIndices.length; i++) {
        if (skinIndices[i].length < 4) {
            // 补充至4个，未填充的部分设置为0
            while (skinIndices[i].length < 4) {
                skinIndices[i].push(0);  // 假设0表示无效的骨骼索引
                skinWeights[i].push(0);  // 假设0表示权重为0
            }
        }
    }
    // 将数据转换为平面数组并设置到geometry中
    mesh.geometry.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndices.flat(), 4));
    mesh.geometry.setAttribute('skinWeight', new Float32BufferAttribute(skinWeights.flat(), 4));
}




const createMaterial = (ebm: EBMReader): Material[] => {
    const { materials } = ebm.mt;
    return materials.map(materialData => {
        const { diffuse, specular, } = materialData.material_properties;
        // 加载纹理
        const texture = loadDDSTexture(materialData.texture.data);
        // 兼容传统材质MeshBasicMaterial
        return new MeshBasicMaterial({
            name: materialData.texture.id.text,
            map: texture,
            side: DoubleSide, // 新增双面渲染设置
            color: new Color(diffuse.b, diffuse.g, diffuse.r), // 漫反射
            opacity: diffuse.a, // 透明度（需要开启 transparent）
            transparent: diffuse.a < 1.0, // 自动判断是否需要透明
            // specular: new Color(specular.r, specular.g, specular.b), // 高光颜色
            // 处理 specular.a - 通过混合系数间接实现高光透明度
            combine: MixOperation,       // 启用颜色混合
            reflectivity: specular.a,    // 将 specular.a 映射到反射率（示例比例）
            // emissive: new Color(emissive.r, emissive.g, emissive.b), // 自发光
            // emissiveIntensity: emissive.a, // 使用 alpha 通道作为发光强度
            // shininess: power, // 高光强度
            // flatShading: materialData.texture.is_faceted, // 平面着色
            // userData: { matProps, primaryTexture, secondaryTexture }
            alphaTest: 0.0, // 设置为0.0，取消透明度裁剪 !! 否则会导致 黑色 武器 透明
        });

    })
}

const loadDDSTexture = (data: Uint8Array): Texture => {
    const ddsLoader = new DDSLoader();
    try {
        if (data.length < 128) {
            throw new Error('DDS文件太小');
        }

        const headerView = new DataView(data.buffer, data.byteOffset, 128);
        const magic = headerView.getUint32(0, true);
        if (magic !== 0x20534444) {
            throw new Error('无效的DDS文件');
        }

        // const flags = headerView.getUint32(8, true);
        const height = headerView.getUint32(12, true);
        const width = headerView.getUint32(16, true);
        const pixelFormatFlags = headerView.getUint32(80, true);
        const fourCC = new TextDecoder().decode(data.slice(84, 88));

        // console.log(`DDS详细信息:`, {
        //     宽度: width,
        //     高度: height,
        //     FourCC: `"${fourCC}"`,
        //     格式标志: `0x${pixelFormatFlags.toString(16)}`,
        //     文件大小: data.length
        // });

        // 修复：正确判断是否为未压缩格式
        const isUncompressed = (fourCC.trim() === '' || fourCC === '\x00\x00\x00\x00') &&
            (pixelFormatFlags & 0x40); // DDPF_RGB

        const isCompressed = (pixelFormatFlags & 0x4) && // DDPF_FOURCC
            fourCC.trim() !== '' &&
            fourCC !== '\x00\x00\x00\x00';

        // console.log(`格式判断: 未压缩=${isUncompressed}, 压缩=${isCompressed}`);

        if (isUncompressed) {
            // 详细检查像素格式
            // const rgbBitCount = headerView.getUint32(88, true);
            // const rBitMask = headerView.getUint32(92, true);
            // const gBitMask = headerView.getUint32(96, true);
            // const bBitMask = headerView.getUint32(100, true);
            // const aBitMask = headerView.getUint32(104, true);

            // console.log('未压缩格式详细信息:', {
            //     位深度: rgbBitCount,
            //     R掩码: `0x${rBitMask.toString(16).padStart(8, '0')}`,
            //     G掩码: `0x${gBitMask.toString(16).padStart(8, '0')}`,
            //     B掩码: `0x${bBitMask.toString(16).padStart(8, '0')}`,
            //     A掩码: `0x${aBitMask.toString(16).padStart(8, '0')}`
            // });

            // console.log('使用自定义解析器处理未压缩格式');
            return parseUncompressedDDS(data, width, height);
        }
        else if (isCompressed) {
            // 检查是否支持该压缩格式
            const supportedFormats = ['DXT1', 'DXT3', 'DXT5', 'ATI1', 'ATI2'];
            if (!supportedFormats.includes(fourCC)) {
                console.warn(`不支持的压缩格式: ${fourCC}, 尝试使用Three.js加载器`);
            }

            // console.log('使用Three.js DDSLoader处理压缩格式');
            const blob = new Blob([data.slice()], { type: 'image/dds' });
            const url = URL.createObjectURL(blob);
            const texture = ddsLoader.load(url, () => URL.revokeObjectURL(url));
            texture.wrapS = RepeatWrapping;
            texture.wrapT = RepeatWrapping;
            return texture;
        }
        else {
            throw new Error(`无法识别的DDS格式: FourCC="${fourCC}", 标志=0x${pixelFormatFlags.toString(16)}`);
        }

    } catch (e) {
        console.error('DDS加载失败:', e);
        return createFallbackTexture(256, 256);
    }
}

// 简化的未压缩DDS解析器（专注于处理你的具体格式）
function parseUncompressedDDS(data: Uint8Array, width: number, height: number): Texture {
    try {
        const headerView = new DataView(data.buffer, data.byteOffset);

        // 获取像素格式信息
        const rgbBitCount = headerView.getUint32(88, true);
        const rBitMask = headerView.getUint32(92, true);
        const gBitMask = headerView.getUint32(96, true);
        const bBitMask = headerView.getUint32(100, true);
        const aBitMask = headerView.getUint32(104, true);

        // console.log(`解析${rgbBitCount}位未压缩DDS: ${width}x${height}`);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d')!;
        const imageData = context.createImageData(width, height);

        const dataOffset = 128; // DDS头部大小

        if (rgbBitCount === 32) {

            // console.log('未知32位格式，尝试通用解析');
            parseGeneric32Bit(data, imageData, dataOffset, width, height, rBitMask, gBitMask, bBitMask, aBitMask);

        } else if (rgbBitCount === 24) {
            // console.log('解析24位RGB格式');
            parse24BitRGB(data, imageData, dataOffset, width, height);
        } else {
            throw new Error(`不支持的位深度: ${rgbBitCount}`);
        }

        context.putImageData(imageData, 0, 0);

        const texture = new Texture(canvas);
        texture.needsUpdate = true;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;

        // console.log('未压缩DDS解析成功');
        return texture;

    } catch (e) {
        console.error('未压缩DDS解析失败:', e);
        return createFallbackTexture(width, height);
    }
}

function parse24BitRGB(data: Uint8Array, imageData: ImageData, offset: number, width: number, height: number) {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIndex = offset + ((height - 1 - y) * width + x) * 3;
            const dstIndex = (y * width + x) * 4;

            // 假设BGR顺序
            imageData.data[dstIndex] = data[srcIndex + 2];     // R
            imageData.data[dstIndex + 1] = data[srcIndex + 1]; // G
            imageData.data[dstIndex + 2] = data[srcIndex];     // B
            imageData.data[dstIndex + 3] = 255;               // A
        }
    }
}

function parseGeneric32Bit(data: Uint8Array, imageData: ImageData, offset: number, width: number, height: number,
    rMask: number, gMask: number, bMask: number, aMask: number) {
    const dataView = new DataView(data.buffer, data.byteOffset);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIndex = offset + ((height - 1 - y) * width + x) * 4;
            const dstIndex = (y * width + x) * 4;
            const pixel = dataView.getUint32(srcIndex, true);

            // 通用解包
            imageData.data[dstIndex] = ((pixel & rMask) >>> Math.log2(rMask & -rMask)) & 0xFF;
            imageData.data[dstIndex + 1] = ((pixel & gMask) >>> Math.log2(gMask & -gMask)) & 0xFF;
            imageData.data[dstIndex + 2] = ((pixel & bMask) >>> Math.log2(bMask & -bMask)) & 0xFF;
            imageData.data[dstIndex + 3] = aMask ?
                ((pixel & aMask) >>> Math.log2(aMask & -aMask)) & 0xFF : 255;
        }
    }
}

function createFallbackTexture(width: number, height: number): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width || 256;
    canvas.height = height || 256;

    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ff6b6b';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#fff';
    context.font = '16px Arial';
    context.fillText('DDS Load Failed', 10, 30);
    context.fillText(`${width}x${height}`, 10, 50);

    const texture = new Texture(canvas);
    texture.needsUpdate = true;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;

    return texture;
}


const createAnimations = (ebm: EBMReader, skeleton: Skeleton): AnimationClip[] => {
    const fileType = ebm.header.magic;
    return ebm.an.animations.map(anim => {
        const tracks: KeyframeTrack[] = [];
        anim.transformations.forEach(transformation => {
            const { id, translations, rotations } = transformation;
            const bone = skeleton.bones.find(b => b.name === id.text);
            if (!bone) return;
            // 获取父级变换信息
            const parentMatrix = bone.parent?.matrixWorld || new Matrix4();
            const parentPos = new Vector3();
            const parentQuat = new Quaternion();
            const parentScale = new Vector3();
            parentMatrix.decompose(parentPos, parentQuat, parentScale);
            // 位置轨迹
            const positionTrack = createPositionTrack(translations, bone.name, parentMatrix, fileType);
            if (positionTrack) tracks.push(positionTrack);
            // 旋转轨迹
            const rotationTrack = createRotationTrack(rotations, bone.name, parentQuat, fileType);
            if (rotationTrack) tracks.push(rotationTrack);
        });

        return new AnimationClip(anim.id.text, -1, tracks);
    });
}

const createPositionTrack = (translations: Translation[], boneName: string, parentMatrix: Matrix4, fileType: number): VectorKeyframeTrack => {
    const times = translations.map(t => t.keyframe_second);
    const values = translations.flatMap(k => {
        const position = new Vector3(k.position.x, k.position.y, k.position.z);
        // 判断文件类型
        if (fileType === FILE_TYPE) {
            return [position.x, position.y, position.z];
        } else {
            const normalized = position.applyMatrix4(parentMatrix.clone().invert());
            return [normalized.x, normalized.y, normalized.z];
        }
    });
    return new VectorKeyframeTrack(`${boneName}.position`, times, values);
}

const createRotationTrack = (rotations: Rotation[], boneName: string, parentQuat: Quaternion, fileType: number): QuaternionKeyframeTrack => {
    const times = rotations.map(r => r.keyframe_second);
    const values = rotations.flatMap(k => {
        const relative = new Quaternion(k.rotation.x, k.rotation.y, k.rotation.z, k.rotation.w).conjugate();
        // 判断文件类型
        if (fileType === FILE_TYPE) {
            return relative.toArray();
        } else {
            return parentQuat.clone().conjugate().multiply(relative).toArray();
        }
    });
    return new QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values);
}