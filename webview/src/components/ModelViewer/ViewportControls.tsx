// 视口控制组件
import React from 'react';
import { Space, Switch, Slider, Row, Col } from 'antd';
import type { ViewerControls } from './ModelViewer';

interface ViewportControlsProps {
  viewerControls: ViewerControls;
  updateControl: (key: keyof ViewerControls, value: unknown) => void;
}

export const ViewportControls: React.FC<ViewportControlsProps> = ({
  viewerControls,
  updateControl
}) => {
  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>视口控制</div>
      
      {/* 交互设置 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, fontSize: '12px', color: '#666' }}>交互设置</div>
        <Row gutter={[8, 8]}>
          <Col span={8}>
            <Space orientation="vertical" size={0} style={{ width: '100%' }}>
              <span style={{ fontSize: '12px' }}>旋转</span>
              <Switch
                size="small"
                checked={viewerControls.enableRotation}
                onChange={(checked) => updateControl('enableRotation', checked)}
              />
            </Space>
          </Col>
          <Col span={8}>
            <Space orientation="vertical" size={0} style={{ width: '100%' }}>
              <span style={{ fontSize: '12px' }}>缩放</span>
              <Switch
                size="small"
                checked={viewerControls.enableZoom}
                onChange={(checked) => updateControl('enableZoom', checked)}
              />
            </Space>
          </Col>
          <Col span={8}>
            <Space orientation="vertical" size={0} style={{ width: '100%' }}>
              <span style={{ fontSize: '12px' }}>平移</span>
              <Switch
                size="small"
                checked={viewerControls.enablePan}
                onChange={(checked) => updateControl('enablePan', checked)}
              />
            </Space>
          </Col>
        </Row>
      </div>

      {/* 相机设置 */}
      <Row gutter={[8, 8]}>
        <Col span={24}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>自动旋转</span>
            <Switch
              size="small"
              checked={viewerControls.autoRotate}
              onChange={(checked) => updateControl('autoRotate', checked)}
            />
          </Space>
        </Col>
        {viewerControls.autoRotate && (
          <Col span={24}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>旋转速度</span>
              <span>{viewerControls.rotationSpeed}x</span>
            </Space>
            <Slider
              min={0.5}
              max={3}
              step={0.5}
              value={viewerControls.rotationSpeed}
              onChange={(value) => updateControl('rotationSpeed', value)}
              style={{ marginTop: 4 }}
            />
          </Col>
        )}
        <Col span={24}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>缩放速度</span>
            <span>{viewerControls.zoomSpeed}x</span>
          </Space>
          <Slider
            min={0.5}
            max={3}
            step={0.5}
            value={viewerControls.zoomSpeed}
            onChange={(value) => updateControl('zoomSpeed', value)}
            style={{ marginTop: 4 }}
          />
        </Col>
      </Row>
    </div>
  );
};