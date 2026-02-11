import React from 'react';
import { Card, Button, Space, Row, Col, Checkbox } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, SettingOutlined, RedoOutlined, CameraOutlined } from '@ant-design/icons';
import type { ViewerControls, AnimationState } from './ModelViewer';
import { AnimationControls } from './AnimationControls';
import { DisplayControls } from './DisplayControls';
import { ViewportControls } from './ViewportControls';

// 控制面板组件的属性接口定义
interface ControlsPanelProps {
  showControls: boolean; // 是否显示控制面板
  viewerControls: ViewerControls; // 查看器控制参数
  animationState: AnimationState; // 动画状态
  selectedModels: string[]; // 选中的模型列表
  onModelSelectionChange: (selectedModels: string[]) => void; // 模型选择变化回调
  updateControl: (key: keyof ViewerControls, value: unknown) => void; // 更新控制参数
  updateAnimationState: (key: keyof AnimationState, value: unknown) => void; // 更新动画状态
  onToggleControls: () => void; // 切换控制面板显示/隐藏
  onResetCamera: () => void; // 重置相机
  onToggleCamera: () => void; // 切换相机类型
  getAnimationNames: () => string[]; // 获取动画名称列表
  getModelNames: () => string[]; // 获取模型名称列表
}

// 3D查看器控制面板组件
export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  showControls,
  viewerControls,
  animationState,
  selectedModels,
  onModelSelectionChange,
  updateControl,
  updateAnimationState,
  onToggleControls,
  onResetCamera,
  onToggleCamera,
  getAnimationNames,
  getModelNames
}) => {

  // 处理全选/全不选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 如果勾选全选，选择所有模型
      onModelSelectionChange(getModelNames());
    } else {
      // 如果取消全选，清空选择
      onModelSelectionChange([]);
    }
  };

  // 检查是否全部模型都被选中
  const isAllSelected = selectedModels.length === getModelNames().length && getModelNames().length > 0;

  return (
    <>
      {/* 主控制面板 - 仅在showControls为true时显示 */}
      {showControls && (
        <Card
          style={{ position: 'absolute', top: 20, right: 20, width: 320, zIndex: 50, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', background: 'rgba(255, 255, 255, 0.95)' }}
          size="small"
          title={
            <Space>
              <SettingOutlined />
              <span>3D查看控制</span>
            </Space>
          }
          extra={
            // 控制面板显示/隐藏切换按钮
            <Button
              type="text"
              size="small"
              icon={showControls ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={onToggleControls}
            />
          }
        >
          {/* 垂直排列的控制项 */}
          <Space orientation="vertical" style={{ width: '100%' }}>

            {/* 快速控制按钮行 */}
            <Row gutter={[8, 8]}>
              <Col span={12}>
                {/* 重置相机按钮 */}
                <Button
                  block
                  icon={<RedoOutlined />}
                  onClick={onResetCamera}
                  size="small"
                  title="重置视图"
                />
              </Col>
              <Col span={12}>
                {/* 切换相机类型按钮 */}
                <Button
                  block
                  icon={<CameraOutlined />}
                  onClick={onToggleCamera}
                  size="small"
                  title={`切换相机: ${viewerControls.cameraType === 'perspective' ? '透视' : '正交'}`}
                />
              </Col>
            </Row>

            {/* 动画控制组件 */}
            <AnimationControls
              animationState={animationState}
              updateAnimationState={updateAnimationState}
              getAnimationNames={getAnimationNames}
            />

            {/* 显示控制组件 */}
            <DisplayControls
              viewerControls={viewerControls}
              updateControl={updateControl}
            />

            {/* 模型选择区域 */}
            <div>
              <div style={{ marginBottom: 8, fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>模型列表</span>
                {/* 全选复选框 */}
                <Checkbox
                  indeterminate={selectedModels.length > 0 && selectedModels.length < getModelNames().length} // 部分选中时显示不确定状态
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                >
                  全选
                </Checkbox>
              </div>
              {/* 模型多选框组 */}
              <Checkbox.Group
                style={{ width: '100%' }}
                value={selectedModels}
                onChange={onModelSelectionChange}
              >
                <Space vertical style={{ width: '100%', maxHeight: 200, overflow: 'auto' }}>
                  {/* 遍历显示所有模型复选框 */}
                  {getModelNames().map((modelName, index) => (
                    <Checkbox key={index} value={modelName}>
                      {modelName}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </div>

            {/* 视口控制组件 */}
            <ViewportControls
              viewerControls={viewerControls}
              updateControl={updateControl}
            />
          </Space>
        </Card>
      )}

      {/* 底部快捷操作栏 - 始终显示 */}
      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: 'rgba(255, 255, 255, 0.8)', padding: '8px 16px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <Space>
          {/* 控制面板切换按钮 */}
          <Button
            type={showControls ? "primary" : "default"}
            shape="circle"
            icon={<SettingOutlined />}
            onClick={onToggleControls}
            size="small"
            title={showControls ? '隐藏控制面板' : '显示控制面板'}
          />
          {/* 重置视图按钮 */}
          <Button
            shape="circle"
            icon={<RedoOutlined />}
            onClick={onResetCamera}
            size="small"
            title="重置视图"
          />
        </Space>
      </div>
    </>
  );
};