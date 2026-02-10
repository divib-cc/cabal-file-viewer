// 控制面板组件
import React from 'react';
import { Card, Button, Space, Row, Col } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  SettingOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  CameraOutlined
} from '@ant-design/icons';
import type { ViewerControls, AnimationState } from './ModelViewer';
import { AnimationControls } from './AnimationControls';
import { DisplayControls } from './DisplayControls';
import { ViewportControls } from './ViewportControls';

interface ControlsPanelProps {
  showControls: boolean;
  viewerControls: ViewerControls;
  animationState: AnimationState;
  updateControl: (key: keyof ViewerControls, value: unknown) => void;
  updateAnimationState: (key: keyof AnimationState, value: unknown) => void;
  onToggleControls: () => void;
  onResetCamera: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleCamera: () => void;
  getAnimationNames: () => string[];
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  showControls,
  viewerControls,
  animationState,
  updateControl,
  updateAnimationState,
  onToggleControls,
  onResetCamera,
  onZoomIn,
  onZoomOut,
  onToggleCamera,
  getAnimationNames
}) => {
  return (
    <>
      {/* 主控制面板 */}
      {showControls && (
        <Card
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 320,
            zIndex: 50,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            background: 'rgba(255, 255, 255, 0.95)'
          }}
          size="small"
          title={
            <Space>
              <SettingOutlined />
              <span>3D查看控制</span>
            </Space>
          }
          extra={
            <Button
              type="text"
              size="small"
              icon={showControls ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={onToggleControls}
            />
          }
        >
          <Space orientation="vertical" style={{ width: '100%' }}>
            {/* 快速控制按钮 */}
            <Row gutter={[8, 8]}>
              <Col span={6}>
                <Button
                  block
                  icon={<RedoOutlined />}
                  onClick={onResetCamera}
                  size="small"
                  title="重置视图"
                />
              </Col>
              <Col span={6}>
                <Button
                  block
                  icon={<ZoomInOutlined />}
                  onClick={onZoomIn}
                  size="small"
                  title="放大"
                />
              </Col>
              <Col span={6}>
                <Button
                  block
                  icon={<ZoomOutOutlined />}
                  onClick={onZoomOut}
                  size="small"
                  title="缩小"
                />
              </Col>
              <Col span={6}>
                <Button
                  block
                  icon={<CameraOutlined />}
                  onClick={onToggleCamera}
                  size="small"
                  title={`切换相机: ${viewerControls.cameraType === 'perspective' ? '透视' : '正交'}`}
                />
              </Col>
            </Row>

            {/* 动画控制 */}
            <AnimationControls
              animationState={animationState}
              updateAnimationState={updateAnimationState}
              getAnimationNames={getAnimationNames}
            />

            {/* 显示控制 */}
            <DisplayControls
              viewerControls={viewerControls}
              updateControl={updateControl}
            />

            {/* 视口控制 */}
            <ViewportControls
              viewerControls={viewerControls}
              updateControl={updateControl}
            />
          </Space>
        </Card>
      )}

      {/* 快捷操作按钮 */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.8)',
        padding: '8px 16px',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <Space>
          <Button
            type={showControls ? "primary" : "default"}
            shape="circle"
            icon={<SettingOutlined />}
            onClick={onToggleControls}
            size="small"
            title={showControls ? '隐藏控制面板' : '显示控制面板'}
          />
          <Button
            shape="circle"
            icon={<RedoOutlined />}
            onClick={onResetCamera}
            size="small"
            title="重置视图"
          />
          <Button
            shape="circle"
            icon={<ZoomInOutlined />}
            onClick={onZoomIn}
            size="small"
            title="放大"
          />
          <Button
            shape="circle"
            icon={<ZoomOutOutlined />}
            onClick={onZoomOut}
            size="small"
            title="缩小"
          />
        </Space>
      </div>
    </>
  );
};