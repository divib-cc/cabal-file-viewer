// ThreeScene.tsx - 修改后的版本
import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { EBMLoader } from '../ThreeCabal/EBMLoader';
import type {  ViewerControls, AnimationState } from './ModelViewer';

interface ThreeSceneProps {
    fileData: ArrayBuffer;
    controls: ViewerControls;
    animationState: AnimationState;
    onError: (error: string) => void;
}

export interface ThreeSceneRef {
    resetCamera: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    toggleCamera: () => void;
    toggleAnimation: (play: boolean) => void;
    setAnimationSpeed: (speed: number) => void;
    setAnimationIndex: (index: number) => void;
    getAnimationNames: () => string[];
}

export const ThreeScene = forwardRef<ThreeSceneRef, ThreeSceneProps>(({
    fileData,
    controls,
    animationState,
    onError
}, ref) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const animationRef = useRef<number | null>(null);
    const modelRef = useRef<THREE.Object3D | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clockRef = useRef<THREE.Clock>(new THREE.Clock());
    const animationsRef = useRef<THREE.AnimationClip[]>([]);
    const currentActionRef = useRef<THREE.AnimationAction | null>(null);

    const [sceneInitialized, setSceneInitialized] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);

    // 清理场景
    const cleanupScene = () => {
        if (mixerRef.current) {
            mixerRef.current.stopAllAction();
            if (modelRef.current) {
                mixerRef.current.uncacheRoot(modelRef.current);
            }
            mixerRef.current = null;
        }

        if (modelRef.current && sceneRef.current) {
            sceneRef.current.remove(modelRef.current);
            modelRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            modelRef.current = null;
        }

        if (currentActionRef.current) {
            currentActionRef.current.stop();
            currentActionRef.current = null;
        }

        animationsRef.current = [];
        setModelLoaded(false);
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        resetCamera: () => resetCamera(),
        zoomIn: () => zoomIn(),
        zoomOut: () => zoomOut(),
        toggleCamera: () => toggleCamera(),
        toggleAnimation: (play: boolean) => toggleAnimation(play),
        setAnimationSpeed: (speed: number) => setAnimationSpeed(speed),
        setAnimationIndex: (index: number) => setAnimationIndex(index),
        getAnimationNames: () => animationsRef.current.map(clip => clip.name || '未命名动画')
    }));

    // 获取挂载元素尺寸
    const getMountElementSize = () => {
        if (!mountRef.current) return { width: 800, height: 600 };
        return {
            width: mountRef.current.clientWidth || 800,
            height: mountRef.current.clientHeight || 600
        };
    };

    // 初始化场景
    const initScene = () => {
        if (!mountRef.current) return false;

        try {
            if (sceneRef.current) {
                cleanupScene();
            }

            const { width, height } = getMountElementSize();
            const aspect = width / height;

            const scene = new THREE.Scene();
            scene.background = new THREE.Color(controls.backgroundColor);
            sceneRef.current = scene;

            let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
            if (controls.cameraType === 'perspective') {
                camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);
                camera.position.set(10, 10, 10);
            } else {
                const frustumSize = 20;
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

            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            rendererRef.current = renderer;

            const orbitControls = new OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;
            orbitControls.dampingFactor = 0.05;
            orbitControls.screenSpacePanning = false;
            orbitControls.minDistance = 0.1;
            orbitControls.maxDistance = 1000;
            orbitControls.maxPolarAngle = Math.PI;
            controlsRef.current = orbitControls;

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

    // 加载模型
    const loadModel = async () => {
        try {
            if (!sceneInitialized && !initScene()) {
                throw new Error('场景初始化失败');
            }

            cleanupScene();

            console.log('开始加载EBM模型，文件大小:', fileData,length, '字节');

            const loader = new EBMLoader();
            const byteArray = new Uint8Array(fileData);
            const arrayBuffer = byteArray.buffer;

            const model = loader.parse(arrayBuffer);
            console.log('模型解析完成，子对象数量:', model.children.length);

            // 居中显示模型
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            model.position.x -= center.x;
            model.position.y -= center.y;
            model.position.z -= center.z;

            const maxDim = Math.max(size.x, size.y, size.z);
            console.log('模型尺寸:', size, '最大维度:', maxDim);

            // 设置相机位置
            if (cameraRef.current) {
                const distance = maxDim * 2;
                cameraRef.current.position.set(distance, distance, distance);
                cameraRef.current.lookAt(0, 0, 0);

                if (cameraRef.current instanceof THREE.PerspectiveCamera) {
                    cameraRef.current.near = Math.max(maxDim / 100, 0.1);
                    cameraRef.current.far = maxDim * 100;
                } else {
                    cameraRef.current.near = 0.1;
                    cameraRef.current.far = maxDim * 100;
                }
                cameraRef.current.updateProjectionMatrix();
            }

            if (controlsRef.current) {
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
            }

            // 应用材质设置
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

            sceneRef.current?.add(model);
            modelRef.current = model;

            // 设置动画
            animationsRef.current = model.animations || [];
            console.log('检测到动画数量:', animationsRef.current.length);

            if (animationsRef.current.length > 0) {
                mixerRef.current = new THREE.AnimationMixer(model);
                playAnimation(animationState.currentAnimation);

                if (animationState.isPlaying && currentActionRef.current) {
                    currentActionRef.current.play();
                }
            }

            updateSceneElements();

            setModelLoaded(true);
            console.log('模型加载完成');

        } catch (err) {
            console.error('加载模型失败:', err);
            onError(`加载模型失败: ${err}`);
            setModelLoaded(false);
        }
    };

    // 播放动画
    const playAnimation = (index: number) => {
        if (mixerRef.current && animationsRef.current.length > 0 && index < animationsRef.current.length) {
            if (currentActionRef.current) {
                currentActionRef.current.stop();
            }

            const clip = animationsRef.current[index];
            if (clip && modelRef.current) {
                const action = mixerRef.current.clipAction(clip, modelRef.current);
                action.setLoop(animationState.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
                action.timeScale = animationState.speed;
                currentActionRef.current = action;

                if (animationState.isPlaying) {
                    action.play();
                }
            }
        }
    };

    // 更新场景元素
    const updateSceneElements = () => {
        if (!sceneRef.current) return;

        // 更新背景色
        sceneRef.current.background = new THREE.Color(controls.backgroundColor);

        // 更新控制器设置
        if (controlsRef.current) {
            controlsRef.current.enabled = true;
            controlsRef.current.enableRotate = controls.enableRotation;
            controlsRef.current.enableZoom = controls.enableZoom;
            controlsRef.current.enablePan = controls.enablePan;
            controlsRef.current.autoRotate = controls.autoRotate;
            controlsRef.current.autoRotateSpeed = controls.rotationSpeed;
            controlsRef.current.zoomSpeed = controls.zoomSpeed;
            controlsRef.current.update();
        }

        // 更新模型材质
        if (modelRef.current) {
            modelRef.current.traverse((child) => {
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
        }
    };

    // 动画循环
    const animate = () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
            animationRef.current = requestAnimationFrame(animate);
            return;
        }

        const delta = clockRef.current.getDelta();

        if (mixerRef.current) {
            mixerRef.current.update(delta);
        }

        if (controlsRef.current) {
            controlsRef.current.update();
        }

        rendererRef.current.render(sceneRef.current, cameraRef.current);
        animationRef.current = requestAnimationFrame(animate);
    };

    // 相机控制方法
    const resetCamera = () => {
        if (!cameraRef.current || !modelRef.current || !controlsRef.current) return;

        const box = new THREE.Box3().setFromObject(modelRef.current);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;

        cameraRef.current.position.set(distance, distance, distance);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
    };

    const zoomIn = () => {
        if (!cameraRef.current || !controlsRef.current) return;

        if (cameraRef.current instanceof THREE.PerspectiveCamera) {
            const direction = new THREE.Vector3()
                .subVectors(controlsRef.current.target, cameraRef.current.position)
                .normalize()
                .multiplyScalar(0.8);
            cameraRef.current.position.add(direction);
        }
        controlsRef.current.update();
    };

    const zoomOut = () => {
        if (!cameraRef.current || !controlsRef.current) return;

        if (cameraRef.current instanceof THREE.PerspectiveCamera) {
            const direction = new THREE.Vector3()
                .subVectors(controlsRef.current.target, cameraRef.current.position)
                .normalize()
                .multiplyScalar(1.2);
            cameraRef.current.position.add(direction);
        }
        controlsRef.current.update();
    };

    const toggleCamera = () => {
        if (!sceneRef.current || !cameraRef.current || !mountRef.current || !modelRef.current) return;

        const { width, height } = getMountElementSize();
        const aspect = width / height;
        const position = cameraRef.current.position.clone();
        const target = controlsRef.current?.target.clone() || new THREE.Vector3();

        const box = new THREE.Box3().setFromObject(modelRef.current);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        let newCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

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

        newCamera.position.copy(position);
        newCamera.lookAt(target);
        cameraRef.current = newCamera;

        if (controlsRef.current) {
            controlsRef.current.object = newCamera;
            controlsRef.current.target.copy(target);
            controlsRef.current.update();
        }
    };

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

        if (cameraRef.current instanceof THREE.PerspectiveCamera) {
            cameraRef.current.aspect = width / height;
        } else {
            const aspect = width / height;
            const frustumSize = (cameraRef.current as THREE.OrthographicCamera).top * 2;
            (cameraRef.current as THREE.OrthographicCamera).left = -frustumSize * aspect / 2;
            (cameraRef.current as THREE.OrthographicCamera).right = frustumSize * aspect / 2;
        }
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
    };

    // 主效果：文件变化时加载模型
    useEffect(() => {
        if (fileData && fileData.byteLength > 0) {
            console.log('检测到文件数据变化，开始加载模型');
            loadModel();
        }
    }, [fileData]);

    // 控制面板变化时更新场景
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

    // 初始化和清理
    useEffect(() => {
        animate();

        const handleResizeDebounced = () => requestAnimationFrame(handleResize);
        window.addEventListener('resize', handleResizeDebounced);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }

            window.removeEventListener('resize', handleResizeDebounced);

            if (controlsRef.current) {
                controlsRef.current.dispose();
            }

            if (rendererRef.current) {
                rendererRef.current.dispose();
            }

            cleanupScene();
        };
    }, []);

    return (
        <div
            ref={mountRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0
            }}
        />
    );
});