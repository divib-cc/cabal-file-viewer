import React from 'react';
import { Space, Switch, Slider, Row, Col } from 'antd';
import type { ViewerControls } from './ModelViewer';

// 显示控制组件的属性接口定义
interface DisplayControlsProps {
  viewerControls: ViewerControls; // 查看器控制参数对象
  updateControl: (key: keyof ViewerControls, value: unknown) => void; // 更新控制参数的回调函数
}

// 显示控制组件 - 负责3D模型的显示效果设置
export const DisplayControls: React.FC<DisplayControlsProps> = ({ viewerControls, updateControl }) => {

  return (
    <div>
      {/* 标题区域 */}
      <div style={{ marginBottom: 8, fontWeight: 500 }}>显示设置</div>

      {/* 使用栅格布局排列控制项 */}
      <Row gutter={[8, 8]}>
        {/* 网格显示开关 */}
        <Col span={6}>
          <Space>
            <span>网格</span>
            <Switch
              size="small"
              checked={viewerControls.showGrid} // 绑定网格显示状态
              onChange={(checked) => updateControl('showGrid', checked)} // 切换网格显示
            />
          </Space>
        </Col>

        {/* 坐标轴显示开关 */}
        <Col span={6}>
          <Space>
            <span>坐标</span>
            <Switch
              size="small"
              checked={viewerControls.showAxes} // 绑定坐标轴显示状态
              onChange={(checked) => updateControl('showAxes', checked)} // 切换坐标轴显示
            />
          </Space>
        </Col>

        {/* 线框模式开关 */}
        <Col span={6}>
          <Space>
            <span>线框</span>
            <Switch
              size="small"
              checked={viewerControls.showWireframe} // 绑定线框模式状态
              onChange={(checked) => updateControl('showWireframe', checked)} // 切换线框模式
            />
          </Space>
        </Col>
        {/* 骨骼显示开关 */}
        <Col span={6}>
          <Space>
            <span>骨骼</span>
            <Switch
              size="small"
              checked={viewerControls.showSkeleton} // 绑定骨骼显示状态
              onChange={(checked) => updateControl('showSkeleton', checked)} // 切换骨骼显示
            />
          </Space>
        </Col>

        {/* 模型透明度调节滑块 */}
        <Col span={24}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>透明度</span>
            {/* 显示当前透明度百分比 */}
            <span>{Math.round(viewerControls.modelOpacity * 100)}%</span>
          </Space>
          {/* 透明度调节滑块 */}
          <Slider
            min={0.1}    // 最小透明度 10%
            max={1}      // 最大透明度 100%
            step={0.1}   // 步长 10%
            value={viewerControls.modelOpacity} // 绑定当前透明度值（0.1-1.0）
            onChange={(value) => updateControl('modelOpacity', value)} // 透明度变化回调
            style={{ marginTop: 4 }}
          />
        </Col>
      </Row>
    </div>
  );
};