import React, { useEffect, useState, useRef } from 'react';
import { FollowUpStats } from '../types';

interface FollowUpStatsCardProps {
  stats: FollowUpStats | null;
  customerName: string;
}

// 热度等级计算（基于近30天跟进频次）
const calculateHeatLevel = (activityScore: number): 'high' | 'medium' | 'low' => {
  if (activityScore >= 70) return 'high';
  if (activityScore >= 40) return 'medium';
  return 'low';
};

// 热度标签
const HEAT_LABELS = {
  high: '活跃',
  medium: '一般',
  low: '沉寂',
};

// 数字滚动动画组件
const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ value, duration = 600 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    const startValue = 0;
    const diff = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - (startTimeRef.current || 0);
      const progress = Math.min(elapsed / duration, 1);

      // 缓动函数：easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      setDisplayValue(Math.round(startValue + diff * easeProgress));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return <span className="count-animate">{displayValue}</span>;
};

const FollowUpStatsCard: React.FC<FollowUpStatsCardProps> = ({ stats, customerName }) => {
  const heatLevel = stats ? calculateHeatLevel(stats.activityScore) : 'low';

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="overview-card">
      <div className="overview-header">
        <div className="overview-title">
          📊 {customerName} - 跟进概览
        </div>
        <div className="overview-actions">
          {/* 热度指示器 */}
          <div className={`heat-indicator ${heatLevel}`}>
            <span className="heat-dot"></span>
            <span>{HEAT_LABELS[heatLevel]}</span>
          </div>
        </div>
      </div>

      <div className="overview-stats">
        <div className="overview-stat">
          <div className="overview-stat-value">
            <AnimatedNumber value={stats?.totalCount || 0} />
          </div>
          <div className="overview-stat-label">总跟进次数</div>
        </div>

        <div className="overview-stat">
          <div className="overview-stat-value" style={{ fontSize: 16 }}>
            {formatDate(stats?.lastFollowUp || null)}
          </div>
          <div className="overview-stat-label">最近跟进</div>
        </div>

        <div className="overview-stat">
          <div className="overview-stat-value" style={{ fontSize: 16 }}>
            {stats?.nextFollowUpCountdown !== null
              ? stats.nextFollowUpCountdown! > 0
                ? `${stats.nextFollowUpCountdown}天后`
                : stats.nextFollowUpCountdown === 0
                  ? '今天'
                  : '已到期'
              : '-'}
          </div>
          <div className="overview-stat-label">下次跟进</div>
        </div>

        <div className="overview-stat">
          <div className="overview-stat-value">
            <AnimatedNumber value={stats?.activityScore || 0} />
          </div>
          <div className="overview-stat-label">活跃热度</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${stats?.activityScore || 0}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpStatsCard;