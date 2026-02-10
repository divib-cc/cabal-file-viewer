// 导入React相关依赖
import { ModelViewer } from './components/ModelViewer'
import { useState, useEffect } from 'react'
import type { FileInfo } from './global'

// 将加载文件函数移到组件外部，避免重复创建
const loadEBMFile = async (
  onProgress: (progress: number) => void,
  onFileInfo: (info: FileInfo) => void,
  onFileData: (data: ArrayBuffer) => void,
) => {
  // 检查全局文件信息是否存在
  if (!window.ebmFileInfo) {
    throw new Error('未找到文件信息')
  }

  console.log('开始加载文件:', window.ebmFileInfo)
  onFileInfo(window.ebmFileInfo)

  try {
    // 测试文件访问权限
    const testResponse = await fetch(window.ebmFileInfo.fileUri, { method: 'HEAD' })
    console.log('文件访问测试结果:', testResponse.status, testResponse.statusText)

    if (!testResponse.ok) {
      throw new Error(`文件访问失败: ${testResponse.status} ${testResponse.statusText}`)
    }

    // 获取文件大小
    const contentLength = testResponse.headers.get('Content-Length')
    const totalSize = parseInt(contentLength || '0', 10)
    console.log('文件大小:', totalSize, 'bytes')

    if (totalSize === 0) {
      throw new Error('文件大小为0')
    }

    // 流式加载文件内容
    const response = await fetch(window.ebmFileInfo.fileUri)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('响应体不可读')
    }

    // 创建流式读取器
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let receivedLength = 0

    // 循环读取数据流
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      if (value) {
        chunks.push(value)
        receivedLength += value.length

        // 更新加载进度
        const progress = Math.round((receivedLength / totalSize) * 100)
        onProgress(progress)
      }
    }

    // 合并所有数据块
    const arrayBuffer = new Uint8Array(receivedLength)
    let position = 0
    for (const chunk of chunks) {
      arrayBuffer.set(chunk, position)
      position += chunk.length
    }

    console.log('文件加载完成，大小:', arrayBuffer.length, 'bytes')
    onFileData(arrayBuffer.buffer)

  } catch (err: any) {
    console.error('文件加载错误:', err)
    throw new Error(err.message || '文件加载失败')
  }
}

function App() {
  // 状态定义
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // 副作用钩子：组件挂载时执行文件加载
  useEffect(() => {
    const loadFile = async () => {
      try {
        await loadEBMFile(
          setProgress,
          setFileInfo,
          setFileData,
        )
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadFile()
  }, []) // 空依赖数组表示只在组件挂载时执行一次

  // 错误显示界面
  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        fileInfo={fileInfo} 
      />
    )
  }

  // 加载中界面
  if (isLoading) {
    return (
      <LoadingScreen 
        progress={progress} 
        fileInfo={fileInfo} 
      />
    )
  }

  // 文件数据为空的情况
  if (!fileData) {
    return <EmptyFileDisplay />
  }

  // 主界面：显示3D模型查看器
  return (
    <MainViewer fileData={fileData} />
  )
}

// 抽离错误显示组件
const ErrorDisplay = ({ error, fileInfo }: { error: string, fileInfo: FileInfo | null }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    flexDirection: 'column', 
    color: '#ff6b6b', 
    fontFamily: 'sans-serif' 
  }}>
    <h2>文件加载失败</h2>
    <p>{error}</p>
    <details style={{ marginTop: '20px', maxWidth: '500px' }}>
      <summary>调试信息</summary>
      <pre style={{ background: '#2d2d2d', padding: '10px', borderRadius: '4px' }}>
        {JSON.stringify(fileInfo, null, 2)}
      </pre>
    </details>
  </div>
)

// 抽离加载界面组件
const LoadingScreen = ({ progress, fileInfo }: { progress: number, fileInfo: FileInfo | null }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    flexDirection: 'column' 
  }}>
    <div>加载 EBM 文件... {progress}%</div>
    <progress value={progress} max="100" style={{ width: '200px', marginTop: '10px' }} />
    {fileInfo && (
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        {fileInfo.fileName}
      </div>
    )}
  </div>
)

// 抽离空文件显示组件
const EmptyFileDisplay = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    color: '#666',
    fontFamily: 'sans-serif'
  }}>
    文件数据为空
  </div>
)

// 抽离主视图组件
const MainViewer = ({ fileData }: { fileData: ArrayBuffer }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    flexDirection: 'column' 
  }}>
    <ModelViewer fileData={fileData} />
  </div>
)

export default App