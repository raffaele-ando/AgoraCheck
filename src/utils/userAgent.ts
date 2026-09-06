export function parseUserAgent(ua: string) {
  if (!ua) return null;
  const info: {
    browser?: string;
    os?: string;
    device?: string;
    instagram?: { version: string; device: string; resolution?: string; dpi?: string; build?: string };
    raw: string;
  } = { raw: ua };

  const igMatch = ua.match(/Instagram\s+([\d\.]+)\s*(?:Android\s*\((.*?)\)|\((.*?)\))/);
  if (igMatch) {
    const version = igMatch[1];
    const details = igMatch[2] || igMatch[3];
    if (details) {
      const parts = details.split(';').map(s => s.trim());
      if (igMatch[2]) {
        info.instagram = {
          version,
          device: `${parts[3] || ''} ${parts[4] || ''}`.trim() || 'Android Device',
          dpi: parts[1],
          resolution: parts[2],
          build: parts[5] || parts[6]
        };
        info.os = `Android ${parts[0]?.split('/')[0] || ''}`.trim();
        info.device = info.instagram.device;
      } else {
        info.instagram = {
          version,
          device: parts[0] || 'iOS Device',
          resolution: parts.find(p => p.includes('x') && !p.includes(' ')),
        };
        info.device = parts[0];
        info.os = parts[1] || 'iOS';
      }
    } else {
      info.instagram = { version, device: 'Unknown' };
    }
    info.browser = 'Instagram In-App';
  } else {
    if (ua.includes('Chrome/')) {
      info.browser = 'Chrome ' + (ua.match(/Chrome\/([\d\.]+)/)?.[1] || '');
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      info.browser = 'Safari ' + (ua.match(/Version\/([\d\.]+)/)?.[1] || '');
    } else if (ua.includes('Firefox/')) {
      info.browser = 'Firefox ' + (ua.match(/Firefox\/([\d\.]+)/)?.[1] || '');
    } else {
      info.browser = 'Browser Sconosciuto';
    }

    if (ua.includes('Android')) {
      const v = ua.match(/Android\s+([\d\.]+)/)?.[1] || '';
      info.os = 'Android ' + v;
      info.device = ua.match(/Android[^\)]+;\s*([^;\)]+?)(?:\s+Build|\))/)?.[1] || 'Android Device';
    } else if (ua.includes('iPhone')) {
      info.os = 'iOS ' + (ua.match(/OS\s+([\d_]+)/)?.[1]?.replace(/_/g, '.') || '');
      info.device = 'iPhone';
    } else if (ua.includes('iPad')) {
      info.os = 'iPadOS ' + (ua.match(/OS\s+([\d_]+)/)?.[1]?.replace(/_/g, '.') || '');
      info.device = 'iPad';
    } else if (ua.includes('Mac OS X')) {
      info.os = 'Mac OS X ' + (ua.match(/Mac OS X\s+([\d_]+)/)?.[1]?.replace(/_/g, '.') || '');
      info.device = 'Mac';
    } else if (ua.includes('Windows')) {
      info.os = 'Windows ' + (ua.match(/Windows NT\s+([\d\.]+)/)?.[1] || '');
      info.device = 'PC';
    }
  }

  return info;
}
