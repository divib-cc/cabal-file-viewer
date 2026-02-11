// 动画控制组件
import React from 'react';
import { Space, Switch, Slider, Select, Row, Col } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import type { AnimationState } from './ModelViewer';

// 动画控制组件的属性接口定义
export interface AnimationControlsProps {
  animationState: AnimationState; // 动画状态对象
  updateAnimationState: (key: keyof AnimationState, value: unknown) => void; // 更新动画状态的回调函数
  getAnimationNames: () => string[]; // 获取动画名称列表的函数
}

// 动画控制组件
export const AnimationControls: React.FC<AnimationControlsProps> = ({
  animationState,
  updateAnimationState,
  getAnimationNames
}) => {
  // 获取动画名称列表
  const animationNames = getAnimationNames();

  return (
    <div>
      <Row gutter={[8, 8]}>
        {/* 动画播放/暂停控制区域 */}
        <Col span={12}>
          <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              {/* 根据播放状态显示不同的图标 */}
              {animationState.isPlaying ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              <span>动画控制</span>
            </Space>
            {/* 播放/暂停开关 */}
            <Switch
              size="small"
              checked={animationState.isPlaying} // 开关状态绑定到播放状态
              onChange={(checked) => updateAnimationState('isPlaying', checked)} // 切换播放状态
            />
          </div>
        </Col>
        {/* 循环播放控制 */}
        <Col span={12}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <SyncOutlined />
              <span>循环播放</span>
            </Space>
            {/* 循环播放开关 */}
            <Switch
              size="small"
              checked={animationState.loop} // 绑定循环状态
              onChange={(checked) => updateAnimationState('loop', checked)} // 切换循环状态
            />
          </Space>
        </Col>
      </Row>

      {/* 动画选择下拉框 - 仅在存在动画时显示 */}
      {animationNames.length > 0 && (
        <Row gutter={[8, 8]} style={{ marginBottom: 8 }}>
          <Col span={24}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>选择动画</span>
              {/* 动画选择器 */}
              <Select
                size="small"
                style={{ width: 120 }}
                value={animationState.currentAnimation} // 当前选中的动画索引
                onChange={(value) => updateAnimationState('currentAnimation', value)} // 动画切换回调
                options={animationNames.map((name, index) => ({
                  // 生成下拉选项，如果名称为空则使用默认名称
                  label: name || `动画 ${index + 1}`,
                  value: index // 使用索引作为值
                }))}
              />
            </Space>
          </Col>
        </Row>
      )}

      {/* 动画参数控制区域 */}
      <Row gutter={[8, 8]}>
        {/* 播放速度控制 */}
        <Col span={24}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>播放速度</span>
            {/* 显示当前速度值 */}
            <span>{animationState.speed.toFixed(1)}x</span>
          </Space>
          {/* 速度调节滑块 */}
          <Slider
            min={0.1}    // 最小速度 0.1倍
            max={3}      // 最大速度 3倍
            step={0.1}   // 步长 0.1
            value={animationState.speed} // 绑定当前速度值
            onChange={(value) => updateAnimationState('speed', value)} // 速度变化回调
            style={{ marginTop: 4 }}
          />
        </Col>
      </Row>
    </div>
  );
};