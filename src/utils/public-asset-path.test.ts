import { describe, expect, it } from 'vitest';
import { publicAssetPath } from './public-asset-path';

describe('cover paths across deployments', () => {
  it('supports root and GitHub Pages exports without doubling the prefix', () => {
    expect(publicAssetPath('/covers/a.jpg', '/Phomu')).toBe(
      '/Phomu/covers/a.jpg'
    );
    expect(publicAssetPath('/Phomu/covers/a.jpg', '/Phomu')).toBe(
      '/Phomu/covers/a.jpg'
    );
    expect(publicAssetPath('covers/a.jpg', '')).toBe('/covers/a.jpg');
  });
  it('preserves fully qualified cover URLs', () => {
    expect(publicAssetPath('https://example.com/a.jpg', '/Phomu')).toBe(
      'https://example.com/a.jpg'
    );
  });
});
