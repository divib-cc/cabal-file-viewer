// ModelViewer.tsx - 修改后的版本
import React, { useState, useEffect, useCallback } from 'react';
import { ThreeScene } from './ThreeScene';
import { ControlsPanel } from './ControlsPanel';


export interface ViewerControls {
    showGrid: boolean;
    showAxes: boolean;
    showWireframe: boolean;
    showLight: boolean;
    autoRotate: boolean;
    enableRotation: boolean;
    enableZoom: boolean;
    enablePan: boolean;
    cameraType: 'perspective' | 'orthographic';
    backgroundColor: string;
    modelOpacity: number;
    rotationSpeed: number;
    zoomSpeed: number;
}

export interface AnimationState {
    isPlaying: boolean;
    currentAnimation: number;
    speed: number;
    loop: boolean;
}

export const ModelViewer = ({ fileData }: { fileData: ArrayBuffer }) => {
    const [error, setError] = useState<string>('');
    const [showControls, setShowControls] = useState(true);

    // 控制面板状态
    const [viewerControls, setViewerControls] = useState<ViewerControls>({
        showGrid: true,
        showAxes: true,
        showWireframe: false,
        showLight: true,
        autoRotate: false,
        enableRotation: true,
        enableZoom: true,
        enablePan: true,
        cameraType: 'perspective',
        backgroundColor: '#f0f0f0',
        modelOpacity: 1,
        rotationSpeed: 1,
        zoomSpeed: 1
    });

    // 动画状态
    const [animationState, setAnimationState] = useState<AnimationState>({
        isPlaying: true,
        currentAnimation: 0,
        speed: 1,
        loop: true
    });

    // ThreeScene 引用
    const threeSceneRef = React.useRef<{
        resetCamera: () => void;
        zoomIn: () => void;
        zoomOut: () => void;
        toggleCamera: () => void;
        toggleAnimation: (play: boolean) => void;
        setAnimationSpeed: (speed: number) => void;
        setAnimationIndex: (index: number) => void;
        getAnimationNames: () => string[];
    }>(null);

    // 文件变化时重置状态
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError('');
        setViewerControls(prev => ({
            ...prev,
            modelOpacity: 1,
            autoRotate: false
        }));
        setAnimationState({
            isPlaying: true,
            currentAnimation: 0,
            speed: 1,
            loop: true
        });
    }, [fileData]);

    // 更新控制面板
    const updateControl = useCallback((key: keyof ViewerControls, value: unknown) => {
        setViewerControls(prev => ({ ...prev, [key]: value }));
    }, []);

    // 更新动画状态
    const updateAnimationState = useCallback((key: keyof AnimationState, value: unknown) => {
        setAnimationState(prev => ({ ...prev, [key]: value }));
    }, []);

    // 处理 ThreeScene 的方法调用
    useEffect(() => {
        if (threeSceneRef.current) {
            threeSceneRef.current.setAnimationSpeed(animationState.speed);
        }
    }, [animationState.speed]);

    useEffect(() => {
        if (threeSceneRef.current) {
            threeSceneRef.current.toggleAnimation(animationState.isPlaying);
        }
    }, [animationState.isPlaying]);

    useEffect(() => {
        if (threeSceneRef.current) {
            threeSceneRef.current.setAnimationIndex(animationState.currentAnimation);
        }
    }, [animationState.currentAnimation]);

    // 处理错误
    const handleError = useCallback((errorMessage: string) => {
        setError(errorMessage);
    }, []);

    // 控制面板操作
    const handleResetCamera = useCallback(() => {
        threeSceneRef.current?.resetCamera();
    }, []);

    const handleZoomIn = useCallback(() => {
        threeSceneRef.current?.zoomIn();
    }, []);

    const handleZoomOut = useCallback(() => {
        threeSceneRef.current?.zoomOut();
    }, []);

    const handleToggleCamera = useCallback(() => {
        threeSceneRef.current?.toggleCamera();
        updateControl('cameraType',
            viewerControls.cameraType === 'perspective' ? 'orthographic' : 'perspective'
        );
    }, [updateControl, viewerControls.cameraType]);

    const handleToggleControls = useCallback(() => {
        setShowControls(prev => !prev);
    }, []);

    const getAnimationNames = useCallback(() => {
        return threeSceneRef.current?.getAnimationNames() || [];
    }, []);

    if (error) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                flexDirection: 'column',
                color: '#ff4d4f'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <div>{error}</div>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '20px',
                        padding: '8px 16px',
                        background: '#1890ff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    重新加载
                </button>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Three.js 场景 */}
            <ThreeScene
                ref={threeSceneRef}
                fileData={fileData}
                controls={viewerControls}
                animationState={animationState}
                onError={handleError}
            />

            {/* 控制面板 */}
            <ControlsPanel
                viewerControls={viewerControls}
                animationState={animationState}
                updateControl={updateControl}
                updateAnimationState={updateAnimationState}
                onToggleControls={handleToggleControls}
                onResetCamera={handleResetCamera}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onToggleCamera={handleToggleCamera}
                getAnimationNames={getAnimationNames}
                showControls={showControls}
            />
        </div>
    );
};