// 显示控制组件
import React from 'react';
import { Space, Switch, Slider, Row, Col, Tooltip } from 'antd';
import {
  BorderOutlined,
  AimOutlined,
  BulbOutlined
} from '@ant-design/icons';
import type { ViewerControls } from './ModelViewer';

interface DisplayControlsProps {
  viewerControls: ViewerControls;
  updateControl: (key: keyof ViewerControls, value: unknown) => void;
}

export const DisplayControls: React.FC<DisplayControlsProps> = ({
  viewerControls,
  updateControl
}) => {
  const backgroundColors = ['#f0f0f0', '#ffffff', '#1a1a1a', '#001529', '#002140'];

  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>显示设置</div>
      <Row gutter={[8, 8]}>
        <Col span={12}>
          <Space>
            <BorderOutlined />
            <span>网格</span>
            <Switch
              size="small"
              checked={viewerControls.showGrid}
              onChange={(checked) => updateControl('showGrid', checked)}
            />
          </Space>
        </Col>
        <Col span={12}>
          <Space>
            <AimOutlined />
            <span>坐标系</span>
            <Switch
              size="small"
              checked={viewerControls.showAxes}
              onChange={(checked) => updateControl('showAxes', checked)}
            />
          </Space>
        </Col>
        <Col span={12}>
          <Space>
            <span>线框模式</span>
            <Switch
              size="small"
              checked={viewerControls.showWireframe}
              onChange={(checked) => updateControl('showWireframe', checked)}
            />
          </Space>
        </Col>
        <Col span={12}>
          <Space>
            <BulbOutlined />
            <span>光源</span>
            <Switch
              size="small"
              checked={viewerControls.showLight}
              onChange={(checked) => updateControl('showLight', checked)}
            />
          </Space>
        </Col>
        <Col span={24}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>透明度</span>
            <span>{Math.round(viewerControls.modelOpacity * 100)}%</span>
          </Space>
          <Slider
            min={0.1}
            max={1}
            step={0.1}
            value={viewerControls.modelOpacity}
            onChange={(value) => updateControl('modelOpacity', value)}
            style={{ marginTop: 4 }}
          />
        </Col>
      </Row>

      {/* 背景色选择 */}
      <div style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 4, fontWeight: 500 }}>背景颜色</div>
        <Row gutter={[4, 4]}>
          {backgroundColors.map((color) => (
            <Col span={4.8} key={color}>
              <Tooltip title={color}>
                <div
                  style={{
                    width: '100%',
                    height: 24,
                    backgroundColor: color,
                    borderRadius: 4,
                    cursor: 'pointer',
                    border: viewerControls.backgroundColor === color ? '2px solid #1890ff' : '1px solid #d9d9d9'
                  }}
                  onClick={() => updateControl('backgroundColor', color)}
                />
              </Tooltip>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};