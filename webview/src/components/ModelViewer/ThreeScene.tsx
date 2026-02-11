import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { EBMLoader } from '../ThreeCabal/EBMLoader';
import type { ViewerControls, AnimationState } from './ModelViewer';

// ThreeScene组件的属性接口定义
interface ThreeSceneProps {
    fileData: ArrayBuffer;           // 3D模型文件数据（二进制格式）
    controls: ViewerControls;        // 查看器控制参数
    animationState: AnimationState;  // 动画状态
    onError: (error: string) => void; // 错误处理回调函数
}

// 暴露给父组件的方法接口
export interface ThreeSceneRef {
    resetCamera: () => void;                            // 重置相机位置
    toggleCamera: () => void;                           // 切换相机类型（透视/正交）
    toggleAnimation: (play: boolean) => void;           // 播放/暂停动画
    setAnimationSpeed: (speed: number) => void;         // 设置动画播放速度
    setAnimationIndex: (index: number) => void;          // 设置当前动画索引
    getAnimationNames: () => string[];                  // 获取动画名称列表
    getModelNames: () => string[];                      // 获取模型名称列表
    setModelVisibility: (modelNames: string[], visible: boolean) => void; // 设置模型可见性
}

// Three.js场景组件 - 负责3D模型的渲染和交互
export const ThreeScene = forwardRef<ThreeSceneRef, ThreeSceneProps>(({ fileData, controls, animationState, onError }, ref) => {
    // ========== Refs引用定义 ==========

    // DOM元素引用
    const mountRef = useRef<HTMLDivElement>(null);  // 挂载Three.js画布的DOM元素

    // Three.js核心对象引用
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);  // WebGL渲染器
    const sceneRef = useRef<THREE.Scene | null>(null);             // 3D场景
    const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);  // 相机
    const controlsRef = useRef<OrbitControls | null>(null);        // 轨道控制器

    // 动画相关引用
    const animationRef = useRef<number | null>(null);              // 动画帧ID
    const modelRef = useRef<THREE.Object3D | null>(null);          // 当前加载的3D模型
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);     // 动画混合器
    const clockRef = useRef<THREE.Clock>(new THREE.Clock());      // 动画时钟
    const animationsRef = useRef<THREE.AnimationClip[]>([]);       // 动画片段列表
    const currentActionRef = useRef<THREE.AnimationAction | null>(null);  // 当前动画动作

    // 场景辅助对象引用
    const gridHelperRef = useRef<THREE.GridHelper | null>(null);   // 网格辅助对象
    const axesHelperRef = useRef<THREE.AxesHelper | null>(null);   // 坐标轴辅助对象
    const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);  // 骨骼辅助对象

    // ========== 状态管理 ==========

    const [sceneInitialized, setSceneInitialized] = useState(false);  // 场景是否初始化完成
    const [modelLoaded, setModelLoaded] = useState(false);            // 模型是否加载完成
    const [modelNames, setModelNames] = useState<string[]>([]);      // 模型名称列表
    const modelMapRef = useRef<Map<string, THREE.Object3D>>(new Map());  // 模型名称到对象的映射

    // ========== 核心方法实现 ==========

    // 设置模型可见性 - 根据模型名称显示/隐藏特定模型
    const setModelVisibility = (modelNames: string[], visible: boolean) => {
        modelNames.forEach(modelName => {
            const model = modelMapRef.current.get(modelName);  // 根据名称获取模型对象
            if (model) {
                model.visible = visible;  // 设置可见性
            }
        });
    };

    // 清理场景资源 - 释放内存，避免内存泄漏
    const cleanupScene = () => {
        // 停止所有动画
        if (mixerRef.current) {
            mixerRef.current.stopAllAction();
            if (modelRef.current) {
                mixerRef.current.uncacheRoot(modelRef.current);  // 从缓存中移除
            }
            mixerRef.current = null;
        }

        // 清理模型资源
        if (modelRef.current && sceneRef.current) {
            sceneRef.current.remove(modelRef.current);  // 从场景中移除模型

            // 遍历模型所有子对象，释放几何体和材质资源
            modelRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) {
                        child.geometry.dispose();  // 释放几何体内存
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());  // 释放材质数组
                        } else {
                            child.material.dispose();  // 释放单个材质
                        }
                    }
                }
            });
            modelRef.current = null;
        }

        // 清理辅助对象
        if (gridHelperRef.current && sceneRef.current) {
            sceneRef.current.remove(gridHelperRef.current);
            gridHelperRef.current = null;
        }
        if (axesHelperRef.current && sceneRef.current) {
            sceneRef.current.remove(axesHelperRef.current);
            axesHelperRef.current = null;
        }
        if (skeletonHelperRef.current && sceneRef.current) {
            sceneRef.current.remove(skeletonHelperRef.current);
            skeletonHelperRef.current = null;
        }
        // 停止当前动画
        if (currentActionRef.current) {
            currentActionRef.current.stop();
            currentActionRef.current = null;
        }

        // 重置状态
        animationsRef.current = [];
        setModelLoaded(false);
        setModelNames([]);
    };

    // 暴露方法给父组件使用
    useImperativeHandle(ref, () => ({
        resetCamera: () => resetCamera(),
        toggleCamera: () => toggleCamera(),
        toggleAnimation: (play: boolean) => toggleAnimation(play),
        setAnimationSpeed: (speed: number) => setAnimationSpeed(speed),
        setAnimationIndex: (index: number) => setAnimationIndex(index),
        getAnimationNames: () => animationsRef.current.map(clip => clip.name || '未命名动画'),
        getModelNames: () => modelNames,
        setModelVisibility: setModelVisibility
    }));

    // 获取挂载元素的尺寸
    const getMountElementSize = () => {
        if (!mountRef.current) return { width: 800, height: 600 };  // 默认尺寸
        return {
            width: mountRef.current.clientWidth || 800,
            height: mountRef.current.clientHeight || 600
        };
    };

    // 创建场景辅助对象（网格、坐标轴等）
    const createSceneHelpers = () => {
        if (!sceneRef.current) return;

        // 创建网格辅助对象
        if (controls.showGrid) {
            gridHelperRef.current = new THREE.GridHelper(100, 20, 0x888888, 0x444444);
            sceneRef.current.add(gridHelperRef.current);
        }

        // 创建坐标轴辅助对象
        if (controls.showAxes) {
            axesHelperRef.current = new THREE.AxesHelper(10);
            sceneRef.current.add(axesHelperRef.current);
        }
    };

    // 创建骨骼辅助对象
    const createSkeletonHelper = () => {
        if (!sceneRef.current || !modelRef.current || !controls.showSkeleton) return;

        // 查找模型中的骨骼
        const skeletons: THREE.Skeleton[] = [];
        modelRef.current.traverse((child) => {
            if (child instanceof THREE.SkinnedMesh && child.skeleton) {
                skeletons.push(child.skeleton);
            }
        });

        // 创建骨骼辅助对象
        if (skeletons.length > 0) {
            const helper = new THREE.SkeletonHelper(skeletons[0].bones[0]);
            sceneRef.current.add(helper);
            skeletonHelperRef.current = helper;
        }
    };

    // 初始化Three.js场景
    const initScene = () => {
        if (!mountRef.current) return false;

        try {
            // 清理现有场景
            if (sceneRef.current) {
                cleanupScene();
            }

            const { width, height } = getMountElementSize();
            const aspect = width / height;  // 宽高比

            // 创建场景
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(controls.backgroundColor);  // 设置背景色
            sceneRef.current = scene;

            // 创建相机（透视或正交）
            let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
            if (controls.cameraType === 'perspective') {
                camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);  // 透视相机
                camera.position.set(10, 10, 10);
            } else {
                const frustumSize = 20;  // 正交相机视锥体大小
                camera = new THREE.OrthographicCamera(
                    -frustumSize * aspect / 2,
                    frustumSize * aspect / 2,
                    frustumSize / 2,
                    -frustumSize / 2,
                    0.1,
                    10000
                );
                camera.position.set(10, 10, 10);
            }
            cameraRef.current = camera;

            // 创建WebGL渲染器
            const renderer = new THREE.WebGLRenderer({
                antialias: true,   // 开启抗锯齿
                alpha: true        // 开启透明度
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));  // 限制像素比
            rendererRef.current = renderer;

            // 创建轨道控制器
            const orbitControls = new OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;        // 开启阻尼效果
            orbitControls.dampingFactor = 0.05;       // 阻尼系数
            orbitControls.screenSpacePanning = false;  // 屏幕空间平移
            orbitControls.minDistance = 0.1;          // 最小缩放距离
            orbitControls.maxDistance = 1000;         // 最大缩放距离
            orbitControls.maxPolarAngle = Math.PI;    // 最大极角
            controlsRef.current = orbitControls;

            // 创建场景辅助对象
            createSceneHelpers();

            // 将渲染器添加到DOM
            mountRef.current.innerHTML = '';
            mountRef.current.appendChild(renderer.domElement);

            setSceneInitialized(true);
            return true;
        } catch (err) {
            console.error('初始化场景失败:', err);
            onError(`场景初始化失败: ${err}`);
            return false;
        }
    };

    // 加载3D模型
    const loadModel = async () => {
        try {
            // 确保场景已初始化
            if (!sceneInitialized && !initScene()) {
                throw new Error('场景初始化失败');
            }

            cleanupScene();  // 清理现有模型

            // 使用EBM加载器解析模型
            const loader = new EBMLoader();
            const byteArray = new Uint8Array(fileData);
            const arrayBuffer = byteArray.buffer;

            const model = loader.parse(arrayBuffer);

            // 收集模型名称并建立映射
            const names: string[] = [];
            const modelMap = new Map<string, THREE.Object3D>();

            model.traverse((child) => {
                if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
                    names.push(child.name);
                    modelMap.set(child.name, child);
                }
            });
            setModelNames(names);
            modelMapRef.current = modelMap;

            // 计算模型边界框，用于居中显示
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            // 将模型移动到场景中心
            model.position.x -= center.x;
            model.position.y -= center.y;
            model.position.z -= center.z;

            const maxDim = Math.max(size.x, size.y, size.z);  // 最大维度

            // 设置相机位置和参数
            if (cameraRef.current) {
                cameraRef.current.position.set(maxDim, maxDim, maxDim);
                cameraRef.current.lookAt(0, 0, 0);

                // 根据相机类型设置近远裁剪面
                if (cameraRef.current instanceof THREE.PerspectiveCamera) {
                    cameraRef.current.near = Math.max(maxDim / 100, 0.1);
                    cameraRef.current.far = maxDim * 100;
                } else {
                    cameraRef.current.near = 0.1;
                    cameraRef.current.far = maxDim * 100;
                }
                cameraRef.current.updateProjectionMatrix();
            }

            // 更新控制器目标
            if (controlsRef.current) {
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
            }

            // 应用材质设置（透明度、线框模式等）
            model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            material.transparent = controls.modelOpacity < 1;
                            material.opacity = controls.modelOpacity;
                            material.wireframe = controls.showWireframe;
                        });
                    } else {
                        child.material.transparent = controls.modelOpacity < 1;
                        child.material.opacity = controls.modelOpacity;
                        child.material.wireframe = controls.showWireframe;
                    }
                }
            });

            // 将模型添加到场景
            sceneRef.current?.add(model);
            modelRef.current = model;

            // 创建骨骼辅助对象
            createSkeletonHelper();

            // 设置动画
            animationsRef.current = model.animations || [];  // 获取模型动画

            if (animationsRef.current.length > 0) {
                mixerRef.current = new THREE.AnimationMixer(model);  // 创建动画混合器
                playAnimation(animationState.currentAnimation);     // 播放默认动画

                // 根据播放状态控制动画
                if (animationState.isPlaying && currentActionRef.current) {
                    currentActionRef.current.play();
                }
            }

            updateSceneElements();  // 更新场景元素
            setModelLoaded(true);   // 标记模型加载完成

        } catch (err) {
            console.error('加载模型失败:', err);
            onError(`加载模型失败: ${err}`);
            setModelLoaded(false);
        }
    };

    // 播放指定索引的动画
    const playAnimation = (index: number) => {
        if (mixerRef.current && animationsRef.current.length > 0 && index < animationsRef.current.length) {
            // 停止当前动画
            if (currentActionRef.current) {
                currentActionRef.current.stop();
            }

            const clip = animationsRef.current[index];
            if (clip && modelRef.current) {
                // 创建新的动画动作
                const action = mixerRef.current.clipAction(clip, modelRef.current);
                action.setLoop(animationState.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
                action.timeScale = animationState.speed;  // 设置播放速度
                currentActionRef.current = action;

                // 根据播放状态决定是否立即播放
                if (animationState.isPlaying) {
                    action.play();
                }
            }
        }
    };

    // 更新场景元素（根据控制参数）
    const updateSceneElements = () => {
        if (!sceneRef.current) return;

        // 更新背景色
        sceneRef.current.background = new THREE.Color(controls.backgroundColor);

        // 更新网格显示
        if (controls.showGrid && !gridHelperRef.current) {
            gridHelperRef.current = new THREE.GridHelper(100, 20, 0x888888, 0x444444);
            sceneRef.current.add(gridHelperRef.current);
        } else if (!controls.showGrid && gridHelperRef.current) {
            sceneRef.current.remove(gridHelperRef.current);
            gridHelperRef.current = null;
        }

        // 更新坐标轴显示
        if (controls.showAxes && !axesHelperRef.current) {
            axesHelperRef.current = new THREE.AxesHelper(10);
            sceneRef.current.add(axesHelperRef.current);
        } else if (!controls.showAxes && axesHelperRef.current) {
            sceneRef.current.remove(axesHelperRef.current);
            axesHelperRef.current = null;
        }
        // 更新骨骼显示
        if (controls.showSkeleton && !skeletonHelperRef.current) {
            createSkeletonHelper();
        } else if (!controls.showSkeleton && skeletonHelperRef.current) {
            sceneRef.current.remove(skeletonHelperRef.current);
            skeletonHelperRef.current = null;
        }

        // 更新控制器设置
        if (controlsRef.current) {
            controlsRef.current.enabled = true;
            controlsRef.current.enableRotate = controls.enableRotation;    // 旋转控制
            controlsRef.current.enableZoom = controls.enableZoom;          // 缩放控制
            controlsRef.current.enablePan = controls.enablePan;            // 平移控制
            controlsRef.current.autoRotate = controls.autoRotate;          // 自动旋转
            controlsRef.current.autoRotateSpeed = controls.rotationSpeed;  // 旋转速度
            controlsRef.current.zoomSpeed = controls.zoomSpeed;            // 缩放速度
            controlsRef.current.update();
        }

        // 更新模型材质属性
        if (modelRef.current) {
            modelRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            material.transparent = controls.modelOpacity < 1;  // 透明度
                            material.opacity = controls.modelOpacity;          // 不透明度
                            material.wireframe = controls.showWireframe;      // 线框模式
                        });
                    } else {
                        child.material.transparent = controls.modelOpacity < 1;
                        child.material.opacity = controls.modelOpacity;
                        child.material.wireframe = controls.showWireframe;
                    }
                }
            });
        }
    };

    // 动画循环 - Three.js核心渲染循环
    const animate = () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
            animationRef.current = requestAnimationFrame(animate);
            return;
        }

        const delta = clockRef.current.getDelta();  // 获取时间增量

        // 更新动画混合器
        if (mixerRef.current) {
            mixerRef.current.update(delta);
        }

        // 更新控制器
        if (controlsRef.current) {
            controlsRef.current.update();
        }

        // 渲染场景
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        // 请求下一帧
        animationRef.current = requestAnimationFrame(animate);
    };

    // ========== 相机控制方法 ==========

    // 重置相机到默认位置
    const resetCamera = () => {
        if (!cameraRef.current || !modelRef.current || !controlsRef.current) return;

        const box = new THREE.Box3().setFromObject(modelRef.current);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        cameraRef.current.position.set(maxDim, maxDim, maxDim);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
    };

    // 切换相机类型（透视/正交）
    const toggleCamera = () => {
        if (!sceneRef.current || !cameraRef.current || !mountRef.current || !modelRef.current) return;

        const { width, height } = getMountElementSize();
        const aspect = width / height;
        const position = cameraRef.current.position.clone();  // 保存当前相机位置
        const target = controlsRef.current?.target.clone() || new THREE.Vector3();

        const box = new THREE.Box3().setFromObject(modelRef.current);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        let newCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

        // 根据当前相机类型创建相反类型的新相机
        if (cameraRef.current instanceof THREE.PerspectiveCamera) {
            const frustumSize = maxDim * 2;
            newCamera = new THREE.OrthographicCamera(
                -frustumSize * aspect / 2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                -frustumSize / 2,
                0.1,
                maxDim * 100
            );
        } else {
            newCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, maxDim * 100);
        }

        // 保持相机位置和视角
        newCamera.position.copy(position);
        newCamera.lookAt(target);
        cameraRef.current = newCamera;

        // 更新控制器
        if (controlsRef.current) {
            controlsRef.current.object = newCamera;
            controlsRef.current.target.copy(target);
            controlsRef.current.update();
        }
    };

    // ========== 动画控制方法 ==========

    const toggleAnimation = (play: boolean) => {
        if (currentActionRef.current) {
            if (play) {
                currentActionRef.current.play();
            } else {
                currentActionRef.current.stop();
            }
        }
    };

    const setAnimationSpeed = (speed: number) => {
        if (currentActionRef.current) {
            currentActionRef.current.timeScale = speed;
        }
    };

    const setAnimationIndex = (index: number) => {
        playAnimation(index);
    };

    // 窗口大小变化处理
    const handleResize = () => {
        if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

        const { width, height } = getMountElementSize();

        // 更新相机参数
        if (cameraRef.current instanceof THREE.PerspectiveCamera) {
            cameraRef.current.aspect = width / height;
        } else {
            const aspect = width / height;
            const frustumSize = (cameraRef.current as THREE.OrthographicCamera).top * 2;
            (cameraRef.current as THREE.OrthographicCamera).left = -frustumSize * aspect / 2;
            (cameraRef.current as THREE.OrthographicCamera).right = frustumSize * aspect / 2;
        }
        cameraRef.current.updateProjectionMatrix();

        // 更新渲染器尺寸
        rendererRef.current.setSize(width, height);
    };

    // ========== 副作用钩子 ==========

    // 文件变化时加载模型
    useEffect(() => {
        if (fileData && fileData.byteLength > 0) {
            loadModel();
        }
    }, [fileData]);

    // 控制面板参数变化时更新场景
    useEffect(() => {
        if (sceneInitialized && modelLoaded) {
            updateSceneElements();
        }
    }, [controls, sceneInitialized, modelLoaded]);

    // 动画状态变化时更新
    useEffect(() => {
        if (sceneInitialized && modelLoaded) {
            toggleAnimation(animationState.isPlaying);
            setAnimationSpeed(animationState.speed);
            if (currentActionRef.current) {
                currentActionRef.current.setLoop(
                    animationState.loop ? THREE.LoopRepeat : THREE.LoopOnce,
                    Infinity
                );
            }
        }
    }, [animationState, sceneInitialized, modelLoaded]);

    // 组件挂载和卸载时的生命周期管理
    useEffect(() => {
        // 启动动画循环
        animate();

        // 防抖的窗口大小变化处理
        const handleResizeDebounced = () => requestAnimationFrame(handleResize);
        window.addEventListener('resize', handleResizeDebounced);

        // 清理函数：组件卸载时执行
        return () => {
            // 停止动画循环
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }

            // 移除事件监听器
            window.removeEventListener('resize', handleResizeDebounced);

            // 释放Three.js资源
            if (controlsRef.current) {
                controlsRef.current.dispose();  // 释放控制器
            }

            if (rendererRef.current) {
                rendererRef.current.dispose();  // 释放渲染器
            }

            cleanupScene();  // 清理场景资源
        };
    }, []);

    // 渲染Three.js画布容器
    return (
        <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
    );
});