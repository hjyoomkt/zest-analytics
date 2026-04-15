import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * 페이지별 SEO 메타태그를 관리하는 컴포넌트
 *
 * 사용 예제:
 * <PageHelmet
 *   title="대시보드"
 *   description="광고 성과를 한눈에 확인하세요"
 * />
 */
export const PageHelmet = ({
  title = "제스트 애널리틱스",
  description = "구글 애널리틱스, 유저 히트맵 등 성장 지표를 한 화면에서 확인하는 분석 대시보드입니다.",
  keywords = "제스트 애널리틱스, 구글 애널리틱스, 히트맵, 성장 지표, 대시보드",
  ogTitle,
  ogDescription,
  ogImage = "",
  ogUrl = ""
}) => {
  return (
    <Helmet>
      {/* 기본 메타태그 */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph 메타태그 */}
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={ogUrl} />

      {/* Twitter 메타태그 */}
      <meta name="twitter:title" content={ogTitle || title} />
      <meta name="twitter:description" content={ogDescription || description} />
    </Helmet>
  );
};
