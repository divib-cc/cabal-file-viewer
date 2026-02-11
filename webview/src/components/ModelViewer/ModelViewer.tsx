import React, { useState, useEffect, useCallback } from 'react';
import { ThreeScene } from './ThreeScene';
import { ControlsPanel } from './ControlsPanel';

// 查看器控制参数接口定义
export interface ViewerControls {
    showGrid: boolean;          // 是否显示网格
    showAxes: boolean;          // 是否显示坐标轴
    showWireframe: boolean;     // 是否显示线框模式
    showSkeleton: boolean;      // 是否显示骨骼
    autoRotate: boolean;        // 是否自动旋转
    enableRotation: boolean;    // 是否启用旋转控制
    enableZoom: boolean;         // 是否启用缩放控制
    enablePan: boolean;          // 是否启用平移控制
    cameraType: 'perspective' | 'orthographic';  // 相机类型：透视/正交
    backgroundColor: string;    // 背景颜色
    modelOpacity: number;       // 模型透明度（0-1）
    rotationSpeed: number;      // 旋转速度
    zoomSpeed: number;          // 缩放速度
}

// 动画状态接口定义
export interface AnimationState {
    isPlaying: boolean;         // 是否正在播放
    currentAnimation: number;    // 当前动画索引
    speed: number;              // 播放速度
    loop: boolean;              // 是否循环播放
}

