import { neon } from '@netlify/neon';

// 이 함수는 서버 사이드에서만 실행되어야 합니다.
export const getSql = () => {
    const url = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) {
        throw new Error('Database URL is not defined. Please set NETLIFY_DATABASE_URL or DATABASE_URL.');
    }
    return neon(url);
};
