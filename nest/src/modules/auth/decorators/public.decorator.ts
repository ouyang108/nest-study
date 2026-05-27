import { SetMetadata } from '@nestjs/common';

// 用于标记不需要 JWT 校验的路由
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