// 3D模型查看器主组件
export const ModelViewer = ({ fileData }: { fileData: ArrayBuffer }) => {
    // 状态管理
    const [error, setError] = useState<string>('');  // 错误信息
    const [showControls, setShowControls] = useState(true);  // 是否显示控制面板
    const [selectedModels, setSelectedModels] = useState<string[]>([]);  // 选中的模型列表

    // 控制面板状态 - 默认值设置
    const [viewerControls, setViewerControls] = useState<ViewerControls>({
        showGrid: false,          // 默认显示网格
        showAxes: false,          // 默认显示坐标轴
        showWireframe: false,    // 默认不显示线框
        showSkeleton: false,     // 默认不显示骨骼
        autoRotate: false,       // 默认不自动旋转
        enableRotation: true,    // 默认启用旋转
        enableZoom: true,        // 默认启用缩放
        enablePan: true,         // 默认启用平移
        cameraType: 'perspective',  // 默认透视相机
        backgroundColor: '#f0f0f0',  // 默认背景色（浅灰色）
        modelOpacity: 1,         // 默认不透明
        rotationSpeed: 1,        // 默认旋转速度
        zoomSpeed: 1             // 默认缩放速度
    });

    // 动画状态 - 默认值设置
    const [animationState, setAnimationState] = useState<AnimationState>({
        isPlaying: true,         // 默认自动播放
        currentAnimation: 0,     // 默认第一个动画
        speed: 1,               // 默认正常速度
        loop: true              // 默认循环播放
    });

    // ThreeScene 组件引用 - 用于调用子组件的方法
    const threeSceneRef = React.useRef<{
        resetCamera: () => void;                    // 重置相机
        toggleCamera: () => void;                   // 切换相机类型
        toggleAnimation: (play: boolean) => void;   // 切换动画播放状态
        setAnimationSpeed: (speed: number) => void;  // 设置动画速度
        setAnimationIndex: (index: number) => void;  // 设置当前动画索引
        getAnimationNames: () => string[];          // 获取动画名称列表
        getModelNames: () => string[];              // 获取模型名称列表
        setModelVisibility: (modelNames: string[], visible: boolean) => void;  // 设置模型可见性
    }>(null);

    // 文件变化时重置状态
    useEffect(() => {
        setError('');  // 清空错误信息
        setSelectedModels([]);  // 重置选中的模型列表
        setViewerControls(prev => ({
            ...prev,
            modelOpacity: 1,    // 重置透明度为不透明
            autoRotate: false,  // 重置为不自动旋转
            showSkeleton: false,  // 重置为不显示骨骼
        }));
        setAnimationState({
            isPlaying: true,    // 重置为自动播放
            currentAnimation: 0,  // 重置为第一个动画
            speed: 1,           // 重置为正常速度
            loop: true          // 重置为循环播放
        });
    }, [fileData]);  // 依赖fileData，文件变化时触发

    // 更新控制面板参数的回调函数
    const updateControl = useCallback((key: keyof ViewerControls, value: unknown) => {
        setViewerControls(prev => ({ ...prev, [key]: value }));
    }, []);

    // 更新动画状态的回调函数
    const updateAnimationState = useCallback((key: keyof AnimationState, value: unknown) => {
        setAnimationState(prev => ({ ...prev, [key]: value }));
    }, []);

    // 处理模型选择变化的回调函数
    const handleModelSelectionChange = useCallback((selectedModelNames: string[]) => {
        setSelectedModels(selectedModelNames);  // 更新选中的模型列表

        // 获取所有模型名称
        const allModelNames = threeSceneRef.current?.getModelNames() || [];

        // 隐藏未选中的模型，显示选中的模型
        if (threeSceneRef.current) {
            // 隐藏未选中的模型
            const hiddenModels = allModelNames.filter(name => !selectedModelNames.includes(name));
            threeSceneRef.current.setModelVisibility(hiddenModels, false);

            // 显示选中的模型
            threeSceneRef.current.setModelVisibility(selectedModelNames, true);
        }
    }, []);

    // 文件加载后默认选中所有模型
    useEffect(() => {
        if (fileData && fileData.byteLength > 0) {
            // 延迟执行以确保模型已加载完成
            const timer = setTimeout(() => {
                const allModelNames = threeSceneRef.current?.getModelNames() || [];
                setSelectedModels(allModelNames);  // 默认选中所有模型

                // 默认显示所有模型
                if (threeSceneRef.current && allModelNames.length > 0) {
                    threeSceneRef.current.setModelVisibility(allModelNames, true);
                }
            }, 1000);  // 延迟1秒确保模型加载完成

            return () => clearTimeout(timer);  // 清理定时器
        }
    }, [fileData]);

    // 监听动画速度变化，同步到ThreeScene
    useEffect(() => {
        if (threeSceneRef.current) {
            threeSceneRef.current.setAnimationSpeed(animationState.speed);
        }
    }, [animationState.speed]);

    // 监听动画播放状态变化，同步到ThreeScene
    useEffect(() => {
        if (threeSceneRef.current) {
            threeSceneRef.current.toggleAnimation(animationState.isPlaying);
        }
    }, [animationState.isPlaying]);

    // 监听当前动画索引变化，同步到ThreeScene
    useEffect(() => {
        if (threeSceneRef.current) {
            threeSceneRef.current.setAnimationIndex(animationState.currentAnimation);
        }
    }, [animationState.currentAnimation]);

    // 处理错误信息的回调函数
    const handleError = useCallback((errorMessage: string) => {
        setError(errorMessage);
    }, []);

    // 控制面板操作回调函数
    const handleResetCamera = useCallback(() => {
        threeSceneRef.current?.resetCamera();  // 重置相机
    }, []);

    const handleToggleCamera = useCallback(() => {
        threeSceneRef.current?.toggleCamera();  // 切换相机类型
        // 更新控制面板中的相机类型显示
        updateControl('cameraType',
            viewerControls.cameraType === 'perspective' ? 'orthographic' : 'perspective'
        );
    }, [updateControl, viewerControls.cameraType]);

    const handleToggleControls = useCallback(() => {
        setShowControls(prev => !prev);  // 切换控制面板显示/隐藏
    }, []);

    // 获取动画名称列表
    const getAnimationNames = useCallback(() => {
        return threeSceneRef.current?.getAnimationNames() || [];
    }, []);

    // 获取模型名称列表
    const getModelNames = useCallback(() => {
        return threeSceneRef.current?.getModelNames() || [];
    }, []);

    // 错误状态显示
    if (error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: '#ff4d4f' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <div>{error}</div>
                <button
                    onClick={() => window.location.reload()}
                    style={{ marginTop: '20px', padding: '8px 16px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    重新加载
                </button>
            </div>
        );
    }

    // 正常状态渲染
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Three.js 3D场景组件 - 负责渲染3D模型和动画 */}
            <ThreeScene
                ref={threeSceneRef}  // 组件引用，用于调用ThreeScene的内部方法
                fileData={fileData}  // 3D模型文件数据（ArrayBuffer格式）
                controls={viewerControls}  // 查看器控制参数（显示设置、相机控制等）
                animationState={animationState}  // 动画状态（播放、速度、循环等）
                onError={handleError}  // 错误处理回调函数，当3D场景加载或渲染出错时调用
            />

            {/* 控制面板组件 - 提供用户交互界面来控制3D场景 */}
            <ControlsPanel
                // 控制参数传递
                viewerControls={viewerControls}  // 当前查看器控制参数，用于显示当前状态
                animationState={animationState}  // 当前动画状态，用于显示播放状态

                // 模型选择功能
                selectedModels={selectedModels}  // 当前选中的模型名称列表，用于多选框的选中状态
                onModelSelectionChange={handleModelSelectionChange}  // 模型选择变化回调，当用户勾选/取消模型时触发

                // 状态更新函数
                updateControl={updateControl}  // 更新查看器控制参数的回调函数
                updateAnimationState={updateAnimationState}  // 更新动画状态的回调函数

                // 相机和控制面板操作
                onToggleControls={handleToggleControls}  // 切换控制面板显示/隐藏的回调函数
                onResetCamera={handleResetCamera}  // 重置相机位置和角度的回调函数
                onToggleCamera={handleToggleCamera}  // 切换相机类型（透视/正交）的回调函数

                // 数据获取函数
                getAnimationNames={getAnimationNames}  // 获取可用动画名称列表的函数
                getModelNames={getModelNames}  // 获取场景中所有模型名称列表的函数

                // 显示控制
                showControls={showControls}  // 控制面板是否显示的布尔值
            />
        </div>
    );
};