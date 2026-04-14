import { FollowUpTypeConfig } from '../types';

export const FOLLOW_UP_TYPES: FollowUpTypeConfig[] = [
  { key: 'phone_call', label: '电话沟通', color: '#1890FF', icon: '📞' },
  { key: 'online_meeting', label: '线上会议', color: '#722ED1', icon: '💻' },
  { key: 'onsite_visit', label: '上门拜访', color: '#FA8C16', icon: '🚗' },
  { key: 'email', label: '邮件往来', color: '#52C41A', icon: '✉️' },
  { key: 'im_chat', label: '微信/IM沟通', color: '#13C2C2', icon: '💬' },
  { key: 'other', label: '其他', color: '#8C8C8C', icon: '📋' },
];

export const getFollowUpTypeConfig = (type: string): FollowUpTypeConfig => {
  return FOLLOW_UP_TYPES.find(t => t.key === type) || FOLLOW_UP_TYPES[FOLLOW_UP_TYPES.length - 1];
};

export const getFollowUpTypeColor = (type: string): string => {
  return getFollowUpTypeConfig(type).color;
};

export const getFollowUpTypeLabel = (type: string): string => {
  return getFollowUpTypeConfig(type).label;
};