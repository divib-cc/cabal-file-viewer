
export interface FileInfo {
  fileName: string;
  fileUri: string;
  originalUri: string;
}

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

// 扩展 Window 接口
declare global {
  interface Window {
    // 文件数据
    ebmFileInfo?: FileInfo;

    // 流式传输相关
    onFileDataReady?: () => void;
    receiveFileChunk?: (chunk: Uint8Array, isLast: boolean) => void;
    appReady?: boolean;

    // 其他可能需要的全局方法
    startApplication?: () => void;
  }
}

// 确保这是一个模块
export { };