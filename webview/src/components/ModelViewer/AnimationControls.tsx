// 动画控制组件
import React from 'react';
import { Space, Switch, Slider, Select, Row, Col } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import type { AnimationState } from './ModelViewer';

export interface AnimationControlsProps {
  animationState: AnimationState;
  updateAnimationState: (key: keyof AnimationState, value: unknown) => void;
  getAnimationNames: () => string[];
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({
  animationState,
  updateAnimationState,
  getAnimationNames
}) => {
  const animationNames = getAnimationNames();

  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          {animationState.isPlaying ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          <span>动画控制</span>
        </Space>
        <Switch
          size="small"
          checked={animationState.isPlaying}
          onChange={(checked) => updateAnimationState('isPlaying', checked)}
        />
      </div>
      
      {animationNames.length > 0 && (
        <Row gutter={[8, 8]} style={{ marginBottom: 8 }}>
          <Col span={24}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>选择动画</span>
              <Select
                size="small"
                style={{ width: 120 }}
                value={animationState.currentAnimation}
                onChange={(value) => updateAnimationState('currentAnimation', value)}
                options={animationNames.map((name, index) => ({
                  label: name || `动画 ${index + 1}`,
                  value: index
                }))}
              />
            </Space>
          </Col>
        </Row>
      )}
      
      <Row gutter={[8, 8]}>
        <Col span={24}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>播放速度</span>
            <span>{animationState.speed.toFixed(1)}x</span>
          </Space>
          <Slider
            min={0.1}
            max={3}
            step={0.1}
            value={animationState.speed}
            onChange={(value) => updateAnimationState('speed', value)}
            style={{ marginTop: 4 }}
          />
        </Col>
        <Col span={24}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <SyncOutlined />
              <span>循环播放</span>
            </Space>
            <Switch
              size="small"
              checked={animationState.loop}
              onChange={(checked) => updateAnimationState('loop', checked)}
            />
          </Space>
        </Col>
      </Row>
    </div>
  );
};